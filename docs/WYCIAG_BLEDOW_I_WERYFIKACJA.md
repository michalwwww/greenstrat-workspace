# WYCIĄG WYKRYTYCH BŁĘDÓW I PROCEDURA WERYFIKACJI NOWEGO KODU

**Data:** 03.08.2026
**Stan odniesienia:** `greenstrat-workspace` @ `7d5fd37`, silnik `ENGINE_VERSION = 0.5.0`
**Przeznaczenie:** weryfikacja kodu nowego (uproszczonego) projektu pod kątem błędów już raz wykrytych w tym systemie.

**Źródła wyciągu:**
- `GREENSTRAT_Ksiega_Bledow_i_Baza_Wiedzy.md` — 34 pozycje (oznaczenia `Ks.#N`)
- `audit/RAPORT_AUDYTU_UI_PELNA_BAZA_31301.md` — ustalenia `A-1`…`A-4`
- `audit/RAPORT_AUDYTU_BEZPIECZENSTWA_I_KODU_v0.5.0.md` — `C-001`…`C-005`
- `audit/RAPORT_WERYFIKACJI_AUDYTU_v0.5.0.md` — `P0-1`…`P0-5`
- `docs/BACKLOG_FAZY_B.md` — luki `L.15`, `L.16`, `L.19`, `L.20`
- commity naprawcze: `effd5e1`, `886e629`, `e9834ee`, `db106f5`, `74fe06e`

---

## 1. JAK UŻYWAĆ TEGO DOKUMENTU

Weryfikacja ma **trzy poziomy** i żaden nie zastępuje pozostałych:

| Poziom | Narzędzie | Co wykrywa | Czego NIE wykryje |
|---|---|---|---|
| 1. Sygnatury | `node tools/verify_known_issues.js` | powrót znanego wzorca błędu w kodzie | błędy zachowania, rozjazd UI↔silnik |
| 2. Obliczenia | `npm test` | zmianę wartości wskaźników, regresję bramki | błędy runtime w kliencie |
| 3. Zachowanie | audyt w przeglądarce (sekcja 5) | crashe, puste widoki, prezentację fikcji | poprawność metodologiczną formuł |

> **Reguła nadrzędna:** zielony wynik na poziomach 1–2 **nie** dowodzi poprawności. Ustalenie A-1 przechodziło przez pełną zieloną siatkę regresyjną przez cały czas swojego istnienia.

---

## 2. WYCIĄG BŁĘDÓW — KLASY I SYGNATURY

### KLASA A — Fabrykowanie danych (łamie zasadę #1 `AGENTS.md`)

Najcięższa klasa. System badawczy prezentujący wymyśloną liczbę jako pomiar jest gorszy niż system, który nie pokazuje nic.

| ID | Objaw | Sygnatura w kodzie |
|---|---|---|
| `L.20` / `P0-4` | Rok projektu generowany z hasha ID, gdy brak kolumny `ROK` | `2021 + Math.abs(hash % 7)` |
| `P0-3` | TRL, statusy i oceny generowane z hasha przy plikach surowych | gałąź `isRawFormat` bez bramki `demoMode` |
| `A-1` | Indeks benchmarku wyliczany wzorem z EISPI i podpisany „GUS BDL / Eurostat" | `clamp(eispi * 0.724, 50, 95)` |
| `Z-3` / `A-1` | Zaszyte wartości referencyjne UE/V4/OECD | `eu27: 76.5`, `v4: 76.5`, `oecd: 85.0`, `71.8`, `64.2` |
| `Z-3` | Zaszyty wskaźnik dopasowania RIS3 | `ris3Alignment = 82` |
| `Ks.#24` | Losowe patenty / oceny | `Math.random()` poza trybem DEMO |
| `L.16` / `Z-2` | Brak oceny traktowany jako ocena pozytywna | `INNOWACYJNOSC: ... || 1` |
| `P0-1` | Zaszyta tabela wyników w generowanym dokumencie | literały `60.3%`, `28.0%` |
| `P0-2` | Fabrykowane wnioski i fikcyjne cytowania | `simulatePaperText`, `SIMIK_2026_1` |
| `Ks.#10` | Współczynnik absorpcji wyliczany dla lat o zerowym budżecie | brak warunku `funding > 0 ? … : 'b.d.'` |
| `Ks.#11` | Polska i UE obie na 100.0, dystans znika | brak przeskalowania do bazy UE-27 = 100 |

**Reguła weryfikacyjna:** każda wartość referencyjna w wyniku musi mieć pole `source` wskazujące plik danych z wersją. Wartość bez `source` = wartość wymyślona.

### KLASA B — Brak danych podany jako wartość

| ID | Objaw | Sygnatura |
|---|---|---|
| `A-3` | Brak kolumny `ROK` daje oś czasu 2021–2027 z zerami zamiast komunikatu „BRAK DANYCH CZASOWYCH"; `cagr = 0` | `trends` niepuste przy braku źródła lat |
| `Ks.#30` | Województwa z 0 projektów interpretowane jako brak inwestycji | brak komunikatu o reprezentatywności próby |
| `A-1/UI` | Fallback do literału, gdy dane nieobecne | `benchmark.v4 \|\| 76.5`, `benchmark.oecd \|\| 85.0` |
| `H-003` | Niespójna reprezentacja braków w eksporcie SPSS | `-99` raz liczbowo, raz w cudzysłowie |

**Reguła weryfikacyjna:** `0` i „brak danych" to różne stany. Sprawdź, czy kod nie używa `|| 0` tam, gdzie poprawną odpowiedzią jest `null` / `b.d.` / `-99`.

### KLASA C — Odporność na null i crashe runtime

| ID | Objaw | Sygnatura |
|---|---|---|
| `e9834ee` | `TypeError` na pustej komórce | `row.POLE.toString()` bez zabezpieczenia |
| `db106f5` | Bramka odrzuca cały plik publiczny przez `null` w TRL/statusach | walidacja nierozróżniająca `null` od wartości błędnej |
| `74fe06e` | Puste pola renderowane jako `null` / `undefined` zamiast `b.d.` | brak formatera braków w inspektorze |
| `effd5e1`, `886e629` | `ReferenceError` przy starcie (funkcja użyta przed definicją, linie poza zasięgiem) | wywołanie w `head`/`onclick` przed deklaracją |
| `C-002` | Crash przy odpowiedzi API zablokowanej filtrem bezpieczeństwa | `json.candidates[0].content.parts[0].text` bez asercji |
| `C-004` | Statystyki województw nie naliczają się | `wojStats[woj]` bez inicjalizacji on-demand |
| `Ks.#19` | Pobranie krawędzi SNA przed załadowaniem danych | `task14.network.links` bez sprawdzenia obiektu |
| `Ks.#16` | Blokada popup wywraca eksport PDF | `window.open` bez `if (!printWindow)` |
| `Ks.#20` | `SyntaxError` — niedomknięty blok | niedomknięte `setTimeout(() => { … }, 10);` |
| `Ks.#17` | Narastające zużycie RAM przy wielokrotnym eksporcie | `createObjectURL` bez `revokeObjectURL` |

### KLASA D — Parsowanie danych surowych MFiPR

| ID | Objaw | Sygnatura |
|---|---|---|
| `Ks.#1` | `KUJAWSKO-POMORSKIE` i `WARMIŃSKO-MAZURSKIE` mają 0 projektów | regex województw bez `-` |
| `Ks.#2` | Nazwy kolumn wczytane jako dane wiersza 1 | brak detekcji tytułu zestawienia w 1. wierszu |
| `Ks.#3` | Kolumna „nie istnieje" | spacje niełamliwe ` ` w nagłówkach |
| `Ks.#4` | Brak numeru umowy wywraca relacje | brak generacji `RAW-{i+1}` |
| `Ks.#5` | Nazwy programów spoza słownika | brak słownika synonimów (FEnIKS/KPO/NFOŚiGW) |
| `Ks.#6` | Aneksy umów zawyżają budżet | brak filtrowania duplikatów `seenIds` (kod E3) |
| `Ks.#7` | `NaN` w kwotach | brak `replace(/\s+/g,'').replace(',','.')` |
| `Ks.#8` | `TRL_KONIEC < TRL_START` przechodzi | brak reguły E5 |
| `Ks.#18` | Krzaczki w MS Excel | eksport CSV bez BOM `﻿` |

### KLASA E — Bezpieczeństwo

| ID | Objaw | Sygnatura |
|---|---|---|
| `C-001` | XSS — odpowiedź API renderowana bez escapowania | `innerHTML = ...reply/response/json.` |
| `C-005` / `H-004` | Brak CORS / preflight | brak `doOptions(e)` w GAS |
| zasada #10 | Klucz API w kodzie lub logach | `GEMINI_API_KEY` poza ScriptProperties |

### KLASA F — Determinizm i stemplowanie

| ID | Objaw | Sygnatura |
|---|---|---|
| `A-2` | `datasetHash` nieporównywalny UI↔wyrocznia | różny zestaw pól rekordu przy stemplowaniu (`DELTA_TRL`) |
| `Ks.#23` | Różny hash w Node i przeglądarce | niespójne końce linii / kodowanie w `calculateDatasetHash` |
| `Ks.#32` | Kolejność rankingu zmienia się przy odświeżeniu | `sort((a,b) => b.eisei - a.eisei)` bez drugiego kryterium |
| `Ks.#31` | Ujemne progi percentylowe | brak `Math.max(0, val)` |
| `Ks.#12` | Dzielenie przez zero w ISBI | brak `Math.max(1, sumStage1)` |

### KLASA G — Spójność architektury

| ID | Objaw | Sygnatura |
|---|---|---|
| `L.15` | Trzy kopie logiki `isEcoProj` dające różne wyniki | definicje wskaźników poza blokiem `ENGINE` |
| `Ks.#21` | Zmiana w silniku nie trafia do klienta i GAS | brak `npm run sync` |
| `A-1` | Gałąź czytająca dane przez Node jest w kliencie martwa | `require()` / `fs` na ścieżce wykonywanej przez przeglądarkę |
| `A-1` | Dwie kopie snapshotu rozjeżdżają się | brak asercji równości JSON ↔ stała w `ENGINE` |
| — | Rozjazd kopii pliku frontendu | duplikat `index.html` poza `src/gas/` |

### KLASA H — Interfejs i prezentacja

| ID | Objaw | Sygnatura |
|---|---|---|
| `A-4` | Karta wykresu trwale pusta, z działającym przyciskiem eksportu | kontener `<div id="chart...">` bez kodu renderującego |
| `Ks.#9` | Wykres kaskadowy pokazuje górę zakresu zamiast delty | brak `dataLabels.formatter: val[1]-val[0]` |
| `Ks.#14` | Przycisk XLS zawsze pobiera tę samą podbazę | zaszyty argument zamiast `currentSubDb` |
| `Ks.#15` | `SecurityError: Tainted canvas` przy eksporcie PNG | `@import` czcionek w SVG |
| `Ks.#28` | Etykiety osi X nachodzą na siebie | brak rotacji `-45°` |
| `Ks.#29` | Biały tekst na białym tle po zmianie motywu | brak `theme: { mode: isDark ? 'dark' : 'light' }` |
| `Ks.#13` | Jeden duży projekt zawyża wskaźnik regionu | brak bezpiecznika dominacji > 25% budżetu |

### KLASA I — Platforma Google Apps Script

| ID | Objaw | Sygnatura |
|---|---|---|
| `Ks.#22` | Przeglądarka zawiesza się przy 31 tys. wierszy | przesyłanie całego zbioru przez `google.script.run` |
| `Ks.#25` | `400 Bad Request` z API | wysyłanie pełnego zbioru zamiast podsumowania |
| `Ks.#34` | Przeciążenie przy grafie SNA | brak przycięcia do top 500 krawędzi |
| `Ks.#33` | Eksport SQL wywala się na polskich znakach | brak `toSqlSafeColumnName()` |
| zasada #7 | Przekroczenie limitu 6 min | I/O na Sheets w pętli po komórkach zamiast `getValues`/`setValues` |

---

## 3. WERYFIKACJA AUTOMATYCZNA — SKANER SYGNATUR

```bash
node tools/verify_known_issues.js
```

Skanuje `engine/greenstrat_engine.js`, `src/gas/index.html` i `src/gas/Code.gs`. Dla nowego projektu podaj ścieżkę:

```bash
node tools/verify_known_issues.js ../nowy-projekt
```

Kod wyjścia: `0` = brak sygnatur, `1` = wykryto regresję.

### Jak czytać wynik

Skaner używa **okna kontekstu** (±3–8 linii), bo zabezpieczenia w tym kodzie są wieloliniowe — bez tego produkował fałszywe alarmy na poprawnie zabezpieczonym kodzie (`if (!printWindow)` w następnej linii, asercja `json && json.candidates && …` rozbita na cztery linie, bramka `&& isDemo` w warunku nadrzędnym). Jeśli dodajesz własną kontrolę i widzisz alarm na kodzie, który jest poprawny — rozszerz `oknoWyjatku`, nie usuwaj kontroli.

### Stan odniesienia (baseline) — repo `7d5fd37`

Skaner wykrywa **4 sygnatury**, wszystkie zweryfikowane ręcznie jako prawdziwe:

| ID | Miejsce | Status w nowym projekcie |
|---|---|---|
| `P0-2` | `index.html:9214`, `:9253` — `simulatePaperText` | **znika** wraz z generatorem artykułów |
| `C-002` | `Code.gs:2836` — odczyt odpowiedzi bez asercji | **znika** wraz z botem |
| `Ks.#17` | 5 z 7 wywołań `createObjectURL` bez `revokeObjectURL` (`index.html` 6985, 7008, 7207, 8610, 9342) | **do naprawy** |
| `Ks.#32` | 5 miejsc sortowania `b.eisei - a.eisei` bez drugiego kryterium | **do naprawy** |

> **Ustalenie o samej Księdze Błędów:** pozycje `Ks.#17` i `Ks.#32` są w niej opisane jako rozwiązane, ale w kodzie naprawy nie ma. `#17` zastosowano w 2 z 7 miejsc, a `#32` — `eisei_comp` jest wyłącznie wyświetlane, nigdy nie służy jako klucz sortowania. **Wniosek metodyczny: status „rozwiązane" w dokumencie nie jest dowodem. Dowodem jest kontrola w kodzie.** Traktuj Księgę jako katalog ryzyk, nie jako rejestr gwarancji.

---

## 4. WERYFIKACJA OBLICZEŃ

```bash
npm test
```

Wartości, które **muszą** się zgadzać — każde odchylenie oznacza, że zmiana dotknęła warstwy obliczeniowej:

| Plik | Wiersze | EIFII | ISBI | CRI | eco_n | Hash |
|---|---|---|---|---|---|---|
| `proba_1000` | 1000 | 34,90 | 84,65 | 23,00 | 329 | `e69d1ad3` |
| `proba_5000` | 5000 | 35,21 | 90,52 | 22,35 | 1742 | `a41fae75` |
| `czesc_1` | 10434 | 35,37 | 90,48 | 22,15 | 3717 | `32dd9923` |
| `pelna_baza` | 31301 | 35,71 | 88,97 | 21,81 | 11148 | `17d343dc` |

Bramka Z-4 na `walidacja_negatywna_1000`: **880 przyjętych / 120 odrzuconych** — E1:30, E2:30, E3:20, E4:20, E5:10, E6:10.

Benchmark A-1: indeks **72,4**, dystans **−27,6**, źródło zawierające wersję snapshotu, brak pól `v4` i `oecd`.

---

## 5. WERYFIKACJA ZACHOWANIA — AUDYT W PRZEGLĄDARCE

Poziomy 1–2 nie wykryją crasha w kliencie ani rozjazdu między silnikiem a prezentacją. Procedura sprawdzona na 31 301 rekordach.

**1. Serwer statyczny na korzeniu workspace** (nie na `src/gas`) — `index.html` i `test-data/*.xlsx` muszą być pod tym samym originem.

**2. Pułapki przed wczytaniem danych:**
```js
window.__err = []; window.__alerts = [];
window.addEventListener('error', e => window.__err.push(e.message + ' @' + e.filename + ':' + e.lineno));
window.addEventListener('unhandledrejection', e => window.__err.push('rejection: ' + String(e.reason)));
window.alert = m => window.__alerts.push(String(m));
const _ce = console.error; window.__cerr = [];
console.error = function(){ window.__cerr.push([].slice.call(arguments).join(' ')); return _ce.apply(console, arguments); };
```
Przechwycenie `alert()` jest konieczne — aplikacja raportuje przez nie wynik bramki.

**3. Wstrzyknięcie pliku bez klikania:**
```js
const buf = await (await fetch('/test-data/GREENSTRAT_test_pelna_baza_31301.xlsx')).arrayBuffer();
const dt = new DataTransfer();
dt.items.add(new File([buf], 'GREENSTRAT_test_pelna_baza_31301.xlsx'));
const inp = document.getElementById('fileInput');
inp.files = dt.files;
inp.dispatchEvent(new Event('change', { bubbles: true }));
```

**4. Uruchomienie obliczeń:** `document.getElementById('btnProcess').click()` — samo wczytanie pliku tylko parsuje, nie liczy.

**5. Przejście wszystkich ścieżek** z licznikiem błędów przed i po każdym kroku: 4 zakładki zadań × podzakładki + JASP + 6 podbaz zakładki 11 + `ingest`, `logi`, `metodologia`.

**6. Kontrole merytoryczne na wyniku** (`backendCalculatedData`):
- czy jakakolwiek liczba prezentowana jako pomiar nie ma pola `source`,
- czy `trends` nie zawiera roczników, gdy plik nie ma kolumny `ROK`,
- czy w trybie badawczym nie występują literały z klasy A,
- czy kontenery `chart*` nie są puste przy widocznej karcie.

### Pułapki metody (zweryfikowane)

- **Sekwencje > ~30 s** przekraczają limit pojedynczego wywołania — uruchamiaj przejście jako zadanie w tle zapisujące do `window.__walk` i odpytuj osobno.
- **Wykresy o szerokości 0 px** przy ukrytym panelu przeglądarki — ApexCharts pomija wtedy rysowanie geometrii. **To nie jest defekt aplikacji.** Weryfikuj zawartość przez wymuszony render (`host.style.width = '900px'`) albo czytaj z obiektu wyników.
- **`npm run sync` przepisuje końce linii** — plik bywa „zmodyfikowany" przy pustym `git diff`.
- **Repozytorium ma hook auto-push** — przy równoległej pracy odbija się o `fetch first`; zrób `git fetch` + `git rebase origin/main`.
- **PowerShell psuje wieloliniowe komunikaty commita** — użyj `git commit -F <plik>`.

---

## 6. ZNALEZISKA OTWARTE — PRZENIEŚĆ DO NOWEGO PROJEKTU

| # | Opis | Decyzja do podjęcia |
|---|---|---|
| `A-2` | `datasetHash` nieporównywalny: parser UI dokłada `DELTA_TRL` przed stemplowaniem, wyrocznia stempluje surowe 18 kolumn. Algorytm FNV-1a jest spójny środowiskowo — to różnica danych, nie hasza. | Który zestaw pól jest kanoniczny dla stempla |
| `A-3` | Brak kolumny `ROK` daje oś czasu 2021–2027 z zerami; `cagr = 0`. Konflikt z ustaleniem Z-6. | Zmiana kontraktu `task11.trends` |
| `A-4` | `chartGpqiBenchmarking` i `chartGpqiBottleneck` bez kodu renderującego; druga opisuje wymiar nieobecny w schemacie 18 kolumn | Implementacja albo usunięcie kart |
| `Ks.#17` | 5 z 7 wywołań `createObjectURL` bez zwolnienia | Naprawa mechaniczna |
| `Ks.#32` | 5 miejsc sortowania bez drugiego kryterium | Naprawa mechaniczna |

---

## 7. CHECKLISTA PRZED UZNANIEM ZADANIA ZA UKOŃCZONE

- [ ] `node tools/verify_known_issues.js` — brak nowych sygnatur względem baseline z sekcji 3
- [ ] `npm test` **[PASS]** — tabela regresji identyczna z sekcją 4, cztery hasze bez zmian
- [ ] `npm run sync` wykonany po każdej zmianie silnika
- [ ] Audyt w przeglądarce wg sekcji 5: **zero** błędów runtime, bramka 31 301/0
- [ ] Każda wartość referencyjna w wyniku ma pole `source` z wersją źródła
- [ ] Nowy test wywołuje kod **dokładnie tak, jak robi to aplikacja** (patrz niżej)
- [ ] Wpis w `CHANGELOG.md`

### Lekcja, która kosztowała najwięcej

> Asercja Z-16 sprawdzała moduł ETL `tools/import_external_datasets.js` zamiast `calculateTask11` — dokładnie tej funkcji, którą uruchamia aplikacja. Fabrykowana wartość 52,9 przechodziła przez pełną zieloną siatkę regresyjną, bo **żaden test nie wywoływał ścieżki produkcyjnej**.
>
> Przy każdym nowym teście zadaj pytanie: **czy przekazuję dokładnie te opcje, które przekazuje klient?** Jeśli test podaje argumenty, których aplikacja nie podaje — testujesz inną ścieżkę niż produkcyjna, a zielony wynik nic nie znaczy.
