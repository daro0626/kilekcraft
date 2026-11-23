// =========================================================
// KILEKCRAFT — generator komnat-wyzwań (parkour i labirynt).
// Wynik: { blocks:[[x,y,z,typ]], size, info }.
// Ten sam kod + ziarno = zawsze ta sama komnata.
// Odległości skoków są ostrożne, ale trzeba je sprawdzić w grze
// (docs/ZADANIA.md, zadanie A4).
// =========================================================

export const THEMES = {
  kamien: { name: 'Kamienna twierdza', plat: 'stone_bricks', alt: 'smooth_stone', wall: 'stone_bricks', floor: 'cobble', danger: 'lava', light: 'lantern' },
  nether: { name: 'Nether', plat: 'obsidian', alt: 'red_concrete', wall: 'obsidian', floor: 'black_concrete', danger: 'lava', light: 'lantern' },
  lod: { name: 'Lodowa kraina', plat: 'quartz', alt: 'blue_concrete', wall: 'white_wool', floor: 'blue_concrete', danger: 'lava', light: 'lantern' },
  neon: { name: 'Neon', plat: 'black_concrete', alt: 'amethyst', wall: 'black_concrete', floor: 'black_concrete', danger: 'lava', light: 'lantern' },
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

class G {
  constructor() { this.m = new Map(); }
  set(x, y, z, t) { this.m.set(x + ',' + y + ',' + z, [x, y, z, t]); }
  has(x, y, z) { return this.m.has(x + ',' + y + ',' + z); }
  out() {
    const a = [...this.m.values()];
    let mx = Infinity, my = Infinity, mz = Infinity, Mx = -Infinity, My = -Infinity, Mz = -Infinity;
    for (const [x, y, z] of a) { mx = Math.min(mx, x); my = Math.min(my, y); mz = Math.min(mz, z); Mx = Math.max(Mx, x); My = Math.max(My, y); Mz = Math.max(Mz, z); }
    return { blocks: a.map(([x, y, z, t]) => [x - mx, y - my, z - mz, t]), size: [Mx - mx + 1, My - my + 1, Mz - mz + 1] };
  }
}

// ---------- parkour ----------
function parkour(diff, theme, seed) {
  const R = rng(seed), T = THEMES[theme], g = new G();
  const jumps = 10 + diff * 3;
  const plat = (x, y, z, w, d, t) => { for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) g.set(x + i, y, z + k, t); };
  // zasady skoków zależne od trudności
  const maxFlat = diff >= 10 ? 3 : diff >= 4 ? 3 : 2;       // przerwa (puste bloki) przy skoku płaskim
  const maxUp = diff >= 7 ? 2 : 1;                           // przerwa przy skoku o 1 w górę
  const size = diff <= 3 ? 2 : diff <= 6 ? (R() < .5 ? 2 : 1) : 1;
  let x = 0, y = 2, z = 0, dirZ = 0, prevW = 1;
  plat(-2, y, -1, 3, 3, T.alt); g.set(-1, y, 0, 'gold'); // start (złoty środek)
  const path = [];
  for (let j = 0; j < jumps; j++) {
    const up = diff >= 3 && R() < .35 ? 1 : (diff >= 5 && R() < .2 ? -1 : 0);
    const maxGap = up === 1 ? maxUp : up === -1 ? Math.min(3, maxFlat + 1) : maxFlat;
    const minGap = diff <= 2 ? 1 : Math.max(1, maxGap - 1);
    const gap = minGap + Math.floor(R() * (maxGap - minGap + 1));
    // skręt w bok co jakiś czas
    if (R() < .45) dirZ = Math.max(-1, Math.min(1, dirZ + (R() < .5 ? -1 : 1)));
    if (Math.abs(z) > 7 && Math.sign(dirZ) === Math.sign(z)) dirZ = 0;
    const sideways = dirZ !== 0 && R() < .6;
    const w = j % 8 === 7 ? 2 : (diff <= 6 ? size : 1);
    if (sideways) { z = dirZ > 0 ? z + prevW + gap : z - gap - w; } else { x += prevW + gap; }
    prevW = w;
    y = Math.max(2, y + up);
    const cp = j % 8 === 7; // punkt kontrolny co 8 skoków
    plat(x, y, z, w, w, cp ? 'emerald' : (R() < .5 ? T.plat : T.alt));
    if (cp) g.set(x, y + 1, z, 'lantern');
    path.push([x, y, z]);
  }
  // meta
  x += prevW + 1; plat(x, y, z - 1, 3, 3, 'diamond'); g.set(x + 1, y + 1, z, 'lantern');
  // dno: lawa przy trudności 5+, wcześniej bezpieczna podłoga
  const pts = [...g.m.values()];
  const minX = Math.min(...pts.map(p => p[0])) - 1, maxX = Math.max(...pts.map(p => p[0])) + 1;
  const minZ = Math.min(...pts.map(p => p[2])) - 1, maxZ = Math.max(...pts.map(p => p[2])) + 1;
  const floor = diff >= 5 ? T.danger : T.floor;
  for (let a = minX; a <= maxX; a++) for (let b = minZ; b <= maxZ; b++) g.set(a, 0, b, floor);
  // obramowanie areny
  for (let a = minX - 1; a <= maxX + 1; a++) for (const b of [minZ - 1, maxZ + 1]) for (let h = 0; h <= 1; h++) g.set(a, h, b, T.wall);
  for (let b = minZ - 1; b <= maxZ + 1; b++) for (const a of [minX - 1, maxX + 1]) for (let h = 0; h <= 1; h++) g.set(a, h, b, T.wall);
  const o = g.out();
  return { ...o, info: { skoki: jumps, punkty: Math.floor(jumps / 8), dno: floor === 'lava' ? 'lawa' : 'podłoga' } };
}

// ---------- labirynt ----------
function maze(diff, theme, seed) {
  const R = rng(seed), T = THEMES[theme], g = new G();
  const n = 5 + diff * 2; // komórki
  const W = n * 2 + 1, H = diff >= 7 ? 4 : 3;
  const wall = Array.from({ length: W }, () => Array(W).fill(true));
  const stack = [[0, 0]]; const seen = new Set(['0,0']); wall[1][1] = false;
  while (stack.length) {
    const [cx, cz] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => [cx + dx, cz + dz, dx, dz]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen.has(a + ',' + b));
    if (!nb.length) { stack.pop(); continue; }
    const [a, b, dx, dz] = nb[Math.floor(R() * nb.length)];
    wall[cx * 2 + 1 + dx][cz * 2 + 1 + dz] = false; wall[a * 2 + 1][b * 2 + 1] = false;
    seen.add(a + ',' + b); stack.push([a, b]);
  }
  // przy trudnych dodatkowe przejścia psują proste ściany i mylą drogę
  const loops = diff >= 6 ? Math.floor(n * (diff - 5) * .6) : 0;
  for (let i = 0; i < loops; i++) { const a = 1 + Math.floor(R() * (W - 2)), b = 1 + Math.floor(R() * (W - 2)); if ((a + b) % 2 === 1) wall[a][b] = false; }
  wall[0][1] = false; wall[W - 1][W - 2] = false; // wejście i wyjście
  for (let x = 0; x < W; x++) for (let z = 0; z < W; z++) {
    g.set(x, 0, z, T.floor);
    if (wall[x][z]) for (let h = 1; h <= H; h++) g.set(x, h, z, h === H && (x + z) % 6 === 0 ? T.light : T.wall);
  }
  g.set(0, 0, 1, 'emerald'); g.set(W - 1, 0, W - 2, 'diamond'); g.set(W - 1, 1, W - 2, 'lantern');
  return { ...g.out(), info: { komorki: n * n, wysokosc: H } };
}

export function generate({ type, diff, theme, seed }) {
  return type === 'labirynt' ? maze(diff, theme, seed) : parkour(diff, theme, seed);
}

// Kod komnaty: P7-K-48213 → typ, trudność, motyw, ziarno
const TCODE = { kamien: 'K', nether: 'N', lod: 'L', neon: 'E' };
export function encode({ type, diff, theme, seed }) { return `${type === 'labirynt' ? 'L' : 'P'}${diff}-${TCODE[theme]}-${seed}`; }
export function decode(code) {
  const m = /^([PL])(10|[1-9])-([KNLE])-(\d{1,9})$/i.exec((code || '').trim());
  if (!m) return null;
  const theme = Object.keys(TCODE).find(k => TCODE[k] === m[3].toUpperCase());
  return { type: m[1].toUpperCase() === 'L' ? 'labirynt' : 'parkour', diff: +m[2], theme, seed: +m[4] };
}
