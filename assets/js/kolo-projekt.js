// Szkice od dołu do góry. Cyfry wskazują trzy miejsca w palecie, kropka zostawia prześwit.
const THEMES = [
  ['Wieża', 'Wieża z balkonem', 'Ułóż trzon wieży, potem poszerz górę na balkon.', 'obrotową chorągiewkę nad balkonem', ['11111','..1..','..1..','..1..','.222.','23232']],
  ['Most', 'Most nad kanałem', 'Zacznij od dwóch podpór i połącz je prostym pomostem.', 'podnoszone środkowe przęsło', ['11...11','.1...1.','.1...1.','2222222','3.3.3.3']],
  ['Statek', 'Statek z wysokim masztem', 'Zrób kadłub, dodaj maszt, a na nim żagiel o wyraźnym konturze.', 'żagiel zmieniający położenie', ['.11111.','1111111','...2...','...232.','...232.','...23..','...2...']],
  ['Domek na drzewie', 'Domek w koronie', 'Postaw pień i platformę, a nad wejściem zostaw prześwit.', 'wysuwaną drabinę', ['...1...','...1...','..111..','.22222.','.2...2.','2333332','.33333.']],
  ['Fontanna', 'Fontanna na planie krzyża', 'Zbuduj niski basen i podnieś środek, z którego w grze może spływać woda.', 'przerywany strumień wody', ['1111111','1..2..1','..222..','..333..']],
  ['Latarnia morska', 'Latarnia nad zatoką', 'Poprowadź zwężającą się wieżę do przeszklonej komory na szczycie.', 'obracający się sygnał', ['11111','.111.','..1..','..1..','.232.','23332','.222.']],
  ['Portal', 'Brama do innego świata', 'Zostaw wolny środek i postaw po obu stronach kolumny zwieńczone gzymsem.', 'przesuwaną zasłonę w bramie', ['1111111','12...21','12...21','12...21','1233321','.22222.']],
  ['Statua zwierzęcia', 'Pikselowy lis', 'Zacznij od nóg i korpusu, potem dodaj pysk oraz odstające uszy.', 'ruchomy ogon', ['.1...1.','.11111.','2111111','..2222.','...232.','...3.3.']],
  ['Pociąg', 'Lokomotywa z kominem', 'Ustaw dwa koła pod podwoziem, a nad nimi zbuduj kabinę i komin.', 'ruszający się wagon', ['.1...1.','2222222','2332222','233222.','222..3.','.....3.']],
  ['Rakieta', 'Rakieta z dwoma statecznikami', 'Postaw korpus i po dwa skrzydła u podstawy, a czubek zwężaj stopniowo.', 'zamykany właz startowy', ['1.222.1','1122211','.12221.','..232..','..222..','..222..','...2...']],
  ['Wiatrak', 'Wiatrak z krzyżem łopat', 'Zbuduj małą wieżę i zaznacz cztery łopaty wokół osi.', 'obrotowe łopaty', ['.11111.','..111..','..111..','...3...','.33333.','...3...','...3...']],
  ['Arena', 'Arena z dwiema bramami', 'Zaznacz narożniki areny, zrób niskie trybuny i zostaw miejsce na wejście.', 'otwierane wejście na arenę', ['111...111','12.....21','23.....32','3.......3']],
  ['Ogród', 'Ogród z pergolą', 'Rozdziel rabaty ścieżką i ustaw nad przejściem prostą pergolę.', 'furtkę między rabatami', ['211121112','2.......2','2.......2','333333333']],
  ['Sklep na spawnie', 'Kram z daszkiem', 'Zbuduj ladę między dwiema kolumnami i dodaj pasy na markizie.', 'opuszczaną okiennicę', ['1111111','1.222.1','1.....1','2323232','3333333']],
  ['Brama do miasta', 'Brama z blankami', 'Zrób szeroki przejazd między basztami, a u góry dodaj zęby murów.', 'ruchomą kratę', ['111...111','111...111','111...111','122222221','12.2.2.21','3.......3']],
  ['Podwodna baza', 'Kapsuła z oknem', 'Ułóż obrys kapsuły i zaznacz duże okno, które w grze będzie patrzeć na dno.', 'właz śluzy', ['.11111.','1233321','1233321','1233321','.11111.']],
  ['Kryjówka w górze', 'Schron z wejściem w zboczu', 'Otocz wejście nieregularnym zboczem, zostawiając pośrodku pusty tunel.', 'schowaną klapę wejścia', ['111...111','112...211','112333211','.1122211.','..11111..','...111...']],
  ['Piramida', 'Piramida z komorą', 'Postaw szeroki poziom u podstawy, a każdy następny zrób o dwa bloki węższy.', 'przesuwany fragment ściany', ['1111.1111','.222.222.','..33333..','...222...','....3....']],
  ['Grzyb-gigant', 'Grzyb z kropkami', 'Zacznij od trzonu, a nad nim zbuduj szeroki kapelusz z kontrastowymi plamkami.', 'wysuwany balkonik pod kapeluszem', ['...1...','...1...','...1...','2122212','2232322','.22222.','..222..']],
  ['Zamek', 'Zamek z mostem nad fosą', 'Postaw dwie wieże, połącz je murem i zostaw bramę nad fosą.', 'podnoszony most nad fosą', ['111222111','11..2..11','11..2..11','113333311','12.....21','3.3...3.3']],
];
const MATERIALS = [
  ['tylko drewno', ['oak_log', 'oak_planks', 'spruce_planks'], 'dąb i świerk'],
  ['tylko kamień', ['stone_bricks', 'stone', 'smooth_stone'], 'trzy odmiany kamienia'],
  ['tylko 3 kolory', ['blue_concrete', 'white_concrete', 'yellow_concrete'], 'granatowy, biały i żółty'],
  ['bez kamienia', ['oak_log', 'oak_planks', 'red_wool'], 'drewno i czerwona wełna, bez kamienia'],
  ['szkło i metal', ['iron', 'copper_block', 'glass'], 'metalowe ramy i szkło'],
  ['bloki z Netheru', ['magma_block', 'quartz', 'glowstone'], 'magma, kwarc i jasnogłaz'],
  ['tylko naturalne', ['oak_log', 'leaves', 'grass'], 'pnie, liście i trawa'],
  ['dowolne bloki', ['stone_bricks', 'oak_planks', 'cut_copper'], 'kamienne cegły, deski i miedź'],
  ['tylko wełna', ['white_wool', 'red_wool', 'blue_wool'], 'biała, czerwona i niebieska wełna'],
  ['piasek i kwarc', ['quartz', 'sand', 'quartz'], 'piasek i kwarc'],
];
const TIMES = [5, 10, 15, 20, 30];
const RULES = ['symetrycznie', 'bez schodów', 'min. 20 bloków w górę', 'ma świecić w nocy', 'max. 150 bloków',
  'coś ma się ruszać', 'wisi w powietrzu', 'pod ziemią', 'z ukrytym pokojem', 'bez zasady'];

export const LISTS = [THEMES.map(t => t[0]), MATERIALS.map(m => m[0]), TIMES.map(t => t + ' minut'), RULES];
export const compatible = ([theme, material, , rule]) => (rule !== 3 || [2, 5, 7].includes(material))
  && (theme !== 15 || rule !== 6);
export const decodeProject = (value) => {
  if (!/^\d{1,2}(?:-\d{1,2}){3}$/.test(value || '')) return null;
  const indexes = value.split('-').map(Number);
  return indexes.every((i, j) => i < LISTS[j].length) && compatible(indexes) ? indexes : null;
};

export function planFor(indexes) {
  const [theme, material, time, rule] = indexes;
  const [, name, plan, movement, rows] = THEMES[theme];
  let [, palette, materials] = MATERIALS[material];
  if (rule === 3) {
    palette = [palette[0], palette[1], 'glowstone'];
    if (material === 2) materials = 'granatowy, biały i złoty jasnogłaz';
    if (material === 7) materials = 'kamienne cegły, deski i jasnogłaz';
  }
  const tips = [
    'Zbuduj obie strony od osi środka, po jednej warstwie na raz.',
    'Zrób przejścia po pełnych, płaskich blokach.',
    'Wykorzystaj wysoki filar pod szkicem. Całość osiągnie 20 bloków.',
    'Jasnogłaz zaznacza miejsca na światło. Rozmieść go tak, by nocą widać było kształt.',
    'Zacznij od tego małego szkicu i sprawdzaj licznik. Masz limit 150 bloków.',
    'W grze możesz dodać ' + movement + '. Szkic stoi w miejscu. Mechanizm zbuduj osobno.',
    'Zawieś szkic nad ziemią. W grze możesz najpierw użyć podpory i usunąć ją po zbudowaniu.',
    'W grze znajdź przestrzeń pod ziemią i zostaw tunel do wejścia.',
    'Za jedną z wewnętrznych ścian dobuduj mały pokój i zamaskuj wejście.',
    '',
  ];
  const pace = time < 2 ? 'Zacznij od konturu. Detale zostaw na koniec.' :
    time === 4 ? 'Po złożeniu bryły popracuj nad wnętrzem i otoczeniem.' : 'Po złożeniu bryły dopracuj wejście i krawędzie.';
  return { name, plan, materials, tip: tips[rule], pace, palette, rows };
}

export function starterFor(indexes, plan = planFor(indexes)) {
  const [, , time, rule] = indexes;
  const { name, palette, rows } = plan;
  const blocks = new Map();
  const depth = rule === 4 ? 1 : 2 + time;
  const bottom = rule === 2 ? Math.max(0, 20 - rows.length) : rule === 6 ? 3 : 0;
  const width = rows[0].length;
  function put(x, y, z, type) { blocks.set([x, y, z].join(','), [x, y, z, type]); }
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const char = row[x];
      if (!char || char === '.') continue;
      const type = palette[Number(char) - 1], layer = y + bottom;
      for (let z = 0; z < depth; z++) {
        if (z !== 0 && z !== depth - 1 && y && x && x !== width - 1) continue;
        put(x, layer, z, type);
        if (rule === 0) put(width - 1 - x, layer, z, type);
      }
    }
  });
  if (rule === 2) {
    const support = [...blocks.values()].find(([x, y, z]) => y === bottom && z === 0 && x >= width / 2 - 1);
    for (let y = 0; y < bottom; y++) put(support[0], y, 0, palette[0]);
  }
  return { name, size: [width, rows.length + bottom, depth], blocks: [...blocks.values()] };
}
