# KILEKCRAFT — BRAKI I UWAGI UŻYTKOWNIKA

**Stały rejestr rzeczy omówionych, lecz niedokończonych lub niezweryfikowanych.**
Utworzono: 2026-11-23. Podstawa: zgłoszenia właściciela oraz przegląd kodu gałęzi `main` po PR #38 (commit `509fd52`).

> **To jest źródło prawdy o zgłoszeniach UX i brakach, nie lista ogólnych pomysłów.** Nie wolno oznaczyć zadania jako GOTOWE wyłącznie dlatego, że przechodzą testy automatyczne. Każdy agent przed rozpoczęciem KILEKCRAFT czyta ten plik i `AGENTS.md`. Po każdej zmianie aktualizuje status, PR/commit, wyniki testów oraz pozostałe ryzyka. Nie usuwać zgłoszeń — przenosić do historii ukończonych.

Statusy: **OTWARTE** — niezaimplementowane; **CZĘŚCIOWO** — istnieje część funkcji, ale cel nie został osiągnięty; **DO TESTU** — wdrożone technicznie, wymaga sprawdzenia; **ZAMKNIĘTE** — ukończone i potwierdzone. Priorytety: P0 — blokuje grę / kluczowy UX, P1 — ważna funkcja, P2 — jakość i walidacja.

## Rejestr aktywnych uwag

### KC-001 · P0 · DO TESTU — Intuicyjne menu pauzy w wyścigu parkour
**Zgłoszenie:** po ESC jest «Pauza» i długa instrukcja, ale nie menu przypominające normalną grę. Teksty są zbyt drobne, a «Wróć do generatora komnat» i «Wszystkie gry» nie tłumaczą, co się stanie.
**Etap A, [PR #40](https://github.com/daro0626/kilekcraft/pull/40):** ESC i Pauza otwierają menu z przyciskami Wznów, Od początku, Wybierz poziom i Menu gier. Sterowanie ma osobną rozwijaną sekcję. Test Playwright sprawdza wznowienie tej samej próby i zachowanie rekordu po resecie. Odbiór menu w dłuższej grze przez użytkownika pozostaje do wykonania.
**Wymagania:** ESC/⏸ wyświetla czytelne, duże przyciski **Wznów**, **Od początku**, **Wybierz poziom** i **Menu gier**; na telefonie to samo. Zasady sterowania przenieść pod opcjonalny przycisk «Sterowanie» (np. na ekranie startu). «Od początku» jasno ostrzega o resecie bieżącej próby, zachowuje trwałe rekordy. Bez gubienia focusu, kursora i obsługi dotykowej.
**Akceptacja:** pięć scenariuszy: pauza i wznowienie; reset; wybór nowego poziomu; powrót do gier i ponowne wejście; mobile i klawiatura. Bez niejasnych linków udających menu.

### KC-002 · P0 · DO TESTU — Wybór poziomów i zachowanie bieżącej trasy
**Zgłoszenie:** powrót przez «Wszystkie gry» prowadzi do zaskakującego poziomu, użytkownik widział powrót do trzeciego; brak intuicyjnego wyboru poziomu. Dziecko ma od razu wiedzieć, gdzie jest i co wybrać.
**Etap A, [PR #40](https://github.com/daro0626/kilekcraft/pull/40):** wybierasz typ i poziom 1–10, komnatę losową albo wklejasz kod. Przeglądarka zapamiętuje ostatnią trasę niezależnie od wyborów w generatorze. Playwright obejmuje P1 → G4, historię adresów, powrót z menu gier i z generatora oraz odświeżenie. Czytelność wyboru dla użytkownika pozostaje do sprawdzenia.
**Wymagania:** ekran «Wybierz poziom» z typem komnaty i jasnym poziomem 1–10, czytelne «Kontynuuj ostatnią» z nazwą i kodem, «Nowa losowa» oraz czytelny aktualny poziom. Po nawigacji i odświeżeniu wraca właściwa trasa, o ile użytkownik nie zażądał nowej; bez niespodziewanego resetu na poziom 3. Zachować możliwość wklejenia kodu i udostępnienia linku z hashem.
**Akceptacja:** testy powrotu z `gry.html`, `komnaty.html`, adresu z hashem i przycisku wstecz; przywrócenie ostatniej komnaty po odświeżeniu.

### KC-003 · P1 · DO TESTU — Przebudowa panelu edytora: Budowanie / Animacja / Warstwy
**Zgłoszenie:** aktualne główne zakładki «Całość», «Do tej warstwy», «Tylko ta warstwa» są techniczne i nieintuicyjne. Właściciel chce jasne działania, jak w przeglądarce budowli.
**Stan kodu:** po PR #38 są widoki `all/below/single`, suwak, plan, edycja warstwy i eksport całej budowli; sama technika działa, ale hierarchia sterowania jest niewłaściwa.
**Etap B, [PR #41](https://github.com/daro0626/kilekcraft/pull/41):** trzy zakładki porządkują zadania; Do tej i Tylko ta są w Warstwach. Zachowano zapisy trybu z poprzedniego edytora. Regresje desktop/mobile porównują widoczne i zapisane bloki oraz zawartość wszystkich plików wyeksportowanego datapacka. Ocenę czytelności przez użytkownika pozostawiono do wykonania.
**Wymagania:** główne, łatwe do odczytania działania **Budowanie**, **Animacja** (obejrzyj, jak model powstaje; sterowanie start/pauza/przewiń) i **Warstwy** (wybór warstwy, plan z góry, edycja). Opcje «tylko wybrana / do wybranej» wyłącznie jako ustawienie dodatkowe w trybie Warstwy. Rozdzielić akcję budowania od oglądania animacji; nie wprowadzać w błąd, że animacja buduje na serwerze.
**Akceptacja:** dziecko rozpoznaje trzy główne funkcje bez czytania instrukcji; zbudowane bloki, cofanie/ponawianie, ukryte warstwy, zapis i pełny datapack pozostają nienaruszone. Test desktop/mobile.

### KC-004 · P1 · DO TESTU — Działający import budowli .schem, zamiast zapowiedzi «Wkrótce»
**Zgłoszenie:** na `budowle.html` widać «Wkrótce: twoje budowle z Kilek World». Właściciel nie chce publikować atrap i obietnic funkcji, których nie można użyć.
**Stan kodu:** HTML zawiera dosłowną zapowiedź, a `docs/ZADANIA.md` (B3) opisuje plan importu Sponge Schematic v2/v3 — implementacji brak.
**Wymagania:** umożliwić wczytanie własnego pliku `.schem` (gdy technicznie możliwe: Sponge v2/v3), podgląd 3D oraz warstw i materiałów, komunikaty błędów, limity rozmiaru/ochrona przed uszkodzonym plikiem, testy autentycznych lub wygenerowanych zgodnych plików. Nie dopisywać fikcyjnych budowli z prywatnego serwera. Gdy funkcja nie jest gotowa, **usunąć widoczną zapowiedź z publicznego interfejsu** i pozostawić ją jako zadanie w tym rejestrze; nie oznaczać jako ukończone, dopóki import nie działa.
**Akceptacja:** prawdziwy plik `.schem` daje poprawne wymiary, materiały i warstwy; błędny plik nie wysypuje strony. Brak napisu «Wkrótce» na opublikowanej stronie.
**Etap C1, [PR #42](https://github.com/daro0626/kilekcraft/pull/42):** galeria otwiera lokalny plik Sponge v2/v3 z paletą. Podgląd 3D, plan warstw i lista materiałów korzystają ze wspólnego modelu. Czerwony beton zaznacza bloki spoza palety portalu, z podaną nazwą i liczbą. Podgląd pomija stany bloków, dane skrzyń i istoty oraz nie udostępnia eksportu wczytanego modelu. Usunięto publiczną zapowiedź. Testy Node i Playwright (oba rozmiary) objęły dwa wygenerowane pliki pawilonu, widok warstw i materiałów, odrzucenie uszkodzonego pliku i powrót do galerii. Nie używano materiałów z serwera Piotrka. Pozostaje sprawdzenie własnego pliku użytkownika.

### KC-005 · P1 · DO TESTU — Koło wyzwań ma generować przykład budowli
**Zgłoszenie:** losowanie samego tematu, materiału, czasu i zasady nie wystarcza. Użytkownik chce konkretny przykład tego, co zbudować, najlepiej z przeniesieniem do edytora.
**Stan kodu:** `assets/js/kolo.js`: 20 tematów × 10 ograniczeń materiałowych × 5 czasów × 10 zasad = 10 000 kombinacji; obecnie losuje tekst i otwiera niezależny edytor.
**Wymagania:** dla wylosowanego zestawu przygotować sensowną, dostosowaną do ograniczeń propozycję (nazwa + krótki opis + prosty podgląd/model, jeśli możliwe) i przycisk «Buduj w edytorze» z przeniesieniem pomysłu/szablonu. Przykład: Zamek + bez kamienia + 30 minut + coś ma się ruszać → drewniany zamek z ruchomym mostem. Uwaga: ruchome mechanizmy w prawdziwym Minecrafcie muszą naprawdę działać albo być jasno opisane jako pomysł wymagający redstone; nie udawać, że istnieją. Losowania sprzeczne/nierealne należy poprawiać lub ponawiać. Nie nadpisywać zapisanej budowli bez zgody.
**Akceptacja:** przykładowe losowania mają wiarygodny projekt; przekazanie do edytora działa; testy wariantów i powrotu.
**Etap C2, [PR #43](https://github.com/daro0626/kilekcraft/pull/43):** po losowaniu widać konkretny plan, podpowiedź do zasady i starter z bloków. Edytor pyta przed zastąpieniem placu. Test Node sprawdził 10 000 kombinacji i 9250 zgodnych szkiców, a Playwright na obu ekranach sprawdził przykład zamku nad fosą, odrzucenie szkicu bez utraty projektu, powrót i zapis zatwierdzonego modelu. Mechanizmy ruchome są propozycjami do samodzielnej realizacji w grze. Czytelność planów dla gracza pozostaje do odbioru.

### KC-006 · P1 · DO TESTU — Biblioteka ikonek serwera i przywrócenie serca
**Zgłoszenie:** początkowa ikona serca znika po edycji, nie ma możliwości jej przywrócenia poza rysowaniem od zera. Właściciel chce wybieralne gotowe miniatury.
**Stan kodu:** `assets/js/motd.js` ma tylko stały wzór `HEART` jako domyślny, a potem trwały zapis lokalny.
**Wymagania:** galeria ~20 autorskich miniatur pixel art 16×16 (np. serce, miecz, kilof, skrzynia, tarcza, korona, ogień), przyciski «Przywróć serce», «Edytuj», «Zapisz moją ikonę», «Pobierz PNG». Zmiana szablonu nie niszczy własnej pracy bez potwierdzenia. Wszystkie eksportują się jako prawidłowe `server-icon.png` 64×64, bez kopiowania oficjalnych grafik Minecrafta.
**Akceptacja:** przywracanie po wielu edycjach, zapis/odczyt, eksport PNG, mobile/klawiatura.
**Etap C3, [PR #44](https://github.com/daro0626/kilekcraft/pull/44):** galeria 20 autorskich wzorów 16×16 z podglądem, przywróceniem serca i edycją. Zapisana ikona i szkic są oddzielne. Zastąpienie zmienionego szkicu lub zapisanej ikony wymaga potwierdzenia. Test desktop/mobile obejmuje edycję, odmowę, przywrócenie szkicu po odświeżeniu oraz eksport `server-icon.png` 64×64. Próbę wgrania własnej ikony na serwer pozostawiono użytkownikowi.

### KC-007 · P1 · DO TESTU — Pełne mechaniki komnat w Minecrafcie
**Zgłoszenie:** zawartość powinna działać również na rzeczywistym serwerze, nie tylko w grze przeglądarkowej.
**Stan kodu:** `docs/ZADANIA.md`: M1–M5 i M9 mają mapy możliwe do sprawdzenia w Minecrafcie; M6, M7, M8 i M10 zawierają dodatkowe mechaniki (ciemność, znikające bloki, rosnąca lawa), które **na razie działają tylko w przeglądarce**.
**Wymagania:** dokończyć brakujące mechaniki datapacków i zweryfikować konkretną wersję gry (Vanilla/Paper). Unikać oznakowania «sprawdzone» dla mechaniki, której CI nie uruchomił.
**Akceptacja:** test serwerowy każdej mechaniki, porównanie z opisem na stronie i ewentualny test manualny przed ogłoszeniem gotowości do grania.
**Etap C4, [PR #45](https://github.com/daro0626/kilekcraft/pull/45):** eksport M6, M7, M8 i M10 zawiera rundę, stop, reset i sprzątanie. Pole musi być puste i wczytane. Bariera zatrzymuje lawę w obszarze gry. Playwright na obu ekranach pobiera plik i sprawdza funkcje, a test serwera używa tego samego eksportu. Vanilla i Paper 26.3 zaliczyły po cztery próby kamiennego motywu, z aktorem testowym, bez klienta gracza. Odznaka odczytuje raport CI dla konkretnego kodu. Pozostałe motywy, przejście trasy i wygląd efektu w kliencie pozostają do sprawdzenia. [CI z 24.11.2026](https://github.com/daro0626/kilekcraft/actions/runs/45339253000)

### KC-008 · P1 · DO TESTU — Datapacki: testy CI ≠ ręczne sprawdzenie budowli
**Zgłoszenie:** czy datapack smoka i innych budowli naprawdę da się pobrać i wykonać na serwerze?
**Potwierdzone:** `data/datapack.json` na `main`: `sprawdzone: true`, wersja 26.3; `data/testy.json`: `wyniki.datapack.ok = true`, 8 prób, wynik CI. Raport użytkownika po PR #38: zielone testy Vanilla i Paper. To potwierdza testowaną technikę datapacka, **nie** ręczne ustawienie każdej z 23 budowli na serwerze Piotrka.
**Wymagania:** przygotować bezpieczną listę prób (kopię świata, płaski obszar, komendy, oczekiwane skutki) dla smoka, areny i kilku dużych budowli; w razie błędów rejestrować kod i wersję. Wskaźniki «sprawdzone» opisać precyzyjnie: test CI danej rzeczy vs test użytkownika.
**Akceptacja:** wyniki manualnego uruchomienia lub uczciwy status «do sprawdzenia w świecie gry»; nigdy nie wymyślać wyników.
**Etap C5, gałąź `poprawka/zlecenie-39-proby`:** odznaki w galerii wskazują próbny datapack, próbkę warstw i pojedyncze materiały. [Lista prób](PROBY_BUDOWLI.md) prowadzi przez kopię świata, ręczne warstwy, animację i sprzątanie dla smoka, areny, wieżowca i latającej wyspy. Playwright odczytuje opisy z prawdziwego raportu i nadal pobiera ZIP. Cztery ręczne próby pozostają do wykonania.

### KC-009 · P2 · OTWARTE — Audyt interfejsu wszystkich stron przed szerokim udostępnianiem
**Zgłoszenie:** za dużo małego tekstu, niejasne linki, ukryte przyciski, strony z sekcją «wkrótce» i funkcje oznaczone jako gotowe mimo braków.
**Wymagania:** przejrzeć wszystkie strony na komputerze i telefonie z perspektywy 11-letniego gracza: jednoznaczne przyciski, czytelność, brak zastępczych kontrolek, brak obietnic «wkrótce» w publicznym UI, realne powroty i zachowanie postępu. Zgłaszać każdą nowo wykrytą niespójność jako osobny numer KC. Nie usuwać wymaganych ostrzeżeń o bezpieczeństwie i rzeczywistych ograniczeniach technicznych; zwięźle przenieść je w odpowiednie miejsce.
**Akceptacja:** lista zbadanych stron, ręczne scenariusze, Playwright desktop/mobile, Lighthouse; po testach dostępnych na stronie brak fałszywych deklaracji funkcjonalności.

### KC-010 · P2 · DO TESTU — Checkpointy parkouru: regresje w nowych komnatach
**Zgłoszenie:** na `P4-N-40606` kontakt narożnikiem ze szmaragdem zapisywał odrodzenie poza platformą, powodując niekończący się spadek.
**Stan:** naprawione i opublikowane w PR #38 (`509fd52`); Codex zgłosił 348 prób regresji, w tym 40 narożnikiem. Użytkownik jeszcze nie potwierdził dłuższej gry po aktualizacji.
**Etap A, [PR #40](https://github.com/daro0626/kilekcraft/pull/40):** dodatkowe 32 lądowania z rozpędem na P4-N-40606. Każde powtarza odrodzenie 5 razy, kontrolując podparcie, liczbę śmierci i wyzerowanie ruchu. Test Node przeszedł. Dłuższa rozgrywka użytkownika pozostaje do sprawdzenia.
**Wymagania:** utrzymać testy odrodzenia na rogach, krawędziach, przy prędkości oraz przy wielu kolejnych śmierciach; na wykryty problem tworzyć osobny wpis, a nie przepisywać historię.
**Akceptacja:** potwierdzenie działającego wznowienia gry przez człowieka oraz zielone testy regresji.


### KC-011 · P1 · DO TESTU — Skrót myszy: lewy stawia, prawy usuwa
**Zgłoszenie:** w edytorze budowli użytkownik oczekuje stawiania lewym i kasowania prawym przyciskiem myszy — bez przełączania narzędzia za każdym razem.
**Stan:** __BT__assets/js/edytor.js__BT__ obsługuje edycję przez główny przycisk; drugi jest ignorowany; trzeba uwzględnić blokowanie menu kontekstowego tylko nad płótnem. Nie psuć obrotu kamery, pędzla, symetrii, cofania ani działania na dotyku.
**Etap B, [PR #41](https://github.com/daro0626/kilekcraft/pull/41):** w narzędziu Stawiaj lewy klik stawia blok, prawy usuwa. Pipeta i jawnie wybrane Usuń zachowują dotychczasowe zachowanie. Test używa faktycznych kliknięć myszy i dotyku, sprawdza zakres wyłączenia menu kontekstowego, pędzel, symetrię, cofanie i ponawianie. Obsługę na fizycznym telefonie pozostawiono do potwierdzenia.
**Akceptacja:** klik lewy stawia, prawy usuwa wskazany blok, obrót/przybliżenie działa; mobilne przyciski narzędzia pozostają dostępne. Automatyczne testy interakcji myszy oraz ręczne próby desktop.

### KC-012 · P1 · DO TESTU — Prezentacja warstw sprawia wrażenie budowania w dół
**Zgłoszenie:** na serii dziewięciu zrzutów edytora, przesuwanie przez 9 poziomów nie daje poczucia, że budowla rośnie od fundamentu. Nawet gdy widok «Do tej warstwy» ukrywa wyższe piętra poprawnie matematycznie, UX jest dziwny: kamera, brak jasnego rozróżnienia edycji od odtwarzania i sposób ukrywania elementów.
**Wymagania:** główna **Animacja** ma zaczynać od dolnej warstwy i stopniowo ujawniać następne bez niezamierzonego przesuwania lub odwracania modelu; wyraźne Start/Pauza/Od nowa i krok +/-; **Warstwy** pozostają narzędziem do oglądania i edycji określonej wysokości. Zachować stały fundament/odniesienie, przewidywalną kamerę oraz możliwość obejrzenia całego obiektu. Przed implementacją porównać widok z 9 referencyjnymi zrzutami użytkownika.
**Akceptacja:** film/screenshoty dla warstw 1 → ostatnia i ostatnia → 1, widok pełny, animacja i edycja; dziecko rozumie, co rośnie, co jest ukryte, a co usunięte. Brak zmian w rzeczywistych danych budowli podczas samego podglądu.
**Etap B, [PR #41](https://github.com/daro0626/kilekcraft/pull/41):** animacja ujawnia warstwy od dołu, bez przesuwania kamery, z uruchamianiem, pauzą, resetem i krokami w obie strony. Playwright dla obu widoków przeszedł dziewięć warstw w przód i wstecz, porównał współrzędne kamery, historię zmian i eksport. Zrzuty dziewięciu kroków są w `docs/zrzuty/zlecenie-39-b/`. Dziewięć wcześniejszych zrzutów użytkownika nie było dostępne w załącznikach tej sesji. Do potwierdzenia pozostaje wrażenie podczas własnej pracy użytkownika.

### KC-013 · P1 · DO TESTU — Wyjątkowe, szczegółowe budowle pokazowe wysokiej jakości (bez płatnej blokady)
**Zgłoszenie:** obecne 23 budowle są poprawne jako proste projekty, ale właściciel oczekuje dodatkowych spektakularnych projektów *premium pod względem jakości*: inspiracje przesłane w rozmowie 23.11.2026 — wielki budynek ze strzelistą architekturą na latającej wyspie, monumentalna świątynia z kolumnami, kolorowe archipelagi parkour. Oryginalne projekty, bez kopiowania cudzej mapy 1:1. Chodzi o efekt zachwytu i chęć powrotu, **nie** o wymóg płatnego dostępu.
**Stan:** __BT__assets/js/builds.js__BT__ generuje kształty proceduralnie; to ogranicza detale artystyczne. __BT__assets/js/edytor.js__BT__ ma limit 8000 bloków dla ręcznej edycji, ale nie jest to globalny limit wszystkich modeli ani samego Minecrafta. __BT__assets/js/voxel-scene.js__BT__ wykorzystuje instancing i proste światło. Import własnych __BT__.schem__BT__ z KC-004 pozostaje niedokończony.
**Wymagania:** najpierw **jeden pilotażowy projekt wzorcowy**, a nie kolejnych 20 prostych brył. Propozycje: latający zamek fantasy z monumentalnymi wieżami, łukami, roślinnością i wielopoziomowym terenem; alternatywnie świątynia w stylu monumentalnym albo parkourowy archipelag. Wysoka jakość modelu: zróżnicowana paleta, gzymsy, schody/łuki, otoczenie, elementy oświetlenia, spójna sylwetka i interesujące detale z bliska. Zaprojektować własną koncepcję i blueprint blokowy, nie tylko powiększyć pętlę proceduralną. Ocenić koszt wydajności, import __BT__.schem__BT__, optymalizację siatki/culling/chunking dla dużych modeli, podgląd 3D, warstwy, listę materiałów, datapack oraz testy na urządzeniach mobilnych. Wygląd na screenie może być ulepszany przez shaders, ale model musi dobrze wyglądać **bez shaderów**.
**Akceptacja:** najpierw pokazać właścicielowi render/prototyp jednego modelu, porównać wizualnie ze wskazanymi referencjami; bez zatwierdzenia jakości nie tworzyć serii. Model ma być samodzielną rzeczywistą budowlą z bloków, dającą się wyeksportować i zweryfikować w Minecrafcie, nie tylko obrazkiem 3D w przeglądarce. Zmierzyć rozmiar danych, FPS mobile, koszty exportu, zachować sprawność obecnego portalu i nie oznaczać testów manualnych jako ukończonych bez wykonania.
**Etap D, gałąź `prototyp/zlecenie-39-twierdza`:** jeden prototyp z pięcioma wieżami, trzema wyspami, gankiem, ogrodem i wodospadem. Model ma 15 310 bloków. Test Node porównał współrzędne i materiały wszystkich bloków po imporcie dołączonego `.schem`. Zrzuty i pomiar zapisano w dokumencie [prototypu](PROTOTYP_TWIERDZY.md). Brak próby całej budowli w kliencie Minecraft. Publikacja czeka na ocenę wizualną właściciela.

### KC-014 · P1 · DO TESTU — Przycisk «Kamera» i trzeci widok z rękami
**Zgłoszenie:** zamiast przycisku «1. osoba / 3. osoba» ma być jasny wybór **Kamera**. Użytkownik chce dodatkowo trzeci widok, w którym na ekranie widać ręce postaci podczas parkouru.
**Etap A, [PR #40](https://github.com/daro0626/kilekcraft/pull/40):** menu Kamera i klawisz V przełączają trzy perspektywy. Widok FPS rysuje własne kanciaste ramiona przy dolnych rogach. Wybór zostaje po odświeżeniu. Są testy przełączenia i zapisu oraz zrzuty obu rozmiarów. Ocenę kadru podczas dłuższej gry na fizycznym telefonie pozostawiono do wykonania.
**Wymagania:** wyraźny przycisk **Kamera**, a po kliknięciu prosty wybór **Zza pleców**, **Z oczu** oraz **Z rękami (FPS)**. Widok z rękami ma pokazywać autorskie, kanciaste ręce awatara, z delikatną animacją ruchu/skoku. Nie kopiować modeli/tekstur z Minecrafta. Zapamiętać wybór i zachować obsługę klawisza V (przełącza kolejne tryby), myszy, telefonu, sterowania postacią oraz kursora/pauzy. Żaden widok nie może zasłaniać przeszkód ani wpływać na fizykę/kolizje.
**Akceptacja:** 3 tryby działają na desktopie i telefonie; widać ręce w FPS, nie ma przenikania ręki przez przeszkody, perspektywa nie pogarsza czytelności parkouru, sterowanie i kamera działają płynnie, ustawienie przetrwa odświeżenie. Testy screenshotowe i funkcjonalne. Jeśli wydajność jest zbyt niska, zoptymalizować model, a nie zmieniać silnik bez analizy.

## Zasady pracy Codexa i Claude

1. **Jeden agent wykonawczy na dany zakres.** Nie uruchamiać równocześnie Claude i Codexa nad tym samym fragmentem; to marnuje limity i powoduje konflikty.
2. **Najpierw obecne P0, potem P1.** Nie dodawać nowych komnat ani ozdobników przed usunięciem zgłoszonych braków.
3. Po każdej zmianie dopisać: numer KC, status, commit/PR, testy, znane ograniczenia i dowód, że **realny** problem użytkownika rozwiązano.
4. **Automatyczne testy są konieczne, ale nie wystarczają.** Utrzymywać testy regresji i sprawdzać rzeczywiste przepływy w interfejsie.
5. Nie kasować ani po cichu pomijać żadnych uwag. Jeśli czegoś nie da się wykonać, oznaczyć «BLOKADA», powód i minimalny kolejny krok.
6. **Nie zmieniać ani nie scalać kodu bez odpowiedniego zlecenia.** Ten plik jest listą zadań, a nie zgodą na automatyczne wdrożenie wszystkiego. Uprawnienie do publikacji musi wynikać z konkretnego polecenia właściciela.
7. Dotychczasowy `docs/ZADANIA.md` zawiera inne, starsze plany techniczne (m.in. hosting, LifeSteal, PWA, import schem). Nie mylić jego zapowiedzi ze zrealizowanymi funkcjami. Niniejszy rejestr dotyczy problemów wprost zgłoszonych w rozmowie; nie jest pełnym audytem każdego pomysłu z historii projektu.

## Historia ukończonych

- 2026-11-23 · PR #38 · **Techniczne sterowanie warstwami edytora** wdrożono (Całość / Do tej / Tylko ta), lecz UX pozostaje otwarty jako **KC-003**.
- 2026-11-23 · PR #38 · **Naprawa zapisu checkpointu poza platformą** wdrożona; trwa monitorowanie regresji w **KC-010**.
