import { Grid, rng } from './build-grid.js';

// ---------- 1. Latająca wyspa z portalem ----------
export function island() {
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
