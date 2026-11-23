// =========================================================
// KILEKCRAFT — strona generatora komnat.
// =========================================================
import { store, reduced, copyText, toast, award, badge } from './core.js';
import { generate, encode, decode, THEMES } from './komnaty-gen.js';
import { datapack, download, safeName, packInfo, exportPanelHTML } from './export.js';

const $ = (s) => document.querySelector(s);
const form = $('#form');
const NAMES = ['', 'Rozgrzewka', 'Rozgrzewka', 'Łatwa', 'Wyzwanie', 'Wyzwanie', 'Wyzwanie', 'Trudna', 'Bardzo trudna', 'Bez litości', 'Bez litości'];

$('#themes').innerHTML = Object.entries(THEMES).map(([id, t], i) => `<label class="chip"><input type="radio" name="theme" value="${id}" ${i === 0 ? 'checked' : ''}><span>${t.name}</span></label>`).join('');
$('#expHelp').innerHTML = exportPanelHTML();

let state = decode(location.hash.slice(1)) || store.get('komnata') || { type: 'parkour', diff: 5, theme: 'kamien', seed: 4821 };
let room = null, viewer = null;

function toForm() {
  form.type.value = state.type; form.diff.value = state.diff; form.theme.value = state.theme;
  $('#code').value = encode(state);
}
function fromForm() { state = { type: form.type.value, diff: +form.diff.value, theme: form.theme.value, seed: state.seed }; }

function showDiff() {
  const d = +form.diff.value;
  $('#diffNum').textContent = d; $('#diffName').textContent = NAMES[d];
  $('#diffNum').style.color = d >= 9 ? 'var(--redstone)' : d >= 7 ? 'var(--gold)' : 'var(--emerald)';
  $('#skulls').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < d ? 'on' : ''} ${i >= 8 ? 'red' : ''}" style="--i:${i}"></i>`).join('');
}

async function build(animate = true) {
  room = generate(state);
  const code = encode(state);
  $('#code').value = code; $('#playLink').href = 'parkour.html#' + code; store.set('komnata', state);
  try { history.replaceState(null, '', '#' + code); } catch { /* podgląd bez historii */ }
  const T = THEMES[state.theme];
  $('#kTitle').textContent = `${state.type === 'labirynt' ? 'Labirynt' : 'Parkour'} · ${T.name}`;
  $('#kSize').textContent = ` · ${room.size.join('×')} · ${room.blocks.length.toLocaleString('pl-PL')} bloków`;
  const i = room.info;
  const cells = state.type === 'labirynt'
    ? [['Komórki', i.komorki], ['Wysokość ścian', i.wysokosc], ['Wymiary', `${room.size[0]}×${room.size[2]}`], ['Kod', code]]
    : [['Skoki', i.skoki], ['Punkty kontrolne', i.punkty], ['Pod spodem', i.dno], ['Kod', code]];
  $('#stats').innerHTML = cells.map(([k, v]) => `<div class="panel"><span>${k}</span><b>${v}</b></div>`).join('');
  $('#fnCmd').innerHTML = `<span class="pr">›</span> <span class="hk">/function</span> kilekcraft:${fnName()}`;
  if (viewer) { viewer.setBuild(room); if (animate && !reduced) viewer.animateBuild(Math.min(3500, 1200 + room.size[1] * 120)); }
  award('komnata:' + code, 10); badge('komnata');
  if (state.diff >= 9) badge('hardcore');
}
const fnName = () => safeName('komnata_' + encode(state).replace(/-/g, '_'));

form.addEventListener('input', (e) => { if (e.target.id === 'code') return; fromForm(); showDiff(); build(); });
$('#roll').addEventListener('click', () => { state.seed = Math.floor(Math.random() * 99999) + 1; build(); });
$('#load').addEventListener('click', () => { const d = decode($('#code').value); if (!d) { toast('Ten kod wygląda źle. Wzór: P8-N-4821'); return; } state = d; toForm(); showDiff(); build(); });
$('#code').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#load').click(); } });
$('#replay').addEventListener('click', () => viewer && viewer.animateBuild(Math.min(3500, 1200 + room.size[1] * 120)));
$('#copyFn').addEventListener('click', (e) => copyText('/function kilekcraft:' + fnName(), e.currentTarget));
$('#dl').addEventListener('click', async (e) => {
  const title = 'komnata ' + encode(state).replace(/-/g, ' ');
  const { blob } = await datapack(room.blocks, title);
  download(blob, `kilekcraft_${fnName()}.zip`);
  const r = e.currentTarget.getBoundingClientRect();
  award('km:eksport', 30, { from: { x: r.left + r.width / 2, y: r.top } });
  toast('Datapack gotowy. Jeśli plik się nie pobrał, otwórz stronę w zwykłej przeglądarce.');
});
packInfo().then(p => { $('#packStatus').innerHTML = p.sprawdzone ? `<span class="badge ok">sprawdzone · ${p.wersja}</span>` : '<span class="badge wait">datapack czeka na test</span>'; });

toForm(); showDiff(); await build(false);
const { createViewer } = await import('./voxel.js');
viewer = await createViewer($('#viewer'), room, { ghost: false, layerPlane: false });
if (viewer) { $('#poster').remove(); if (!reduced) viewer.animateBuild(2600); }
else $('#poster').textContent = 'Twoja przeglądarka nie pokazuje 3D. Komnatę nadal pobierzesz jako datapack.';
