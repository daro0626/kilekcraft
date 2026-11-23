# KILEKCRAFT — ZLECENIE ZBIORCZE DLA CODEXA (2026-11-23)

**Wykonawca:** jeden agent — Codex High. **Claude:** nie koduje równolegle; ewentualny późniejszy przegląd artystyczny po zakończeniu etapu, bez równoległej edycji.
**Cel:** dopracować obecny portal zgodnie z REALNYMI uwagami właściciela. Nie produkować kolejnych pobocznych atrakcji. Koniec z zielonymi testami, gdy podstawowa nawigacja jest nadal nieintuicyjna.
**Dokument obowiązkowy:** `docs/BRAKI_I_UWAGI.md` (14 zgłoszeń KC-001–KC-014), `AGENTS.md`, `docs/ZADANIA.md`.
**Stan wyjściowy:** po PR #38; wcześniejsze PR #28–#35 są starymi gałęziami, ich treść była już integrowana w #36 i #30. **Nie scalać ich ponownie.** Aktualne źródło: gałąź `main`. Nie zakładać, że testy na prywatnym serwerze Piotrka są wykonane.

## Zasady organizacji pracy

1. Na starcie pobierz aktualny `main`, sprawdź commit i bieżące CI, potem przeczytaj cały rejestr zgłoszeń. Nie rozpoczynaj na przestarzałej gałęzi.
2. Pracuj **etapami A → B → C → D → E**. Każdy etap: kod + regresje + testy Playwright desktop/mobile + Lighthouse według AGENTS.md + screenshot/wideo przepływu + uaktualnienie statusu odpowiednich KC. Obejrzyj zmienione UI, a nie tylko policz testy.
3. Przygotowuj małe PR per etap, z opisem, co rzeczywiście działa, czego nie zrobiono i co wymaga testu użytkownika. Przed publikacją przeprowadź wszystkie wymagane testy na końcowym SHA. Nie przerywaj po jednym drobiazgu, ale nie wypychaj niedokończonej funkcji jako gotowej.
4. Możesz autonomicznie integrować i publikować **w pełni przetestowane** etapy zgodnie z wcześniejszą zgodą właściciela na pracę Codexa w tym repo. Jeżeli źródło wymaga wyboru artystycznego (etap D), zostaw gotowy prototyp w PR do oceny zamiast automatycznie publikować jako ukończony produkt. Jeżeli testy czerwone, nie scalaj.
5. Jeśli wyczerpie się limit: zapisz ukończony kod i wyniki w PR oraz dopisz w `docs/BRAKI_I_UWAGI.md` dokładny punkt zatrzymania i kolejny krok. Nie zostawiaj wyłącznie ścieżek `/workspace/...`; wszystkie istotne zmiany mają być dostępne na GitHubie.
6. Nie uruchamiaj Claude do współdzielonego kodu. Właściciel nie chce ręcznie klikać w panelu GitHub ani zarządzać konfliktami.
7. Nie rozszerzaj zakresu „przy okazji”. Priorytet funkcji poprawiających realną grywalność i intuicyjność.

## ETAP A — Parkour jako normalna, intuicyjna gra (P0)

**Zgłoszenia KC-001, KC-002, KC-014, kontrola KC-010.**
- ESC i przycisk Pauza: duże, oczywiste **Wznów / Od początku / Wybierz poziom / Menu gier** oraz osobne **Sterowanie** (nie wpychaj pięciu linijek drobnych instrukcji na ekran pauzy). Wszystko działa na telefonie, klawiaturze i myszą; focus/pointer lock nie blokuje powrotu.
- **Wybierz poziom**: typ gry, trudność/poziom 1–10, informacje o bieżącej komnacie. Startowy ekran z jasnym **Kontynuuj ostatnią**, **Wybierz poziom**, **Losowa**. Po wyjściu do `gry.html` i powrocie użytkownik nie trafia przypadkowo na P3; zapis ostatniej komnaty i hash w linku działają przewidywalnie. Zachowaj wcześniejsze rekordy.
- Zamiast «1. osoba / 3. osoba» zrób przycisk **Kamera** z trzema czytelnymi wariantami **Zza pleców**, **Z oczu**, **Z rękami (FPS)**. FPS z rękami: autorskie kanciaste dłonie/ramiona (bez importowania grafik z Minecrafta), lekkie kołysanie podczas biegu/skoku; bez przesłaniania przeszkód. Przycisk V może przełączać kolejne widoki. Zapis ustawienia, nie ruszaj fizyki.
- Połącz z testem 348 checkpointów i dołóż regresje na krawędziach i kolejne zgony. Nie pozwól na zapętlenie odrodzeń.
- **Akceptacja:** nagrane/scenariusze desktop+mobile: pauza, restart, wybór P1, przejście do G4, powrót do gier, wznowienie po odświeżeniu, 3 kamery, checkpoint po narożniku; poprawny wynik, brak błędów konsoli.

## ETAP B — Edytor, który 11-latek rozumie bez instrukcji (P1)

**Zgłoszenia KC-003, KC-011, KC-012.**
- Główne zakładki **Budowanie / Animacja / Warstwy**. Mniej technicznych nazw. W **Warstwy** ukryj jako dodatkowe opcje **Tylko ta / Do tej**, nie rób z nich głównego celu narzędzia.
- **Animacja** jest bezpiecznym podglądem: budowla wizualnie rośnie od pierwszej warstwy do ostatniej, z **Start/Pauza/Od początku/Krok +/-**. Zachowaj stabilną kamerę i fundamenty. Porównaj poprzednie dziewięć screenshotów użytkownika: wcześniej przemieszczanie suwaka wyglądało jak budowanie w dół. Nie wolno zmieniać bloków lub niszczyć zapisu, kiedy użytkownik tylko ogląda.
- Obsługa myszy: **lewy przycisk stawia, prawy usuwa** wskazany blok bez przełączania przycisku narzędzia. Menu kontekstowe wyłącz tylko na płótnie. Na telefonie pozostają przyciski Stawiaj/Usuń. Zachowaj obrót, zbliżenie, pipetę, pędzel, symetrię, Undo/Redo.
- Zachowaj działający eksport CAŁEJ budowli do datapacka niezależnie od widocznych warstw. Testuj, że liczba bloków nie zmienia się przy przełączaniu widoków i podczas animacji.
- **Akceptacja:** manualny test przykładowej budowli od warstwy 1 do 9 ze screenshotami, klik lewy/prawy, cofanie, ponawianie, zapis/odczyt i poprawny eksport.

## ETAP C — Dokończyć istniejącą zawartość (P1)

**Zgłoszenia KC-004, KC-005, KC-006, KC-007, KC-008.** Można rozbić na kilka PR.
1. **Import .schem**: prawdziwy import Sponge schematic v2/v3, walidacja gzip/NBT, limity wielkości, podgląd 3D, warstwy i materiały; obsługa nieznanych bloków i testy uszkodzonych plików. Bez fikcyjnego spawnu Piotrka. Usuń z publicznego `budowle.html` niedziałające «Wkrótce»; nie używaj sformułowania «gotowe», dopóki import nie działa. W razie blokady: usunąć zapowiedź z UI i oznaczyć KC-004 jako częściowe z wyjaśnieniem.
2. **Koło wyzwań**: po losowaniu (20 tematów × 10 materiałów × 5 czasów × 10 zasad) ma powstać KONKRETNA inspiracja/projekt, a nie tylko cztery słowa. Dla «Zamek + bez kamienia + 30 min + coś ma się ruszać» => drewniany zamek z pomysłem na ruchomy most. Docelowo **Buduj w edytorze** otwiera niepusty zgodny projekt/szablon; nie nadpisuj starej pracy bez zgody. Unikaj sprzecznych kombinacji i pozorów działającego redstone, gdy tego nie zrealizowano.
3. **Ikony serwera**: galeria ok. 20 oryginalnych miniatur pixel art; łatwe **Przywróć serce**, wybór wzoru, jego edycja, zachowanie własnej pracy, eksport `server-icon.png` 64×64, klawiatura/mobile.
4. **M6/M7/M8/M10 w Minecrafcie**: brakujące mechaniki ciemności, kruszenia i podnoszącej się lawy, a nie jedynie sam datapack stawiający mapę. Sprawdzić na rzeczywistym serwerze testowym Vanilla oraz Paper właściwej wersji. Testy mechaniki, przygotowanie/cleanup obszaru, stop/reset i bezpieczeństwo świata. Nie ogłaszać sprawności bez realnych prób w silniku gry.
5. **Datapacki budowli**: ustalić, co faktycznie potwierdza CI, a czego nie; przygotować bezpieczną procedurę testu smoka, areny i 2 innych dużych modeli. Nie deklarować, że Piotrek grał i zatwierdził, jeśli tego nie zrobił. Przed testami kopia świata.

## ETAP D — Jedna pokazowa budowla jakości premium (P1, wstępnie prototyp)

**KC-013.** Ten punkt jest ważny dla atrakcyjności KILEKCRAFT, ale nie blokuje usunięcia błędów z etapów A–C.
- Dodać **jeden** naprawdę widowiskowy, autorski projekt, np. «Latająca Twierdza Kilek»: wielopoziomowa wyspa, strzeliste wieże, łuki, mosty, ogród, wodospad, detale i plan wnętrza. Referencje z rozmowy użytkownika: latający zamek fantasy, monumentalna świątynia, archipelag parkour. Nie kopiować cudzej mapy ani modeli 1:1.
- Zamiast prostej proceduralnej pętli rozważyć przepływ **projekt/model w świecie Minecraft (np. Axiom lub WorldEdit) → autorski plik .schem → import do portalu → podgląd 3D / warstwy / lista materiałów / bezpieczny eksport**. Weryfikować licencje narzędzi i zależności; instalacje i płatności wyłącznie po zgodzie właściciela. Nie wymaga to zamiany silnika strony z Three.js na inny tylko po to, by mieć lepsze modele.
- Zrobić audyt ograniczeń: 8000 bloków to limit RĘCZNEGO edytora, nie całego portalu ani Minecrafta; zbadaj obsługę modeli dużo większych, pamięć, renderowanie niewidocznych powierzchni, instancing/chunking, ciężar plików i eksport datapacka.
- Najpierw **jeden prototyp i udokumentowany wygląd z kilku ujęć**, wraz z FPS na desktopie/mobile. Nie ogłaszać «premium», jeśli model wygląda jak powiększony prosty zamek. **Wstrzymać publikację finalnej budowli do wizualnej oceny właściciela.**

## ETAP E — Końcowy audyt strony przed szerokim udostępnieniem (P2)

**KC-009, KC-010 i wszystkie KC po zmianach.**
- Przejdź każdą publiczną podstronę jak 11-letni gracz: czy wiadomo co kliknąć, czy przyciski spełniają obietnicę, czy nie ma atrap, sekcji «wkrótce», nieczytelnych bloków drobnego tekstu, niedziałających powrotów, fałszywych opisów weryfikacji.
- Każdą nową niespójność dopisz jako KC-015, KC-016 itd. do istniejącego pliku. Nie otwieraj nowych, konkurencyjnych list.
- Testy CI: Playwright desktop/mobile dla funkcji, 60k komnat plus checkpointy, Lighthouse (Performance ≥ 85, Accessibility ≥ 95), Vanilla/Paper dla zmian serwerowych. Sprawdź wyniki na tym samym SHA co PR. Dodatkowo spróbuj ręcznie realnych scenariuszy gracza.

## Raporty i kryterium «zrobione»

Dla KAŻDEGO KC raportuj: **status** / **PR lub commit** / **co użytkownik zobaczy** / **testy** / **czego jeszcze nie sprawdzono**. Aktualizuj `docs/BRAKI_I_UWAGI.md` razem ze zmianami w kodzie. Nie przepisuj statusu na ZAMKNIĘTE, gdy funkcja jest częściowa.

**Czego NIE robić:** nowych 10 komnat, zwiększania liczby budowli bez waloru wizualnego, nieproszonych rankingów online, zmian kont/logowania, zmian ekonomii serwera Piotrka i scalania historycznych PR. Nie zamieniaj jednej konkretnej poprawki w kompletny rewrite portalu.

**Podsumowanie dla właściciela po każdym etapie:** dwie–cztery krótkie linijki: co działa, co opublikowano, jakie testy przeszły, na jakim etapie kontynuować. Minimalnie angażować właściciela; jedyna konieczna ocena wizualna dotyczy artystycznego prototypu z etapu D.
