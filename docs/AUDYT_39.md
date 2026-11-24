# Dziennik prac nad zgłoszeniem #39

## Etapy

| Etap | Praca | Dowód i pozostałe próby |
| --- | --- | --- |
| A | Menu pauzy, wybór trasy, trzy kamery. | Playwright i Lighthouse, 348 prób checkpointów i 32 lądowania z rozpędem po 5 odrodzeń. Dłuższa gra na telefonie pozostaje do odbioru. [PR #40](https://github.com/daro0626/kilekcraft/pull/40) |
| B | Budowanie, Animacja i Warstwy. Prawy klik usuwa, animacja zachowuje stan. | Dziewięć warstw w obie strony, identyczny wynik exportu, zrzuty obu ekranów. Poprzednie dziewięć zrzutów użytkownika było poza dostępnymi załącznikami. [PR #41](https://github.com/daro0626/kilekcraft/pull/41) |
| C1 | Lokalny import Sponge Schematic v2/v3. | Próbki, obsługa uszkodzeń i limitów, podgląd warstw i materiałów. Własny plik użytkownika pozostaje do odbioru. [PR #42](https://github.com/daro0626/kilekcraft/pull/42) |
| C2 | Koło wyzwań losuje plany i przekazuje szkic do edytora. | 9250 dozwolonych szkiców z 10 000 kombinacji, lokalny zapis po zatwierdzeniu. Ruchome mechanizmy opisane jako pomysły do wykonania. [PR #43](https://github.com/daro0626/kilekcraft/pull/43) |
| C3 | Galeria 20 ikon, serce i ochrona pracy. | Dotyk i klawiatura, zachowanie szkicu, PNG 64×64. Wgranie własnej ikony pozostaje do sprawdzenia. [PR #44](https://github.com/daro0626/kilekcraft/pull/44) |
| C4 | Mechaniki M6, M7, M8 i M10 w datapackach. | Cztery kamienne komnaty na Vanilla i Paper 26.3. Test wykonał aktor serwerowy. Próba w kliencie i pozostałe motywy pozostają do sprawdzenia. [PR #45](https://github.com/daro0626/kilekcraft/pull/45) · [CI](https://github.com/daro0626/kilekcraft/actions/runs/45339619865) |
| C5 | Opis zakresu CI i lista prób czterech budowli. | Funkcje warstw i materiały są sprawdzone na próbkach. Ręczne próby pełnych budowli opisuje [lista prób](PROBY_BUDOWLI.md). [PR #46](https://github.com/daro0626/kilekcraft/pull/46) |
| D | Prototyp Latającej Twierdzy Kilek. | 15 310 bloków i plik .schem. Próba importu i eksportu, pomiar renderowania i zdjęcia. Publikacja wymaga oceny właściciela. [PR #47](https://github.com/daro0626/kilekcraft/pull/47) |

## Audyt 15 stron · 24.11.2026

Scenariusze wykonano w Chromium w rozmiarach 1366×820 i 390×844. Zrzuty pokazują końcowy stan przepływu lub moment wyboru. We wszystkich przepływach sprawdzono, czy działa główna akcja, czy stopka zachowała wymagany dopisek i czy w treści nie pojawia się zapowiedź „Wkrótce”. Menu w widoku telefonu otwierano dotykiem i zamykano klawiaturą.

| Strona | Scenariusz | 1366×820 | 390×844 |
| --- | --- | --- | --- |
| Start | Przejście z nagłówka do gier i powrót | [Zrzut](zrzuty/zlecenie-39-e/komputer/index.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/index.webp) |
| Pierwszy serwer | Przewinięcie do drugiego kroku i status przepisu | [Zrzut](zrzuty/zlecenie-39-e/komputer/serwer.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/serwer.webp) |
| Hosting | Wybór pracy 24/7 i trzy wyniki | [Zrzut](zrzuty/zlecenie-39-e/komputer/hosting.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/hosting.webp) |
| Komendy | Przejście klawiaturą do następnej zakładki | [Zrzut](zrzuty/zlecenie-39-e/komputer/komendy.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/komendy.webp) |
| Budowle | Wczytanie lokalnego pawilonu w pliku Schematic v3 | [Zrzut](zrzuty/zlecenie-39-e/komputer/budowle.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/budowle.webp) |
| Edytor | Podgląd pierwszej warstwy | [Zrzut](zrzuty/zlecenie-39-e/komputer/edytor.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/edytor.webp) |
| Komnaty | Kod M10, link do gry i odznaka z wynikiem CI | [Zrzut](zrzuty/zlecenie-39-e/komputer/komnaty.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/komnaty.webp) |
| Symulator | Rozpoczęcie gry Sezon LifeSteal | [Zrzut](zrzuty/zlecenie-39-e/komputer/symulator.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/symulator.webp) |
| Gry | Wejście do gry Znajdź błąd i powrót | [Zrzut](zrzuty/zlecenie-39-e/komputer/gry.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/gry.webp) |
| Znajdź błąd | Wejście do pierwszego pytania | [Zrzut](zrzuty/zlecenie-39-e/komputer/bledy.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/bledy.webp) |
| Parkour | Gra na P1 i otwarcie menu pauzy | [Zrzut](zrzuty/zlecenie-39-e/komputer/parkour.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/parkour.webp) |
| Koło wyzwań | Losowanie pomysłu i link szkicu | [Zrzut](zrzuty/zlecenie-39-e/komputer/kolo.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/kolo.webp) |
| Wygląd serwera | Galeria ikon i podgląd odzyskanego serca | [Zrzut](zrzuty/zlecenie-39-e/komputer/motd.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/motd.webp) |
| LifeSteal | Filtr cennika z pustym wynikiem i powrót do pełnej listy | [Zrzut](zrzuty/zlecenie-39-e/komputer/lifesteal.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/lifesteal.webp) |
| Wyzwanie dnia | Aktualny kod zgodny z ekranem startowym | [Zrzut](zrzuty/zlecenie-39-e/komputer/wyzwanie.webp) | [Zrzut](zrzuty/zlecenie-39-e/telefon/wyzwanie.webp) |

## Wydanie

Audyt znalazł przycięty nagłówek na małym ekranie, uproszczone opisy checkpointów, brak nagłówka pierwszego poziomu na stronie głównej, zbyt szeroką deklarację sprawdzania oraz niestabilne wyszukiwanie paczki przez GitHub Pages. Rejestr zachowuje zgłoszenia KC-015–KC-019. Końcowe przebiegi Actions i numer wdrożenia są w opisie pull requestu etapu E.

Przed szerokim udostępnieniem pozostały ocena Twierdzy, próby na fizycznym telefonie oraz próby całych budowli i przejść w kliencie Minecraft. Ocena tych punktów nie zmienia zakresu pokazanych testów CI.
