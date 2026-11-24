# Latająca Twierdza Kilek

Prototyp do oceny wizualnej. Zachodni most prowadzi do ogrodu ze szklarnią. Wschodni schodzi na taras z basenem i wodospadem. Pod dziedzińcem widać przekrój skały z pasami ciemnego pryzmarynu i zwisającymi kryształami.

## Droga przez model

1. Od południa wejdź przez bramę do krużganka, który biegnie wokół sali.
2. W nawie znajdziesz kwarcowe kolumny, złoty kompas w posadzce i podwyższenie. Wybierz warstwę pod dachem, by obejrzeć układ wnętrza.
3. Obejrzyj przekroje wież z drewnianymi piętrami i dwie ścieżki odchodzące od głównej wyspy na różnych wysokościach.

Własny rzut, sylwetki i paleta są zapisane w `assets/js/twierdza.js`. Pole DataVersion 5023 pochodzi z `version.json` oryginalnego serwera Mojang 26.3, odczyt 24.11.2026. Polecenie `node tools/test_twierdza.mjs --zapisz` odtwarza plik. [Latająca Twierdza (.schem)](prototypy/latajaca-twierdza-kilek.schem) · [Manifest Mojang](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json)

## Pomiar 24.11.2026

| Próba | Wynik |
| --- | ---: |
| Wymiary i pełny model | 83×66×37, 15 310 bloków w 66 warstwach |
| Sponge Schematic v3 | 5919 B |
| Pełny datapack ZIP i komendy stawiania | 981 544 B, 7389 komend dla całości |
| Trójkąty pełnego widoku | 183 720 przed połączeniem powierzchni, 27 358 po |
| Obrót pełnego modelu na komputerze | 19,0 kl./s |
| Obrót pełnego modelu w emulacji telefonu | 32,8 kl./s |

FPS to ukończone klatki renderera z 6 sekund po rozgrzaniu. Chromium pracował z renderowaniem programowym. Pomiar komputera ma widok 1366×820, a telefonu profil 412×823, DPR 1,75 i CPU 4×. Pomiar na fizycznym urządzeniu pozostaje do wykonania. Przed połączeniem powierzchni uzyskano około 3 kl./s w próbach wstępnych, przy innym DPR telefonu.

Powyżej 12 000 bloków pełny podgląd usuwa wewnętrzne ściany i łączy stykające się prostokątne powierzchnie. W trybie warstw pozostają instancje pełnego modelu. Przekrój pokazuje wnętrze. Limit 8000 dotyczy ręcznej edycji. Model zostaje w galerii z pełnymi materiałami i eksportem.

Test importuje plik, porównuje każdy blok i liczy pliki wszystkich 66 warstw. ZIP został wygenerowany i przeliczony. Ustawienie całej budowli i wygląd wodospadu w kliencie Minecraft pozostają do sprawdzenia na kopii świata. Publikacja wymaga oceny wizualnej właściciela.
