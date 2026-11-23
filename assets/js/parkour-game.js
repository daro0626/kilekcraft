// =========================================================
// KILEKCRAFT — wyścig parkour w przeglądarce.
// Fizyka w blokach na sekundę, podobna do gry (skok ≈ 1,25 bloku).
// =========================================================
import * as THREE from 'three';
import { store, reduced, award, badge, sfx, xpBurst, toast } from './core.js';
import { BLOCKS } from './blocks.js';
import { materialFor } from './voxel-scene.js';
import { generate, encode, kindName } from './komnaty-gen.js';
import { createRun, CRACK } from './fizyka.js';
import { MISTRZ } from './komnaty-mistrz.js';

const $ = (s) => document.querySelector(s);

// ---------- scena ----------
const canvas = $('#gl');
const coarse = matchMedia('(pointer: coarse)').matches;
const ratio = Math.min(devicePixelRatio || 1, coarse ? 1.25 : 2);
export function initGame(onNext) {
  const context = canvas.getContext('webgl2', { antialias: !coarse && ratio < 2 });
  if (!context) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, context });
  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1428);
  scene.fog = new THREE.Fog(0x0d1428, 30, 90);
  const camera = new THREE.PerspectiveCamera(65, 1, .1, 300);
  const hemi = new THREE.HemisphereLight(0xc8d8ff, 0x3a2550, 2.0); scene.add(hemi);
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

  // Model ramion jest osobnym ujęciem, w dolnych rogach ekranu.
  const handsScene = new THREE.Scene();
  const handsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 10);
  handsCamera.position.z = 3;
  handsScene.add(new THREE.HemisphereLight(0xfff5e5, 0x48385e, 2.7));
  const sleeve = new THREE.MeshLambertMaterial({ color: 0xac3038 });
  const glove = new THREE.MeshLambertMaterial({ color: 0xffc3ab });
  const hands = [-1, 1].map(side => {
    const hand = new THREE.Group();
    const forearm = new THREE.Mesh(box, sleeve);
    forearm.scale.set(.23, .36, .22);
    const fist = new THREE.Mesh(box, glove);
    fist.scale.set(.20, .19, .20);
    fist.position.y = .23;
    hand.add(forearm, fist);
    hand.rotation.set(.37, side * .3, side * .22);
    handsScene.add(hand);
    return hand;
  });

  // duch: najlepszy zapisany przejazd na tej trasie, bez animacji kończyn
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: .34, depthWrite: false });
  const ghost = new THREE.Group(); ghost.visible = false; ghost.renderOrder = 3; scene.add(ghost);
  const gmk = (w, h, d, y, x = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ghostMat); m.position.set(x, y, 0); ghost.add(m); };
  gmk(.22, .7, .26, .35, -.13); gmk(.22, .7, .26, .35, .13);
  gmk(.56, .7, .32, 1.05); gmk(.46, .44, .44, 1.62);
  gmk(.16, .62, .2, 1.05, -.37); gmk(.16, .62, .2, 1.05, .37);

  // ---------- świat ----------
  let solid = new Map(), room = null, spawn = new THREE.Vector3(), minY = 0, run = null;
  // kruszące się bloki mają własne siatki (znikają i wracają), lawa rośnie jako osobna płyta
  const dyn = new Map(); let lavaSheet = null;
  const lavaMats = new Set();
  const k3 = (x, y, z) => x + ',' + y + ',' + z;
  const faceSteps = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  // W górze są długie płaszczyzny z jednego materiału. Łączymy je
  // w obrębie fragmentu mapy, żeby nadal odrzucać fragmenty poza kadrem.
  const mountainMaterials = new Map();
  function repeatTexture(material) {
    if (!material.map || material.transparent) return material;
    if (!mountainMaterials.has(material)) {
      const copy = material.clone();
      copy.map = material.map.clone();
      copy.map.wrapS = copy.map.wrapT = THREE.RepeatWrapping;
      copy.map.needsUpdate = true;
      mountainMaterials.set(material, copy);
    }
    return mountainMaterials.get(material);
  }

  function buildMeshes() {
    const chunks = new Map();
    const { position, normal } = box.attributes;
    const point = i => new THREE.Vector3().fromBufferAttribute(position, i);
    const directions = faceSteps.map((_, index) => {
      const corner = point(index * 4);
      return { corner, u: point(index * 4 + 1).sub(corner), v: point(index * 4 + 2).sub(corner),
        normal: new THREE.Vector3().fromBufferAttribute(normal, index * 4) };
    });
    const origin = new THREE.Vector3();
    const mountain = state.type === 'gora';
    const chunkShift = mountain ? 4 : 3;
    for (const [x, y, z, type] of room.blocks) {
      const materials = materialFor(type);
      if (type === CRACK) {
        const mesh = new THREE.Mesh(box, materials); mesh.position.set(x + .5, y + .5, z + .5);
        dyn.set(k3(x, y, z), mesh); level.add(mesh); continue;
      }
      origin.set(x, y, z);
      for (const [face, [dx, dy, dz]] of faceSteps.entries()) {
        const adjacent = solid.get(k3(x + dx, y + dy, z + dz));
        if (adjacent && adjacent !== CRACK && (!BLOCKS[adjacent].alpha && BLOCKS[adjacent].pat !== 'leaves' ||
                         mountain && adjacent === type && type === 'water')) continue;
        const material = Array.isArray(materials) ? materials[face] : materials;
        const rendered = mountain ? repeatTexture(material) : material;
        const key = [x >> chunkShift, y >> chunkShift, z >> chunkShift, rendered.id].join(',');
        if (!chunks.has(key)) chunks.set(key, {
          material: rendered, positions: [], normals: [], uvs: [], indices: [], planes: new Map(),
        });
        const chunk = chunks.get(key);
        const dir = directions[face];
        if (mountain && !material.transparent) {
          const slice = face + ':' + origin.dot(dir.normal);
          if (!chunk.planes.has(slice)) chunk.planes.set(slice, { dir, cells: new Map() });
          const u = origin.dot(dir.u), v = origin.dot(dir.v);
          chunk.planes.get(slice).cells.set(u + ',' + v, { x, y, z, u, v });
        } else quad(chunk, dir, { x, y, z }, 1, 1);
        if (type === 'lava') lavaMats.add(material);
      }
    }
    for (const chunk of chunks.values()) {
      for (const { dir, cells } of chunk.planes.values()) {
        for (const first of cells.values()) {
          const { u, v } = first;
          let width = 1, height = 1;
          while (cells.has(u + width + ',' + v)) width++;
          rows: while (true) {
            for (let i = 0; i < width; i++) {
              if (!cells.has((u + i) + ',' + (v + height))) break rows;
            }
            height++;
          }
          for (let i = 0; i < width; i++) for (let j = 0; j < height; j++) {
            cells.delete((u + i) + ',' + (v + j));
          }
          quad(chunk, dir, first, width, height);
        }
      }
      const { material, positions, normals, uvs, indices } = chunk;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      const mesh = new THREE.Mesh(geometry, material);
      if (material.transparent) mesh.renderOrder = 2;
      level.add(mesh);
    }
  }

  function quad(chunk, { corner, u, v, normal }, { x, y, z }, width, height) {
    const start = chunk.positions.length / 3;
    for (const [a, b] of [[0, 0], [width, 0], [0, height], [width, height]]) {
      chunk.positions.push(x + .5 + corner.x + a * u.x + b * v.x,
                           y + .5 + corner.y + a * u.y + b * v.y,
                           z + .5 + corner.z + a * u.z + b * v.z);
      chunk.normals.push(normal.x, normal.y, normal.z);
      chunk.uvs.push(a, height - b);
    }
    chunk.indices.push(start, start + 2, start + 1, start + 2, start + 3, start + 1);
  }
  let state;
  function loadLevel(nextState) {
    state = nextState;
    room = generate(state);
    renderer.setPixelRatio(coarse && state.type === 'gora' ? Math.min(.72, ratio) : ratio);
    const code = encode(state);
    for (const mesh of level.children) if (mesh.geometry !== box) mesh.geometry.dispose();
    level.clear(); dyn.clear(); lavaMats.clear();
    // fizyka i zasady komnaty: wspólny kod z testem bota (fizyka.js)
    run = createRun(room, state.type, () => new THREE.Vector3());
    solid = run.solid; pos = run.pos; vel = run.vel; minY = run.minY;
    spawn.set(run.spawn.x, run.spawn.y, run.spawn.z);
    buildMeshes();
    const R = run.rules;
    if (lavaSheet) { scene.remove(lavaSheet); lavaSheet.geometry.dispose(); lavaSheet = null; }
    if (R.lava) {
      const mat = materialFor('lava'); lavaMats.add(Array.isArray(mat) ? mat[2] : mat);
      lavaSheet = new THREE.Mesh(new THREE.BoxGeometry(room.size[0] + 6, 1, room.size[2] + 6), mat);
      lavaSheet.position.set(room.size[0] / 2, R.lava.y0 - .5, room.size[2] / 2); scene.add(lavaSheet);
    }
    const lavaTile = $('#lavaTile'); if (lavaTile) lavaTile.hidden = !R.lava;
    best = store.get('pk:best:' + code, null);
    $('#best').textContent = best ? fmt(best) : '—';
    const savedGhost = store.get('pk:ghost:' + code, null);
    ghostData = Array.isArray(savedGhost) && savedGhost.length ? savedGhost : null;
    $('#ghostTile').hidden = !ghostData;
    if (ghostData) $('#ghost').textContent = fmt(ghostData[ghostData.length - 1][0]);
    // labirynt: jasne niebo i mocniejsze światło, żeby ściany i droga były czytelne
    const mz = state.type === 'labirynt', gora = state.type === 'gora';
    const sky = mz || (gora && state.theme !== 'neon');
    scene.background.set(sky ? 0x4a6fa5 : 0x0d1428); scene.fog.color.copy(scene.background);
    scene.fog.near = sky ? 40 : 30; scene.fog.far = sky ? 140 : 90;
    hemi.intensity = sky ? 3.2 : 2.0; sun.intensity = sky ? 3.0 : 2.4;
    if (run.rules.fog) {
      // ciemność: widać tylko kilka bloków, świecące platformy pokazują drogę
      scene.background.set(0x05070d); scene.fog.color.copy(scene.background);
      scene.fog.near = 1; scene.fog.far = run.rules.fog; hemi.intensity = 1.5; sun.intensity = 1.6;
    }
    yaw = -Math.PI / 2; pitch = fp ? .15 : mz ? .85 : .38;
    if (gora) {
      // na górze patrz wzdłuż trasy (przeciwnie do ruchu wskazówek zegara) i trochę na zbocze
      const tops = room.blocks.filter(b => b[3] === 'diamond');
      const cx = tops.reduce((a, b) => a + b[0], 0) / tops.length + .5, cz = tops.reduce((a, b) => a + b[2], 0) / tops.length + .5;
      const rx = spawn.x - cx, rz = spawn.z - cz, l = Math.hypot(rx, rz) || 1;
      const fx = -rz / l - .6 * rx / l, fz = rx / l - .6 * rz / l;
      yaw = Math.atan2(-fx, -fz); pitch = fp ? .05 : .3;
    }
    reset(true);
    const ghostTxt = ghostData ? ` · 👻 obok pobiegnie twój duch (${fmt(ghostData[ghostData.length - 1][0])} s)` : '';
    const mi = state.type === 'mistrz' ? MISTRZ[state.diff] : null;
    showOver(mi ? `M${state.diff} · ${mi.name}` : kindName(state.type),
      `Poziom ${state.diff} · kod ${code}${mi ? ` · ${mi.zasada} Pułapka: ${mi.pulapka}` : ''}${ghostTxt}`, 'start');
    resize(true);
  }

  // ---------- stan gry ----------
  let pos = new THREE.Vector3(), vel = new THREE.Vector3();
  let onGround = false, yaw = -Math.PI / 2, pitch = .38, running = false, started = false, finished = false;
  let tNow = 0, deaths = 0, best = null, walkPhase = 0, faceYaw = 0;
  // klawisze po kodzie fizycznym: Shift, Caps Lock ani polski Alt (ą, ę, ś) nie zmieniają ich nazwy,
  // więc puszczony klawisz zawsze znika z listy i postać nie „idzie sama”
  const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyQ: 'tl', KeyE: 'tr' };
  const keys = new Set(); let joy = { x: 0, y: 0 }, jumpBuffer = 0;
  const held = (action) => { for (const c of keys) if (KEYMAP[c] === action) return true; return false; };
  const views = { trzecia: 'Zza pleców', pierwsza: 'Z oczu', rece: 'Z rękami (FPS)' };
  const viewOrder = Object.keys(views);
  const savedView = store.get('pk:widok', 'trzecia');
  let view = viewOrder.includes(savedView) ? savedView : 'trzecia';
  let fp = view !== 'trzecia';
  const fmt = (s) => s.toFixed(2).replace('.', ',');
  // duch: [czas, x, y, z, kąt] co REC_DT sekund z najlepszego zapisanego przejazdu
  const REC_DT = .08, MAX_SAMPLES = 2048;
  let ghostData = null, ghostIdx = 0, recording = [], recTimer = 0, recInterval = REC_DT;
  function ghostPoseAt(t) {
    const data = ghostData;
    if (!data || !data.length) return null;
    while (ghostIdx < data.length - 2 && data[ghostIdx + 1][0] <= t) ghostIdx++;
    while (ghostIdx > 0 && data[ghostIdx][0] > t) ghostIdx--;
    const a = data[ghostIdx], b = data[Math.min(ghostIdx + 1, data.length - 1)];
    const span = b[0] - a[0], f = span > 0 ? Math.min(1, Math.max(0, (t - a[0]) / span)) : 0;
    let dy = b[4] - a[4]; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, z: a[3] + (b[3] - a[3]) * f, yaw: a[4] + dy * f };
  }

  function syncRun() {
    tNow = run.t; deaths = run.deaths; started = run.started; finished = run.finished; onGround = run.body.onGround;
  }
  function showBlocks(ev) {
    for (const k of ev.crumbled) { const m = dyn.get(k); if (m) m.visible = false; }
    for (const k of ev.restored) { const m = dyn.get(k); if (m) m.visible = true; }
  }
  function reset(full) {
    if (full) { recording = []; recTimer = 0; recInterval = REC_DT; ghostIdx = 0; }
    showBlocks({ crumbled: [], ...run.reset(full) });
    clearInput(); walkPhase = 0; syncRun(); updateLava();
    $('#deaths').textContent = deaths; $('#time').textContent = fmt(tNow);
  }
  function updateLava() {
    if (!lavaSheet) return;
    lavaSheet.position.y = run.lavaY - .47;
    const gap = Math.max(0, Math.floor(pos.y - run.lavaY));
    const el = $('#lava'); if (el) el.textContent = run.started ? gap + ' bl.' : '—';
  }
  let lastFlash = -Infinity;
  const DEATH = { lawa: 'Lawa cię dogoniła!', magma: 'Za długo na magmie!' };

  // ---------- kolizje (do kamery i cienia) ----------
  const isSolid = (x, y, z) => run.world.solid(x, y, z);

  function step(dt) {
    // wejście
    let ix = (held('r') ? 1 : 0) - (held('l') ? 1 : 0) + joy.x;
    let iz = (held('f') ? 1 : 0) - (held('b') ? 1 : 0) + joy.y;
    const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
    if (held('tl')) yaw += dt * 2.2; if (held('tr')) yaw -= dt * 2.2;
    const fx = Math.sin(yaw + Math.PI), fz = Math.cos(yaw + Math.PI); // kierunek „do przodu” od kamery
    const rx = -fz, rz = fx;
    const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
    const jump = jumpBuffer > 0; jumpBuffer = 0;
    if (started) run.started = true; // np. test, który sam ustawia start biegu
    const ev = run.step({ mx, mz, jump }, dt);
    showBlocks(ev);
    if (ix || iz) { faceYaw = Math.atan2(mx, mz); walkPhase += dt * 11 * (run.body.onGround ? 1 : .3); } else walkPhase *= .9;
    if (ev.jumped) sfx('jump');
    if (ev.landed && !ev.died) sfx('land');
    if (ev.died) {
      clearInput(); walkPhase = 0;
      sfx('lava'); syncRun(); $('#deaths').textContent = deaths;
      const now = performance.now();
      if (!reduced && now - lastFlash >= 900) {
        lastFlash = now;
        $('#flash').animate([{ opacity: .65 }, { opacity: 0 }], 300);
      }
      if (DEATH[ev.died]) toast(DEATH[ev.died]);
      if (!run.rules.checkpoints) { recording = []; recTimer = 0; recInterval = REC_DT; ghostIdx = 0; run.t = 0; run.started = false; }
      syncRun(); updateLava(); return;
    }
    syncRun(); updateLava();
    if (ev.checkpoint) { sfx('checkpoint'); toast('Punkt kontrolny zapisany. Tu wrócisz po upadku.'); }
    // nagrywanie trajektorii do ducha (tylko gdy bieg trwa)
    if (started) {
      if (!recording.length) recording.push([0, pos.x, pos.y, pos.z, faceYaw]);
      recTimer -= dt;
      if (recTimer <= 0) {
        if (recording.length >= MAX_SAMPLES - 1) {
          recording = recording.filter((_, i) => i % 2 === 0);
          recInterval *= 2;
        }
        recording.push([tNow, pos.x, pos.y, pos.z, faceYaw]);
        recTimer += recInterval;
      }
    }
    if (ev.win) win();
  }

  function win() {
    finished = true; running = false;
    const t = tNow; $('#time').textContent = fmt(t);
    recording.push([t, pos.x, pos.y, pos.z, faceYaw]);
    const code = encode(state);
    const latest = store.get('pk:best:' + code, null);
    if (latest !== best) {
      best = latest;
      ghostData = store.get('pk:ghost:' + code, null);
      $('#best').textContent = best ? fmt(best) : '—';
      $('#ghostTile').hidden = !ghostData;
    }
    const rec = !best || t < best, hadGhost = !!ghostData;
    if (rec) {
      best = t; store.set('pk:best:' + code, t); $('#best').textContent = fmt(t);
      ghostData = recording.map((s) => s.map((n) => Math.round(n * 100) / 100));
      store.set('pk:ghost:' + code, ghostData);
      $('#ghostTile').hidden = false; $('#ghost').textContent = fmt(t);
    }
    sfx('win'); const r = canvas.getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2, 30);
    award('pk:' + code, 25); badge('parkour'); if (state.diff >= 7) badge('speedrun');
    if (hadGhost && rec) badge('rywal');
    showOver(rec ? 'Nowy rekord!' : 'Meta!', `Czas ${fmt(t)} s · śmierci: ${deaths} · kod ${code}`, 'finish', true);
  }

  // ---------- nakładka ----------
  const over = $('#over');
  const resume = $('#play'), restart = $('#restartLevel'), randomLevel = $('#randomLevel');
  const restartHint = $('#restartHint'), help = $('.pk-help');
  function showOver(title, text, mode, focus = false) {
    const done = mode === 'finish', paused = mode === 'pause';
    $('#ovTitle').textContent = title; $('#ovText').textContent = text;
    resume.textContent = done ? 'Jeszcze raz' : paused ? 'Wznów' : 'Graj';
    $('#nextLvl').hidden = !done || state.diff >= 10;
    if (randomLevel) randomLevel.hidden = mode !== 'start';
    if (help) help.open = false;
    else $('#keys').hidden = done;
    over.hidden = false; running = false;
    canvas.tabIndex = -1;
    restart.hidden = !(paused || done);
    if (restartHint) restartHint.hidden = restart.hidden;
    viewMenu.open = false;
    if (paused && help) help.after(viewMenu);
    clearInput();
    if (locked()) {
      retryLockAt = performance.now() + 1100;
      wasLocked = false;
      document.exitPointerLock();
    }
    hint();
    if (focus) resume.focus();
  }
  function play() {
    gameControls.append(viewMenu);
    if (finished) reset(true);
    over.hidden = true; running = true;
    canvas.tabIndex = 0;
    // cała plansza na ekranie, nie pod górnym menu
    canvas.focus({ preventScroll: true });
    $('#wrapG').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    lock();
    hint();
    last = performance.now();
    accumulator = 0;
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(loop);
  }
  restart.addEventListener('click', () => { reset(true); play(); });
  $('#nextLvl').addEventListener('click', () => { const next = { ...state, diff: Math.min(10, state.diff + 1), seed: Math.floor(Math.random() * 99999) + 1 };
    onNext(next); play(); });

  // ---------- sterowanie ----------
  // Klawiatura słucha całego okna, gdy gra trwa. Kliknięcie w licznik czy przycisk widoku
  // nie wyłącza już sterowania (wcześniej klawisze działały tylko przy fokusie na płótnie).
  addEventListener('keydown', (e) => {
    if (!running || (e.target instanceof Element && e.target.closest('input,textarea,select'))) return;
    const c = e.code;
    if (c === 'Escape') { pause(true); return; }
    if (e.getModifierState('AltGraph') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (c === 'KeyV') { e.preventDefault(); if (!e.repeat) toggleView(); return; }
    // R: powrót do punktu kontrolnego; w komnatach bez punktów kontrolnych start od zera
    if (c === 'KeyR') { e.preventDefault(); reset(!run.rules.checkpoints); return; }
    if (c === 'Space' && e.target instanceof Element && e.target.closest('button,summary,a')) return;
    if (c === 'Space') { e.preventDefault(); if (!e.repeat) jumpBuffer = .12; return; }
    if (!KEYMAP[c]) return;
    e.preventDefault();
    if (!e.repeat) keys.add(c);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  const pause = (focus = false) => {
    if (running) showOver('Pauza', `Poziom ${state.diff} · kod ${encode(state)}`, 'pause', focus);
  };
  // pauza tylko wtedy, gdy fokus naprawdę wyszedł z gry do innego elementu strony
  canvas.addEventListener('blur', (event) => {
    if (event.relatedTarget && !$('#wrapG').contains(event.relatedTarget)) pause();
  });
  document.addEventListener('pointerdown', (e) => { if (running && !$('#wrapG').contains(e.target)) pause(); });
  addEventListener('blur', () => pause());
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  addEventListener('pagehide', () => pause());

  // Mysz jak w grze: klik w planszę „łapie” kursor i ruch myszy obraca kamerę bez trzymania przycisku.
  // Esc oddaje kursor i włącza pauzę. Gdy przeglądarka nie pozwala złapać kursora, działa przeciąganie.
  const frame = window.frameElement;
  const blockedByFrame = frame?.hasAttribute('sandbox') && !frame.sandbox.contains('allow-pointer-lock');
  const canLock = !coarse && !blockedByFrame && typeof canvas.requestPointerLock === 'function';
  const locked = () => document.pointerLockElement === canvas;
  let wasLocked = false, retryLockAt = 0;
  function lock() {
    if (!running || !canLock || locked() || performance.now() < retryLockAt) return;
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => hint()); } catch { hint(); }
  }
  document.addEventListener('pointerlockchange', () => {
    const active = locked();
    if (active && !running) { document.exitPointerLock(); return; }
    if (wasLocked && !active) {
      retryLockAt = performance.now() + 1100;
      pause(true);
    }
    wasLocked = active;
    drag = null;
    hint();
  });
  document.addEventListener('pointerlockerror', () => hint());
  const clampPitch = () => { pitch = fp ? Math.max(-1.45, Math.min(1.45, pitch)) : Math.max(.05, Math.min(1.35, pitch)); };
  const look = (mx, my) => { yaw -= mx; pitch += my; clampPitch(); };
  document.addEventListener('mousemove', (e) => {
    if (!running || !locked()) return;
    const mx = Math.max(-150, Math.min(150, e.movementX)), my = Math.max(-150, Math.min(150, e.movementY));
    look(mx * .0026, my * .0022);
  });
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (!running || locked() || e.pointerType !== 'mouse' || e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag?.id === e.pointerId && !drag.moved) lock();
    drag = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('lostpointercapture', () => (drag = null));
  canvas.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId || locked()) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (dx || dy) drag.moved = true;
    look(dx * .006, dy * .004);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (!fp) dist = Math.max(3, Math.min(12, dist + e.deltaY * .01)); }, { passive: false });

  // Ustawienie kamery zapamiętujemy między komnatami i po odświeżeniu.
  const wrap = $('#wrapG');
  const gameControls = document.createElement('div');
  gameControls.className = 'pk-controls';
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button'; pauseBtn.className = 'pk-pause'; pauseBtn.textContent = 'Pauza';
  pauseBtn.addEventListener('click', () => pause(true));
  const viewMenu = document.createElement('details');
  viewMenu.className = 'pk-camera';
  const viewBtn = document.createElement('summary');
  viewBtn.className = 'pk-view'; viewBtn.textContent = 'Kamera';
  const viewChoices = document.createElement('div');
  viewChoices.className = 'pk-camera-options';
  viewChoices.setAttribute('role', 'group');
  viewChoices.setAttribute('aria-label', 'Widok kamery');
  for (const mode of viewOrder) {
    const option = document.createElement('button');
    option.type = 'button'; option.dataset.camera = mode; option.textContent = views[mode];
    option.addEventListener('click', () => {
      setView(mode);
      viewMenu.open = false;
      viewBtn.focus({ preventScroll: true });
    });
    viewChoices.append(option);
  }
  viewMenu.append(viewBtn, viewChoices);
  const hintEl = document.createElement('div');
  hintEl.className = 'pk-hint'; hintEl.textContent = canLock
    ? 'Przeciągnij myszą, aby obrócić kamerę. Kliknij planszę, aby spróbować zablokować kursor.'
    : 'Przeciągnij myszą, aby obrócić kamerę.';
  gameControls.append(pauseBtn, viewMenu);
  wrap.append(gameControls, hintEl);
  function viewLabel() {
    viewBtn.setAttribute('aria-label', `Kamera: ${views[view]} (V)`);
    for (const option of viewChoices.children) option.setAttribute('aria-pressed', option.dataset.camera === view);
    camera.fov = fp ? 78 : 65;
    camera.updateProjectionMatrix();
  }
  function toggleView() {
    setView(viewOrder[(viewOrder.indexOf(view) + 1) % viewOrder.length]);
  }
  function setView(mode) {
    const wasFirst = fp;
    view = mode;
    fp = mode !== 'trzecia';
    store.set('pk:widok', mode);
    if (fp !== wasFirst) pitch = fp ? Math.min(pitch, .35) : Math.max(pitch, .3);
    clampPitch(); viewLabel(); draw(performance.now(), true);
  }
  function hint() { hintEl.hidden = !(running && !coarse && !locked()); }
  viewLabel(); hint();
  // pomoc o sterowaniu: jedna wersja dla każdej strony z grą
  $('#keys').innerHTML = `<div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> albo strzałki: ruch · <kbd>Spacja</kbd>: skok</div>
    <div>${canLock ? 'Ruch myszy: obrót kamery (bez trzymania przycisku)' : 'Przeciągnij myszą: obrót kamery'} · <kbd>Q</kbd><kbd>E</kbd>: obrót</div>
    <div><kbd>V</kbd>: zmiana kamery · <kbd>R</kbd>: punkt kontrolny · <kbd>Esc</kbd>: pauza</div>
    <div class="touch-only">Na telefonie: lewy kciuk to ruch, prawy kciuk obraca, przycisk to skok</div>
    <div>Masz już rekord na tej trasie? Obok pobiegnie półprzezroczysty duch twojego najlepszego przejazdu.</div>`;

  // dotyk: joystick + skok + obrót prawym kciukiem
  const stick = $('#stick'), knob = $('#knob');
  let stickId = null, stickO = null, lookId = null, lookP = null;
  const touchArea = $('#wrapG');
  touchArea.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !running) return;
    const r = touchArea.getBoundingClientRect();
    if (e.target.closest('button,summary,details')) return;
    touchArea.setPointerCapture(e.pointerId);
    if (e.clientX - r.left < r.width * .45 && stickId === null) { stickId = e.pointerId; stickO = { x: e.clientX, y: e.clientY }; stick.style.left = (e.clientX - r.left - 60) + 'px'; stick.style.top = (e.clientY - r.top - 60) + 'px'; stick.classList.add('on'); }
    else if (lookId === null) { lookId = e.pointerId; lookP = { x: e.clientX, y: e.clientY }; }
  });
  touchArea.addEventListener('pointermove', (e) => {
    if (e.pointerId === stickId) {
      let dx = e.clientX - stickO.x, dy = e.clientY - stickO.y; const l = Math.hypot(dx, dy), m = 50;
      if (l > m) { dx *= m / l; dy *= m / l; }
      knob.style.transform = `translate(${dx}px,${dy}px)`; joy = { x: dx / m, y: -dy / m };
    } else if (e.pointerId === lookId) {
      look((e.clientX - lookP.x) * .008, (e.clientY - lookP.y) * .005); lookP = { x: e.clientX, y: e.clientY };
    }
  });
  const endTouch = (e) => { if (e.pointerId === stickId) { stickId = null; joy = { x: 0, y: 0 }; knob.style.transform = ''; stick.classList.remove('on'); } if (e.pointerId === lookId) lookId = null; };
  function clearInput() {
    keys.clear();
    jumpBuffer = 0;
    drag = null;
    if (stickId !== null) endTouch({ pointerId: stickId });
    if (lookId !== null) endTouch({ pointerId: lookId });
  }
  touchArea.addEventListener('pointerup', endTouch); touchArea.addEventListener('pointercancel', endTouch);
  touchArea.addEventListener('lostpointercapture', endTouch);
  $('#jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); jumpBuffer = .12; });
  $('#jumpBtn').addEventListener('click', (e) => { if (!e.detail) jumpBuffer = .12; });
  if (coarse) document.body.classList.add('touch');

  // ---------- pętla ----------
  let last = 0, dist = 5.5, accumulator = 0, displayedTime = '', frameId = 0;
  const camT = new THREE.Vector3();
  let cameraDistance = 0;
  function cameraClear(x, y, z, radius) {
    for (let gx = Math.floor(x - radius); gx <= Math.floor(x + radius); gx++)
      for (let gy = Math.floor(y - radius); gy <= Math.floor(y + radius); gy++)
        for (let gz = Math.floor(z - radius); gz <= Math.floor(z + radius); gz++)
          if (isSolid(gx, gy, gz)) return false;
    return true;
  }
  const tick = 1 / 120;
  function resize(force = false) {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!state || !width || !height) return;
    if (!force && camera.aspect === width / height && renderer.domElement.width === Math.floor(width * renderer.getPixelRatio()) &&
        renderer.domElement.height === Math.floor(height * renderer.getPixelRatio())) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    handsCamera.right = Math.max(1, camera.aspect);
    handsCamera.left = -handsCamera.right;
    handsCamera.updateProjectionMatrix();
    if (!running) draw(performance.now(), true);
  }
  function loop(now) {
    if (!running) return;
    accumulator += Math.min(.1, (now - last) / 1000); last = now;
    while (running && accumulator >= tick) { step(tick); accumulator -= tick; }
    const time = fmt(tNow);
    if (time !== displayedTime) { displayedTime = time; $('#time').textContent = time; }
    draw(now);
    if (running) frameId = requestAnimationFrame(loop);
  }
  function draw(now, snap = false) {
    // duch: najlepszy zapisany przejazd, biegnie w tempie własnego czasu
    if (ghostData) {
      ghost.visible = running;
      const g = ghostPoseAt(tNow);
      if (g) {
        ghost.position.set(g.x, g.y, g.z);
        let dy = g.yaw - ghost.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        ghost.rotation.y += dy * (snap ? 1 : .25);
      }
    } else ghost.visible = false;
    // postać
    player.position.copy(pos);
    let dy = faceYaw - player.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.rotation.y += dy * .25;
    const sw = (reduced ? 0 : Math.sin(walkPhase)) * (onGround ? .7 : .25);
    legL.rotation.x = sw; legR.rotation.x = -sw; armL.rotation.x = -sw * .8; armR.rotation.x = sw * .8;
    head.position.y = 1.62 + (reduced ? 0 : Math.abs(Math.sin(walkPhase)) * .03);
    // cień na podłożu
    let sy = Math.floor(pos.y); while (sy > minY - 2 && !isSolid(Math.floor(pos.x), sy - 1, Math.floor(pos.z))) sy--;
    shadow.position.set(pos.x, sy + .02, pos.z); shadow.material.opacity = Math.max(.08, .4 - (pos.y - sy) * .06);
    const dx = Math.sin(yaw) * Math.cos(pitch), dyCam = Math.sin(pitch), dz = Math.cos(yaw) * Math.cos(pitch);
    player.visible = !fp; shadow.visible = !fp;
    if (fp) {
      // pierwsza osoba: oczy na wysokości 1,62 bloku, patrzymy w stronę przeciwną do kamery zza pleców
      camera.position.set(pos.x, pos.y + 1.62, pos.z);
      camT.set(pos.x - dx, pos.y + 1.62 - dyCam, pos.z - dz);
      camera.lookAt(camT);
    } else {
      // kamera za graczem
      camT.set(pos.x, pos.y + 1.3, pos.z);
      const halfNear = camera.near * Math.tan(camera.fov * Math.PI / 360);
      const clearance = Math.min(.27, Math.hypot(camera.near, halfNear, halfNear * camera.aspect) + .01);
      let available = .04;
      for (let d = .16; d < dist + .16; d += .16) {
        const test = Math.min(d, dist);
        if (!cameraClear(camT.x + dx * test, camT.y + dyCam * test, camT.z + dz * test, clearance)) break;
        available = test;
        if (test === dist) break;
      }
      // Wygładzamy tylko odległość na aktualnym promieniu. Kamera nie przecina ściany w drodze.
      cameraDistance = snap || reduced || available < cameraDistance ? available : cameraDistance + (available - cameraDistance) * .2;
      camera.position.set(camT.x + dx * cameraDistance, camT.y + dyCam * cameraDistance, camT.z + dz * cameraDistance);
      camera.lookAt(camT);
    }
    if (!reduced) for (const m of lavaMats) m.emissiveIntensity = .7 + Math.sin(now / 300) * .25;
    renderer.render(scene, camera);
    if (view === 'rece') {
      const stride = running && !reduced ? sw * .08 : 0;
      const rise = running && !reduced ? Math.max(-.06, Math.min(.06, vel.y * .01)) : 0;
      hands.forEach((hand, i) => hand.position.set((2 * i - 1) * handsCamera.right * .76, -.99 + rise + (2 * i - 1) * stride, 0));
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(handsScene, handsCamera);
      renderer.autoClear = true;
    }
  }

  new ResizeObserver(() => resize()).observe(canvas);
  return { loadLevel, play };
}
