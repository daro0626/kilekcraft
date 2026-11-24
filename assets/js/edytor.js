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
  'quartz', 'white_wool', 'black_concrete', 'red_concrete', 'blue_concrete', 'gold', 'iron', 'diamond', 'emerald', 'amethyst', 'purpur', 'obsidian', 'lantern', 'lava',
  'bricks', 'copper_block', 'cut_copper', 'prismarine', 'dark_prismarine', 'white_concrete', 'green_concrete',
  'red_wool', 'blue_wool', 'moss_block', 'packed_ice'];

let dirty = true, visible = true;
let tool = 'build', brush = '1', sym = 'none';
const savedBlock = store.get('ed:blok');
let cur = Object.hasOwn(BLOCKS, savedBlock) ? savedBlock : 'stone_bricks';
const savedView = store.get('ed:warstwy');
let layerMode = savedView?.mode === 'single' ? 'single' : 'below';
let workMode = ['below', 'single'].includes(savedView?.mode) ? 'layers' : 'build';
let layerY = Number.isInteger(savedView?.y) ? savedView.y : 0;
let animationY = -1, animationTimer = 0;
let wholeTargetY = 4, wholeDistance;
const layerMeshes = Array.from({ length: H }, () => new Map());
const inView = y => workMode === 'animation' ? y <= animationY : !active() || (layerMode === 'single' ? y === layerY : y <= layerY);
const active = () => workMode === 'layers';
const world = new Map(); // "x,y,z" -> typ
const key = (x, y, z) => x + ',' + y + ',' + z;
const undo = [], redo = [];

// ---------- UI: paleta i przełączniki ----------
const pal = $('#pal');
pal.innerHTML = PALETTE.map(t => `<button type="button" role="radio" class="sw-btn" data-t="${t}" aria-checked="${t === cur}" aria-label="${BLOCKS[t].name}" title="${BLOCKS[t].name}" style="--c:${BLOCKS[t].c}"></button>`).join('');
function setBlock(t) { cur = t; store.set('ed:blok', t); pal.querySelectorAll('.sw-btn').forEach(b => b.setAttribute('aria-checked', b.dataset.t === t)); $('#palName').textContent = BLOCKS[t].name + ' · ' + BLOCKS[t].id; updateGhost(); }
pal.addEventListener('click', (e) => { const b = e.target.closest('.sw-btn'); if (b) { setBlock(b.dataset.t); if (tool !== 'build') setTool('build'); } });

function seg(attr, set) {
  document.querySelectorAll(`[data-${attr}]`).forEach(b => b.addEventListener('click', () => set(b.getAttribute('data-' + attr))));
}
function press(attr, v) { document.querySelectorAll(`[data-${attr}]`).forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-' + attr) === v)); }
const TOOLN = { build: 'Stawianie', erase: 'Usuwanie', pick: 'Pipeta' };
function setTool(t) { tool = t; press('tool', t); $('#hudTool').textContent = TOOLN[t]; $('#hudTool').className = 'badge ' + (t === 'erase' ? 'warn' : 'info'); updateGhost(); showGhost(null); }
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
const ghostEdges = new THREE.EdgesGeometry(box);
const ghosts = new THREE.Group(); scene.add(ghosts);
function ghostCube() { const g = new THREE.Group(); g.add(new THREE.Mesh(box, ghostMat)); g.add(new THREE.LineSegments(ghostEdges, ghostEdge)); g.scale.setScalar(1.02); return g; }
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
    const m = meshes.get(k); meshes.delete(k); layerMeshes[y].delete(k);
    if (anim && !reduced && m.visible) { m.userData.to = 0; tweens.add(m); } else { scene.remove(m); tweens.delete(m); }
    world.delete(k);
  }
  if (t) {
    const m = new THREE.Mesh(box, materialFor(t)); m.position.copy(pos(x, y, z)); m.userData.k = k; m.userData.y = y; m.visible = inView(y);
    if (BLOCKS[t].alpha) m.renderOrder = 2;
    if (anim && !reduced && m.visible) { m.scale.setScalar(.05); m.userData.to = 1; tweens.add(m); burst(m.position, BLOCKS[t].c, y); }
    scene.add(m); meshes.set(k, m); world.set(k, t); layerMeshes[y].set(k, m);
  }
  dirty = true;
}
function burst(p, color, layer) {
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color, transparent: true }));
    s.userData.y = layer; s.scale.setScalar(.14); s.position.copy(p);
    s.userData.v = new THREE.Vector3((Math.random() - .5) * .25, Math.random() * .25 + .1, (Math.random() - .5) * .25); s.userData.life = 1;
    scene.add(s); parts.push(s);
  }
}
function apply(changes, anim = true) {
  const done = [];
  for (const c of changes) {
    const [x, y, z] = c.k.split(',').map(Number);
    const from = world.get(c.k) || null; if (from === c.to) continue;
    if (!from && c.to && world.size >= MAX) { toast(`Limit to ${MAX} bloków.`); break; }
    setCell(x, y, z, c.to, anim); done.push({ k: c.k, from, to: c.to });
  }
  if (done.length) { undo.push(done); redo.length = 0; }
  changed(); return done;
}
const inside = (x, y, z) => x >= 0 && z >= 0 && x < N && z < N && y >= 0 && y < H;
function expand([x, y, z], action = tool) {
  let cells = [[x, y, z]];
  if (action === 'build' && brush === '3') cells = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => [x + a, y, z + b]));
  if (action === 'build' && brush === 'col' && !active()) cells = [0, 1, 2, 3, 4].map(d => [x, y + d, z]);
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
const workPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
const workPoint = new THREE.Vector3();
function target(ev, action = tool) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  if (active()) {
    const hit = ray.intersectObjects([...layerMeshes[layerY].values()], false)[0];
    if (hit) {
      const [x, y, z] = hit.object.userData.k.split(',').map(Number);
      if (action !== 'build') return [x, y, z];
      const n = hit.face.normal;
      return n.y === 0 && inside(x + n.x, y, z + n.z) ? [x + n.x, y, z + n.z] : null;
    }
    workPlane.constant = -layerY;
    if (action !== 'build' || !ray.ray.intersectPlane(workPlane, workPoint)) return null;
    const x = Math.floor(workPoint.x + N / 2), z = Math.floor(workPoint.z + N / 2);
    return inside(x, layerY, z) ? [x, layerY, z] : null;
  }
  const hit = ray.intersectObjects([...meshes.values(), ground], false)[0];
  if (!hit) return null;
  if (hit.object === ground) {
    const x = Math.floor(hit.point.x + N / 2), z = Math.floor(hit.point.z + N / 2);
    return action === 'build' && inside(x, 0, z) ? [x, 0, z] : null;
  }
  const [x, y, z] = hit.object.userData.k.split(',').map(Number);
  if (action !== 'build') return [x, y, z];
  const n = hit.face.normal; return [x + Math.round(n.x), y + Math.round(n.y), z + Math.round(n.z)];
}
function showGhost(t) {
  ghosts.clear();
  if (t) for (const p of expand(t)) { const g = ghostCube(); g.position.copy(pos(...p)); ghosts.add(g); }
  dirty = true;
}
const el = renderer.domElement;
let down = null;
el.addEventListener('contextmenu', e => e.preventDefault());
el.addEventListener('pointermove', (e) => {
  if (down?.id === e.pointerId && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
  if (workMode !== 'animation' && e.pointerType === 'mouse' && !e.buttons) showGhost(target(e));
});
el.addEventListener('pointerleave', () => showGhost(null));
el.addEventListener('pointerdown', (e) => {
  if (workMode === 'animation' || !e.isPrimary || (e.button !== 0 && !(e.pointerType === 'mouse' && e.button === 2))) {
    down = null;
    return;
  }
  down = { id: e.pointerId, x: e.clientX, y: e.clientY, button: e.button, moved: false };
  showGhost(null);
});
el.addEventListener('pointercancel', () => { down = null; });
el.addEventListener('lostpointercapture', () => { down = null; });
el.addEventListener('pointerup', (e) => {
  const click = down;
  down = null;
  if (workMode === 'animation' || !click || click.id !== e.pointerId || click.button !== e.button ||
      click.moved || Math.hypot(e.clientX - click.x, e.clientY - click.y) > 6) return;
  const action = e.button === 2 ? 'erase' : tool;
  const t = target(e, action); if (!t) return;
  if (action === 'pick') { const ty = world.get(key(...t)); if (ty && BLOCKS[ty]) { setBlock(ty); setTool('build'); toast('Wybrano: ' + BLOCKS[ty].name); } return; }
  const cells = expand(t, action);
  const ch = cells.map(p => ({ k: key(...p), to: action === 'erase' ? null : cur }));
  const done = apply(ch);
  if (done.length) sfx(action === 'erase' ? 'remove' : 'place');
  if (action === 'build' && done.length) {
    award('ed:start', 10);
    let n = 0; for (let i = 0; i < done.length; i++) n = bump('ed:bloki');
    if (n >= 100) badge('budowniczy');
  }
  if (e.pointerType === 'mouse') showGhost(target(e));
});

const highest = () => layerMeshes.findLastIndex(layer => layer.size > 0);
function fit() {
  const top = Math.max(4, highest());
  const d = Math.max(30, top * 1.35);
  wholeTargetY = Math.min(top * .45, 30);
  const y = active() ? layerY + .5 : wholeTargetY;
  controls.target.set(0, y, 0);
  camera.position.set(d * .78, y + top * .5 + d * .45 - wholeTargetY, d * .9);
  wholeDistance = camera.position.distanceTo(controls.target);
  if (active()) setDistance(Math.min(wholeDistance, 38));
  controls.update(); dirty = true;
}

function setDistance(distance) {
  const offset = camera.position.clone().sub(controls.target).setLength(distance);
  camera.position.copy(controls.target).add(offset);
  controls.update();
  camera.updateMatrixWorld();
}
function shiftCamera(y) {
  camera.position.y += y - controls.target.y;
  controls.target.y = y;
  controls.update();
  camera.updateMatrixWorld();
}
const slider = $('#edLayer');
const planDetails = $('#edPlanDetails');
const plan = $('#edPlan');
const planCtx = plan.getContext('2d');
const layerDown = $('#edLayerDown'), layerUp = $('#edLayerUp');

function drawPlan() {
  if (!planDetails.open) return;
  const cell = (plan.width - 1) / N;
  planCtx.fillStyle = '#0d1530';
  planCtx.fillRect(0, 0, plan.width, plan.height);
  for (const k of layerMeshes[layerY].keys()) {
    const [x, , z] = k.split(',').map(Number);
    planCtx.fillStyle = BLOCKS[world.get(k)].c;
    planCtx.fillRect(x * cell, z * cell, cell, cell);
  }
  planCtx.strokeStyle = '#6c82a3';
  planCtx.beginPath();
  for (let i = 0; i <= N; i++) {
    const f = i * cell + .5;
    planCtx.moveTo(f, 0); planCtx.lineTo(f, plan.height);
    planCtx.moveTo(0, f); planCtx.lineTo(plan.width, f);
  }
  planCtx.stroke();
  plan.setAttribute('aria-label', `Plan warstwy ${layerY + 1} z góry. ${layerMeshes[layerY].size} bloków.`);
}
planDetails.addEventListener('toggle', drawPlan);

function refreshLayer(align = false) {
  const before = layerY;
  const maxY = Math.min(H - 1, highest() + 1);
  layerY = Math.max(0, Math.min(maxY, layerY));
  if (align || (active() && before !== layerY)) shiftCamera(active() ? layerY + .5 : wholeTargetY);
  slider.max = maxY + 1;
  slider.value = layerY + 1;
  $('#edLayerLabel').textContent = `Warstwa ${layerY + 1} z ${maxY + 1}`;
  slider.setAttribute('aria-valuetext', $('#edLayerLabel').textContent);
  layerDown.disabled = layerY === 0;
  layerUp.disabled = layerY === maxY;
  $('#hudLayer').hidden = !active();
  $('#hudLayer').textContent = `Warstwa ${layerY + 1}`;
  const column = document.querySelector('[data-brush="col"]');
  column.disabled = active();
  if (column.disabled && brush === 'col') { brush = '1'; press('brush', brush); }

  for (const m of meshes.values()) m.visible = inView(m.userData.y);
  for (const m of tweens) m.visible = inView(m.userData.y);
  for (const m of parts) m.visible = inView(m.userData.y);
  ground.visible = !active();
  grid.position.y = active() ? layerY + .004 : 0;
  symGroup.position.y = active() ? layerY : 0;
  showGhost(null);
  const cells = layerMeshes[layerY];
  $('#edLayerMaterialsTitle').textContent = `Materiały warstwy ${layerY + 1}`;
  $('#edLayerCount').textContent = `Liczba bloków: ${cells.size.toLocaleString('pl-PL')}`;
  listMaterials($('#edLayerMats'), [...cells.keys()].map(k => world.get(k)), 'Ta warstwa jest pusta.');
  drawPlan();
  if (workMode !== 'animation') store.set('ed:warstwy', { mode: active() ? layerMode : 'all', y: layerY });
}
function pickLayer(y) {
  const moveCamera = active() && y !== layerY;
  layerY = y;
  refreshLayer(moveCamera);
}
slider.addEventListener('input', () => pickLayer(+slider.value - 1));
layerDown.addEventListener('click', () => pickLayer(layerY - 1));
layerUp.addEventListener('click', () => pickLayer(layerY + 1));
seg('layer-mode', (mode) => {
  if (mode === layerMode) return;
  layerMode = mode;
  press('layer-mode', mode);
  refreshLayer();
});

// Animacja zmienia wyłącznie widoczność siatek. Eksport i historia czytają world.
const tabs = [...document.querySelectorAll('[data-ed-mode]')];
const animationPlay = $('#edAnimationPlay'), animationPrev = $('#edAnimationPrev'), animationNext = $('#edAnimationNext');
const firstAnimationLayer = () => layerMeshes.findIndex(layer => layer.size > 0);
const nextAnimationLayer = () => animationY < 0 ? firstAnimationLayer() : animationY + 1;
function showAnimationFrame(y) {
  const top = highest();
  animationY = y < firstAnimationLayer() ? -1 : Math.min(y, top);
  for (const m of meshes.values()) m.visible = inView(m.userData.y);
  $('#edAnimationStatus').textContent = top < 0 ? 'Najpierw zbuduj coś w trybie Budowanie.'
    : animationY < 0 ? 'Gotowe do podglądu.' : `Warstwa ${animationY + 1} z ${top + 1}`;
  animationPlay.disabled = top < 0;
  $('#edAnimationReset').disabled = animationPrev.disabled = animationY < 0;
  animationNext.disabled = animationY >= top;
  dirty = true;
}
function stopAnimation() {
  clearInterval(animationTimer);
  animationTimer = 0;
  animationPlay.textContent = 'Start';
  animationPlay.setAttribute('aria-label', 'Start animacji');
}
function stepAnimation(y) {
  stopAnimation();
  showAnimationFrame(y);
}
animationPrev.addEventListener('click', () => stepAnimation(animationY - 1));
animationNext.addEventListener('click', () => stepAnimation(nextAnimationLayer()));
$('#edAnimationReset').addEventListener('click', () => stepAnimation(-1));
animationPlay.addEventListener('click', () => {
  if (animationTimer) { stopAnimation(); return; }
  const top = highest();
  if (top < 0) return;
  if (animationY >= top) showAnimationFrame(-1);
  showAnimationFrame(nextAnimationLayer());
  if (animationY >= top) return;
  animationPlay.textContent = 'Pauza';
  animationPlay.setAttribute('aria-label', 'Pauza animacji');
  animationTimer = setInterval(() => {
    showAnimationFrame(animationY + 1);
    if (animationY >= top) stopAnimation();
  }, 550);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAnimation(); });

function updateMode() {
  for (const tab of tabs) {
    const selected = tab.dataset.edMode === workMode;
    tab.setAttribute('aria-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
  }
  const watching = workMode === 'animation';
  $('#edTools').hidden = watching;
  $('#hudTool').hidden = watching;
  $('#edLayerInfo').hidden = !active();
  $('#name').readOnly = watching;
  stage.classList.toggle('ed-previewing', watching);
}
function setMode(mode) {
  if (mode === workMode) return;
  const wasActive = active();
  if (!wasActive && workMode !== 'animation') {
    wholeTargetY = controls.target.y;
    wholeDistance = camera.position.distanceTo(controls.target);
  }
  stopAnimation();
  workMode = mode;
  animationY = -1;
  down = null;
  updateMode();
  refreshLayer(wasActive !== active());
  if (wasActive !== active()) setDistance(active() ? Math.min(wholeDistance, 38) : wholeDistance);
  if (mode === 'animation') showAnimationFrame(-1);
}
seg('ed-mode', setMode);
$('#edTabs').addEventListener('keydown', (e) => {
  const index = tabs.indexOf(e.target);
  if (index < 0) return;
  const n = tabs.length;
  const next = { ArrowLeft: (index + n - 1) % n, ArrowRight: (index + 1) % n, Home: 0, End: n - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  setMode(tabs[next].dataset.edMode);
  tabs[next].focus();
});

// ---------- cofnij / ponów / wyczyść / szablony ----------
function changesHidden(list) {
  return active() && list.some(c => !inView(+c.k.split(',')[1]));
}
function history(from, to, reverse) {
  const list = from.at(-1);
  if (!list || (changesHidden(list) && !confirm('Ta zmiana obejmuje ukryte warstwy. Kontynuować?'))) return;
  from.pop();
  for (const c of reverse ? [...list].reverse() : list) {
    const [x, y, z] = c.k.split(',').map(Number);
    setCell(x, y, z, reverse ? c.from : c.to);
  }
  to.push(list);
  changed();
}
const doUndo = () => history(undo, redo, true);
const doRedo = () => history(redo, undo, false);
$('#undo').addEventListener('click', doUndo); $('#redo').addEventListener('click', doRedo);
$('#clear').addEventListener('click', () => {
  if (!world.size) return;
  const changes = [...world.keys()].map(k => ({ k, to: null }));
  if (changesHidden(changes) && !confirm('Wyczyścić całą budowlę wraz z ukrytymi warstwami?')) return;
  apply(changes);
  toast('Plac wyczyszczony. Cofniesz to przyciskiem ↶.');
});
tplSel.addEventListener('change', () => {
  const id = tplSel.value; tplSel.value = ''; if (!id) return;
  loadTemplate(getBuild(id));
});
function loadTemplate(b) {
  const ox = Math.floor((N - b.size[0]) / 2), oz = Math.floor((N - b.size[2]) / 2);
  const next = new Map();
  for (const [x, y, z, t] of b.blocks) {
    if (BLOCKS[t].id && inside(x + ox, y, z + oz)) next.set(key(x + ox, y, z + oz), t);
  }
  const changes = [];
  for (const k of world.keys()) if (!next.has(k)) changes.push({ k, to: null });
  for (const [k, t] of next) changes.push({ k, to: t });
  $('#name').value = b.name;
  apply(changes, false);
  fit();
  toast(`Wczytano: ${b.name}. Możesz ją przerabiać.`);
}
const challenge = new URLSearchParams(location.search).get('wyzwanie');
if (challenge) import('./kolo-projekt.js').then(({ decodeProject, starterFor }) => {
  const indexes = decodeProject(challenge);
  if (!indexes) return;
  const draft = starterFor(indexes);
  const panel = $('#edChallenge');
  $('#edChallengeName').textContent = draft.name;
  $('#edChallengeNote').hidden = world.size === 0;
  panel.hidden = false;
  function closeChallenge() {
    panel.hidden = true;
    const url = new URL(location.href);
    url.searchParams.delete('wyzwanie');
    window.history.replaceState(null, '', url);
    $('#edBuildTab').focus();
  }
  $('#edChallengeCancel').addEventListener('click', closeChallenge);
  $('#edChallengeLoad').addEventListener('click', () => {
    setMode('build');
    loadTemplate(draft);
    closeChallenge();
  });
});
addEventListener('keydown', (e) => {
  if (workMode === 'animation' || e.target.closest('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
  else if (e.key === 'b') setTool('build'); else if (e.key === 'e') setTool('erase'); else if (e.key === 'i') setTool('pick');
});

// ---------- zmiany: licznik, materiały, eksport, zapis ----------
function normBlocks() {
  const arr = [...world.entries()].map(([k, t]) => { const [x, y, z] = k.split(',').map(Number); return [x, y, z, t]; });
  if (!arr.length) return arr;
  const mx = Math.min(...arr.map(a => a[0])), mz = Math.min(...arr.map(a => a[2]));
  return arr.map(([x, y, z, t]) => [x - mx, y, z - mz, t]);
}
function listMaterials(list, types, empty) {
  const count = new Map();
  for (const t of types) count.set(t, (count.get(t) || 0) + 1);
  const rows = [...count].sort((a, b) => b[1] - a[1]);
  const st = (n) => n >= 64 ? `${Math.floor(n / 64)}×64${n % 64 ? ' + ' + (n % 64) : ''}` : '';
  list.innerHTML = rows.length ? rows.map(([t, n]) => `<li><label><span></span><i style="background:${BLOCKS[t].c}"></i><span class="mn">${BLOCKS[t].name}</span><span class="mc">${n}</span><span class="ms muted">${st(n)}</span></label></li>`).join('') : '<li class="muted small">' + empty + '</li>';
}
let saveT;
function save() {
  clearTimeout(saveT); saveT = undefined;
  store.set('ed:swiat', { name: $('#name').value, b: [...world.entries()] });
}
addEventListener('pagehide', () => { if (saveT) save(); });
function changed() {
  $('#hudCount').textContent = `${world.size.toLocaleString('pl-PL')} bloków`;
  listMaterials($('#mats'), world.values(), 'Plac jest pusty. Postaw pierwszy blok.');
  refreshLayer();
  updExport();
  clearTimeout(saveT); saveT = setTimeout(save, 400);
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
  const button = e.currentTarget;
  const { name, blob } = await datapack(normBlocks(), $('#name').value);
  download(blob, `kilekcraft_${name}.zip`);
  const r = button.getBoundingClientRect();
  if (award('ed:eksport', 50, { from: { x: r.left + r.width / 2, y: r.top } })) badge('architekt');
  toast('Datapack gotowy. Jeśli plik się nie pobrał, otwórz stronę w zwykłej przeglądarce.');
});
packStatusHTML().then(h => { $('#packStatus').innerHTML = h; });

// odtworzenie zapisu
const saved = store.get('ed:swiat');
if (Array.isArray(saved?.b)) {
  $('#name').value = saved.name || 'moja budowla';
  for (const item of saved.b) {
    if (!Array.isArray(item)) continue;
    const [k, t] = item;
    if (typeof k !== 'string' || !Object.hasOwn(BLOCKS, t) || world.size >= MAX) continue;
    const coords = k.split(',').map(Number);
    if (coords.length === 3 && coords.every(Number.isInteger) && inside(...coords)) setCell(...coords, t, false);
  }
}
else { // mały start, żeby plac nie był pusty
  for (let x = 20; x < 28; x++) for (let z = 20; z < 28; z++) setCell(x, 0, z, (x + z) % 2 ? 'stone_bricks' : 'smooth_stone', false);
}
press('layer-mode', layerMode);
updateMode();
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
