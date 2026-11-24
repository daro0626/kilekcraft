# Próby czterech budowli w Minecraft Java

Użyj świeżego, płaskiego świata testowego lub oddzielnej kopii. Zrób kopię zapasową przy wyłączonym serwerze. Sprawdź, czy możesz ją odtworzyć. Wyłącz dostęp innych graczy do próby i wykonuj ją z uprawnieniami OP. Budowle stawiają bloki na wschód od miejsca, w którym stoisz. Pole pod próbę musi być puste i mieścić całą bryłę, z zapasem na skraju i nad dachem.

## Zakres potwierdzony przez CI

- Na podstawie `data/testy.json` z 23.11.2026 Vanilla i Paper 26.3 odczytały osiem pozycji próbnego datapacka.
- Próbka funkcji warstw zawiera start, stawianie jednej warstwy, cofanie, równoległe animacje oraz usunięcie znacznika i zatrzymanie funkcji po `koniec`.
- Osobna próba ustawiała każdy z 49 identyfikatorów palety. Wynik potwierdza materiały i technikę eksportu. Oględziny całej konstrukcji, zachowanie płynów oraz próba na serwerze Piotrka pozostają do wykonania.

## Próba krok po kroku

1. Pobierz ZIP na stronie **Budowle**. Umieść go bez rozpakowywania w `world/datapacks/` kopii testowej i uruchom testowy serwer.
2. Stań obok pustego pola. Zapisz współrzędne startu i wersję silnika. Zacznij od `/function kilekcraft:<nazwa>/start` i użyj dwa razy `/nastepna`. Cofnij drugą warstwę przez `/cofnij` i postaw ją ponownie.
3. Użyj `/function kilekcraft:<nazwa>/koniec`, aby zostawić ustawione bloki i usunąć znacznik. Na drugim pustym polu uruchom `/function kilekcraft:<nazwa>/animacja`. Obserwuj kolejność i wygląd z kilku stron.
4. Sprawdź poniższe miejsca i zapisz widoczną usterkę wraz z numerem warstwy. Po ostatniej próbie użyj `/koniec`. Pełne cofnięcie lub usunięcie plików świata wykonaj przez odtworzenie kopii, szczególnie po próbie ze smokiem. Płynąca lawa może opuścić obrys bloków.

| Budowla | Wymiary podglądu | Polecenie animacji | Co obejrzeć |
| --- | --- | --- | --- |
| [Smok oplatający górę](https://daro0626.github.io/kilekcraft/budowle.html#smok) | 30×41×30 | `/function kilekcraft:smok/animacja` | Spiralę ciała, skrzydła i głowę. Wyznacz dodatkowe puste miejsce na lawę i obserwuj, dokąd sięga. |
| [Arena LifeSteal](https://daro0626.github.io/kilekcraft/budowle.html#arena) | 39×11×39 | `/function kilekcraft:arena/animacja` | Przejdź przez cztery wejścia. Obejrzyj trybuny i serce w środku. |
| [Wieżowiec](https://daro0626.github.io/kilekcraft/budowle.html#wiezowiec) | 19×54×19 | `/function kilekcraft:wiezowiec/animacja` | Sprawdź szkło na elewacjach, zwężenia i najwyższą antenę. |
| [Latająca wyspa](https://daro0626.github.io/kilekcraft/budowle.html#wyspa) | 27×32×30 | `/function kilekcraft:wyspa/animacja` | Obejrzyj spód, ścieżkę i ramę portalu. Światło portalu w podglądzie jest wskazówką. |

Zapis próby: data, budowla, wersja Minecrafta, Vanilla/Paper, wynik, numer warstwy lub zrzut. Nie wpisuj adresu, hasła, tokenu ani danych graczy. Status czterech budowli pozostaje **do sprawdzenia w świecie gry**.
