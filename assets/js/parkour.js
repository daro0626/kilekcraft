// =========================================================
// KILEKCRAFT — wyścig parkour w przeglądarce.
// Fizyka w blokach na sekundę, podobna do gry (skok ≈ 1,25 bloku).
// =========================================================
import * as THREE from 'three';
import { store, reduced, award, badge, sfx, xpBurst, toast } from './core.js';
import { BLOCKS } from './builds.js';
import { materialFor } from './voxel-scene.js';
import { generate, encode, decode } from './komnaty-gen.js';

const $ = (s) => document.querySelector(s);
const G = 28, JUMP = 8.4, SPEED = 5.6, ACC_G = 40, ACC_A = 14, W = .3, HGT = 1.8;
const DEADLY = new Set(['lava']), PASS = new Set(['lava', 'portal', 'water']);

// ---------- wybór komnaty ----------
let state = decode(location.hash.slice(1)) || store.get('komnata') || { type: 'parkour', diff: 3, theme: 'kamien', seed: 4821 };
const codeIn = $('#code');
document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
  const q = b.dataset.q, seed = Math.floor(Math.random() * 99999) + 1;
  if (q === 'rand') state = { type: Math.random() < .25 ? 'labirynt' : 'parkour', diff: 1 + Math.floor(Math.random() * 10), theme: ['kamien', 'nether', 'lod', 'neon'][Math.floor(Math.random() * 4)], seed };
  else state = { type: q[0] === 'L' ? 'labirynt' : 'parkour', diff: +q.slice(1), theme: state.theme || 'kamien', seed };
  loadLevel();
}));
$('#load').addEventListener('click', () => { const d = decode(codeIn.value); if (!d) { toast('Ten kod wygląda źle. Wzór: P5-K-4821'); return; } state = d; loadLevel(); });
codeIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#load').click(); } });

// ---------- scena ----------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: (devicePixelRatio || 1) < 2 });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1428);
scene.fog = new THREE.Fog(0x0d1428, 30, 90);
const camera = new THREE.PerspectiveCamera(65, 1, .1, 300);
scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x3a2550, 2.0));
const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(.8, 2, .5); scene.add(sun);
const level = new THREE.Group(); scene.add(level);
const box = new THREE.BoxGeometry(1, 1, 1);

// gracz: własna postać „redstone-robot”
const player = new THREE.Group(); scene.add(player);
const mk = (w, h, d, c, y, x = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, 0); player.add(m); return m; };
const legL = mk(.22, .7, .26, 0x2b3a63, .35, -.13), legR = mk(.22, .7, .26, 0x2b3a63, .35, .13);
mk(.56, .7, .32, 0xff3d3d, 1.05); const head = mk(.46, .44, .44, 0xffd2c8, 1.62);
const eye = new THREE.MeshBasicMaterial({ color: 0x10182c });
[-.1, .1].forEach(x => { const e = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .02), eye); e.position.set(x, 1.66, .23); player.add(e); });
const armL = mk(.16, .62, .2, 0xff3d3d, 1.05, -.37), armR = mk(.16, .62, .2, 0xff3d3d, 1.05, .37);
legL.geometry.translate(0, -.35, 0); legL.position.y = .7; legR.geometry.translate(0, -.35, 0); legR.position.y = .7;
armL.geometry.translate(0, -.28, 0); armL.position.y = 1.35; armR.geometry.translate(0, -.28, 0); armR.position.y = 1.35;
const shadow = new THREE.Mesh(new THREE.CircleGeometry(.38, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

// ---------- świat ----------
let solid = new Map(), room = null, spawn = new THREE.Vector3(), finishY = 0, minY = 0;
const lavaMats = [];
const k3 = (x, y, z) => x + ',' + y + ',' + z;
function loadLevel() {
  room = generate(state);
  const code = encode(state); codeIn.value = code;
  try { history.replaceState(null, '', '#' + code); } catch { /* podgląd */ }
  store.set('komnata', state);
  level.clear(); solid = new Map(); lavaMats.length = 0;
  const by = {};
  for (const b of room.blocks) { (by[b[3]] ||= []).push(b); solid.set(k3(b[0], b[1], b[2]), b[3]); }
  const M = new THREE.Matrix4();
  for (const [t, list] of Object.entries(by)) {
    const mat = materialFor(t);
    const m = new THREE.InstancedMesh(box, mat, list.length);
    list.forEach((b, i) => { M.makeTranslation(b[0] + .5, b[1] + .5, b[2] + .5); m.setMatrixAt(i, M); });
    if (BLOCKS[t].alpha) m.renderOrder = 2;
    level.add(m);
    if (t === 'lava') lavaMats.push(mat);
  }
  // start: złoty blok (parkour) albo szmaragd (labirynt)
  const st = room.blocks.find(b => b[3] === 'gold') || room.blocks.find(b => b[3] === 'emerald') || room.blocks[0];
  spawn.set(st[0] + .5, st[1] + 1, st[2] + .5);
  minY = Math.min(...room.blocks.map(b => b[1]));
  best = store.get('pk:best:' + code, null);
  $('#best').textContent = best ? fmt(best) : '—';
  yaw = state.type === 'labirynt' ? Math.PI / 4 : -Math.PI / 2; pitch = state.type === 'labirynt' ? .85 : .38;
  reset(true);
  showOver('Gotowy?', `${state.type === 'labirynt' ? 'Labirynt' : 'Parkour'} · trudność ${state.diff} · kod ${code}`, false);
}

// ---------- stan gry ----------
const pos = new THREE.Vector3(), vel = new THREE.Vector3();
let onGround = false, yaw = -Math.PI / 2, pitch = .38, running = false, started = false, finished = false;
let tStart = 0, tNow = 0, deaths = 0, best = null, checkpoint = null, walkPhase = 0, faceYaw = 0, airPrev = false;
const keys = new Set(); let joy = { x: 0, y: 0 }, jumpQueued = false;
const fmt = (s) => s.toFixed(2).replace('.', ',');

function reset(full) {
  if (full) { checkpoint = spawn.clone(); deaths = 0; started = false; finished = false; tNow = 0; }
  pos.copy(checkpoint || spawn); vel.set(0, 0, 0); onGround = false;
  $('#deaths').textContent = deaths; $('#time').textContent = fmt(tNow);
}
function die() {
  deaths++; sfx('lava'); $('#deaths').textContent = deaths;
  const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  reset(false);
}

// ---------- kolizje ----------
const isSolid = (x, y, z) => { const t = solid.get(k3(x, y, z)); return t && !PASS.has(t); };
function overlaps(px, py, pz) {
  for (let x = Math.floor(px - W); x <= Math.floor(px + W - 1e-6); x++)
    for (let y = Math.floor(py); y <= Math.floor(py + HGT - 1e-6); y++)
      for (let z = Math.floor(pz - W); z <= Math.floor(pz + W - 1e-6); z++) if (isSolid(x, y, z)) return { x, y, z };
  return null;
}
function moveAxis(axis, d) {
  if (!d) return;
  pos[axis] += d;
  const hit = overlaps(pos.x, pos.y, pos.z); if (!hit) return;
  if (axis === 'y') {
    if (d < 0) { pos.y = hit.y + 1; onGround = true; } else pos.y = hit.y - HGT - 1e-4;
    vel.y = 0;
  } else {
    const c = hit[axis];
    pos[axis] = d > 0 ? c - W - 1e-4 : c + 1 + W + 1e-4;
    vel[axis] = 0;
  }
}
function feetBlock() { return solid.get(k3(Math.floor(pos.x), Math.floor(pos.y - .05), Math.floor(pos.z))); }
function touching(type) {
  for (let x = Math.floor(pos.x - W); x <= Math.floor(pos.x + W - 1e-6); x++)
    for (let z = Math.floor(pos.z - W); z <= Math.floor(pos.z + W - 1e-6); z++)
      for (let y = Math.floor(pos.y - .05); y <= Math.floor(pos.y + .5); y++) if (solid.get(k3(x, y, z)) === type) return true;
  return false;
}

function step(dt) {
  // wejście
  let ix = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + joy.x;
  let iz = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0) + joy.y;
  const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
  if (keys.has('q')) yaw += dt * 2.2; if (keys.has('e')) yaw -= dt * 2.2;
  const fx = Math.sin(yaw + Math.PI), fz = Math.cos(yaw + Math.PI); // kierunek „do przodu” od kamery
  const rx = -fz, rz = fx;
  const tx = (fx * iz + rx * ix) * SPEED, tz = (fz * iz + rz * ix) * SPEED;
  if ((ix || iz) && !started && !finished) { started = true; tStart = performance.now(); }
  const acc = (onGround ? ACC_G : ACC_A) * dt;
  vel.x += Math.max(-acc, Math.min(acc, tx - vel.x));
  vel.z += Math.max(-acc, Math.min(acc, tz - vel.z));
  if (ix || iz) { faceYaw = Math.atan2(tx, tz); walkPhase += dt * 11 * (onGround ? 1 : .3); } else walkPhase *= .9;
  if ((keys.has(' ') || jumpQueued) && onGround) { vel.y = JUMP; onGround = false; sfx('jump'); if (!started && !finished) { started = true; tStart = performance.now(); } }
  jumpQueued = false;
  vel.y -= G * dt; vel.y = Math.max(vel.y, -40);
  const was = onGround; onGround = false;
  moveAxis('x', vel.x * dt); moveAxis('z', vel.z * dt); moveAxis('y', vel.y * dt);
  if (onGround && !was && airPrev) sfx('land');
  airPrev = !onGround;
  // zdarzenia
  if (touching('lava') || pos.y < minY - 4) { die(); return; }
  // parkour: dotknięcie podłogi = upadek, wracasz do punktu kontrolnego
  if (state.type === 'parkour' && onGround && pos.y < minY + 1.5) { die(); return; }
  const fb = onGround ? feetBlock() : null;
  if (fb === 'emerald') {
    const cp = new THREE.Vector3(Math.floor(pos.x) + .5, Math.floor(pos.y), Math.floor(pos.z) + .5);
    if (!checkpoint || checkpoint.distanceTo(cp) > 1.5) { checkpoint = cp; sfx('checkpoint'); toast('Punkt kontrolny!'); }
  }
  if (fb === 'diamond' && started && !finished) win();
}

function win() {
  finished = true; running = false;
  const t = (performance.now() - tStart) / 1000; tNow = t; $('#time').textContent = fmt(t);
  const code = encode(state), rec = !best || t < best;
  if (rec) { best = t; store.set('pk:best:' + code, t); $('#best').textContent = fmt(t); }
  sfx('win'); const r = canvas.getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2, 30);
  award('pk:' + code, 25); badge('parkour'); if (state.diff >= 7) badge('speedrun');
  showOver(rec ? 'Nowy rekord!' : 'Meta!', `Czas ${fmt(t)} s · śmierci: ${deaths} · kod ${code}`, true);
}

// ---------- nakładka ----------
const over = $('#over');
function showOver(title, text, done) {
  $('#ovTitle').textContent = title; $('#ovText').textContent = text;
  $('#play').textContent = done ? '↻ Jeszcze raz' : '▶ Graj';
  $('#nextLvl').hidden = !done || state.diff >= 10; $('#keys').hidden = done;
  over.hidden = false; running = false;
}
function play() { if (finished) reset(true); over.hidden = true; running = true; canvas.focus(); last = performance.now(); }
$('#play').addEventListener('click', play);
$('#nextLvl').addEventListener('click', () => { state = { ...state, diff: Math.min(10, state.diff + 1), seed: Math.floor(Math.random() * 99999) + 1 }; loadLevel(); play(); });

// ---------- sterowanie ----------
canvas.tabIndex = 0;
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (e.target.closest?.('input,select,textarea')) return;
  if (k === 'escape' && running) { showOver('Pauza', 'Odpocznij chwilę.', false); return; }
  if (!running) { if ((k === ' ' || k === 'enter') && !over.hidden && document.activeElement !== $('#play')) { e.preventDefault(); play(); } return; }
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (k === 'r') { reset(false); return; }
  keys.add(k);
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); if (running) showOver('Pauza', 'Gra czeka na ciebie.', false); });
// obrót kamery przeciąganiem
let drag = null;
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => (drag = null));
addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw -= (e.clientX - drag.x) * .006; pitch = Math.max(.05, Math.min(1.35, pitch + (e.clientY - drag.y) * .004));
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(3, Math.min(12, dist + e.deltaY * .01)); }, { passive: false });
// dotyk: joystick + skok + obrót prawym kciukiem
const stick = $('#stick'), knob = $('#knob');
let stickId = null, stickO = null, lookId = null, lookP = null;
const touchArea = $('#wrapG');
touchArea.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !running) return;
  const r = touchArea.getBoundingClientRect();
  if (e.target === $('#jumpBtn')) return;
  if (e.clientX - r.left < r.width * .45 && stickId === null) { stickId = e.pointerId; stickO = { x: e.clientX, y: e.clientY }; stick.style.left = (e.clientX - r.left - 60) + 'px'; stick.style.top = (e.clientY - r.top - 60) + 'px'; stick.classList.add('on'); }
  else if (lookId === null) { lookId = e.pointerId; lookP = { x: e.clientX, y: e.clientY }; }
});
touchArea.addEventListener('pointermove', (e) => {
  if (e.pointerId === stickId) {
    let dx = e.clientX - stickO.x, dy = e.clientY - stickO.y; const l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx *= m / l; dy *= m / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; joy = { x: dx / m, y: -dy / m };
  } else if (e.pointerId === lookId) {
    yaw -= (e.clientX - lookP.x) * .008; pitch = Math.max(.05, Math.min(1.35, pitch + (e.clientY - lookP.y) * .005)); lookP = { x: e.clientX, y: e.clientY };
  }
});
const endTouch = (e) => { if (e.pointerId === stickId) { stickId = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; stick.classList.remove('on'); } if (e.pointerId === lookId) lookId = null; };
touchArea.addEventListener('pointerup', endTouch); touchArea.addEventListener('pointercancel', endTouch);
$('#jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpQueued = true; });
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');

// ---------- pętla ----------
let last = performance.now(), dist = 5.5;
const camT = new THREE.Vector3();
function resize() { const r = canvas.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(canvas);
(function loop(now) {
  requestAnimationFrame(loop);
  now = now || performance.now();
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (running) {
    const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) step(dt / n);
    if (started && !finished) { tNow = (performance.now() - tStart) / 1000; $('#time').textContent = fmt(tNow); }
  }
  // postać
  player.position.copy(pos);
  let dy = faceYaw - player.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.rotation.y += dy * .25;
  const sw = Math.sin(walkPhase) * (onGround ? .7 : .25);
  legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * .8; armR.rotation.x = sw * .8;
  head.position.y = 1.62 + Math.abs(Math.sin(walkPhase)) * .03;
  // cień na podłożu
  let sy = Math.floor(pos.y); while (sy > minY - 2 && !isSolid(Math.floor(pos.x), sy - 1, Math.floor(pos.z))) sy--;
  shadow.position.set(pos.x, sy + .02, pos.z); shadow.material.opacity = Math.max(.08, .4 - (pos.y - sy) * .06);
  // kamera za graczem
  camT.set(pos.x, pos.y + 1.3, pos.z);
  const cx = camT.x + Math.sin(yaw) * Math.cos(pitch) * dist, cz = camT.z + Math.cos(yaw) * Math.cos(pitch) * dist, cy = camT.y + Math.sin(pitch) * dist;
  camera.position.lerp(new THREE.Vector3(cx, cy, cz), reduced ? 1 : .2); camera.lookAt(camT);
  // lawa pulsuje
  for (const m of lavaMats) if (m.emissiveIntensity !== undefined) m.emissiveIntensity = .7 + Math.sin(now / 300) * .25;
  renderer.render(scene, camera);
})();

loadLevel();
