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

## `data/datapack.json`
Zawartość `pack.mcmeta` dla datapacków z edytora i generatora komnat. Zapisuje ją `tools/test_commands.py` po udanym teście (`"sprawdzone": true`). Wcześniejsza wartość to tylko przypuszczenie.

## Eksport budowli (`assets/js/export.js`)
- Sąsiednie bloki tego samego typu w rzędzie (oś X) łączymy w `fill`, a pojedyncze bloki to `setblock`.
- Współrzędne są względne (`~`). Budowla stoi 2 bloki w stronę +X od gracza.
- Plik: `data/kilekcraft/function/<nazwa>.mcfunction`, uruchamiany przez `/function kilekcraft:<nazwa>`.
- Portal Netheru pomijamy, bo trzeba go zapalić krzesiwem.

## Komnaty (`assets/js/komnaty-gen.js`)
Kod komnaty `P8-N-4821` = typ (P parkour, L labirynt), trudność, motyw (K/N/L/E), ziarno. Ten sam kod daje zawsze tę samą komnatę. Zasady skoków (przerwy 1–3 bloki, +1 w górę maks. 2) są **do sprawdzenia w grze** (zadanie A4).

## Symulator (`assets/js/lifesteal-sim.js`)
Uproszczony model: losowe pary walczą, szansa wygranej zależy od umiejętności (rozkład normalny) i opcjonalnie od liczby serc. Wynik to 1 przebieg na arenie i 200 przebiegów do wniosków. To nie jest przepowiednia, tylko podpowiedź do zasad.

## Gra „Sezon LifeSteal” (`assets/js/sezon-model.js`, interfejs `assets/js/sezon.js`)
Wymyślona gra, nie opis konkretnego pluginu. 14 dni, gracz i 7 botów, start 5 serc, limit 15. Dzień: jedna akcja gracza (kop, farma, baza, polowanie, sojusz), potem noc: boty się zbroją i napadają (styl: wojownik, ostrożny, kupiec, podstępny). Szansa w walce: funkcja logistyczna z różnicy sprzętu (×0,9) i serc (×0,07), złote jabłko +0,8, obrona bazy −0,45 za poziom (tylko w nocy), sojusznik −0,5, zakres 8–92%. Wydarzenia: dzień 5 targ (−50% w sklepie), dzień 9 noc łowców (napady ×1,8), dzień 12 burza (ryzyko w jaskini ×2). Losowanie z ziarnem (`crypto.getRandomValues`), cały stan to JSON w `kc:sezon:stan`, rekord w `kc:sezon:rekord`. Balans sprawdzony 1000 sezonami w Node: sama farma przeżywa ok. 48%, rozsądna gra ok. 95% i wygrywa ok. 1/3 sezonów. `tools/test_strony.py` gra 300 sezonów i cały sezon w interfejsie.

## Poziom gracza (`assets/js/xp.js`)
XP i odznaki w `localStorage` pod kluczem `kc:xp`. Próg poziomu: 25·n·(n−1). Nic nie wychodzi poza przeglądarkę.


### Wyniki obu silników

Workflow „Test komend na serwerze” rozstrzyga jedną wersję i uruchamia testy na vanilla i Paper. Opcja `engine` pozwala wybrać pojedynczy silnik. Po przebiegu z dwoma silnikami pobierz artefakt `wyniki-komend`. Plik `testy.json` z artefaktu dodaj do `data/` przez PR. Raport zachowuje wyniki obu silników w `silniki`. Pole `wyniki` służy bieżącym widokom MOTD, datapacka i „Znajdź błąd”. Status kreatora korzysta z wyników zgodnych z wybranym zakresem wersji.
