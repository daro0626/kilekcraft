// =========================================================
// KILEKCRAFT — napis z bloków. Litery spadają blok po bloku,
// odbijają się, a potem reagują na kursor / palec.
// Własny font 5×7 (bez czcionki Minecrafta).
// =========================================================
import { reduced } from './core.js';

const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgb([r, g, b], f) { return `rgb(${Math.min(255, r * f) | 0},${Math.min(255, g * f) | 0},${Math.min(255, b * f) | 0})`; }

export function blockTitle(canvas, text, opts = {}) {
  const colorAt = opts.colorAt || (() => '#e6ebf5');
  const ctx = canvas.getContext('2d');
  // układ bloków
  const blocks = []; let col = 0, li = 0;
  for (const ch of text.toUpperCase()) {
    const g = G[ch] || G[' ']; const w = g[0].length;
    const base = hex(colorAt(li, ch));
    g.forEach((row, r) => [...row].forEach((v, c) => {
      if (v === '#') blocks.push({ gx: col + c, gy: r, base, var: .9 + Math.random() * .16, delay: 0, land: false, lift: 0 });
    }));
    col += w + 1; if (ch !== ' ') li++;
  }
  const cols = col - 1, rows = 7;
  blocks.sort((a, b) => (b.gy - a.gy) || (a.gx - b.gx)); // kolejność rysowania
  blocks.forEach(b => (b.delay = b.gx * 26 + (6 - b.gy) * 30 + Math.random() * 260));

  let W, H, s, d, ox, oy, dpr;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s = Math.min(W / (cols + 1.2), H / (rows + 2.4)); d = s * .42;
    ox = (W - (cols * s + d)) / 2; oy = H - rows * s - s * .5;
  }

  const parts = [];
  function dust(x, y, c) {
    if (reduced) return;
    for (let i = 0; i < 3; i++) parts.push({ x, y, vx: (Math.random() - .5) * 2.4, vy: -Math.random() * 2.2 - .5, life: 1, c, sz: s * (.12 + Math.random() * .14) });
  }

  let pointer = null;
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; pointer = { x: t.clientX - r.left, y: t.clientY - r.top }; };
  canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerleave', () => (pointer = null));
  canvas.addEventListener('pointerdown', (e) => { onMove(e); shock = { x: pointer.x, t: performance.now() }; });
  let shock = null;

  function cube(x, y, base, f, glow) {
    // przód
    ctx.fillStyle = rgb(base, f); ctx.fillRect(x, y, s, s);
    // faza (jasna góra/lewo, ciemny dół/prawo)
    const e = Math.max(1, s * .12);
    ctx.fillStyle = rgb(base, f * 1.18); ctx.fillRect(x, y, s, e); ctx.fillRect(x, y, e, s);
    ctx.fillStyle = rgb(base, f * .72); ctx.fillRect(x, y + s - e, s, e); ctx.fillRect(x + s - e, y, e, s);
    // góra
    ctx.fillStyle = rgb(base, f * 1.3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + s + d, y - d); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
    // bok
    ctx.fillStyle = rgb(base, f * .55);
    ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + s + d, y - d); ctx.lineTo(x + s + d, y + s - d); ctx.lineTo(x + s, y + s); ctx.closePath(); ctx.fill();
    if (glow) { ctx.fillStyle = `rgba(255,255,255,${glow})`; ctx.fillRect(x + e, y + e, s - 2 * e, s - 2 * e); }
  }

  const ease = (t) => { // spadek z odbiciem
    if (t < .72) return Math.pow(t / .72, 2);
    const u = (t - .72) / .28; return 1 - Math.sin(u * Math.PI) * .12 * (1 - u);
  };

  let t0 = null, raf = 0, visible = true, allLanded = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (t0 === null) t0 = now;
    const t = now - t0;
    ctx.clearRect(0, 0, W, H);
    // cień pod napisem
    const sh = ctx.createRadialGradient(W / 2, oy + rows * s + s * .3, 10, W / 2, oy + rows * s + s * .3, W * .5);
    sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.fillRect(0, oy + rows * s - s, W, s * 2.5);
    let landed = 0;
    for (const b of blocks) {
      const p = reduced ? 1 : Math.max(0, Math.min(1, (t - b.delay) / 640));
      if (p <= 0) continue;
      const tx = ox + b.gx * s, ty = oy + b.gy * s;
      let y = ty - (1 - ease(p)) * (H + s * 4);
      if (p >= 1) { landed++; if (!b.land) { b.land = true; dust(tx + s / 2, ty + s, b.base); } }
      // podnoszenie pod kursorem
      let target = 0;
      if (allLanded && pointer) { const dd = Math.hypot(pointer.x - (tx + s / 2), pointer.y - (ty + s / 2)); target = Math.max(0, 1 - dd / (s * 4.5)); }
      if (allLanded && shock) { const age = (now - shock.t) / 1000; const dist = Math.abs(shock.x - (tx + s / 2)) / s; const w = age * 30 - dist; if (w > 0 && w < 3) target += Math.sin(w / 3 * Math.PI) * 1.2; if (age > 2) shock = null; }
      b.lift += (target - b.lift) * .18;
      y -= b.lift * s * .55;
      // fala światła po złożeniu
      let f = b.var, glow = 0;
      if (allLanded && !reduced) { const wave = Math.sin(t / 650 - b.gx * .32); f *= 1 + Math.max(0, wave) * .1; glow = Math.max(0, wave - .85) * .9; }
      cube(tx, y, b.base, f, glow + b.lift * .12);
    }
    if (landed === blocks.length) allLanded = true;
    // drobinki
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i]; q.x += q.vx; q.y += q.vy; q.vy += .12; q.life -= .03;
      if (q.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = q.life; ctx.fillStyle = rgb(q.base || q.c, 1); ctx.fillRect(q.x, q.y, q.sz, q.sz); ctx.globalAlpha = 1;
    }
    if (reduced || !visible) cancelAnimationFrame(raf);
  }

  layout();
  new ResizeObserver(() => { layout(); if (reduced) requestAnimationFrame(frame); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); } }).observe(canvas);
  raf = requestAnimationFrame(frame);
}
