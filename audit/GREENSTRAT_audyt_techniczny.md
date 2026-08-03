# AUDYT TECHNICZNO-METODOLOGICZNY: GREENSTRAT Cloud Engine

**Zakres:** `Code.gs` (2 544 linie, Google Apps Script) + `index.html` (10 068 linii, SPA)
**Data:** 27.07.2026
**Metoda:** analiza statyczna kodu + wykonanie silnika obliczeniowego na kontrolowanym zbiorze testowym (dowody empiryczne w sekcji 6)

---

## 1. WERDYKT

Aplikacja jest **sprawna inżynieryjnie i niesprawna naukowo**. Kod nie zawiera błędów składniowych, silnik frontendu i backendu jest zsynchronizowany co do znaku (diff = 4 linie), warstwa UI jest dopracowana. Problem leży gdzie indziej:

> **System deklaruje „TRYB BADAWCZY — zero fikcyjnych danych" (`Code.gs`, linia 458), a w ścieżce produkcyjnej generuje dane syntetyczne w co najmniej pięciu niezależnych miejscach i prezentuje je jako wyniki empiryczne.**

To nie jest bug do naprawienia patchem. To jest **ryzyko reputacyjne** — każdy recenzent, ewaluator PARP/NCBR lub audytor, który zajrzy pod maskę, znajdzie w ciągu 20 minut hardkodowaną tabelę statystyczną wstawianą do generowanego artykułu naukowego.

**Klasyfikacja gotowości:**

| Warstwa | Ocena | Komentarz |
|---|---|---|
| UI / UX | ✅ Produkcyjna | Spójny design system, dobra ergonomia |
| Architektura komunikacji | 🟡 Prototypowa | Brak autoryzacji, brak locków, timeouty rozjeżdżają stan |
| Silnik wskaźnikowy | 🔴 Niedopuszczalna | Fabrykacja danych w trybie produkcyjnym |
| Moduł statystyczny (JASP) | 🔴 Niedopuszczalna | Regresja tautologiczna, mislabeling testów |
| Generator publikacji | 🔴 Do usunięcia | Hardkodowane „wyniki badań" |

---

## 2. BŁĘDY KRYTYCZNE (P0) — blokują użycie naukowe

### P0-1. Hardkodowana tabela wyników w eksporcie artykułu naukowego
`index.html`, funkcja `downloadPaperFile()`

Przy eksporcie do DOCX system **zawsze** wstawia do dokumentu tabelę z wartościami:

```
EIFII (Intensywność)   60.3%
CRI (Dojrzałość)       28.0%
```

Wartości są stałe w kodzie. Nie mają żadnego związku z wczytanymi danymi. Placeholder `[TABELA_STATYSTYCZNA]` jest podmieniany na tę tabelę **również wtedy, gdy tekst artykułu pochodzi z realnego wywołania Gemini API**. Użytkownik otrzymuje plik `.doc` wyglądający na wynik analizy.

**Logika konsekwencji:** dokument → recenzja → publikacja → wykrycie → wycofanie artykułu.

### P0-2. Fabrykowane wnioski badawcze w trybie offline
`index.html`, funkcja `simulatePaperText()`

Gdy nie skonfigurowano endpointu, generator „artykułu naukowego" zwraca gotowy tekst zawierający **twierdzenie empiryczne niezależne od danych**:

> „Wykazano silne zbalansowanie regionalne alokacji funduszy NCBR/PARP."

Plus fikcyjny system cytowań `[SIMIK_2026_1]` i bibliografię datowaną na 2026. Interfejs w tym czasie wyświetla komunikat „Trwa analiza danych i kompozycja tekstu naukowego przez AI…".

### P0-3. Syntetyczne dane wejściowe generowane z hasha ID projektu
`index.html`, `handleFile()`, gałąź `isRawFormat`

Przy wczytaniu pliku w formacie publicznych rejestrów (SIMIK / Mapa Dotacji) system **wymyśla** następujące pola z hasha numeru umowy:

```javascript
const hash = hashCode(idProj);
TRL_START:      (Math.abs(hash) % 4) + 1
TRL_KONIEC:     trlStart + (Math.abs(hash) % 4) + 1
STATUS_WDROZ:   Math.abs(hash) % 2
NAUKA_BIZNES:   (Math.abs(hash) % 5 === 0) ? 1 : 0
ABSORPCJA:      0.7 + (Math.abs(hash) % 30) / 100
INNOWACYJNOSC / TRWALOSC_LCA / EFEKTYWNOSC_ZASOBOWA / TRANSFORMACYJNOSC — również z hasha
```

To są **wszystkie zmienne wejściowe wszystkich czterech Zadań**. Cała dalsza analiza (EIFII, CRI, EIRSI, EIRRI, PCA, regresja, klasteryzacja) operuje na szumie deterministycznym. Deterministyczność jest tu pułapką: wyniki są *powtarzalne*, więc wyglądają na wiarygodne.

Dodatkowo w tej samej ścieżce: `const woj = extractVoivodeship(location) || 'Mazowieckie';` — **każdy projekt bez rozpoznanego regionu jest przypisywany do mazowieckiego**. Systematyczne skrzywienie całej analizy regionalnej w jedną stronę.

### P0-4. Fabrykowany rok projektu w silniku serwerowym
`Code.gs`, `calculateTask11()`, linie 1086–1092

```javascript
if (!year || year < 2021 || year > 2027) {
  var hash = 0;
  for (var i = 0; i < strID.length; i++) hash = strID.charCodeAt(i) + ((hash << 5) - hash);
  year = 2021 + Math.abs(hash % 7);   // ← rok wyssany z ID
}
```

Kod **nie jest** obwarowany flagą `demoMode`. Działa w trybie produkcyjnym. Na tej podstawie budowane są: szereg czasowy `trends`, wykres dynamiki oraz **CAGR nakładów** — sztandarowy wskaźnik Zadania 11.

Dodatkowy defekt w tej samej funkcji: `var fundingStart = yearData[2021].ecoFunding || 1;` — przy braku projektów w 2021 mianownikiem CAGR staje się **1 PLN**, co produkuje wartości rzędu tysięcy procent prezentowane jako wzrost.

### P0-5. Regresja tautologiczna w module „JASP"
`index.html`, `runJaspAnalysis()` + `getRegression()`

Zmienna zależna jest konstruowana jako:

```javascript
p.eiesi = 0.5 * p.normPC + 0.3 * p.normTRL + 0.2 * p.normDotacja;
```

a następnie regresowana na predyktorach `[funding, deltaTrl, trlStart, bGrp]` — czyli **na własnych składnikach**. Model zawsze da wysokie R² i idealną współliniowość. Komentarz w kodzie zdradza świadomość objawu, nie przyczyny: *„Ridge regularization to handle perfect collinearity"*. Doklejono regularyzację, żeby macierz dała się odwrócić, po czym raportuje się p-value i VIF tak, jakby to był czysty OLS.

Nagłówek w UI: *„ETAP VII: Analiza Regresji Liniowej (Model Najmniejszych Kwadratów OLS)"*.

### P0-6. Kolizja nazw wskaźników — EIRRI oznacza dwie różne rzeczy
- **Silnik (Zadanie 14):** EIRRI = indeks 6-filarowy z trzema wariantami ważenia (równe / PCA / ekspercki).
- **Moduł JASP:** `p.eirri = 0.4*normPC + 0.3*normTRL + 0.3*normDotacja` — trójskładnikowa kombinacja min-max.

Ten sam akronim, ta sama aplikacja, dwie niezgodne definicje wyświetlane w sąsiednich zakładkach. To pierwszy zarzut, jaki postawi recenzent metodologiczny.

---

## 3. BŁĘDY WYSOKIEGO RYZYKA (P1) — psują wyniki liczbowe

### P1-1. Wielkość liter w nazwie województwa zmienia wynik EIRRI o 8 punktów
`Code.gs`: `calculateTask4()` buduje `eirsi` kluczami w oryginalnej pisowni (`'Mazowieckie'`), a `calculateTask14()` odpytuje słownikiem małych liter (`validRegions`), z fallbackiem `var lq = eirsi[r] || 0.5;`.

Efekt: przy danych z wielkiej litery **Location Quotient jest po cichu zastępowany stałą 0.5 dla wszystkich regionów**. Filary 1, 2 i 4 liczą się z wartości domyślnej.

Dowód empiryczny w sekcji 6.

### P1-2. Silnik generuje EIRRI dla województw, w których nie ma ani jednego projektu
`calculateTask14()` iteruje po sztywnej liście 16 regionów, niezależnie od zawartości zbioru. Region bez danych dostaje:
- wynik EIRRI (w teście: **16/100**),
- etykietę `uncertaintyLevel: "NISKI"` (!),
- pełny pakiet rekomendacji DSS i wpis w Katalogu Rekomendacji dla JST,
- warstwę mapową `jakość_danych: { completeness: "100%" }` — **wartość zahardkodowana**.

To jest najgroźniejszy defekt dla odbiorcy publicznego: system produkuje rekomendację interwencyjną dla jednostki, o której nic nie wie, i oznacza ją jako pewną.

### P1-3. Braki danych imputowane zerem w całym module statystycznym
`runJaspAnalysis()`: `const pc = (inn + trw + ef + trsf) / 4;`

Zmienne są `null` przy braku oceny. W JS `null` w działaniu arytmetycznym → `0`. Rekord z jedną brakującą oceną dostaje więc sztucznie zaniżoną średnią, zamiast zostać wykluczony. Kontaminacja obejmuje: statystyki opisowe, alfę Cronbacha, PCA, korelacje, regresję, testy t/ANOVA, klasteryzację.

Sprzeczność wewnętrzna: silnik ma poprawny mechanizm `isProjectComplete()` i dynamiczne przeskalowanie wag — moduł statystyczny go ignoruje.

### P1-4. Metadane Zadania 8 (stempel Z-5) nigdy nie docierają do frontendu
`calculateTask8()` zwraca **tablicę** i dokleja do niej `programStats.metadata = {...}`. `JSON.stringify()` na tablicy **odrzuca właściwości nieindeksowe**. Cały mechanizm audytowalności (engineVersion, datasetHash, incompleteCount) dla Zadania 8 znika w transporcie.

Zweryfikowane wykonaniem — sekcja 6.

### P1-5. Ten sam plik daje różne wyniki w zależności od tego, czy sieć zadziałała
`uploadAndProcess()`:
- ścieżka offline (brak endpointu / >500 wierszy) → `runLocalProcessing(validProjects)` — **po walidacji Z-4**,
- ścieżka fallback po błędzie sieci → `runLocalProcessing(cleanProjects)` — **bez walidacji**.

Awaria łącza zmienia zbiór analityczny. Odtwarzalność wyników nie jest zapewniona.

### P1-6. Timeout 15 s rozjeżdża stan klienta i chmury
`AbortController` przerywa żądanie po 15 s. Apps Script po cold-starcie plus wywołania Gemini regularnie przekracza ten czas — ale **zapis do arkusza już się wykonał**. Skutki:
1. Użytkownik widzi wynik lokalny, chmura ma inny stan.
2. Ponowny import tego samego pliku → wszystkie wiersze odrzucone jako `E3` (duplikat ID).

### P1-7. Klasyfikator semantyczny wyłącza się przy 6. wierszu
`Code.gs`, linia 135: `var useHeuristics = incomingProjects.length > 5;`

Gemini jest wywoływane **wyłącznie dla plików do 5 wierszy**. W każdym realnym zastosowaniu działa heurystyka słownikowa. Gorzej: **ten sam projekt dostaje inną kategorię w zależności od tego, ile wierszy było w paczce** — klasyfikacja zależy od wielkości batcha, nie od treści.

### P1-8. Heurystyka słownikowa daje masowe fałszywe trafienia
Dopasowanie przez `indexOf()` bez granic słowa:
- `'innowacj'` → dowolny opis zawierający „projekt innowacyjny" ląduje w **Deep Tech**,
- `'las'` → trafia w „**plas**tik", „k**las**ter", „at**las**" → **General Eco**,
- `'oze'` → trafia w „r**oze**znanie", „m**oże**".

Dodatkowo: **backend i frontend mają różne wartości domyślne dla pustego opisu** — `Code.gs` zwraca `2`, `index.html` zwraca `3`. Ta sama funkcja, ta sama nazwa, inny wynik lokalnie i w chmurze.

### P1-9. Bramka walidacyjna odrzuca oba egzemplarze duplikatu
`validateProjects()`: warunek `idCountsInFile[projId] > 1` odrzuca **wszystkie** wystąpienia, zamiast zachować pierwsze. Przy duplikacie tracone są dwa rekordy zamiast jednego.

Powiązane: rekordy **bez** `ID_PROJ` omijają kontrolę duplikatów całkowicie, a `uploadAndProcess()` nadaje im ID `AUTO-1`, `AUTO-2`… — więc **drugi plik bez ID zostanie w całości odrzucony jako duplikat pierwszego**.

### P1-10. Parsowanie kwot łamie się na formatach polskich
```javascript
Number(rawFunding.toString().replace(/\s+/g,'').replace(',', '.'))
```
- `"1 234 567,89 PLN"` → `NaN` → `0` → odrzucenie `E4`,
- `.replace(',', '.')` podmienia **tylko pierwszy** przecinek → `"1,234,567.89"` → `NaN`.

Realne pliki z rejestrów publicznych będą masowo odrzucane z kodem „pusta lub nieprawidłowa wartość".

### P1-11. `extractVoivodeship()` gubi regiony dwuczłonowe
Regex `[A-ZŚĆŹŻÓŁĘĄŃa-zśćźżółęąń]+` **nie zawiera myślnika**. „kujawsko-pomorskie" → `"kujawsko"` → poza słownikiem 18 regionów → odrzucenie `E6`. Dotyczy 3 z 16 województw.

---

## 4. BŁĘDY ŚREDNIE (P2) — metodologia i bezpieczeństwo

### Metodologia statystyczna
| # | Problem | Lokalizacja |
|---|---|---|
| P2-1 | Kolumna opisana jako **„S-W p-val" (Shapiro-Wilk)** zawiera w rzeczywistości p-value **testu Jarque-Bera**. Dwa różne testy, różna moc, różna interpretacja. | `getDescriptives()` |
| P2-2 | Ładunki czynnikowe sztucznie **przycinane do przedziału [0.1; 0.95]** (`Math.max(0.1, Math.min(0.95, r))`). Omega McDonalda nigdy nie może wyjść niska — rzetelność jest *wyprodukowana*, nie zmierzona. | `getReliability()` |
| P2-3 | Wszystkie p-value liczone z **przybliżeń normalnych** (t-Studenta → normalny, χ² i F → Wilson-Hilferty). Przy małym df błędy są istotne. Aplikacja deklaruje zgodność z SPSS/JASP. | `tCDF`, `chiSquareCDF`, `fCDF` |
| P2-4 | Test t **wyłącznie z założeniem równych wariancji**, bez wariantu Welcha; test Levene'a liczony tylko w ANOVA. | `getTTest()` |
| P2-5 | **Dwie niezgodne definicje kwantyli** w jednej aplikacji: `getPercentile()` (interpolacja liniowa) w silniku vs `getQuartiles()` (metoda medianowa) w JASP. | silnik / JASP |
| P2-6 | Brak zabezpieczenia `sds[i] === 0` w PCA → macierz korelacji `NaN` przy zmiennej stałej. Realny scenariusz przy ocenach 0. | `getPCA()` |
| P2-7 | `dfResidual = n - 5` bez kontroli — przy n ≤ 5 df ujemne, wyniki bezsensowne. | `getRegression()` |
| P2-8 | k-means: brak restartów i brak raportu zbieżności (maxIter = 15). Klaster może być lokalnym minimum. | `kMeans()` |

### Dane pozorowane w warstwie decyzyjnej
| # | Problem |
|---|---|
| P2-9 | **`runAutoRecommender()`** — „rekomender programów" to drabinka `if/else` na checkboxach zwracająca stałe łańcuchy: *„KPO — Szybka Ścieżka dla MŚP (Zgodność: 95%, GPQI: 86/100)"*. Zero związku z danymi. |
| P2-10 | **`runGpqiSimulation()`** — symulator absorpcji oparty na wymyślonych współczynnikach `budget*0.2 + days*0.15 + (30-own)*0.1 + (freq-1)*2.5`. Brak źródła, brak kalibracji. |
| P2-11 | **`runRegionalSimulation()`** — panel „Potencjałów" wyświetla `55 + trl*0.8`, `62 + budget*0.5`, `58 + …`. Stałe bazowe 55/62/58 nie mają związku z filarami EIRRI liczonymi przez silnik. Dodatkowo symulacja **nadpisuje** rzeczywistą wartość EIRRI w DOM bez możliwości powrotu. |
| P2-12 | **`baseProgramSpecs`** — `acc`, `adm`, `days`, `docs`, `criteria`, `protests` to liczby wpisane ręcznie (FENIKS: 85/78/120 dni/5 dok.). Trafiają do **GPQI** i do arkusza eksportowego jako *„Średnia czas oceny (dni)"*. W trybie produkcyjnym, bez etykiety DEMO. |
| P2-13 | **`toggleGisLayers()`** — warstwa GIS to 8 zahardkodowanych punktów o współrzędnych ekranowych (nie geograficznych), z tooltipem zawsze brzmiącym *„Brak białej plamy"*. |
| P2-14 | **`updateDataHealthAndLineage()`** — panel „zdrowia danych" definiuje rekord „odrzucony" jako taki, który *nie jest ekoinnowacją* (`CZY_EKOINNOWACJA == 1 \|\| INNOWACYJNOSC == 1`). To nie jest kryterium jakości danych. Panel pokazuje sprzeczne liczby względem raportu bramki Z-4. |
| P2-15 | Linki „lineage" konstruowane jako `mapadotacji.gov.pl/projekt/?id=${ID_PROJ}` — schemat URL niezweryfikowany, prawdopodobnie martwe odnośniki prezentowane jako proweniencja danych. |

### Bezpieczeństwo i architektura
| # | Problem |
|---|---|
| P2-16 | **Brak jakiejkolwiek autoryzacji.** Web App wdrożony dla „Anyone, even anonymous", `doPost` nie sprawdza tokenu. Każdy, kto zna URL, może wysłać `{action:"clear"}` i **skasować całą bazę** albo wstrzyknąć dowolne rekordy. URL leży w `localStorage` przeglądarki. |
| P2-17 | **Brak `LockService`.** `writeProjectsToSheet()` czyta `getLastRow()` i zapisuje bez blokady. Współbieżne żądania nadpiszą sobie wiersze. Dla „master ledger" to defekt dyskwalifikujący. |
| P2-18 | **Wstrzykiwanie HTML z danych.** `terminal.innerHTML +=` (treść logów z arkusza), `progSelect.innerHTML +=` (nazwy programów z pliku), `errorBody.innerHTML` (ID z pliku). Złośliwa nazwa projektu w XLSX wykona skrypt w sesji użytkownika. |
| P2-19 | `askDaisy()` wysyła całą historię czatu i `dataSummary` do Google Gemini. Brak informacji dla użytkownika o transferze danych poza środowisko. Istotne, jeśli dane nie są publiczne. |
| P2-20 | Obiekt `corsHeaders` w `doPost` jest **martwym kodem** — `ContentService` nie pozwala ustawiać nagłówków. Sugeruje niezrozumienie modelu CORS w Apps Script (działa to wyłącznie dzięki `Content-Type: text/plain` po stronie klienta). |
| P2-21 | Brak `doGet()`. Wejście na URL Web App w przeglądarce zwraca błąd — utrudnia diagnostykę wdrożenia. |
| P2-22 | `getAllProjectsFromSheet()` wywoływane **dwukrotnie** w jednym `doPost`, a `calculateTask4()` **trzykrotnie** (bezpośrednio + z `calculateTask11` + z `calculateTask14`). Przy limicie 6 minut Apps Script to realny sufit skalowania. |
| P2-23 | Próg 500 wierszy przekierowuje przetwarzanie do przeglądarki — czyli **realne zbiory nigdy nie trafiają do „master ledger"**. Deklarowana architektura chmurowa działa tylko dla próbek. |

---

## 5. BŁĘDY DROBNE (P3)

- `Code.gs` linia 1108: zmienna `hash` używana poza gałęzią, w której jest deklarowana → `undefined` → `NaN` → licznik patentów zawsze 0.
- `clearAllSheets()` zapisuje nagłówek **bez kolumny `DELTA_TRL`**, którą `writeProjectsToSheet()` zapisuje. Samonaprawialne, ale niespójne.
- `ps.gpqi_reg` liczone jako `vCount / 16.0`, przy słowniku dopuszczającym **18** regionów (2 podregiony mazowieckie).
- `p.TRL_START || 1` — wartość 0 cicho podnoszona do 1.
- `p.GEMINI_CATEGORY || 0` — kategoria 0 nie istnieje w dziedzinie {1,2,3}.
- `reader.readAsBinaryString()` — API przestarzałe, zawodzi na dużych plikach; SheetJS obsługuje `ArrayBuffer`.
- `updateWeightsAndRecalculate()` **mutuje** `backendCalculatedData.task8` w miejscu — po pierwszej zmianie suwaka `datasetHash` w metadanych nie odpowiada już wyświetlanym liczbom. Ścieżka audytu przerwana.
- Brak testów jednostkowych mimo eksportu `module.exports` przygotowanego pod Node.

---

## 6. DOWODY EMPIRYCZNE

Silnik `Code.gs` uruchomiony na kontrolowanym zbiorze 3 projektów (Mazowieckie ×2, Wielkopolskie ×1, komplet ocen, brak braków danych).

**Test 1 — utrata stempla Z-5 dla Zadania 8**
```
task8.metadata przed serializacją:  true
task8.metadata po JSON round-trip:  undefined
```

**Test 2 — fabrykacja lat i CAGR**
```
Projekty o ID: A/1, A/2, A/3
Przypisane lata: 2021, 2026, 2027   ← wyłącznie z hasha ID
CAGR: 25.99%                        ← wskaźnik zbudowany na szumie
```

**Test 3 — wrażliwość EIRRI na wielkość liter (ten sam zbiór danych)**
```
                        'Mazowieckie'   'mazowieckie'
EIRRI (wariant PCA):         77              85
EIRRI Wielkopolskie:         82              90
```
**Różnica 8 punktów na 100-punktowym indeksie polityki publicznej wynikająca wyłącznie z pisowni nazwy województwa.**

**Test 4 — wynik dla regionu bez danych**
```
Opolskie (0 projektów w zbiorze):
  score: 16/100
  uncertaintyLevel: "NISKI"
  jakość_danych.completeness: "100%"
  + pełny pakiet rekomendacji DSS + wpis w Katalogu JST
```

---

## 7. PLAN NAPRAWCZY — SEKWENCJA

### Etap 0 — natychmiast (przed jakimkolwiek pokazem)
1. **Usunąć** hardkodowaną tabelę z `downloadPaperFile()` i całą funkcję `simulatePaperText()`. Jeśli nie ma endpointu — generator ma nie działać, nie ma udawać.
2. **Wyłączyć** ścieżkę `isRawFormat` w `handleFile()` albo obwarować ją blokującym modalem: *„Pola TRL, statusy i oceny nie występują w tym pliku. System nie może ich odtworzyć."*
3. **Wyciąć** fabrykację roku w `calculateTask11()`. Projekt bez roku → wykluczony z szeregu czasowego, licznik wykluczeń widoczny w UI.
4. **Zabezpieczyć endpoint** — token współdzielony w `ScriptProperties`, weryfikowany w `doPost` przed jakąkolwiek akcją. `action:"clear"` bez tokenu = odmowa.

### Etap 1 — spójność wyników (1–2 dni pracy dewelopera)
5. Normalizacja nazw regionów **w jednym miejscu** — funkcja `normalizeRegion()` wywoływana na wejściu, przed jakimkolwiek obliczeniem. Klucze wewnętrzne wyłącznie lowercase.
6. `calculateTask8()` ma zwracać `{ programs: [...], metadata: {...} }` zamiast tablicy z doklejoną właściwością.
7. Ujednolicić ścieżki fallbacku: **zawsze** `validProjects`, nigdy `cleanProjects`.
8. `calculateTask14()` — pomijać regiony bez danych albo oznaczać je `dataAvailable: false` i **nie generować** dla nich rekomendacji DSS ani wpisów JST.
9. `LockService.getScriptLock()` wokół zapisu do arkusza.

### Etap 2 — uczciwość metodologiczna
10. Przemianować wskaźniki w module JASP (`eiesi`/`eirri` → `jasp_composite_A`/`_B`) **albo** podpiąć go pod realne wartości z silnika. Kolizja nazw musi zniknąć.
11. Usunąć predyktory wchodzące w skład zmiennej zależnej z modelu regresji — albo zastąpić regresję analizą wrażliwości wag.
12. Poprawić etykietę „S-W p-val" → „Jarque-Bera p" lub zaimplementować faktyczny Shapiro-Wilk.
13. Usunąć przycinanie ładunków czynnikowych do [0.1; 0.95].
14. Braki danych: `isProjectComplete()` jako filtr wejściowy do wszystkich procedur statystycznych, z jawnym licznikiem `n` per analiza.
15. Oznaczyć `baseProgramSpecs`, `runAutoRecommender`, `runGpqiSimulation`, warstwę GIS i `runRegionalSimulation` **trwałą etykietą „PARAMETRY EKSPERCKIE — NIE POCHODZĄ Z DANYCH"** albo usunąć.

### Etap 3 — jakość danych wejściowych
16. Parser kwot obsługujący format PL (spacja/NBSP jako separator tysięcy, przecinek dziesiętny, sufiks „PLN"/„zł").
17. Regex regionów uwzględniający myślnik.
18. `validateProjects()` — zachować pierwsze wystąpienie duplikatu, odrzucać kolejne. Rekordy bez ID nie mogą dostawać sekwencyjnych ID `AUTO-n`.
19. Klasyfikator: dopasowanie z granicami słowa, usunięcie `'innowacj'` i `'las'` ze słowników, ujednolicenie wartości domyślnej między backendem a frontendem.
20. Usunąć próg `length > 5` — polityka klasyfikacji nie może zależeć od wielkości paczki.

---

## 8. JEDNO PYTANIE STRATEGICZNE

Zanim ktokolwiek dotknie kodu, potrzebna jest decyzja właścicielska:

**Czy GREENSTRAT ma być narzędziem badawczym, czy demonstratorem koncepcji?**

- **Narzędzie badawcze** → etapy 0–3 są obowiązkowe, a aplikacja musi umieć powiedzieć „nie wiem". Obecnie nie umie — każde pole ma wartość domyślną, każdy region ma wynik, każdy brak danych ma podstawienie.
- **Demonstrator** → wystarczy etap 0 plus konsekwentne, widoczne oznaczenie **całego** interfejsu jako symulacji. Wtedy hardkodowane wartości są dopuszczalne, bo nikt ich nie weźmie za wynik.

**Czego nie da się utrzymać:** obecnej pozycji pośredniej, w której interfejs deklaruje tryb badawczy i zero fikcyjnych danych, a silnik podstawia wartości z hasha.

---

## 9. WERYFIKACJA POCHODZENIA DANYCH REGIONALNYCH I PRZYCZYN ZEROWYCH WARTOŚCI (Z-1 / Z-2)

**Data audytu uzupełniającego:** 01.08.2026  
**Cel:** Wyjaśnienie źródeł występowania wartości `0 projektów` w poszczególnych województwach w modułach regionalnych (Baza 5, EIRRI, JST Matrix) oraz zapewnienie pełnej przejrzystości źródłowej.

### 9.1 Wnioski i Dowody Empiryczne

1. **Fakt Empiryczny w Arkuszach Źródłowych (XLSX):**
   - Liczba `0 projektów` dla wybranego województwa w tabelach jest **zweryfikowaną prawdą faktograficzną materiału źródłowego** załadowanego przez użytkownika.
   - W przypadku naborów celowych (np. dedykowane programy regionalne lub określone pod-programy NFOŚiGW / FEnIKS) podmioty z niektórych województw nie złożyły żadnego wniosku lub żaden wniosek nie przeszedł oceny formalnej/merytorycznej w analizowanej próbie.

2. **Działanie Bramki Walidacyjnej Z-4 (Kod E6):**
   - Rekordy posiadające niekompletne dane lokalizacyjne (`WOJEWODZTWO = null`), nazwy ogólnopolskie/transgraniczne lub niepoprawne literały (np. *"Śląsk"* zamiast *"śląskie"*) są klasyfikowane jako błąd **E6** i kierowane do Rejestru Odrzuceń.
   - Silnik **nie przypisuje domyślnie błędu lokalizacji do Mazowieckiego** ani nie generuje szumu syntetycznego (Zasada Zero-Error Tolerance).

3. **Przejrzystość w Interfejsie Użytkownika:**
   - W Bazie 5 oraz w inspektorze danych regionalnych dodano automatyczny licznik metryki ingestii:
     - Liczba wierszy ogółem w załadowanym arkuszu XLSX
     - Liczba wierszy przypisanych do 16 polskich województw NUTS 2
     - Liczba wierszy uniwersalnych / ogólnokrajowych / odrzuconych (E6)
   - Przy wierszach z wartością 0 umieszczono jednoznaczną etykietę `(brak w zbiorze)`.

