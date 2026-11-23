// =========================================================
// KILEKCRAFT — przepisy w formie szortów: „Pierwszy serwer” i „LifeSteal”.
// Treść kroków jest tutaj, a źródła faktów w docs/ZRODLA.md.
// Strona wybiera przepis przez <body data-przepis="…">.
// =========================================================
import { split, store, copyText, xpBurst, reduced, toast, award, badge } from './core.js';

let TESTS = {};
try { const r = await fetch('data/testy.json', { cache: 'no-store' }); if (r.ok) TESTS = await r.json(); } catch { /* brak wyników testów */ }
// Status komendy waniliowej pochodzi wyłącznie z testu na serwerze (AGENTS.md, zasada 2).
function testBadge(tpl) {
  const t = TESTS?.wyniki?.[tpl];
  if (t && t.ok) return `<span class="badge ok">komenda sprawdzona · ${t.wersja}</span>`;
  if (t && !t.ok) return '<span class="badge warn">test komendy nieudany</span>';
  return '<span class="badge wait">komenda czeka na test</span>';
}
const PLUGIN = '<span class="badge wait">plugin: nie testowaliśmy go na naszym serwerze</span>';

const SERWER = [
  {
    t: 'Wszyscy na tej samej wersji',
    p: 'Ty i koledzy gracie na Javie, więc serwer też musi być na Javie. Wersja serwera musi się zgadzać z wersją gry, np. 26.3. Jeśli się nie zgadza, gra pokaże błąd o nieaktualnej wersji.',
    v: `<div class="v-pcs"><div class="pc"><div class="scrn">26.3</div><span>Ty</span></div><div class="link"></div><div class="pc srv"><div class="scrn">26.3</div><span>Serwer</span></div><div class="link"></div><div class="pc"><div class="scrn">26.3</div><span>Kolega</span></div></div>`,
  },
  {
    t: 'Wybierz, gdzie stoi serwer',
    p: 'Na start są dwie dobre opcje. Aternos kosztuje 0 zł, ale usypia, gdy nikt nie gra. exaroton liczy opłatę za każdą godzinę grania. Doradca policzy, co bardziej się opłaca.',
    v: `<div class="v-cards"><div class="hc a"><b>0 zł</b><span>Aternos</span></div><div class="hc b"><b>za godz.</b><span>exaroton</span></div><div class="hc c"><b>24/7</b><span>abonament</span></div></div>`,
    a: { href: 'hosting.html', label: 'Otwórz doradcę hostingu' },
  },
  {
    t: 'Konto zakładasz z rodzicem',
    p: 'Do rejestracji potrzebny jest e-mail. Hasło znasz tylko ty i rodzic. Nikt na serwerze nie potrzebuje twojego hasła ani kodu. Jeśli ktoś o nie prosi, to oszust.',
    v: `<div class="v-lock"><div class="shackle"></div><div class="body"><i></i></div></div>`,
  },
  {
    t: 'Silnik: Paper',
    p: 'Paper to serwer, na którym działają pluginy, np. LifeSteal, ekonomia i sklep. Vanilla to czysty Minecraft bez pluginów. Wybierz w panelu Paper i tę samą wersję co w grze.',
    note: 'Jesienią 2026 Paper dla 26.3 był jeszcze w becie. Jeśli panel oznacza 26.3 jako „beta” albo „experimental”, zapytaj starszego, czy wybrać tę wersję, czy poprzednią stabilną. Grę ustaw potem na tę samą wersję.',
    v: `<div class="v-puzzle"><div class="core">PAPER</div><i class="pz p1">LifeSteal</i><i class="pz p2">$ Ekonomia</i><i class="pz p3">Sklep</i></div>`,
  },
  {
    t: 'Zaakceptuj zasady i włącz',
    p: 'Panel pokaże zasady Minecrafta (EULA). Przeczytaj je z rodzicem i zaakceptuj. Pierwsze uruchomienie trwa dłużej, bo serwer tworzy cały świat.',
    v: `<div class="v-gen">${'<i></i>'.repeat(48)}</div><div class="v-genlbl">Tworzenie świata…</div>`,
  },
  {
    t: 'OP tylko dla ciebie',
    p: 'OP to uprawnienia admina, a admin może na serwerze wszystko. Wpisz w konsoli panelu swój nick. W konsoli piszesz bez ukośnika na początku.',
    cmd: 'op TwójNick',
    v: `<div class="v-crown"><div class="crown"></div><b>OP</b></div>`,
  },
  {
    t: 'Biała lista: tylko koledzy',
    p: 'Biała lista wpuszcza tylko osoby, które na nią dopiszesz. W 26.3 nowe serwery mają ją włączoną od razu, a ty jako OP wchodzisz zawsze. Dopisz kolegów w konsoli.',
    cmd: 'whitelist add NickKolegi',
    v: `<div class="v-wl"><div class="ok">✓ Piotrek</div><div class="ok">✓ Kolega</div><div class="no">✗ Obcy</div></div>`,
    a: { href: 'komendy.html', label: 'Kreator białej listy' },
  },
  {
    t: 'Wejdź do gry',
    p: 'Skopiuj adres serwera z panelu. W grze wybierz Tryb wieloosobowy, potem Dodaj serwer. Wklej adres i kliknij Gotowe. Kolegom wyślij sam adres, bez loginu i hasła.',
    v: `<div class="v-mp"><div class="mp-t">Dodaj serwer</div><div class="mp-l">Adres serwera</div><div class="mp-i"><span class="typed">adres-z-panelu</span><span class="caret"></span></div><div class="mp-b">Gotowe</div></div>`,
  },
  {
    t: 'Kopia zapasowa przed zmianami',
    p: 'Zanim zmienisz wersję albo dodasz plugin, zrób kopię zapasową w panelu. Świata otwartego w nowszej wersji nie da się bezpiecznie otworzyć w starszej. Paper 26.3 trzyma Nether i End w folderze world/dimensions/, więc kopiuj cały folder world.',
    v: `<div class="v-chest"><div class="ch"></div><div class="arrow">⇩</div><div class="ch copy"></div></div>`,
    final: true,
  },
];

// ---------- przepis 2: LifeSteal z ekonomią serc ----------
const LIFESTEAL = [
  {
    t: 'Najpierw zasady, potem serwer',
    p: 'Ustal trzy liczby: ile serc ma nowy gracz, ile najwięcej można zebrać i co się dzieje przy zerze. Symulator pokaże, czy po dwóch tygodniach ktoś jeszcze gra.',
    v: `<div class="v-ls-rules"><div><b>10</b><span>na start</span></div><div><b>20</b><span>maksimum</span></div><div><b>0</b><span>koniec gry</span></div></div>`,
    a: { href: 'symulator.html', label: 'Otwórz symulator' },
  },
  {
    t: 'Dwie drogi: ręcznie albo plugin',
    p: 'Ręcznie: po każdej walce admin wpisuje jedną komendę. Działa nawet bez pluginów, ale ktoś musi pilnować. Plugin: serwer liczy serca sam, przez całą dobę. Potrzebny jest silnik z pluginami, np. Paper.',
    v: `<div class="v-ls-fork"><div class="way"><b>/</b><span>ręcznie</span></div><div class="way pl"><b>⚙</b><span>plugin</span></div></div>`,
  },
  {
    t: 'Ręcznie: wszyscy na start',
    p: 'Komenda attribute ustawia, ile zdrowia gracz może mieć najwięcej. 1 serce to 2 punkty, więc 10 serc to 20. Komenda attribute działa na jednego gracza naraz, więc execute as @a powtarza ją dla każdego. Tak wszyscy dostają po 10 serc. W konsoli piszesz bez ukośnika.',
    cmd: 'execute as @a run attribute @s minecraft:max_health base set 20',
    test: 'attribute',
    v: `<div class="v-ls-bar">${'<i></i>'.repeat(10)}</div>`,
    a: { href: 'komendy.html', label: 'Kreator serc' },
  },
  {
    t: 'Ręcznie: po każdej walce',
    p: 'Przegrany traci serce, zwycięzca zyskuje. Przegranemu z 10 sercami ustaw 9, czyli 18 punktów. Zwycięzcy ustaw 11, czyli 22. Zamiast Nick wpisz prawdziwy nick.',
    cmd: 'attribute Nick minecraft:max_health base set 18',
    test: 'attribute',
    note: 'Znany błąd gry: gracz z pełnym zdrowiem może dalej widzieć stare serca, dopóki nie oberwie albo się nie wyleczy.',
    v: `<div class="v-ls-duel"><div class="pl lose"><b>9</b><span>−1 ❤</span></div><div class="sw">VS</div><div class="pl win"><b>11</b><span>+1 ❤</span></div></div>`,
  },
  {
    t: 'Plugin: LifeStealZ',
    p: 'LifeStealZ to darmowy plugin. Zabójca dostaje serce ofiary, a gracz z zerem odpada. Pobierz plik .jar z Modrinth albo Hangar, wrzuć do folderu plugins i zrestartuj serwer.',
    note: 'Najpierw kopia zapasowa. Sprawdź też wersję: 23.11.2026 Modrinth podawał 26.3, a Hangar tylko do 26.1.2. Jeśli twojej wersji brak, zapytaj starszego.',
    plugin: true,
    v: `<div class="v-puzzle"><div class="core">PAPER</div><i class="pz p1">LifeStealZ</i><i class="pz p2">❤ serca</i><i class="pz p3">ożywienie</i></div>`,
    a: { href: 'https://modrinth.com/plugin/lifestealz', label: 'Strona pluginu', ext: true },
  },
  {
    t: 'Ustaw liczby z symulatora',
    p: 'Po pierwszym starcie plugin tworzy plik config.yml w swoim folderze. Znajdź startHearts (domyślnie 10) i maxHearts (domyślnie 20). Wpisz liczby z symulatora i zrestartuj serwer.',
    note: 'preventTotems: true wyłącza totemy nieśmiertelności. Domyślnie totemy działają.',
    plugin: true,
    v: `<div class="v-ls-cfg"><div><span>startHearts:</span> <b>10</b></div><div><span>maxHearts:</span> <b>20</b></div><div><span>preventTotems:</span> <b>false</b></div></div>`,
  },
  {
    t: 'Ekonomia serc',
    p: 'Serce można wypłacić jako przedmiot: dać koledze, wymienić na diamenty albo schować. Plugin ma też przepisy na nowe serca i przedmiot ożywienia dla wyeliminowanych.',
    note: 'Nazwę komendy do wypłaty sprawdź w pomocy pluginu. Nie wpisujemy jej, dopóki jej nie przetestujemy.',
    plugin: true,
    v: `<div class="v-ls-trade"><div class="it heart">❤</div><div class="arr">⇄</div><div class="it dia">◆</div></div>`,
  },
  {
    t: 'Komendy, które musisz znać',
    p: 'Gracz sprawdza serca komendą /hearts. Admin przywraca wyeliminowanego przez /revive i dodaje serca przez lifestealz hearts add. Nether i End zostają włączone: tam są najlepsze łupy.',
    cmd: 'lifestealz hearts add NickGracza 1',
    plugin: true,
    v: `<div class="v-ls-cmds"><div>/hearts</div><div>/revive</div><div>/lifestealz hearts add</div></div>`,
  },
  {
    t: 'Próba z kolegą, potem start',
    p: 'Umów się z jednym kolegą na próbę. Niech jeden pokona drugiego. Sprawdźcie, czy serce przeszło od przegranego do zwycięzcy. Dopiero wtedy ogłoś start napisem na ekranie.',
    cmd: 'title @a title {"text":"LIFESTEAL START!","color":"gold","bold":true}',
    test: 'title',
    v: `<div class="v-ls-start">LIFESTEAL<br>START!</div>`,
    a: { href: 'komendy.html', label: 'Kreator napisów' },
    final: true,
  },
];

const RECIPES = {
  serwer: { steps: SERWER, key: 'szorty', xp: 'szort:', all: 'serwerowiec',
    done: 'Wszystkie 9 kroków zrobione. Brawo, serwerowcu!',
    final: '<b>Masz serwer!</b> Następny przepis: <a href="lifesteal.html">LifeSteal z ekonomią serc →</a>' },
  lifesteal: { steps: LIFESTEAL, key: 'szorty-lifesteal', xp: 'szort-ls:', all: 'wladca',
    done: 'Cały przepis LifeSteal zrobiony. Niech serca krążą!',
    final: '<b>LifeSteal gotowy!</b> Zapisz zasady na kartce albo w opisie serwera, żeby każdy je znał. <a href="motd.html">Ustaw opis serwera →</a>' },
};
const R = RECIPES[document.body.dataset.przepis] || RECIPES.serwer;
const STEPS = R.steps;

const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const root = document.getElementById('shorts'), dots = document.getElementById('dots');
const done = store.get(R.key, {});
root.innerHTML = STEPS.map((s, i) => `
  <article class="short" id="k${i + 1}" data-i="${i}" aria-label="Krok ${i + 1} z ${STEPS.length}">
    <div class="segs">${STEPS.map((_, j) => `<i class="${j < i ? 'past' : j === i ? 'now' : ''}"></i>`).join('')}</div>
    <div class="s-num">${String(i + 1).padStart(2, '0')}</div>
    <div class="s-vis">${s.v}</div>
    <h2 class="s-title">${s.t}</h2>
    <p class="s-text">${s.p}</p>
    ${s.note ? `<p class="note small">${s.note}</p>` : ''}
    ${s.test || s.plugin ? `<div class="s-badges">${s.test ? testBadge(s.test) : ''}${s.plugin ? PLUGIN : ''}</div>` : ''}
    ${s.cmd ? `<div class="console s-cmd"><span class="pr">›</span> ${esc(s.cmd)}</div>` : ''}
    <div class="s-act">
      <label class="chip"><input type="checkbox" data-i="${i}" ${done[i] ? 'checked' : ''}><span>✓ Zrobione</span></label>
      ${s.cmd ? `<button class="btn sm ghost" data-copy="${esc(s.cmd)}" type="button">Kopiuj</button>` : ''}
      ${s.a ? `<a class="btn sm ghost" href="${s.a.href}"${s.a.ext ? ' target="_blank" rel="noopener"' : ''}>${s.a.label} ${s.a.ext ? '↗' : '→'}</a>` : ''}
    </div>
    ${i < STEPS.length - 1 ? '<div class="s-next" aria-hidden="true">przewiń ↓</div>' : `<div class="s-final">${R.final}</div>`}
  </article>`).join('');
dots.innerHTML = STEPS.map((s, i) => `<a href="#k${i + 1}" aria-label="Krok ${i + 1}: ${s.t}" class="${done[i] ? 'done' : ''}"></a>`).join('');

root.querySelectorAll('.s-title').forEach(split);

function count() { const n = Object.values(done).filter(Boolean).length; document.getElementById('pDone').textContent = n; return n; }
count();

root.addEventListener('change', (e) => {
  const i = e.target.dataset.i; if (i == null) return;
  done[i] = e.target.checked; store.set(R.key, done);
  dots.children[i].classList.toggle('done', e.target.checked);
  if (e.target.checked) {
    const r = e.target.closest('.chip').getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top, 16);
    award(R.xp + i, 15, { from: { x: r.left + r.width / 2, y: r.top } }); badge('start');
    if (count() === STEPS.length) { badge(R.all); toast(R.done); }
  } else count();
});
root.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copyText(b.dataset.copy, b); });

// aktywny krok: animacje startują od nowa za każdym razem
const io = new IntersectionObserver((ents) => {
  for (const en of ents) {
    const el = en.target;
    if (en.isIntersecting) {
      el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      el.querySelector('.s-title').classList.add('in');
      [...dots.children].forEach((d, j) => d.classList.toggle('now', j === +el.dataset.i));
    } else { el.querySelector('.s-title').classList.remove('in'); }
  }
}, { root: matchMedia('(min-width: 901px)').matches ? root : null, threshold: .6 });
root.querySelectorAll('.short').forEach(s => io.observe(s));

// klawiatura
root.addEventListener('keydown', (e) => {
  const cards = [...root.children], cur = cards.findIndex(c => c.classList.contains('in') && dots.children[c.dataset.i].classList.contains('now'));
  const go = (k) => cards[Math.max(0, Math.min(cards.length - 1, k))].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(cur + 1); }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(cur - 1); }
});
dots.addEventListener('click', (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); });
