// =========================================================
// KILEKCRAFT — „Sezon LifeSteal”: interfejs gry na stronie symulatora.
// Model: sezon-model.js. Stan i rekord tylko w localStorage (przez store).
// =========================================================
import { store, reduced, award, badge } from './core.js';
import * as M from './sezon-model.js';

const $ = (s, el = document) => el.querySelector(s);
const root = $('#sezon');
let st = store.get('sezon:stan', null);
if (st && (!st.ja || !Array.isArray(st.boty))) st = null;
let wybor = null; // 'walka' albo 'sojusz', gdy gracz wybiera rywala

const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const serca = (n, max = M.MAX) => `<span class="sz-hearts" aria-label="${n} serc z ${max}">${'♥'.repeat(n)}<i>${'♥'.repeat(Math.max(0, max - n))}</i></span>`;
const pct = (p) => Math.round(p * 100) + '%';
const zapisz = () => store.set('sezon:stan', st);

function start() {
  const a = new Uint32Array(1); crypto.getRandomValues(a);
  st = M.nowySezon((a[0] % 999999) + 1); wybor = null; zapisz();
  award('sezon:start', 20);
  render(true);
}

function intro() {
  const rek = store.get('sezon:rekord', null);
  root.innerHTML = `
    <div class="sz-intro">
      <div>
        <h2 class="section-heading">Sezon LifeSteal: przetrwaj 14 dni</h2>
        <p>Grasz z 7 botami. Każdy dzień to jedna decyzja: kopiesz, farmisz, wzmacniasz bazę, polujesz na rywala albo zawierasz sojusz. W nocy boty ruszają same i napadają na siebie i na ciebie.</p>
        <ul class="sz-rules">
          <li>Startujesz z 5 sercami, możesz mieć najwyżej ${M.MAX}.</li>
          <li>Wygrana walka zabiera rywalowi jedno serce. Kto straci ostatnie, odpada z sezonu.</li>
          <li>W tym sezonie potwory w jaskini też zabierają serce.</li>
          <li>Za pieniądze kupisz sprzęt, totem i złote jabłko.</li>
        </ul>
        <p class="muted small">To gra z uproszczonymi zasadami. Na prawdziwym serwerze zasady ustawia plugin i admin.</p>
        <button type="button" class="btn" id="szStart">▶ Zacznij sezon</button>
        ${rek ? `<p class="sz-rec">Twój rekord: <b>${rek.pkt.toLocaleString('pl-PL')} pkt</b> (${rek.przetrwal ? 'miejsce ' + rek.miejsce : 'odpadłeś w dniu ' + rek.dzien})</p>` : ''}
      </div>
    </div>`;
  $('#szStart').addEventListener('click', start);
}

function statsHTML() {
  const ja = st.ja, so = ja.sojusz && M.bot(st, ja.sojusz);
  return `<div class="sz-me">
    <div class="sz-day"><span>Dzień</span><b>${st.dzien}</b><span>z ${M.DNI}</span></div>
    <div class="sz-stat sz-stat-h"><span>Serca</span><b>${ja.serca}</b>${serca(ja.serca)}</div>
    <div class="sz-stat"><span>Pieniądze</span><b>${ja.kasa.toLocaleString('pl-PL')} $</b></div>
    <div class="sz-stat"><span>Sprzęt</span><b>${M.SPRZET[ja.sprzet]}</b></div>
    <div class="sz-stat"><span>Baza</span><b>${M.OBRONA[ja.obrona]}</b></div>
    <div class="sz-stat"><span>Plecak</span><b>${ja.totem ? 'totem' : ''}${ja.totem && ja.jablko ? ' · ' : ''}${ja.jablko ? ja.jablko + '× jabłko' : ''}${!ja.totem && !ja.jablko ? 'pusto' : ''}</b></div>
    <div class="sz-stat"><span>Sojusz</span><b>${so ? esc(so.nick) : 'brak'}</b></div>
  </div>`;
}

function sklepHTML() {
  const ev = M.WYDARZENIA[st.dzien]?.id === 'targ';
  const item = (k, t, d) => `<button type="button" class="btn sm ghost sz-buy" data-buy="${k}" ${M.mozeKupic(st, k) ? '' : 'disabled'}><b>${t}</b><span>${d}</span><em>${M.cena(st, k).toLocaleString('pl-PL')} $</em></button>`;
  return `<div class="sz-shop"><h3>Sklep ${ev ? '<span class="badge ok">dziś −50%</span>' : ''}</h3><p class="muted small">Zakupy nie zabierają dnia.</p>
    ${st.ja.sprzet < 4 ? item('sprzet', 'Lepszy sprzęt', M.SPRZET[st.ja.sprzet + 1]) : ''}
    ${item('totem', 'Totem', st.ja.totem ? 'masz już jeden' : 'ratuje 1 serce')}
    ${item('jablko', 'Złote jabłko', 'lepsza szansa w walce')}
  </div>`;
}

function akcjeHTML() {
  if (wybor) {
    const lista = st.boty.filter(b => b.zyje && !(wybor === 'sojusz' && b.id === st.ja.sojusz));
    return `<div class="sz-pick"><h3>${wybor === 'walka' ? 'Na kogo polujesz?' : 'Z kim chcesz sojusz?'}</h3>
      <div class="sz-targets">${lista.map(b => {
        const info = wybor === 'walka' ? `szansa wygranej ok. ${pct(M.szansa(st, st.ja, b, false))}` : M.STYLE[b.styl].opis;
        return `<button type="button" class="sz-target" data-cel="${b.id}"><b>${esc(b.nick)}</b><span>${serca(b.serca, b.serca)} ${b.serca}</span><span>${M.SPRZET[b.sprzet]} · ${M.STYLE[b.styl].name}${b.id === st.ja.sojusz ? ' · twój sojusznik' : ''}</span><em>${info}</em></button>`;
      }).join('')}</div>
      <button type="button" class="btn sm ghost" id="szBack">← Wróć do decyzji</button></div>`;
  }
  return `<div class="sz-acts"><h3>Co robisz w dniu ${st.dzien}?</h3>
    ${Object.entries(M.AKCJE).map(([k, a]) => {
      const off = k === 'sojusz' && st.ja.sojusz;
      return `<button type="button" class="sz-act" data-akcja="${k}" ${off ? 'disabled' : ''}><b>${a.t}</b><span>${off ? 'Masz już sojusznika.' : a.d}</span></button>`;
    }).join('')}</div>`;
}

function rankingHTML() {
  return `<ol class="rank-list sz-rank">${M.ranking(st).map(p => {
    const me = p.id === 'ja';
    return `<li class="${p.zyje ? '' : 'out'} ${me ? 'me' : ''}"><i style="background:${me ? 'var(--gold)' : 'var(--portal)'}"></i><b>${esc(p.nick)}${!me && p.id === st.ja.sojusz ? ' 🤝' : ''}</b><span>${p.zyje ? '♥ ' + p.serca : 'odpadł'}</span><span class="muted">${M.SPRZET[p.sprzet]}${me ? '' : ' · ' + M.STYLE[p.styl].name}</span></li>`;
  }).join('')}</ol>`;
}

function logHTML(n = 8) {
  return `<ul class="sz-log" aria-live="polite">${st.log.slice(-n).reverse().map(l => `<li class="${l.w || ''}"><span>dz. ${l.d}</span>${esc(l.t)}</li>`).join('')}</ul>`;
}

function koniecHTML() {
  const w = st.wynik, rek = store.get('sezon:rekord', null), nowy = !rek || w.pkt > rek.pkt;
  if (nowy) store.set('sezon:rekord', { pkt: w.pkt, przetrwal: w.przetrwal, miejsce: w.miejsce, dzien: w.dzien });
  if (w.przetrwal) { award('sezon:przetrwal', 60); badge('sezon'); }
  if (w.przetrwal && w.miejsce === 1) award('sezon:zwyciestwo', 80);
  return `<div class="sz-end ${w.przetrwal ? 'ok' : 'zle'}">
    <h2 class="section-heading">${w.przetrwal ? (w.miejsce === 1 ? 'Wygrałeś sezon!' : `Przetrwałeś! Miejsce ${w.miejsce}`) : `Odpadasz w dniu ${w.dzien}`}</h2>
    <p class="sz-pts"><b>${w.pkt.toLocaleString('pl-PL')} pkt</b>${nowy ? ' <span class="badge ok">nowy rekord</span>' : ` <span class="muted">rekord: ${rek.pkt.toLocaleString('pl-PL')} pkt</span>`}</p>
    <p class="muted small">Punkty: serca × 100, każde wyeliminowanie 150, przetrwanie 500, 1. miejsce 500, a do tego 1 pkt za każde 10 $. Kto odpada, dostaje 40 pkt za każdy dzień.</p>
    <h3>Czego uczy ten sezon</h3>
    <ul class="sz-tips">${M.wnioski(st).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <button type="button" class="btn" id="szAgain">↻ Nowy sezon</button>
  </div>`;
}

function render(focusTop) {
  if (!st) { intro(); return; }
  const ev = M.WYDARZENIA[st.dzien];
  root.innerHTML = `
    ${statsHTML()}
    ${ev && !st.koniec ? `<div class="sz-event"><b>${ev.t}</b> ${ev.d}</div>` : ''}
    <div class="sz-grid">
      <div class="sz-main">${st.koniec ? koniecHTML() : akcjeHTML() + sklepHTML()}</div>
      <aside class="sz-side"><h3>Ranking sezonu</h3>${rankingHTML()}<h3>Dziennik</h3>${logHTML()}</aside>
    </div>
    ${st.koniec ? '' : '<p class="sz-foot"><button type="button" class="btn sm ghost" id="szReset">Zacznij od nowa</button></p>'}`;
  if (focusTop) {
    const t = $('.sz-act, .sz-target, #szAgain', root);
    t && t.focus({ preventScroll: true });
    root.scrollIntoView({ block: 'start', behavior: reduced ? 'instant' : 'smooth' });
  }
}

root.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t || t.disabled) return;
  if (t.id === 'szReset' && !t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Na pewno? Kliknij jeszcze raz'; return; }
  if (t.id === 'szAgain' || t.id === 'szReset') { start(); return; }
  if (t.id === 'szBack') { wybor = null; render(true); return; }
  if (t.dataset.buy) { M.kup(st, t.dataset.buy); zapisz(); render(); $(`[data-buy="${t.dataset.buy}"]`, root)?.focus(); return; }
  if (t.dataset.akcja) {
    const a = t.dataset.akcja;
    if (a === 'walka' || a === 'sojusz') { wybor = a; render(true); return; }
    M.dzien(st, a); zapisz(); render(true); return;
  }
  if (t.dataset.cel) { M.dzien(st, wybor, t.dataset.cel); wybor = null; zapisz(); render(true); }
});

render(false);
