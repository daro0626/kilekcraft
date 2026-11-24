// =========================================================
// KILEKCRAFT — koło wyzwań: cztery bębny jak w automacie + stoper.
// =========================================================
import { store, reduced, award, badge, sfx, xpBurst } from './core.js';
import { LISTS, compatible, planFor } from './kolo-projekt.js';

const $ = (s) => document.querySelector(s);
const ITEM_H = 64, LOOPS = 6;
const strips = [0, 1, 2, 3].map(i => $('#r' + i));
const drawResult = $('#drawResult');
const isDraw = draw => Array.isArray(draw) && draw.length === LISTS.length && LISTS.every((list, i) => list.includes(draw[i]));
function announce(values) {
  drawResult.textContent = values.join(' · ');
  const indexes = values.map((value, i) => LISTS[i].indexOf(value));
  const fit = compatible(indexes);
  $('#challengeProject').hidden = !fit;
  if (!fit) return;
  const project = planFor(indexes);
  $('#projectName').textContent = project.name;
  $('#projectPlan').textContent = project.plan + ' Materiały to ' + project.materials + '.';
  $('#projectTip').textContent = [project.pace, project.tip].filter(Boolean).join(' ');
  $('#projectEditor').href = 'edytor.html?wyzwanie=' + indexes.join('-');
}
const last = store.get('kolo:ostatnie', null);
let cur = isDraw(last) ? last : null;
strips.forEach((s, i) => {
  const arr = Array.from({ length: LOOPS }, () => LISTS[i]).flat();
  s.innerHTML = arr.map(t => `<div>${t}</div>`).join('');
  const idx = cur ? LISTS[i].indexOf(cur[i]) : 0;
  s.style.transform = `translateY(${-Math.max(0, idx) * ITEM_H}px)`;
});

let spinning = false;
function spin() {
  if (spinning) return; spinning = true; $('#spin').setAttribute('aria-disabled', 'true');
  const pick = LISTS.map(l => Math.floor(Math.random() * l.length));
  if (!compatible(pick)) {
    const rules = LISTS[3].map((_, i) => i).filter(i => compatible([...pick.slice(0, 3), i]));
    pick[3] = rules[Math.floor(Math.random() * rules.length)];
  }
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
  spinning = false; $('#spin').removeAttribute('aria-disabled'); $('#timerBtn').disabled = false; cur = res;
  announce(res);
  store.set('kolo:ostatnie', res);
  store.set('kolo:historia', [res, ...drawHistory()].slice(0, 6)); renderHist();
  const r = $('#reels').getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top + r.height / 2, 20); sfx('win');
  award('kolo:' + new Date().toDateString(), 15); badge('kolo');
  setClock(parseInt(res[2], 10) * 60, parseInt(res[2], 10) * 60);
}
function drawHistory() {
  const saved = store.get('kolo:historia', []);
  return Array.isArray(saved) ? saved.filter(isDraw).slice(0, 6) : [];
}
function renderHist() {
  const h = drawHistory();
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
const timerStatus = $('#timerStatus');
let deadline = 0;
function stopTimer(message) {
  clearInterval(tmr);
  tmr = 0;
  const keepFocus = ['pause', 'stopT'].includes(document.activeElement.id);
  $('#pause').disabled = true;
  $('#stopT').disabled = true;
  if (keepFocus) $('#timerBtn').focus();
  timerStatus.textContent = message;
}
function startTimer() {
  if (!cur) return;
  clearInterval(tmr);
  paused = false;
  const duration = parseInt(cur[2], 10) * 60;
  setClock(duration, duration);
  deadline = Date.now() + duration * 1000;
  $('#pause').disabled = false; $('#stopT').disabled = false; $('#pause').textContent = 'Pauza';
  timerStatus.textContent = 'Stoper uruchomiony';
  tmr = setInterval(() => {
    if (paused) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining === left) return;
    setClock(remaining);
    if (remaining > 0 && remaining <= 10) sfx('tick');
    if (remaining === 0) {
      stopTimer('Koniec czasu');
      sfx('win'); $('#clock').textContent = 'KONIEC!';
      award('kolo:koniec:' + new Date().toDateString(), 20);
    }
  }, 150);
}
$('#spin').addEventListener('click', spin);
$('#timerBtn').addEventListener('click', startTimer);
$('#pause').addEventListener('click', () => {
  paused = !paused;
  if (!paused) deadline = Date.now() + left * 1000;
  $('#pause').textContent = paused ? 'Wznów' : 'Pauza';
  timerStatus.textContent = paused ? 'Stoper wstrzymany' : 'Stoper wznowiony';
});
$('#stopT').addEventListener('click', () => {
  stopTimer('Stoper zatrzymany');
  setClock(0, total);
  $('#clock').textContent = '--:--';
});
renderHist();
if (cur) {
  announce(cur);
  $('#timerBtn').disabled = false;
  const duration = parseInt(cur[2], 10) * 60;
  setClock(duration, duration);
}
