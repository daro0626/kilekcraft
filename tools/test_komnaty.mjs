import assert from 'node:assert/strict';
import { encode, generate, KINDS, THEMES } from '../assets/js/komnaty-gen.js';

// Stały krok fizyki z parkour-game.js. Zasięg liczymy przy wejściu
// w skok z rozbiegu oraz lądowaniu przy opadaniu na następną platformę.
const G = 28, JUMP = 8.4, SPEED = 5.6, WIDTH = .6, TICK = 1 / 120;
function reach(height) {
  let y = 0, vy = JUMP, steps = 0;
  while (y >= Math.min(0, height) || vy > 0) {
    vy -= G * TICK;
    y += vy * TICK;
    steps++;
    if (vy <= 0 && y <= height) {
      if (y - vy * TICK < height) return -Infinity;
      return (steps - 1) * TICK * SPEED;
    }
  }
  return -Infinity;
}
const reaches = new Map([-1, 0, 1].map(height => [height, reach(height)]));

function checkPlatforms(room, label) {
  const [width, , depth] = room.size;
  const cell = (x, y, z) => (y * depth + z) * width + x;
  const tiles = new Set();
  for (const [x, y, z, type] of room.blocks) {
    if (type !== 'lava' && type !== 'water') tiles.add(cell(x, y, z));
  }
  for (let i = 0; i < room.route.length; i++) {
    const [x, y, z, w, d] = room.route[i];
    for (let ix = x; ix < x + w; ix++) for (let iz = z; iz < z + d; iz++) {
      assert(tiles.has(cell(ix, y, iz)), label + ' brak platformy ' + i);
      assert(!tiles.has(cell(ix, y + 1, iz)) && !tiles.has(cell(ix, y + 2, iz)),
             label + ' zablokowana platforma ' + i);
    }
    if (!i) continue;
    const [px, py, pz, pw, pd] = room.route[i - 1];
    const gx = Math.max(0, x - px - pw, px - x - w);
    const gz = Math.max(0, z - pz - pd, pz - z - d);
    const gap = Math.max(0, Math.hypot(gx, gz) - WIDTH);
    assert(gap < reaches.get(y - py), label + ' skok ' + i + ': przerwa ' + gap + ', wysokość ' + (y - py));
  }
  const [x, y, z] = room.route.at(-1);
  assert(room.blocks.some(([bx, by, bz, type]) => bx === x && by === y && bz === z && type === 'diamond'),
         label + ' trasa nie kończy się na mecie');
}

function checkMaze(room, label) {
  const [sizeX, , sizeZ] = room.size;
  const wall = new Uint8Array(sizeX * sizeZ);
  const index = (x, z) => z * sizeX + x;
  let entry, exit;
  for (const [x, y, z, type] of room.blocks) {
    if (y === 1 || y === 2) wall[index(x, z)] = 1;
    if (type === 'emerald') entry = index(x, z);
    if (type === 'diamond') exit = index(x, z);
  }
  const queue = [entry];
  wall[entry] = 1;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (p === exit) return;
    const neighbors = [p - sizeX, p + sizeX];
    if (p % sizeX) neighbors.push(p - 1);
    if (p % sizeX < sizeX - 1) neighbors.push(p + 1);
    for (const n of neighbors) if (n >= 0 && n < wall.length && !wall[n]) {
      wall[n] = 1;
      queue.push(n);
    }
  }
  assert.fail(label + ' brak przejścia do mety');
}

const themes = Object.keys(THEMES);
const count = Number(process.argv[2] || 2000);
assert(Number.isSafeInteger(count) && count > 0);
let routes = 0, steps = 0;
for (let seed = 1; seed <= count; seed++) {
  for (let diff = 1; diff <= 10; diff++) {
    const theme = themes[(seed + diff) % themes.length];
    for (const type of Object.keys(KINDS)) {
      const state = { seed, diff, theme, type };
      const label = encode(state);
      const room = generate(state);
      if (type === 'labirynt') checkMaze(room, label);
      else {
        checkPlatforms(room, label);
        steps += room.route.length - 1;
      }
      routes++;
    }
  }
}
console.log('Sprawdzone komnaty: %d. Pary platform: %d.', routes, steps);
