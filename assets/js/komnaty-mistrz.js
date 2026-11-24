// =========================================================
// KILEKCRAFT — komnaty mistrzowskie M1–M10 (zadanie B4).
// Każda komnata ma stały układ: ta sama dla wszystkich, więc rekordy
// da się porównać. Motyw zmienia tylko kolory zwykłych platform.
// Wynik: { blocks, size, route, bot, info, rules }.
//   route — platformy po kolei (jak w innych komnatach),
//   bot   — punkty dla bota testowego (tools/test_mistrz.mjs),
//   rules — mechanika w przeglądarce: mgła, rosnąca lawa, kruszenie, punkty kontrolne.
// =========================================================

// Opis dla gracza. Tempo to hipoteza do sprawdzenia, nie pomiar.
export const MISTRZ = [
  null,
  { name: 'Lodowy zjazd', mech: 'lód', cel: 'Przejedź po lodzie dwa zakręty i skocz na metę.',
    zasada: 'Na lodzie wolno się rozpędzasz i wolno hamujesz. Zwolnij przed zakrętem.',
    pulapka: 'Za szybko w zakręcie = zjazd do wody.', tempo: '30–60 s',
    gra: 'Działa w grze sam: ubity lód jest śliski. Sprawdź, czy da się wyhamować na dwóch kamiennych blokach przed zakrętem.' },
  { name: 'Miodowe bagno', mech: 'miód', cel: 'Przejdź przez miodowe wysepki nad lawą.',
    zasada: 'Na miodzie idziesz powoli i prawie nie skaczesz. Skacz tylko z kamienia na końcu wysepki.',
    pulapka: 'Skok z miodu jest za krótki i kończy się w lawie.', tempo: '45–80 s',
    gra: 'Działa w grze sam: miód spowalnia i obniża skok. Sprawdź, czy przerwy 2 i 3 bloki da się przeskoczyć z kamienia.' },
  { name: 'Trampoliny', mech: 'szlam', cel: 'Przekrocz trzy przepaście, odbijając się od szlamu na dnie.',
    zasada: 'Spadnij na szlam i daj się odbić. Nie trzymaj skoku ani skradania przy lądowaniu.',
    pulapka: 'Chybisz szlamu = lawa. Trzymasz skok = odbijasz się za nisko.', tempo: '40–70 s',
    gra: 'Działa w grze sam: szlam odbija przy upadku. Sprawdź, czy odbicie z wysokości 5–6 bloków wystarcza na półkę po drugiej stronie.' },
  { name: 'Neo-mury', mech: 'skoki dookoła ściany', cel: 'Obejdź w skoku sześć murów, każdy z drugiej strony.',
    zasada: 'Mur stoi między platformami. Skacz ukośnie i omiń jego róg w powietrzu.',
    pulapka: 'Prosty skok uderza w mur i spadasz w pustkę.', tempo: '50–100 s',
    gra: 'Działa w grze sam. Sprawdź, czy skok dookoła rogu muru grubego na 1 blok wychodzi z rozbiegu.' },
  { name: 'Rozżarzona ścieżka', mech: 'magma', cel: 'Przebiegnij po magmie nad lawą, nie stojąc w miejscu.',
    zasada: 'Magma parzy, gdy na niej stoisz. W przeglądarce po 0,8 s na magmie spadasz. Podskakuj co 3–4 bloki.',
    pulapka: 'Kto się zatrzyma na magmie, wraca do punktu kontrolnego.', tempo: '40–75 s',
    gra: 'W grze magma zadaje obrażenia, ale skradanie przed nimi chroni. Żeby była kara, ustal zasadę „bez skradania” albo daj mniej serc.' },
  { name: 'Ciemna krypta', mech: 'ciemność', cel: 'Znajdź drogę po małych platformach, widząc tylko kilka bloków.',
    zasada: 'Widzisz tylko na kilka bloków. Świecące platformy pokazują kierunek.',
    pulapka: 'Skok w ciemno = pustka.', tempo: '60–120 s',
    gra: 'Funkcja rundy z datapacka nakłada efekt ciemności na osobę grającą. Sprawdź, czy nadal widzisz następny blok.' },
  { name: 'Kruszący się most', mech: 'kruszenie', cel: 'Przejdź po moście, który rozpada się pod stopami.',
    zasada: 'Popękany blok znika chwilę po tym, jak na niego wejdziesz, i wraca po 4 s. Nie zatrzymuj się.',
    pulapka: 'Boczna ścieżka prowadzi donikąd. Kto zawróci, spada.', tempo: '45–90 s',
    gra: 'Funkcja rundy z datapacka kruszy popękane bloki pod stopami, a po chwili je odbudowuje.' },
  { name: 'Wznosząca się lawa', mech: 'lawa rośnie', cel: 'Wespnij się spiralą na szczyt, zanim dogoni cię lawa.',
    zasada: 'Po 4 s lawa zaczyna rosnąć o 1 blok co 1,1 s. Nie ma punktów kontrolnych.',
    pulapka: 'Lawa cię dogoni = cała wspinaczka od początku.', tempo: '25–35 s (przy 1 skoku na sekundę lawa cię nie dogoni)',
    gra: 'Funkcja rundy z datapacka podnosi lawę w osłoniętej komnacie. Po zatrzymaniu rundy usuwa dodatkowe warstwy.' },
  { name: 'Żywioły', mech: 'lód, szlam, magma, miód', cel: 'Przejdź cztery części, każda z innym blokiem.',
    zasada: 'Lód: hamuj przed zakrętem. Szlam: daj się odbić. Magma: nie stój. Miód: skacz z kamienia.',
    pulapka: 'Każda część ma lawę pod spodem. Jeden punkt kontrolny w połowie.', tempo: '90–180 s',
    gra: 'Działa w grze sam (bez komend). Sprawdź każdą część osobno, a potem całość na czas.' },
  { name: 'Finał: Wieża Kilka', mech: 'kruszenie, magma, lawa, mgła', cel: 'Wespnij się po kruszących się platformach, uciekając przed lawą we mgle.',
    zasada: 'Popękane platformy znikają, na magmie nie wolno stać, a lawa rośnie o 1 blok co 1,25 s. Widzisz na 14 bloków.',
    pulapka: 'Brak punktów kontrolnych. Każdy błąd = start od zera.', tempo: '30–45 s (na granicy lawy)',
    gra: 'Funkcja rundy z datapacka łączy ciemność, kruszenie platform i rosnącą lawę. Magma zadaje obrażenia według zasad gry.' },
];

const STONE = 'smooth_stone', ICE = 'packed_ice', HONEY = 'honey_block', SLIME = 'slime_block', MAGMA = 'magma_block', CRACK = 'cracked_bricks';

function room(T) {
  const m = new Map(), bot = [];
  const r = {
    set(x, y, z, t) { m.set(x + ',' + y + ',' + z, [x, y, z, t]); },
    get(x, y, z) { return m.get(x + ',' + y + ',' + z)?.[3]; },
    // platforma; go=true → bot ma na nią trafić (punkt trasy)
    plat(x, y, z, w, d, t, go = true) {
      for (let i = 0; i < w; i++) for (let k = 0; k < d; k++) r.set(x + i, y, z + k, t);
      if (go) bot.push({ p: [x, y, z, w, d] });
    },
    // punkt w powietrzu, przez który trzeba przelecieć (np. dookoła rogu muru)
    air(x, y, z) { bot.push({ a: [x, y, z] }); },
    start(x, y, z) { r.plat(x, y, z - 1, 3, 3, T.alt); r.set(x + 1, y, z, 'gold'); },
    finish(x, y, z) { r.plat(x, y, z - 1, 3, 3, 'diamond'); },
    floor(type, margin = 3) {
      if (!type) return;
      const v = [...m.values()];
      const x0 = Math.min(...v.map(b => b[0])) - margin, x1 = Math.max(...v.map(b => b[0])) + margin;
      const z0 = Math.min(...v.map(b => b[2])) - margin, z1 = Math.max(...v.map(b => b[2])) + margin;
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (!m.has(x + ',0,' + z)) r.set(x, 0, z, type);
    },
    out(info, rules) {
      const v = [...m.values()];
      const mx = Math.min(...v.map(b => b[0])), my = Math.min(0, ...v.map(b => b[1])), mz = Math.min(...v.map(b => b[2]));
      const Mx = Math.max(...v.map(b => b[0])), My = Math.max(...v.map(b => b[1])), Mz = Math.max(...v.map(b => b[2]));
      const sh = (x, y, z) => [x - mx, y - my, z - mz];
      return {
        blocks: v.map(([x, y, z, t]) => [...sh(x, y, z), t]),
        size: [Mx - mx + 1, My - my + 1, Mz - mz + 1],
        route: bot.filter(s => s.p).map(s => [...sh(...s.p.slice(0, 3)), s.p[3], s.p[4]]),
        bot: bot.map(s => s.p ? { p: [...sh(...s.p.slice(0, 3)), s.p[3], s.p[4]] } : { a: sh(...s.a) }),
        info, rules: { fog: null, lava: null, crumble: null, checkpoints: true, ...rules },
      };
    },
  };
  return r;
}

// ---------- M1 Lodowy zjazd ----------
function m1(T) {
  const r = room(T), Y = 3;
  r.start(0, Y, 0);
  r.plat(3, Y, -1, 10, 2, ICE, false); r.plat(13, Y, -1, 2, 2, STONE);
  r.plat(13, Y, 1, 2, 10, ICE, false); r.plat(13, Y, 11, 2, 2, 'emerald');
  r.plat(13, Y, 15, 2, 2, ICE);                       // lądowanie na lodzie po skoku
  r.plat(15, Y, 15, 10, 2, ICE, false); r.plat(25, Y, 15, 2, 2, STONE);
  r.plat(29, Y + 1, 15, 2, 2, ICE); r.plat(31, Y + 1, 15, 6, 2, ICE, false); r.plat(37, Y + 1, 15, 1, 2, STONE);
  r.finish(40, Y + 1, 16);
  r.floor('water');
  return r.out({ skoki: 3, punkty: 1, dno: 'woda' }, {});
}

// ---------- M2 Miodowe bagno ----------
function m2(T) {
  const r = room(T), Y = 3;
  r.start(0, Y, 0);
  let x = 5, y = Y, z = -1;
  for (let i = 0; i < 6; i++) {
    r.plat(x, y, z, 2, 2, i === 3 ? 'emerald' : STONE);
    r.plat(x + 2, y, z, 4, 2, HONEY, false);
    r.plat(x + 6, y, z, 1, 2, STONE);
    const up = i % 2 === 1 ? 1 : 0;
    x += 7 + (up ? 2 : (i % 3 === 2 ? 3 : 2)); y += up; z += i % 2 ? 2 : -1;
  }
  r.finish(x, y, z + 1);
  r.floor('lava');
  return r.out({ skoki: 7, punkty: 1, dno: 'lawa' }, {});
}

// ---------- M3 Trampoliny ----------
function m3(T) {
  const r = room(T);
  r.start(0, 6, 0);
  let x = 3, y = 6;
  for (let k = 0; k < 3; k++) {
    r.plat(x, y, -1, 2, 2, T.plat);                     // krawędź półki
    r.plat(x + 4, 1, -1, 2, 2, SLIME);                  // szlam na dnie przepaści
    r.plat(x + 8, 4, -1, 2, 2, k === 1 ? 'emerald' : T.alt); // półka po drugiej stronie
    // schody z powrotem w górę: +1, +1 (+1 przy ostatniej)
    let sx = x + 11, sy = 4;
    for (let s = 0; s < 2; s++) { sy++; r.plat(sx, sy, -1, 1, 2, T.plat); sx += 2; }
    x = sx; y = sy;
    if (k === 2) break;
  }
  r.finish(x + 1, y, 0);
  r.floor('lava');
  return r.out({ skoki: 12, punkty: 1, dno: 'lawa' }, {});
}

// ---------- M4 Neo-mury ----------
function m4(T) {
  const r = room(T), Y = 3;
  r.start(0, Y, 0);
  // A = platforma, z której skaczesz: x..x+aw-1, z..z+ad-1
  let x = 3, z = -1, aw = 2, ad = 2;
  r.plat(x, Y, z, aw, ad, T.plat);
  for (let n = 0; n < 6; n++) {
    const s = n % 2 ? -1 : 1;                           // z której strony obejść mur
    const wx = x + aw;                                  // mur grubości 1 tuż za platformą
    const zLo = s > 0 ? z - 4 : z, zHi = s > 0 ? z + ad - 1 : z + ad + 3;
    for (let zz = zLo; zz <= zHi; zz++) for (let yy = Y - 2; yy <= Y + 4; yy++) r.set(wx, yy, zz, T.wall);
    r.air(wx + .5, Y + 1.2, s > 0 ? z + ad + .35 : z - .35);
    const nw = n >= 3 ? 1 : 2, bz = s > 0 ? z + ad - nw + 1 : z - 1;
    r.plat(wx + 1, Y, bz, nw, nw, n === 2 ? 'emerald' : T.alt);
    if (n === 5) { r.finish(wx + 3 + nw, Y, bz); break; }
    // rozbieg do następnego muru
    x = wx + 1 + nw; z = bz; aw = 2; ad = nw;
    r.plat(x, Y, z, aw, ad, T.plat);
  }
  return r.out({ skoki: 7, punkty: 1, dno: 'pustka' }, { noFloor: true });
}

// ---------- M5 Rozżarzona ścieżka ----------
function m5(T) {
  const r = room(T), Y = 3;
  r.start(0, Y, 0);
  r.plat(3, Y, -1, 12, 2, MAGMA, false); r.plat(15, Y, -1, 1, 2, MAGMA);
  // schody z magmy w górę
  let x = 16;
  for (let s = 1; s <= 3; s++) { r.plat(x, Y + s, -1, 3, 2, MAGMA); x += 3; }
  r.plat(x, Y + 3, -1, 2, 2, 'emerald');
  // wąska ścieżka z zakrętem
  r.plat(x + 2, Y + 3, 0, 8, 1, MAGMA, false); r.plat(x + 10, Y + 3, 0, 1, 1, MAGMA);
  r.plat(x + 10, Y + 3, 1, 1, 8, MAGMA, false); r.plat(x + 10, Y + 3, 9, 1, 1, MAGMA);
  // wysepki z magmy nad lawą
  let ix = x + 10, iz = 12;
  for (let i = 0; i < 4; i++) { r.plat(ix, Y + 3, iz, 1, 1, MAGMA); iz += 3; }
  r.plat(ix - 1, Y + 3, iz, 3, 6, MAGMA, false); r.plat(ix - 1, Y + 3, iz + 6, 3, 1, MAGMA);
  r.finish(ix - 1, Y + 3, iz + 9);
  r.floor('lava');
  return r.out({ skoki: 6, punkty: 1, dno: 'lawa' }, {});
}

// ---------- M6 Ciemna krypta ----------
function m6(T) {
  const r = room(T), Y = 4;
  r.start(0, Y, 0);
  // [dx, dy, dz] kolejnych skoków na platformy 1×1
  const steps = [[3, 0, 0], [3, 1, 1], [0, 0, 3], [-3, 0, 1], [0, 1, 3], [3, 0, 0], [2, 1, 2], [3, -1, 0], [0, 0, -3], [3, 0, -1], [3, 1, 0], [0, 0, 3], [3, -1, 1], [3, 0, 0], [2, 1, -2], [3, 0, 0]];
  let x = 1, y = Y, z = 0;
  steps.forEach(([dx, dy, dz], i) => {
    x += dx; y += dy; z += dz;
    r.plat(x, y, z, 1, 1, i === 7 ? 'emerald' : i % 3 === 2 ? 'lantern' : T.alt);
  });
  r.finish(x + 3, y, z);
  return r.out({ skoki: steps.length + 1, punkty: 1, dno: 'pustka' }, { fog: 8, noFloor: true });
}

// ---------- M7 Kruszący się most ----------
function m7(T) {
  const r = room(T), Y = 4;
  r.start(0, Y, 0);
  r.plat(3, Y, 0, 8, 1, CRACK, false); r.plat(11, Y, 0, 1, 1, CRACK);
  r.plat(11, Y, 1, 1, 5, CRACK, false); r.plat(11, Y, 6, 1, 1, CRACK);
  // fałszywa odnoga: prowadzi donikąd
  r.plat(12, Y, 6, 6, 1, CRACK, false);
  r.plat(11, Y, 9, 1, 1, CRACK);                       // przerwa 2
  r.plat(11, Y + 1, 12, 1, 1, CRACK);                  // skok w górę
  r.plat(11, Y + 1, 13, 1, 6, CRACK, false); r.plat(11, Y + 1, 19, 2, 2, 'emerald');
  r.plat(13, Y + 1, 20, 9, 1, CRACK, false); r.plat(22, Y + 1, 20, 1, 1, CRACK);
  r.plat(25, Y + 1, 20, 1, 1, CRACK); r.plat(28, Y + 2, 20, 1, 1, CRACK); r.plat(31, Y + 2, 20, 1, 1, CRACK);
  r.plat(31, Y + 2, 17, 1, 1, CRACK); r.plat(31, Y + 2, 14, 1, 1, CRACK);
  r.finish(33, Y + 2, 14);
  return r.out({ skoki: 8, punkty: 1, dno: 'pustka' }, { crumble: { after: .45, back: 4 }, noFloor: true });
}

// Spirala dookoła słupa: platformy 1×1 co 2 pola obwodu, każda o 1 wyżej.
function spiral(r, T, n, R, pick) {
  const ring = [];
  for (let i = -R; i < R; i++) ring.push([i, -R]);
  for (let i = -R; i < R; i++) ring.push([R, i]);
  for (let i = R; i > -R; i--) ring.push([i, R]);
  for (let i = R; i > -R; i--) ring.push([-R, i]);
  for (let y = 0; y <= n + 2; y++) for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) r.set(x, y, z, T.wall);
  let y = 1, k = 0;
  r.plat(-R - 1, 1, -R - 1, 2, 2, T.alt); r.set(-R - 1, 1, -R - 1, 'gold');
  for (let j = 0; j < n; j++) {
    k += 2; y += 1;
    const [x, z] = ring[k % ring.length];
    r.plat(x, y, z, 1, 1, pick(j));
  }
  const [x, z] = ring[(k + 2) % ring.length];
  r.plat(x, y, z, 1, 1, 'diamond');
  return y;
}

// ---------- M8 Wznosząca się lawa ----------
function m8(T) {
  const r = room(T);
  const top = spiral(r, T, 22, 3, (j) => j % 4 === 3 ? T.alt : T.plat);
  r.floor('lava', 2);
  return r.out({ skoki: 23, punkty: 0, dno: 'lawa', wysokosc: top }, { lava: { delay: 4, every: 1.1, y0: 1 }, checkpoints: false });
}

// ---------- M9 Żywioły ----------
function m9(T) {
  const r = room(T), Y = 6;
  r.start(0, Y, 0);
  // lód z zakrętem
  r.plat(3, Y, -1, 8, 2, ICE, false); r.plat(11, Y, -1, 2, 2, STONE);
  r.plat(11, Y, 1, 2, 6, ICE, false); r.plat(11, Y, 7, 2, 2, STONE);
  // szlam: przepaść
  r.plat(11, 1, 11, 2, 2, SLIME);
  r.plat(11, 4, 15, 2, 2, 'emerald');
  r.plat(11, 5, 18, 2, 1, T.plat); r.plat(11, 6, 20, 2, 1, T.plat);
  // magma
  r.plat(11, 6, 21, 2, 10, MAGMA, false); r.plat(11, 6, 31, 2, 1, MAGMA);
  r.plat(11, 6, 34, 1, 1, MAGMA); r.plat(11, 6, 37, 1, 1, MAGMA);
  // miód
  let x = 11, z = 40;
  for (let i = 0; i < 2; i++) { r.plat(x, 6, z, 2, 2, STONE); r.plat(x, 6, z + 2, 2, 4, HONEY, false); r.plat(x, 6, z + 6, 2, 1, STONE); z += 9; }
  r.finish(x - 1, 6, z + 1);
  r.floor('lava');
  return r.out({ skoki: 9, punkty: 1, dno: 'lawa' }, {});
}

// ---------- M10 Finał: Wieża Kilka ----------
function m10(T) {
  const r = room(T);
  const top = spiral(r, T, 26, 3, (j) => j % 5 === 4 ? MAGMA : CRACK);
  r.floor('lava', 2);
  return r.out({ skoki: 27, punkty: 0, dno: 'lawa', wysokosc: top },
    { fog: 14, lava: { delay: 4, every: 1.25, y0: 1 }, crumble: { after: .55, back: 5 }, checkpoints: false });
}

const BUILD = [null, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10];
export function mistrz(n, T) {
  const k = Math.max(1, Math.min(10, n | 0));
  const out = BUILD[k](T);
  out.info = { ...out.info, nazwa: MISTRZ[k].name, mechanika: MISTRZ[k].mech };
  return out;
}
