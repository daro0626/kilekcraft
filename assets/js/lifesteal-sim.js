// =========================================================
// KILEKCRAFT — model serwera LifeSteal (bez DOM, da się testować).
// To uproszczony model, nie prawdziwy serwer. Opis w docs/DANE.md.
// =========================================================
export const NICKS = ['Lis', 'Wilk', 'Sowa', 'Ryś', 'Borsuk', 'Jeż', 'Bóbr', 'Żbik', 'Kruk', 'Łoś', 'Dzik', 'Orzeł', 'Kuna', 'Sarna', 'Wydra', 'Zając', 'Foka', 'Żubr', 'Jastrząb', 'Mysz', 'Bocian', 'Kos', 'Szop', 'Puma', 'Tygrys', 'Panda', 'Koala', 'Lew', 'Żaba', 'Rak'];

export const DEFAULTS = {
  gracze: 10, start: 10, max: 20, walki: 2, umiejetnosci: 50, sercaPomagaja: true,
  zero: 'ban', powrot: 3, odrodzenie: 0, cena: 0, dochod: 400, dni: 14,
};

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(R) { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

export function simulate(p, seed = 1, withEvents = false) {
  const R = rng(seed);
  const players = Array.from({ length: p.gracze }, (_, i) => ({
    id: i, nick: NICKS[i % NICKS.length], hearts: p.start, money: 0, skill: gauss(R) * (p.umiejetnosci / 100),
    active: true, backDay: null, kills: 0, deaths: 0, bought: 0,
  }));
  const days = [], events = [];
  let firstBan = null;
  for (let d = 1; d <= p.dni; d++) {
    const ev = { day: d, fights: [], bans: [], back: [], bought: [] };
    // powroty po banie czasowym
    for (const pl of players) if (!pl.active && pl.backDay === d) { pl.active = true; pl.hearts = Math.max(1, Math.round(p.start / 2)); ev.back.push(pl.id); }
    // przedmiot odrodzenia co N dni (drużyna kogoś przywraca)
    if (p.odrodzenie > 0 && d % p.odrodzenie === 0) {
      const out = players.filter(x => !x.active); if (out.length) { const pl = out[Math.floor(R() * out.length)]; pl.active = true; pl.backDay = null; pl.hearts = Math.max(1, Math.round(p.start / 2)); ev.back.push(pl.id); }
    }
    const act = players.filter(x => x.active);
    // ekonomia: zarobek i zakup serc
    for (const pl of act) {
      pl.money += p.dochod * (0.6 + R() * 0.8) * (1 + Math.max(0, pl.skill) * 0.2);
      if (p.cena > 0) while (pl.money >= p.cena && pl.hearts < p.max) { pl.money -= p.cena; pl.hearts++; pl.bought++; ev.bought.push(pl.id); }
    }
    // walki
    const n = Math.round(act.length * p.walki / 2);
    for (let f = 0; f < n; f++) {
      const alive = players.filter(x => x.active); if (alive.length < 2) break;
      const a = alive[Math.floor(R() * alive.length)]; let b = a;
      while (b === a) b = alive[Math.floor(R() * alive.length)];
      let edge = (a.skill - b.skill) * 2.2;
      if (p.sercaPomagaja) edge += (a.hearts - b.hearts) * 0.06;
      const aWins = R() < 1 / (1 + Math.exp(-edge));
      const w = aWins ? a : b, l = aWins ? b : a;
      l.hearts--; l.deaths++; w.kills++;
      if (w.hearts < p.max) w.hearts++;
      ev.fights.push([w.id, l.id]);
      if (l.hearts <= 0) {
        if (p.zero === 'min1') { l.hearts = 1; }
        else { l.active = false; l.hearts = 0; l.backDay = p.zero === 'powrot' ? d + p.powrot : null; ev.bans.push(l.id); if (firstBan === null) firstBan = d; }
      }
    }
    const hs = players.filter(x => x.active).map(x => x.hearts);
    days.push({
      day: d, active: hs.length, top: hs.length ? Math.max(...hs) : 0,
      avg: hs.length ? hs.reduce((s, x) => s + x, 0) / hs.length : 0,
      money: players.reduce((s, x) => s + x.money, 0),
      snapshot: withEvents ? players.map(x => ({ h: x.hearts, a: x.active })) : null,
    });
    if (withEvents) events.push(ev);
  }
  const total = players.reduce((s, x) => s + x.hearts, 0) || 1;
  const topP = [...players].sort((a, b) => b.hearts - a.hearts)[0];
  return {
    players, days, events, firstBan,
    activeEnd: days[days.length - 1].active,
    topShare: topP.hearts / total,
    topNick: topP.nick, topHearts: topP.hearts,
    boughtAvg: players.reduce((s, x) => s + x.bought, 0) / players.length,
  };
}

// Wiele przebiegów → wnioski odporne na przypadek
export function analyze(p, runs = 200) {
  let act = 0, share = 0, fb = 0, fbN = 0, maxed = 0, bought = 0;
  for (let i = 1; i <= runs; i++) {
    const r = simulate(p, i * 7919);
    act += r.activeEnd / p.gracze; share += r.topShare; bought += r.boughtAvg;
    if (r.firstBan !== null) { fb += r.firstBan; fbN++; }
    if (r.topHearts >= p.max) maxed++;
  }
  const a = {
    zostaje: act / runs, dominacja: share / runs, pierwszyBan: fbN ? fb / fbN : null,
    banProcent: fbN / runs, maxProcent: maxed / runs, kupione: bought / runs,
  };
  a.werdykty = verdicts(p, a);
  return a;
}

export function verdicts(p, a) {
  const v = [];
  if (a.zostaje < .5) v.push({ lvl: 'warn', t: 'Gracze odpadają za szybko', d: `Po ${p.dni} dniach zostaje średnio ${Math.round(a.zostaje * 100)}% graczy. Daj więcej serc na start, włącz powrót po banie albo ogranicz walki.` });
  if (a.pierwszyBan !== null && a.pierwszyBan <= 2.5 && a.banProcent > .5) v.push({ lvl: 'warn', t: 'Pierwszy ban już na początku', d: `Zwykle ktoś odpada w dniu ${a.pierwszyBan.toFixed(1).replace('.', ',')}. Nowi gracze mogą się zniechęcić.` });
  if (a.dominacja > 2.2 / p.gracze && a.maxProcent > .5) v.push({ lvl: 'warn', t: 'Jeden gracz zbiera za dużo', d: `Najsilniejszy gracz ma średnio ${Math.round(a.dominacja * 100)}% wszystkich serc i często dobija do maksimum. Obniż limit serc.` });
  if (p.cena > 0 && a.kupione > (p.max - p.start) * .3) v.push({ lvl: 'warn', t: 'Serca za łatwo kupić', d: `Przeciętny gracz kupuje ${a.kupione.toFixed(1).replace('.', ',')} serca w ${p.dni} dni. Walka traci sens, więc podnieś cenę albo wycofaj serca ze sklepu.` });
  if (a.zostaje > .97 && p.zero !== 'min1') v.push({ lvl: 'info', t: 'Prawie nikt nie odpada', d: 'Jeśli chcesz emocji LifeSteal, zmniejsz liczbę serc na start albo dodaj walk.' });
  if (!v.length) v.push({ lvl: 'ok', t: 'Zasady wyglądają na zbalansowane', d: `Po ${p.dni} dniach gra średnio ${Math.round(a.zostaje * 100)}% graczy, a nikt nie dominuje.` });
  return v;
}
