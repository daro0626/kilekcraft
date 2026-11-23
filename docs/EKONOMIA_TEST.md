# Próba ekonomii LifeSteal

Data __________    Osoba testująca __________

Weź jeden rodzaj przedmiotu z zatwierdzonego cennika, kartkę i drugiego gracza do próby rynku. Przy każdym kroku zaznacz „OK”, „inaczej” lub „pominięto”. Użyj kont testowych, kilku przedmiotów i małych kwot. Zapisuj wyniki bez adresu serwera, danych logowania i nazw kont. W notatkach wystarczy „gracz A” lub „gracz B”.

| Krok | Co zrobić | Oczekiwany wynik | Co zanotować, jeśli jest inaczej |
|---|---|---|---|
| 1. Wersje | W konsoli wpisz `version`, potem `plugins`. Dla używanych pluginów zapisz również wersję z listy pluginów lub logu startowego. | Masz wersję i silnik serwera oraz nazwy i wersje aktywnych pluginów do salda, sprzedaży, rynku, czeków i tablicy. | Przepisz odpowiedź. Jeśli brakuje pluginu lub nie znasz jego wersji, zaznacz zależne próby jako pominięte. |
| 2. Saldo | Sprawdź, jak saldo pokazuje się na obu kontach. Zapisz wartości przed pierwszą transakcją. | Każdy widzi stan swojego konta w tej samej walucie. | Zapisz, gdzie szukałeś salda i co pokazał ekran. |
| 3. Sprzedaż | Jeśli dokumentacja twojego pluginu podaje `/sell`, włóż kilka sztuk jednego przedmiotu i sprzedaj. Porównaj cenę z podpowiedzi i saldo. | Sprzedaż usuwa tylko podaną liczbę sztuk, a saldo rośnie o liczbę sztuk razy cenę jednej. | Zapisz przedmiot, liczbę sztuk przed i po, cenę z podpowiedzi oraz różnicę salda. |
| 4. Zamknięcie okna | Włóż kilka sztuk do okna sprzedaży i naciśnij Esc przed potwierdzeniem. | Przy anulowaniu przedmioty wracają, a saldo się nie zmienia. Jeśli plugin zatwierdza przy zamykaniu, przedmioty muszą być rozliczone zgodnie z widoczną zasadą. | Zapisz, ile sztuk wróciło lub ile naliczono, i komunikat okna. |
| 5. Pełny ekwipunek | Powtórz próbę anulowania z pełnym ekwipunkiem. Sprawdź okno, ekwipunek i miejsce obok gracza. | Wszystkie sztuki są do odzyskania albo poprawnie rozliczone. Żadna sztuka nie ginie i nie powstaje druga kopia. | Zapisz, ile sztuk było w każdym miejscu oraz ile brakuje lub przybyło. |
| 6. Rynek | Gracz A wystawia jedną sztukę za znaną kwotę, gracz B ją kupuje. Obaj sprawdzają ekwipunek i saldo. | B otrzymuje sztukę i płaci. A dostaje środki zgodnie z udokumentowaną prowizją, a oferta znika. | Zapisz kwotę oferty, widoczną prowizję, oba salda i stan przedmiotu. |
| 7. Czek | A tworzy czek na małą kwotę. B go realizuje. Spróbuj ponownie zrealizować ten sam czek, jeśli jest dostępny. Jeśli znika, zanotuj, że nie dało się go użyć drugi raz. | Wystawienie zmniejsza saldo A. Realizacja zwiększa saldo B dokładnie raz. | Zapisz oba salda, los czeku i odpowiedź przy drugiej próbie. |
| 8. Tablica boczna | Otwórz tablicę gracza po sprzedaży oraz po zmianie liczby serc. | Tablica pokazuje gracza, aktualne serca i aktualne saldo w $. | Zapisz, którego pola brakuje lub jego wartość przed i po. |
| 9. Restart | Zapisz salda i liczbę serc przed kontrolowanym restartem. Po starcie porównaj je ponownie. | Salda i serca się zachowują. | Zapisz obie wartości przed i po oraz komunikat konsoli, jeśli wystąpił błąd. |

## Kartka wyników

| Krok | OK / inaczej / pominięto | Komenda, jeśli użyta, i wynik próby |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |

Do wyników wpisz tylko sprawdzone kroki, wersje pluginów i serwera oraz odpowiedzi bez danych dostępowych. Jeśli w konfiguracji nie ma potrzebnego pluginu, wystarczy informacja o braku.
