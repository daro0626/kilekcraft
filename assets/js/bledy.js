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
const ROUNDS = Math.min(5, POOL.length), TIME = 15;
let qs = [], i = 0, score = 0, streak = 0, t0 = 0, raf = 0, answered = false, hits = 0, total = 0, fastest = Infinity;
let best = store.get('bledy:rekord', 0);
$('#best').textContent = best;
const sec = (s) => s.toFixed(1).replace('.', ',');

// Losowanie z kryptograficznego źródła: na każdym urządzeniu i przy każdym starcie inna kolejność.
function rand(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
function shuffle(a) { for (let k = a.length - 1; k > 0; k--) { const j = rand(k + 1); [a[k], a[j]] = [a[j], a[k]]; } return a; }
// Najpierw pytania, których jeszcze nie było. Gdy pula się skończy, zaczynamy od nowa,
// ale bez pytań z ostatniej gry.
function pick() {
  let seen = store.get('bledy:widziane', []).filter(id => POOL.some(q => q.id === id));
  let fresh = POOL.filter(q => !seen.includes(q.id));
  if (fresh.length < ROUNDS) {
    const last = seen.slice(-ROUNDS);
    seen = last; fresh = POOL.filter(q => !last.includes(q.id));
  }
  const out = shuffle(fresh).slice(0, ROUNDS);
  store.set('bledy:widziane', [...seen, ...out.map(q => q.id)]);
  return out;
}
function recs() {
  const t = store.get('bledy:czas', null), f = store.get('bledy:najszybsza', null);
  const left = POOL.length - store.get('bledy:widziane', []).filter(id => POOL.some(q => q.id === id)).length;
  $('#recs').innerHTML = [
    t ? `Bezbłędnie najszybciej: <b>${sec(t)} s</b>` : '',
    f ? `Najszybsza odpowiedź: <b>${sec(f)} s</b>` : '',
    POOL.length ? `Nowych pytań przed tobą: <b>${Math.max(0, left)}</b> z ${POOL.length}` : '',
  ].filter(Boolean).join('');
}
recs();

function start() {
  qs = pick(); i = 0; score = 0; streak = 0; hits = 0; total = 0;
  $('#start').hidden = true; $('#hint').hidden = true; $('#recs').hidden = true;
  $('#clock').textContent = sec(0);
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
  const used = (performance.now() - t0) / 1000, left = Math.max(0, TIME - used);
  $('#timeBar').style.width = (left / TIME * 100) + '%';
  $('#timeBar').classList.toggle('low', left < 4);
  $('#clock').textContent = sec(total + Math.min(used, TIME));
  if (left <= 0) { answer(-1); return; }
  if (!answered) raf = requestAnimationFrame(tick);
}
function answer(k) {
  if (answered) return; answered = true; cancelAnimationFrame(raf);
  const q = qs[i], ok = k === q.zly;
  const used = Math.min(TIME, (performance.now() - t0) / 1000), left = TIME - used;
  total += used; $('#clock').textContent = sec(total);
  const btns = [...$('#cmd').children];
  btns.forEach(b => (b.disabled = true));
  btns[q.zly].classList.add('bad');
  if (ok) {
    hits++; streak++; const mult = 1 + Math.min(streak - 1, 4) * .5, pts = Math.round((100 + left * 20) * mult);
    score += pts; sfx('good');
    const r = btns[k].getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2, 12);
    const fast = used < fastest && used < store.get('bledy:najszybsza', Infinity);
    fastest = Math.min(fastest, used);
    if (fast) store.set('bledy:najszybsza', used);
    $('#res').innerHTML = `<div class="ok"><b>Dobrze! +${pts} · ${sec(used)} s${fast ? ' · najszybciej w historii!' : ''}</b> ${esc(q.wyjasnienie)}</div>`;
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
  // rekord czasu liczy się tylko za grę bez pomyłki
  const perfect = hits === ROUNDS, oldT = store.get('bledy:czas', null), timeRec = perfect && (!oldT || total < oldT);
  if (timeRec) store.set('bledy:czas', total);
  $('#cmd').innerHTML = ''; $('#next').hidden = true; $('#start').hidden = false; $('#start').textContent = '↻ Nowe pytania';
  $('#start').focus();
  $('#timeBar').style.width = '0%';
  $('#res').innerHTML = `<div class="bq-end"><span>Twój wynik</span><b>${score}</b>${rec ? '<em>Nowy rekord punktów!</em>' : ''}
    <dl><div><dt>Trafione</dt><dd>${hits}/${ROUNDS}</dd></div><div><dt>Czas</dt><dd>${sec(total)} s</dd></div>
    <div><dt>Rekord bez pomyłki</dt><dd>${timeRec ? 'Nowy! ' : ''}${store.get('bledy:czas', null) ? sec(store.get('bledy:czas')) + ' s' : 'jeszcze brak'}</dd></div></dl>
    ${perfect ? '' : '<p class="muted small">Rekord czasu liczy się za grę bez pomyłki.</p>'}</div>`;
  $('#recs').hidden = false; recs();
  sfx(rec || timeRec ? 'win' : 'checkpoint');
  award('bledy:gra', 20); if (score >= 2500) award('bledy:2500', 40);
  if (score >= 2500) badge('lowca');
}
$('#cmd').addEventListener('click', (e) => { const b = e.target.closest('.tok'); if (b) answer(+b.dataset.k); });
$('#start').addEventListener('click', start);
$('#next').addEventListener('click', () => { i++; i < ROUNDS ? show() : end(); });
