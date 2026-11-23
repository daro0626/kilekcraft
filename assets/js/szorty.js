// =========================================================
// KILEKCRAFT — przepis „Pierwszy serwer” w formie szortów.
// Treść kroków jest tutaj, a źródła faktów w docs/ZRODLA.md.
// =========================================================
import { split, store, copyText, xpBurst, reduced, toast } from './core.js';

const STEPS = [
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

const root = document.getElementById('shorts'), dots = document.getElementById('dots');
const done = store.get('szorty', {});
root.innerHTML = STEPS.map((s, i) => `
  <article class="short" id="k${i + 1}" data-i="${i}" aria-label="Krok ${i + 1} z ${STEPS.length}">
    <div class="segs">${STEPS.map((_, j) => `<i class="${j < i ? 'past' : j === i ? 'now' : ''}"></i>`).join('')}</div>
    <div class="s-num">${String(i + 1).padStart(2, '0')}</div>
    <div class="s-vis">${s.v}</div>
    <h2 class="s-title">${s.t}</h2>
    <p class="s-text">${s.p}</p>
    ${s.note ? `<p class="note small">${s.note}</p>` : ''}
    ${s.cmd ? `<div class="console s-cmd"><span class="pr">›</span> ${s.cmd}</div>` : ''}
    <div class="s-act">
      <label class="chip"><input type="checkbox" data-i="${i}" ${done[i] ? 'checked' : ''}><span>✓ Zrobione</span></label>
      ${s.cmd ? `<button class="btn sm ghost" data-copy="${s.cmd}" type="button">Kopiuj</button>` : ''}
      ${s.a ? `<a class="btn sm ghost" href="${s.a.href}">${s.a.label} →</a>` : ''}
    </div>
    ${i < STEPS.length - 1 ? '<div class="s-next" aria-hidden="true">przewiń ↓</div>' : '<div class="s-final"><b>Masz serwer!</b> Następny przepis to LifeSteal z ekonomią. Jest w przygotowaniu.</div>'}
  </article>`).join('');
dots.innerHTML = STEPS.map((s, i) => `<a href="#k${i + 1}" aria-label="Krok ${i + 1}: ${s.t}" class="${done[i] ? 'done' : ''}"></a>`).join('');

root.querySelectorAll('.s-title').forEach(split);

function count() { const n = Object.values(done).filter(Boolean).length; document.getElementById('pDone').textContent = n; return n; }
count();

root.addEventListener('change', (e) => {
  const i = e.target.dataset.i; if (i == null) return;
  done[i] = e.target.checked; store.set('szorty', done);
  dots.children[i].classList.toggle('done', e.target.checked);
  if (e.target.checked) {
    const r = e.target.closest('.chip').getBoundingClientRect(); xpBurst(r.left + r.width / 2, r.top, 16);
    if (count() === STEPS.length) toast('Wszystkie 9 kroków zrobione. Brawo, serwerowcu!');
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
