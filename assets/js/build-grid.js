// Deterministyczny generator losowy — budowla zawsze wygląda tak samo.
export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Grid {
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
