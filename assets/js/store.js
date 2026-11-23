// Wspólna przestrzeń zapisu KILEKCRAFT.
const prefix = 'kc:';

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* brak miejsca */ }
  },
  keys() {
    return Object.keys(localStorage).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
  },
  restore(entries) {
    const saved = new Map();
    try {
      for (const [key, value] of entries) {
        const full = prefix + key;
        saved.set(full, localStorage.getItem(full));
        if (value === null) localStorage.removeItem(full);
        else localStorage.setItem(full, JSON.stringify(value));
      }
    } catch (error) {
      for (const [key, raw] of [...saved].reverse()) {
        if (raw === null) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
      }
      throw error;
    }
  },
};
