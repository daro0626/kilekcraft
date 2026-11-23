# KILEKCRAFT

Polska, fanowska akademia serwerowców Minecraft Java. Animowana, ale przede wszystkim użyteczna.

> NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

## Co jest w środku
| Strona | Co robi |
|---|---|
| `index.html` | Napis z bloków, które spadają i reagują na kursor, tablica split-flap i obracająca się wyspa 3D |
| `serwer.html` | Przepis „Pierwszy serwer z kolegami” w 9 szortach |
| `lifesteal.html` | Przepis „LifeSteal z ekonomią serc” w 9 szortach: serca komendą albo pluginem |
| `hosting.html` | Doradca: 4 pytania → 3 najlepsze hostingi z kosztem miesięcznym |
| `komendy.html` | Kreator komend z podglądem w „grze”: 18 rodzajów (przedmioty, efekty, napisy, teleport, zasady, biała lista, serca, tryb gry, pora dnia, pogoda, trudność, moby, zaklęcia, XP, usuwanie bytów, czyszczenie ekwipunku, granica świata, spawn) |
| `budowle.html` | 4 wielkie budowle 3D warstwa po warstwie, z mapą i listą bloków, oraz 2 filmy |
| `edytor.html` | Edytor 3D z symetrią i cofaniem, eksport do datapacka |
| `komnaty.html` | Generator parkourów, gór do wspinaczki i labiryntów 1–10 z kodem komnaty |
| `gry.html` | Zbiór gier: wyścig parkour, Znajdź błąd, koło wyzwań, wygląd serwera |
| `parkour.html` | Wyścig 3D po komnatach z generatora, stoper, rekordy, duch najlepszego przejazdu, widok z 1. i 3. osoby, mysz jak w grze |
| `wyzwanie.html` | Wyzwanie dnia: jedna komnata dziennie (parkour, góra albo labirynt), ta sama dla wszystkich, licząca się z datą |
| `bledy.html` | Gra: znajdź błąd w komendzie — 5 losowych pytań z 63, bez powtórek, stoper i rekord czasu (pytania sprawdzane na serwerze) |
| `kolo.html` | Koło wyzwań budowlanych ze stoperem |
| `motd.html` | Kolorowy opis serwera i ikona 64×64 z podglądem listy serwerów |
| `symulator.html` | Symulator zasad LifeSteal: arena, wykres, wnioski z 200 przebiegów |

## Uruchomienie lokalnie
```bash
python3 -m http.server 8000
# otwórz http://localhost:8000
```
Nie ma żadnej instalacji ani budowania. Wszystko (Three.js, czcionki) leży w repozytorium.

## Publikacja
GitHub Pages: Settings → Pages → Source: **GitHub Actions**. Workflow `pages.yml` zrobi resztę.

## Weryfikacja komend
`tools/test_commands.py` uruchamia prawdziwy serwer i sprawdza każdą komendę z kreatora. W GitHub Actions: zakładka Actions → „Test komend na serwerze” → Run workflow.

## Dla AI (Codex, Claude)
Najpierw przeczytaj **`AGENTS.md`**, a potem `docs/ZADANIA.md`.

## Struktura
```
assets/css/style.css     cały styl (tokeny w :root)
assets/js/core.js        animacje liter, split-flap, kopiowanie, XP
assets/js/blocktitle.js  napis z bloków (własny font 5×7)
assets/js/voxel.js       silnik 3D (Three.js) z własnymi teksturami
assets/js/builds.js      generatory budowli
assets/js/*.js           logika poszczególnych stron
data/*.json              treść, która się starzeje (ceny, komendy, wyniki testów)
docs/                    wizja, styl, dane, zadania, źródła
tools/test_commands.py   test komend na prawdziwym serwerze
vendor/                  Three.js 0.187.0 (licencja MIT)
```

## Licencje
Three.js: MIT (`vendor/THREE-LICENSE`). Czcionki Jersey 10 i Atkinson Hyperlegible: SIL OFL (`assets/fonts/`).
