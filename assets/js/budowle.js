// =========================================================
// KILEKCRAFT — przeglądarka budowli warstwa po warstwie.
// =========================================================
import { store, reduced, xpBurst } from './core.js';
import { BUILDS, BLOCKS, getBuild } from './builds.js';

const $ = (s) => document.querySelector(s);
let id = (location.hash || '').slice(1);
if (!BUILDS.some(b => b.id === id)) id = store.get('build', 'miecz');
let b = getBuild(id), L = Infinity, viewer = null, matMode = 'all';

// ---------- wybór budowli ----------
const picker = $('#picker');
picker.innerHTML = BUILDS.map((x, i) => `<button role="tab" class="pick" data-id="${x.id}" aria-selected="${x.id === id}"><span class="pn">0${i + 1}</span><b>${x.name}</b><span class="pd">${x.desc}</span></button>`).join('');
picker.addEventListener('click', (e) => {
  const t = e.target.closest('.pick'); if (!t) return;
  id = t.dataset.id; store.set('build', id); history.replaceState(null, '', '#' + id);
  picker.querySelectorAll('.pick').forEach(p => p.setAttribute('aria-selected', p === t));
  b = getBuild(id); load(true);
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
slider.addEventListener('input', () => { toLayerMode(); setL(+slider.value, true); });
$('#up').addEventListener('click', () => toLayerMode() || setL((L === Infinity ? b.size[1] - 1 : L) + 1));
$('#down').addEventListener('click', () => toLayerMode() || setL((L === Infinity ? b.size[1] - 1 : L) - 1));
addEventListener('keydown', (e) => { if (e.target.closest('input,select,textarea')) return; if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); $('#up').click(); } if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); $('#down').click(); } });

// ---------- mapa z góry ----------
const map = $('#map'), mx = map.getContext('2d');
function drawMap(y) {
  const [sx, , sz] = b.size, dpr = Math.min(devicePixelRatio || 1, 2);
  const W = map.clientWidth, cell = Math.max(2, Math.floor(W / Math.max(sx, sz)));
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
    if (e.target.checked) { const r = e.target.getBoundingClientRect(); xpBurst(r.left + 8, r.top + 8, 8); }
  };
}

// ---------- 3D ----------
const host = $('#viewer');
async function load(animate) {
  $('#bName').textContent = b.name;
  $('#bSize').textContent = ` · ${b.size[0]}×${b.size[1]}×${b.size[2]} · ${b.blocks.filter(x => !BLOCKS[x[3]].noCount).length.toLocaleString('pl-PL')} bloków`;
  slider.max = b.size[1] - 1;
  if (viewer) viewer.setBuild(b);
  setL(Infinity);
  if (animate && viewer && !reduced) build3d();
}
function build3d() {
  viewer.animateBuild(Math.min(4200, 900 + b.size[1] * 55));
  // suwak goni animację
  const t0 = performance.now(), dur = Math.min(4200, 900 + b.size[1] * 55);
  const step = (n) => { const p = Math.min(1, (n - t0) / dur), e = 1 - Math.pow(1 - p, 2.2), y = Math.floor(e * b.size[1]) - 1;
    if (p < 1) { slider.value = Math.max(0, y); $('#lNum').textContent = Math.max(1, y + 1); requestAnimationFrame(step); } else setL(Infinity); };
  requestAnimationFrame(step);
}
$('#play').addEventListener('click', () => viewer && build3d());
$('#all').addEventListener('click', () => { matMode = 'all'; document.querySelectorAll('.mat-tabs .tab').forEach(x => x.setAttribute('aria-pressed', x.dataset.m === 'all')); setL(Infinity); });

load(false);
const { createViewer } = await import('./voxel.js');
const initial = b;
viewer = await createViewer(host, initial, { ghost: true, layerPlane: true });
if (viewer) {
  if (b !== initial) viewer.setBuild(b);
  $('#poster').remove();
  setL(Infinity);
  if (!reduced) build3d();
} else {
  $('#poster').textContent = 'Twoja przeglądarka nie pokazuje 3D. Użyj mapy warstw obok, bo działa tak samo.';
}
addEventListener('resize', () => drawMap(L === Infinity ? b.size[1] - 1 : L));
