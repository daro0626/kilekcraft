// =========================================================
// KILEKCRAFT — wspólne zachowania wszystkich stron.
// Animacje liter, ujawnianie przy przewijaniu, kopiowanie, XP.
// =========================================================
document.documentElement.classList.add('js');
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// bezpieczny localStorage (w niektórych widokach rzuca wyjątek)
export const store = {
  get(k, d = null) { try { const v = localStorage.getItem('kc:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kc:' + k, JSON.stringify(v)); } catch { /* brak pamięci — trudno */ } },
};

// menu na telefonie
const mb = document.querySelector('.menu-btn'), nav = document.querySelector('.nav');
if (mb && nav) mb.addEventListener('click', () => { const o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });

// ---------- rozbijanie tekstu na litery ----------
export function split(el) {
  if (el.dataset.split) return;
  el.dataset.split = 1;
  const text = el.textContent; el.setAttribute('aria-label', text);
  el.textContent = '';
  let i = 0;
  text.split(/(\s+)/).forEach(part => {
    if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(' ')); return; }
    const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
    for (const ch of part) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.setProperty('--i', i++); w.appendChild(s); }
    el.appendChild(w);
  });
  el.classList.add('split');
}

const io = new IntersectionObserver((ents) => {
  for (const e of ents) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-anim]').forEach(el => { split(el); io.observe(el); });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---------- pas liter przesuwany przewijaniem ----------
const rows = [...document.querySelectorAll('.marquee .row')];
if (rows.length && !reduced) {
  let ticking = false;
  const upd = () => {
    const y = scrollY;
    rows.forEach((r, i) => { const dir = i % 2 ? 1 : -1; r.style.transform = `translateX(${(dir * y * .35) % 2000 - (i % 2 ? 900 : 0)}px)`; });
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
}

// ---------- tablica split-flap ----------
const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZĄĆĘŁŃÓŚŹŻ0123456789.→·:+-ZŁ€';
export function flapBoard(el, messages, every = 4200) {
  const len = Math.max(...messages.map(m => m.length));
  el.innerHTML = ''; el.style.setProperty('--n', len);
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  const cells = [...Array(len)].map(() => { const c = document.createElement('span'); c.className = 'c'; c.setAttribute('aria-hidden', 'true'); el.appendChild(c); return c; });
  const sr = document.createElement('span'); sr.className = 'sr'; el.appendChild(sr);
  let idx = 0;
  function show(msg) {
    msg = msg.toUpperCase().padEnd(len, ' '); sr.textContent = msg.trim();
    cells.forEach((c, i) => {
      const target = msg[i];
      c.classList.toggle('sp', target === ' ');
      if (reduced) { c.textContent = target; return; }
      let steps = 4 + Math.floor(Math.random() * 6) + i % 5;
      const tick = () => {
        if (steps-- <= 0) { c.textContent = target; return; }
        c.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
        c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
        setTimeout(tick, 55);
      };
      setTimeout(tick, i * 22);
    });
  }
  show(messages[0]);
  if (messages.length > 1) setInterval(() => { if (!document.hidden) show(messages[++idx % messages.length]); }, every);
}

// ---------- toast, kopiowanie, XP ----------
let toastEl;
export function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

export function xpBurst(x, y, n = 14) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const o = document.createElement('span'); o.className = 'xp'; document.body.appendChild(o);
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
    o.animate([
      { transform: `translate(${x}px,${y}px) scale(.4)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(a) * d}px,${y + Math.sin(a) * d - 40}px) scale(1)`, opacity: 1, offset: .55 },
      { transform: `translate(${x + Math.cos(a) * d * .6}px,${y + 60}px) scale(.3)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => o.remove();
  }
}

export async function copyText(text, btn) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = 0; document.body.appendChild(t); t.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; } t.remove();
  }
  if (btn) { const r = btn.getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2); }
  toast(ok ? 'Skopiowane! Wklej w czacie gry (T).' : 'Nie udało się skopiować. Zaznacz tekst ręcznie.');
  return ok;
}

// rok w stopce
document.querySelectorAll('[data-year]').forEach(e => (e.textContent = new Date().getFullYear()));
