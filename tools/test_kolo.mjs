import assert from 'node:assert/strict';
import { LISTS, compatible, decodeProject, planFor, starterFor } from '../assets/js/kolo-projekt.js';
import { BLOCKS } from '../assets/js/blocks.js';

let tried = 0, accepted = 0;
for (const [theme] of LISTS[0].entries())
  for (const [material] of LISTS[1].entries())
    for (const [time] of LISTS[2].entries())
      for (const [rule] of LISTS[3].entries()) {
        const pick = [theme, material, time, rule];
        const decoded = decodeProject(pick.join('-'));
        tried++;
        if (!compatible(pick)) { assert.equal(decoded, null); continue; }
        accepted++;
        assert.deepEqual(decoded, pick);
        const plan = planFor(pick), build = starterFor(pick, plan);
        const [width, height, length] = build.size;
        const cells = new Map(build.blocks.map(([x, y, z, t]) => [[x, y, z].join(','), t]));
        assert(cells.size === build.blocks.length && cells.size > 0 && cells.size < 8000);
        assert(width <= 48 && height <= 64 && length <= 48);
        assert(build.blocks.every(([x, y, z, t]) => Object.hasOwn(BLOCKS, t) && plan.palette.includes(t)
          && x >= 0 && x < width && y >= 0 && y < height && z >= 0 && z < length));
        if (rule === 0) assert(build.blocks.every(([x, y, z, t]) => cells.get([width-1-x, y, z].join(',')) === t));
        if (rule === 2) assert.equal(Math.max(...build.blocks.map(b => b[1])), 19);
        if (rule === 3) assert(build.blocks.some(b => b[3] === 'glowstone'));
        if (rule === 4) assert(cells.size <= 150);
        if (rule === 5) assert(plan.tip.includes('Mechanizm zbuduj osobno'));
        if (rule === 6) assert.equal(Math.min(...build.blocks.map(b => b[1])), 3);
      }
assert.equal(tried, 10_000);
assert(accepted > 9000);
assert.equal(decodeProject('40-0-0-0'), null);
assert.equal(decodeProject('19-0-4-3'), null);
assert.equal(decodeProject('15-0-0-6'), null);
const castle = planFor([19, 3, 4, 5]);
assert(castle.materials.includes('bez kamienia') && castle.tip.includes('podnoszony most nad fosą'));
console.log('Koło wyzwań: ' + tried + ' kombinacji, ' + accepted + ' zgodnych szkiców.');
