// =========================================================
// KILEKCRAFT — generator komnat-wyzwań (parkour i labirynt).
// Wynik: { blocks:[[x,y,z,typ]], size, info }.
// Ten sam kod + ziarno = zawsze ta sama komnata.
// Odległości skoków są ostrożne, ale trzeba je sprawdzić w grze
// (docs/ZADANIA.md, zadanie A4).
// =========================================================

export const THEMES = {
  kamien: { name: 'Kamienna twierdza', plat: 'stone_bricks', alt: 'smooth_stone', wall: 'stone_bricks', floor: 'cobble', path: 'smooth_stone', danger: 'water', light: 'lantern', rock: 'stone', cap: 'grass', gplat: ['oak_planks', 'smooth_stone'] },
  nether: { name: 'Nether', plat: 'obsidian', alt: 'red_concrete', wall: 'obsidian', floor: 'black_concrete', path: 'red_concrete', danger: 'lava', light: 'lantern', rock: 'obsidian', cap: 'red_concrete', gplat: ['quartz', 'amethyst'] },
  lod: { name: 'Lodowa kraina', plat: 'quartz', alt: 'blue_concrete', wall: 'white_wool', floor: 'blue_concrete', path: 'quartz', danger: 'water', light: 'lantern', rock: 'white_wool', cap: 'white_wool', gplat: ['blue_concrete', 'oak_planks'] },
  neon: { name: 'Neon', plat: 'black_concrete', alt: 'amethyst', wall: 'black_concrete', floor: 'black_concrete', path: 'blue_concrete', stripe: 'amethyst', danger: null, light: 'lantern', rock: 'black_concrete', cap: 'amethyst', gplat: ['quartz', 'blue_concrete'] },
};

// Rodzaje komnat: nazwa, litera w kodzie
export const KINDS = { parkour: { name: 'Parkour', code: 'P' }, gora: { name: 'Góra', code: 'G' }, labirynt: { name: 'Labirynt', code: 'L' } };
export const kindName = (type) => (KINDS[type] || KINDS.parkour).name;
// Co jest pod trasą: zależy od motywu. null = pustka (spadasz w dół).
const DNO = { lava: 'lawa', water: 'woda' };
const dnoName = (danger) => DNO[danger] || 'pustka';

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
  // dno: przy trudności 5+ woda, lawa albo pustka (zależnie od motywu), wcześniej bezpieczna podłoga
  const pts = [...g.m.values()];
  const minX = Math.min(...pts.map(p => p[0])) - 1, maxX = Math.max(...pts.map(p => p[0])) + 1;
  const minZ = Math.min(...pts.map(p => p[2])) - 1, maxZ = Math.max(...pts.map(p => p[2])) + 1;
  const danger = diff >= 5, floor = danger ? T.danger : T.floor;
  if (floor) for (let a = minX; a <= maxX; a++) for (let b = minZ; b <= maxZ; b++) g.set(a, 0, b, floor);
  // obramowanie areny
  for (let a = minX - 1; a <= maxX + 1; a++) for (const b of [minZ - 1, maxZ + 1]) for (let h = 0; h <= 1; h++) g.set(a, h, b, T.wall);
  for (let b = minZ - 1; b <= maxZ + 1; b++) for (const a of [minX - 1, maxX + 1]) for (let h = 0; h <= 1; h++) g.set(a, h, b, T.wall);
  const o = g.out();
  return { ...o, info: { skoki: jumps, punkty: Math.floor(jumps / 8), dno: danger ? dnoName(floor) : 'podłoga' } };
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
    // droga jaśniejsza od ścian, a co kilka bloków światło na szczycie muru: w labiryncie dobrze widać, gdzie iść
    g.set(x, 0, z, wall[x][z] ? T.floor : T.path);
    if (wall[x][z]) for (let h = 1; h <= H; h++) g.set(x, h, z, h === H && (x + z) % 4 === 0 ? T.light : h === 1 && T.stripe ? T.stripe : T.wall);
  }
  g.set(0, 0, 1, 'emerald'); g.set(W - 1, 0, W - 2, 'diamond'); g.set(W - 1, H + 1, W - 1, 'lantern');
  return { ...g.out(), info: { komorki: n * n, wysokosc: H } };
}

// ---------- góra: wspinaczka spiralą dookoła aż na szczyt ----------
// Zbocza mają stopnie wysokie na 3+ bloki, więc nie da się po nich wejść skokiem.
// Trasa to platformy krążące wokół góry i wznoszące się, a meta to diamentowy szczyt.
function mountain(diff, theme, seed) {
  const R = rng(seed), T = THEMES[theme], g = new G();
  const top = 16 + diff * 2;                 // szczyt: 18–36 bloków
  const base = 6 + Math.ceil(diff / 2);      // promień u podstawy: 7–11
  const rAt = (y) => Math.max(2, Math.round(base - (y - 1) * (base - 2) / (top - 1)));
  const inDisc = (x, z, r) => x * x + z * z <= r * r + r * .8;
  // tylko powierzchnia góry (środek i tak jest niewidoczny i niedostępny)
  for (let y = 1; y <= top; y++) {
    const r = rAt(y), rUp = y < top ? rAt(y + 1) : -1;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (!inDisc(x, z, r)) continue;
      const side = !inDisc(x + 1, z, r) || !inDisc(x - 1, z, r) || !inDisc(x, z + 1, r) || !inDisc(x, z - 1, r);
      const open = rUp < 0 || !inDisc(x, z, rUp);
      if (open) g.set(x, y, z, y === top ? 'diamond' : T.cap);
      else if (side) g.set(x, y, z, T.rock);
    }
  }
  const maxFlat = diff >= 4 ? 3 : 2, maxUp = diff >= 7 ? 2 : 1, pUp = .62 + diff * .02;
  const cells = (cx, cz, w) => { const a = []; const o = Math.floor(w / 2); for (let i = 0; i < w; i++) for (let k = 0; k < w; k++) a.push([cx - o + i, cz - o + k]); return a; };
  // odległość krawędzi dwóch platform w poziomie (puste bloki między nimi)
  const gapOf = (A, B) => {
    const ax = A.map(c => c[0]), az = A.map(c => c[1]), bx = B.map(c => c[0]), bz = B.map(c => c[1]);
    const gx = Math.max(0, Math.min(...bx) - Math.max(...ax) - 1, Math.min(...ax) - Math.max(...bx) - 1);
    const gz = Math.max(0, Math.min(...bz) - Math.max(...az) - 1, Math.min(...az) - Math.max(...bz) - 1);
    return Math.hypot(gx, gz);
  };
  // platforma musi mieć 4 bloki odstępu od innych platform w pionie (głowa przy skoku)
  // i wolne miejsce nad sobą, ale może wisieć nad szerszym zboczem niżej
  const placed = new Map();
  const clear = (A, y) => A.every(([x, z]) => {
    for (let d = 0; d <= 3; d++) if (g.has(x, y + d, z)) return false;
    return !(placed.get(x + ',' + z) || []).some(py => Math.abs(py - y) <= 4);
  });
  const put = (A, y, t) => { for (const [x, z] of A) { g.set(x, y, z, typeof t === 'function' ? t() : t); const k = x + ',' + z; placed.set(k, [...(placed.get(k) || []), y]); } };
  // start: złoty środek na kamiennej półce u podnóża
  let y = 2, ang = 0, rs = rAt(y) + 4;
  let prev = cells(Math.round(rs), 0, 3);
  put(prev, y, T.gplat[1]);
  g.set(Math.round(rs), y, 0, 'gold');
  let jumps = 0, cps = 0, misses = 0;
  while (y < top - 1 && jumps < 120 && misses < 200) {
    const up = R() < pUp ? 1 : 0;
    const ny = Math.min(top - 1, y + up);
    const cp = (jumps + 1) % 8 === 0;
    const w = cp || diff <= 3 ? 2 : (diff <= 6 && R() < .5 ? 2 : 1);
    const maxGap = up ? maxUp : maxFlat, want = Math.max(1, maxGap - (R() < .5 ? 1 : 0));
    const rp = rAt(ny) + 2 + w / 2;
    let best = null;
    for (let step = .5; step <= 7; step += .25) {
      const a = ang + step / rp, cand = cells(Math.round(Math.cos(a) * rp), Math.round(Math.sin(a) * rp), w);
      const gp = gapOf(prev, cand);
      if (gp < .99 || gp > maxGap + .01 || !clear(cand, ny)) continue;
      if (!best || Math.abs(gp - want) < Math.abs(best.gp - want)) best = { a, cand, gp };
      if (Math.abs(gp - want) < .3) break;
    }
    if (!best) { ang += .15; misses++; continue; }
    ang = best.a; y = ny; prev = best.cand; jumps++;
    put(prev, y, cp ? 'emerald' : T.gplat[jumps % 2]);
    if (cp) { cps++; const [lx, lz] = prev[prev.length - 1]; g.set(lx, y + 1, lz, 'lantern'); }
  }
  // kładka z ostatniej platformy na szczyt (stopień 1 w górę)
  const [px, pz] = prev[0], len = Math.hypot(px, pz);
  for (let d = len - 1; d > 1.5; d -= .5) {
    const x = Math.round(px / len * d), z = Math.round(pz / len * d);
    if (!g.has(x, top, z)) g.set(x, top, z, T.gplat[0]);
  }
  // pod spodem: woda, lawa albo pustka
  if (T.danger) for (let x = -base - 7; x <= base + 7; x++) for (let z = -base - 7; z <= base + 7; z++)
    if (inDisc(x, z, base + 7) && !inDisc(x, z, base - 1)) g.set(x, 0, z, T.danger);
  return { ...g.out(), info: { skoki: jumps, punkty: cps, dno: dnoName(T.danger), wysokosc: top } };
}

export function generate({ type, diff, theme, seed }) {
  return type === 'labirynt' ? maze(diff, theme, seed) : type === 'gora' ? mountain(diff, theme, seed) : parkour(diff, theme, seed);
}

// Kod komnaty: P7-K-48213 → typ, trudność, motyw, ziarno
const TCODE = { kamien: 'K', nether: 'N', lod: 'L', neon: 'E' };
export function encode({ type, diff, theme, seed }) { return `${(KINDS[type] || KINDS.parkour).code}${diff}-${TCODE[theme]}-${seed}`; }
export function decode(code) {
  const m = /^([PLG])(10|[1-9])-([KNLE])-(\d{1,9})$/i.exec((code || '').trim());
  if (!m) return null;
  const theme = Object.keys(TCODE).find(k => TCODE[k] === m[3].toUpperCase());
  const type = Object.keys(KINDS).find(k => KINDS[k].code === m[1].toUpperCase());
  return { type, diff: +m[2], theme, seed: +m[4] };
}
