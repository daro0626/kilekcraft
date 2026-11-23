# Wizja KILEKCRAFT

**W jednym zdaniu:** sprawdzone przepisy na serwer i narzędzia do używania obok gry, po polsku.

## Odbiorca
- Buduj dla Piotrka i jego kolegów, publikuj dla wszystkich (decyzja właściciela z 23.11.2026).
- Piotrek: Minecraft **Java**, gra głównie na komputerze, czasem patrzy na telefon. Szuka wiedzy w **shortach**. Chce budowli **wielkich i zaskakujących**.

## Dlaczego to ma sens w świecie AI i YouTube
- Short trwa 60 sekund i się starzeje, a AI zgaduje składnię sprzed kilku wersji. Wartością KILEKCRAFT jest **pieczątka „sprawdzone”** z wersją i datą.
- Przykład: od 1.21.11 wszystkie gamerule mają nowe nazwy (`keepInventory` → `keep_inventory`). Mnóstwo poradników i odpowiedzi AI tego nie uwzględnia.
- Portal współpracuje z AI: przycisk „Zapytaj AI” daje gotowe pytanie z wersją i silnikiem.

## Co jest w pilocie (stan na 23.11.2026)
| Narzędzie | Plik | Stan |
|---|---|---|
| Strona główna: napis z bloków, tablica split-flap, wyspa 3D | `index.html` | gotowe |
| Przepis „Pierwszy serwer” w 9 szortach | `serwer.html` | gotowe, czeka na test Piotrka |
| Doradca hostingu z cenami | `hosting.html` | gotowe, ceny z datami |
| Kreator komend z podglądem | `komendy.html` | gotowe, komendy czekają na test CI |
| Wielkie budowle 3D warstwa po warstwie | `budowle.html` | gotowe (4 budowle generowane kodem + 2 filmy) |
| Edytor budowli 3D z eksportem do datapacka | `edytor.html` | gotowe, datapack czeka na test CI |
| Generator komnat-wyzwań (parkour, góra, labirynt) | `komnaty.html` | gotowe, skoki do sprawdzenia w grze |
| Symulator LifeSteal | `symulator.html` | gotowe (model uproszczony) |
| Poziom gracza: XP i 16 odznak | wszystkie strony | gotowe |
| Wyścig parkour w przeglądarce (klawiatura, mysz bez trzymania przycisku, dotyk, widok 1. i 3. osoby) | `parkour.html` | gotowe, fizyka do porównania z grą |
| Gra „Znajdź błąd” (17 pytań) | `bledy.html` | gotowe, pytania czekają na test CI |
| Koło wyzwań budowlanych ze stoperem | `kolo.html` | gotowe |
| Wygląd serwera: MOTD i ikona 64×64 | `motd.html` | gotowe, MOTD czeka na test CI |
| 4 nowe wielkie budowle: smok, wulkan, statek, zamek | `budowle.html` | gotowe |
| Dźwięki (WebAudio, domyślnie wyłączone) | wszystkie strony | gotowe |

## Decyzje właściciela (23.11.2026)
1. Odbiorca: Piotrek + koledzy jako testerzy, treść publiczna: **tak**.
2. Nazwa KILEKCRAFT nie zdradza nazwiska: **zostaje**.
3. Styl: **A „Redstone Blueprint”**.
4. Pilot: **kreator komend i przeglądarka budowli** (obie).
5. Serwer testowy w CI: **tak**.

## Czego świadomie nie robimy
- Generatora konfiguracji pluginów (za dużo kombinacji, nie da się utrzymać rzetelnie).
- Kont, rankingów online, komentarzy (prywatność dziecka).
- Monetyzacji. Wytyczne Mojang nie pozwalają prowadzić strony głównie dla zarobku, także przez programy partnerskie.
