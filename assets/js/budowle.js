// =========================================================
// KILEKCRAFT — przeglądarka budowli warstwa po warstwie.
// =========================================================
import { store, reduced, xpBurst, award, badge, copyText, toast } from './core.js';
import { datapack, download, safeName, packStatusHTML, exportPanelHTML, modesHTML } from './export.js';
import { BUILDS, BLOCKS, KATEGORIE, getBuild } from './builds.js';

const $ = (s) => document.querySelector(s);
const modelFromHash = () => BUILDS.find(build => build.id === location.hash.slice(1));
const startModel = modelFromHash();
let b = getBuild(startModel?.id || store.get('build', 'miecz')), id = b.id, L = Infinity, viewer = null, matMode = 'all';

// ---------- kategorie i wybór budowli ----------
const picker = $('#picker'), katBar = $('#kategorie');
const katName = (k) => (KATEGORIE.find(x => x.id === k) || {}).name || '';
// Domyślnie widać kategorię wybranej budowli, żeby podgląd 3D był blisko kart.
let kat = store.get('build:kat', null);
if (startModel || kat !== 'all') kat = b.kat;
katBar.innerHTML = [{ id: 'all', name: 'Wszystkie' }, ...KATEGORIE].map(k => {
  const n = k.id === 'all' ? BUILDS.length : BUILDS.filter(x => x.kat === k.id).length;
  return `<button type="button" class="tab" data-k="${k.id}" aria-pressed="${k.id === kat}">${k.name} <small>${n}</small></button>`;
}).join('');
function renderPicker() {
  const list = BUILDS.filter(x => kat === 'all' || x.kat === kat);
  picker.innerHTML = list.map(x => `<button role="tab" class="pick" data-id="${x.id}" aria-selected="${x.id === id}"><span class="pn">${String(BUILDS.indexOf(x) + 1).padStart(2, '0')} · ${katName(x.kat)}</span><b>${x.name}</b><span class="pd">${x.desc}</span></button>`).join('');
}
function showCategory(category) {
  kat = category;
  store.set('build:kat', kat);
  katBar.querySelectorAll('[data-k]').forEach(button => button.setAttribute('aria-pressed', button.dataset.k === kat));
  renderPicker();
}
function showModel(model) {
  if (kat !== 'all' && kat !== model.kat) showCategory(model.kat);
  choose(model.id);
}
addEventListener('hashchange', () => {
  const model = modelFromHash();
  if (model) {
    if (kat !== model.kat) showCategory(model.kat);
    choose(model.id);
  }
});
function choose(newId) {
  id = newId; store.set('build', id); history.replaceState(null, '', '#' + id);
  picker.querySelectorAll('.pick').forEach(p => p.setAttribute('aria-selected', p.dataset.id === id));
  b = getBuild(id); load(true);
}
renderPicker();
katBar.addEventListener('click', (e) => {
  const t = e.target.closest('[data-k]'); if (!t) return;
  showCategory(t.dataset.k);
  const first = picker.querySelector('.pick');
  if (first && !picker.querySelector(`[data-id="${id}"]`)) choose(first.dataset.id);
});
picker.addEventListener('click', (e) => {
  const t = e.target.closest('.pick'); if (!t) return;
  choose(t.dataset.id);
});

const clips = $('#filmy');
clips.addEventListener('play', ({ target }) => {
  clips.querySelectorAll('video').forEach(video => { if (video !== target) video.pause(); });
}, true);
clips.addEventListener('click', event => {
  const button = event.target.closest('button[data-model]');
  if (!button) return;
  const model = BUILDS.find(build => build.id === button.dataset.model);
  if (!model) return;
  clips.querySelectorAll('video').forEach(video => video.pause());
  showModel(model);
  const tab = picker.querySelector('[aria-selected=true]');
  tab.focus({ preventScroll: true });
  tab.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
});

// ---------- warstwy ----------
const slider = $('#layer');
const layerOf = (y) => b.blocks.filter(bl => bl[1] === y);
function setL(v, fromSlider) {
  const max = b.size[1] - 1;
  L = v === Infinity || v >= max ? Infinity : Math.max(0, v);
  const shown = L === Infinity ? max : L;
  if (!fromSlider) slider.value = shown;
  $('#lNum').textContent = shown + 1; $('#lMax').textContent = `z ${max + 1}`;
  viewer && viewer.setLayer(L === Infinity ? Infinity : L);
  drawMap(shown); mats(shown);
}
function toLayerMode() { if (matMode !== 'layer') { matMode = 'layer'; document.querySelectorAll('.mat-tabs .tab').forEach(x => x.setAttribute('aria-pressed', x.dataset.m === 'layer')); } }
slider.addEventListener('input', () => { toLayerMode(); setL(+slider.value, true); if (+slider.value === 0 && award('warstwy:' + b.id, 15)) badge('warstwa'); });
$('#up').addEventListener('click', () => toLayerMode() || setL((L === Infinity ? b.size[1] - 1 : L) + 1));
$('#down').addEventListener('click', () => toLayerMode() || setL((L === Infinity ? b.size[1] - 1 : L) - 1));
addEventListener('keydown', (e) => { if (e.target.closest('input,select,textarea')) return; if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); $('#up').click(); } if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); $('#down').click(); } });

// ---------- mapa z góry ----------
const map = $('#map'), mx = map.getContext('2d');
function drawMap(y) {
  const [sx, , sz] = b.size, dpr = Math.min(devicePixelRatio || 1, 2);
  const box = map.parentElement;
  const style = getComputedStyle(box);
  const available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const cell = Math.max(2, Math.floor((available - 2) / Math.max(sx, sz)));
  map.width = sx * cell * dpr; map.height = sz * cell * dpr; map.style.height = (sz * cell) + 'px'; map.style.width = (sx * cell) + 'px';
  mx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mx.fillStyle = '#070b16'; mx.fillRect(0, 0, sx * cell, sz * cell);
  mx.strokeStyle = 'rgba(110,150,255,.08)';
  for (let i = 0; i <= sx; i++) { mx.beginPath(); mx.moveTo(i * cell + .5, 0); mx.lineTo(i * cell + .5, sz * cell); mx.stroke(); }
  for (let j = 0; j <= sz; j++) { mx.beginPath(); mx.moveTo(0, j * cell + .5); mx.lineTo(sx * cell, j * cell + .5); mx.stroke(); }
  mx.globalAlpha = .22;
  for (const [x, yy, z, t] of b.blocks) if (yy === y - 1) { mx.fillStyle = BLOCKS[t].c; mx.fillRect(x * cell, z * cell, cell, cell); }
  mx.globalAlpha = 1;
  for (const [x, yy, z, t] of b.blocks) if (yy === y) { mx.fillStyle = BLOCKS[t].c; mx.fillRect(x * cell + .5, z * cell + .5, cell - 1, cell - 1); }
  // co 5 kratek mocniejsza linia, żeby łatwiej liczyć bloki
  mx.strokeStyle = 'rgba(255,61,61,.35)';
  for (let i = 0; i <= sx; i += 5) { mx.beginPath(); mx.moveTo(i * cell + .5, 0); mx.lineTo(i * cell + .5, sz * cell); mx.stroke(); }
  for (let j = 0; j <= sz; j += 5) { mx.beginPath(); mx.moveTo(0, j * cell + .5); mx.lineTo(sx * cell, j * cell + .5); mx.stroke(); }
}

// ---------- materiały ----------
const stacks = (n) => {
  const s = Math.floor(n / 64), r = n % 64;
  if (n >= 64 * 27) { const box = Math.floor(n / (64 * 27)); return `${box} shulk. + ${Math.floor((n % (64 * 27)) / 64)}×64`; }
  return s ? `${s}×64${r ? ' + ' + r : ''}` : '';
};
document.querySelectorAll('.mat-tabs .tab').forEach(t => t.addEventListener('click', () => {
  matMode = t.dataset.m; document.querySelectorAll('.mat-tabs .tab').forEach(x => x.setAttribute('aria-pressed', x === t)); mats(L === Infinity ? b.size[1] - 1 : L);
}));
function mats(y) {
  const list = matMode === 'layer' ? layerOf(y) : b.blocks;
  const cnt = {}; for (const bl of list) cnt[bl[3]] = (cnt[bl[3]] || 0) + 1;
  const done = store.get('mats:' + b.id + ':' + (matMode === 'layer' ? y : 'all'), {});
  const rows = Object.entries(cnt).sort((a, c) => c[1] - a[1]);
  $('#mats').innerHTML = rows.length ? rows.map(([t, n]) => {
    const B = BLOCKS[t];
    return `<li class="${done[t] ? 'done' : ''}"><label><input type="checkbox" data-t="${t}" ${done[t] ? 'checked' : ''}><i style="background:${B.c}"></i><span class="mn">${B.name}${B.noCount ? '' : ''}</span><span class="mc">${B.noCount ? '—' : n}</span><span class="ms muted">${B.noCount ? '' : stacks(n)}</span></label></li>`;
  }).join('') : '<li class="muted">Ta warstwa jest pusta.</li>';
  $('#mats').onchange = (e) => {
    const t = e.target.dataset.t; if (!t) return; done[t] = e.target.checked;
    store.set('mats:' + b.id + ':' + (matMode === 'layer' ? y : 'all'), done);
    e.target.closest('li').classList.toggle('done', e.target.checked);
    if (e.target.checked) { const r = e.target.getBoundingClientRect(); xpBurst(r.left + 8, r.top + 8, 8); award('mat:' + b.id + ':' + t, 2, { from: { x: r.left, y: r.top } }); }
  };
}

// ---------- 3D ----------
const host = $('#viewer');
async function load(animate) {
  $('#bName').textContent = b.name;
  $('#bSize').textContent = ` · ${b.size[0]}×${b.size[1]}×${b.size[2]} · ${b.blocks.filter(x => !BLOCKS[x[3]].noCount).length.toLocaleString('pl-PL')} bloków`;
  slider.max = b.size[1] - 1;
  expUpdate();
  if (viewer) viewer.setBuild(b);
  setL(Infinity);
  if (animate && viewer && !reduced) build3d();
}
function build3d() {
  const duration = Math.min(4200, 900 + b.size[1] * 55);
  viewer.animateBuild(duration, () => setL(Infinity), layer => {
    if (layer === Infinity) return;
    const shown = Math.max(0, layer);
    slider.value = shown;
    $('#lNum').textContent = shown + 1;
  });
}
// ---------- datapack: postaw na serwerze ----------
const fnOf = () => safeName(b.short);
function expUpdate() {
  $('#bdExpName').textContent = b.short.toLowerCase();
  $('#fnCmd').innerHTML = `<span class="pr">›</span> <span class="hk">/function</span> kilekcraft:${fnOf()}/animacja`;
  $('#fnModes').innerHTML = modesHTML(fnOf());
  const wet = b.blocks.some(x => x[3] === 'lava' || x[3] === 'water');
  $('#bdWarn').hidden = !wet;
  if (wet) $('#bdWarn').textContent = 'Ta budowla ma lawę albo wodę. W grze będą płynąć, więc stawiaj ją z dala od drewna i domów.';
  const want = b.id;
  packStatusHTML(b.blocks.map(x => BLOCKS[x[3]].id)).then(h => { if (b.id === want) $('#packStatus').innerHTML = h; });
}
$('#expHelp').innerHTML = exportPanelHTML();
$('#copyFn').addEventListener('click', (e) => copyText(`/function kilekcraft:${fnOf()}/animacja`, e.currentTarget));
$('#dl').addEventListener('click', async (e) => {
  const button = e.currentTarget, model = b;
  const { blob, name } = await datapack(model.blocks, model.short);
  download(blob, `kilekcraft_${name}.zip`);
  const r = button.getBoundingClientRect();
  award('bd:eksport:' + model.id, 30, { from: { x: r.left + r.width / 2, y: r.top } });
  toast('Datapack gotowy. Jeśli plik się nie pobrał, otwórz stronę w zwykłej przeglądarce.');
});

const play = $('#play');
play.disabled = true;
play.addEventListener('click', () => viewer && !reduced && build3d());
if (reduced) play.hidden = true;
$('#all').addEventListener('click', () => { matMode = 'all'; document.querySelectorAll('.mat-tabs .tab').forEach(x => x.setAttribute('aria-pressed', x.dataset.m === 'all')); setL(Infinity); });

load(false);
const loadViewer = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  loadViewer.disconnect();
  const { createViewer } = await import('./voxel.js');
  const initial = b;
  viewer = await createViewer(host, initial, { ghost: true, layerPlane: true });
  if (viewer) {
    if (b !== initial) viewer.setBuild(b);
    $('#poster').remove();
    play.disabled = false;
    setL(L);
    if (L === Infinity && !reduced) build3d();
  } else {
    play.hidden = true;
    $('#poster').textContent = 'Twoja przeglądarka nie pokazuje 3D. Użyj mapy warstw obok, bo działa tak samo.';
  }
}, { rootMargin: '40px' });
loadViewer.observe(host);
addEventListener('resize', () => drawMap(L === Infinity ? b.size[1] - 1 : L));
