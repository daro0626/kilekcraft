// =========================================================
// KILEKCRAFT — doradca hostingu.
// Dane: data/hostingi.json (z datami i źródłami).
// =========================================================
import { reduced, award, badge } from './core.js';

const res = await fetch('data/hostingi.json');
const DATA = await res.json();
const KURS = DATA.kurs_eur_pln.wartosc;
const H = DATA.hostingi;
const whole = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const calendar = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
const zl = (v) => (Number.isInteger(v) ? whole : decimal).format(v) + ' zł';
const eur = (v) => decimal.format(v) + ' €';
const date = (d) => calendar.format(new Date(d + 'T12:00'));

const form = document.getElementById('quiz');
const ans = () => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, +v]));

function ramFor(a) {
  const base = { 5: 2, 10: 3, 20: 5, 40: 8 }[a.gracze];
  if (a.dodatki === 3) return { ram: Math.max(6, base + 4), why: 'Modpacki zjadają dużo pamięci. Duże paczki potrafią potrzebować jeszcze więcej, więc sprawdź wymagania konkretnej paczki.' };
  const add = a.dodatki >= 1 ? 1 : 0;
  const why = a.dodatki === 2 ? 'LifeSteal, ekonomia i sklep to kilka pluginów działających naraz, więc dodałem 1 GB zapasu.' : a.dodatki === 1 ? 'Kilka pluginów to 1 GB zapasu więcej.' : 'Czysty Minecraft z kilkoma graczami jest lekki.';
  return { ram: base + add, why: why + ` Dla ${a.gracze <= 5 ? 'do 5' : a.gracze <= 10 ? '6–10' : a.gracze <= 20 ? '11–20' : 'ponad 20'} graczy liczę ${base} GB bazowo.` };
}

function costOf(h, a, ram) {
  if (h.typ === 'godzinowy') {
    const e = ram * a.czas * h.eur_za_gb_h + h.eur_mies_staly;
    return { pln: e * KURS, txt: `${ram} GB × ${a.czas} h × 0,01 € + 0,10 € = ${eur(e)}`, eur: e };
  }
  if (h.cena_eur_mies) return { pln: h.cena_eur_mies * KURS, txt: `${eur(h.cena_eur_mies)} (plan ${h.ram} GB)`, eur: h.cena_eur_mies };
  return { pln: h.cena_pln_mies || 0, txt: h.cena_opis };
}

function rate(h, a, ram) {
  const c = costOf(h, a, ram); let s = 100; const why = [];
  const tooExpensive = c.pln > a.budzet + .5;
  if (tooExpensive) { s -= 60; why.push('przekracza twój budżet'); }
  if (h.id === 'aternos') {
    if (a.czas === 720) { s -= 70; why.push('nie działa 24/7, bo usypia, gdy nikt nie gra'); }
    if (a.dodatki === 3) { s -= 35; why.push('duży modpack może nie zmieścić się w limicie 4 GB'); }
    if (a.gracze >= 20) { s -= 30; why.push('przy wielu graczach darmowa moc może nie wystarczyć'); }
    if (s > 60) why.unshift('za darmo i wystarczy do grania z kolegami o umówionej porze');
    s += 8;
  }
  if (h.id === 'minehut') {
    s -= 25; why.push('limity darmowego planu trzeba sprawdzić, bo źródła się różnią');
    if (a.gracze > 10) { s -= 30; why.push('darmowy plan jest dla małej grupy'); }
    if (a.czas >= 180) s -= 20;
  }
  if (h.typ === 'godzinowy') {
    if (!tooExpensive) why.unshift(`płacisz tylko za granie: ok. ${zl(Math.round(c.pln * 100) / 100)} miesięcznie`);
    if (a.czas === 720) { s -= 30; why.push('przy pracy 24/7 abonament wychodzi taniej'); }
    if (a.dodatki >= 2 && !tooExpensive) { s += 6; why.push('bez kolejki i z RAM-em, który sam ustawiasz'); }
  }
  if (h.typ === 'abonament') {
    if (ram <= 4 && a.czas < 720) { s -= 30; why.push(`plan ${h.ram} GB to dla ciebie za dużo, bo wystarczy ok. ${ram} GB`); }
    else if (!tooExpensive) why.unshift('działa cały czas, a koledzy wchodzą, kiedy chcą');
    if (/Polska/.test(h.kraj)) { s += 4; why.push('serwer w Polsce, czyli niski ping'); }
    s -= c.pln / 10;
  }
  if (h.id === 'wlasny') { s -= 40; why.length = 0; why.push('darmowe, ale wymaga pomocy rodzica (router, adres IP domu)'); }
  return { h, c, s, why };
}

// ---------- renderowanie ----------
const ramNum = document.getElementById('ramNum'), ramBar = document.getElementById('ramBar'), ramWhy = document.getElementById('ramWhy');
ramBar.innerHTML = Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('');
const out = document.getElementById('results');

function countUp(el, to, fmt) {
  if (reduced) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), from = 0, dur = 700;
  const step = (n) => { const p = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function render() {
  const a = ans(); const { ram, why } = ramFor(a);
  ramNum.textContent = ram; ramWhy.textContent = why;
  [...ramBar.children].forEach((b, i) => b.classList.toggle('on', i < ram));
  const list = H.map(h => rate(h, a, ram)).sort((x, y) => y.s - x.s).slice(0, 3);
  out.innerHTML = list.map((r, i) => {
    const h = r.h, free = r.c.pln === 0;
    const badges = [
      free ? '<span class="badge ok">0 zł</span>' : '',
      h.typ === 'godzinowy' ? '<span class="badge info">za godziny</span>' : '',
      /Polska/.test(h.kraj) ? '<span class="badge info">PL</span>' : '',
      h.pewnosc === 'niska' ? '<span class="badge warn">do sprawdzenia</span>' : '',
    ].join(' ');
    return `<article class="panel res reveal in" style="--d:${i}">
      <div class="rank">${i + 1}</div>
      <div class="res-body">
        <div class="res-top"><h3>${h.nazwa}</h3><div>${badges}</div></div>
        <div class="price"><span class="pnum" data-v="${r.c.pln}">0 zł</span><span class="muted"> / mies.</span></div>
        <div class="muted calc">${r.c.txt}${h.cena_eur_mies || h.typ === 'godzinowy' ? ` · przeliczone po ${KURS.toString().replace('.', ',')} zł/€` : ''}</div>
        <p class="fit">${r.why.slice(0, 3).map(w => w[0].toUpperCase() + w.slice(1)).join('. ')}.</p>
        <div class="pm">
          <ul class="plus">${h.plusy.map(p => `<li>${p}</li>`).join('')}</ul>
          <ul class="minus">${h.minusy.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        <div class="src">Źródło: <a href="${h.zrodlo}" target="_blank" rel="noopener">${new URL(h.zrodlo).hostname}</a> · sprawdzono ${date(h.sprawdzono)}</div>
      </div>
    </article>`;
  }).join('');
  out.querySelectorAll('.pnum').forEach(el => countUp(el, +el.dataset.v, (v) => zl(Math.round(v * 100) / 100)));
}

document.getElementById('allTbl').innerHTML = `<thead><tr><th>Hosting</th><th>Typ</th><th>Cena</th><th>Gdzie</th><th>Sprawdzono</th></tr></thead><tbody>${H.map(h => `<tr><td><b>${h.nazwa}</b></td><td>${{ darmowy: 'darmowy', godzinowy: 'za godziny', abonament: 'abonament', wlasny: 'własny' }[h.typ]}</td><td>${h.cena_opis}</td><td>${h.kraj}</td><td>${date(h.sprawdzono)}${h.pewnosc === 'niska' ? ' <span class="badge warn">niepewne</span>' : ''}</td></tr>`).join('')}</tbody>`;

form.addEventListener('change', () => { render(); if (award('doradca', 20)) badge('doradca'); });
render();
