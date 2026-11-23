import { BOTY, dzien, kup, nowySezon } from './sezon-model.js';

const PREFIX = 'LS1.';
const MOVES = [
  ['kop', null], ['farma', null], ['baza', null],
  ...['walka', 'sojusz'].flatMap(action => Array.from({ length: BOTY }, (_, i) => [action, 'b' + i])),
  ['kup', 'sprzet'], ['kup', 'totem'], ['kup', 'jablko'],
];
const MAX_MOVES = 64;
const SEED_BYTES = 4;
const CHECKSUM_BYTES = 4;
const MAX_CODE = PREFIX.length + Math.ceil((SEED_BYTES + MAX_MOVES + CHECKSUM_BYTES) * 4 / 3);

function checksum(bytes) {
  let value = 0x811c9dc5;
  for (const byte of bytes) value = Math.imul(value ^ byte, 0x01000193);
  return value >>> 0;
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function encodeSeason(state) {
  if (!state.koniec || !Array.isArray(state.ruchy) || state.ruchy.length > MAX_MOVES) return null;
  const end = SEED_BYTES + state.ruchy.length;
  const bytes = new Uint8Array(end + CHECKSUM_BYTES);
  const header = new DataView(bytes.buffer);
  header.setUint32(0, state.seed);
  for (const [i, [, action, target]] of state.ruchy.entries()) {
    const code = MOVES.findIndex(([a, t]) => action === a && target === t);
    if (code < 0) return null;
    bytes[SEED_BYTES + i] = code;
  }
  header.setUint32(end, checksum(bytes.subarray(0, end)));
  const code = PREFIX + base64url(bytes);
  try {
    const replay = decodeSeason(code);
    return replay.wynik.pkt === state.wynik.pkt
      && JSON.stringify(replay.ruchy) === JSON.stringify(state.ruchy) ? code : null;
  } catch {
    return null;
  }
}

export function decodeSeason(code) {
  const trimmed = code.trim();
  const payload = trimmed.slice(PREFIX.length);
  if (!trimmed.startsWith(PREFIX) || trimmed.length > MAX_CODE || !/^[A-Za-z0-9_-]+$/.test(payload)) {
    throw new Error('Nieprawidłowy kod sezonu.');
  }
  const bytes = Uint8Array.from(atob(payload.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
  const end = bytes.length - CHECKSUM_BYTES;
  if (base64url(bytes) !== payload || end <= SEED_BYTES || end - SEED_BYTES > MAX_MOVES) {
    throw new Error('Nieprawidłowa długość kodu.');
  }
  const header = new DataView(bytes.buffer);
  if (checksum(bytes.subarray(0, end)) !== header.getUint32(end)) throw new Error('Kod został zmieniony.');
  const seed = header.getUint32(0);
  if (seed < 1 || seed > 999999) throw new Error('Nieprawidłowe ziarno.');
  const state = nowySezon(seed);
  for (const move of bytes.subarray(SEED_BYTES, end)) {
    const entry = MOVES[move];
    if (!entry) throw new Error('Nieznany ruch.');
    const [action, target] = entry;
    const played = action === 'kup' ? kup(state, target) : dzien(state, action, target);
    if (!played) throw new Error('Ruch jest niemożliwy do wykonania.');
  }
  if (!state.koniec) throw new Error('Kod zawiera niedokończony sezon.');
  return state;
}
