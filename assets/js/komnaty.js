// =========================================================
// KILEKCRAFT — strona generatora komnat.
// =========================================================
import { store, reduced, copyText, toast, award, badge } from './core.js';
import { generate, encode, decode, THEMES, kindName } from './komnaty-gen.js';
import { MISTRZ } from './komnaty-mistrz.js';
import { datapack, download, safeName, packStatusHTML, exportPanelHTML, modesHTML } from './export.js';
import { mechanicRoom, roomFiles } from './komnaty-datapack.js';

const $ = (s) => document.querySelector(s);
const form = $('#form');
const NAMES = ['', 'Rozgrzewka', 'Rozgrzewka', 'Łatwa', 'Wyzwanie', 'Wyzwanie', 'Wyzwanie', 'Trudna', 'Bardzo trudna', 'Bez litości', 'Bez litości'];

$('#themes').innerHTML = Object.entries(THEMES).map(([id, t], i) => `<label class="chip"><input type="radio" name="theme" value="${id}" ${i === 0 ? 'checked' : ''}><span>${t.name}</span></label>`).join('');
$('#expHelp').innerHTML = exportPanelHTML();

let state = decode(location.hash.slice(1)) || store.get('komnata') || { type: 'parkour', diff: 5, theme: 'kamien', seed: 4821 };
let room = null, viewer = null;
let mechanicChecks = null;

// Lista komnat mistrzowskich: suwak trudności wybiera numer komnaty, a przyciski robią to samo szybciej
const mGrid = document.querySelector('#mList .km-mgrid');
mGrid.innerHTML = MISTRZ.slice(1).map((m, i) => `<button type="button" class="km-m" data-m="${i + 1}" aria-pressed="false"><b>M${i + 1}</b> ${m.name}<span>${m.mech}</span></button>`).join('');
mGrid.addEventListener('click', (e) => {
  const t = e.target.closest('[data-m]'); if (!t) return;
  form.diff.value = t.dataset.m; fromForm(); showDiff(); build();
});
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mistrzUI() {
  const on = state.type === 'mistrz';
  $('#mList').hidden = !on; $('#mInfo').hidden = !on; $('#roll').hidden = on;
  $('#diffLbl').textContent = on ? 'Numer komnaty' : 'Trudność';
  mGrid.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', on && +b.dataset.m === state.diff));
  if (!on) return;
  const m = MISTRZ[state.diff];
  $('#mInfo').innerHTML = `<h2 class="section-heading">M${state.diff} · ${esc(m.name)}</h2>
    <dl class="km-mdl">
      <div><dt>Cel</dt><dd>${esc(m.cel)}</dd></div>
      <div><dt>Zasada</dt><dd>${esc(m.zasada)}</dd></div>
      <div><dt>Pułapka</dt><dd>${esc(m.pulapka)}</dd></div>
      <div><dt>Tempo (hipoteza)</dt><dd>${esc(m.tempo)}. Nikt jeszcze tego nie zmierzył.</dd></div>
      <div><dt>W Minecrafcie</dt><dd>${esc(m.gra)} <span class="badge wait">do sprawdzenia przez Piotrka</span></dd></div>
    </dl>`;
}

function toForm() {
  form.type.value = state.type; form.diff.value = state.diff; form.theme.value = state.theme;
  $('#code').value = encode(state);
}
function fromForm() { state = { type: form.type.value, diff: +form.diff.value, theme: form.theme.value, seed: state.seed }; }

function showDiff() {
  const d = +form.diff.value;
  $('#diffNum').textContent = form.type.value === 'mistrz' ? 'M' + d : d;
  $('#diffName').textContent = form.type.value === 'mistrz' ? MISTRZ[d].name : NAMES[d];
  $('#diffNum').style.color = d >= 9 ? 'var(--redstone)' : d >= 7 ? 'var(--gold)' : 'var(--emerald)';
  $('#skulls').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < d ? 'on' : ''} ${i >= 8 ? 'red' : ''}" style="--i:${i}"></i>`).join('');
}

async function build(animate = true) {
  room = generate(state);
  const code = encode(state);
  $('#code').value = code; $('#playLink').href = 'parkour.html#' + code; store.set('komnata', state);
  try { history.replaceState(null, '', '#' + code); } catch { /* podgląd bez historii */ }
  const T = THEMES[state.theme];
  $('#kTitle').textContent = `${kindName(state.type)} · ${T.name}`;
  $('#kSize').textContent = ` · ${room.size.join('×')} · ${room.blocks.length.toLocaleString('pl-PL')} bloków`;
  const i = room.info;
  mistrzUI();
  const cells = state.type === 'mistrz'
    ? [['Mechanika', i.mechanika], ['Skoki', i.skoki], ['Pod spodem', i.dno], ['Kod', code]]
    : state.type === 'labirynt'
    ? [['Komórki', i.komorki], ['Wysokość ścian', i.wysokosc], ['Wymiary', `${room.size[0]}×${room.size[2]}`], ['Kod', code]]
    : state.type === 'gora'
      ? [['Skoki', i.skoki], ['Wysokość', i.wysokosc + ' bloków'], ['Pod spodem', i.dno], ['Kod', code]]
      : [['Skoki', i.skoki], ['Punkty kontrolne', i.punkty], ['Pod spodem', i.dno], ['Kod', code]];
  $('#stats').innerHTML = cells.map(([k, v]) => `<div class="panel"><span>${k}</span><b>${v}</b></div>`).join('');
  $('#fnCmd').innerHTML = `<span class="pr">›</span> <span class="hk">/function</span> kilekcraft:${startFn()}`;
  $('#fnModes').innerHTML = modesHTML(fnName());
  const mechanics = $('#kmMechanics');
  mechanics.hidden = !mechanicRoom(state);
  if (!mechanics.hidden) {
    $('#kmMechanicActions').textContent = ['/runda', '/reset', '/stop', '/sprzataj'].map(action => '/function kilekcraft:' + fnName() + action).join('\n');
    mechanicStatus();
  }
  if (viewer) { viewer.setBuild(room); if (animate && !reduced) viewer.animateBuild(Math.min(3500, 1200 + room.size[1] * 120)); }
  award('komnata:' + code, 10); badge('komnata');
  if (state.diff >= 9) badge('hardcore');
}
const fnName = () => safeName('komnata_' + encode(state).replace(/-/g, '_'));
const startFn = () => fnName() + (mechanicRoom(state) ? '/przygotuj' : '');
function mechanicStatus() {
  const code = encode(state);
  const labels = ['vanilla', 'paper'].map(engine => {
    const entry = mechanicChecks?.[engine]?.wyniki?.komnaty_mechanika;
    return entry?.ok && entry.zweryfikowane?.includes(code) ? engine + ' ' + esc(entry.wersja) : '';
  });
  $('#kmMechanicStatus').innerHTML = labels.every(Boolean)
    ? `<span class="badge ok">mechaniki sprawdzone w CI · ${labels.join(' · ')}</span>`
    : '<span class="badge wait">mechaniki czekają na test</span>';
}

form.addEventListener('input', (e) => { if (e.target.id === 'code') return; fromForm(); showDiff(); build(); });
$('#roll').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 99999) + 1; build(); });
$('#load').addEventListener('click', () => { const d = decode($('#code').value); if (!d) { toast('Ten kod wygląda źle. Wzór: P8-N-4821'); return; } state = d; toForm(); showDiff(); build(); });
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#load').click(); } });
$('#replay').addEventListener('click', () => viewer && viewer.animateBuild(Math.min(3500, 1200 + room.size[1] * 120)));
$('#copyFn').addEventListener('click', (e) => copyText('/function kilekcraft:' + startFn(), e.currentTarget));
$('#dl').addEventListener('click', async (e) => {
  const title = 'komnata ' + encode(state).replace(/-/g, ' ');
  const name = fnName();
  const extra = mechanicRoom(state) ? roomFiles(room, title) : [];
  const { blob } = await datapack(room.blocks, title, { extra });
  download(blob, `kilekcraft_${name}.zip`);
  const r = e.currentTarget.getBoundingClientRect();
  award('km:eksport', 30, { from: { x: r.left + r.width / 2, y: r.top } });
  toast('Datapack gotowy. Jeśli plik się nie pobrał, otwórz stronę w zwykłej przeglądarce.');
});
packStatusHTML().then(h => { $('#packStatus').innerHTML = h; });
fetch('data/testy.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(report => {
  mechanicChecks = report.silniki;
  if (mechanicRoom(state)) mechanicStatus();
}).catch(() => {});

toForm(); showDiff(); await build(false);
const { createViewer } = await import('./voxel.js');
viewer = await createViewer($('#viewer'), room, { ghost: false, layerPlane: false });
if (viewer) { $('#poster').remove(); if (!reduced) viewer.animateBuild(2600); }
else $('#poster').textContent = 'Twoja przeglądarka nie pokazuje 3D. Komnatę nadal pobierzesz jako datapack.';
