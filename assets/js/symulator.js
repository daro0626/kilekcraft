// =========================================================
// KILEKCRAFT — symulator LifeSteal: arena, wykres, wnioski.
// =========================================================
import { store, reduced, award, badge } from './core.js';
import { DEFAULTS, simulate, analyze } from './lifesteal-sim.js';

const $ = (s) => document.querySelector(s);
const form = $('#form');
let P = { ...DEFAULTS, ...(store.get('sim') || {}) };
const fmt = (k, v) => k === 'umiejetnosci' ? v + '%' : k === 'cena' ? (v ? v.toLocaleString('pl-PL') + ' $' : 'brak') : k === 'dochod' ? v.toLocaleString('pl-PL') + ' $' : k === 'odrodzenie' ? (v ? 'co ' + v : 'brak') : String(v).replace('.', ',');

function toForm() {
  for (const [k, v] of Object.entries(P)) {
    const el = form.elements[k]; if (!el) continue;
    if (el instanceof RadioNodeList) el.value = v; else if (el.type === 'checkbox') el.checked = v; else el.value = v;
  }
  labels();
}
function fromForm() {
  const n = (k) => +form.elements[k].value;
  P = { gracze: n('gracze'), start: n('start'), max: Math.max(n('max'), n('start')), walki: n('walki'), umiejetnosci: n('umiejetnosci'),
    sercaPomagaja: form.elements.sercaPomagaja.checked, zero: form.elements.zero.value, powrot: n('powrot'), odrodzenie: n('odrodzenie'),
    cena: n('cena'), dochod: n('dochod'), dni: 14 };
  store.set('sim', P);
}
function labels() {
  form.querySelectorAll('[data-v]').forEach(b => { b.textContent = fmt(b.dataset.v, P[b.dataset.v]); });
  $('#powrotRow').hidden = P.zero !== 'powrot';
}

// ---------- arena ----------
const cv = $('#arena'), cx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1;
function size() { dpr = Math.min(devicePixelRatio || 1, 2); const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
const COLORS = ['#ff6b6b', '#ffc94a', '#2ee59d', '#5cc8ff', '#a06bff', '#ff8fd8', '#ff9d2e', '#8cff6b', '#7aa2ff', '#e0e6f2'];
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function heart(x, y, s, col) { cx.fillStyle = col; HEART.forEach((row, j) => [...row].forEach((c, i) => { if (c === 'X') cx.fillRect(x + i * s, y + j * s, s, s); })); }
function seatOf(i, n) {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2, rx = W * .38, ry = H * .33;
  return { x: W / 2 + Math.cos(a) * rx, y: H / 2 + 10 + Math.sin(a) * ry };
}
let shown = null, frame = 0, fx = [];
function drawArena(snap) {
  if (!shown) return;
  cx.clearRect(0, 0, W, H);
  // podłoga areny
  const g = cx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * .5); g.addColorStop(0, 'rgba(255,61,61,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  heart(W / 2 - 28, H / 2 - 18, 8, 'rgba(255,61,61,.18)');
  const n = shown.players.length, s = Math.max(14, Math.min(30, W / (n * 1.6)));
  const top = snap.reduce((b, x, i) => x.a && x.h > (snap[b]?.h ?? -1) ? i : b, 0);
  shown.players.forEach((pl, i) => {
    const st = snap[i], p = seatOf(i, n), col = COLORS[i % COLORS.length];
    cx.globalAlpha = st.a ? 1 : .28;
    // ludzik
    cx.fillStyle = col; cx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    cx.fillStyle = 'rgba(0,0,0,.28)'; cx.fillRect(p.x - s / 2, p.y + s / 2 - s * .18, s, s * .18);
    cx.fillStyle = '#10182c'; cx.fillRect(p.x - s * .28, p.y - s * .12, s * .16, s * .16); cx.fillRect(p.x + s * .12, p.y - s * .12, s * .16, s * .16);
    if (i === top && st.a) { cx.fillStyle = '#ffc94a'; const cw = s * .8; cx.beginPath(); cx.moveTo(p.x - cw / 2, p.y - s / 2 - 2); cx.lineTo(p.x - cw / 2, p.y - s / 2 - 12); cx.lineTo(p.x - cw / 4, p.y - s / 2 - 6); cx.lineTo(p.x, p.y - s / 2 - 14); cx.lineTo(p.x + cw / 4, p.y - s / 2 - 6); cx.lineTo(p.x + cw / 2, p.y - s / 2 - 12); cx.lineTo(p.x + cw / 2, p.y - s / 2 - 2); cx.fill(); }
    // podpis i serca
    cx.font = `700 ${Math.max(10, s * .45)}px Atkinson, system-ui`; cx.textAlign = 'center'; cx.fillStyle = '#eaf0fb';
    cx.fillText(pl.nick, p.x, p.y + s / 2 + Math.max(11, s * .5));
    if (st.a) { heart(p.x - s * .55, p.y + s / 2 + Math.max(15, s * .62), Math.max(1.4, s / 14), '#ff3d3d'); cx.textAlign = 'left'; cx.fillText(st.h, p.x - s * .55 + Math.max(1.4, s / 14) * 8 + 3, p.y + s / 2 + Math.max(24, s * .95)); }
    else { cx.strokeStyle = '#ff3d3d'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(p.x - s / 2, p.y - s / 2); cx.lineTo(p.x + s / 2, p.y + s / 2); cx.moveTo(p.x + s / 2, p.y - s / 2); cx.lineTo(p.x - s / 2, p.y + s / 2); cx.stroke(); }
    cx.globalAlpha = 1;
  });
  // efekty walk
  const now = performance.now();
  fx = fx.filter(f => now - f.t0 < f.dur);
  for (const f of fx) {
    const t = (now - f.t0) / f.dur, a = seatOf(f.w, n), b = seatOf(f.l, n);
    if (t < .35) { cx.strokeStyle = `rgba(255,255,255,${.7 - t})`; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
    const k = Math.min(1, Math.max(0, (t - .2) / .8)), e = k * k * (3 - 2 * k);
    const hx = b.x + (a.x - b.x) * e, hy = b.y + (a.y - b.y) * e - Math.sin(e * Math.PI) * 40;
    heart(hx - 7, hy - 6, 2, `rgba(255,61,61,${1 - k * .3})`);
    if (t < .3) { cx.fillStyle = `rgba(255,201,74,${.8 - t * 2})`; cx.fillRect(b.x - 12, b.y - 12, 24, 24); }
  }
}

// ---------- animacja przebiegu ----------
let playing = false, dayIdx = 0, timer = 0;
const feed = $('#feed');
function say(t) { const d = document.createElement('div'); d.textContent = t; feed.prepend(d); while (feed.children.length > 4) feed.lastChild.remove(); }
function showDay(i, animate) {
  const d = shown.days[i], ev = shown.events[i];
  $('#dayNum').textContent = d.day;
  if (animate && !reduced) {
    const dur = 900;
    ev.fights.slice(0, 14).forEach(([w, l], k) => fx.push({ w, l, t0: performance.now() + k * 50, dur }));
    const nick = (id) => shown.players[id].nick;
    if (ev.fights.length) { const [w, l] = ev.fights[0]; say(`${nick(w)} zabiera serce graczowi ${nick(l)}`); }
    ev.bans.forEach(id => say(`✗ ${nick(id)} traci ostatnie serce!`));
    ev.back.forEach(id => say(`↺ ${nick(id)} wraca do gry`));
    if (ev.bought.length) say(`$ Ktoś kupił serce w sklepie (${ev.bought.length}×)`);
  }
  drawArena(d.snapshot);
  chart(i);
}
function run() {
  if (playing) { stop(); return; }
  playing = true; dayIdx = 0; feed.innerHTML = ''; $('#run').textContent = '■ Zatrzymaj';
  award('sim:start', 20); badge('strateg');
  const tick = () => {
    if (!playing) return;
    showDay(dayIdx, true); dayIdx++;
    if (dayIdx >= shown.days.length) { stop(); finish(); return; }
    timer = setTimeout(tick, reduced ? 120 : 1000);
  };
  tick();
}
function stop() { playing = false; clearTimeout(timer); $('#run').textContent = '▶ Puść symulację'; }
function finish() { showDay(shown.days.length - 1, false); rank(); }
(function loop() { requestAnimationFrame(loop); if (fx.length && shown) drawArena(shown.days[Math.max(0, dayIdx - 1)].snapshot); })();

// ---------- wykres ----------
const ch = $('#chart'), cc = ch.getContext('2d');
function chart(upto = Infinity) {
  if (!shown) return;
  const r = ch.getBoundingClientRect(), w = r.width, h = r.height, d2 = Math.min(devicePixelRatio || 1, 2);
  ch.width = w * d2; ch.height = h * d2; cc.setTransform(d2, 0, 0, d2, 0, 0); cc.clearRect(0, 0, w, h);
  const L = 34, B = 22, T = 10, Rr = 10, days = shown.days, n = days.length;
  const maxY = Math.max(P.gracze, P.max);
  const X = (i) => L + (i / (n - 1)) * (w - L - Rr), Y = (v) => T + (1 - v / maxY) * (h - T - B);
  cc.strokeStyle = 'rgba(110,150,255,.15)'; cc.fillStyle = '#9daccc'; cc.font = '12px Atkinson, system-ui'; cc.textAlign = 'right';
  for (let v = 0; v <= maxY; v += Math.ceil(maxY / 4)) { cc.beginPath(); cc.moveTo(L, Y(v)); cc.lineTo(w - Rr, Y(v)); cc.stroke(); cc.fillText(v, L - 6, Y(v) + 4); }
  [0, Math.floor((n - 1) / 2), n - 1].forEach((i, k) => { cc.textAlign = ['left', 'center', 'right'][k]; cc.fillText('dz. ' + days[i].day, X(i), h - 4); });
  const line = (key, col) => {
    cc.strokeStyle = col; cc.lineWidth = 3; cc.beginPath();
    days.forEach((d, i) => { if (i > upto) return; const x = X(i), y = Y(d[key]); i ? cc.lineTo(x, y) : cc.moveTo(x, y); });
    cc.stroke();
  };
  line('active', '#2ee59d'); line('top', '#ffc94a');
}

// ---------- wnioski i ranking ----------
function kpis(a) {
  const pct = (v) => Math.round(v * 100) + '%';
  const items = [
    ['Zostaje graczy po 14 dniach', pct(a.zostaje), a.zostaje < .5 ? 'warn' : 'ok'],
    ['Pierwszy ban (średnio)', a.pierwszyBan === null ? 'brak' : 'dzień ' + a.pierwszyBan.toFixed(1).replace('.', ','), a.pierwszyBan !== null && a.pierwszyBan <= 2.5 ? 'warn' : 'ok'],
    ['Część wszystkich serc u najsilniejszego', pct(a.dominacja), a.dominacja > 2.2 / P.gracze ? 'warn' : 'ok'],
    ['Kupione serca na gracza', P.cena ? a.kupione.toFixed(1).replace('.', ',') : '—', P.cena && a.kupione > (P.max - P.start) * .3 ? 'warn' : 'ok'],
  ];
  $('#kpis').innerHTML = items.map(([k, v, s]) => `<div class="kpi ${s}"><span>${k}</span><b>${v}</b></div>`).join('');
}
function verdicts(a) {
  $('#verdicts').innerHTML = a.werdykty.map(v => `<div class="vd ${v.lvl}"><b>${v.lvl === 'ok' ? '✓' : v.lvl === 'warn' ? '!' : 'i'} ${v.t}</b><span>${v.d}</span></div>`).join('');
  if (a.zostaje > .5 && a.werdykty.every(v => v.lvl === 'ok')) badge('balans');
}
function rank() {
  const list = [...shown.players].sort((a, b) => (b.active - a.active) || b.hearts - a.hearts).slice(0, 8);
  $('#rank').innerHTML = list.map(p => `<li class="${p.active ? '' : 'out'}"><i style="background:${COLORS[p.id % COLORS.length]}"></i><b>${p.nick}</b><span>${p.active ? '♥ ' + p.hearts : 'odpadł'}</span><span class="muted">${p.kills} zab. · ${p.deaths} śm.</span></li>`).join('');
}

let tA;
function recompute() {
  stop(); fromForm(); labels();
  shown = simulate(P, 1, true);
  dayIdx = shown.days.length; fx = [];
  clearTimeout(tA); tA = setTimeout(() => { const a = analyze(P); kpis(a); verdicts(a); }, 120);
  $('#dayNum').textContent = shown.days.length; drawArena(shown.days[shown.days.length - 1].snapshot); chart(); rank();
}
form.addEventListener('input', recompute);
$('#run').addEventListener('click', () => { if (!playing) { shown = simulate(P, Math.floor(Math.random() * 1e6) + 1, true); $('#rank').innerHTML = '<li class="muted" style="display:block">Ranking pojawi się po ostatnim dniu…</li>'; } run(); });
$('#skip').addEventListener('click', () => { stop(); shown = simulate(P, Math.floor(Math.random() * 1e6) + 1, true); dayIdx = shown.days.length; finish(); award('sim:start', 20); badge('strateg'); });
$('#reset').addEventListener('click', () => { P = { ...DEFAULTS }; toForm(); recompute(); });
new ResizeObserver(() => { size(); if (shown) { drawArena(shown.days[Math.max(0, Math.min(dayIdx, shown.days.length) - 1)].snapshot); chart(playing ? dayIdx - 1 : Infinity); } }).observe(cv);

size(); toForm(); recompute();
