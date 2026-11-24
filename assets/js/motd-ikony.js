export const COLORS = ['#ff3d3d', '#a3121a', '#ffc94a', '#2ee59d', '#14a46c', '#5cc8ff', '#2c3fa8', '#a06bff',
  '#ffffff', '#9daccc', '#4a5578', '#141e35', '#000000', '#b48a52', '#6b4f2c', null];
export const SIZE = 16;
export const blankIcon = (color = 15) => Array.from({ length: SIZE }, () => Array(SIZE).fill(color));
export const validIcon = value => Array.isArray(value) && value.length === SIZE && value.every(row =>
  Array.isArray(row) && row.length === SIZE && row.every(c => Number.isInteger(c) && c >= 0 && c < COLORS.length));

function stamp(name, background, draw) {
  const grid = blankIcon(background);
  const rect = (x, y, w, h, color) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) grid[y + dy][x + dx] = color;
  };
  const steps = (x, y, dx, dy, n, size, color) => {
    for (let i = 0; i < n; i++) rect(x + i * dx, y + i * dy, size, size, color);
  };
  draw(rect, steps);
  return { name, grid };
}

export const HEART = stamp('Serce', 11, r => {
    const rows = ['...XX....XX.....', '..XXXX..XXXX....', '.XXXXXXXXXXXX...', '.XXXXXXXXXXXX...', '.XXXXXXXXXXXX...',
      '..XXXXXXXXXX....', '...XXXXXXXX.....', '....XXXXXX......', '.....XXXX.......', '......XX........'];
    rows.forEach((row, y) => [...row].forEach((p, x) => { if (p === 'X') r(x, y + 2, 1, 1, 0); }));
});

export function iconGallery() {
  return [HEART,
  stamp('Miecz', 11, (r, s) => {
    s(5, 9, 1, -1, 8, 2, 5); s(7, 8, 1, -1, 5, 1, 8); s(4, 7, 1, 1, 5, 2, 2); s(1, 13, 1, -1, 4, 2, 14);
  }),
  stamp('Kilof', 11, (r, s) => {
    s(3, 12, 1, -1, 8, 2, 13); r(6, 2, 6, 2, 5); r(10, 4, 3, 2, 5); r(11, 6, 2, 3, 6); r(6, 2, 4, 1, 8);
  }),
  stamp('Skrzynia', 11, r => {
    r(2, 4, 12, 9, 14); r(3, 5, 10, 3, 13); r(3, 9, 10, 3, 13); r(2, 8, 12, 1, 12); r(7, 7, 2, 4, 2);
  }),
  stamp('Tarcza', 11, r => {
    r(3, 3, 10, 7, 9); r(4, 10, 8, 2, 9); r(6, 12, 4, 2, 9); r(4, 4, 8, 5, 6); r(5, 9, 6, 2, 6);
    r(7, 6, 2, 6, 2); r(6, 7, 4, 2, 2);
  }),
  stamp('Korona', 11, r => {
    r(2, 8, 12, 5, 2); r(2, 5, 2, 4, 2); r(7, 4, 2, 5, 2); r(12, 5, 2, 4, 2); r(2, 12, 12, 1, 13);
    r(4, 10, 2, 1, 0); r(7, 9, 2, 2, 7); r(10, 10, 2, 1, 0);
  }),
  stamp('Ogień', 11, r => {
    r(7, 2, 2, 4, 0); r(5, 5, 5, 6, 0); r(10, 6, 2, 2, 1); r(3, 8, 10, 4, 0); r(4, 12, 8, 2, 1);
    r(7, 7, 2, 2, 2); r(6, 9, 4, 4, 2); r(7, 11, 2, 1, 8);
  }),
  stamp('Księżyc', 11, r => {
    r(5, 2, 5, 11, 2); r(3, 4, 5, 7, 2); r(6, 12, 7, 2, 2); r(10, 11, 4, 2, 2);
    r(8, 4, 3, 5, 11); r(11, 3, 1, 1, 8); r(13, 7, 1, 1, 5);
  }),
  stamp('Gwiazda', 11, r => {
    r(7, 2, 2, 11, 2); r(5, 6, 6, 5, 2); r(2, 6, 12, 2, 2); r(4, 11, 3, 3, 2); r(9, 11, 3, 3, 2);
    r(7, 6, 2, 2, 8);
  }),
  stamp('Kryształ', 11, r => {
    r(6, 2, 4, 2, 5); r(4, 4, 8, 8, 7); r(6, 12, 4, 2, 6); r(6, 4, 2, 8, 5); r(6, 5, 1, 3, 8); r(11, 6, 1, 5, 6);
  }),
  stamp('Zamek', 11, r => {
    r(2, 7, 12, 7, 9); r(2, 4, 3, 5, 9); r(11, 4, 3, 5, 9); r(6, 6, 4, 2, 9);
    r(6, 10, 4, 4, 10); r(7, 9, 2, 1, 10); r(3, 6, 1, 2, 6); r(12, 6, 1, 2, 6);
  }),
  stamp('Domek', 11, (r, s) => {
    r(4, 7, 8, 6, 13); s(2, 7, 1, -1, 6, 2, 0); s(8, 3, 1, 1, 5, 2, 0);
    r(7, 9, 2, 4, 14); r(5, 9, 1, 2, 5); r(10, 9, 1, 2, 5); r(3, 13, 10, 1, 4);
  }),
  stamp('Kaktus', 11, r => {
    r(6, 3, 4, 10, 4); r(7, 2, 2, 8, 3); r(3, 5, 2, 5, 4); r(4, 8, 3, 2, 4);
    r(10, 9, 3, 2, 3); r(12, 6, 2, 4, 3); r(4, 13, 8, 1, 13);
  }),
  stamp('Grzyb', 11, r => {
    r(5, 3, 6, 2, 0); r(2, 5, 12, 4, 0); r(3, 9, 10, 1, 1); r(6, 10, 4, 4, 8);
    r(5, 5, 2, 2, 8); r(10, 6, 2, 2, 8); r(8, 3, 1, 1, 8);
  }),
  stamp('Rakieta', 11, r => {
    r(7, 2, 2, 2, 0); r(6, 4, 4, 7, 9); r(7, 5, 2, 3, 5); r(4, 9, 2, 3, 0);
    r(10, 9, 2, 3, 0); r(7, 11, 2, 2, 2); r(7, 13, 2, 1, 0);
  }),
  stamp('Błyskawica', 11, r => {
    r(7, 2, 5, 3, 2); r(5, 5, 5, 3, 2); r(5, 8, 7, 2, 2); r(7, 10, 3, 2, 2);
    r(6, 12, 2, 2, 2); r(8, 3, 2, 2, 8);
  }),
  stamp('Kompas', 11, (r, s) => {
    r(5, 2, 6, 12, 9); r(2, 5, 12, 6, 9); r(4, 4, 8, 8, 10);
    r(5, 5, 6, 6, 11); s(5, 9, 1, -1, 3, 2, 8); s(8, 6, 1, -1, 3, 2, 0); r(7, 7, 2, 2, 2);
  }),
  stamp('Kot', 11, r => {
    r(3, 5, 10, 7, 13); r(3, 3, 2, 3, 14); r(11, 3, 2, 3, 14); r(4, 11, 8, 2, 13);
    r(5, 8, 2, 1, 12); r(9, 8, 2, 1, 12); r(7, 10, 2, 1, 0); r(6, 11, 4, 1, 8);
  }),
  stamp('Pszczoła', 11, r => {
    r(3, 6, 10, 6, 2); r(2, 8, 12, 2, 2); r(6, 6, 1, 6, 14); r(9, 6, 1, 6, 14);
    r(5, 3, 2, 4, 8); r(7, 4, 3, 3, 5); r(11, 8, 1, 1, 12);
  }),
  stamp('Fala', 11, (r, s) => {
    r(2, 11, 12, 3, 6); s(3, 10, 1, -1, 5, 2, 5); r(7, 5, 5, 2, 8);
    r(10, 6, 3, 3, 5); r(9, 8, 3, 2, 6); r(2, 12, 6, 1, 5);
  }),
  ];
}
