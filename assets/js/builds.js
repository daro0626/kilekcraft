// =========================================================
// KILEKCRAFT — wielkie budowle generowane kodem.
// Każda budowla to lista bloków [x, y, z, typ]. Typy opisuje BLOCKS.
// Docelowo budowle mają też przychodzić z plików .schem z Kilek World
// (patrz docs/ZADANIA.md, zadanie B3).
// =========================================================

import { Grid, rng } from './build-grid.js';
import { island } from './island.js';
export { BLOCKS } from './blocks.js';

// ---------- 2. Gigantyczny miecz w skale ----------
function sword() {
  const g = new Grid(), r = rng(21), cx = 12, cz = 8;
  // skała
  for (let x = 0; x <= 24; x++) for (let z = 0; z <= 16; z++) for (let y = 0; y <= 8; y++) {
    const d = Math.hypot((x - cx) / 1.25, (y + 2) * 1.15, (z - cz) / .85);
    if (d <= 10.5 + r() * 1.1) g.set(x, y, z, r() < .35 ? 'cobble' : 'stone');
  }
  // trawa wokół skały
  for (let x = -4; x <= 28; x++) for (let z = -4; z <= 20; z++) if (!g.get(x, 0, z)) {
    const d = Math.hypot((x - cx) / 1.5, (z - cz) / 1.1); if (d < 13) g.set(x, 0, z, 'grass');
  }
  // ostrze (od wnętrza skały w górę)
  for (let y = 3; y <= 34; y++) for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz; z <= cz + 1; z++) {
    const edge = x === cx - 2 || x === cx + 2;
    g.set(x, y, z, edge ? 'iron' : (x === cx ? 'diamond' : 'quartz'));
  }
  // jelec
  for (let x = cx - 7; x <= cx + 7; x++) for (let y = 35; y <= 36; y++) for (let z = cz - 1; z <= cz + 2; z++) g.set(x, y, z, 'gold');
  for (const s of [-1, 1]) { g.set(cx + 7 * s, 37, cz, 'gold'); g.set(cx + 7 * s, 37, cz + 1, 'gold'); g.set(cx + 7 * s, 38, cz, 'diamond'); g.set(cx + 7 * s, 38, cz + 1, 'diamond'); }
  // rękojeść
  for (let y = 37; y <= 44; y++) for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz; z <= cz + 1; z++) g.set(x, y, z, y % 3 === 0 ? 'gold' : 'dark_log');
  // głowica
  for (let y = 45; y <= 48; y++) for (let x = cx - 2; x <= cx + 2; x++) for (let z = cz - 1; z <= cz + 2; z++) {
    const corner = (x === cx - 2 || x === cx + 2) && (y === 45 || y === 48);
    if (!corner) g.set(x, y, z, (x === cx && (y === 46 || y === 47)) ? 'diamond' : 'gold');
  }
  // świecące odłamki wokół
  [[3, 9], [21, 5], [6, 15], [19, 14]].forEach(([x, z]) => { let y = 0; while (g.get(x, y, z)) y++; g.set(x, y, z, 'amethyst'); g.set(x, y + 1, z, 'amethyst'); });
  return g.list();
}

// ---------- 3. Wieża Smoka ----------
function tower() {
  const g = new Grid(), r = rng(3), C = 12, R = 6, H = 44;
  for (let y = 0; y <= H; y++) for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) {
    const d = Math.hypot(x - C, z - C);
    if (d <= R + .5 && d > R - .7) {
      const a = Math.atan2(z - C, x - C);
      const win = y % 9 >= 3 && y % 9 <= 5 && [0, Math.PI / 2, Math.PI, -Math.PI / 2].some(w => Math.abs(Math.atan2(Math.sin(a - w), Math.cos(a - w))) < .22);
      g.set(x, y, z, win ? 'glass' : (r() < .22 ? 'cobble' : 'stone_bricks'));
    }
    if (d <= R - .7 && y % 11 === 0) g.set(x, y, z, 'oak_planks'); // piętra
  }
  // spiralny balkon
  for (let t = 0; t < 360; t++) {
    const a = t * .105, y = Math.floor(2 + t * .11); if (y > H - 2) break;
    for (const rr of [7, 8]) { const x = Math.round(C + Math.cos(a) * rr), z = Math.round(C + Math.sin(a) * rr); g.set(x, y, z, 'oak_planks'); }
  }
  // korona z blankami
  for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) {
    const d = Math.hypot(x - C, z - C);
    if (d <= 9.4) g.set(x, H + 1, z, 'stone_bricks');
    if (d <= 9.4 && d > 8.4 && (Math.round(Math.atan2(z - C, x - C) * 6) % 2 === 0)) g.set(x, H + 2, z, 'stone_bricks');
  }
  // dach-stożek
  for (let y = 0; y <= 12; y++) { const rr = 7.5 * (1 - y / 13); for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) { const d = Math.hypot(x - C, z - C); if (d <= rr + .4 && d > rr - 1.2) g.set(x, H + 3 + y, z, y % 4 === 3 ? 'amethyst' : 'purpur'); } }
  g.set(C, H + 16, C, 'lantern'); g.set(C, H + 17, C, 'lantern');
  // latarnie na koronie
  [[C + 9, C], [C - 9, C], [C, C + 9], [C, C - 9]].forEach(([x, z]) => g.set(x, H + 3, z, 'lantern'));
  return g.list();
}

// ---------- 4. Arena LifeSteal ----------
function arena() {
  const g = new Grid(), C = 20;
  const heart = [
    '.XX...XX.',
    'XXXX.XXXX',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.XXXXXXX.',
    '..XXXXX..',
    '...XXX...',
    '....X....'];
  for (let x = 0; x <= 40; x++) for (let z = 0; z <= 40; z++) {
    const d = Math.hypot(x - C, z - C), gate = Math.abs(x - C) <= 1 || Math.abs(z - C) <= 1;
    if (d <= 11.5) {
      const hx = x - C + 4, hz = z - C + 4;
      const isHeart = hz >= 0 && hz < 8 && hx >= 0 && hx < 9 && heart[hz][hx] === 'X';
      g.set(x, 0, z, isHeart ? 'red_concrete' : 'sand');
    } else if (d <= 12.5) {
      for (let y = 0; y <= 3; y++) if (!(gate && y >= 1)) g.set(x, y, z, y === 3 ? 'smooth_stone' : 'red_concrete');
    } else if (d <= 19.5 && !gate) {
      const step = Math.min(6, Math.floor(d - 12.5) + 1);
      for (let y = 0; y <= step + 2; y++) g.set(x, y, z, y === step + 2 ? 'smooth_stone' : 'stone_bricks');
    } else if (d <= 19.5) g.set(x, 0, z, 'stone_bricks');
  }
  // filary z latarniami przy bramach
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const s of [-2, 2]) {
    const x = C + dx * 13 + (dz ? s : 0), z = C + dz * 13 + (dx ? s : 0);
    for (let y = 1; y <= 10; y++) g.set(x, y, z, y === 10 ? 'lantern' : 'stone_bricks');
  }
  return g.list();
}


// ---------- 5. Wulkan z lawą ----------
function volcano() {
  const g = new Grid(), r = rng(11), C = 18, H = 26, R0 = 17;
  for (let y = 0; y <= H; y++) {
    const rad = R0 * (1 - y / (H + 6)) + 1;
    for (let x = 0; x <= 36; x++) for (let z = 0; z <= 36; z++) {
      const d = Math.hypot(x - C, z - C) + (r() - .5) * .9;
      const crater = y >= H - 4 && d < 4.2;
      if (d <= rad && d > rad - 2.2 && !crater) g.set(x, y, z, y > H - 6 && r() < .5 ? 'obsidian' : r() < .3 ? 'black_concrete' : r() < .5 ? 'cobble' : 'stone');
      if (y === 0 && d <= rad) g.set(x, y, z, 'black_concrete');
    }
  }
  // krater z lawą
  for (let x = 0; x <= 36; x++) for (let z = 0; z <= 36; z++) if (Math.hypot(x - C, z - C) < 4.6) g.set(x, H - 3, z, 'lava');
  // rzeki lawy po zboczach
  for (const a of [0.3, 2.4, 4.3]) {
    for (let y = H - 3; y >= 1; y--) {
      const rad = R0 * (1 - y / (H + 6)) + 1, w = Math.sin(y * .5 + a) * .25;
      const x = Math.round(C + Math.cos(a + w) * (rad - .5)), z = Math.round(C + Math.sin(a + w) * (rad - .5));
      g.set(x, y + 1, z, 'lava');
    }
  }
  // dym z bloków wełny nad kraterem
  for (let i = 0; i < 40; i++) { const y = H + 2 + Math.floor(r() * 10), sp = (y - H) * .35; g.set(Math.round(C + (r() - .5) * sp * 2), y, Math.round(C + (r() - .5) * sp * 2), r() < .5 ? 'white_wool' : 'smooth_stone'); }
  return g.list();
}

// ---------- 6. Smok oplatający górę ----------
function dragon() {
  const g = new Grid(), r = rng(5), C = 20, H = 30;
  // góra
  for (let y = 0; y <= H; y++) { const rad = 14 * (1 - y / (H + 3)); for (let x = 0; x <= 40; x++) for (let z = 0; z <= 40; z++) { const d = Math.hypot(x - C, z - C) + (r() - .5); if (d <= rad && d > rad - 2) g.set(x, y, z, y > H - 7 ? 'white_wool' : (r() < .15 ? 'grass' : r() < .4 ? 'cobble' : 'stone')); } }
  // ciało smoka: spirala wokół góry
  const turns = 2.1, steps = 520;
  let last = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = t * turns * Math.PI * 2, y = 2 + t * (H - 2);
    const rad = 14 * (1 - y / (H + 3)) + 2.2;
    const cx = C + Math.cos(a) * rad, cz = C + Math.sin(a) * rad;
    const th = t < .12 ? .6 + t * 6 : 1.4; // ogon cieńszy
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) {
      if (dx * dx + dy * dy + dz * dz > th * th + .3) continue;
      const bx = Math.round(cx + dx), by = Math.round(y + dy), bz = Math.round(cz + dz);
      g.set(bx, by, bz, dy <= -1 ? 'red_concrete' : 'emerald');
    }
    if (i % 9 === 0 && t > .1) g.set(Math.round(cx), Math.round(y + th + 1), Math.round(cz), 'gold'); // kolce
    last = [cx, y, cz, a];
  }
  // głowa na szczycie
  const [hx, hy, hz] = [C, H + 2, C];
  for (let x = -3; x <= 3; x++) for (let y = 0; y <= 4; y++) for (let z = -2; z <= 2; z++) g.set(hx + x, hy + y, hz + z, 'emerald');
  for (let x = 4; x <= 7; x++) for (let y = 0; y <= 2; y++) for (let z = -2; z <= 2; z++) g.set(hx + x, hy + y, hz + z, y === 0 ? 'red_concrete' : 'emerald'); // pysk
  g.set(hx + 3, hy + 3, hz - 2, 'lantern'); g.set(hx + 3, hy + 3, hz + 2, 'lantern'); // oczy
  for (const s of [-2, 2]) for (let k = 0; k < 4; k++) g.set(hx - 2 - k, hy + 5 + k, hz + s, 'quartz'); // rogi
  for (let x = 8; x <= 9; x++) g.set(hx + x, hy + 1, hz, 'lava'); // ogień z pyska
  // skrzydła
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) for (let j = 0; j <= 8 - i; j++) g.set(hx - 1 + j - 4, hy + 3 + Math.floor(i / 2), hz + s * (3 + i), i % 3 === 0 ? 'black_concrete' : 'purpur');
  return g.list();
}

// ---------- 7. Statek na wodospadzie ----------
function ship() {
  const g = new Grid(), r = rng(17), TOP = 22;
  // klif
  for (let x = 0; x <= 28; x++) for (let z = 0; z <= 18; z++) for (let y = 0; y <= TOP; y++) {
    const edge = 14 + Math.round(Math.sin(z * .7) * 1.2);
    if (x < edge && (y <= TOP)) { if (x === 0 || z === 0 || z === 18 || y === 0 || x === edge - 1 || y >= TOP - 1) g.set(x, y, z, y >= TOP ? 'grass' : r() < .3 ? 'cobble' : 'stone'); }
  }
  // rzeka na górze i wodospad
  for (let x = 0; x <= 15; x++) for (let z = 6; z <= 12; z++) g.set(x, TOP, z, 'water');
  for (let y = 1; y < TOP; y++) for (let z = 6; z <= 12; z++) g.set(15 + (y % 2 && r() < .3 ? 1 : 0), y, z, 'water');
  // jezioro pod spodem
  for (let x = 14; x <= 40; x++) for (let z = -4; z <= 22; z++) { if (Math.hypot((x - 24) / 1.3, z - 9) < 13) g.set(x, 0, z, 'water'); }
  // statek przechylony nad krawędzią
  const sx = 4, sz = 9, sy = TOP + 1;
  for (let i = 0; i <= 18; i++) {
    const w = i < 3 ? 1 : i > 15 ? 18 - i : 3, tilt = Math.max(0, i - 11) > 0 ? -Math.floor((i - 11) / 2) : 0;
    for (let k = -w; k <= w; k++) for (let h = 0; h <= 2; h++) {
      if (h === 0 || Math.abs(k) === w || i === 0 || i === 18) g.set(sx + i, sy + h + tilt, sz + k, h === 0 ? 'dark_log' : 'oak_planks');
    }
    if (i > 0 && i < 18) for (let k = -w + 1; k <= w - 1; k++) g.set(sx + i, sy + 1 + tilt, sz + k, 'oak_planks'); // pokład
  }
  // maszty i żagle
  for (const [mi, hgt] of [[6, 12], [12, 10]]) {
    const tilt = mi > 11 ? -1 : 0;
    for (let y = 2; y <= hgt; y++) g.set(sx + mi, sy + y + tilt, sz, 'oak_log');
    for (let y = 4; y <= hgt - 1; y++) for (let k = -3; k <= 3; k++) g.set(sx + mi + 1, sy + y + tilt, sz + k, Math.abs(k) === 3 && (y === 4 || y === hgt - 1) ? 'red_concrete' : 'white_wool');
  }
  g.set(sx + 6, sy + 13, sz, 'red_concrete'); g.set(sx + 6, sy + 13, sz + 1, 'red_concrete'); // flaga
  return g.list();
}

// ---------- 8. Zamek z mostem zwodzonym ----------
function castle() {
  const g = new Grid(), r = rng(23), S = 30, H = 10;
  const wallB = () => r() < .2 ? 'cobble' : 'stone_bricks';
  // fosa
  for (let x = -4; x <= S + 4; x++) for (let z = -4; z <= S + 4; z++) { const out = Math.max(-x, x - S, -z, z - S); if (out >= 1 && out <= 3) g.set(x, 0, z, 'water'); else if (out >= 4) g.set(x, 0, z, 'grass'); }
  // mury z blankami
  for (let i = 0; i <= S; i++) for (let y = 0; y <= H; y++) for (const [x, z] of [[i, 0], [i, S], [0, i], [S, i]]) {
    const gate = z === 0 && Math.abs(x - S / 2) <= 2 && y >= 1 && y <= 5;
    if (!gate) g.set(x, y, z, wallB());
  }
  for (let i = 0; i <= S; i += 2) for (const [x, z] of [[i, 0], [i, S], [0, i], [S, i]]) g.set(x, H + 1, z, 'stone_bricks');
  // wieże w narożnikach
  for (const [cx, cz] of [[0, 0], [S, 0], [0, S], [S, S]]) {
    for (let y = 0; y <= 16; y++) for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const d = Math.hypot(x, z); if (d <= 3.4 && d > 2.3) g.set(cx + x, y, cz + z, (y % 5 === 3 && (x === 0 || z === 0)) ? 'glass' : wallB()); }
    for (let y = 0; y <= 6; y++) { const rr = 4.2 * (1 - y / 7); for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) { const d = Math.hypot(x, z); if (d <= rr + .4 && d > rr - 1.2) g.set(cx + x, 17 + y, cz + z, 'red_concrete'); } }
    g.set(cx, 24, cz, 'gold');
  }
  // donżon w środku
  const K0 = S / 2 - 5, K1 = S / 2 + 5;
  for (let y = 0; y <= 20; y++) for (let x = K0; x <= K1; x++) for (let z = K0; z <= K1; z++) {
    const edge = x === K0 || x === K1 || z === K0 || z === K1;
    if (edge) g.set(x, y, z, (y % 6 === 4 && (x === S / 2 || z === S / 2)) ? 'glass' : wallB());
    if (y === 0 || y === 10) g.set(x, y, z, 'oak_planks');
  }
  for (let x = K0; x <= K1; x += 2) for (const z of [K0, K1]) g.set(x, 21, z, 'stone_bricks');
  for (let z = K0; z <= K1; z += 2) for (const x of [K0, K1]) g.set(x, 21, z, 'stone_bricks');
  for (let y = 21; y <= 26; y++) g.set(S / 2, y, S / 2, 'oak_log');
  for (let y = 23; y <= 26; y++) for (let k = 1; k <= 4; k++) g.set(S / 2 + k, y, S / 2, y === 26 || y === 23 ? 'blue_concrete' : 'gold'); // chorągiew
  // dziedziniec
  for (let x = 1; x < S; x++) for (let z = 1; z < S; z++) if (!g.get(x, 0, z)) g.set(x, 0, z, (x + z) % 5 ? 'smooth_stone' : 'cobble');
  // most zwodzony nad fosą + łańcuchy
  for (let z = -4; z <= 0; z++) for (let x = S / 2 - 2; x <= S / 2 + 2; x++) g.set(x, 1, z, 'oak_planks');
  for (const x of [S / 2 - 2, S / 2 + 2]) for (let k = 0; k <= 4; k++) g.set(x, 2 + k, -4 + Math.round(k * .8), 'iron');
  // latarnie przy bramie
  g.set(S / 2 - 3, 6, -1, 'lantern'); g.set(S / 2 + 3, 6, -1, 'lantern');
  return g.list();
}


// =========================================================
// Budowle dodane razem z kategoriami (Średniowiecze, Natura, Fantasy,
// Przetrwanie, Miasto i kosmos, LifeSteal).
// =========================================================
const ring = (x, z, cx, cz, r, w = 1) => { const d = Math.hypot(x - cx, z - cz); return d <= r + .5 && d > r + .5 - w; };

// ---------- Wiatrak ----------
function windmill() {
  const g = new Grid(), C = 8, H = 18;
  for (let y = 0; y <= H; y++) { const r = 5 - y * .12; for (let x = 0; x <= 16; x++) for (let z = 0; z <= 16; z++) {
    if (ring(x, z, C, C, r, 1.2)) g.set(x, y, z, (y === 6 || y === 12) && (x === C || z === C) ? 'glass' : y % 6 === 0 ? 'spruce_planks' : 'bricks');
    if (y === 0 && Math.hypot(x - C, z - C) <= r) g.set(x, y, z, 'spruce_planks');
  } }
  for (let y = 0; y <= 6; y++) { const r = 3.6 * (1 - y / 7); for (let x = 0; x <= 16; x++) for (let z = 0; z <= 16; z++) if (ring(x, z, C, C, r, 1.3)) g.set(x, H + 1 + y, z, 'dark_log'); }
  for (const y of [1, 2]) for (const z of [C - 5, C - 4]) g.del(C, y, z); // drzwi
  // oś i cztery skrzydła z białego płótna
  const hy = H - 2, hz = 1;
  for (let z = hz; z <= 3; z++) g.set(C, hy, z, 'spruce_log');
  for (let k = 1; k <= 12; k++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    g.set(C + dx * k, hy + dy * k, hz, 'spruce_log');
    if (k >= 3) for (let w = 1; w <= 3; w++) g.set(C + dx * k + (dy ? w : 0) * (dy > 0 ? 1 : -1), hy + dy * k + (dx ? w : 0) * (dx > 0 ? -1 : 1), hz, 'white_wool');
  }
  // pole z dyniami i snopki
  for (let x = -6; x <= 22; x++) for (let z = 13; z <= 24; z++) g.set(x, 0, z, (x + z) % 4 === 0 ? 'pumpkin' : 'grass');
  [[-2, 3], [-3, 5], [18, 4], [19, 6]].forEach(([x, z]) => { g.set(x, 0, z, 'hay'); g.set(x, 1, z, 'hay'); });
  return g.list();
}

// ---------- Wieża strażnicza ----------
function watchtower() {
  const g = new Grid(), S = 6, H = 16;
  for (let y = 0; y <= H; y++) for (let x = 0; x <= S; x++) for (let z = 0; z <= S; z++) {
    const edge = x === 0 || x === S || z === 0 || z === S, corner = (x === 0 || x === S) && (z === 0 || z === S);
    if (corner) g.set(x, y, z, 'spruce_log');
    else if (edge && y <= 6) g.set(x, y, z, y === 3 && (x === S / 2 || z === S / 2) ? 'glass' : 'cobble');
    else if (edge && y > 6 && y % 4 === 0) g.set(x, y, z, 'spruce_planks');
    if (y === 0 || y === 7) if (!edge || y === 0) g.set(x, y, z, 'spruce_planks');
  }
  g.del(S / 2, 1, 0); g.del(S / 2, 2, 0);
  // platforma z balustradą i daszkiem
  for (let x = -2; x <= S + 2; x++) for (let z = -2; z <= S + 2; z++) {
    g.set(x, H + 1, z, 'spruce_planks');
    const edge = x === -2 || x === S + 2 || z === -2 || z === S + 2;
    if (edge) g.set(x, H + 2, z, (x + z) % 2 ? 'spruce_log' : 'cobble');
  }
  for (const [x, z] of [[-2, -2], [S + 2, -2], [-2, S + 2], [S + 2, S + 2]]) for (let y = H + 2; y <= H + 5; y++) g.set(x, y, z, 'spruce_log');
  for (let k = 0; k <= 4; k++) for (let x = -3 + k; x <= S + 3 - k; x++) for (let z = -3 + k; z <= S + 3 - k; z++) {
    const edge = x === -3 + k || x === S + 3 - k || z === -3 + k || z === S + 3 - k; if (edge || k === 4) g.set(x, H + 6 + k, z, 'dark_log');
  }
  g.set(S / 2, H + 2, S / 2, 'lantern'); g.set(S / 2, H + 11, S / 2, 'lantern');
  // kamienna ścieżka do drzwi
  for (let z = -8; z <= -1; z++) g.set(S / 2, 0, z, 'cobble');
  return g.list();
}

// ---------- Wielkie drzewo ----------
function bigTree() {
  const g = new Grid(), r = rng(31), C = 16, H = 26;
  for (let y = 0; y <= H; y++) { const rad = y < 4 ? 3.6 - y * .2 : 2.6 - y * .03; for (let x = 0; x <= 32; x++) for (let z = 0; z <= 32; z++) if (Math.hypot(x - C, z - C) <= rad) g.set(x, y, z, 'oak_log'); }
  // korzenie
  for (let a = 0; a < 6; a++) { const ang = a * 1.05 + .3; for (let k = 3; k <= 8; k++) g.set(Math.round(C + Math.cos(ang) * k), Math.max(0, 2 - Math.floor(k / 3)), Math.round(C + Math.sin(ang) * k), 'oak_log'); }
  // gałęzie i kule liści
  const blob = (bx, by, bz, R) => { for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
    if (Math.hypot(x, y * 1.4, z) <= R + r() * .6 - .3 && !g.get(bx + x, by + y, bz + z)) g.set(bx + x, by + y, bz + z, 'leaves'); } };
  const tips = [];
  for (let a = 0; a < 5; a++) { const ang = a * 1.26 + .5, y0 = 14 + (a % 3) * 3; let x = C, y = y0, z = C;
    for (let k = 0; k < 9; k++) { x += Math.cos(ang); z += Math.sin(ang); y += .45; g.set(Math.round(x), Math.round(y), Math.round(z), 'oak_log'); }
    tips.push([Math.round(x), Math.round(y), Math.round(z)]); }
  for (const [x, y, z] of tips) blob(x, y + 1, z, 5);
  blob(C, H + 2, C, 7);
  // świecące owoce i trawa
  for (let i = 0; i < 14; i++) { const [x, y, z] = tips[i % tips.length]; g.set(x + Math.round((r() - .5) * 8), y - 3, z + Math.round((r() - .5) * 8), 'glowstone'); }
  for (let x = 0; x <= 32; x++) for (let z = 0; z <= 32; z++) if (!g.get(x, 0, z) && Math.hypot(x - C, z - C) < 15) g.set(x, 0, z, r() < .2 ? 'moss' : 'grass');
  return g.list();
}

// ---------- Jaskinia kryształów ----------
function crystalCave() {
  const g = new Grid(), r = rng(41), C = 14, R = 12;
  for (let x = 0; x <= 28; x++) for (let z = 0; z <= 28; z++) for (let y = 0; y <= R; y++) {
    const d = Math.hypot(x - C, y * 1.15, z - C);
    if (d <= R + .5 && d > R - 1.6 + r() * .6) g.set(x, y, z, r() < .25 ? 'cobble' : 'stone');
    if (y === 0 && d <= R) g.set(x, y, z, r() < .3 ? 'cobble' : 'stone');
  }
  // szerokie wejście od strony kamery, żeby zajrzeć do środka
  for (let x = 0; x <= 28; x++) for (let y = 1; y <= R; y++) for (let z = C; z <= 28; z++) if (Math.hypot((x - C) / 1.2, y) < 7.5) g.del(x, y, z);
  // kryształy z podłogi i z sufitu (sufit liczony z kształtu kopuły)
  const roof = (x, z) => Math.floor(Math.sqrt(Math.max(0, (R - 1.8) ** 2 - (x - C) ** 2 - (z - C) ** 2)) / 1.15);
  const spike = (x, z, h, down) => { const top = roof(x, z); for (let k = 0; k < h; k++) { const y = down ? top - k : 1 + k; if (y < 1 || y >= top + (down ? 1 : 0)) continue; g.set(x, y, z, k === h - 1 ? 'glowstone' : 'amethyst'); if (k < h / 2) { g.set(x + 1, y, z, 'amethyst'); g.set(x, y, z + 1, 'amethyst'); } } };
  for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 2 + r() * 6; spike(Math.round(C + Math.cos(a) * d), Math.round(C + Math.sin(a) * d), 3 + Math.floor(r() * 4), false); }
  for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 1 + r() * 5; spike(Math.round(C + Math.cos(a) * d), Math.round(C + Math.sin(a) * d), 2 + Math.floor(r() * 3), true); }
  // podziemne jeziorko
  for (let x = 0; x <= 28; x++) for (let z = 0; z <= 28; z++) if (Math.hypot(x - C - 4, z - C - 3) < 3) g.set(x, 0, z, 'water');
  return g.list();
}

// ---------- Portal do innego świata ----------
function endPortal() {
  const g = new Grid(), r = rng(53), C = 15;
  // wyspa z kamienia Kresu
  for (let y = 0; y <= 6; y++) { const rad = 13 - (6 - y) * 1.6; for (let x = 0; x <= 30; x++) for (let z = 0; z <= 30; z++) if (Math.hypot(x - C, z - C) + r() * 1.2 <= rad) g.set(x, y, z, y === 6 ? 'end_stone' : r() < .3 ? 'obsidian' : 'end_stone'); }
  // pierścień portalu
  const base = 7;
  for (let a = 0; a < 360; a += 2) { const t = a * Math.PI / 180; for (const rr of [8, 9]) { const x = Math.round(C + Math.cos(t) * rr), y = Math.round(base + 9 + Math.sin(t) * rr); if (y >= base) g.set(x, y, C, rr === 8 ? 'purpur' : 'obsidian'); } }
  for (let x = C - 7; x <= C + 7; x++) for (let y = base; y <= base + 17; y++) if (Math.hypot(x - C, y - base - 9) < 7.6) g.set(x, y, C, 'portal');
  // filary z kryształami
  for (const [x, z] of [[C - 10, C - 6], [C + 10, C - 6], [C - 10, C + 6], [C + 10, C + 6]]) { for (let y = base; y <= base + 8; y++) g.set(x, y, z, 'obsidian'); g.set(x, base + 9, z, 'amethyst'); g.set(x, base + 10, z, 'lantern'); }
  // latające odłamki
  for (let i = 0; i < 6; i++) { const a = i * 1.05, x = Math.round(C + Math.cos(a) * 16), z = Math.round(C + Math.sin(a) * 16), y = 10 + (i % 3) * 4; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) g.set(x + dx, y, z + dz, 'end_stone'); g.set(x, y - 1, z, 'end_stone'); }
  return g.list();
}

// ---------- Domek na drzewie ----------
function treeHouse() {
  const g = new Grid(), r = rng(61), C = 10, F = 11;
  for (let y = 0; y <= F + 10; y++) for (let x = C - 1; x <= C + 1; x++) for (let z = C - 1; z <= C + 1; z++) if (Math.hypot(x - C, z - C) < 1.6) g.set(x, y, z, 'spruce_log');
  // podłoga i domek
  for (let x = C - 5; x <= C + 5; x++) for (let z = C - 5; z <= C + 5; z++) g.set(x, F, z, 'spruce_planks');
  for (let y = F + 1; y <= F + 4; y++) for (let x = C - 3; x <= C + 3; x++) for (let z = C - 3; z <= C + 3; z++) {
    const edge = x === C - 3 || x === C + 3 || z === C - 3 || z === C + 3; if (!edge) continue;
    const corner = (x === C - 3 || x === C + 3) && (z === C - 3 || z === C + 3);
    g.set(x, y, z, corner ? 'spruce_log' : y === F + 2 && (x === C || z === C) ? 'glass' : 'oak_planks');
  }
  g.del(C, F + 1, C - 3); g.del(C, F + 2, C - 3);
  for (let k = 0; k <= 4; k++) for (let x = C - 4 + k; x <= C + 4 - k; x++) for (let z = C - 4; z <= C + 4; z++) if (x === C - 4 + k || x === C + 4 - k) g.set(x, F + 5 + k, z, 'dark_log');
  // balustrada, drabina z desek i korona drzewa
  for (let x = C - 5; x <= C + 5; x++) for (let z = C - 5; z <= C + 5; z++) if ((x === C - 5 || x === C + 5 || z === C - 5 || z === C + 5) && (x + z) % 2 === 0) g.set(x, F + 1, z, 'spruce_log');
  for (let y = 1; y < F; y++) g.set(C, y, C - 2, 'spruce_planks');
  for (let x = -6; x <= 6; x++) for (let y = 0; y <= 6; y++) for (let z = -6; z <= 6; z++) { const d = Math.hypot(x, y * 1.3, z); if (d <= 6 + r() * .7 && (Math.abs(x) > 4 || Math.abs(z) > 4 || y > 3)) if (!g.get(C + x, F + 7 + y, C + z)) g.set(C + x, F + 7 + y, C + z, 'leaves'); }
  g.set(C, F + 4, C, 'lantern');
  for (let x = 0; x <= 20; x++) for (let z = 0; z <= 20; z++) if (!g.get(x, 0, z) && Math.hypot(x - C, z - C) < 9) g.set(x, 0, z, 'grass');
  return g.list();
}

// ---------- Latarnia morska ----------
function lighthouse() {
  const g = new Grid(), r = rng(71), C = 12, H = 24;
  for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) { const d = Math.hypot(x - C, z - C); if (d < 12) g.set(x, 0, z, d < 7 + r() * 1.5 ? 'stone' : 'water'); if (d < 6.5 + r()) g.set(x, 1, z, r() < .4 ? 'cobble' : 'stone'); }
  for (let y = 2; y <= H; y++) { const rad = 4 - y * .06; for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) if (ring(x, z, C, C, rad, 1.2)) g.set(x, y, z, Math.floor((y - 2) / 4) % 2 ? 'white_concrete' : 'red_concrete'); }
  for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) { const d = Math.hypot(x - C, z - C); if (d <= 4.4) g.set(x, H + 1, z, 'smooth_stone'); if (d <= 4.4 && d > 3.4) g.set(x, H + 2, z, 'iron'); }
  for (let y = H + 2; y <= H + 4; y++) for (let x = C - 2; x <= C + 2; x++) for (let z = C - 2; z <= C + 2; z++) { const d = Math.hypot(x - C, z - C); if (d <= 2.2) g.set(x, y, z, d < 1.2 ? 'glowstone' : 'glass'); }
  for (let k = 0; k <= 3; k++) for (let x = C - 3 + k; x <= C + 3 - k; x++) for (let z = C - 3 + k; z <= C + 3 - k; z++) g.set(x, H + 5 + k, z, 'red_concrete');
  // pomost
  for (let x = C + 6; x <= C + 12; x++) for (const z of [C - 1, C, C + 1]) g.set(x, 1, z, 'spruce_planks');
  return g.list();
}

// ---------- Farma ze stodołą ----------
function farm() {
  const g = new Grid(), W = 12, D = 16, Hw = 6;
  for (let x = -14; x <= W + 10; x++) for (let z = -6; z <= D + 6; z++) g.set(x, 0, z, 'grass');
  for (let y = 1; y <= Hw; y++) for (let x = 0; x <= W; x++) for (let z = 0; z <= D; z++) {
    const edge = x === 0 || x === W || z === 0 || z === D; if (!edge) continue;
    const corner = (x === 0 || x === W) && (z === 0 || z === D);
    g.set(x, y, z, corner ? 'spruce_log' : y === Hw ? 'spruce_planks' : 'red_concrete');
  }
  for (let y = 1; y <= 4; y++) for (let x = W / 2 - 2; x <= W / 2 + 2; x++) g.del(x, y, 0);
  for (let y = 1; y <= 4; y++) for (const x of [W / 2 - 2, W / 2 + 2]) g.set(x, y, -1, 'white_concrete');
  for (let k = 0; k <= W / 2; k++) for (let z = -1; z <= D + 1; z++) { g.set(k, Hw + 1 + k, z, 'dark_log'); g.set(W - k, Hw + 1 + k, z, 'dark_log'); }
  for (let k = 1; k < W / 2; k++) for (let x = k + 1; x < W - k; x++) for (const z of [0, D]) g.set(x, Hw + k, z, 'red_concrete');
  for (let x = 2; x <= 4; x++) for (let z = 10; z <= 14; z++) for (let y = 1; y <= 2; y++) g.set(x, y, z, 'hay');
  // pola: dynie i siano, ogrodzenie z pni
  for (let x = -13; x <= -2; x++) for (let z = -4; z <= D + 4; z++) {
    if (x === -13 || x === -2 || z === -4 || z === D + 4) { if ((x + z) % 2 === 0) g.set(x, 1, z, 'spruce_log'); }
    else if (x % 3 === 0) g.set(x, 0, z, 'water'); else g.set(x, 1, z, x % 3 === 1 ? 'pumpkin' : 'hay');
  }
  return g.list();
}

// ---------- Rakieta na wyrzutni ----------
function rocket() {
  const g = new Grid(), C = 10, H = 38;
  for (let x = 0; x <= 20; x++) for (let z = 0; z <= 20; z++) g.set(x, 0, z, (x + z) % 2 ? 'gray_concrete' : 'smooth_stone');
  for (let x = 0; x <= 20; x++) for (const z of [0, 20]) g.set(x, 0, z, 'yellow_concrete');
  for (let y = 1; y <= H; y++) {
    const rad = y > H - 8 ? 3.2 * (H - y + 1) / 9 : 3.2;
    for (let x = 0; x <= 20; x++) for (let z = 0; z <= 20; z++) if (ring(x, z, C, C, rad, 1.3)) {
      const win = (y === 22 || y === 23) && z === C - 3 && x === C;
      g.set(x, y, z, win ? 'glass' : y > H - 8 ? 'red_concrete' : y % 10 === 5 ? 'gray_concrete' : 'white_concrete');
    }
  }
  // stateczniki i silniki
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 0; k <= 5; k++) for (let y = 1; y <= 8 - k; y++) g.set(C + dx * (3 + k), y + 2, C + dz * (3 + k), 'red_concrete');
  for (let x = C - 2; x <= C + 2; x++) for (let z = C - 2; z <= C + 2; z++) if (Math.hypot(x - C, z - C) < 2.3) g.set(x, 1, z, 'lantern');
  // wieża serwisowa
  for (let y = 1; y <= H - 6; y++) for (const [x, z] of [[C + 7, C - 1], [C + 7, C + 1], [C + 9, C - 1], [C + 9, C + 1]]) g.set(x, y, z, 'iron');
  for (let y = 6; y <= H - 6; y += 8) for (let x = C + 4; x <= C + 9; x++) g.set(x, y, C, 'gray_concrete');
  g.set(C + 8, H - 5, C, 'redstone');
  return g.list();
}

// ---------- Wieżowiec ----------
function skyscraper() {
  const g = new Grid(), S = 10, H = 44;
  for (let x = -4; x <= S + 4; x++) for (let z = -4; z <= S + 4; z++) g.set(x, 0, z, (x === -4 || z === -4 || x === S + 4 || z === S + 4) ? 'gray_concrete' : 'smooth_stone');
  for (let y = 1; y <= H; y++) { const inset = y > 32 ? 2 : y > 20 ? 1 : 0; for (let x = inset; x <= S - inset; x++) for (let z = inset; z <= S - inset; z++) {
    const edge = x === inset || x === S - inset || z === inset || z === S - inset, corner = (x === inset || x === S - inset) && (z === inset || z === S - inset);
    if (y % 4 === 0) g.set(x, y, z, edge ? 'gray_concrete' : 'smooth_stone');
    else if (edge) g.set(x, y, z, corner ? 'gray_concrete' : 'glass');
  } }
  for (let y = 1; y <= 3; y++) g.del(S / 2, y, 0);
  for (let y = H + 1; y <= H + 8; y++) g.set(S / 2, y, S / 2, 'iron');
  g.set(S / 2, H + 9, S / 2, 'redstone');
  for (const [x, z] of [[2, 2], [S - 2, 2], [2, S - 2], [S - 2, S - 2]]) g.set(x, H + 1, z, 'lantern');
  for (let y = 4; y <= H; y += 8) for (let x = 0; x <= S; x++) g.set(x, y, -1, 'blue_concrete');
  return g.list();
}

// ---------- Ołtarz serc (LifeSteal) ----------
function heartAltar() {
  const g = new Grid(), C = 12;
  const heart = ['..XXX...XXX..', '.XXXXX.XXXXX.', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', '.XXXXXXXXXXX.', '..XXXXXXXXX..', '...XXXXXXX...', '....XXXXX....', '.....XXX.....', '......X......'];
  for (let x = 0; x <= 24; x++) for (let z = 0; z <= 24; z++) { const d = Math.hypot(x - C, z - C); if (d <= 12) g.set(x, 0, z, d > 10.5 ? 'stone_bricks' : 'black_concrete'); if (d <= 7 && d > 6) g.set(x, 1, z, 'stone_bricks'); if (d <= 6) g.set(x, 1, z, 'smooth_stone'); }
  // pionowe serce z czerwonego betonu
  heart.forEach((row, j) => [...row].forEach((c, i) => { if (c === 'X') { const y = 4 + heart.length - j; g.set(C - 6 + i, y, C, (j < 3 && (i === 2 || i === 3)) ? 'white_concrete' : 'red_concrete'); g.set(C - 6 + i, y, C + 1, 'redstone'); } }));
  for (let y = 2; y <= 4; y++) for (let x = C - 1; x <= C + 1; x++) g.set(x, y, C, 'obsidian');
  // cztery kolumny ze światłem i schody w górę
  for (const [x, z] of [[C - 8, C - 8], [C + 8, C - 8], [C - 8, C + 8], [C + 8, C + 8]]) { for (let y = 1; y <= 9; y++) g.set(x, y, z, y === 9 ? 'glowstone' : 'stone_bricks'); }
  for (let k = 0; k <= 3; k++) for (let x = C - 2; x <= C + 2; x++) g.set(x, 1, C - 11 + k, k ? 'stone_bricks' : 'smooth_stone');
  return g.list();
}

// ---------- Spawn z bazarem (LifeSteal) ----------
function spawnHub() {
  const g = new Grid(), r = rng(83), C = 18;
  for (let x = 0; x <= 36; x++) for (let z = 0; z <= 36; z++) { const d = Math.hypot(x - C, z - C); if (d <= 18) g.set(x, 0, z, d < 4 ? 'quartz' : (x + z) % 3 ? 'stone_bricks' : 'smooth_stone'); }
  // fontanna
  for (let x = 0; x <= 36; x++) for (let z = 0; z <= 36; z++) { const d = Math.hypot(x - C, z - C); if (d <= 3.5 && d > 2.5) g.set(x, 1, z, 'quartz'); if (d <= 2.5) g.set(x, 1, z, 'water'); }
  for (let y = 1; y <= 5; y++) g.set(C, y, C, y === 5 ? 'lantern' : 'quartz');
  // osiem straganów dookoła
  const roofs = ['red_concrete', 'yellow_concrete', 'blue_concrete', 'white_concrete'];
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, sx = Math.round(C + Math.cos(a) * 12), sz = Math.round(C + Math.sin(a) * 12), roof = roofs[i % 4];
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let y = 1; y <= 3; y++) g.set(sx + dx, y, sz + dz, 'spruce_log');
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) g.set(sx + dx, 4, sz + dz, (dx + dz) % 2 ? roof : 'white_wool');
    for (let dx = -1; dx <= 1; dx++) g.set(sx + dx, 1, sz, i % 2 ? 'spruce_planks' : 'oak_planks');
    g.set(sx, 2, sz, ['pumpkin', 'hay', 'gold', 'emerald'][i % 4]);
  }
  // brama spawnu i latarnie na obwodzie
  for (let y = 1; y <= 8; y++) for (const x of [C - 3, C + 3]) g.set(x, y, 0, 'stone_bricks');
  for (let x = C - 3; x <= C + 3; x++) g.set(x, 9, 0, 'stone_bricks');
  g.set(C, 8, 0, 'lantern');
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, x = Math.round(C + Math.cos(a) * 17), z = Math.round(C + Math.sin(a) * 17); if (Math.abs(x - C) <= 4 && z < 4) continue; g.set(x, 1, z, 'stone_bricks'); g.set(x, 2, z, 'lantern'); }
  return g.list();
}

export const KATEGORIE = [
  { id: 'sredniowiecze', name: 'Średniowiecze' },
  { id: 'natura', name: 'Natura' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'przetrwanie', name: 'Przetrwanie' },
  { id: 'miasto', name: 'Miasto i kosmos' },
  { id: 'lifesteal', name: 'LifeSteal' },
];

export const BUILDS = [
  { id: 'wyspa', kat: 'fantasy', name: 'Latająca wyspa z portalem', short: 'Wyspa', desc: 'Wyspa wisi w powietrzu, ma portal i drzewo. Od spodu zwisają latarnie. Najlepiej ją postawić nad oceanem albo na spawnie.', make: island },
  { id: 'miecz', kat: 'fantasy', name: 'Gigantyczny miecz w skale', short: 'Miecz', desc: 'Miecz ma prawie 50 bloków wysokości i diamentowy środek ostrza. Widać go z daleka.', make: sword },
  { id: 'wieza', kat: 'sredniowiecze', name: 'Wieża Smoka', short: 'Wieża', desc: 'Okrągła wieża ze spiralnym balkonem, koroną z blankami i fioletowym dachem.', make: tower },
  { id: 'smok', kat: 'fantasy', name: 'Smok oplatający górę', short: 'Smok', desc: 'Zielony smok owija się dwa razy wokół ośnieżonej góry. Na szczycie ma głowę z rogami, skrzydłami i ogniem.', make: dragon },
  { id: 'wulkan', kat: 'natura', name: 'Wulkan z lawą', short: 'Wulkan', desc: 'Stożek z kraterem pełnym lawy. Trzy rzeki lawy spływają po zboczach, a nad kraterem unosi się dym.', make: volcano },
  { id: 'statek', kat: 'natura', name: 'Statek na wodospadzie', short: 'Statek', desc: 'Statek z żaglami przechyla się nad krawędzią klifu, a obok spada wodospad.', make: ship },
  { id: 'zamek', kat: 'sredniowiecze', name: 'Zamek z mostem zwodzonym', short: 'Zamek', desc: 'Mury z blankami, cztery wieże, donżon z chorągwią, fosa i opuszczony most na łańcuchach.', make: castle },
  { id: 'arena', kat: 'lifesteal', name: 'Arena LifeSteal', short: 'Arena', desc: 'Arena na pojedynki z trybunami i czterema bramami. Na środku jest serce z czerwonego betonu.', make: arena },
  { id: 'wiatrak', kat: 'sredniowiecze', name: 'Wiatrak przy polu dyń', short: 'Wiatrak', desc: 'Ceglany wiatrak z czterema skrzydłami z płótna. Wokół pole dyń i snopki siana.', make: windmill },
  { id: 'straznica', kat: 'sredniowiecze', name: 'Wieża strażnicza', short: 'Strażnica', desc: 'Kamienny dół, drewniana góra i platforma z balustradą. Dobra przy bramie albo na granicy bazy.', make: watchtower },
  { id: 'drzewo', kat: 'natura', name: 'Wielkie drzewo', short: 'Drzewo', desc: 'Gruby pień z korzeniami, pięć konarów i kule liści. Między liśćmi świecą owoce z jasnogłazu.', make: bigTree },
  { id: 'krysztaly', kat: 'natura', name: 'Jaskinia kryształów', short: 'Kryształy', desc: 'Kamienna kopuła z wejściem. W środku rosną kryształy z ametystu, a obok jest podziemne jeziorko.', make: crystalCave },
  { id: 'portal', kat: 'fantasy', name: 'Portal do innego świata', short: 'Portal', desc: 'Okrągły portal z purpuru i obsydianu na wyspie z kamienia Kresu. Dookoła latają odłamki skał.', make: endPortal },
  { id: 'domek', kat: 'przetrwanie', name: 'Domek na drzewie', short: 'Domek', desc: 'Domek z tarasem na wysokości 11 bloków. Na górę prowadzą stopnie z desek przy pniu.', make: treeHouse },
  { id: 'latarnia', kat: 'przetrwanie', name: 'Latarnia morska', short: 'Latarnia', desc: 'Biało-czerwona wieża na skalistej wysepce, ze świecącą kopułą i drewnianym pomostem.', make: lighthouse },
  { id: 'farma', kat: 'przetrwanie', name: 'Farma ze stodołą', short: 'Farma', desc: 'Czerwona stodoła z dwuspadowym dachem i sianem w środku. Obok pole z dyniami i kanałami wody.', make: farm },
  { id: 'rakieta', kat: 'miasto', name: 'Rakieta na wyrzutni', short: 'Rakieta', desc: 'Biała rakieta z czerwonym czubkiem i statecznikami. Obok stoi żelazna wieża serwisowa.', make: rocket },
  { id: 'wiezowiec', kat: 'miasto', name: 'Wieżowiec', short: 'Wieżowiec', desc: 'Szklany wieżowiec na 44 bloki, coraz węższy u góry, z anteną i czerwonym światłem.', make: skyscraper },
  { id: 'oltarz', kat: 'lifesteal', name: 'Ołtarz serc', short: 'Ołtarz', desc: 'Wielkie serce z czerwonego betonu stoi na obsydianie. Pasuje na spawn serwera LifeSteal.', make: heartAltar },
  { id: 'bazar', kat: 'lifesteal', name: 'Spawn z bazarem', short: 'Bazar', desc: 'Okrągły plac z fontanną, ośmioma straganami i bramą. Miejsce na sklep i spotkania graczy.', make: spawnHub },
];

const cache = {};
export function getBuild(id) {
  const b = BUILDS.find(b => b.id === id) || BUILDS[0];
  if (!cache[b.id]) cache[b.id] = { ...b, ...b.make() };
  return cache[b.id];
}
