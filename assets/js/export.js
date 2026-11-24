// =========================================================
// KILEKCRAFT — eksport budowli do Minecrafta.
// Budowla → komendy setblock/fill → datapack (.zip) z funkcją.
// Ten sam algorytm jest w tools/test_commands.py (export_lines),
// który sprawdza datapack na prawdziwym serwerze. Zmieniaj oba naraz.
// =========================================================
import { BLOCKS } from './builds.js';

export const OFFSET_X = 2; // budowla stoi 2 bloki obok gracza, żeby go nie zasypać

// Łączy sąsiednie bloki tego samego typu w rzędzie (oś X) w jedną komendę fill.
export function exportLines(blocks) {
  const rows = new Map();
  for (const [x, y, z, t] of blocks) {
    const b = BLOCKS[t]; if (!b || !b.id) continue; // portal itp. pomijamy
    const k = y + ',' + z + ',' + b.id;
    (rows.get(k) || rows.set(k, []).get(k)).push(x);
  }
  const out = [];
  const keys = [...rows.keys()].sort((a, c) => {
    const [ya, za] = a.split(',').map(Number), [yc, zc] = c.split(',').map(Number);
    return ya - yc || za - zc || (a < c ? -1 : 1);
  });
  for (const k of keys) {
    const [y, z, id] = [Number(k.split(',')[0]), Number(k.split(',')[1]), k.split(',')[2]];
    const xs = rows.get(k).sort((a, c) => a - c);
    let s = xs[0], p = xs[0];
    const flush = () => out.push(s === p
      ? `setblock ~${s + OFFSET_X} ~${y} ~${z} ${id}`
      : `fill ~${s + OFFSET_X} ~${y} ~${z} ~${p + OFFSET_X} ~${y} ~${z} ${id}`);
    for (let i = 1; i < xs.length; i++) { if (xs[i] === p + 1) p = xs[i]; else { flush(); s = p = xs[i]; } }
    flush();
  }
  return out;
}

export function safeName(s) {
  const map = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };
  const n = (s || 'budowla').toLowerCase().replace(/[ąćęłńóśźż]/g, c => map[c]).replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
  return n || 'budowla';
}

// ---------- budowanie w grze jak film: warstwa po warstwie ----------
// Każda warstwa (wysokość y) ma swoją funkcję. Niewidzialny znacznik (marker) zapamiętuje
// miejsce startu, więc kolejne warstwy stają zawsze w tym samym miejscu, nawet gdy gracz odejdzie.
// Lustro: tools/test_commands.py (layer_functions). Zmieniaj oba naraz.
export const OBJ = 'kc_warstwa';
export function layerFunctions(blocks, title) {
  const name = safeName(title), tag = 'kc_' + name, who = '#' + name, fn = (f) => `kilekcraft:${name}/${f}`;
  const at = `at @e[type=minecraft:marker,tag=${tag},limit=1]`;
  const ys = [...new Set(blocks.filter(b => BLOCKS[b[3]] && BLOCKS[b[3]].id).map(b => b[1]))].sort((a, c) => a - c);
  const n = ys.length;
  if (!n) return [];
  const files = [];
  ys.forEach((y, i) => {
    const lines = exportLines(blocks.filter(b => b[1] === y));
    files.push([`warstwa_${i + 1}`, [...lines, `title @a actionbar {"text":"Warstwa ${i + 1} z ${n}","color":"gold"}`]]);
    files.push([`usun_${i + 1}`, lines.map(l => l.replace(/ \S+$/, ' minecraft:air'))]);
  });
  files.push(['start', [
    `kill @e[type=minecraft:marker,tag=${tag}]`,
    `summon minecraft:marker ~ ~ ~ {Tags:["${tag}"]}`,
    `scoreboard objectives add ${OBJ} dummy`,
    `scoreboard players set ${who} ${OBJ} 0`,
    `title @s actionbar {"text":"Start zapamiętany. Warstw: ${n}","color":"green"}`,
  ]]);
  files.push(['nastepna', [
    `scoreboard players add ${who} ${OBJ} 1`,
    `execute if score ${who} ${OBJ} matches ${n + 1}.. run scoreboard players set ${who} ${OBJ} ${n}`,
    ...ys.map((_, i) => `execute if score ${who} ${OBJ} matches ${i + 1} ${at} run function ${fn('warstwa_' + (i + 1))}`),
  ]]);
  files.push(['cofnij', [
    ...ys.map((_, i) => `execute if score ${who} ${OBJ} matches ${i + 1} ${at} run function ${fn('usun_' + (i + 1))}`),
    `execute if score ${who} ${OBJ} matches 1.. run scoreboard players remove ${who} ${OBJ} 1`,
  ]]);
  files.push(['animacja', [`function ${fn('start')}`, `schedule function ${fn('krok')} 10t`]]);
  files.push(['krok', [`function ${fn('nastepna')}`, `execute if score ${who} ${OBJ} matches ..${n - 1} run schedule function ${fn('krok')} 10t`]]);
  files.push(['koniec', [
    `schedule clear ${fn('krok')}`,
    `kill @e[type=minecraft:marker,tag=${tag}]`,
    `scoreboard players reset ${who} ${OBJ}`,
  ]]);
  return files.map(([f, lines]) => ({ path: `${name}/${f}.mcfunction`, text: lines.join('\n') + '\n' }));
}

// Krótka ściąga komend do pokazania pod przyciskiem „Pobierz datapack”
export function modesHTML(title) {
  const n = safeName(title), c = (f, t) => `<li><code>/function kilekcraft:${n}${f}</code> ${t}</li>`;
  return `<ul class="fn-modes">
    ${c('', 'cała budowla od razu')}
    ${c('/animacja', 'buduje się sama, warstwa co pół sekundy, jak na filmie')}
    ${c('/start', 'zapamiętuje miejsce startu, potem:')}
    ${c('/nastepna', 'stawia następną warstwę')}
    ${c('/cofnij', 'zabiera ostatnią warstwę')}
    ${c('/koniec', 'kończy animację i usuwa znacznik. Użyj po ostatnim cofnięciu')}
  </ul>`;
}

export function mcfunction(blocks, title) {
  const lines = exportLines(blocks);
  const hasPortal = blocks.some(b => b[3] === 'portal');
  return [
    `# KILEKCRAFT: ${title}`,
    `# Postaw się w miejscu startu i wpisz: /function kilekcraft:${safeName(title)}`,
    `# Budowla pojawi się ${OFFSET_X} bloki w stronę +X (na wschód) od ciebie.`,
    `# Jak film: /function kilekcraft:${safeName(title)}/animacja`,
    `# Krok po kroku: /function kilekcraft:${safeName(title)}/start, potem /nastepna albo /cofnij`,
    hasPortal ? '# Portal zapal krzesiwem, bo komenda go nie stawia.' : null,
    ...lines,
  ].filter(Boolean).join('\n') + '\n';
}

// ---------- ZIP (bez kompresji, wystarczy dla Minecrafta) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export function zip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const csize = central.reduce((s, p) => s + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
}

let PACK = null;
export async function packInfo() {
  if (PACK) return PACK;
  try { PACK = await (await fetch('data/datapack.json')).json(); } catch { PACK = { pack: { pack_format: 95 }, sprawdzone: false }; }
  return PACK;
}

// Status z testu na serwerze: osobno cały datapack, budowanie warstwami
// i (gdy podasz identyfikatory bloków budowli) paleta bloków.
export async function packStatusHTML(blockIds = null) {
  const p = await packInfo();
  let res = null; try { res = (await (await fetch('data/testy.json', { cache: 'no-store' })).json())?.wyniki || null; } catch { /* brak */ }
  const w = res?.warstwy || null;
  const all = p.sprawdzone ? `<span class="badge ok">sprawdzone · ${p.wersja}</span>` : '<span class="badge wait">datapack czeka na test</span>';
  const lay = w && w.ok ? `<span class="badge ok" title="start, nastepna, cofnij i animacja">warstwy sprawdzone · ${w.wersja}</span>` : '<span class="badge wait" title="Funkcje warstwa po warstwie czekają na test na serwerze">warstwy czekają na test</span>';
  let pal = '';
  const ids = [...new Set(blockIds ?? [])].filter(Boolean);
  if (ids.length) {
    const okIds = new Set(res?.paleta?.zweryfikowane || []);
    const wait = ids.filter(id => !okIds.has(id));
    pal = wait.length ? `<span class="badge wait" title="${wait.join(', ')}">${wait.length === 1 ? '1 blok czeka' : wait.length + ' bloków czeka'} na test</span>`
      : `<span class="badge ok" title="każdy blok tej budowli postawiony na serwerze">bloki sprawdzone · ${res.paleta.wersja}</span>`;
  }
  return all + ' ' + lay + (pal ? ' ' + pal : '');
}

export async function datapack(blocks, title, { extra = [], info = null } = {}) {
  info ??= await packInfo();
  const name = safeName(title);
  const meta = { pack: { description: `KILEKCRAFT: ${title}`, ...info.pack } };
  return { name, blob: zip([
    { name: 'pack.mcmeta', data: JSON.stringify(meta, null, 2) },
    { name: `data/kilekcraft/function/${name}.mcfunction`, data: mcfunction(blocks, title) },
    ...layerFunctions(blocks, title).map(f => ({ name: `data/kilekcraft/function/${f.path}`, data: f.text })),
    ...extra,
  ]) };
}

export function download(blob, filename) {
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch { return false; }
}

// Wspólny panel eksportu (edytor i komnaty)
export function exportPanelHTML() {
  return `<div class="exp-steps">
    <p><b>Jak to wgrać na serwer:</b></p>
    <p class="muted small" style="margin:0 0 6px">Zrób najpierw kopię zapasową świata. Komenda nadpisze bloki w tym miejscu.</p>
    <ol>
      <li>Kliknij <b>Pobierz datapack</b>. Dostaniesz plik <code>.zip</code>.</li>
      <li>Wgraj go <b>bez rozpakowywania</b> do folderu <code>world/datapacks/</code> na serwerze (w panelu hostingu: Pliki).</li>
      <li>Zrestartuj serwer w panelu. Potem w grze stań w miejscu startu i wpisz komendę z ramki wyżej. Potrzebujesz OP.</li>
    </ol>
    <p class="muted small" style="margin:6px 0 0">Chcesz zobaczyć, jak rośnie? Wpisz wersję z <b>/animacja</b>. Albo stawiaj sam warstwa po warstwie: <b>/start</b>, potem <b>/nastepna</b> i <b>/cofnij</b>. Pełna lista jest wyżej.</p>
  </div>`;
}
