// =========================================================
// KILEKCRAFT — wyzwanie dnia: jedna komnata parkour/labirynt,
// ta sama dla wszystkich do końca dnia (wg zegara w przeglądarce).
// Kod komnaty liczymy z daty, więc nie trzeba niczego zapisywać
// na serwerze — każdy, kto odwiedzi stronę tego dnia, dostaje
// dokładnie tę samą trasę (assets/js/komnaty-gen.js, ten sam
// kod + ziarno = zawsze ta sama komnata).
// =========================================================
import { store, toast } from './core.js';
import { encode, THEMES, kindName } from './komnaty-gen.js';
import { badge } from './xp.js';

const $ = (s) => document.querySelector(s);
const fmt = (s) => s.toFixed(2).replace('.', ',');
const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
const ludzki = (d) => `${d.getDate()} ${MIESIACE[d.getMonth()]} ${d.getFullYear()}`;
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// prosty, deterministyczny hash tekstu (FNV-1a) — ta sama data zawsze daje tę samą liczbę
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function stateFor(key) {
  const h = hash('kilekcraft-wyzwanie-' + key);
  const themes = Object.keys(THEMES);
  return {
    type: (h % 5) === 0 ? 'labirynt' : (h % 5) === 1 ? 'gora' : 'parkour',   // co piąty dzień labirynt, co piąty góra
    diff: 2 + ((h >>> 5) % 7),                       // trudność 2–8: grywalne dla większości
    theme: themes[(h >>> 10) % themes.length],
    seed: 1 + ((h >>> 3) % 99998),
  };
}

const today = new Date();
const todayKey = dateKey(today);
const state = stateFor(todayKey);
const code = encode(state);
let current = state;

$('#dzienKod').textContent = code;
$('#dzienTitul').textContent = `Wyzwanie dnia · ${ludzki(today)}`;
$('#dzienOpis').textContent = `${kindName(state.type)} · trudność ${state.diff} · ${THEMES[state.theme].name}. Ta sama komnata dla wszystkich do końca dnia (wg zegara na twoim urządzeniu).`;
$('#ovText').textContent = `${kindName(state.type)} · trudność ${state.diff} · kod ${code}`;

function renderHistory() {
  const ul = $('#historia');
  ul.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = dateKey(d);
    const st = stateFor(k);
    const c = encode(st);
    const best = store.get('pk:best:' + c, null);
    const li = document.createElement('li');
    li.innerHTML = `<i>${i === 0 ? 'Dziś' : ludzki(d)}</i> — ${kindName(st.type)} ${st.diff}, kod ${c}: ${best ? fmt(best) + ' s' : 'nie grałeś'}`;
    ul.appendChild(li);
  }
}
renderHistory();

// odznaka i odświeżenie historii, gdy tylko dzisiejsze wyzwanie zostanie ukończone
let lastBest = store.get('pk:best:' + code, null);
setInterval(() => {
  const best = store.get('pk:best:' + code, null);
  if (best !== lastBest) { lastBest = best; badge('dzien'); renderHistory(); }
}, 1500);

let game = null;
function loadLevel(next) {
  current = next;
  if (game) game.loadLevel(next);
}
$('#play').addEventListener('click', async () => {
  const btn = $('#play');
  if (btn.getAttribute('aria-busy') === 'true') return;
  if (!game) {
    btn.setAttribute('aria-busy', 'true');
    $('#ovText').textContent = 'Ładowanie komnaty…';
    try {
      const { initGame } = await import('./parkour-game.js');
      game = initGame(loadLevel);
      if (!game) {
        $('#wrapG').hidden = true;
        document.querySelector('.pk-bar').hidden = true;
        const fallback = $('#pkFallback');
        fallback.hidden = false;
        fallback.focus();
        return;
      }
      game.loadLevel(current);
    } catch (error) {
      console.error(error);
      $('#ovText').textContent = 'Nie udało się wczytać komnaty. Spróbuj ponownie.';
      return;
    } finally {
      btn.removeAttribute('aria-busy');
    }
  }
  game.play();
});

$('#udostepnij').addEventListener('click', async () => {
  const best = store.get('pk:best:' + code, null);
  if (!best) { toast('Najpierw ukończ dzisiejsze wyzwanie!'); return; }
  const text = `Wyzwanie dnia KILEKCRAFT (${ludzki(today)}): ${kindName(state.type)} ${state.diff}, kod ${code}. Mój czas: ${fmt(best)} s. Spróbujesz pobić?`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Skopiowano! Wklej w rozmowie z kolegami.');
  } catch {
    toast('Nie udało się skopiować. Zaznacz tekst ręcznie.');
  }
});
