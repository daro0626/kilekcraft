# Zadania: co dalej

Oznaczenia: **[Codex]** kod, testy, wydajność · **[Claude]** UX, treść, styl, przegląd · **[Piotrek]** test w grze · **[Tata]** decyzja lub zakup.

Każde zadanie kończy się dopiero, gdy spełnia kryteria akceptacji **oraz** budżety z `AGENTS.md`.

---

## C: weryfikacja (najpierw!)

### C1 [Codex] Pierwsze uruchomienie testu komend w CI
- Uruchom workflow „Test komend na serwerze” ręcznie: `version=latest`, `engine=vanilla`, potem `version=26.3`, `engine=paper`.
- Skrypt był pisany bez dostępu do sieci Mojang i PaperMC. Sprawdź pobieranie (szczególnie strukturę API `fill.papermc.io/v3`) i popraw je, jeśli trzeba.
- **Akceptacja:** `data/testy.json` zawiera wyniki dla 6 szablonów, a kreator pokazuje „sprawdzone · 26.3” (albo konkretną listę błędów do poprawy).

### C4 [Codex] Test datapacka na serwerze
- `tools/test_commands.py` odczytuje format datapacka z `version.json` w pliku serwera, wgrywa próbny datapack, uruchamia funkcję i sprawdza każdy blok przez `execute if block`.
- Napisane bez dostępu do serwera. Pierwsze uruchomienie trzeba obejrzeć: ścieżka `version.json` w Paperze, pole `pack_version`, `initial-enabled-packs`, format `pack.mcmeta` w 26.3.
- **Akceptacja:** `data/datapack.json` ma `"sprawdzone": true`, a edytor i komnaty pokazują „sprawdzone · 26.3”.

### C5 [Codex] Pierwsze uruchomienie testów MOTD i „Znajdź błąd”
- Test MOTD ustawia opis z polskimi znakami w `server.properties` i czyta go pingiem statusu (protokół napisany bez dostępu do serwera, do obejrzenia).
- Test „Znajdź błąd” sprawdza 17 par komend. Pytania, które nie przejdą, same znikają z gry. Jeśli zniknie ich dużo, popraw `data/bledy.json`.
- **Akceptacja:** `wyniki.motd.ok` i co najmniej 12 zweryfikowanych pytań.

### A7 [Piotrek] Wyzwanie dnia: czy warto wracać codziennie?
- Sprawdź z kolegą w tym samym dniu, czy macie dokładnie ten sam kod komnaty (strona liczy dzień z zegara urządzenia, nie z serwera — teoretycznie ktoś z innej strefy czasowej mógłby dostać inny dzień, ale dla was to nie powinien być problem).
- Spróbuj przycisku „Skopiuj wynik” i wklej go gdzieś, żeby sprawdzić, czy tekst wygląda dobrze.

### A6 [Piotrek] Wyścig parkour: czy da się przejść?
- Przejdź w przeglądarce P3, P6, P8 i L4. Zapisz czas i miejsca, gdzie fizyka różni się od gry.
- Przejdź tę samą komnatę drugi raz i sprawdź ducha (najlepszy przejazd biegnie obok): czy jest widoczny, czy nie przeszkadza, czy tempo wygląda tak samo jak twój zapamiętany przejazd.

### C2 [Codex] Testy przeglądarkowe
- Playwright: każda z 5 stron otwiera się bez błędów konsoli (desktop i mobile), kreator generuje oczekiwane komendy (porównanie z `commands()` z Pythona), doradca zwraca 3 wyniki dla każdej kombinacji odpowiedzi.
- **Akceptacja:** workflow `test-strony.yml` zielony.

### C3 [Codex] Lighthouse w CI
- **Akceptacja:** raport dla 5 stron, progi z AGENTS.md spełnione albo lista poprawek.

## A: treść

### A1 [Piotrek + Tata] Test przepisu „Pierwszy serwer”
- Piotrek przechodzi 9 szortów i stawia serwer sam (dorosły tylko przy koncie i EULA).
- Zapisz, gdzie się zaciął. **Akceptacja:** status w `serwer.html` zmieniony na „sprawdzone przez Piotrka · data · wersja”.

### A2 [Claude] Odświeżenie cen hostingów
- Sprawdź każdą pozycję w `data/hostingi.json` na stronie hosta (z VAT, w koszyku). Uzupełnij mniejsze plany (2–4 GB), bo dziś są tylko plany 8 GB. Wyjaśnij limity Minehut.
- **Akceptacja:** każda cena ma datę z ostatnich 30 dni i link do strony hosta.

### A4 [Piotrek] Przejście komnat w grze
- Wygeneruj P3, P6, P8, P10, G3, G7 i L5, wgraj na świat testowy i przejdź je. Na górze (G) sprawdź też, czy zbocza naprawdę nie dają się obejść skokami.
- Zapisz kody komnat, w których któryś skok jest niemożliwy albo za łatwy. Poprawimy wtedy zasady skoków w `assets/js/komnaty-gen.js`.
- **Akceptacja:** każdy poziom trudności ma co najmniej jedną komnatę przejdzioną przez Piotrka.

### A5 [Piotrek] Sezon LifeSteal i symulator a prawdziwy serwer
- Zagraj kilka sezonów w „Sezon LifeSteal”. Za łatwo, za trudno, nudno? Która decyzja jest bez sensu?
- Porównaj wynik symulatora zasad z tym, co działo się na serwerze LifeSteal (kto odpadł i kiedy). Jeśli model się myli, opisz jak.

### A3 [Claude] Przepis „LifeSteal z ekonomią” w szortach
- **Część 1 gotowa (`lifesteal.html`):** zasady z symulatora, serca ręcznie komendą `attribute` (kreator, zakładka „Serca”), plugin LifeStealZ ze źródłami i datą, ekonomia serc (wypłata serca jako przedmiot, ożywienie), próba przed startem. Nether i End włączone.
- **Część 2 do zrobienia:** ekonomia za monety (`/sell` z GUI, aukcje, czeki). Serwer Piotrka już nie istnieje, testujemy na serwerze właściciela. Kolejność i zasady: zadania R2–R5 w `docs/CODEX.md`. Cennik (propozycja, niezatwierdzony): `docs/CENNIK_PROPOZYCJA.md`.
- Komendy pluginu (`/hearts`, `/revive`, `lifestealz hearts add`) mają na stronie odznakę „nie testowaliśmy”. Zostaje, dopóki plugin nie przejdzie próby na serwerze testowym (C6).
- **Akceptacja:** przepis przetestowany na serwerze testowym, potem przez Piotrka (A8).

### A8 [Piotrek] Przepis LifeSteal w grze
- Na serwerze testowym (albo z kolegą) ustaw serca komendą z kroku 3 i 4. Sprawdź, czy pasek serc się zmienia i kiedy (patrz znany błąd w kroku 4).
- Jeśli instalujesz LifeStealZ: zapisz wersję pluginu i serwera, sprawdź `/hearts`, zabójstwo z kolegą i wypłatę serca. Nazwę komendy do wypłaty dopisz do przepisu.

### C6 [Codex] Serca w teście komend i próba pluginu
- Pierwsze uruchomienie szablonu `attribute` (7 komend, `minecraft:max_health`). Jeśli serwer odrzuci nazwę, sprawdź na minecraft.wiki aktualny identyfikator i popraw go w `komendy.js` i `test_commands.py` naraz.
- Opcjonalnie: workflow, który wgrywa LifeStealZ na Paper i sprawdza przez RCON `lifestealz hearts add`. Plik pluginu pobieraj tylko z Modrinth albo Hangar.
- **Akceptacja:** `wyniki.attribute.ok` w `data/testy.json`.

## B: budowle

### B2 [Piotrek] Budowanie w grze jak film
- Pobierz datapack miecza ze strony „Budowle”, wgraj na świat testowy, stań na płaskim terenie i wpisz `/function kilekcraft:miecz/animacja`.
- Potem w innym miejscu: `/function kilekcraft:miecz/start`, kilka razy `/nastepna` i raz `/cofnij`.
- Zapisz, czy tempo (pół sekundy na warstwę) jest dobre i czy coś stanęło w złym miejscu.
- **Akceptacja:** obie drogi zbudowały miecz w tym samym miejscu, w którym stał gracz na starcie.

### B1 [Claude] Więcej wielkich budowli — gotowe (20 budowli w 6 kategoriach)
- Kategorie: Średniowiecze, Natura, Fantasy, Przetrwanie, Miasto i kosmos, LifeSteal. Każda budowla ma animację warstwa po warstwie i datapack, a każdy blok przechodzi test „paleta” na serwerze.
- Dalej: po 1–2 budowle do słabszych kategorii (zadanie R6 w `docs/CODEX.md`). Bez postaci i mobów z gry.

### B5 [Piotrek] Nowe budowle w grze
- Wybierz 3 nowe budowle (np. wiatrak, latarnia, rakieta), pobierz datapack i postaw je animacją. Zapisz, czy coś wygląda inaczej niż w przeglądarce.

### B2 [Codex] Wydajność przeglądarki
- Ukrywanie niewidocznych ścian (bloki otoczone z 6 stron nie muszą być rysowane), mniej instancji przy dużych budowlach.
- **Akceptacja:** 60 kl./s na średnim Androidzie dla budowli 15 000 bloków.

### B3 [Codex] Import `.schem` z Kilek World
- Odczyt formatu Sponge Schematic v2/v3 (NBT, gzip) w przeglądarce, mapowanie nieznanych bloków na najbliższy kolor.
- Budowle z Kilek World (spawn, lobby, komnaty) jako pliki w `data/budowle/`.
- **Akceptacja:** spawn Kilek World wyświetla się poprawnie, a lista materiałów zgadza się z grą.

### B4 [Claude] Komnaty-wyzwania z Kilek World
- Komnaty V1/V2 były za łatwe (około 20 sekund). Zaprojektować 10 trudniejszych na papierze, z rosnącą trudnością, a potem pokazać je w przeglądarce.

## D: oprawa

### D1 [Claude] Ikony przedmiotów w kreatorze
- Własne pikselowe ikony 16×16 (nie z gry) zamiast kolorowych kwadratów.

### D2 [Codex] Tryb offline (PWA)
- Strona działa bez internetu na telefonie obok komputera.

---

## Decyzje dla właściciela (gdy przyjdzie czas)
1. Domena i hosting strony: GitHub Pages wystarczy na start (darmowy, workflow jest gotowy).
2. Czy pokazywać publicznie budowle z Kilek World (bez nicków i adresu serwera)?
3. Kiedy otworzyć stronę dla innych graczy: po A1 i C1, nie wcześniej.
