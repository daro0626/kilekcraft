// =========================================================
// KILEKCRAFT — fizyka gracza w komnatach (bez DOM i bez Three.js).
// Tego samego kodu używa gra w przeglądarce (parkour-game.js)
// i test z botem (tools/test_mistrz.mjs).
// To przybliżenie ruchu z gry, nie kopia jej silnika.
// =========================================================

export const PHYS = { G: 28, JUMP: 8.4, SPEED: 5.6, ACC_G: 40, ACC_A: 14, W: .3, HGT: 1.8 };
// Bloki, przez które się przechodzi (lawa i woda zabijają w grze osobno)
export const PASS = new Set(['lava', 'portal', 'water']);

// Zachowanie powierzchni (źródła w docs/ZRODLA.md, sekcja „Bloki w komnatach mistrzowskich”):
// - lód: ślisko, wolno się rozpędzasz i wolno hamujesz,
// - miód: chodzisz dużo wolniej i prawie nie skaczesz,
// - szlam: odbija przy upadku (tym wyżej, im szybciej spadasz),
// - magma: parzy, gdy na niej stoisz (w przeglądarce: po 0,8 s upadek).
// Liczby niżej to nasze przybliżenie dla przeglądarki, nie wartości z gry.
export const SURF = {
  packed_ice: { acc: 5 },
  honey_block: { speed: .4, jump: .39 },
  slime_block: { bounce: .82 },
  magma_block: { burn: .8 },
};

export function makeBody(pos, vel) {
  return { pos, vel, onGround: true, jumpBuffer: 0, burn: 0 };
}

// world.solid(x, y, z) → czy blok zatrzymuje gracza; world.type(x, y, z) → nazwa bloku albo undefined
function overlaps(world, px, py, pz) {
  const { W, HGT } = PHYS;
  for (let x = Math.floor(px - W); x <= Math.floor(px + W - 1e-6); x++)
    for (let y = Math.floor(py); y <= Math.floor(py + HGT - 1e-6); y++)
      for (let z = Math.floor(pz - W); z <= Math.floor(pz + W - 1e-6); z++) if (world.solid(x, y, z)) return { x, y, z };
  return null;
}

function moveAxis(b, world, axis, d) {
  if (!d) return;
  const { pos, vel } = b;
  pos[axis] += d;
  const hit = overlaps(world, pos.x, pos.y, pos.z); if (!hit) return;
  if (axis === 'y') {
    if (d < 0) { pos.y = hit.y + 1; b.onGround = true; } else pos.y = hit.y - PHYS.HGT - 1e-4;
    vel.y = 0;
  } else {
    const c = hit[axis];
    pos[axis] = d > 0 ? c - PHYS.W - 1e-4 : c + 1 + PHYS.W + 1e-4;
    vel[axis] = 0;
  }
}

// Blok pod stopami: najpierw środek, potem rogi (żeby stanie na krawędzi też się liczyło)
export function feetType(b, world) {
  const { pos } = b, y = Math.floor(pos.y - .05), W = PHYS.W - .02;
  const c = world.type(Math.floor(pos.x), y, Math.floor(pos.z));
  if (c && !PASS.has(c)) return c;
  for (const [dx, dz] of [[-W, -W], [W, -W], [-W, W], [W, W]]) {
    const t = world.type(Math.floor(pos.x + dx), y, Math.floor(pos.z + dz));
    if (t && !PASS.has(t)) return t;
  }
  return undefined;
}

export function touching(b, world, type) {
  const { pos } = b, W = PHYS.W;
  for (let x = Math.floor(pos.x - W); x <= Math.floor(pos.x + W - 1e-6); x++)
    for (let z = Math.floor(pos.z - W); z <= Math.floor(pos.z + W - 1e-6); z++)
      for (let y = Math.floor(pos.y - .05); y <= Math.floor(pos.y + .5); y++) if (world.type(x, y, z) === type) return true;
  return false;
}

// Jeden krok fizyki. input: { mx, mz } (kierunek w świecie, długość ≤ 1).
// Skok: ustaw b.jumpBuffer przed krokiem. Wynik: zdarzenia z tego kroku.
export function stepBody(b, world, input, dt) {
  const { pos, vel } = b, P = PHYS;
  const ev = { jumped: false, landed: false, bounced: false, burned: false, feet: undefined };
  const under = b.onGround ? feetType(b, world) : undefined;
  const s = (under && SURF[under]) || {};
  const speed = P.SPEED * (s.speed || 1);
  const tx = input.mx * speed, tz = input.mz * speed;
  const acc = (b.onGround ? (s.acc ?? P.ACC_G) : P.ACC_A) * dt;
  vel.x += Math.max(-acc, Math.min(acc, tx - vel.x));
  vel.z += Math.max(-acc, Math.min(acc, tz - vel.z));
  if (b.jumpBuffer > 0 && b.onGround) {
    vel.y = P.JUMP * (s.jump || 1); b.onGround = false; b.jumpBuffer = 0; ev.jumped = true;
  }
  b.jumpBuffer = Math.max(0, b.jumpBuffer - dt);
  vel.y -= P.G * dt; vel.y = Math.max(vel.y, -40);
  const was = b.onGround, fall = vel.y; b.onGround = false;
  moveAxis(b, world, 'x', vel.x * dt); moveAxis(b, world, 'z', vel.z * dt); moveAxis(b, world, 'y', vel.y * dt);
  if (b.onGround) ev.feet = feetType(b, world);
  if (b.onGround && !was) {
    ev.landed = true;
    const sl = SURF[ev.feet]?.bounce;
    // szlam: odbicie przy szybkim upadku; skok wciśnięty przy lądowaniu daje zwykły skok
    if (sl && fall < -6 && !(b.jumpBuffer > 0)) { vel.y = -fall * sl; b.onGround = false; ev.bounced = true; }
  }
  const burn = b.onGround && SURF[ev.feet]?.burn;
  if (burn) { b.burn += dt; if (b.burn >= burn) ev.burned = true; } else b.burn = 0;
  return ev;
}

// =========================================================
// Przebieg komnaty: fizyka + zasady (śmierć, punkty kontrolne, meta,
// kruszące się bloki, rosnąca lawa, magma). Gra tylko to rysuje.
// vec() tworzy wektor {x,y,z} (w grze THREE.Vector3).
// =========================================================
export const CRACK = 'cracked_bricks';
const k3 = (x, y, z) => x + ',' + y + ',' + z;

export function createRun(room, type, vec = () => ({ x: 0, y: 0, z: 0 })) {
  const rules = { fog: null, lava: null, crumble: null, checkpoints: true, noFloor: false, ...(room.rules || {}) };
  const solid = new Map();
  for (const [x, y, z, t] of room.blocks) solid.set(k3(x, y, z), t);
  const touched = new Map(), gone = new Map();
  const world = {
    type(x, y, z) { const k = k3(x, y, z); return gone.has(k) ? undefined : solid.get(k); },
    solid(x, y, z) { const t = world.type(x, y, z); return !!t && !PASS.has(t); },
  };
  const st = room.blocks.find(b => b[3] === 'gold') || room.blocks.find(b => b[3] === 'emerald') || room.blocks[0];
  const spawn = { x: st[0] + .5, y: st[1] + 1, z: st[2] + .5 };
  const minY = Math.min(...room.blocks.map(b => b[1]));
  const climb = type !== 'labirynt';
  const b = makeBody(vec(), vec());
  const run = {
    rules, world, body: b, pos: b.pos, vel: b.vel, spawn, minY, solid,
    t: 0, life: 0, deaths: 0, started: false, finished: false, checkpoint: { ...spawn },
    lavaY: rules.lava ? rules.lava.y0 : -Infinity,
    isGone: (k) => gone.has(k),
  };
  function restoreAll(ev) { for (const k of gone.keys()) ev.restored.push(k); gone.clear(); touched.clear(); }
  run.reset = function (full, ev = { restored: [] }) {
    if (full) { run.checkpoint = { ...spawn }; run.deaths = 0; run.started = false; run.finished = false; run.t = 0; }
    const c = rules.checkpoints ? run.checkpoint : spawn;
    b.pos.x = c.x; b.pos.y = c.y; b.pos.z = c.z; b.vel.x = b.vel.y = b.vel.z = 0;
    b.onGround = true; b.jumpBuffer = 0; b.burn = 0;
    run.life = 0; run.lavaY = rules.lava ? rules.lava.y0 : -Infinity;
    restoreAll(ev);
    return ev;
  };
  function die(ev, why) { run.deaths++; ev.died = why; run.reset(false, ev); }
  // input: { mx, mz, jump } — jump = świeżo wciśnięty skok
  run.step = function (input, dt) {
    const ev = { died: null, win: false, checkpoint: false, crumbled: [], restored: [] };
    if (input.jump) b.jumpBuffer = .12;
    if (input.mx || input.mz || input.jump) run.started = true;
    const e = stepBody(b, world, input, dt);
    Object.assign(ev, { jumped: e.jumped, landed: e.landed, bounced: e.bounced });
    if (run.started) { run.t += dt; run.life += dt; }
    // rosnąca lawa: liczy się od ostatniego startu albo upadku
    if (rules.lava && run.started) run.lavaY = rules.lava.y0 + Math.max(0, (run.life - rules.lava.delay) / rules.lava.every);
    if (touching(b, world, 'lava') || (climb && touching(b, world, 'water')) || b.pos.y < minY - 4) { die(ev, 'upadek'); return ev; }
    if (climb && !rules.noFloor && b.onGround && b.pos.y < minY + 1.5) { die(ev, 'upadek'); return ev; }
    if (b.pos.y < run.lavaY - .1) { die(ev, 'lawa'); return ev; }
    if (e.burned) { die(ev, 'magma'); return ev; }
    // kruszenie: blok pod stopami znika po chwili i wraca, gdy nikt na nim nie stoi
    if (rules.crumble) {
      if (b.onGround) {
        const y = Math.floor(b.pos.y - .05), W = PHYS.W - .02;
        for (const [dx, dz] of [[0, 0], [-W, -W], [W, -W], [-W, W], [W, W]]) {
          const x = Math.floor(b.pos.x + dx), z = Math.floor(b.pos.z + dz), k = k3(x, y, z);
          if (world.type(x, y, z) === CRACK && !touched.has(k)) touched.set(k, run.life + rules.crumble.after);
        }
      }
      for (const [k, at] of touched) if (run.life >= at) { touched.delete(k); gone.set(k, run.life + rules.crumble.back); ev.crumbled.push(k); }
      for (const [k, at] of gone) {
        if (run.life < at) continue;
        const [x, y, z] = k.split(',').map(Number);
        const inside = b.pos.x + PHYS.W > x && b.pos.x - PHYS.W < x + 1 && b.pos.z + PHYS.W > z && b.pos.z - PHYS.W < z + 1 && b.pos.y < y + 1 && b.pos.y + PHYS.HGT > y;
        if (!inside) { gone.delete(k); ev.restored.push(k); }
      }
    }
    const fb = b.onGround ? e.feet : null;
    if (fb === 'emerald' && rules.checkpoints) {
      const cp = { x: Math.floor(b.pos.x) + .5, y: Math.floor(b.pos.y), z: Math.floor(b.pos.z) + .5 };
      const c = run.checkpoint;
      if (Math.hypot(cp.x - c.x, cp.y - c.y, cp.z - c.z) > 1.5) { run.checkpoint = cp; ev.checkpoint = true; }
    }
    if (fb === 'diamond' && run.started && !run.finished) { run.finished = true; ev.win = true; }
    return ev;
  };
  run.reset(true);
  return run;
}
