// =========================================================
// KILEKCRAFT — MOTD (opis serwera) i ikona 64×64.
// motdRaw/motdProperty mają lustro w tools/test_commands.py (motd_property).
// =========================================================
import { store, copyText, award, sfx } from './core.js';
import { download } from './export.js';

const $ = (s) => document.querySelector(s);
export const CODES = { '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA', '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA', '8': '#555555', '9': '#5555FF', a: '#55FF55', b: '#55FFFF', c: '#FF5555', d: '#FF55FF', e: '#FFFF55', f: '#FFFFFF' };
const STYLES = [['c', 'czerwony'], ['6', 'złoty'], ['e', 'żółty'], ['a', 'zielony'], ['b', 'błękitny'], ['9', 'niebieski'], ['d', 'różowy'], ['f', 'biały'], ['7', 'szary'], ['rainbow', 'tęcza'], ['fire', 'ogień']];
const SEQ = { rainbow: ['c', '6', 'e', 'a', 'b', '9', 'd'], fire: ['4', 'c', '6', 'e', '6', 'c'] };

let S = Object.assign({ name: 'Mój serwer', lines: [{ t: 'KILEKCRAFT LifeSteal', s: 'fire', b: true }, { t: 'Serca, sklep i komnaty!', s: '7', b: false }], on: 3, max: 20 }, store.get('motd') || {});

// ---------- generowanie ----------
export function motdRaw(lines) {
  return lines.map(({ t, s, b }) => {
    const bold = b ? '§l' : '';
    if (SEQ[s]) { let i = 0; return [...t].map(ch => ch === ' ' ? ' ' : `§${SEQ[s][i++ % SEQ[s].length]}${bold}${ch}`).join(''); }
    return t ? `§${s}${bold}${t}` : '';
  }).join('\n');
}
export function motdProperty(raw) {
  // Java odczytuje sekwencje Unicode po jednej jednostce UTF-16.
  const escapes = {"\n": "\\n", "\r": "\\r", "\t": "\\t", "\\": "\\\\", " ": "\\ "};
  return 'motd=' + raw.split('').map(ch => {
    const unit = ch.charCodeAt(0);
    return escapes[ch] ?? (unit < 32 || unit > 126 ? "\\u" + unit.toString(16).toUpperCase().padStart(4, '0') : ch);
  }).join('');
}
function renderMotd(raw) {
  return raw.split('\n').map(line => {
    let col = '#AAAAAA', bold = false, out = '';
    const parts = line.split('§');
    out += parts[0] ? `<span style="color:${col}">${esc(parts[0])}</span>` : '';
    for (const p of parts.slice(1)) {
      const c = p[0], txt = p.slice(1);
      if (CODES[c]) { col = CODES[c]; bold = false; } else if (c === 'l') bold = true;
      if (txt) out += `<span style="color:${col};${bold ? 'font-weight:700;' : ''}">${esc(txt)}</span>`;
    }
    return `<div>${out || '&nbsp;'}</div>`;
  }).join('');
}
const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- formularz ----------
document.querySelectorAll('.motd-line').forEach(el => {
  const l = +el.dataset.l;
  el.querySelector('.styles').innerHTML = STYLES.map(([id, n]) => `<label class="chip"><input type="radio" name="s${l}" value="${id}"><span>${SEQ[id] ? `<i class="sw grad ${id}"></i>` : `<i class="sw" style="background:${CODES[id]}"></i>`}${n}</span></label>`).join('') + `<label class="chip"><input type="checkbox" name="b${l}"><span><b>pogrubiony</b></span></label>`;
});
const form = $('#form');
function toForm() {
  $('#name').value = S.name; $('#on').value = S.on; $('#max').value = S.max;
  S.lines.forEach((ln, l) => { $('#t' + l).value = ln.t; form.elements['s' + l].value = ln.s; form.elements['b' + l].checked = ln.b; });
}
function update() {
  S = { name: $('#name').value, on: +$('#on').value || 0, max: Math.max(1, +$('#max').value || 20),
    lines: [0, 1].map(l => ({ t: $('#t' + l).value, s: form.elements['s' + l].value || 'f', b: form.elements['b' + l].checked })) };
  store.set('motd', S);
  const raw = motdRaw(S.lines);
  $('#pvName').textContent = S.name || 'Mój serwer';
  $('#pvMotd').innerHTML = renderMotd(raw);
  $('#pvPlayers').textContent = `${S.on}/${S.max}`;
  $('#props').textContent = motdProperty(raw) + '\nmax-players=' + S.max;
  $('#raw').textContent = raw;
}
form.addEventListener('input', update);
$('#copyProps').addEventListener('click', (e) => { copyText($('#props').textContent, e.currentTarget); award('motd:kopia', 15); });
$('#copyRaw').addEventListener('click', (e) => copyText($('#raw').textContent, e.currentTarget));
fetch('data/testy.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(t => {
  const m = t?.wyniki?.motd;
  $('#motdStatus').innerHTML = m?.ok ? `<span class="badge ok">sprawdzone · ${esc(m.wersja)}</span>` : '<span class="badge wait">czeka na test</span>';
}).catch(() => {});

// ---------- ikona 16×16 → 64×64 ----------
const PAL = ['#ff3d3d', '#a3121a', '#ffc94a', '#2ee59d', '#14a46c', '#5cc8ff', '#2c3fa8', '#a06bff', '#ffffff', '#9daccc', '#4a5578', '#141e35', '#000000', '#b48a52', '#6b4f2c', null];
const N = 16, pix = $('#pix'), px = pix.getContext('2d'), prev = $('#iconPrev'), pv = prev.getContext('2d');
const HEART = ['................', '................', '...XX....XX.....', '..XXXX..XXXX....', '.XXXXXXXXXXXX...', '.XXXXXXXXXXXX...', '.XXXXXXXXXXXX...', '..XXXXXXXXXX....', '...XXXXXXXX.....', '....XXXXXX......', '.....XXXX.......', '......XX........', '................', '................', '................', '................'];
let grid = store.get('motd:ikona') || HEART.map(r => [...r].map(c => c === 'X' ? 0 : 11));
let color = 0, cursorX = 0, cursorY = 0;
$('#ipal').innerHTML = PAL.map((c, i) => `<button type="button" role="radio" class="sw-btn" data-i="${i}" aria-checked="${i === color}" tabindex="${i === color ? 0 : -1}" aria-label="${c ? 'Kolor ' + c : 'Gumka'}" style="--c:${c || 'transparent'}">${c ? '' : '✕'}</button>`).join('');
const palette = $('#ipal');
const swatches = [...palette.children];
function selectColor(index) {
  swatches[color].setAttribute('aria-checked', 'false');
  swatches[color].tabIndex = -1;
  color = index;
  swatches[color].setAttribute('aria-checked', 'true');
  swatches[color].tabIndex = 0;
}
palette.addEventListener('click', (event) => {
  const swatch = event.target.closest('.sw-btn');
  if (swatch) selectColor(+swatch.dataset.i);
});
palette.addEventListener('keydown', (event) => {
  const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
  if (!offset) return;
  event.preventDefault();
  selectColor((color + offset + PAL.length) % PAL.length);
  swatches[color].focus();
});
function describeCell() {
  const fill = PAL[grid[cursorY][cursorX]] || 'przezroczysta';
  $('#pixCell').textContent = `Kolumna ${cursorX + 1}, wiersz ${cursorY + 1}, ${fill}`;
}
function drawIcon() {
  const s = pix.width / N; px.clearRect(0, 0, pix.width, pix.height);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = PAL[grid[y][x]];
    px.fillStyle = c || ((x + y) % 2 ? '#1b2440' : '#141e35'); px.fillRect(x * s, y * s, s, s);
  }
  px.strokeStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i <= N; i++) { px.beginPath(); px.moveTo(i * s + .5, 0); px.lineTo(i * s + .5, pix.height); px.moveTo(0, i * s + .5); px.lineTo(pix.width, i * s + .5); px.stroke(); }
  pv.clearRect(0, 0, 64, 64);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = PAL[grid[y][x]]; if (c) { pv.fillStyle = c; pv.fillRect(x * 4, y * 4, 4, 4); } }
  if (document.activeElement === pix) {
    px.lineWidth = 2;
    px.strokeStyle = '#0b1020';
    px.strokeRect(cursorX * s + 1, cursorY * s + 1, s - 2, s - 2);
    px.strokeStyle = '#ffffff';
    px.strokeRect(cursorX * s + 3, cursorY * s + 3, s - 6, s - 6);
  }
}
const saveIcon = () => store.set('motd:ikona', grid);
let painting = false;
function paint(e) {
  const r = pix.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * N), y = Math.floor((e.clientY - r.top) / r.height * N);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  cursorX = x;
  cursorY = y;
  paintCell();
}
function paintCell() {
  if (grid[cursorY][cursorX] === color) return;
  grid[cursorY][cursorX] = color;
  drawIcon();
  sfx('tick');
}
pix.addEventListener('pointerdown', (e) => { painting = true; pix.setPointerCapture?.(e.pointerId); paint(e); });
pix.addEventListener('pointermove', (e) => { if (painting) paint(e); });
pix.addEventListener('lostpointercapture', () => { painting = false; saveIcon(); });
pix.addEventListener('focus', () => { drawIcon(); describeCell(); });
pix.addEventListener('blur', drawIcon);
pix.addEventListener('keydown', (event) => {
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
  if (direction) {
    event.preventDefault();
    cursorX = Math.max(0, Math.min(N - 1, cursorX + direction[0]));
    cursorY = Math.max(0, Math.min(N - 1, cursorY + direction[1]));
    drawIcon();
  } else if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    paintCell();
    saveIcon();
  } else return;
  describeCell();
});
$('#clearIcon').addEventListener('click', () => { grid = Array.from({ length: N }, () => Array(N).fill(15)); drawIcon(); saveIcon(); });
$('#fillIcon').addEventListener('click', () => { grid = grid.map(r => r.map(v => v === 15 ? color : v)); drawIcon(); saveIcon(); });
$('#dlIcon').addEventListener('click', () => {
  prev.toBlob((b) => { if (b) { download(b, 'server-icon.png'); award('motd:ikona', 20); } }, 'image/png');
});

toForm(); update(); drawIcon();
