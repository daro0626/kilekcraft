import { store } from './store.js';

const SCORE = 'bledy:rekord';
const TIME = new Set(['bledy:czas', 'bledy:najszybsza']);
const PARKOUR = /^pk:best:[PGL](?:10|[1-9])-[KNLE]-[0-9]{1,9}$/;
const FORMAT = 'kilekcraft-postep';
export const MAX_FILE = 1024 * 1024;
const entries = value => Object.entries(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const validKey = key => key.length <= 160 && key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e9;
function validRecord(key, value) {
  if (key === SCORE) return count(value);
  return (TIME.has(key) || PARKOUR.test(key)) && Number.isFinite(value) && value > 0 && value <= 1e9;
}
function dictionary(value, check) {
  if (!object(value) || entries(value).some(([key, val]) => !validKey(key) || !check(val, key))) {
    throw new Error('Nieprawidłowe dane w kopii');
  }
  return value;
}

export function backup({ xp, got, badges, count }) {
  const records = store.keys().map(key => [key, store.get(key)]).filter(([key, val]) => validRecord(key, val));
  return JSON.stringify({ format: FORMAT, wersja: 1, profil: { xp, got, badges, count }, rekordy: Object.fromEntries(records) }, null, 2);
}

export function restore(text, profile, badgeIds) {
  const file = JSON.parse(text);
  if (!object(file) || file.format !== FORMAT || file.wersja !== 1 || !object(file.profil) ||
      !count(file.profil.xp)) throw new Error('Nieprawidłowy format kopii');
  const awards = dictionary(file.profil.got, value => value === 1);
  const badges = dictionary(file.profil.badges, (value, key) => badgeIds.has(key) &&
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
  const counters = dictionary(file.profil.count, count);
  const records = dictionary(file.rekordy, (value, key) => validRecord(key, value));
  const next = {
    xp: Math.max(profile.xp, file.profil.xp),
    got: { ...profile.got, ...awards },
    badges: { ...badges, ...profile.badges },
    count: { ...profile.count },
  };
  for (const [key, value] of entries(counters)) next.count[key] = Math.max(next.count[key] ?? 0, value);
  const changes = [];
  for (const [key, value] of entries(records)) {
    const current = store.get(key);
    const better = !validRecord(key, current) || (key === SCORE ? value > current : value < current);
    if (!better) continue;
    changes.push([key, value]);
    // Duch z tego urządzenia należy do starego czasu.
    if (PARKOUR.test(key)) changes.push([key.replace('pk:best:', 'pk:ghost:'), null]);
  }
  store.restore([['xp', next], ...changes]);
  return next;
}
