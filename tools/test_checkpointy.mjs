import assert from 'node:assert/strict';
import { decode, generate } from '../assets/js/komnaty-gen.js';
import { createRun, PHYS } from '../assets/js/fizyka.js';

const dt = 1 / 120;
const idle = { mx: 0, mz: 0 };
const phase = (code) => {
  const state = decode(code);
  const room = generate(state);
  return { room, run: createRun(room, state.type) };
};

function stand(run) {
  const { x, y, z } = run.pos;
  const count = run.deaths;
  assert(run.world.solid(Math.floor(x), y - 1, Math.floor(z)), 'brak podparcia pod respawnem');
  for (let i = 0; i < 240; i++) assert(!run.step(idle, dt).died, 'śmierć bez ruchu po respawnie');
  assert.deepEqual({ ...run.pos }, { x, y, z });
  assert(run.body.onGround);
  assert.equal(run.deaths, count);
}

function fall(run) {
  run.pos.y = run.minY - 5;
  const event = run.step({ mx: 1, mz: 0, jump: true }, dt);
  assert(event.died);
  assert.deepEqual({ ...run.vel }, { x: 0, y: 0, z: 0 });
  assert.equal(run.body.jumpBuffer, 0);
  assert.equal(run.body.burn, 0);
  stand(run);
}

function check(room, run, cornerOnly = false) {
  let count = 0;
  for (const [x, y, z] of room.blocks.filter(b => b[3] === 'emerald')) {
    for (const [dx, dz] of [[0, 0], [.62, .62], [-.62, .62], [.62, -.62], [-.62, -.62], [.62, 0], [0, -.62], [-.62, 0], [0, .62]]) {
      if (cornerOnly && !dx && !dz) continue;
      const px = x + .5 + dx, pz = z + .5 + dz;
      if ((dx || dz) && run.world.solid(Math.floor(px), y, Math.floor(pz))) continue;
      run.reset(true);
      Object.assign(run.pos, { x: px, y: y + 1, z: pz });
      const ev = run.step(idle, dt);
      if (!ev.checkpoint) continue;
      assert(run.world.type(Math.floor(run.checkpoint.x), run.checkpoint.y - 1, Math.floor(run.checkpoint.z)) === 'emerald',
        `checkpoint zapisany poza szmaragdem dla ${px},${pz}`);
      for (let j = 0; j < (cornerOnly ? 3 : 1); j++) fall(run);
      assert(run.step({ ...idle, jump: true }, dt).jumped, 'brak skoku po odrodzeniu');
      count++;
    }
  }
  return count;
}

const reported = phase('P4-N-40606');
const corners = check(reported.room, reported.run, true);
assert(corners >= 4, 'brak prób na krawędziach zgłoszonej komnaty');
const centers = check(reported.room, reported.run);
assert(centers > corners);
let count = centers;
for (const code of ['P6-K-319', 'P8-N-15723', 'P9-E-205', 'G8-K-321', 'L4-K-4821']) {
  const { room, run } = phase(code);
  count += check(room, run);
  run.reset(true);
  assert.deepEqual(run.checkpoint, run.spawn);
  assert.equal(run.deaths, 0);
  stand(run);
}
assert(count >= 20);

let atSpeed = 0;
for (const [x, y, z] of reported.room.blocks.filter(block => block[3] === 'emerald')) {
  const run = reported.run;
  for (const [dx, dz] of [[1, 0], [0, -1], [-1, 1], [1, 1]]) {
    const length = Math.hypot(dx, dz);
    run.reset(true);
    Object.assign(run.pos, { x: x + .5 + dx * .69, y: y + 1.02, z: z + .5 + dz * .69 });
    Object.assign(run.vel, { x: -dx * PHYS.SPEED / length, y: -4, z: -dz * PHYS.SPEED / length });
    run.body.onGround = false;
    const event = run.step({ mx: -dx / length, mz: -dz / length, jump: true }, dt);
    if (!event.checkpoint) continue;
    const cp = run.checkpoint;
    assert.equal(run.world.type(Math.floor(cp.x), cp.y - 1, Math.floor(cp.z)), 'emerald');
    assert(Math.hypot(cp.x - run.pos.x, cp.z - run.pos.z) <= Math.SQRT2 * (.5 + PHYS.W));
    for (let death = 1; death <= 5; death++) {
      fall(run);
      assert.deepEqual({ ...run.pos }, { ...run.checkpoint });
      assert.equal(run.deaths, death);
    }
    atSpeed++;
  }
}
assert(atSpeed >= 4, 'brak udanych lądowań z rozpędem na krawędzi');

{
  const room = { blocks: [[0, 2, 0, 'gold'], [3, 2, 0, 'emerald'], [6, 2, 0, 'emerald'], [9, 2, 0, 'emerald'], [9, 4, 0, 'stone']], rules: { noFloor: true } };
  const run = createRun(room, 'parkour');
  for (const x of [3.5, 6.5]) {
    Object.assign(run.pos, { x, y: 3, z: .5 });
    assert(run.step(idle, dt).checkpoint);
  }
  Object.assign(run.pos, { x: 9.5, y: 3, z: .5 });
  assert(!run.step(idle, dt).checkpoint, 'zasłonięty checkpoint przyjęty');
  run.solid.set('6,3,0', 'lava');
  fall(run);
  assert.equal(run.pos.x, 3.5, 'awaryjny powrót do poprzedniego użytecznego punktu');
  run.solid.delete('3,2,0');
  fall(run);
  assert.deepEqual({ ...run.pos }, run.spawn);
  assert(run.body.onGround);
}
console.log(`Checkpointy: ${count} prób, w tym ${corners} narożnikiem; ${atSpeed} lądowań z rozpędem i po 5 odrodzeń na P4-N-40606.`);
