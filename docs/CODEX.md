# CODEX.md: co robić dalej (polecenie od Claude, stan 23 listopada 2026)

Ten plik jest dla Codexa. Właściciel (tata Piotrka) przełącza się między Claude a Codexem, kiedy jednemu kończy się limit. Ten plik ma wystarczyć, żebyś pracował samodzielnie przez kilka godzin bez pytania o rzeczy, które już ustaliliśmy.

Pisz do właściciela po polsku, krótko i konkretnie. Na końcu każdej sesji dopisz do sekcji „Dziennik pracy” na dole tego pliku, co zrobiłeś i co zostało.

---

## 0. Zanim cokolwiek zmienisz

1. Przeczytaj w całości `AGENTS.md`. Zasady 1–7 obowiązują bez wyjątków. Najczęstsze pułapki:
   - **Fakty tylko ze źródła z datą** (`docs/ZRODLA.md`) albo z testu na serwerze. Nazwy komend pluginów, ceny i limity hostingów też.
   - **„Sprawdzone” tylko z CI** (`data/testy.json`, `data/datapack.json`). Nigdy nie wpisuj tego statusu ręcznie.
   - **Logika w dwóch miejscach** (JS + `tools/test_commands.py`) zmieniana w jednym commicie. `tools/test_strony.py` to pilnuje.
   - **Zero atrap.** Przycisk, który nic nie robi, nie wchodzi na stronę.
   - **Prywatność dziecka.** Żadnych kont, formularzy wysyłających dane, analityki. Postęp tylko w `localStorage` przez `store` z `core.js`.
2. Przeczytaj `docs/ZADANIA.md` (lista zadań i kto je robi) i `docs/DANE.md` (skąd biorą się dane i jak działają modele gier).
3. Uruchom lokalnie:
   ```bash
   python3 -m http.server 8000 &
   python3 tools/test_strony.py        # 15 stron × komputer i telefon, musi być 30× OK
   ```
   Jeśli coś nie przechodzi na czystym `main`, najpierw to napraw albo opisz właścicielowi.

## 1. Jak pracujemy

- Każde zadanie: nowa gałąź z aktualnego `main`, nazwa `funkcja/<krótko>` albo `poprawka/<krótko>`.
- Małe commity z opisem po polsku: co i dlaczego.
- Jeden PR na zadanie, opis po polsku, zrzuty ekranu komputer 1366×820 i telefon 390×844 przy każdej zmianie wyglądu.
- **Nie scalaj PR.** Scala właściciel, kiedy napisze „scal”. Możesz go poprosić o to w podsumowaniu.
- Test na prawdziwym serwerze (vanilla 26.3, RCON) robi workflow `test-komend.yml`. Uruchom go na swojej gałęzi:
  ```bash
  gh api -X POST repos/daro0626/kilekcraft/actions/workflows/test-komend.yml/dispatches -f ref=<gałąź>
  ```
  Po przejściu bot `kilekcraft-bot` dopisuje commit „Wyniki testu komend” z nowym `data/testy.json`. Zrób `git pull` przed kolejnym commitem.
- Konflikt w `data/testy.json` przy scalaniu z `main`: weź wersję z gałęzi, potem puść test komend jeszcze raz.
- Gdy zadanie wymaga decyzji właściciela albo testu w grze, zatrzymaj się, opisz opcje i przejdź do następnego zadania.

## 2. Co się zmieniło ostatnio (PR #16, gałąź `funkcja/budowle-kategorie`)

- **Budowle w kategoriach.** `assets/js/builds.js` ma `KATEGORIE` (6 kategorii) i 20 budowli z polem `kat`. Nowe: wiatrak, strażnica, wielkie drzewo, jaskinia kryształów, portal, domek na drzewie, latarnia morska, farma, rakieta, wieżowiec, ołtarz serc, spawn z bazarem. Na stronie jest pasek kategorii (`#kategorie`), a domyślnie widać kategorię wybranej budowli.
- **Paleta bloków sprawdzana na serwerze.** `assets/js/blocks.js` ma 15 nowych bloków. CI stawia każdy blok z palety (`test_palette` w `tools/test_commands.py`, wynik `wyniki.paleta`). Przy datapacku jest znacznik „bloki sprawdzone” albo „N bloków czeka na test” (`packStatusHTML(blockIds)` w `export.js`). Wynik z 23.11: 42/42 OK.
- **Gra „Sezon LifeSteal”** na górze `symulator.html`: model `assets/js/sezon-model.js` (bez DOM), interfejs `assets/js/sezon.js`, style `.sz-*` na końcu `style.css`. Opis modelu i balansu w `docs/DANE.md`. Stary symulator zasad został niżej jako część „Dla admina”. Nowa odznaka `sezon` („Ocalały”), razem 20 odznak.
- `docs/CENNIK_PROPOZYCJA.md`: cennik sprzedaży 176 pozycji od właściciela. To **propozycja do zatwierdzenia**, nie konfiguracja serwera.

## 3. Zadania po kolei

Rób w tej kolejności. Przy każdym jest lista plików, kroki i warunek akceptacji. Jeśli z poprzedniego polecenia (przegląd PR #7–#15, zadania C7–C10) coś jest niedokończone, dokończ to przed zadaniem R2.

### R1. Przegląd PR #16 (budowle + Sezon)
Szukasz błędów, nie zmieniasz zakresu. Każdy znaleziony błąd = poprawka + test w `tools/test_strony.py`.
1. `assets/js/builds.js`: każda budowla ma mniej niż 15 000 bloków, nie ma bloków poniżej y=0 (sprawdza `Grid.set`), nie ma pustych warstw w środku (warstwa bez bloków psuje licznik „Warstwa N z M” w datapacku, bo `layerFunctions` pomija puste `y`). Napisz test, który dla każdej budowli porównuje liczbę różnych `y` z `size[1]` i wypisz budowle z dziurami. Dziura nie musi być błędem (np. latające odłamki), ale sprawdź, czy suwak na stronie i datapack zachowują się wtedy sensownie.
2. `assets/js/budowle.js`: link z hashem (`budowle.html#rakieta`) ma otworzyć właściwą kategorię. Przycisk „Otwórz plan” przy filmach ma działać, gdy wybrana jest inna kategoria. Klawiatura: pasek kategorii i karty da się obsłużyć Tabem i Enterem.
3. `assets/js/sezon-model.js`:
   - Czy żadna ścieżka nie daje serc powyżej `MAX` ani poniżej 0 (test 300 sezonów już jest, dodaj sezony z „mądrą” strategią z `docs/DANE.md`).
   - Czy sojusznik, który odpadł, nie zostaje w `st.ja.sojusz` (powinien być czyszczony w `walka`).
   - Czy zapisany w `localStorage` stan ze starszej wersji (brak pól `ataki`, `atakiW` w `statystyki`) nie psuje gry. Jeśli psuje, dodaj migrację w `sezon.js` (uzupełnij brakujące pola zerami).
4. `assets/js/sezon.js`: obsługa klawiaturą od startu do końca sezonu, fokus po każdej decyzji trafia na pierwszą akcję. `aria-live` w dzienniku nie może czytać całej listy przy każdym ruchu (sprawdź w czytniku albo ogranicz do ostatniego wpisu).
5. Lighthouse mobile dla `budowle.html` i `symulator.html`: Performance ≥ 85, Accessibility ≥ 95. Podaj wyniki w PR.
- **Akceptacja:** PR „Przegląd PR #16” z poprawkami albo z listą „sprawdzone, OK” punkt po punkcie.

### R2. Cennik jako dane i test identyfikatorów przedmiotów
Cel: cennik z `docs/CENNIK_PROPOZYCJA.md` jako dane, które można pokazać na stronie i kiedyś wgrać do pluginu. **Nie zmieniaj kwot.** To decyzja właściciela.
1. Utwórz `data/cennik.json`: `{ "_opis": "...", "status": "propozycja", "zrodlo": "docs/CENNIK_PROPOZYCJA.md", "pozycje": [ { "kategoria", "nazwa", "cena", "id": ["minecraft:..."], "uwagi" } ] }`.
2. Pole `id` to identyfikatory przedmiotów z gry. Pozycje typu „każdy gatunek” albo „każdy kolor” rozpisz na listę identyfikatorów. Pozycja bez ceny (np. „Bloki z drewna topoli (26.3)”) dostaje `"cena": null` i nie jest sprzedawalna.
3. **Identyfikatory sprawdza serwer, nie ty.** Dopisz do `tools/test_commands.py` test `test_cennik`: dla każdego `id` komenda `give @a <id> 1`. Poprawny przedmiot daje odpowiedź „No player was found” (tak działa już test szablonu `give`, zobacz `wyniki.give`), zły daje błąd składni/nieznanego przedmiotu. Wynik zapisz jako `wyniki.cennik` z listą `zweryfikowane` i `bledy`.
4. Identyfikatorów, które serwer odrzuci, nie zgaduj ponownie z pamięci. Sprawdź je na minecraft.wiki (strona przedmiotu, sekcja „Data values”), dopisz źródło z datą do `docs/ZRODLA.md` i puść test jeszcze raz.
- **Akceptacja:** `wyniki.cennik.ok == true` albo lista odrzuconych identyfikatorów opisana w PR.

### R3. Sekcja „Ceny sprzedaży” w przepisie LifeSteal
Plik: `lifesteal.html` (przepis w szortach, część 2 zadania A3) i nowy moduł `assets/js/cennik.js`.
1. Tabela z `data/cennik.json` z wyszukiwarką i filtrem kategorii. Na telefonie karty zamiast tabeli (tak jak w `hosting.js`).
2. Nad tabelą duży, widoczny znacznik **„Propozycja do zatwierdzenia, nie działa jeszcze na serwerze”**. Przy każdym przedmiocie znacznik z testu: „identyfikator sprawdzony · 26.3” albo „czeka na test”.
3. Krótki tekst o zasadach z arkusza: ceny dotyczą sprzedaży jednej sztuki do serwera, łatwe do farmienia surowce są tanie, przedmiot bez ceny jest niesprzedawalny, przedmioty admina (blok poleceń, bariera) są niesprzedawalne.
4. Bez przycisków „wgraj do pluginu”, dopóki nie wiemy, jakiego pluginu użyjemy (zasada 7).
- **Akceptacja:** 30/30 w `test_strony.py`, test filtra i wyszukiwarki, zrzuty.

### R4. Plan testu ekonomii na serwerze właściciela (bez instalowania czegokolwiek)
Kontekst: serwer LifeSteal Piotrka na MCHosting **już nie istnieje**. Testy będą na serwerze właściciela (albo na nowym, który założy). Nie znamy jeszcze listy pluginów na tym serwerze.

Na serwerze Piotrka był zestaw: S-Economy + Vault (saldo w $), SellPlus + packetevents (`/sell` z GUI i ceny w podpowiedziach), AuctionHouse (rynek graczy), SmartWithdraw (czeki), ScoreboardPL (tablica), LifeStealZ (serca), WorldGuard (blokada `/rtp` na spawnie). **To jest historia, a nie fakt o serwerze właściciela.** Żadnej z tych komend nie wpisuj na stronę jako działającej.

Zrób:
1. `docs/EKONOMIA_TEST.md`: lista kontrolna dla właściciela, krok po kroku, prostym językiem. Najpierw `plugins` i `version` w konsoli (właściciel przepisuje wynik), potem saldo przed i po, `/sell` z próbą ESC i pełnego ekwipunku (przedmioty nie mogą zginąć), rynek z dwóch kont, czek: utworzenie, użycie, próba drugiego użycia, scoreboard (nick, serca, $), restart i trwałość salda. Przy każdym kroku: czego się spodziewamy i co wpisać, jeśli wyszło inaczej.
2. Dla każdego pluginu z listy znajdź stronę na Hangar, Modrinth albo SpigotMC, zapisz wersję zgodną z Paper 26.x (jeśli jest), datę i listę komend z dokumentacji **tej wersji** do `docs/ZRODLA.md` w nowej sekcji „Ekonomia (do testu na serwerze właściciela)”. Jeśli dokumentacji nie ma albo nie pasuje do wersji, napisz to wprost.
3. Nic z tego nie trafia jeszcze na stronę. Na stronę trafi dopiero po teście właściciela (zadanie R5).
- **Akceptacja:** właściciel może wydrukować `docs/EKONOMIA_TEST.md` i przejść go sam.

### R5. Wyniki testów ręcznych (czeka na właściciela)
Gdy właściciel napisze, co wyszło w R4:
1. Zapisz to w `data/reczne_testy.json`: `{ "komenda", "plugin", "wersja_pluginu", "wersja_serwera", "wynik": "dziala|nie_dziala|inaczej", "opis", "data", "kto": "wlasciciel" }`. Tylko to, co właściciel napisał. Nic nie dopowiadaj.
2. W przepisie LifeSteal pokaż trzy osobne znaczniki: **„sprawdzone na serwerze właściciela”** (z `data/reczne_testy.json`), **„z dokumentacji, do testu”** (z `docs/ZRODLA.md`), **„nie działa w tej wersji”**. Nie mieszaj tego ze statusem „sprawdzone” z CI, który dotyczy tylko vanilli.
3. Sklep, rynek i czeki opisz osobno. Każdy robi co innego, ale wszystkie używają jednego salda.
4. **Nie dodawaj kupowania serc za pieniądze** ani innych mechanik, których właściciel nie zatwierdził.

### R6. Więcej budowli w słabszych kategoriach
„Miasto i kosmos” ma 2 budowle, „Przetrwanie” i „LifeSteal” po 3. Dodaj po 1–2 do każdej z nich (np. stacja kosmiczna, most wiszący, bunkier, sklep LifeSteal z ladą). Zasady:
- Funkcja w `builds.js` na wzór istniejących (`Grid`, `rng`, zawsze ten sam wynik), wpis w `BUILDS` z `kat`, `name`, `short` (bez polskich znaków nie trzeba, `safeName` to obsługuje), `desc` (1–2 krótkie zdania, na „ty” albo opisowo).
- Mniej niż 15 000 bloków. Tylko bloki z `blocks.js`. Nowy blok = wpis w `blocks.js` (własny kolor i wzór z `voxel-scene.js`, bez tekstur z gry), test `paleta` na serwerze musi go przepuścić.
- Bez postaci i mobów z gry (zasada 4).
- Zrzut każdej nowej budowli z widoku 3D w PR.
- Zaktualizuj liczby w `budowle.html` (lead), `index.html` (karta budowli), `README.md`, `AGENTS.md`, `docs/WIZJA.md`.

### R7. Sezon: kod wyniku dla kolegi (bez serwera)
Piotrek chce porównać się z kolegami. Kont i serwera nie robimy (zasada 5).
1. Po sezonie przycisk „Kopiuj kod wyniku”. Kod: ziarno sezonu + lista decyzji (dzień, akcja, cel) zakodowane krótko (np. base64url), plus suma kontrolna.
2. Pole „Wklej kod kolegi”: strona odtwarza cały sezon z ziarna i decyzji (model jest deterministyczny) i pokazuje wynik kolegi obok twojego. Wynik liczy się z odtworzenia, nie z liczby w kodzie, więc kodu nie da się sfałszować samym wpisaniem punktów.
3. Kod nie zawiera nicka ani niczego, co wpisał gracz. Nic nie wychodzi z przeglądarki.
4. „Zagraj ten sam sezon”: start z ziarnem kolegi.
- Do tego trzeba zapisywać decyzje w `st` (np. `st.ruchy`) i zakupy (wpływają na wynik). Pamiętaj o migracji starego stanu.
- **Akceptacja:** test w `test_strony.py`, który gra sezon, kopiuje kod, wkleja go w nowej karcie i dostaje ten sam wynik.

### R8. Zadania techniczne z poprzedniego polecenia (jeśli jeszcze nie zrobione)
- **C7** CI: macierz vanilla + paper w `test-komend.yml`, wyniki obu silników w `data/testy.json`.
- **C8** `tools/test_komnaty.mjs`: każdy skok w wygenerowanych komnatach (2000 ziaren × trudność 1–10 × typy P, L, G) da się wykonać przy fizyce z `parkour-game.js`. Dodaj do `test-strony.yml`.
- **C9** Kopia postępu: eksport i import XP, odznak i rekordów (także `sezon:rekord`) do pliku `.json`, tylko lokalnie.
- **C10** Edytor: więcej bloków w palecie edytora (`PALETTE` w `edytor.js`). Teraz łatwiej, bo test `paleta` sprawdza każdy blok z `blocks.js`.

## 4. Czego nie robić

- Nie zmieniaj kwot w cenniku, zasad LifeSteal ani balansu Sezonu bez prośby właściciela. Jeśli coś wygląda źle, opisz to w PR.
- Nie przepisuj tekstów dla Piotrka na stronie (przepisy w szortach, opisy budowli). Poprawki literówek i błędów merytorycznych są OK.
- Nie usuwaj starego symulatora zasad. Admin z niego korzysta.
- Nie dodawaj zależności z CDN ani bundlera.
- Nie wpisuj adresów, nazw ani linków do paneli serwerów właściciela i Piotrka.
- Nie proponuj blokowania Netheru i Endu (zasada 6).

## 5. Rzeczy, które czekają na ludzi (nie rób ich za nich)

- **Piotrek w grze:** komnaty G3 i G7 (A4), budowanie miecza warstwami (B2), nowe budowle w grze (B5), LifeStealZ i komenda wypłaty serca (A8).
- **Właściciel:** lista pluginów i wersja jego serwera (R4), zatwierdzenie cennika, decyzje z dołu `docs/ZADANIA.md`.

## 6. Podsumowanie dla właściciela na koniec sesji

Napisz krótko, w tej kolejności:
1. Co jest gotowe (numery PR i jedno zdanie o każdym).
2. Co czeka na „scal”.
3. Co czeka na niego albo na Piotrka (konkretnie: co ma zrobić).
4. Co zostało z tej listy.

---

## Dziennik pracy

- 2026-11-23 · Claude: PR #16 (20 budowli w 6 kategoriach, test palety na serwerze 42/42, gra „Sezon LifeSteal”). Ten plik. Cennik w `docs/CENNIK_PROPOZYCJA.md`.
