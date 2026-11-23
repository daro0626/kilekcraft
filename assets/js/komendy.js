// =========================================================
// KILEKCRAFT — kreator komend z podglądem.
// Logika budowania komend jest powtórzona w tools/test_commands.py,
// więc przy zmianie jednej trzeba zmienić drugą (patrz AGENTS.md).
// =========================================================
import { copyText, toast, reduced, store, split, award, badge, bump } from './core.js';

const D = await (await fetch('data/komendy.json')).json();
let TESTS = {};
try { const r = await fetch('data/testy.json', { cache: 'no-store' }); if (r.ok) TESTS = await r.json(); } catch { /* brak wyników testów */ }

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NICK = /^[A-Za-z0-9_]{3,16}$/;

let tpl = store.get('tpl', 'give'), ver = store.get('ver', 'nowa');

// ---------- wersja ----------
const verSel = $('#ver');
verSel.innerHTML = D.wersje.map(v => `<option value="${v.id}">${v.nazwa}</option>`).join('');
verSel.value = ver;
verSel.addEventListener('change', () => { ver = verSel.value; store.set('ver', ver); update(); });

// ---------- zakładki ----------
const tabs = $('#tabs');
tabs.innerHTML = D.szablony.map(s => `<button role="tab" class="tab" data-id="${s.id}" aria-selected="${s.id === tpl}"><span class="ti">${s.ikona}</span>${s.nazwa}</button>`).join('');
tabs.addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (!b) return; tpl = b.dataset.id; store.set('tpl', tpl); tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === b)); buildForm(); });

// ---------- wspólne pola ----------
const targetField = (name = 'cel', all = true) => `
  <div class="field"><span class="lbl">Dla kogo?</span>
    <div class="chips">
      <label class="chip"><input type="radio" name="${name}" value="@p" checked><span>najbliższy gracz <code>@p</code></span></label>
      ${all ? `<label class="chip"><input type="radio" name="${name}" value="@a"><span>wszyscy <code>@a</code></span></label>` : ''}
      <label class="chip"><input type="radio" name="${name}" value="@s"><span>ja <code>@s</code></span></label>
      <label class="chip"><input type="radio" name="${name}" value="nick"><span>konkretny nick</span></label>
    </div>
    <input type="text" name="nick" placeholder="np. Piotrek_PL" maxlength="16" autocomplete="off" style="margin-top:10px;display:none">
  </div>`;
const readTarget = (f) => { const v = f.get('cel'); if (v !== 'nick') return { t: v }; const n = (f.get('nick') || '').trim(); return { t: n || 'Nick', bad: !NICK.test(n) }; };

const titleTimes = { fi: 10, sy: 70, fo: 20 };
const FORMS = {
  give: () => `${targetField()}
    <div class="field"><label for="item">Przedmiot</label><select id="item" name="item">${D.przedmioty.map(p => `<option value="${p.id}">${p.nazwa}</option>`).join('')}</select></div>
    <div class="field"><label for="count">Ile sztuk: <b id="countV">1</b></label><input type="range" id="count" name="count" min="1" max="64" value="1"></div>`,
  effect: () => `${targetField()}
    <div class="field"><label for="eff">Efekt</label><select id="eff" name="eff">${D.efekty.map(p => `<option value="${p.id}">${p.nazwa}</option>`).join('')}</select></div>
    <div class="row2">
      <div class="field"><label for="sec">Czas (sekundy): <b id="secV">30</b></label><input type="range" id="sec" name="sec" min="5" max="600" step="5" value="30"></div>
      <div class="field"><label for="lvl">Poziom: <b id="lvlV">1</b></label><input type="range" id="lvl" name="lvl" min="1" max="5" value="1"></div>
    </div>
    <div class="chips"><label class="chip"><input type="checkbox" name="inf"><span>na zawsze</span></label><label class="chip"><input type="checkbox" name="hide"><span>bez bąbelków</span></label></div>`,
  title: () => `<div class="field"><label for="tt">Duży napis</label><input type="text" id="tt" name="tt" value="LIFESTEAL START!" maxlength="40"></div>
    <div class="field"><label for="st">Mały napis pod spodem (opcjonalnie)</label><input type="text" id="st" name="st" value="Zostały 3 serca. Powodzenia!" maxlength="60"></div>
    <div class="field"><span class="lbl">Kolor</span><div class="chips colors">${D.kolory_tekstu.map((c, i) => `<label class="chip"><input type="radio" name="col" value="${c.id}" ${c.id === 'gold' ? 'checked' : ''}><span><i class="sw" style="background:${c.hex}"></i>${c.nazwa}</span></label>`).join('')}</div></div>
    <div class="chips" style="margin-bottom:18px"><label class="chip"><input type="checkbox" name="bold" checked><span><b>pogrubiony</b></span></label></div>
    <div class="row3">
      <div class="field"><label for="fi">Pojawianie (ticki)</label><input type="number" id="fi" name="fi" value="${titleTimes.fi}" min="0" max="200"></div>
      <div class="field"><label for="sy">Na ekranie</label><input type="number" id="sy" name="sy" value="${titleTimes.sy}" min="0" max="600"></div>
      <div class="field"><label for="fo">Znikanie</label><input type="number" id="fo" name="fo" value="${titleTimes.fo}" min="0" max="200"></div>
    </div><p class="muted small">20 ticków to 1 sekunda.</p>`,
  tp: () => `${targetField('cel', true)}
    <div class="row3">
      <div class="field"><label for="x">X</label><input type="number" id="x" name="x" value="0"></div>
      <div class="field"><label for="y">Y (wysokość)</label><input type="number" id="y" name="y" value="100"></div>
      <div class="field"><label for="z">Z</label><input type="number" id="z" name="z" value="0"></div>
    </div>
    <div class="chips"><label class="chip"><input type="checkbox" name="rel"><span>względem gracza (<code>~</code>)</span></label></div>
    <p class="muted small" style="margin-top:12px">Współrzędne miejsca zobaczysz po wciśnięciu F3 (linijka XYZ).</p>`,
  gamerule: () => `<div class="field"><label for="rule">Zasada</label><select id="rule" name="rule">${D.zasady.map((z, i) => `<option value="${i}">${z.nowa}</option>`).join('')}</select></div>
    <div id="ruleVal"></div><div class="morph" id="morph"></div>`,
  whitelist: () => `<div class="field"><label for="nicks">Nicki kolegów (każdy w nowej linii)</label><textarea id="nicks" name="nicks" rows="4">Piotrek_PL
Kolega123</textarea></div>
    <div class="field"><label for="owner">Twój nick (dostanie OP, czyli uprawnienia admina)</label><input type="text" id="owner" name="owner" value="Piotrek_PL" maxlength="16"></div>
    <div class="chips"><label class="chip"><input type="checkbox" name="on" checked><span>włącz białą listę</span></label></div>
    <p class="note small" style="margin-top:14px">Od wersji 26.3 nowe serwery mają białą listę włączoną od razu. OP dawaj tylko sobie. Admin może wszystko, także zniszczyć świat.</p>`,
  attribute: () => `${targetField()}
    <div class="field"><label for="hearts">Ile serc maksymalnie: <b id="heartsV">10</b></label><input type="range" id="hearts" name="hearts" min="1" max="20" step="0.5" value="10"></div>
    <div class="chips"><label class="chip"><input type="checkbox" name="reset"><span>przywróć zwykłe 10 serc</span></label></div>
    <p class="note small" style="margin-top:14px">1 serce to 2 punkty zdrowia. Komenda zmienia tylko maksimum. Jeśli obniżysz je graczowi z pełnym zdrowiem, gra może dalej pokazywać stare serca, dopóki gracz nie oberwie albo się nie wyleczy (znany błąd gry).</p>`,
};

// ---------- budowanie komend ----------
function build(f) {
  const out = { cmds: [], warn: null, pv: {} };
  if (tpl === 'give') {
    const tg = readTarget(f), it = D.przedmioty.find(p => p.id === f.get('item')); let n = +f.get('count');
    if (n > it.max) out.warn = `${it.nazwa} układa się po ${it.max} w jednym slocie, więc ${n} sztuk zajmie kilka miejsc.`;
    out.cmds.push(`/give ${tg.t} minecraft:${it.id} ${n}`); out.pv = { it, n }; if (tg.bad) out.warn = 'Nick musi mieć 3–16 znaków: litery, cyfry albo _.';
  }
  if (tpl === 'effect') {
    const tg = readTarget(f), e = D.efekty.find(p => p.id === f.get('eff')), inf = f.get('inf'), sec = +f.get('sec'), lvl = +f.get('lvl');
    out.cmds.push(`/effect give ${tg.t} minecraft:${e.id} ${inf ? 'infinite' : sec} ${lvl - 1}${f.get('hide') ? ' true' : ''}`);
    out.pv = { e, sec: inf ? null : sec, lvl }; if (tg.bad) out.warn = 'Nick musi mieć 3–16 znaków: litery, cyfry albo _.';
  }
  if (tpl === 'title') {
    const col = f.get('col'), bold = !!f.get('bold'), tt = f.get('tt') || ' ', st = f.get('st');
    const comp = (text) => JSON.stringify(Object.assign({ text, color: col }, bold ? { bold: true } : {}));
    const fi = +f.get('fi') || 0, sy = +f.get('sy') || 0, fo = +f.get('fo') || 0;
    if (fi !== titleTimes.fi || sy !== titleTimes.sy || fo !== titleTimes.fo) out.cmds.push(`/title @a times ${fi} ${sy} ${fo}`);
    if (st) out.cmds.push(`/title @a subtitle ${comp(st)}`);
    out.cmds.push(`/title @a title ${comp(tt)}`);
    out.pv = { tt, st, hex: D.kolory_tekstu.find(c => c.id === col).hex, bold, fi, sy, fo };
    if (st) out.warn = 'Najpierw wpisz komendę z małym napisem (subtitle), a potem tę z dużym. Mały napis pojawia się dopiero razem z dużym.';
  }
  if (tpl === 'tp') {
    const tg = readTarget(f), rel = !!f.get('rel');
    const c = ['x', 'y', 'z'].map(k => { const v = Math.round(+f.get(k) || 0); return rel ? (v === 0 ? '~' : `~${v}`) : v; });
    out.cmds.push(`/tp ${tg.t} ${c.join(' ')}`); out.pv = { c, rel };
    if (!rel && (+f.get('y') < -64 || +f.get('y') > 320)) out.warn = 'Świat ma wysokość od -64 do 320. Poza tym zakresem teleport skończy się upadkiem.';
    if (tg.bad) out.warn = 'Nick musi mieć 3–16 znaków: litery, cyfry albo _.';
  }
  if (tpl === 'gamerule') {
    const z = D.zasady[+f.get('rule') || 0], val = z.typ === 'bool' ? (f.get('val') || 'true') : (f.get('val') ?? '0');
    const name = ver === 'nowa' ? z.nowa : (z.stara || null);
    if (!name) { out.cmds.push(`# W tej wersji użyj starej zasady doFireTick (true/false)`); out.warn = z.stara_uwaga; }
    else out.cmds.push(`/gamerule ${name} ${val}`);
    out.pv = { z }; if (z.uwaga) out.warn = z.uwaga;
  }
  if (tpl === 'whitelist') {
    const nicks = (f.get('nicks') || '').split(/\n|,/).map(s => s.trim()).filter(Boolean), owner = (f.get('owner') || '').trim();
    if (f.get('on')) out.cmds.push('/whitelist on');
    nicks.forEach(n => out.cmds.push(`/whitelist add ${n}`));
    if (owner) out.cmds.push(`/op ${owner}`);
    const bad = [...nicks, owner].filter(n => n && !NICK.test(n));
    if (bad.length) out.warn = `Te nicki wyglądają źle: ${bad.join(', ')}. Nick ma 3–16 znaków: litery, cyfry albo _.`;
    out.pv = { nicks, owner };
  }
  if (tpl === 'attribute') {
    const tg = readTarget(f), reset = !!f.get('reset'), hearts = reset ? 10 : +f.get('hearts');
    out.cmds.push(reset ? `/attribute ${tg.t} minecraft:max_health base reset` : `/attribute ${tg.t} minecraft:max_health base set ${hearts * 2}`);
    out.pv = { hearts, reset };
    if (hearts < 2 && !reset) out.warn = 'Przy 1 sercu jeden cios kończy grę. W LifeSteal to zwykle ostatnia chwila przed eliminacją.';
    if (tg.bad) out.warn = 'Nick musi mieć 3–16 znaków: litery, cyfry albo _.';
  }
  return out;
}

// ---------- kolorowanie składni ----------
function hl(cmd) {
  if (cmd.startsWith('#')) return `<span class="hc">${esc(cmd)}</span>`;
  return esc(cmd)
    .replace(/^(\/\w+)/, '<span class="hk">$1</span>')
    .replace(/(@[pas])/g, '<span class="hs">$1</span>')
    .replace(/(minecraft:\w+)/g, '<span class="hi">$1</span>')
    .replace(/(\{.*\})/, '<span class="hj">$1</span>')
    .replace(/(?<![\w:"])(~?-?\d+|~)(?![\w"])/g, '<span class="hn">$1</span>');
}

// ---------- podgląd w „grze” ----------
const scr = $('#scr');
let titleTimer = [];
function preview(o) {
  titleTimer.forEach(clearTimeout); titleTimer = [];
  const p = o.pv;
  if (tpl === 'give') {
    const slots = Array.from({ length: 9 }, (_, i) => i === 0 ? `<div class="slot sel pop"><div class="it" style="background:${p.it.kolor}"></div>${p.n > 1 ? `<span class="cnt">${Math.min(p.n, p.it.max)}</span>` : ''}</div>` : (i === 1 && p.n > p.it.max) ? `<div class="slot pop"><div class="it" style="background:${p.it.kolor}"></div><span class="cnt">${Math.min(p.n - p.it.max, p.it.max)}</span></div>` : '<div class="slot"></div>').join('');
    scr.innerHTML = `<div class="pv-tip">${esc(p.it.nazwa)}</div><div class="hotbar pv-hot">${slots}</div>`;
  }
  if (tpl === 'effect') {
    const time = p.sec == null ? '∞' : `${Math.floor(p.sec / 60)}:${String(p.sec % 60).padStart(2, '0')}`;
    const roman = ['I', 'II', 'III', 'IV', 'V'][p.lvl - 1];
    scr.innerHTML = `<div class="pv-eff"><i style="background:${p.e.kolor}"></i><div><b>${esc(p.e.nazwa)} ${roman}</b><span>${time}</span></div></div>${reduced ? '' : Array.from({ length: 14 }, (_, i) => `<span class="bub" style="--x:${10 + Math.random() * 80}%;--d:${(Math.random() * 2).toFixed(2)}s;background:${p.e.kolor}"></span>`).join('')}`;
  }
  if (tpl === 'title') {
    const st = `color:${p.hex};${p.bold ? 'font-weight:700;' : 'font-weight:400;'}`;
    scr.innerHTML = `<div class="pv-title"><div class="t1" style="${st}">${esc(p.tt)}</div>${p.st ? `<div class="t2" style="color:${p.hex}">${esc(p.st)}</div>` : ''}</div><button type="button" class="replay btn sm ghost">↻ Odtwórz</button>`;
    const box = $('.pv-title', scr), t1 = $('.t1', scr);
    split(t1);
    const play = () => {
      titleTimer.forEach(clearTimeout); titleTimer = [];
      const k = 50; // 1 tick = 50 ms
      box.style.transition = 'none'; box.style.opacity = 0; t1.classList.remove('in'); void box.offsetWidth;
      box.style.transition = `opacity ${p.fi * k}ms linear`; box.style.opacity = 1; t1.classList.add('in');
      titleTimer.push(setTimeout(() => { box.style.transition = `opacity ${p.fo * k}ms linear`; box.style.opacity = 0; }, (p.fi + p.sy) * k));
      titleTimer.push(setTimeout(play, (p.fi + p.sy + p.fo) * k + 900));
    };
    $('.replay', scr).addEventListener('click', play);
    reduced ? (box.style.opacity = 1, t1.classList.add('in')) : play();
  }
  if (tpl === 'tp') {
    scr.innerHTML = `<div class="pv-f3">XYZ: ${p.c.join(' / ')}${p.rel ? '<br><span>~ oznacza „tu, gdzie stoi gracz”</span>' : ''}</div><div class="pv-warp">${'<i></i>'.repeat(18)}</div>`;
  }
  if (tpl === 'gamerule') {
    const z = p.z;
    scr.innerHTML = `<div class="pv-rule"><div class="old">${z.stara ? esc(z.stara) : 'doFireTick'}</div><div class="arrow">↓ od 1.21.11</div><div class="new" id="newName">${esc(z.nowa)}</div><p>${esc(z.opis)}</p></div>`;
    const nn = $('#newName', scr); split(nn); requestAnimationFrame(() => nn.classList.add('in'));
  }
  if (tpl === 'whitelist') {
    scr.innerHTML = `<div class="pv-wl"><b>Biała lista</b>${p.nicks.map((n, i) => `<div style="--i:${i}"><span class="ok">✓</span>${esc(n)}${n === p.owner ? ' <em>OP</em>' : ''}</div>`).join('')}<div class="lock">Obcy: „You are not white-listed on this server!”</div></div>`;
  }
  if (tpl === 'attribute') {
    const full = Math.floor(p.hearts), half = p.hearts % 1 !== 0;
    const cells = Array.from({ length: Math.ceil(p.hearts) }, (_, i) => `<i class="ht${i === full && half ? ' half' : ''}" style="--i:${i}"></i>`).join('');
    // polska odmiana: 1 serce, 2–4 serca, 5 serc; ułamki: 6,5 serca
    const pl = (n, one, few, many) => n % 1 ? few : n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;
    const hp = p.hearts * 2;
    scr.innerHTML = `<div class="pv-hearts"><div class="row">${cells}</div><span>${String(p.hearts).replace('.', ',')} ${pl(p.hearts, 'serce', 'serca', 'serc')} · ${hp} ${pl(hp, 'punkt', 'punkty', 'punktów')} zdrowia</span></div>`;
  }
}

// ---------- wyjście ----------
const out = $('#out'); let typing;
function showCmds(cmds) {
  clearInterval(typing);
  const html = cmds.map(c => `<div><span class="pr">›</span> ${hl(c)}</div>`).join('');
  if (reduced) { out.innerHTML = html; return; }
  // efekt pisania
  const full = cmds.join('\n'); let i = Math.max(0, full.length - 60);
  typing = setInterval(() => {
    i = Math.min(full.length, i + 3);
    const part = full.slice(0, i).split('\n');
    out.innerHTML = part.map((c, k) => `<div><span class="pr">›</span> ${hl(c)}${k === part.length - 1 && i < full.length ? '<span class="caret"></span>' : ''}</div>`).join('');
    if (i >= full.length) { clearInterval(typing); out.innerHTML = html; }
  }, 16);
}

function statusBadge() {
  const t = TESTS?.wyniki?.[tpl];
  if (t && t.ok) return `<span class="badge ok" title="${esc(t.silnik)} ${esc(t.wersja)}, ${esc(t.data)}">sprawdzone · ${esc(t.wersja)}</span>`;
  if (t && !t.ok) return `<span class="badge warn">test nieudany</span>`;
  return `<span class="badge wait" title="Składnia z dokumentacji, czeka na test na serwerze">czeka na test</span>`;
}

const form = $('#form');
let current = { cmds: [] };
function update() {
  const f = new FormData(form);
  // pola zależne
  const nick = form.querySelector('[name=nick]'); if (nick) nick.style.display = f.get('cel') === 'nick' ? 'block' : 'none';
  const hv = form.querySelector('#heartsV'); if (hv) hv.textContent = f.get('reset') ? '10' : form.querySelector('#hearts').value.replace('.', ',');
  ['count', 'sec', 'lvl'].forEach(k => { const v = form.querySelector('#' + k + 'V'); if (v) v.textContent = f.get(k); });
  const sec = form.querySelector('#sec'); if (sec) sec.disabled = !!f.get('inf');
  const hearts = form.querySelector('#hearts'); if (hearts) hearts.disabled = !!f.get('reset');
  if (tpl === 'gamerule') {
    const z = D.zasady[+f.get('rule') || 0], box = $('#ruleVal');
    if (box.dataset.rule !== String(f.get('rule'))) {
      box.dataset.rule = f.get('rule');
      box.innerHTML = z.typ === 'bool'
        ? `<div class="field"><span class="lbl">Wartość</span><div class="chips"><label class="chip"><input type="radio" name="val" value="true" checked><span>włączone (true)</span></label><label class="chip"><input type="radio" name="val" value="false"><span>wyłączone (false)</span></label></div></div>`
        : `<div class="field"><label for="val">Wartość (${z.min}–${z.max})</label><input type="number" id="val" name="val" value="${z.nowa === 'players_sleeping_percentage' ? 0 : 0}" min="${z.min}" max="${z.max}"></div>`;
      return update();
    }
  }
  current = build(new FormData(form));
  showCmds(current.cmds);
  preview(current);
  const sz = D.szablony.find(s => s.id === tpl);
  $('#status').innerHTML = statusBadge();
  $('#desc').innerHTML = `${esc(sz.opis)} ${current.warn ? `<span class="warn-inline">⚠ ${esc(current.warn)}</span>` : ''} <a href="${sz.zrodlo}" target="_blank" rel="noopener">Dokumentacja</a>`;
}
function buildForm() { form.innerHTML = FORMS[tpl](); update(); }
form.addEventListener('input', update); form.addEventListener('change', update);

$('#copy').addEventListener('click', (e) => {
  copyText(current.cmds.filter(c => !c.startsWith('#')).join('\n'), e.currentTarget);
  const r = e.currentTarget.getBoundingClientRect();
  if (award('kopiuj:' + tpl, 10, { from: { x: r.left + r.width / 2, y: r.top } }) && bump('kopiuj-zakladki') >= 5) badge('komendant');
});
$('#ai').addEventListener('click', async (e) => {
  const v = D.wersje.find(x => x.id === ver).nazwa;
  const q = `Gram w Minecraft: Java Edition (${v}) na serwerze Paper. Mam komendę:\n${current.cmds.join('\n')}\nCzy jest poprawna dla tej wersji? Jeśli nie, popraw ją i krótko wyjaśnij po polsku. Pamiętaj, że od 1.21.11 nazwy gamerule są pisane jak keep_inventory.`;
  await copyText(q, e.currentTarget); toast('Pytanie skopiowane. Wklej je do Claude albo ChatGPT.');
});

// ---------- pikselowy krajobraz w tle podglądu ----------
(function land() {
  const c = $('#land'), x = c.getContext('2d');
  const sky = x.createLinearGradient(0, 0, 0, 90); sky.addColorStop(0, '#5a8dff'); sky.addColorStop(1, '#b6d4ff'); x.fillStyle = sky; x.fillRect(0, 0, 160, 90);
  x.fillStyle = '#fff'; [[20, 14, 18], [90, 10, 26], [130, 20, 14]].forEach(([a, b, w]) => { x.fillRect(a, b, w, 4); x.fillRect(a + 3, b - 2, w - 6, 2); });
  let h = 58; for (let i = 0; i < 160; i += 4) { h += (Math.random() - .5) * 6; h = Math.max(48, Math.min(66, h)); x.fillStyle = '#3f8f2c'; x.fillRect(i, h, 4, 3); x.fillStyle = '#7a5434'; x.fillRect(i, h + 3, 4, 8); x.fillStyle = '#6f727a'; x.fillRect(i, h + 11, 4, 90); }
  x.fillStyle = '#6b4f2c'; x.fillRect(118, 40, 3, 16); x.fillStyle = '#2f7a22'; x.fillRect(111, 31, 17, 11);
})();

buildForm();
