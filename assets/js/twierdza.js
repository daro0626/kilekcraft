import { Grid } from './build-grid.js';

// Plan od góry. Dodatnie Z to brama i główny widok, zachodni most prowadzi
// do ogrodu. Wschodni wychodzi na balkon nad kaskadą.
const CREST = [[-20,-4],[-18,-10],[-11,-16],[-2,-17],[7,-15],[17,-12],[19,-3],[16,5],[17,12],[8,16],[-1,16],[-11,15],[-18,9]];
const GARDEN = [[-43,0],[-39,-6],[-31,-7],[-24,-3],[-22,4],[-24,11],[-32,14],[-40,10],[-44,5]];
const CASCADE = [[22,3],[27,1],[35,5],[39,10],[38,16],[32,21],[24,18],[21,11]];
const FLOOR = 22;

function inside(x, z, polygon) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [a,b] = polygon[i], [c,d] = polygon[j];
    if ((b > z) !== (d > z) && x < (c - a) * (z - b) / (d - b) + a) yes = !yes;
  }
  return yes;
}

export function flyingKeep() {
  const g = new Grid();
  const put = (x, y, z, t) => g.set(x, y, z, t);
  const slab = (x0, x1, y, z0, z1, t) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) put(x, y, z, t);
  };
  const lineX = (x0, x1, y, z, t) => slab(x0, x1, y, z, z, t);
  const lineZ = (x, y, z0, z1, t) => slab(x, x, y, z0, z1, t);
  const pillar = (x, z, low, high, t) => { for (let y = low; y <= high; y++) put(x, y, z, t); };

  function island(polygon, cx, cz, top, topThickness, rootLength) {
    const xs = polygon.map(p => p[0]), zs = polygon.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let y = top - rootLength; y <= top; y++) {
      const d = top - y;
      const scale = Math.max(.09, 1 - Math.max(0, d - topThickness) / (rootLength - topThickness + 1));
      const shift = d > topThickness ? Math.sin(d * .42) * 1.9 : 0;
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const wave = Math.sin(x * 1.67 + z * .82) * .67;
          if (!inside(cx + (x - cx + shift + wave) / scale, cz + (z - cz - shift) / scale, polygon)) continue;
          const seams = Math.abs((x * .23 + z * .31 + d) % 9) < 1.2;
          put(x, y, z, d === 0 ? (wave > .37 ? 'moss_block' : 'grass') : d <= 2 ? 'dirt'
            : seams ? 'dark_prismarine' : wave > .42 ? 'cobble' : 'stone');
        }
      }
    }
  }
  island(CREST, -1, 0, FLOOR, 1, 16);
  island(GARDEN, -33, 3, FLOOR - 2, 0, 10);
  island(CASCADE, 29, 11, FLOOR - 4, 0, 12);
  for (const [x, y, z, h] of [[-4, 3, -4, 5], [3, 0, 1, 8], [7, 3, 4, 6], [-33, 8, 2, 4], [28, 4, 11, 5]]) {
    pillar(x, z, y, y + h, 'amethyst');
    put(x + 1, y + Math.floor(h / 2), z, 'purpur');
    put(x, y, z, 'lantern');
  }

  // Kamienne schody od bramy i przechodni krużganek o półkolistych arkadach.
  slab(-10, 10, FLOOR, -11, 11, 'stone_bricks');
  for (let z = 5; z <= 14; z++) for (let x = -2; x <= 2; x++) put(x, FLOOR, z, (x + z) % 2 ? 'quartz' : 'smooth_stone');
  for (const z of [-11, 9]) for (let x = -11; x <= 11; x++) for (let y = 23; y <= 29; y++) {
    const arch = Math.abs(((x + 12) % 6) - 3);
    const open = y <= 26 && arch <= 1 || y === 27 && arch === 0;
    if (!open) put(x, y, z, y === 29 || arch === 2 ? 'quartz' : 'stone_bricks');
  }
  for (const x of [-11, 11]) for (let z = -11; z <= 9; z++) for (let y = 23; y <= 29; y++) {
    const arch = Math.abs(((z + 12) % 6) - 3);
    if (!(y <= 26 && arch <= 1 || y === 27 && arch === 0))
      put(x, y, z, y === 29 || arch === 2 ? 'quartz' : 'stone_bricks');
  }
  for (let z = 9; z <= 11; z++) for (let y = 23; y <= 27; y++) for (let x = -2; x <= 2; x++) g.del(x, y, z);
  lineX(-3, 3, 29, 11, 'cut_copper');
  for (const x of [-3, 3]) { pillar(x, 11, 23, 29, 'quartz'); put(x, 30, 11, 'lantern'); }

  // Główna sala. W środku znajduje się nawa, podwyższenie i złoty kompas.
  slab(-5, 5, 23, -9, 4, 'smooth_stone');
  for (let x = -6; x <= 6; x++) for (let z = -10; z <= 5; z++) {
    if (Math.abs(x) !== 6 && z !== -10 && z !== 5) continue;
    const side = Math.abs(x) === 6;
    const rib = side ? (z + 10) % 5 === 0 : (x + 6) % 4 === 0;
    for (let y = 24; y <= 39; y++) {
      const door = z === 5 && Math.abs(x) <= 2 && y <= (Math.abs(x) === 2 ? 27 : 29);
      if (door) continue;
      const window = !rib && y % 13 >= 2 && y % 13 <= 7;
      const type = rib || y === 31 || y === 39 ? 'quartz' : window ? (y % 4 === 0 ? 'amethyst' : 'glass') : 'stone_bricks';
      put(x, y, z, type);
    }
  }
  slab(-4, 4, 24, -9, -7, 'quartz');
  lineX(-3, 3, 24, -2, 'gold');
  lineZ(0, 24, -6, 2, 'gold');
  for (const x of [-5, 5]) for (const z of [-7, -2, 3]) {
    pillar(x, z, 24, 34, 'quartz'); put(x, 35, z, 'lantern');
  }
  for (let y = 40; y <= 49; y++) {
    const half = Math.max(0, 6 - Math.floor((y - 39) * .65));
    lineZ(-half, y, -11, 6, 'dark_prismarine');
    lineZ(half, y, -11, 6, 'prismarine');
    for (const z of [-11, 6]) lineX(-half, half, y, z, y % 3 ? 'prismarine' : 'cut_copper');
  }
  lineZ(0, 50, -11, 6, 'cut_copper');
  for (const z of [-10, 5]) {
    pillar(0, z, 51, 54, 'quartz'); put(0, 55, z, 'gold'); put(0, 56, z, 'lantern');
  }

  function tower(x, z, base, walls, roof) {
    for (let y = base; y <= walls; y++) for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const d = Math.abs(dx) + Math.abs(dz), r = Math.max(Math.abs(dx), Math.abs(dz));
      if (r !== 3 && d !== 5 || d > 5) continue;
      if (y < base + 4 && dz === 3 && Math.abs(dx) <= 1) continue;
      const window = (dx === 0 || dz === 0) && (y - base) % 9 >= 4 && (y - base) % 9 <= 6;
      put(x + dx, y, z + dz, window ? 'glass' : y === walls || d === 5 ? 'quartz' : 'stone_bricks');
    }
    for (let y = base; y <= walls; y += 7) {
      slab(x - 2, x + 2, y, z - 2, z + 2, 'spruce_planks');
      g.del(x - 1, y, z);
      put(x + 2, y + 2, z - 2, 'lantern');
    }
    for (let y = walls + 1; y <= roof; y++) {
      const r = Math.floor((roof - y) * 4 / (roof - walls));
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) === r) put(x + dx, y, z + dz, y === walls + 1 ? 'cut_copper' : 'dark_prismarine');
      }
    }
    put(x, roof + 1, z, 'gold'); put(x, roof + 2, z, 'lantern');
  }
  tower(-11, 6, 23, 39, 49);
  tower(11, 6, 23, 37, 46);
  tower(-10, -10, 23, 42, 54);
  tower(10, -10, 23, 46, 60);
  tower(0, -12, 31, 48, 63);

  // Mosty o własnych przęsłach i osobnych poziomach, z poręczami i podświetleniem.
  for (const [from, to, z, down] of [[-24, -14, 5, 2], [15, 26, 9, 4]]) {
    const east = from > 0;
    for (let x = from; x <= to; x++) {
      const run = east ? x - from : to - x;
      const y = FLOOR + 1 - Math.floor(run * down / (to - from));
      for (let dz = -1; dz <= 1; dz++) put(x, y, z + dz, dz ? 'quartz' : 'spruce_planks');
      for (const dz of [-2, 2]) {
        put(x, y, z + dz, 'stone_bricks');
        put(x, y + 1, z + dz, x % 3 === 0 ? 'lantern' : 'cut_copper');
      }
      const drop = Math.max(0, Math.abs(x - (from + to) / 2) - 2);
      for (let h = 1; h <= drop; h++) put(x, y - h, z, 'stone_bricks');
    }
  }
  lineX(-34, -21, FLOOR - 2, 5, 'quartz');
  lineX(25, 34, FLOOR - 4, 9, 'quartz');
  for (const [x, z] of [[-39, 1], [-33, -3], [-28, 9], [-36, 9]]) {
    pillar(x, z, FLOOR - 1, FLOOR + 3, 'oak_log');
    for (let y = FLOOR + 2; y <= FLOOR + 5; y++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) + Math.abs(y - FLOOR - 3) < 5)
        put(x + dx, y, z + dz, (dx + dz) % 3 ? 'leaves' : 'moss_block');
    }
    put(x + 1, FLOOR + 2, z, 'lantern');
  }
  for (let x = -39; x <= -29; x++) {
    const arc = 5 - Math.floor(Math.abs(x + 34) / 2);
    lineZ(x, FLOOR + arc, -1, 3, x % 3 === 0 ? 'cut_copper' : 'glass');
  }
  for (const x of [-39, -29]) for (const z of [-1, 3]) pillar(x, z, FLOOR - 1, FLOOR + 2, 'quartz');
  slab(26, 35, FLOOR - 5, 12, 18, 'dark_prismarine');
  for (let x = 26; x <= 35; x++) for (let z = 12; z <= 18; z++) {
    const edge = x === 26 || x === 35 || z === 12 || z === 18;
    put(x, FLOOR - 4, z, edge ? 'quartz' : 'water');
  }
  for (let y = 6; y < FLOOR - 3; y++) {
    put(35, y, 17, 'water');
    put(36, y, 17, 'water');
    if (y < FLOOR - 8) put(36, y, 18, 'water');
  }
  slab(32, 38, 5, 14, 20, 'dark_prismarine');
  for (const [x, z] of [[32, 14], [38, 14], [32, 20], [38, 20]]) put(x, 6, z, 'lantern');
  return g.list();
}
