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
  // host z kilkoma planami: najmniejszy, który ma dość RAM i miejsc dla graczy
  if (h.plany) {
    const p = h.plany.filter(x => x.ram >= ram && x.gracze >= a.gracze).sort((x, y) => x.cena - y.cena)[0];
    if (!p) return null;
    return { pln: p.cena, txt: `plan ${p.nazwa}: ${p.ram} GB RAM, do ${p.gracze >= 999 ? 'bez limitu' : p.gracze} graczy, ${zl(p.cena)} / 30 dni z VAT`, plan: p };
  }
  if (h.cena_eur_mies) return { pln: h.cena_eur_mies * KURS, txt: `${eur(h.cena_eur_mies)} (plan ${h.ram} GB)`, eur: h.cena_eur_mies };
  return { pln: h.cena_pln_mies || 0, txt: h.cena_opis };
}

function rate(h, a, ram) {
  const c = costOf(h, a, ram);
  if (!c || (h.gracze_max && h.gracze_max < a.gracze)) return null;
  const available = c.plan?.ram ?? (h.typ === 'godzinowy' ? ram : h.ram);
  if (available != null && available < ram) return null;
  if (available == null && (a.gracze > 10 || a.dodatki === 3 || a.czas === 720)) return null;
  let s = 100; const why = [];
  const tooExpensive = c.pln > a.budzet + .5;
  if (tooExpensive) { s -= 60; why.push('przekracza twój budżet'); }
  if (h.id === 'aternos') {
    if (a.czas === 720) { s -= 70; why.push('nie działa 24/7, bo usypia, gdy nikt nie gra'); }
    if (a.dodatki === 3) { s -= 35; why.push('duży modpack może nie zmieścić się w limicie 4 GB'); }
    if (a.gracze >= 20) { s -= 30; why.push('przy wielu graczach darmowa moc może nie wystarczyć'); }
    if (s > 60) why.unshift('za darmo i wystarczy do grania z kolegami o umówionej porze');
    s += 8;
  }
  // darmowy plan, który usypia (np. MCHosting): limity biorę z danych
  if (h.usypia) {
    if (a.czas === 720) { s -= 70; why.push('usypia, gdy nikt nie gra, więc nie działa 24/7'); }
    if (a.gracze > h.gracze_max) { s -= 40; why.push(`darmowy plan ma limit ${h.gracze_max} graczy`); }
    if (ram > h.ram) { s -= 25; why.push(`potrzebujesz ok. ${ram} GB, a darmowy plan ma ${h.ram} GB`); }
    if (s > 60) why.unshift('za darmo, a serwer budzi się sam, gdy ktoś wchodzi');
    s += 6;
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
    if (!h.plany && h.ram < ram) { s -= 40; why.push(`plan ${h.ram} GB to za mało, potrzeba ok. ${ram} GB`); }
    if (!h.plany && ram <= 4 && a.czas < 720) { s -= 30; why.push(`plan ${h.ram} GB to dla ciebie za dużo, bo wystarczy ok. ${ram} GB`); }
    else if (!tooExpensive) why.unshift(h.plany ? `plan ${c.plan.nazwa} (${c.plan.ram} GB) działa cały czas` : 'działa cały czas, a koledzy wchodzą, kiedy chcą');
    if (/Polska/.test(h.kraj)) { s += 4; why.push('serwer w Polsce, czyli niski ping'); }
    s -= c.pln / 10;
  }
  if (h.id === 'wlasny') { s -= 40; why.length = 0; why.push('darmowe, ale wymaga pomocy rodzica (router, adres IP domu)'); }
  if (available == null) why.unshift('przed wyborem sprawdź dostępny RAM');
  return { h, c, s, why, available };
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
  const list = H.map(h => rate(h, a, ram)).filter(Boolean).sort((x, y) => y.s - x.s).slice(0, 3);
  // jedno zdanie na górze: co wybrać i za ile
  const top = list[0];
  const topRam = top.available == null ? 'RAM do sprawdzenia' : `${top.available} GB RAM`;
  document.getElementById('pick').innerHTML = `Na początek polecamy <b>${top.h.nazwa}</b> (${top.c.pln ? 'ok. ' + zl(Math.round(top.c.pln * 100) / 100) : '0 zł'} miesięcznie, ${topRam}). To propozycja na podstawie twoich odpowiedzi. Przed wyborem zajrzyj też do innych opcji.`;
  const li = (arr) => arr.map(p => `<li>${p}</li>`).join('');
  out.innerHTML = list.map((r, i) => {
    const h = r.h, free = r.c.pln === 0, first = i === 0;
    const badges = [
      first ? '<span class="badge ok">polecam</span>' : '',
      free ? '<span class="badge ok">0 zł</span>' : '',
      h.typ === 'godzinowy' ? '<span class="badge info">za godziny</span>' : '',
      /Polska/.test(h.kraj) ? '<span class="badge info">serwer w PL</span>' : '',
      h.pewnosc === 'niska' ? '<span class="badge warn">do sprawdzenia</span>' : '',
    ].join(' ');
    // pierwsza karta pokazuje 3 plusy i 3 minusy, pozostałe tylko najważniejszy; reszta po rozwinięciu
    const n = first ? 3 : 1, more = h.plusy.length + h.minusy.length - Math.min(n, h.plusy.length) - Math.min(n, h.minusy.length);
    return `<article data-host="${h.id}" data-ram="${r.available ?? ''}" class="panel res ${first ? 'res-top1' : 'res-small'} reveal in" style="--d:${i}">
      <div class="rank" aria-label="Miejsce ${i + 1}">${i + 1}</div>
      <div class="res-body">
        <div class="res-top"><h3>${h.nazwa}</h3><div class="res-badges">${badges}</div></div>
        <div class="price"><span class="pnum" data-v="${r.c.pln}">0 zł</span><span class="muted"> / mies.</span></div>
        <p class="fit">${r.why.slice(0, first ? 3 : 2).map(w => w[0].toUpperCase() + w.slice(1)).join('. ')}.</p>
        <div class="pm">
          <ul class="plus">${li(h.plusy.slice(0, n))}</ul>
          <ul class="minus">${li(h.minusy.slice(0, n))}</ul>
        </div>
        <details class="res-more"><summary>${more > 0 ? `Więcej o ${h.nazwa} (${more})` : 'Skąd ta cena'}</summary>
          ${more > 0 ? `<div class="pm"><ul class="plus">${li(h.plusy.slice(n))}</ul><ul class="minus">${li(h.minusy.slice(n))}</ul></div>` : ''}
          <p class="muted calc">Wyliczenie: ${r.c.txt}${h.cena_eur_mies || h.typ === 'godzinowy' ? ` · przeliczone po ${KURS.toString().replace('.', ',')} zł/€` : ''}</p>
          <p class="muted calc">Dla kogo: ${h.dla_kogo}</p>
          <div class="src">Źródło: <a href="${h.zrodlo}" target="_blank" rel="noopener">${new URL(h.zrodlo).hostname}</a> · sprawdzono ${date(h.sprawdzono)}</div>
        </details>
      </div>
    </article>`;
  }).join('');
  out.querySelectorAll('.pnum').forEach(el => countUp(el, +el.dataset.v, (v) => zl(Math.round(v * 100) / 100)));
}

// Tabela wszystkich opcji: na telefonie każdy wiersz zamienia się w kartę (etykiety z data-l).
const TYP = { darmowy: 'darmowy', godzinowy: 'za godziny', abonament: 'abonament', wlasny: 'własny komputer' };
const ORDER = { darmowy: 0, godzinowy: 1, abonament: 2, wlasny: 3 };
document.getElementById('allTbl').innerHTML = `<thead><tr><th>Hosting</th><th>Cena</th><th>Gdzie stoi serwer</th><th>Sprawdzono</th></tr></thead><tbody>${[...H].sort((x, y) => ORDER[x.typ] - ORDER[y.typ]).map(h => `<tr>
  <td data-l="Hosting"><b>${h.nazwa}</b> <span class="tbl-typ t-${h.typ}">${TYP[h.typ]}</span></td>
  <td data-l="Cena">${h.cena_opis}</td><td data-l="Gdzie">${h.kraj}</td>
  <td data-l="Sprawdzono" class="muted">${date(h.sprawdzono)}${h.pewnosc === 'niska' ? ' <span class="badge warn">niepewne</span>' : ''}</td></tr>`).join('')}</tbody>`;

form.addEventListener('change', () => { render(); if (award('doradca', 20)) badge('doradca'); });
render();
