// =========================================================
// KILEKCRAFT — gra „Znajdź błąd”.
// Pytania: data/bledy.json. Sprawdzone przez CI: data/testy.json → wyniki.bledy.
// =========================================================
import { store, reduced, award, badge, sfx, xpBurst } from './core.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = await (await fetch('data/bledy.json')).json();
let T = {}; try { const r = await fetch('data/testy.json', { cache: 'no-store' }); if (r.ok) T = await r.json(); } catch { /* brak */ }
const ver = T?.wyniki?.bledy;
let POOL = [];
if (ver && ver.zweryfikowane?.length) {
  POOL = D.pytania.filter(q => ver.zweryfikowane.includes(q.id));
  $('#vStatus').innerHTML = `<span class="badge ok">${POOL.length} pytań sprawdzonych · ${esc(ver.wersja)}</span>`;
} else $('#vStatus').innerHTML = '<span class="badge wait">pytania czekają na test</span>';

$('#start').disabled = !POOL.length;
const ROUNDS = Math.min(10, POOL.length), TIME = 15;
let qs = [], i = 0, score = 0, streak = 0, t0 = 0, raf = 0, answered = false;
let best = store.get('bledy:rekord', 0);
$('#best').textContent = best;

function shuffle(a) { for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; }

function start() {
  qs = shuffle([...POOL]).slice(0, ROUNDS); i = 0; score = 0; streak = 0;
  $('#start').hidden = true; $('#hint').hidden = true;
  show();
}
function show() {
  answered = false; const q = qs[i];
  $('#qNum').textContent = `${i + 1}/${ROUNDS}`; $('#score').textContent = score; $('#streak').textContent = '×' + (1 + Math.min(streak, 4) * .5).toString().replace('.', ',');
  $('#res').innerHTML = ''; $('#next').hidden = true;
  $('#cmd').innerHTML = q.tokeny.map((t, k) => `<button type="button" class="tok" data-k="${k}" style="--i:${k}">${esc(t)}</button>`).join('');
  $('#cmd').firstElementChild.focus();
  t0 = performance.now(); tick();
}
function tick() {
  cancelAnimationFrame(raf);
  const left = Math.max(0, TIME - (performance.now() - t0) / 1000);
  $('#timeBar').style.width = (left / TIME * 100) + '%';
  $('#timeBar').classList.toggle('low', left < 4);
  if (left <= 0) { answer(-1); return; }
  if (!answered) raf = requestAnimationFrame(tick);
}
function answer(k) {
  if (answered) return; answered = true; cancelAnimationFrame(raf);
  const q = qs[i], ok = k === q.zly;
  const left = Math.max(0, TIME - (performance.now() - t0) / 1000);
  const btns = [...$('#cmd').children];
  btns.forEach(b => (b.disabled = true));
  btns[q.zly].classList.add('bad');
  if (ok) {
    streak++; const mult = 1 + Math.min(streak - 1, 4) * .5, pts = Math.round((100 + left * 20) * mult);
    score += pts; sfx('good');
    const r = btns[k].getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2, 12);
    $('#res').innerHTML = `<div class="ok"><b>Dobrze! +${pts}</b> ${esc(q.wyjasnienie)}</div>`;
  } else {
    streak = 0; sfx('bad');
    if (k >= 0) btns[k].classList.add('miss');
    $('#res').innerHTML = `<div class="no"><b>${k < 0 ? 'Koniec czasu!' : 'Nie tym razem.'}</b> ${esc(q.wyjasnienie)}</div>`;
  }
  $('#res').innerHTML += `<div class="console bq-fix"><span class="pr">›</span> ${esc(q.dobra)}</div>`;
  $('#score').textContent = score; $('#streak').textContent = '×' + (1 + Math.min(streak, 4) * .5).toString().replace('.', ',');
  $('#next').hidden = false; $('#next').textContent = i + 1 < ROUNDS ? 'Dalej →' : 'Wynik →'; $('#next').focus();
}
function end() {
  const rec = score > best; if (rec) { best = score; store.set('bledy:rekord', best); $('#best').textContent = best; }
  $('#cmd').innerHTML = ''; $('#next').hidden = true; $('#start').hidden = false; $('#start').textContent = '↻ Jeszcze raz';
  $('#start').focus();
  $('#timeBar').style.width = '0%';
  $('#res').innerHTML = `<div class="bq-end"><span>Twój wynik</span><b>${score}</b>${rec ? '<em>Nowy rekord!</em>' : ''}</div>`;
  sfx(rec ? 'win' : 'checkpoint');
  award('bledy:gra', 20); if (score >= 1500) award('bledy:1500', 40);
  if (score >= 1500) badge('lowca');
}
$('#cmd').addEventListener('click', (e) => { const b = e.target.closest('.tok'); if (b) answer(+b.dataset.k); });
$('#start').addEventListener('click', start);
$('#next').addEventListener('click', () => { i++; i < ROUNDS ? show() : end(); });
