// =========================================================
// KILEKCRAFT — „Sezon LifeSteal”: model gry (bez DOM, da się testować).
// 14 dni, codziennie jedna decyzja, w nocy ruszają boty.
// To gra z uproszczonymi zasadami, a nie opis konkretnego pluginu.
// Cały stan to zwykły obiekt JSON, więc można go zapisać w localStorage.
// =========================================================
import { NICKS } from './lifesteal-sim.js';

export const DNI = 14, START = 5, MAX = 15, BOTY = 7;
export const SPRZET = ['', 'Kamień', 'Żelazo', 'Diament', 'Netheryt'];
export const OBRONA = ['brak', 'płot', 'mur', 'twierdza'];
export const STYLE = {
  wojownik: { name: 'Wojownik', atak: .6, rozwoj: .25, zdrada: .25, opis: 'Często napada w nocy.' },
  ostrozny: { name: 'Ostrożny', atak: .12, rozwoj: .4, zdrada: .05, opis: 'Rzadko walczy, szybko się zbroi.' },
  kupiec: { name: 'Kupiec', atak: .25, rozwoj: .5, zdrada: .12, opis: 'Bogaci się i ulepsza sprzęt.' },
  podstepny: { name: 'Podstępny', atak: .4, rozwoj: .3, zdrada: .55, opis: 'Chętnie zawiera sojusze… i je łamie.' },
};
export const WYDARZENIA = {
  5: { id: 'targ', t: 'Dzień targowy', d: 'Wszystko w sklepie kosztuje dziś połowę ceny.' },
  9: { id: 'lowcy', t: 'Noc łowców', d: 'Tej nocy boty napadają dużo częściej. Przygotuj bazę.' },
  12: { id: 'burza', t: 'Burza', d: 'Kopanie jest dziś dwa razy bardziej ryzykowne.' },
  14: { id: 'final', t: 'Ostatni dzień', d: 'Po tej nocy sezon się kończy. Liczą się serca.' },
};
export const AKCJE = {
  kop: { t: 'Kop w jaskini', d: 'Zarobisz 150–350 $. Czasem znajdziesz lepszy sprzęt. Ryzyko: lawa i potwory zabierają serce.' },
  farma: { t: 'Farma i handel', d: 'Bezpieczne 300–450 $. Nic nie ryzykujesz, ale też nic nie zyskujesz poza pieniędzmi.' },
  baza: { t: 'Wzmocnij bazę', d: 'Obrona +1 (do poziomu 3). W nocy napastnicy trudniej cię pokonają.' },
  walka: { t: 'Polowanie', d: 'Wybierz rywala. Wygrana: zabierasz mu serce. Przegrana: on zabiera twoje.' },
  sojusz: { t: 'Zawrzyj sojusz', d: 'Sojusznik nie napada na ciebie i pomaga bronić bazy. Uwaga na zdrajców.' },
};

function rnd(st) {
  let s = st.rs | 0; s = (s + 0x6D2B79F5) | 0; st.rs = s;
  let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (st, a, b) => Math.round(a + rnd(st) * (b - a));
export const cenaSprzetu = (gear) => 600 * gear;

export function nowySezon(seed) {
  const st = { seed, rs: seed, dzien: 1, koniec: false, log: [], wynik: null, statystyki: { walki: 0, wygrane: 0, ataki: 0, atakiW: 0, napady: 0, odparte: 0, zdrady: 0, smierc: null } };
  const nicks = [...NICKS]; for (let i = nicks.length - 1; i > 0; i--) { const j = Math.floor(rnd(st) * (i + 1)); [nicks[i], nicks[j]] = [nicks[j], nicks[i]]; }
  const styles = Object.keys(STYLE);
  st.ja = { id: 'ja', nick: 'Ty', serca: START, kasa: 150, sprzet: 1, obrona: 0, jablko: 0, totem: 0, zabicia: 0, sojusz: null, zyje: true };
  st.boty = Array.from({ length: BOTY }, (_, i) => ({
    id: 'b' + i, nick: nicks[i], styl: styles[(i + Math.floor(rnd(st) * 4)) % 4], serca: START,
    sprzet: rnd(st) < .3 ? 2 : 1, obrona: 0, zabicia: 0, zyje: true, sojusz: false,
  }));
  st.log.push({ d: 1, t: 'Sezon startuje. Masz 5 serc, kamienny sprzęt i 150 $.' });
  return st;
}

export const zywi = (st) => [st.ja, ...st.boty].filter(p => p.zyje);
export const bot = (st, id) => st.boty.find(b => b.id === id);

// Szansa, że napastnik wygra. Obrona bazy liczy się tylko w nocnych napadach.
export function szansa(st, a, b, wDomu) {
  let s = .9 * (a.sprzet - b.sprzet) + .07 * (a.serca - b.serca);
  if (a.id === 'ja' && a.jablko) s += .8;
  if (b.id === 'ja' && b.jablko) s -= .8;
  if (wDomu) {
    s -= .45 * b.obrona;
    if (b.id === 'ja' && b.sojusz && bot(st, b.sojusz)?.zyje) s -= .5;
  }
  return Math.min(.92, Math.max(.08, 1 / (1 + Math.exp(-s))));
}

function walka(st, a, b, wDomu, pref = '') {
  const p = szansa(st, a, b, wDomu), wygral = rnd(st) < p;
  const [w, l] = wygral ? [a, b] : [b, a];
  if (a.id === 'ja' && a.jablko) a.jablko--;
  if (b.id === 'ja' && b.jablko) b.jablko--;
  if (a.id === 'ja' || b.id === 'ja') { st.statystyki.walki++; if (w.id === 'ja') st.statystyki.wygrane++; }
  if (a.id === 'ja') { st.statystyki.ataki++; if (w.id === 'ja') st.statystyki.atakiW++; }
  let tekst;
  if (l.id === 'ja' && l.totem) { l.totem--; tekst = `${pref}${w.nick} wygrywa, ale totem ratuje twoje serce.`; }
  else {
    l.serca--; w.serca = Math.min(MAX, w.serca + 1);
    tekst = `${pref}${w.id === 'ja' ? 'Wygrywasz z: ' + l.nick + '. +1 serce' : l.id === 'ja' ? w.nick + ' wygrywa. −1 serce' : w.nick + ' zabiera serce: ' + l.nick}.`;
    if (l.serca <= 0) {
      l.zyje = false; l.serca = 0; w.zabicia++;
      tekst += l.id === 'ja' ? ' To było twoje ostatnie serce.' : ` ${l.nick} odpada z sezonu.`;
      if (l.id === 'ja') st.statystyki.smierc = wDomu ? 'napad' : 'walka';
      if (st.ja.sojusz === l.id) st.ja.sojusz = null;
    }
  }
  st.log.push({ d: st.dzien, t: tekst, w: w.id === 'ja' ? 'ok' : l.id === 'ja' ? 'zle' : '' });
  return w;
}

export const cena = (st, rzecz) => {
  const base = rzecz === 'jablko' ? 300 : rzecz === 'totem' ? 1000 : cenaSprzetu(st.ja.sprzet);
  return WYDARZENIA[st.dzien]?.id === 'targ' ? Math.round(base / 2) : base;
};
export function mozeKupic(st, rzecz) {
  if (st.koniec) return false;
  if (rzecz === 'sprzet' && st.ja.sprzet >= 4) return false;
  if (rzecz === 'totem' && st.ja.totem >= 1) return false;
  if (rzecz === 'jablko' && st.ja.jablko >= 2) return false;
  return st.ja.kasa >= cena(st, rzecz);
}
export function kup(st, rzecz) {
  if (!mozeKupic(st, rzecz)) return false;
  st.ja.kasa -= cena(st, rzecz);
  if (rzecz === 'sprzet') { st.ja.sprzet++; st.log.push({ d: st.dzien, t: `Kupujesz sprzęt: ${SPRZET[st.ja.sprzet]}.`, w: 'ok' }); }
  else if (rzecz === 'totem') { st.ja.totem++; st.log.push({ d: st.dzien, t: 'Kupujesz totem. Uratuje jedno serce w przegranej walce.', w: 'ok' }); }
  else { st.ja.jablko++; st.log.push({ d: st.dzien, t: 'Kupujesz złote jabłko na najbliższą walkę.', w: 'ok' }); }
  return true;
}

// Jedna decyzja dnia, potem noc. cel = id bota dla walki i sojuszu.
export function dzien(st, akcja, cel) {
  if (st.koniec || !AKCJE[akcja]) return false;
  const ja = st.ja, ev = WYDARZENIA[st.dzien]?.id;
  if ((akcja === 'walka' || akcja === 'sojusz') && !(bot(st, cel)?.zyje)) return false;
  if (akcja === 'sojusz' && ja.sojusz) return false;
  if (akcja === 'kop') {
    const zysk = between(st, 150, 350); ja.kasa += zysk;
    let t = `Kopiesz: +${zysk} $.`;
    if (ja.sprzet < 4 && rnd(st) < .22) { ja.sprzet++; t += ` Znajdujesz sprzęt: ${SPRZET[ja.sprzet]}!`; }
    st.log.push({ d: st.dzien, t, w: 'ok' });
    if (rnd(st) < (ev === 'burza' ? .24 : .12)) {
      if (ja.totem) { ja.totem--; st.log.push({ d: st.dzien, t: 'Wpadasz w lawę, ale totem cię ratuje.' }); }
      else { ja.serca--; st.log.push({ d: st.dzien, t: 'Potwory w jaskini zabierają ci serce. −1 serce.', w: 'zle' }); if (ja.serca <= 0) { ja.zyje = false; st.statystyki.smierc = 'jaskinia'; } }
    }
  } else if (akcja === 'farma') {
    const zysk = between(st, 300, 450); ja.kasa += zysk; st.log.push({ d: st.dzien, t: `Farma i handel: +${zysk} $.`, w: 'ok' });
  } else if (akcja === 'baza') {
    if (ja.obrona < 3) { ja.obrona++; st.log.push({ d: st.dzien, t: `Wzmacniasz bazę: ${OBRONA[ja.obrona]}.`, w: 'ok' }); }
    else { ja.kasa += 150; st.log.push({ d: st.dzien, t: 'Baza jest już twierdzą. Sprzedajesz nadmiar kamienia: +150 $.' }); }
  } else if (akcja === 'walka') {
    const b = bot(st, cel);
    if (ja.sojusz === cel) { ja.sojusz = null; b.sojusz = false; st.log.push({ d: st.dzien, t: `Zrywasz sojusz z: ${b.nick}.`, w: 'zle' }); }
    walka(st, ja, b, false, 'Polowanie: ');
  } else if (akcja === 'sojusz') {
    const b = bot(st, cel), p = Math.min(.9, Math.max(.2, .75 - (b.serca - ja.serca) * .05 - (b.sprzet - ja.sprzet) * .1));
    if (rnd(st) < p) { ja.sojusz = b.id; b.sojusz = true; st.log.push({ d: st.dzien, t: `${b.nick} zgadza się na sojusz.`, w: 'ok' }); }
    else st.log.push({ d: st.dzien, t: `${b.nick} odmawia sojuszu.` });
  }
  if (ja.zyje) noc(st);
  if (!ja.zyje || st.dzien >= DNI) return zakoncz(st), true;
  st.dzien++;
  if (WYDARZENIA[st.dzien]) st.log.push({ d: st.dzien, t: `${WYDARZENIA[st.dzien].t}: ${WYDARZENIA[st.dzien].d}`, w: 'ev' });
  return true;
}

function noc(st) {
  const ja = st.ja, lowcy = WYDARZENIA[st.dzien]?.id === 'lowcy';
  for (const b of st.boty) {
    if (!b.zyje) continue;
    const S = STYLE[b.styl];
    if (rnd(st) < S.rozwoj) { if (b.sprzet < 4 && (b.obrona >= 2 || rnd(st) < .6)) b.sprzet++; else if (b.obrona < 3) b.obrona++; }
  }
  for (const b of st.boty) {
    if (!b.zyje || !ja.zyje) continue;
    const S = STYLE[b.styl];
    if (b.sojusz && ja.sojusz === b.id) {
      if (rnd(st) < S.zdrada * .25) {
        ja.sojusz = null; b.sojusz = false; st.statystyki.zdrady++; st.statystyki.napady++;
        const w = walka(st, b, ja, true, `Noc: ${b.nick} zdradza sojusz i napada! `);
        if (w.id === 'ja') st.statystyki.odparte++;
      }
      continue;
    }
    if (rnd(st) >= S.atak * (lowcy ? 1.8 : 1)) continue;
    const cele = zywi(st).filter(p => p !== b && !(p.id === ja.sojusz && b.sojusz));
    if (!cele.length) continue;
    const wagi = cele.map(p => 1 / (1 + p.serca / 4 + p.sprzet / 2 + p.obrona / 2));
    let x = rnd(st) * wagi.reduce((s, v) => s + v, 0), i = 0;
    while (x > wagi[i] && i < cele.length - 1) x -= wagi[i++];
    const cel = cele[i];
    if (cel.id === 'ja') {
      st.statystyki.napady++;
      const w = walka(st, b, ja, true, `Noc: ${b.nick} napada na twoją bazę. `);
      if (w.id === 'ja') st.statystyki.odparte++;
    } else walka(st, b, cel, true, 'Noc: ');
  }
}

function zakoncz(st) {
  st.koniec = true;
  const ja = st.ja, ranking = ranking_(st), miejsce = ranking.findIndex(p => p.id === 'ja') + 1;
  const pkt = ja.zyje
    ? ja.serca * 100 + ja.zabicia * 150 + 500 + Math.floor(ja.kasa / 10) + (miejsce === 1 ? 500 : 0)
    : st.dzien * 40 + ja.zabicia * 150;
  st.wynik = { przetrwal: ja.zyje, miejsce, pkt, dzien: st.dzien, odpadli: st.boty.filter(b => !b.zyje).length };
  st.log.push({ d: st.dzien, t: ja.zyje ? `Koniec sezonu! Miejsce ${miejsce} z ${ranking.length}, ${ja.serca} serc.` : `Odpadasz w dniu ${st.dzien}.`, w: ja.zyje ? 'ok' : 'zle' });
}

function ranking_(st) {
  return [st.ja, ...st.boty].sort((a, b) => (b.zyje - a.zyje) || (b.serca - a.serca) || (b.zabicia - a.zabicia) || (a.id === 'ja' ? -1 : b.id === 'ja' ? 1 : 0));
}
export const ranking = ranking_;

// Wnioski po sezonie: krótkie rady wyciągnięte z tego, co się wydarzyło.
export function wnioski(st) {
  const s = st.statystyki, ja = st.ja, out = [];
  if (s.smierc === 'napad' && ja.obrona < 2) out.push('Zginąłeś w nocnym napadzie przy słabej bazie. Wzmocnij bazę, zanim przyjdzie noc łowców (dzień 9).');
  if (s.smierc === 'walka') out.push('Ostatnie serce straciłeś na polowaniu. Atakuj, gdy szansa jest wysoka, a przy małej liczbie serc lepiej zarabiaj i kupuj sprzęt.');
  if (s.smierc === 'jaskinia') out.push('Jaskinia zabrała ci ostatnie serce. Przy 1–2 sercach wybierz bezpieczną farmę albo kup totem.');
  if (s.zdrady) out.push('Sojusznik cię zdradził. Podstępni gracze chętnie zawierają sojusze, więc nie licz tylko na nich.');
  if (s.ataki >= 3 && s.atakiW / s.ataki < .45) out.push('Na polowaniach częściej przegrywałeś, niż wygrywałeś. Patrz na szansę przed atakiem i walcz ze słabiej uzbrojonymi.');
  if (s.napady >= 3 && s.odparte / s.napady < .5) out.push(`W nocy odparłeś ${s.odparte} z ${s.napady} napadów. Lepszy sprzęt i mocniejsza baza bronią serc, gdy śpisz.`);
  if (ja.zyje && ja.kasa > 1500) out.push(`Skończyłeś z ${ja.kasa} $ w kieszeni. Pieniądze na koniec nie bronią serc, lepiej wydać je na sprzęt i totem.`);
  if (s.napady && s.odparte === s.napady) out.push('Odparłeś każdy nocny napad. Mocna baza działa.');
  if (ja.zyje && st.wynik?.miejsce === 1) out.push('Wygrałeś sezon! Spróbuj pobić swój rekord punktów.');
  if (!out.length) out.push('Każdy sezon jest inny: rywale, ich styl i wydarzenia losują się na nowo.');
  return out.slice(0, 3);
}
