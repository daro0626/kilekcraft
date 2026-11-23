// =========================================================
// KILEKCRAFT — wielkie budowle generowane kodem.
// Każda budowla to lista bloków [x, y, z, typ]. Typy opisuje BLOCKS.
// Docelowo budowle mają też przychodzić z plików .schem z Kilek World
// (patrz docs/ZADANIA.md, zadanie B3).
// =========================================================

// Paleta: własne kolory i własne wzory tekstur (bez grafik Mojang).
// id = identyfikator bloku w grze (Java), używany na liście materiałów.
export const BLOCKS = {
  stone:        { name: 'Kamień',            id: 'minecraft:stone',         c: '#7e8189', pat: 'noise' },
  cobble:       { name: 'Bruk',              id: 'minecraft:cobblestone',   c: '#6c6f78', pat: 'cobble' },
  stone_bricks: { name: 'Kamienne cegły',    id: 'minecraft:stone_bricks',  c: '#84878f', pat: 'bricks' },
  dirt:         { name: 'Ziemia',            id: 'minecraft:dirt',          c: '#7a5434', pat: 'noise' },
  grass:        { name: 'Blok trawy',        id: 'minecraft:grass_block',   c: '#5aa83a', pat: 'grass' },
  oak_log:      { name: 'Dębowy pień',       id: 'minecraft:oak_log',       c: '#6b4f2c', pat: 'bark' },
  oak_planks:   { name: 'Dębowe deski',      id: 'minecraft:oak_planks',    c: '#b48a52', pat: 'planks' },
  leaves:       { name: 'Liście dębu',       id: 'minecraft:oak_leaves',    c: '#3f8f2c', pat: 'leaves' },
  obsidian:     { name: 'Obsydian',          id: 'minecraft:obsidian',      c: '#1d1430', pat: 'noise' },
  portal:       { name: 'Portal (zapal krzesiwem)', id: null,              c: '#a06bff', pat: 'portal', glow: true, alpha: .72, noCount: true },
  gold:         { name: 'Blok złota',        id: 'minecraft:gold_block',    c: '#f2c230', pat: 'metal' },
  iron:         { name: 'Blok żelaza',       id: 'minecraft:iron_block',    c: '#d9dde4', pat: 'metal' },
  quartz:       { name: 'Blok kwarcu',       id: 'minecraft:quartz_block',  c: '#eeeae3', pat: 'smooth' },
  diamond:      { name: 'Blok diamentu',     id: 'minecraft:diamond_block', c: '#5fe3e0', pat: 'metal', glow: true },
  lantern:      { name: 'Latarnia morska',   id: 'minecraft:sea_lantern',   c: '#cfeff0', pat: 'lantern', glow: true },
  glass:        { name: 'Szkło',             id: 'minecraft:glass',         c: '#bfe6ff', pat: 'glass', alpha: .35 },
  purpur:       { name: 'Blok purpuru',      id: 'minecraft:purpur_block',  c: '#a77bb0', pat: 'bricks' },
  amethyst:     { name: 'Blok ametystu',     id: 'minecraft:amethyst_block',c: '#8e5cd6', pat: 'noise', glow: true },
  red_concrete: { name: 'Czerwony beton',    id: 'minecraft:red_concrete',  c: '#b3262a', pat: 'smooth' },
  sand:         { name: 'Piasek',            id: 'minecraft:sand',          c: '#dccf9c', pat: 'noise' },
  smooth_stone: { name: 'Gładki kamień',     id: 'minecraft:smooth_stone',  c: '#9a9ca3', pat: 'smooth' },
  dark_log:     { name: 'Pień ciemnego dębu',id: 'minecraft:dark_oak_log',  c: '#3e2b18', pat: 'bark' },
  lava:         { name: 'Lawa',              id: 'minecraft:lava',          c: '#ff6a1a', pat: 'portal', glow: true },
  emerald:      { name: 'Blok szmaragdu',    id: 'minecraft:emerald_block', c: '#2fd66f', pat: 'metal', glow: true },
  white_wool:   { name: 'Biała wełna',       id: 'minecraft:white_wool',    c: '#e9ecef', pat: 'noise' },
  black_concrete:{ name: 'Czarny beton',     id: 'minecraft:black_concrete',c: '#1b1d24', pat: 'smooth' },
  blue_concrete:{ name: 'Niebieski beton',   id: 'minecraft:blue_concrete', c: '#2c3fa8', pat: 'smooth' },
};

// Deterministyczny generator losowy — budowla zawsze wygląda tak samo.
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Grid {
  constructor() { this.m = new Map(); }
  k(x, y, z) { return x + ',' + y + ',' + z; }
  set(x, y, z, t) { if (y < 0) return; this.m.set(this.k(x, y, z), [x, y, z, t]); }
  del(x, y, z) { this.m.delete(this.k(x, y, z)); }
  get(x, y, z) { const v = this.m.get(this.k(x, y, z)); return v ? v[3] : null; }
  list() {
    // przesunięcie, aby wszystko zaczynało się od 0,0,0
    const arr = [...this.m.values()];
    let mx = Infinity, my = Infinity, mz = Infinity, Mx = -Infinity, My = -Infinity, Mz = -Infinity;
    for (const [x, y, z] of arr) { mx = Math.min(mx, x); my = Math.min(my, y); mz = Math.min(mz, z); Mx = Math.max(Mx, x); My = Math.max(My, y); Mz = Math.max(Mz, z); }
    const blocks = arr.map(([x, y, z, t]) => [x - mx, y - my, z - mz, t]);
    return { blocks, size: [Mx - mx + 1, My - my + 1, Mz - mz + 1] };
  }
}

// ---------- 1. Latająca wyspa z portalem ----------
function island() {
  const g = new Grid(), r = rng(7), R = 14, C = 16, TOP = 22;
  const wob = [...Array(12)].map(() => r() * 2.2);
  for (let x = 0; x <= 32; x++) for (let z = 0; z <= 32; z++) {
    const dx = x - C, dz = z - C, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
    const i = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 12) % 12;
    const rr = R + wob[i] - 1.1;
    if (d > rr) continue;
    const f = 1 - d / rr;
    const depth = Math.round(Math.pow(f, 0.75) * 20 + r() * 2);
    const bump = d < rr - 3 ? Math.round(Math.sin(x * .6) * Math.cos(z * .5) * .8) : 0;
    const top = TOP + bump;
    for (let y = top - depth; y <= top; y++) {
      let t = 'stone';
      if (y === top) t = 'grass';
      else if (y >= top - 2) t = 'dirt';
      else if (r() < .18) t = 'cobble';
      g.set(x, y, z, t);
    }
  }
  // portal z obsydianu (4x5), środek wolny
  const px = 10, pz = 15, py = TOP + 1;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
    const edge = i === 0 || i === 3 || j === 0 || j === 4;
    g.set(px + i, py + j, pz, edge ? 'obsidian' : 'portal');
  }
  // drzewo
  const tx = 21, tz = 11;
  for (let y = TOP + 1; y <= TOP + 7; y++) g.set(tx, y, tz, 'oak_log');
  for (let x = -3; x <= 3; x++) for (let y = -2; y <= 3; y++) for (let z = -3; z <= 3; z++) {
    if (x * x + (y * 1.3) ** 2 + z * z <= 11 + r() * 3 && !(x === 0 && z === 0 && y < 1)) g.set(tx + x, TOP + 7 + y, tz + z, 'leaves');
  }
  // ścieżka z desek do portalu
  for (let z = pz + 1; z <= 28; z++) { if (g.get(px + 1, TOP, z) || g.get(px + 1, TOP - 1, z)) { g.set(px + 1, TOP, z, 'oak_planks'); g.set(px + 2, TOP, z, 'oak_planks'); } }
  // latarnie pod spodem
  let low = Infinity; for (const [, y] of g.m.values()) low = Math.min(low, y);
  [[C, C], [C - 5, C + 2], [C + 4, C - 4]].forEach(([x, z], n) => {
    let y = 0; while (y < TOP && !g.get(x, y, z)) y++;
    for (let k = 1; k <= 3 + n; k++) g.set(x, y - k, z, k === 3 + n ? 'lantern' : 'oak_log');
  });
  return g.list();
}

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

export const BUILDS = [
  { id: 'wyspa', name: 'Latająca wyspa z portalem', short: 'Wyspa', desc: 'Wyspa wisi w powietrzu, ma portal i drzewo. Od spodu zwisają latarnie. Najlepiej ją postawić nad oceanem albo na spawnie.', make: island },
  { id: 'miecz', name: 'Gigantyczny miecz w skale', short: 'Miecz', desc: 'Miecz ma prawie 50 bloków wysokości i diamentowy środek ostrza. Widać go z daleka.', make: sword },
  { id: 'wieza', name: 'Wieża Smoka', short: 'Wieża', desc: 'Okrągła wieża ze spiralnym balkonem, koroną z blankami i fioletowym dachem.', make: tower },
  { id: 'arena', name: 'Arena LifeSteal', short: 'Arena', desc: 'Arena na pojedynki z trybunami i czterema bramami. Na środku jest serce z czerwonego betonu.', make: arena },
];

const cache = {};
export function getBuild(id) {
  const b = BUILDS.find(b => b.id === id) || BUILDS[0];
  if (!cache[b.id]) cache[b.id] = { ...b, ...b.make() };
  return cache[b.id];
}
