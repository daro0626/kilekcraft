// =========================================================
// KILEKCRAFT — koło wyzwań: cztery bębny jak w automacie + stoper.
// =========================================================
import { store, reduced, award, badge, sfx, xpBurst } from './core.js';

const $ = (s) => document.querySelector(s);
const LISTS = [
  ['Wieża', 'Most', 'Statek', 'Domek na drzewie', 'Fontanna', 'Latarnia morska', 'Portal', 'Statua zwierzęcia', 'Pociąg', 'Rakieta', 'Wiatrak', 'Arena', 'Ogród', 'Sklep na spawnie', 'Brama do miasta', 'Podwodna baza', 'Kryjówka w górze', 'Piramida', 'Grzyb-gigant', 'Zamek'],
  ['tylko drewno', 'tylko kamień', 'tylko 3 kolory', 'bez kamienia', 'szkło i metal', 'bloki z Netheru', 'tylko naturalne', 'dowolne bloki', 'tylko wełna', 'piasek i kwarc'],
  ['5 minut', '10 minut', '15 minut', '20 minut', '30 minut'],
  ['symetrycznie', 'bez schodów', 'min. 20 bloków w górę', 'ma świecić w nocy', 'max. 150 bloków', 'coś ma się ruszać', 'wisi w powietrzu', 'pod ziemią', 'z ukrytym pokojem', 'bez zasady'],
];
const ITEM_H = 64, LOOPS = 6;
const strips = [0, 1, 2, 3].map(i => $('#r' + i));
let cur = store.get('kolo:ostatnie', null);
strips.forEach((s, i) => {
  const arr = Array.from({ length: LOOPS }, () => LISTS[i]).flat();
  s.innerHTML = arr.map(t => `<div>${t}</div>`).join('');
  const idx = cur ? LISTS[i].indexOf(cur[i]) : 0;
  s.style.transform = `translateY(${-Math.max(0, idx) * ITEM_H}px)`;
});

let spinning = false;
function spin() {
  if (spinning) return; spinning = true; $('#spin').disabled = true;
  const pick = LISTS.map(l => Math.floor(Math.random() * l.length));
  let doneN = 0;
  strips.forEach((s, i) => {
    const target = (LOOPS - 1) * LISTS[i].length + pick[i];
    const dur = reduced ? 10 : 1200 + i * 450;
    s.style.transition = 'none'; s.style.transform = `translateY(${-(pick[i] % LISTS[i].length) * ITEM_H}px)`; void s.offsetHeight;
    s.style.transition = `transform ${dur}ms cubic-bezier(.12,.75,.2,1.04)`;
    s.style.transform = `translateY(${-target * ITEM_H}px)`;
    if (!reduced) { let n = 0; const iv = setInterval(() => { sfx('spin'); if (++n > dur / 70) clearInterval(iv); }, 70); }
    setTimeout(() => {
      sfx('hit'); s.closest('.reel').classList.remove('stop'); void s.offsetWidth; s.closest('.reel').classList.add('stop');
      if (++doneN === 4) finish(pick.map((p, j) => LISTS[j][p]));
    }, dur);
  });
}
function finish(res) {
  spinning = false; $('#spin').disabled = false; $('#timerBtn').disabled = false; cur = res;
  store.set('kolo:ostatnie', res);
  const hist = store.get('kolo:historia', []); hist.unshift(res); store.set('kolo:historia', hist.slice(0, 6)); renderHist();
  const r = $('#reels').getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2, 20); sfx('win');
  award('kolo:' + new Date().toDateString(), 15); badge('kolo');
  setClock(parseInt(res[2], 10) * 60, parseInt(res[2], 10) * 60);
}
function renderHist() {
  const h = store.get('kolo:historia', []);
  $('#hist').innerHTML = h.length ? h.map(x => `<li><b>${x[0]}</b> · ${x[1]} · ${x[2]} · <i>${x[3]}</i></li>`).join('') : '<li class="muted">Jeszcze nic. Zakręć kołem!</li>';
}

// ---------- stoper ----------
let total = 0, left = 0, tmr = 0, paused = false;
const ring = $('#ring'), C = 2 * Math.PI * 52;
ring.style.strokeDasharray = C;
function setClock(l, t) {
  left = l; total = t || total;
  $('#clock').textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  ring.style.strokeDashoffset = total ? C * (1 - left / total) : C;
  ring.classList.toggle('low', total && left <= 60);
}
function startTimer() {
  if (!cur) return; clearInterval(tmr); paused = false;
  setClock(parseInt(cur[2], 10) * 60, parseInt(cur[2], 10) * 60);
  $('#pause').disabled = false; $('#stopT').disabled = false; $('#pause').textContent = 'Pauza';
  tmr = setInterval(() => {
    if (paused) return;
    setClock(left - 1);
    if (left <= 10 && left > 0) sfx('tick');
    if (left <= 0) { clearInterval(tmr); sfx('win'); $('#clock').textContent = 'KONIEC!'; award('kolo:koniec:' + new Date().toDateString(), 20); }
  }, 1000);
}
$('#spin').addEventListener('click', spin);
$('#timerBtn').addEventListener('click', startTimer);
$('#pause').addEventListener('click', () => { paused = !paused; $('#pause').textContent = paused ? 'Wznów' : 'Pauza'; });
$('#stopT').addEventListener('click', () => { clearInterval(tmr); setClock(0, total); $('#clock').textContent = '--:--'; });
renderHist();
if (cur) { $('#timerBtn').disabled = false; setClock(parseInt(cur[2], 10) * 60, parseInt(cur[2], 10) * 60); }
