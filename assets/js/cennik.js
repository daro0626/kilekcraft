const section = document.querySelector('#ceny-sprzedazy');
const search = section.querySelector('#cennik-szukaj');
const category = section.querySelector('#cennik-kategoria');
const summary = section.querySelector('#cennik-wynik');
const table = section.querySelector('table');
const body = table.tBodies[0];
const money = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
const fold = text => text.toLocaleLowerCase('pl').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ł', 'l');

async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Błąd wczytywania danych cennika');
  return response.json();
}

function addCell(row, tag, text, role) {
  const cell = document.createElement(tag);
  cell.textContent = text;
  cell.setAttribute('role', role);
  row.append(cell);
  return cell;
}

async function showPrices() {
  const [proposal, tests] = await Promise.all([
    readJSON('data/cennik.json'),
    readJSON('data/testy.json').catch(() => null),
  ]);
  const verified = tests?.wyniki?.cennik;
  const testedIds = new Set(verified?.zweryfikowane);
  const rows = proposal.pozycje.map(item => {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');
    const name = addCell(row, 'th', item.nazwa, 'rowheader');
    name.scope = 'row';
    if (item.uwagi !== '—') {
      const note = document.createElement('span');
      note.className = 'muted small cennik-uwaga';
      note.textContent = item.uwagi;
      name.append(note);
    }
    addCell(row, 'td', item.cena === null ? 'Brak ceny · niesprzedawalny' : `${money.format(item.cena)} $`, 'cell');
    const tested = verified?.wersja && item.id.length > 0 && item.id.every(id => testedIds.has(id));
    const status = addCell(row, 'td', '', 'cell');
    const badge = document.createElement('span');
    badge.className = tested ? 'badge ok' : 'badge wait';
    badge.textContent = tested ? `identyfikator sprawdzony · ${verified.wersja}` : 'czeka na test';
    status.append(badge);
    return { row, category: item.kategoria, index: fold([item.nazwa, ...item.id].join(' ')) };
  });

  for (const label of new Set(rows.map(item => item.category))) category.add(new Option(label, label));

  function filter() {
    const query = fold(search.value.trim());
    const matches = rows.filter(item => (!category.value || item.category === category.value) && item.index.includes(query));
    body.replaceChildren(...matches.map(item => item.row));
    table.hidden = matches.length === 0;
    summary.textContent = matches.length ? `Pozycje: ${matches.length} z ${rows.length}` : 'Brak pasujących pozycji.';
  }

  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  section.querySelector('.cennik-filtry').hidden = false;
  filter();
}

showPrices().catch(() => { summary.textContent = 'Nie udało się wczytać propozycji cen.'; });
