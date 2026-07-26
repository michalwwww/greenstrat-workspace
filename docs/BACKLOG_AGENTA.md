# BACKLOG AGENTA — Faza A (fundament pod moduły zadań 11 i 14)

Zasady użycia: **jedna misja = jedno zadanie = jedna konwersacja agenta.** Zadań nie wolno łączyć
ani wyprzedzać. Po każdym zadaniu człowiek czyta artefakty (Plan → Walkthrough) i akceptuje przed
startem kolejnego. Numeracja = kolejność wykonywania; każde zadanie zakłada ukończenie poprzednich.

---

## Z-0 — Inicjalizacja workspace i szkielet testów

**Cel:** działające środowisko weryfikacji, zanim powstanie jakakolwiek zmiana w aplikacji.

**Zakres:**
- Utwórz w korzeniu `package.json` ze skryptem `test` → `node test/run_tests.js` oraz zależnością `xlsx` (SheetJS).
- Utwórz `test/run_tests.js`: wczytuje `test/fixtures_kontrolne.json`, wczytuje przez SheetJS pliki z `test-data/`, na razie wypisuje liczbę wierszy każdego pliku i status `PENDING` dla asercji wskaźników.
- Utwórz `CHANGELOG.md` z pierwszym wpisem.
- Niczego nie zmieniaj w `src/gas/`.

**DoD:** `npm test` uruchamia się bez błędów; raportuje: proba_1000 = 1000 wierszy, proba_5000 = 5000, czesc_1 = 10 434, pelna = 31 301, walidacja_negatywna = 1000; asercje wskaźników w statusie PENDING.

**Wyrocznia:** liczby wierszy jak wyżej.

---

## Z-1 — Jedno źródło prawdy obliczeń (naprawa luki L.15)

**Cel:** cała logika wskaźników w jednym module, objęta testami charakteryzującymi, zanim cokolwiek naprawimy merytorycznie.

**Zakres:**
- Wyodrębnij do `engine/greenstrat_engine.js` czyste funkcje: `isProjectEco`, `calculateTask4`, `calculateTask8` — przeniesienie **1:1** z `src/gas/Code.gs` (bez zmiany formuł, bez "ulepszeń"), wejście: tablica obiektów projektu; zero zależności od SpreadsheetApp/DOM.
- Mechanizm współdzielenia dla GAS (brak `require`): w `Code.gs` i `index.html` wyznacz sekcje `// ==ENGINE:START==` … `// ==ENGINE:END==`; skrypt `tools/sync_engine.js` (uruchamiany ręcznie: `npm run sync`) wkleja aktualną treść silnika w te sekcje. W tej misji: utwórz mechanizm i wykonaj pierwszą synchronizację.
- W `test/run_tests.js` zamień PENDING na realne asercje: dla każdego z 4 zestawów danych policz silnikiem EIFII, ISBI, CRI, liczbę ekoinnowacji, EIRSI (region max i min) i porównaj z fixtures (tolerancja z pliku).

**DoD:** `npm test` zielony dla wszystkich 4 zestawów; diff w `src/gas/` ogranicza się do sekcji ENGINE i niczego więcej; `calculateTask11/14` NIE ruszaj (to atrapy — czekają na Fazę B).

**Wyrocznia:** `test/fixtures_kontrolne.json` → `zestawy`.

**Pułapka znana z audytu:** wyniki muszą się zgadzać PRZED jakąkolwiek naprawą — jeśli test nie przechodzi, błąd jest w ekstrakcji, nie w fixtures.

---

## Z-2 — Braki danych nie są ekoinnowacją (naprawa luki L.16)

**Cel:** rekord bez kompletu czterech ocen nie może być klasyfikowany jako ekoinnowacja.

**Zakres (wyłącznie w `engine/` + synchronizacja):**
- Usuń defaulty `: 1` przy ocenach oraz ścieżkę `GEMINI_CATEGORY ∈ {1,2} → eco` jako podstawę klasyfikacji przy braku ocen; brak którejkolwiek oceny → rekord `NIEKOMPLETNY`: wykluczony z liczników ekoinnowacji i z mianowników wskaźników eco.
- Dodaj do wyników silnika licznik: `rekordy_niekompletne` (ogółem i per województwo).
- Testy jednostkowe: 6 syntetycznych rekordów inline (komplet ocen dodatnich → eco; komplet zer → nie-eco; brak jednej oceny → niekompletny, nie-eco; itd.).

**DoD:** nowe testy jednostkowe zielone; **wszystkie liczby kontrolne z Z-1 bez zmian** (pliki testowe mają komplet ocen — to jest test regresji); `rekordy_niekompletne = 0` dla plików testowych.

---

## Z-3 — Separacja trybu DEMO od trybu badawczego (decyzja D.12)

**Cel:** żadna wartość symulowana nie może wyciec do wyników badawczych ani eksportów.

**Zakres:**
- Wprowadź flagę `TRYB_DEMO` (ScriptProperties + widoczna etykieta w UI).
- Poza trybem DEMO: usuń rok-z-hasha (trend liczony tylko, gdy dane mają kolumnę `ROK` — dodaj obsługę tej kolumny w imporcie jako opcjonalnej; gdy brak → sekcja trendów pokazuje "brak danych czasowych", nie wykres); wyłącz `baseProgramSpecs`, benchmark `eu27/v4/oecd`, `ris3Alignment=82`, losowe patenty, domyślne krawędzie SNA i serie makro w eksporcie — zamiast nich jawne "BRAK DANYCH".
- W trybie DEMO wszystkie te elementy działają, ale każdy nosi etykietę "DEMO / SYMULACJA".
- Eksport naukowy poza DEMO nie może zawierać żadnej z powyższych wartości.

**DoD:** test automatyczny: wywołanie funkcji eksportu (część czysta w engine) w trybie badawczym na `proba_1000` → w wyniku zero wystąpień wartości z listy symulowanych (76.5, 64.2, 71.8, 82 itd.) i zero lat spoza danych wejściowych; w trybie DEMO — etykiety obecne. STOP-AND-ASK przed zmianą schematu, jeśli plan wymaga więcej niż opcjonalnej kolumny `ROK`.

---

## Z-4 — Bramka walidacyjna 2.0 (luka 11.1.e)

**Cel:** import wykrywa klasy błędów udokumentowane w manifeście negatywnym.

**Zakres (engine + miejsce wywołania w imporcie):**
- Rozszerz walidację o: duplikaty `ID_PROJ` (w pliku i względem bazy), `TRL_KONIEC < TRL_START`, nazwę regionu spoza słownika 16 województw (+2 podregiony mazowieckie), pustą/nienumeryczną wartość projektu.
- Raport odrzuceń: liczba + powód + numery wierszy; wiersze odrzucone nie wchodzą do bazy.

**DoD:** `npm test` na pliku `walidacja_negatywna_1000` daje odrzucenia zgodne z `manifest_negatywny.oczekiwane_po_Z4` z fixtures (E1+E2+E3+E5+E6 = 110 odrzuconych; E4 = 20 raportowanych wg pola `decyzja`); pliki czyste przechodzą bez odrzuceń; liczby kontrolne Z-1 bez zmian.

---

## Z-5 — Stemplowanie wyników (zasada Z.6, wersja minimalna)

**Cel:** każdy wynik da się przypisać do wersji logiki i zbioru danych.

**Zakres:** stała `ENGINE_VERSION` w silniku (podbijana przy każdej zmianie logiki + wpis w CHANGELOG); każdy obiekt wyników (`task4`, `task8`, przyszłe) otrzymuje `metadata`: wersja silnika, timestamp, liczba rekordów, liczba niekompletnych, hash zbioru (prosty, deterministyczny).

**DoD:** test: dwa wywołania na tych samych danych → identyczny hash; zmiana jednego rekordu → inny hash; `metadata` obecna w każdym wyniku.

---

## Faza B (NIE ZACZYNAJ — wymaga decyzji człowieka i danych zewnętrznych)

Wymiana atrap modułów 11/14 na implementacje realne wg `docs/macierz_traceability.csv`
(EIRRI z prawdziwych filarów, progi z rozkładów, klasy benchmarkowe, DSS z bramką).
Start dopiero po: werdykcie testu obciążeniowego (D.11), decyzjach D.1–D.3 i dostarczeniu
danych zewnętrznych. Jeśli bieżąca misja zdaje się tego wymagać — STOP-AND-ASK.

---

## Szablon promptu misji (dla człowieka, do kopiowania)

> Przeczytaj `AGENTS.md` i `docs/BACKLOG_AGENTA.md`. Wykonujemy wyłącznie zadanie **Z-…**.
> Zacznij od artefaktu **Plan** (kroki, pliki do zmiany, założenia, pytania) i czekaj na moją
> akceptację. Po implementacji pokaż **Walkthrough** z pełnym wynikiem `npm test`.
> Bez wdrażania na serwer do mojej wyraźnej zgody.
