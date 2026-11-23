// =========================================================
// KILEKCRAFT — dźwięki syntezowane w przeglądarce (WebAudio).
// Bez plików audio i bez dźwięków z gry. Domyślnie wyłączone.
// Użycie: import { sfx } from './sfx.js'; sfx('place')
// =========================================================
const KEY = 'kc:dzwiek';
let on = false; try { on = localStorage.getItem(KEY) === '1'; } catch { /* brak pamięci */ }
let ctx = null, master = null;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    ctx = new C(); master = ctx.createGain(); master.gain.value = .35; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, t0, dur, type = 'square', vol = .3, slide = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .02);
}
function noise(t0, dur, vol = .25, freq = 900, q = 1) {
  const n = ctx.sampleRate * dur, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start(t0);
}

const SOUNDS = {
  place: (t) => { noise(t, .07, .5, 420, .8); tone(140, t, .06, 'triangle', .25, .6); },
  remove: (t) => { noise(t, .1, .4, 1200, 1.2); },
  click: (t) => tone(880, t, .04, 'square', .12),
  xp: (t) => { [1318, 1568, 2093].forEach((f, i) => tone(f, t + i * .045, .09, 'sine', .18)); },
  level: (t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * .09, .22, 'square', .14)); tone(1568, t + .5, .5, 'triangle', .2); },
  badge: (t) => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * .07, .18, 'triangle', .2)); },
  jump: (t) => tone(300, t, .12, 'square', .12, 2.2),
  land: (t) => noise(t, .05, .3, 300, .7),
  lava: (t) => { noise(t, .5, .5, 260, .5); tone(180, t, .4, 'sawtooth', .12, .3); },
  checkpoint: (t) => { tone(988, t, .1, 'square', .15); tone(1319, t + .09, .16, 'square', .15); },
  win: (t) => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * .1, .2, 'square', .14)); },
  good: (t) => { tone(880, t, .08, 'triangle', .22); tone(1319, t + .07, .14, 'triangle', .22); },
  bad: (t) => { tone(220, t, .18, 'sawtooth', .16, .6); tone(165, t + .14, .22, 'sawtooth', .16, .6); },
  tick: (t) => tone(1500, t, .02, 'square', .06),
  spin: (t) => tone(600 + Math.random() * 400, t, .03, 'square', .08),
  hit: (t) => { noise(t, .06, .35, 1800, 2); tone(500, t, .05, 'square', .08, .5); },
};

export function sfx(name) {
  if (!on) return;
  const c = ac(); if (!c || !SOUNDS[name]) return;
  try { SOUNDS[name](c.currentTime + .005); } catch { /* ignoruj */ }
}
export const soundOn = () => on;

// przełącznik w nagłówku
function mount() {
  const top = document.querySelector('.top .wrap'); if (!top) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'snd-btn';
  const upd = () => { b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Wyłącz dźwięk' : 'Włącz dźwięk'); b.innerHTML = on ? '<span aria-hidden="true">♪</span>' : '<span aria-hidden="true">♪</span><i aria-hidden="true"></i>'; };
  b.addEventListener('click', () => { on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* bez zapisu */ } upd(); if (on) { ac(); sfx('good'); } });
  upd();
  const xp = top.querySelector('.xp-btn'), menu = top.querySelector('.menu-btn');
  top.insertBefore(b, xp ? xp.nextSibling : menu);
}
mount();
