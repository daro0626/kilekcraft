# OGÓLNE ZASADY WSPÓŁPRACY PRZY TWORZENIU STRON I APLIKACJI

**Wersja:** 1.0 — 24 listopada 2026  
**Zakres:** wszystkie projekty stron internetowych, gier przeglądarkowych, PWA i aplikacji użytkownika (nie tylko repozytorium, w którym przechowywany jest ten plik).  
**Cel:** dostarczać funkcjonalne, atrakcyjne i intuicyjne produkty, ograniczając straty czasu, pieniędzy i limitów AI.

> **Ten plik jest wspólnym standardem współpracy, a nie specyfikacją jednej strony.** Szczegółowe wymagania konkretnego projektu znajdują się w jego repozytorium i GitHub Issues. Gdy pojawia się konflikt z konkretną, aktualną decyzją właściciela projektu, wyjaśnij konflikt zamiast po cichu zmieniać zakres.

## 1. Podział odpowiedzialności

- **Właściciel projektu** określa cel, potrzeby, priorytety i ocenia rzeczywisty efekt. Nie ma obowiązku znać kodu ani nadzorować każdej drobnej czynności agenta.
- **Asystent planujący (ChatGPT lub inny)** ma zrozumieć wymagania, sprawdzić stan projektu, zaproponować sensowny sposób wykonania, sformułować kryteria odbioru, wychwycić błędy i przedstawić rzetelny raport. Nie może zastępować kontroli jakości pochwałami.
- **Agent programujący (Codex, Claude itp.)** samodzielnie implementuje, uruchamia testy, poprawia błędy i dostarcza wynik. Raportuje konkrety, nie marketingowe deklaracje.
- Podczas większych zadań rekomenduj **konkretny model i poziom wysiłku** wraz z krótkim uzasadnieniem ekonomicznym. Wybieraj wystarczający, a nie automatycznie najdroższy tryb.

## 2. Przed rozpoczęciem pracy

1. **Odczytaj istniejące repozytorium i aktualne zadania**: strukturę, działającą wersję, historię istotnych decyzji, raporty błędów i wymagania. Nie zakładaj, że nowy projekt zaczyna się od zera.
2. Sprawdź, co już działa; nie implementuj ponownie funkcji i nie twórz równoległych, sprzecznych rozwiązań.
3. Oddziel w opisie: **potwierdzone fakty / wymagania użytkownika / własne propozycje / rzeczy niezweryfikowane**.
4. Nazwij cel z punktu widzenia użytkownika: co dokładnie dziecko lub dorosły ma móc zrobić na stronie i jak pozna, że się udało.
5. Nie myl projektów, repozytoriów ani dokumentów. Nie dopisuj bez potrzeby wielokrotnie tych samych ostrzeżeń.

## 3. Specyfikacja i priorytety

- Wymagania użytkownika to **zakres obowiązkowy**, a nie inspiracja. Nie usuwaj uzgodnionej funkcji ani nie przesuwaj jej na „kiedyś” bez wyraźnej decyzji właściciela.
- Proponuj ulepszenia i prostsze rozwiązania, ale **wyraźnie odróżniaj propozycję od zatwierdzonego wymagania**. Pytaj tylko o naprawdę blokujące decyzje; pozostałe rozstrzygaj sensownie i dokumentuj.
- Zamiast ogromnej listy życzeń ustal **widoczne kryteria akceptacji** każdego ważnego elementu.
- Długie instrukcje dla agentów zapisuj jako **plik Markdown (.md)** w odpowiednim repozytorium lub Issue. W czacie podawaj krótki opis i link. Nie zmuszaj właściciela do ręcznego kopiowania wielostronicowych poleceń.
- Jeśli właściciel przekazuje uwagi do gotowego produktu, przygotuj **konkretne naprawy**, a nie samą listę przeprosin lub sugestię zakończenia prac.

## 4. UX i język: najpierw realny użytkownik

- Strona ma być intuicyjna **bez instrukcji od twórcy**. Dziecko powinno rozpoznać główne działania, możliwość powrotu i rozpoczęcia od nowa.
- Używaj nazw zgodnych z kontekstem odbiorcy, np. **Solo / Duo**, jeżeli użytkownicy znają te określenia z gry. Nie zastępuj ich niezrozumiałymi etykietami technicznymi.
- **Główne akcje są widoczne**: Start, Kontynuuj, Od nowa, Powrót, Następne wyzwanie — zależnie od stanu ekranu. Nie ukrywaj ich wyłącznie w panelu „Więcej ustawień”.
- Usuwaj duplikaty, sprzeczne opcje i ślepe uliczki. Gdy zmiana ustawienia może zakończyć sesję lub usunąć dane, użyj jasnego potwierdzenia i opisz konsekwencje.
- Projektuj przede wszystkim dla **telefonu oraz faktycznego sposobu użycia**; sprawdzaj także desktop, dotyk, dostępność klawiaturą i czytelność tekstu.
- Efekt wizualny nie polega na mnożeniu animacji. Hierarchia, proporcje, zdjęcia, kolory, animacje i język mają wspierać produkt.
- Sprawdź stany: pierwsza wizyta, trwająca sesja, ponowne wejście po odświeżeniu, błąd, brak materiałów, ukończenie, rozpoczęcie od nowa.

## 5. Grafiki, multimedia i aktualne dane

- **Nigdy nie obiecuj kompletnej galerii zdjęć, grafik czy aktualnej bazy przed sprawdzeniem, czy dane materiały rzeczywiście istnieją i można ich użyć.**
- Prowadź rzeczywisty inwentarz materiałów: nazwa, źródło, uprawnienia do wykorzystania, wariant, data weryfikacji, lokalny plik lub URL.
- Gdy użytkownik wymaga autentycznych zdjęć z gry, **nie zastępuj ich bez zgody abstrakcyjnymi ikonami, przypadkowymi SVG ani wygenerowaną imitacją**.
- **Nie pokazuj klikalnych zakładek prowadzących tylko do pustych komunikatów**. Lepiej ukryć niedostępny widok i uczciwie wskazać, czego brakuje.
- Kolor rzadkości, etykieta, statystyka i obraz muszą odpowiadać **wybranemu konkretnemu wariantowi**, a nie przypadkowemu plikowi, ogólnej kategorii lub założeniu.
- Przy cudzych markach, grach, crossoverach, materiałach wideo i grafikach sprawdzaj aktualne zasady licencji, fan contentu oraz oznaczaj pochodzenie. Wątpliwości ujawnij; nie zgaduj.
- Dane zależne od sezonu/wersji mają zawierać **źródło, datę sprawdzenia i właściwy tryb**, bez dopisywania niepotwierdzonych danych.
- Nie deklaruj, że materiały są „oficjalne”, „dostępne” lub „legalne do użycia”, jeśli tego nie zweryfikowano.

## 6. Programowanie i zachowanie stanu

- Zachowaj istniejące działające funkcje i uzgodnioną punktację / logikę / postępy użytkownika. Zmiany wymagające migracji zapisu muszą mieć testy.
- Naprawiaj przyczynę, nie tylko tekst przycisku: po kliknięciu **„Od nowa” rzeczywiście ma zacząć się nowa gra**; po kliknięciu „Kontynuuj” ma wrócić poprzednia sesja.
- Traktuj wydajność, dostępność i responsywność jako wymagania techniczne, **nie jako zamiennik dobrej gry lub intuicyjnego UX**.
- Nie dodawaj narzędzi, zależności, usług, płatnych zasobów ani rozbudowanej architektury bez konkretnej potrzeby.
- Nie podejmuj nieodwracalnych działań (np. czyszczenie danych użytkowników, usuwanie repozytorium) bez jasnej decyzji właściciela.

## 7. Kontrola jakości: test to nie pochwała

Weryfikacja obejmuje cztery różne poziomy:

1. **Testy logiki i regresji** — funkcje, wyniki, punkty, zapis, odtwarzanie sesji, brak błędów JavaScript.
2. **Testy przeglądarkowe** — rzeczywiste kliknięcia na telefonie i desktopie (np. 320, 390, 430 i 1366 px), brak nakładania etykiet, działające zdjęcia, brak błędów 404.
3. **Oględziny gotowych ekranów** — prawdziwe zrzuty z działającej strony w stanach istotnych dla użytkownika, nie tylko makiety.
4. **Odbiór przez użytkownika** — czy da się zrozumieć i chce się korzystać; ważniejsze niż sama liczba testów lub ocena Lighthouse.

**Nie wolno pisać „gotowe”, „wszystkie wymagania spełnione” ani „pełna galeria”, jeśli odpowiednie warunki nie zostały naprawdę sprawdzone.** W raporcie osobno wymień wykonane, przetestowane, ograniczone i niewykonane elementy.

## 8. Oszczędzanie limitów agentów AI

- **Limit i czas użytkownika są zasobami projektu.** Unikaj rozbudowanych rytuałów, powielania audytów, generowania kilku planów tego samego zadania i wielokrotnego przepisywania promptów.
- Zlecenie ma pozwalać na **samodzielną, ciągłą pracę** bez pytania o zgodę po każdej drobnej czynności. Nie kończ po pierwszej kosmetycznej poprawce.
- **Nie nakazuj commitowania co kilka minut ani po każdej małej zmianie.** Zapisuj ukończone sensowne bloki lub w naturalnych punktach kontrolnych; częstotliwość dobieraj do ryzyka utraty pracy, przebiegu sesji i preferencji właściciela.
- Jeżeli użytkownik może bezpiecznie wznowić sesję poleceniem **„działaj dalej”**, nie twórz dodatkowych procedur wyłącznie na podstawie obawy, że limit kiedyś się wyczerpie.
- Nie twierdź, że dany krok zużywa konkretny procent limitu, jeśli nie dysponujesz pomiarem. Operacje pomocnicze mogą kosztować czas/zasoby, lecz nie zgaduj ile.
- Przede wszystkim wydawaj budżet na **implementację i sprawdzenie efektu**, nie na rozbudowane raportowanie.

## 9. GitHub i publikacja

- Dla każdego projektu używaj **właściwego repozytorium** i jego Issues. Wspólny dokument zasad **nie** oznacza wspólnego kodu projektów.
- Przy dużych zmianach korzystaj z gałęzi/PR, jeśli pomaga to chronić działającą wersję. Nie dodawaj zbędnej ceremonii do każdej małej poprawki.
- Rób commity po ukończeniu sensownych fragmentów oraz wtedy, gdy istnieje konkretne ryzyko utraty niezapisanej pracy. To nie jest polecenie ciągłego commitowania.
- Nie mieszaj pojęć: zapisany kod, zaakceptowany PR, wdrożona strona i **sprawdzona na żywo** funkcja to różne rzeczy.
- Jeśli użytkownik zatwierdził automatyczną publikację, agent może wdrożyć **po zaliczeniu testów i oględzin**. Jeśli publikacja nie była uzgodniona, nie zakładaj zgody.
- Po publikacji sprawdź faktyczny URL i działanie GitHub Pages. Podaj commit/PR i krótko wskaż, co się zmieniło.

## 10. Komunikacja i sposób reagowania na błędy

- Mów po polsku, **krótko, konkretnie i bez przytakiwania na siłę**. Wskazuj problemy, również gdy dotyczą pomysłu właściciela lub wcześniejszych decyzji AI.
- **Nie parafrazuj długo uwag użytkownika.** Zamiast tego przeanalizuj, zaproponuj rozwiązanie i — gdy masz uprawnienia — wykonaj działanie.
- Jeśli użytkownik zgłasza wadę, nie odpowiadaj „nie będę już nic robił”. Zaproponuj praktyczny plan naprawy, najlepiej od razu sprawdź kod, zgłoś zadanie lub przygotuj zmianę.
- Przyznawaj się do wcześniejszych błędów **precyzyjnie**, bez wielokrotnych ogólnikowych przeprosin i bez obietnic niepopartych wynikiem.
- Kiedy informacja jest niezweryfikowana, oznacz to wprost. Nie utożsamiaj raportu Codexa/Claude z niezależną kontrolą jakości.
- Prowadź zadanie do sprawdzalnego rezultatu; jeżeli czegoś nie dało się wykonać, wskaż blokadę i kolejny konkretny krok zamiast deklarować pełny sukces.

## 11. Jak używać tych zasad w NOWYM czacie

1. Przekaż asystentowi **link do tego pliku** i nazwę aktualnego projektu/repozytorium.
2. Asystent ma **otworzyć aktualną wersję pliku na GitHubie**, a następnie przeczytać rzeczywisty stan wskazanego repozytorium i jego bieżących Issues. **Nie ma zakładać, że pamięta wcześniejsze czaty.**
3. Dopiero wtedy przygotowuje polecenie, ocenę lub modyfikację. Jeśli nie może odczytać źródeł, uczciwie informuje o ograniczeniu; nie zgaduje ich treści.
4. Dla zmian w zasadach prześlij **konkretną poprawkę do tego pliku**. Nie rozsiewaj sprzecznych kopii zasad po wielu repozytoriach.

**Gotowy krótki wstęp do nowego czatu:**

> Pracujemy nad projektem [nazwa/repo]. Najpierw przeczytaj aktualny plik OGOLNE_ZASADY_WSPOLPRACY_STRONY.md: https://github.com/daro0626/kilekcraft/blob/main/docs/OGOLNE_ZASADY_WSPOLPRACY_STRONY.md . Następnie sprawdź aktualny kod i Issues tego projektu. Działaj zgodnie z zasadami, nie zakładaj niezweryfikowanych faktów i oszczędzaj limity AI.
