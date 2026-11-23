# Doświadczenia z serwera LifeSteal Piotrka (MCHosting, listopad 2026)

Źródło: dokument przekazania kontekstu od właściciela, stan 23.11.2026, najświeższa lista pluginów ze zrzutu konsoli z 18.11.2026. Ten serwer był przez nas uruchamiany, konfigurowany i testowany. To jest **nasze wcześniejsze doświadczenie**, a nie domysł.

Jak z tego korzystać:
- **Na serwerze Piotrka** rzeczy z sekcji 1 były potwierdzone. Rzeczy z sekcji 2 były zainstalowane, ale ich działania w tamtym dokumencie nie potwierdzono.
- **Na innym serwerze** (właściciela albo nowym) nic z tego nie działa automatycznie. Trzeba powtórzyć test (`docs/EKONOMIA_TEST.md`, zadanie R4 w `docs/CODEX.md`). Doświadczenie mówi tylko, od którego zestawu warto zacząć.
- Zasada 5 z `AGENTS.md`: bez adresu serwera, linków do panelu i nicków graczy.

**Czy serwer nadal istnieje:** 23.11 właściciel przekazał, że Piotrek mówi, że usunął swój serwer. Nie sprawdzaliśmy tego sami (panel hostingu jest prywatny). Zanim zaplanujesz test, zapytaj właściciela, na którym serwerze testujemy.

## 1. Potwierdzone na serwerze Piotrka

| Co | Jak potwierdzone | Data |
|---|---|---|
| Hosting MCHosting, darmowy plan, typ „Klasyczny” = Paper | zrzut panelu, konsola pokazuje sekcje `Paper Plugins` i `Bukkit Plugins` | 17–18.11 |
| Panel pokazuje wersję 26.3 | napis w panelu; dokładną wersję z gry sprawdza się komendą `version` | 17.11 |
| Dysk 3 GB (użyte ok. 685 MB) | zrzut menedżera plików | 18.11 |
| Kopie zapasowe w darmowym planie niedostępne | próba właściciela | listopad |
| Panel ma menedżer plików, konsolę i instalator pluginów (Modrinth, Hangar, SpigotMC) | zrzuty panelu | 17.11 |
| Komenda konsoli `plugins` działa i pokazuje 21 pluginów (lista niżej) | zrzut konsoli | 18.11 |
| Świat `Spawn` i drugi świat do survivalu, Multiverse-Core | zrzut panelu i lista pluginów | 18.11 |
| Nether i End włączone (decyzja, zasada 6) | decyzja właściciela | listopad |
| Utrata wszystkich serc kończy się eliminacją (banem) | test w grze: Piotrek odebrał właścicielowi wszystkie serca | listopad |

### Pluginy wczytane przez serwer (konsola `plugins`, 18.11)
Paper: `Veinminer`.
Bukkit: `AntiXray`, `AuctionHouse`, `BetterHomes`, `BSAntiCheat`, `DonutRTP`, `floodgate`, `Geyser-Spigot`, `LifeStealZ`, `Multiverse-Core`, `packetevents`, `S-Economy`, `ScoreboardPL`, `SellPlus`, `SimpleTPA`, `SmartWithdraw`, `Vault`, `ViaVersion`, `voicechat`, `WorldEdit`, `WorldGuard`.

To znaczy: **ten zestaw 21 pluginów uruchamia się razem na Paperze z panelu MCHosting (26.3) w darmowym planie.** Nie znaczy, że każda funkcja każdego pluginu była sprawdzona.

Uwaga: foldery `DonutShop`, `DonutHome`, `DonutScoreboard`, `DonutShards`, `DonutTools` były w `plugins/`, ale nie na liście z konsoli. To pozostałości, nie działające pluginy.

## 2. Zainstalowane, ale w dokumencie przekazania bez potwierdzenia działania

| Funkcja | Pluginy | Co trzeba sprawdzić |
|---|---|---|
| Wspólne saldo w $ | S-Economy + Vault | saldo przed i po transakcji, trwałość po restarcie |
| Sprzedaż `/sell` z GUI, ceny w podpowiedziach, `/worth` | SellPlus + packetevents | ESC i „Anuluj” zwracają wszystkie przedmioty, także przy pełnym ekwipunku i rozłączeniu |
| Rynek graczy (`/ah`, `/ah sell <kwota>`), skróty `/rynek` i `/wystaw` | AuctionHouse (+ `commands.yml`) | wystawienie, zakup z drugiego konta, brak duplikacji, czy skróty działają |
| Czeki (`/withdraw <kwota>`, skrót `/check`) | SmartWithdraw | odjęcie salda, użycie PPM, próba drugiego użycia |
| Tablica: nick, serca, $ | ScoreboardPL (bez PlaceholderAPI na liście) | czy pokazuje serca z LifeStealZ i saldo z S-Economy |
| Blokada `/rtp` tylko w świecie `Spawn` | WorldGuard (`blocked-cmds` w `__global__` świata `Spawn`) | test kontem bez OP: w `Spawn` nie działa, w survivalu działa |
| Przywracanie wyeliminowanego (`pardon`, `revive`, `lifestealz hearts set`) | LifeStealZ | `lifestealz help` w tej wersji pluginu, uprawnienia |
| Gracze z Bedrocka | Geyser + floodgate + ViaVersion | czy ktoś z Bedrocka faktycznie wchodzi |

Jeśli właściciel pamięta, że któraś z tych rzeczy działała na serwerze Piotrka, dopisz ją do sekcji 1 z jego słowami i datą („potwierdzone przez właściciela”). Nie przenoś jej bez tego.

## 3. Lekcje, które przydadzą się na każdym serwerze

- Plugin `Checks` nie był dostępny w wyszukiwarce panelu MCHosting, dlatego wybrano `SmartWithdraw`.
- `DonutRTP` nie utworzył `config.yml` (w folderze był tylko `license.yml`). Nie twórz configu na zgadywanie, blokadę zrób przez WorldGuard.
- Folder w `plugins/` nie dowodzi, że plugin działa. Liczy się wynik `plugins` w konsoli.
- OP omija część ograniczeń. Blokady testuj kontem zwykłego gracza.
- 21 pluginów na ok. 2 GB RAM: po każdej zmianie sprawdź start serwera i błędy w konsoli.
- Cennik ze 176 pozycji (`docs/CENNIK_PROPOZYCJA.md`) nie był wgrany do pluginu. To propozycja do zatwierdzenia.
- Kupowanie serc za pieniądze nie było zasadą tego serwera. Nie wprowadzaj tego bez zgody właściciela.
