# Styl A: „Redstone Blueprint”

Nocny warsztat inżyniera: ciemny granat, siatka jak na planie technicznym, akcenty redstone.

## Kolory (zmienne w `assets/css/style.css`)
| Token | Wartość | Do czego |
|---|---|---|
| `--bg` | `#0b1020` | tło |
| `--panel` | `#141e35` | karty |
| `--redstone` | `#ff3d3d` | akcje, główny akcent |
| `--emerald` | `#2ee59d` | „sprawdzone”, sukces, RAM |
| `--gold` | `#ffc94a` | ostrzeżenia, „czeka na test” |
| `--portal` | `#a06bff` | 3D, budowle, magia |
| `--sky` | `#5cc8ff` | linki, informacje |

## Typografia
- **Jersey 10**: tylko duże nagłówki (h1, h2) i duże liczby. Pikselowa, ale czytelna, ma polskie znaki. Pixelify Sans odrzuciliśmy, bo jej Z, C i 2 były mylone przy małych rozmiarach.
- **Atkinson Hyperlegible**: cała reszta, czyli tekst, przyciski, etykiety. Projektowana z myślą o czytelności.
- Nigdy nie używamy czcionki Minecraft.

## Ruch: przesuwające się litery
1. **Napis z bloków** (`blocktitle.js`): własny font 5×7. Każdy blok spada osobno, odbija się i wzbija pył. Po złożeniu przez napis przechodzi fala światła. Bloki unoszą się pod kursorem, a kliknięcie puszcza falę uderzeniową.
2. **Tablica split-flap** (`flapBoard` w `core.js`): komunikaty przewijają się jak na tablicy odlotów.
3. **Litery wjeżdżające** (`data-anim="drop|slide"`): nagłówki rozbite na litery wjeżdżają po kolei, gdy pojawią się na ekranie.
4. **Pas liter** (`.marquee`): ogromne obrysowane słowa przesuwają się w przeciwnych kierunkach razem z przewijaniem.
5. **Konsola**: komendy wpisują się znak po znaku, z kolorowaniem składni.

## Mikrointerakcje
- Kopiowanie wyrzuca kulki XP z przycisku (`xpBurst`).
- Przyciski mają głębię jak blok: jasna faza u góry, ciemna u dołu, a po wciśnięciu zapadają się.
- Przejścia między stronami: View Transitions (Chrome).

## Dostępność
- `prefers-reduced-motion`: wszystkie animacje wyłączone, treść widoczna od razu.
- Napis z bloków ma `aria-label`, tablica split-flap ma ukryty tekst dla czytników ekranu.

## Alternatywy (odrzucone)
- **B „Szkicownik budowniczego”**: jasny, czytelny, ale za mało „WOW”.
- **C „Portal neon”**: za dużo efektów i męczy przy czytaniu.
