// Ekran startowy jest dostępny przed pobraniem silnika 3D.
import { store, toast } from './core.js';
import { encode, decode, kindName } from './komnaty-gen.js';

const codeIn = document.getElementById('code');
const play = document.getElementById('play');
const saved = store.get('komnata');
let state = decode(location.hash.slice(1)) || (saved && decode(encode(saved))) ||
  { type: 'parkour', diff: 3, theme: 'kamien', seed: 4821 };
let game = null;

function loadLevel(next) {
  state = next;
  const code = encode(state);
  codeIn.value = code;
  history.replaceState(null, '', '#' + code);
  store.set('komnata', state);
  if (game) game.loadLevel(state);
  else {
    document.getElementById('ovText').textContent = `${kindName(state.type)} · trudność ${state.diff} · kod ${code}`;
  }
}
document.querySelectorAll('[data-q]').forEach(button => button.addEventListener('click', () => {
  const choice = button.dataset.q;
  const seed = Math.floor(Math.random() * 99999) + 1;
  if (choice === 'rand') {
    const themes = ['kamien', 'nether', 'lod', 'neon'];
    loadLevel({
      type: ['parkour', 'parkour', 'gora', 'labirynt'][Math.floor(Math.random() * 4)],
      diff: 1 + Math.floor(Math.random() * 10),
      theme: themes[Math.floor(Math.random() * themes.length)],
      seed,
    });
  } else {
    loadLevel({ ...decode(`${choice}-K-1`), theme: state.theme, seed });
  }
}));
const loadCode = () => {
  const decoded = decode(codeIn.value);
  if (decoded) loadLevel(decoded);
  else toast('Ten kod wygląda źle. Wzór: P5-K-4821');
};
document.getElementById('load').addEventListener('click', loadCode);
codeIn.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); loadCode(); }
});
play.addEventListener('click', async () => {
  if (play.getAttribute('aria-busy') === 'true') return;
  if (!game) {
    play.setAttribute('aria-busy', 'true');
    document.getElementById('ovText').textContent = 'Ładowanie komnaty…';
    try {
      const { initGame } = await import('./parkour-game.js');
      game = initGame(loadLevel);
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
loadLevel(state);
