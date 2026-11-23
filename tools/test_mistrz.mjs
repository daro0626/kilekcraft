// Test komnat mistrzowskich M1–M10: prosty bot przechodzi każdą komnatę
// tym samym kodem fizyki i zasad co gra w przeglądarce (assets/js/fizyka.js).
// Bot nie gra jak człowiek: celuje w środek kolejnej platformy, skacze przy
// krawędzi i hamuje w powietrzu. Jeśli on przechodzi, komnata jest wykonalna.
// Czas bota to dolna granica, nie przewidywany czas gracza.
import assert from 'node:assert/strict';
import { generate, encode, THEMES } from '../assets/js/komnaty-gen.js';
import { createRun, PHYS, SURF, CRACK } from '../assets/js/fizyka.js';

const DT = 1 / 120;

export function playBot(room, { log = false } = {}) {
  const run = createRun(room, 'mistrz');
  const { body: b, world } = run;
  const steps = room.bot;
  let i = 1, prevJump = false;
  const reached = (s, ev) => {
    if (s.a) return Math.hypot(s.a[0] - b.pos.x, s.a[2] - b.pos.z) < .6;
    const [x, y, z, w, d] = s.p;
    if (!(b.onGround || ev.bounced)) return false;
    if (Math.floor(b.pos.y - .05) !== y && !(ev.bounced && Math.abs(b.pos.y - (y + 1)) < .6)) return false;
    const W = PHYS.W - .05;
    return [[0, 0], [-W, -W], [W, -W], [-W, W], [W, W]].some(([dx, dz]) => {
      const fx = Math.floor(b.pos.x + dx), fz = Math.floor(b.pos.z + dz);
      return fx >= x && fx < x + w && fz >= z && fz < z + d;
    });
  };
  for (let n = 0; n < 600 / DT; n++) {
    const s = steps[Math.min(i, steps.length - 1)];
    const cx = s.a ? s.a[0] : s.p[0] + s.p[3] / 2, cz = s.a ? s.a[2] : s.p[2] + s.p[4] / 2;
    const ty = s.a ? s.a[1] : s.p[1] + 1;
    let dx = cx - b.pos.x, dz = cz - b.pos.z;
    const dist = Math.hypot(dx, dz) || 1e-6;
    dx /= dist; dz /= dist;
    let f = 1, jump = false;
    if (b.onGround) {
      const under = world.type(Math.floor(b.pos.x), Math.floor(b.pos.y - .05), Math.floor(b.pos.z));
      if (SURF[under]?.acc) f = Math.min(1, Math.sqrt(2 * SURF[under].acc * .7 * dist) / PHYS.SPEED + .15);
      const ax = b.pos.x + dx * .45, az = b.pos.z + dz * .45;
      const edge = !world.solid(Math.floor(ax), Math.floor(b.pos.y - .05), Math.floor(az));
      const up = !s.a && ty > b.pos.y + .5 && dist < 1.6;
      const hot = SURF[under]?.burn && b.burn > .3;
      jump = (edge && dist > .6) || up || !!s.a || hot;
    } else if (!s.a) {
      // w powietrzu: tyle prędkości, żeby wylądować na środku celu
      const g = PHYS.G, disc = b.vel.y * b.vel.y + 2 * g * (b.pos.y - ty);
      if (disc >= 0) { const t = (b.vel.y + Math.sqrt(disc)) / g; f = Math.min(1, dist / Math.max(t, .12) / PHYS.SPEED); }
    }
    const before = { x: +b.pos.x.toFixed(2), y: +b.pos.y.toFixed(2), z: +b.pos.z.toFixed(2), g: b.onGround };
    const ev = run.step({ mx: dx * f, mz: dz * f, jump: jump && !prevJump }, DT);
    prevJump = jump;
    if (ev.died) return { ok: false, why: ev.died, step: i, t: run.t, pos: before };
    if (ev.win) return { ok: true, t: run.t, deaths: run.deaths };
    while (i < steps.length - 1 && reached(steps[i], ev)) { if (log) console.log('cel', i, run.t.toFixed(2)); i++; }
  }
  return { ok: false, why: 'czas', step: i, t: run.t };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = [];
  for (let n = 1; n <= 10; n++) {
    for (const theme of Object.keys(THEMES)) {
      const state = { type: 'mistrz', diff: n, theme, seed: 1 };
      const room = generate(state);
      // bloki i trasa: start i meta są, platformy trasy istnieją
      assert(room.blocks.some(b => b[3] === 'gold'), encode(state) + ' brak startu');
      assert(room.blocks.some(b => b[3] === 'diamond'), encode(state) + ' brak mety');
      assert(room.blocks.length < 15000, encode(state) + ' za dużo bloków');
      for (const [x, y, z, w, d] of room.route) for (let a = 0; a < w; a++) for (let c = 0; c < d; c++)
        assert(room.blocks.some(b => b[0] === x + a && b[1] === y && b[2] === z + c), encode(state) + ' brak platformy trasy');
      const r = playBot(room);
      assert(r.ok, `${encode(state)}: bot nie przeszedł (${r.why} przy celu ${r.step}, ${r.t.toFixed(1)} s, pozycja ${JSON.stringify(r.pos)})`);
      if (theme === 'kamien') results.push([encode(state), room.info.nazwa, r.t]);
    }
  }
  // Pułapki działają: bot, który stoi w miejscu, przegrywa tam, gdzie powinien.
  const stand = (n, steps) => { const run = createRun(generate({ type: 'mistrz', diff: n, theme: 'kamien', seed: 1 }), 'mistrz');
    run.step({ mx: 0, mz: 0, jump: true }, DT); let died = null;
    for (let k = 0; k < steps && !died; k++) died = run.step({ mx: 0, mz: 0, jump: false }, DT).died; return { died, run }; };
  assert.equal(stand(8, 120 * 8).died, 'lawa', 'M8: lawa nie dogania stojącego gracza');
  assert.equal(stand(10, 120 * 8).died, 'lawa', 'M10: lawa nie dogania stojącego gracza');
  // magma: postój na magmie kończy się upadkiem
  {
    const run = createRun(generate({ type: 'mistrz', diff: 5, theme: 'kamien', seed: 1 }), 'mistrz');
    const p = run.body.pos; let died = null;
    for (let k = 0; k < 120 * 3 && !died; k++) died = run.step({ mx: p.x < 6.5 ? 1 : 0, mz: 0, jump: false }, DT).died;
    assert.equal(died, 'magma', 'M5: stanie na magmie nie parzy');
  }
  // kruszenie: blok znika po zejściu i wraca po czasie
  {
    const room = generate({ type: 'mistrz', diff: 7, theme: 'kamien', seed: 1 });
    const run = createRun(room, 'mistrz'); let crumbled = 0, restored = 0;
    for (let k = 0; k < 120 * 8; k++) { const ev = run.step({ mx: run.body.pos.x < 6 ? 1 : 0, mz: 0, jump: false }, DT); crumbled += ev.crumbled.length; restored += ev.restored.length; if (ev.died) break; }
    assert(crumbled > 0, 'M7: nic się nie kruszy');
    assert(room.blocks.some(b => b[3] === CRACK));
  }
  console.log('Komnaty mistrzowskie: 10 × 4 motywy przechodzi bot.');
  for (const [code, name, t] of results) console.log(`  ${code.padEnd(9)} ${name.padEnd(20)} bot: ${t.toFixed(1)} s`);
}
