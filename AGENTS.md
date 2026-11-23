# AGENTS.md: zasady dla AI pracującego w tym repozytorium

Dotyczy Codexa, Claude i każdego innego agenta. Przeczytaj w całości przed pierwszą zmianą.

## Czym jest projekt
KILEKCRAFT to polska, fanowska strona o Minecraft Java z narzędziami i grami: przepisy w szortach („Pierwszy serwer” i „LifeSteal z ekonomią serc”), doradca hostingu, kreator komend z podglądem, przeglądarka 8 budowli 3D, edytor budowli z eksportem do datapacka, generator komnat-wyzwań, symulator LifeSteal, wyścig parkour w przeglądarce, wyzwanie dnia (jedna komnata dziennie, ta sama dla wszystkich), gra „Znajdź błąd”, koło wyzwań i wygląd serwera (MOTD + ikona). Dźwięki są syntezowane w przeglądarce (`sfx.js`) i domyślnie wyłączone. Na każdej stronie jest poziom gracza (XP i odznaki, tylko w `localStorage`). Głównym odbiorcą jest Piotrek (gra na Javie, głównie na komputerze, lubi shorty i wielkie budowle) oraz jego koledzy. Treść jest pisana publicznie.

Szczegóły: `docs/WIZJA.md`, styl: `docs/STYL.md`, dane: `docs/DANE.md`, zadania: `docs/ZADANIA.md`.

## Zasady nienegocjowalne

1. **Żadnych faktów z pamięci modelu.** Wersje gry, nazwy komend, nazwy gamerule, ceny, limity hostingów: tylko z testu na serwerze albo ze źródła z datą, wpisanego do `docs/ZRODLA.md`. Jeśli nie masz źródła, oznacz rzecz jako niepewną (`"pewnosc": "niska"` albo badge „do sprawdzenia”).
2. **Komenda nie jest „sprawdzona”, dopóki nie przejdzie `tools/test_commands.py`.** Status „sprawdzone” pochodzi wyłącznie z `data/testy.json` zapisanego przez CI. Nigdy nie wpisuj go ręcznie.
3. **Logika istnieje w dwóch miejscach:** komendy w `assets/js/komendy.js` (`build`, 18 szablonów, w tym serca `attribute`) i `tools/test_commands.py` (`commands`), eksport budowli w `assets/js/export.js` (`exportLines`) i `tools/test_commands.py` (`export_lines`), a MOTD w `assets/js/motd.js` (`motdProperty`) i `tools/test_commands.py` (`motd_property`). Zmiana w jednym = zmiana w drugim w tym samym commicie. `tools/test_strony.py` sprawdza zgodność.
4. **Marka Mojang/Microsoft:** żadnych logo, czcionki Minecraft, tekstur ani grafik z gry. Tekstury bloków rysujemy sami (`assets/js/voxel.js`). Nazwa „Minecraft” tylko opisowo. W stopce każdej strony musi być: `NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.`
5. **Prywatność dziecka:** bez kont, logowania, formularzy wysyłających dane, komentarzy, czatu, analityki śledzącej, zdjęć, prawdziwych nazwisk i adresów serwerów Piotrka. Żadne pole nie może prosić o hasło, token, adres IP ani klucz RCON. Postęp tylko w `localStorage` (przez `store` z `core.js`).
6. **Nether i End na serwerze LifeSteal Piotrka zostają włączone.** Nie proponuj ich blokowania.
7. **Zero atrap.** Każdy przycisk i link ma działać. Funkcję „w planie” opisujemy tekstem, bez klikalnego przycisku.

## Technika
- Czysty HTML/CSS/JS (moduły ES), bez bundlera i bez frameworka. Strona ma działać z `python3 -m http.server`.
- Three.js leży lokalnie w `vendor/` (wersja 0.187.0) i jest ładowany przez `importmap`. Bez CDN.
- Czcionki lokalnie w `assets/fonts/` (Jersey 10 na nagłówki, Atkinson Hyperlegible na tekst; licencje OFL obok plików).
- 3D w czterech miejscach: scena na stronie głównej (ładowana po pojawieniu się na ekranie), przeglądarka budowli, edytor i podgląd komnat. Wszędzie poza edytorem jest wariant bez WebGL.
- Gra „Znajdź błąd”: pytanie trafia do gry dopiero, gdy test na serwerze potwierdzi, że zła komenda daje błąd, a dobra działa (`data/testy.json` → `wyniki.bledy.zweryfikowane`).
- Datapack: `data/datapack.json` zapisuje tylko test na serwerze. Do tego czasu strona pokazuje „datapack czeka na test”.
- Każda animacja respektuje `prefers-reduced-motion` (zmienna `reduced` w `core.js` i blok `@media` w CSS).
- Teksty po polsku, na „ty”, krótkie zdania. Bez infantylizowania.

## Budżety jakości (kryteria akceptacji każdej zmiany)
- Lighthouse mobile (Moto G Power, throttling domyślny): Performance ≥ 85, Accessibility ≥ 95 na każdej stronie.
- Brak błędów w konsoli na wszystkich 15 stronach (desktop 1366×820 i mobile 390×844).
- JS pierwszego widoku strony głównej (bez Three.js) < 60 KB nieskompresowany.
- Kontrast tekstu ≥ 4.5:1.
- Wszystkie interakcje działają klawiaturą i dotykiem.

## Jak pracować
- Małe commity, opis po polsku: co i dlaczego.
- Po zmianie wizualnej zrób zrzuty ekranu (desktop + mobile) i dołącz do PR.
- Drugi agent robi przegląd: Claude przegląda kod Codexa (UX, treść, zgodność z zasadami), Codex przegląda kod Claude (błędy, wydajność, testy).
- Jeśli zadanie wymaga decyzji właściciela (z listy w `docs/ZADANIA.md`), zatrzymaj się i opisz opcje.
