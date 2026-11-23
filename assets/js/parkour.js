// Ekran startowy jest dostępny przed pobraniem silnika 3D.
import { store, toast } from './core.js';
import { encode, decode, KINDS, THEMES, kindName } from './komnaty-gen.js';
import { MISTRZ } from './komnaty-mistrz.js';

const codeIn = document.getElementById('code');
const play = document.getElementById('play');
const picker = document.getElementById('levelPicker');
const choose = document.getElementById('chooseLevel');
const kind = document.getElementById('levelKind');
const diff = document.getElementById('levelDiff');
const title = document.getElementById('ovTitle');
const description = document.getElementById('ovText');
const randomFrom = values => values[Math.floor(Math.random() * values.length)];
const randomSeed = () => 1 + Math.floor(Math.random() * 99999);
const kindList = Object.keys(KINDS);
const difficulty = Array.from({ length: 10 }, (_, i) => i + 1);
for (const type of kindList) kind.add(new Option(kindName(type), type));
for (const level of difficulty) diff.add(new Option(level, level));
const lastLevel = () => {
  const route = decode(store.get('pk:trasa', ''));
  if (route) return route;
  const saved = store.get('komnata');
  return saved && decode(encode(saved));
};
const defaultLevel = { type: 'parkour', diff: 1, theme: 'kamien', seed: 4821 };
let state;
let game = null;

function loadLevel(next, { entry = false, returning = false, focus = false } = {}) {
  const code = encode(next);
  const hash = '#' + code;
  if (location.hash !== hash) {
    if (entry) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
  }
  const sameRoom = state && encode(state) === code;
  state = next;
  codeIn.value = code;
  kind.value = state.type;
  diff.value = state.diff;
  store.set('pk:trasa', code);
  store.set('komnata', state);
  if (game) {
    if (!sameRoom) game.loadLevel(state);
  } else {
    const mi = state.type === 'mistrz' ? MISTRZ[state.diff] : null;
    title.textContent = mi ? `M${state.diff} · ${mi.name}` : kindName(state.type);
    description.textContent = `Poziom ${state.diff} · kod ${code}${mi ? ` · ${mi.zasada} Pułapka: ${mi.pulapka}` : ''}`;
    play.textContent = returning ? 'Kontynuuj ostatnią' : 'Graj';
  }
  if (focus) {
    picker.hidden = true;
    play.focus({ preventScroll: true });
  }
}
function restoreLevel() {
  const linked = decode(location.hash.slice(1));
  const last = lastLevel();
  if (state && linked && encode(linked) === encode(state)) return;
  loadLevel(linked || last || defaultLevel, { entry: true, returning: !!last && (!linked || encode(linked) === encode(last)) });
}
window.addEventListener('hashchange', restoreLevel);
window.addEventListener('popstate', restoreLevel);
choose.addEventListener('click', () => {
  picker.hidden = false;
  kind.focus();
});
document.getElementById('closePicker').addEventListener('click', () => {
  picker.hidden = true;
  choose.focus();
});
document.getElementById('levelForm').addEventListener('submit', event => {
  event.preventDefault();
  const level = { type: kind.value, diff: Number(diff.value) };
  const seed = level.type === state.type && level.diff === state.diff ? state.seed : randomSeed();
  loadLevel({ ...level, theme: state.theme, seed }, { focus: true });
});
document.querySelectorAll('[data-q]').forEach(button => button.addEventListener('click', () => {
  loadLevel({ ...decode(`${button.dataset.q}-K-1`), theme: state.theme, seed: randomSeed() }, { focus: true });
}));
document.getElementById('randomLevel').addEventListener('click', () => {
  loadLevel({ type: randomFrom(kindList), diff: randomFrom(difficulty),
    theme: randomFrom(Object.keys(THEMES)), seed: randomSeed() }, { focus: true });
});
const loadCode = () => {
  const decoded = decode(codeIn.value);
  if (decoded) loadLevel(decoded, { focus: true });
  else toast('Ten kod wygląda źle. Wzór: P5-K-4821');
};
document.getElementById('load').addEventListener('click', loadCode);
codeIn.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); loadCode(); }
});
play.addEventListener('click', async () => {
  if (play.getAttribute('aria-busy') === 'true') return;
  picker.hidden = true;
  if (!game) {
    play.setAttribute('aria-busy', 'true');
    document.getElementById('ovText').textContent = 'Ładowanie komnaty…';
    try {
      const { initGame } = await import('./parkour-game.js');
      game = initGame(next => loadLevel(next));
      if (!game) {
        document.getElementById('wrapG').hidden = true;
        document.querySelector('.pk-bar').hidden = true;
        const fallback = document.getElementById('pkFallback');
        fallback.hidden = false;
        fallback.focus();
        return;
      }
      game.loadLevel(state);
    } catch (error) {
      console.error(error);
      document.getElementById('ovText').textContent = 'Nie udało się wczytać komnaty. Spróbuj ponownie.';
      return;
    } finally {
      play.removeAttribute('aria-busy');
    }
  }
  game.play();
});
restoreLevel();
