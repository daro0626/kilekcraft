# Dane i weryfikacja

Cała treść, która się starzeje, leży w `data/`, a nie w kodzie. Aktualizacja po zmianie Minecrafta albo cennika = edycja JSON.

## `data/hostingi.json`
Każdy hosting ma: `nazwa`, `typ` (`darmowy` | `godzinowy` | `abonament` | `wlasny`), cenę (`cena_pln_mies` albo `cena_eur_mies` albo stawki godzinowe), `plusy`, `minusy`, **`zrodlo`**, **`sprawdzono`** (data ISO) i **`pewnosc`** (`wysoka` | `srednia` | `niska`).
- `kurs_eur_pln` to założenie do przeliczeń. Aktualizuj przy każdej aktualizacji cen.
- Ceny starsze niż 60 dni należy sprawdzić ponownie (zadanie A2).

## `data/komendy.json`
- `szablony`: rodzaje komend w kreatorze.
- `przedmioty`, `efekty`, `kolory_tekstu`: listy wyboru z polskimi nazwami i identyfikatorami z gry.
- `zasady`: gamerule z **nową** nazwą (od 1.21.11) i **starą** (do 1.21.10).

## `data/testy.json`
Zapisuje wyłącznie `tools/test_commands.py`. Struktura:
```json
{ "serwer": "vanilla 26.3", "data": "2026-11-24",
  "wyniki": { "give": { "ok": true, "wersja": "26.3", "silnik": "vanilla 26.3", "data": "...", "przetestowano": 28, "bledy": [] } },
  "szczegoly": [ { "szablon": "give", "komenda": "give @a minecraft:diamond 1", "odpowiedz": "...", "ok": true } ] }
```
Kreator pokazuje „sprawdzone” tylko wtedy, gdy `wyniki[szablon].ok === true`.

## Proces weryfikacji komendy
1. Dodaj lub zmień pozycję w `data/komendy.json` (i w razie potrzeby logikę w obu miejscach, patrz AGENTS.md pkt 3).
2. Push na `main` → GitHub Actions uruchamia prawdziwy serwer i wykonuje każdą komendę przez RCON.
3. Odpowiedź serwera z błędem składni (`Unknown or incomplete command`, `<--[HERE]`, `Incorrect argument`…) = test nieudany. „No player was found” = składnia dobra.
4. Wynik ląduje w `data/testy.json`, a strona sama zmienia status.

Test sprawdza **składnię**, a nie efekt w grze. Efekt (np. czy napis wygląda jak w podglądzie) sprawdza Piotrek ręcznie. Wtedy dopisz do `docs/ZRODLA.md` datę i wersję.

## Budowle
`assets/js/builds.js` generuje 4 budowle kodem (deterministycznie). Format: `{ blocks: [[x,y,z,typ]...], size: [x,y,z] }`. Typy bloków i ich identyfikatory z gry są w `BLOCKS`. Import `.schem` z Kilek World to zadanie B3.
