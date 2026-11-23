// =========================================================
// KILEKCRAFT — poziom gracza: XP, poziomy i odznaki.
// Wszystko zapisuje się tylko w tej przeglądarce (localStorage).
// Użycie: import { award, bump } from './xp.js'
//   award('klucz', 20)            → +20 XP tylko raz dla tego klucza
//   award('klucz', 5, {once:false}) → za każdym razem
//   badge('id')                   → odblokuj odznakę
// =========================================================
import { sfx } from './sfx.js';
const KEY = 'kc:xp';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const BADGES = [
  { id: 'start', name: 'Pierwszy krok', desc: 'Zaznacz pierwszy krok w szortach', ico: '▶' },
  { id: 'serwerowiec', name: 'Serwerowiec', desc: 'Ukończ wszystkie 9 szortów', ico: '◆' },
  { id: 'doradca', name: 'Rozsądny admin', desc: 'Sprawdź hosting w doradcy', ico: '€' },
  { id: 'komendant', name: 'Komendant', desc: 'Skopiuj komendy z 5 różnych zakładek', ico: '/' },
  { id: 'warstwa', name: 'Warstwa po warstwie', desc: 'Przejdź suwakiem przez budowlę', ico: '≡' },
  { id: 'budowniczy', name: 'Budowniczy', desc: 'Postaw 100 bloków w edytorze', ico: '■' },
  { id: 'architekt', name: 'Architekt', desc: 'Pobierz swoją budowlę na serwer', ico: '⬇' },
  { id: 'komnata', name: 'Konstruktor komnat', desc: 'Wygeneruj komnatę-wyzwanie', ico: '?' },
  { id: 'hardcore', name: 'Bez litości', desc: 'Wygeneruj komnatę o trudności 9 lub 10', ico: '☠' },
  { id: 'strateg', name: 'Strateg LifeSteal', desc: 'Przetestuj zasady w symulatorze', ico: '♥' },
  { id: 'balans', name: 'Mistrz balansu', desc: 'Ustaw zasady, przy których po 14 dniach gra ponad połowa graczy', ico: '⚖' },
  { id: 'lowca', name: 'Łowca błędów', desc: 'Zdobądź 2500 punktów w jednej grze Znajdź błąd', ico: '!' },
  { id: 'parkour', name: 'Skoczek', desc: 'Ukończ wyścig parkour w przeglądarce', ico: '↗' },
  { id: 'speedrun', name: 'Speedrunner', desc: 'Ukończ wyścig o trudności 7 lub więcej', ico: '⏱' },
  { id: 'kolo', name: 'Szczęśliwy los', desc: 'Zakręć kołem wyzwań', ico: '◎' },
  { id: 'odkrywca', name: 'Odkrywca', desc: 'Odwiedź wszystkie strony KILEKCRAFT', ico: '✦' },
];
const PAGES = ['index', 'serwer', 'hosting', 'komendy', 'budowle', 'edytor', 'komnaty', 'symulator', 'gry', 'bledy', 'parkour', 'kolo', 'motd'];

// próg XP potrzebny na dany poziom: 0, 50, 150, 300, 500, 750…
export const xpFor = (lvl) => 25 * lvl * (lvl - 1);
export const levelOf = (xp) => { let l = 1; while (xp >= xpFor(l + 1)) l++; return l; };

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
const S = Object.assign({ xp: 0, got: {}, badges: {}, count: {} }, load());
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* bez zapisu */ } }

export function bump(name) { S.count[name] = (S.count[name] || 0) + 1; save(); return S.count[name]; }
export function has(key) { return !!S.got[key]; }

export function award(key, amount, opts = {}) {
  const once = opts.once !== false;
  if (once && S.got[key]) return false;
  S.got[key] = 1;
  const before = levelOf(S.xp);
  S.xp += amount; save();
  render(); float(`+${amount} XP`, opts.from); sfx('xp');
  const after = levelOf(S.xp);
  if (after > before) levelUp(after);
  return true;
}
export function badge(id) {
  if (S.badges[id]) return;
  const b = BADGES.find(x => x.id === id); if (!b) return;
  S.badges[id] = new Date().toISOString().slice(0, 10); save();
  render(); showBadge(b);
  award('badge:' + id, 25);
}

// ---------- widżet w nagłówku ----------
let btn, bar, lvlEl, panel;
function mount() {
  const top = document.querySelector('.top .wrap'); if (!top) return;
  btn = document.createElement('button');
  btn.className = 'xp-btn'; btn.type = 'button'; btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = `<span class="xp-lvl"><b></b></span><span class="xp-bar"><i></i></span>`;
  const menu = top.querySelector('.menu-btn');
  top.insertBefore(btn, menu);
  bar = btn.querySelector('.xp-bar i'); lvlEl = btn.querySelector('.xp-lvl b');
  panel = document.createElement('div'); panel.className = 'xp-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Twój poziom i odznaki'); panel.hidden = true;
  document.body.appendChild(panel);
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) { renderPanel(); panel.querySelector('button').focus(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; btn.focus(); } });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) panel.hidden = true; });
  render();
}
function render() {
  if (!btn) return;
  const l = levelOf(S.xp), a = xpFor(l), b = xpFor(l + 1);
  lvlEl.textContent = l;
  bar.style.width = Math.round(((S.xp - a) / (b - a)) * 100) + '%';
  btn.setAttribute('aria-label', `Poziom ${l}, ${S.xp} XP. Pokaż odznaki`);
  if (panel && !panel.hidden) renderPanel();
}
function renderPanel() {
  const l = levelOf(S.xp), next = xpFor(l + 1);
  const n = Object.keys(S.badges).length;
  panel.innerHTML = `<div class="xp-head"><div class="xp-big">${l}</div><div><b>Poziom ${l}</b><span>${S.xp} XP · do następnego ${next - S.xp} XP</span><span>Odznaki: ${n} z ${BADGES.length}</span></div><button type="button" class="xp-close" aria-label="Zamknij">✕</button></div>
  <ul class="xp-badges">${BADGES.map(b => `<li class="${S.badges[b.id] ? 'on' : ''}"><i>${b.ico}</i><div><b>${b.name}</b><span>${b.desc}</span></div></li>`).join('')}</ul>
  <p class="xp-note">Postęp zapisuje się tylko w tej przeglądarce. Nikt inny go nie widzi.</p>`;
  panel.querySelector('.xp-close').addEventListener('click', () => { panel.hidden = true; btn.focus(); });
}

// ---------- efekty ----------
function float(text, from) {
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'xp-float'; el.textContent = text;
  document.body.appendChild(el);
  const sx = from ? from.x : innerWidth / 2, sy = from ? from.y : innerHeight - 120;
  if (reduced) { el.style.left = r.left + 'px'; el.style.top = (r.bottom + 6) + 'px'; setTimeout(() => el.remove(), 1200); return; }
  el.animate([
    { transform: `translate(${sx}px,${sy}px) scale(.6)`, opacity: 0 },
    { transform: `translate(${sx}px,${sy - 40}px) scale(1.15)`, opacity: 1, offset: .25 },
    { transform: `translate(${r.left + r.width / 2}px,${r.top + r.height / 2}px) scale(.5)`, opacity: .2 },
  ], { duration: 1100, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => { el.remove(); btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse'); };
}
function levelUp(l) {
  setTimeout(() => sfx('level'), 250);
  const el = document.createElement('div'); el.className = 'lvl-up'; el.setAttribute('role', 'status');
  el.innerHTML = `<span class="lu-small">Nowy poziom</span><span class="lu-big">${[...('POZIOM ' + l)].map((c, i) => `<i style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</i>`).join('')}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2200); setTimeout(() => el.remove(), 2800);
}
function showBadge(b) {
  sfx('badge');
  const el = document.createElement('div'); el.className = 'badge-pop'; el.setAttribute('role', 'status');
  el.innerHTML = `<i>${b.ico}</i><div><span>Nowa odznaka</span><b>${b.name}</b></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3000); setTimeout(() => el.remove(), 3600);
}

// ---------- odwiedziny stron ----------
function visit() {
  const p = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  if (!PAGES.includes(p)) return;
  S.count['visit:' + p] = 1; save();
  if (PAGES.every(x => S.count['visit:' + x])) badge('odkrywca');
}

mount(); visit();
