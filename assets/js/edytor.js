// =========================================================
// KILEKCRAFT — edytor budowli 3D z eksportem do datapacka.
// =========================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { store, reduced, copyText, toast, award, badge, bump, sfx } from './core.js';
import { BLOCKS, BUILDS, getBuild } from './builds.js';
import { materialFor } from './voxel-scene.js';
import { exportLines, mcfunction, datapack, download, safeName, packStatusHTML, exportPanelHTML, modesHTML } from './export.js';

const $ = (s) => document.querySelector(s);
const N = 48, H = 64, MAX = 8000;
const PALETTE = ['stone', 'cobble', 'stone_bricks', 'smooth_stone', 'oak_planks', 'oak_log', 'dark_log', 'leaves', 'grass', 'dirt', 'sand', 'glass',
  'quartz', 'white_wool', 'black_concrete', 'red_concrete', 'blue_concrete', 'gold', 'iron', 'diamond', 'emerald', 'amethyst', 'purpur', 'obsidian', 'lantern', 'lava'];

let dirty = true, visible = true;
let tool = 'build', brush = '1', sym = 'none', cur = store.get('ed:blok', 'stone_bricks');
const world = new Map(); // "x,y,z" -> typ
const key = (x, y, z) => x + ',' + y + ',' + z;
const undo = [], redo = [];

// ---------- UI: paleta i przełączniki ----------
const pal = $('#pal');
pal.innerHTML = PALETTE.map(t => `<button type="button" role="radio" class="sw-btn" data-t="${t}" aria-checked="${t === cur}" aria-label="${BLOCKS[t].name}" title="${BLOCKS[t].name}" style="--c:${BLOCKS[t].c}"></button>`).join('');
function setBlock(t) { cur = t; store.set('ed:blok', t); pal.querySelectorAll('.sw-btn').forEach(b => b.setAttribute('aria-checked', b.dataset.t === t)); $('#palName').textContent = BLOCKS[t].name + ' · ' + BLOCKS[t].id; updateGhost(); }
pal.addEventListener('click', (e) => { const b = e.target.closest('.sw-btn'); if (b) { setBlock(b.dataset.t); if (tool !== 'build') setTool('build'); } });

function seg(attr, set) {
  document.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => set(b.dataset[attr])));
}
function press(attr, v) { document.querySelectorAll(`[data-${attr}]`).forEach(b => b.setAttribute('aria-pressed', b.dataset[attr] === v)); }
const TOOLN = { build: 'Stawianie', erase: 'Usuwanie', pick: 'Pipeta' };
function setTool(t) { tool = t; press('tool', t); $('#hudTool').textContent = TOOLN[t]; $('#hudTool').className = 'badge ' + (t === 'erase' ? 'warn' : 'info'); updateGhost(); }
seg('tool', setTool);
seg('brush', (v) => { brush = v; press('brush', v); updateGhost(); });
seg('sym', (v) => { sym = v; press('sym', v); $('#hudSym').hidden = v === 'none'; $('#hudSym').textContent = v === 'x' ? 'Lustro ↔' : 'Lustro ×4'; symPlanes(); });

const tplSel = $('#tpl');
tplSel.innerHTML += BUILDS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

// ---------- scena ----------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: (devicePixelRatio || 1) < 2, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
$('#poster').remove();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .5, 800);
scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x3a2550, 2.1));
const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(1, 2.2, .7); scene.add(sun);
const rim = new THREE.DirectionalLight(0xa06bff, 1.0); rim.position.set(-1.2, .4, -1); scene.add(rim);

const grid = new THREE.GridHelper(N, N, 0xff3d3d, 0x2a3a66); grid.material.transparent = true; grid.material.opacity = .55; scene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshBasicMaterial({ color: 0x0d1530, transparent: true, opacity: .85 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; scene.add(ground);
const symGroup = new THREE.Group(); scene.add(symGroup);
function symPlanes() {
  symGroup.clear();
  const mk = (rotY) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(N, 24), new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false })); m.position.y = 12; m.rotation.y = rotY; symGroup.add(m); };
  if (sym !== 'none') mk(Math.PI / 2);
  if (sym === 'xz') mk(0);
  dirty = true;
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .1; controls.maxPolarAngle = Math.PI * .49;
controls.target.set(0, 4, 0); camera.position.set(26, 24, 30); controls.update();
controls.minDistance = 8; controls.maxDistance = 120;

const box = new THREE.BoxGeometry(1, 1, 1);
const meshes = new Map();
const pos = (x, y, z) => new THREE.Vector3(x - N / 2 + .5, y + .5, z - N / 2 + .5);

// podgląd miejsca
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35, depthWrite: false });
const ghostEdge = new THREE.LineBasicMaterial({ color: 0xffffff });
const ghosts = new THREE.Group(); scene.add(ghosts);
function ghostCube() { const g = new THREE.Group(); g.add(new THREE.Mesh(box, ghostMat)); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), ghostEdge)); g.scale.setScalar(1.02); return g; }
function updateGhost() {
  const c = tool === 'erase' ? 0xff3d3d : tool === 'pick' ? 0x5cc8ff : new THREE.Color(BLOCKS[cur].c).getHex();
  ghostMat.color.setHex(c); ghostEdge.color.setHex(c); dirty = true;
}

setBlock(cur);

// ---------- operacje ----------
const tweens = new Set(), parts = [];
function setCell(x, y, z, t, anim = true) {
  const k = key(x, y, z), old = world.get(k) || null;
  if (old === t) return;
  if (old) {
    const m = meshes.get(k); meshes.delete(k);
    if (anim && !reduced) { m.userData.to = 0; tweens.add(m); } else scene.remove(m);
    world.delete(k);
  }
  if (t) {
    const m = new THREE.Mesh(box, materialFor(t)); m.position.copy(pos(x, y, z)); m.userData.k = k;
    if (BLOCKS[t].alpha) m.renderOrder = 2;
    if (anim && !reduced) { m.scale.setScalar(.05); m.userData.to = 1; tweens.add(m); burst(m.position, BLOCKS[t].c); }
    scene.add(m); meshes.set(k, m); world.set(k, t);
  }
  dirty = true;
}
function burst(p, color) {
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color, transparent: true }));
    s.scale.setScalar(.14); s.position.copy(p);
    s.userData.v = new THREE.Vector3((Math.random() - .5) * .25, Math.random() * .25 + .1, (Math.random() - .5) * .25); s.userData.life = 1;
    scene.add(s); parts.push(s);
  }
}
function apply(changes, record = true) {
  const done = [];
  for (const c of changes) {
    const [x, y, z] = c.k.split(',').map(Number);
    const from = world.get(c.k) || null; if (from === c.to) continue;
    if (c.to && world.size >= MAX) { toast(`Limit to ${MAX} bloków.`); break; }
    setCell(x, y, z, c.to); done.push({ k: c.k, from, to: c.to });
  }
  if (record && done.length) { undo.push(done); redo.length = 0; }
  changed(); return done;
}
const inside = (x, y, z) => x >= 0 && z >= 0 && x < N && z < N && y >= 0 && y < H;
function expand([x, y, z]) {
  let cells = [[x, y, z]];
  if (tool === 'build' && brush === '3') cells = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [x + a, y, z + b]));
  if (tool === 'build' && brush === 'col') cells = [0, 1, 2, 3, 4].map(d => [x, y + d, z]);
  const out = [];
  for (const [a, b, c] of cells) {
    out.push([a, b, c]);
    if (sym === 'x' || sym === 'xz') out.push([N - 1 - a, b, c]);
    if (sym === 'xz') { out.push([a, b, N - 1 - c]); out.push([N - 1 - a, b, N - 1 - c]); }
  }
  const seen = new Set();
  return out.filter(p => inside(...p) && !seen.has(p.join()) && seen.add(p.join()));
}

// ---------- celowanie ----------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
function target(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects([...meshes.values(), ground], false);
  const h = hits.find(h => h.object === ground || meshes.get(h.object.userData.k) === h.object);
  if (!h) return null;
  if (h.object === ground) {
    const x = Math.floor(h.point.x + N / 2), z = Math.floor(h.point.z + N / 2);
    return tool === 'build' && inside(x, 0, z) ? [x, 0, z] : null;
  }
  const [x, y, z] = h.object.userData.k.split(',').map(Number);
  if (tool !== 'build') return [x, y, z];
  const n = h.face.normal; return [x + Math.round(n.x), y + Math.round(n.y), z + Math.round(n.z)];
}
let hover = null;
function showGhost(t) {
  ghosts.clear(); hover = t;
  if (t) for (const p of expand(t)) { const g = ghostCube(); g.position.copy(pos(...p)); ghosts.add(g); }
  dirty = true;
}
const el = renderer.domElement;
let down = null;
el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') showGhost(target(e)); });
el.addEventListener('pointerleave', () => showGhost(null));
el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
el.addEventListener('pointerup', (e) => {
  if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (moved > 6 || e.button > 0) return;
  const t = target(e); if (!t) return;
  if (tool === 'pick') { const ty = world.get(key(...t)); if (ty && BLOCKS[ty]) { setBlock(ty); setTool('build'); toast('Wybrano: ' + BLOCKS[ty].name); } return; }
  const cells = expand(t);
  const ch = cells.map(p => ({ k: key(...p), to: tool === 'erase' ? null : cur }));
  const done = apply(ch);
  if (done.length) sfx(tool === 'erase' ? 'remove' : 'place');
  if (tool === 'build' && done.length) {
    award('ed:start', 10);
    let n = 0; for (let i = 0; i < done.length; i++) n = bump('ed:bloki');
    if (n >= 100) badge('budowniczy');
  }
  if (e.pointerType === 'mouse') showGhost(target(e));
});

function fit() {
  let top = 4; for (const k of world.keys()) top = Math.max(top, +k.split(',')[1]);
  const d = Math.max(30, top * 1.35);
  controls.target.set(0, Math.min(top * .45, 30), 0);
  camera.position.set(d * .78, top * .5 + d * .45, d * .9); controls.update(); dirty = true;
}

// ---------- cofnij / ponów / wyczyść / szablony ----------
function revert(list, dir) { for (const c of [...list].reverse()) { const [x, y, z] = c.k.split(',').map(Number); setCell(x, y, z, dir === 'undo' ? c.from : c.to); } changed(); }
function doUndo() { const l = undo.pop(); if (l) { revert(l, 'undo'); redo.push(l); } }
function doRedo() { const l = redo.pop(); if (l) { revert(l, 'redo'); undo.push(l); } }
$('#undo').addEventListener('click', doUndo); $('#redo').addEventListener('click', doRedo);
$('#clear').addEventListener('click', () => { if (!world.size) return; apply([...world.keys()].map(k => ({ k, to: null }))); toast('Plac wyczyszczony. Cofniesz to przyciskiem ↶.'); });
tplSel.addEventListener('change', () => {
  const id = tplSel.value; tplSel.value = ''; if (!id) return;
  const b = getBuild(id), ox = Math.floor((N - b.size[0]) / 2), oz = Math.floor((N - b.size[2]) / 2);
  const ch = [...world.keys()].map(k => ({ k, to: null }));
  for (const [x, y, z, t] of b.blocks) if (BLOCKS[t].id && inside(x + ox, y, z + oz)) ch.push({ k: key(x + ox, y, z + oz), to: t });
  const anim = reduced; // duże szablony bez animacji
  for (const c of ch) { const [x, y, z] = c.k.split(',').map(Number); const from = world.get(c.k) || null; c.from = from; }
  const prev = ch.map(c => ({ ...c }));
  for (const c of ch) { const [x, y, z] = c.k.split(',').map(Number); setCell(x, y, z, c.to, anim); }
  undo.push(prev.filter(c => c.from !== c.to)); redo.length = 0;
  $('#name').value = b.name; changed(); fit(); toast(`Wczytano: ${b.name}. Możesz ją przerabiać.`);
});
addEventListener('keydown', (e) => {
  if (e.target.closest('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
  else if (e.key === 'b') setTool('build'); else if (e.key === 'e') setTool('erase'); else if (e.key === 'i') setTool('pick');
});

// ---------- zmiany: licznik, materiały, eksport, zapis ----------
let saveT;
function normBlocks() {
  const arr = [...world.entries()].map(([k, t]) => { const [x, y, z] = k.split(',').map(Number); return [x, y, z, t]; });
  if (!arr.length) return arr;
  const mx = Math.min(...arr.map(a => a[0])), mz = Math.min(...arr.map(a => a[2]));
  return arr.map(([x, y, z, t]) => [x - mx, y, z - mz, t]);
}
function changed() {
  $('#hudCount').textContent = `${world.size.toLocaleString('pl-PL')} bloków`;
  const cnt = {}; for (const t of world.values()) cnt[t] = (cnt[t] || 0) + 1;
  const rows = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  const st = (n) => n >= 64 ? `${Math.floor(n / 64)}×64${n % 64 ? ' + ' + (n % 64) : ''}` : '';
  $('#mats').innerHTML = rows.length ? rows.map(([t, n]) => `<li><label><span></span><i style="background:${BLOCKS[t].c}"></i><span class="mn">${BLOCKS[t].name}</span><span class="mc">${n}</span><span class="ms muted">${st(n)}</span></label></li>`).join('') : '<li class="muted">Plac jest pusty. Postaw pierwszy blok.</li>';
  updExport();
  clearTimeout(saveT); saveT = setTimeout(() => store.set('ed:swiat', { name: $('#name').value, b: [...world.entries()] }), 400);
}
function updExport() {
  const name = safeName($('#name').value);
  $('#fnCmd').innerHTML = `<span class="pr">›</span> <span class="hk">/function</span> kilekcraft:${name}`;
  $('#fnModes').innerHTML = modesHTML($('#name').value);
  const lines = exportLines(normBlocks());
  $('#lineCount').textContent = lines.length;
  $('#lines').textContent = lines.slice(0, 400).join('\n') + (lines.length > 400 ? `\n… i ${lines.length - 400} więcej w pliku` : '');
}
$('#name').addEventListener('input', () => changed());
$('#expHelp').innerHTML = exportPanelHTML();
$('#copyFn').addEventListener('click', (e) => copyText('/function kilekcraft:' + safeName($('#name').value), e.currentTarget));
$('#copyLines').addEventListener('click', (e) => copyText(mcfunction(normBlocks(), $('#name').value), e.currentTarget));
$('#dl').addEventListener('click', async (e) => {
  if (!world.size) { toast('Najpierw coś zbuduj!'); return; }
  const { name, blob } = await datapack(normBlocks(), $('#name').value);
  download(blob, `kilekcraft_${name}.zip`);
  const r = e.currentTarget.getBoundingClientRect();
  if (award('ed:eksport', 50, { from: { x: r.left + r.width / 2, y: r.top } })) badge('architekt');
  toast('Datapack gotowy. Jeśli plik się nie pobrał, otwórz stronę w zwykłej przeglądarce.');
});
packStatusHTML().then(h => { $('#packStatus').innerHTML = h; });

// odtworzenie zapisu
const saved = store.get('ed:swiat');
if (saved && saved.b) { $('#name').value = saved.name || 'moja budowla'; for (const [k, t] of saved.b) { if (!BLOCKS[t]) continue; const [x, y, z] = k.split(',').map(Number); setCell(x, y, z, t, false); } }
else { // mały start, żeby plac nie był pusty
  for (let x = 20; x < 28; x++) for (let z = 20; z < 28; z++) setCell(x, 0, z, (x + z) % 2 ? 'stone_bricks' : 'smooth_stone', false);
}
changed(); fit();

// ---------- pętla ----------
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; }
new ResizeObserver(resize).observe(stage);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(stage);
controls.addEventListener('change', () => (dirty = true));
(function loop() {
  requestAnimationFrame(loop);
  if (!visible || document.hidden) return;
  const moved = controls.update();
  for (const m of tweens) {
    const to = m.userData.to, s = m.scale.x + (to - m.scale.x) * .28;
    m.scale.setScalar(s);
    if (Math.abs(to - s) < .02) { m.scale.setScalar(to); tweens.delete(m); if (to === 0) scene.remove(m); }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.position.add(p.userData.v); p.userData.v.y -= .02; p.userData.life -= .05; p.material.opacity = p.userData.life;
    if (p.userData.life <= 0) { scene.remove(p); p.material.dispose(); parts.splice(i, 1); }
  }
  if (dirty || moved || tweens.size || parts.length) { renderer.render(scene, camera); dirty = false; }
})();
