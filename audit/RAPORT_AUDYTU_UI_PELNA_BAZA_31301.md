# RAPORT AUDYTU UI — PEŁNA BAZA 31 301 REKORDÓW

**Data:** 03.08.2026
**Zakres:** `src/gas/index.html` @ commit `8656243` (silnik `ENGINE_VERSION = 0.5.0`)
**Zbiór wejściowy:** `test-data/GREENSTRAT_test_pelna_baza_31301.xlsx` (31 301 wierszy, 18 kolumn)
**Tryb:** badawczy (`demoMode = false`)
**Metoda:** aplikacja uruchomiona w przeglądarce na lokalnym serwerze statycznym; plik wstrzyknięty do `#fileInput` przez `DataTransfer`; pełny przebieg `uploadAndProcess()`; przejście 29 ścieżek nawigacyjnych z zainstalowanymi pułapkami `window.onerror`, `unhandledrejection`, `console.error` oraz przechwytywaniem `alert()`.

---

## 1. WYNIK ZBIORCZY

| Obszar | Wynik |
|---|---|
| Błędy runtime (29 przejść nawigacyjnych) | **0** |
| Nieobsłużone odrzucenia promise | **0** |
| Wpisy `console.error` | **0** |
| Bramka Z-4 na 31 301 rekordach | 31 301 przyjętych / 0 odrzuconych |
| Czas pełnego przetwarzania lokalnego | 16,7 s |
| Wykresy ApexCharts wyrenderowane | 29 |
| Zgodność EIFII / ISBI / CRI z wyrocznią | **pełna** |

Poprawki z commitów `effd5e1`, `886e629`, `e9834ee`, `db106f5` działają — nie odtworzono żadnego `ReferenceError` ani `TypeError` na surowych danych.

**Wskaźniki zgodne z wyrocznią co do cyfry:**

| Wskaźnik | UI (przeglądarka) | Wyrocznia (`npm test`) |
|---|---|---|
| EIFII | 35,70693414282031 → 35,71 | 35,71 |
| ISBI | 88,97156273665183 → 88,97 | 88,97 |
| CRI | 21,80959215404856 → 21,81 | 21,81 |

**Produkty Fazy B faktycznie wpięte w UI na pełnym zbiorze:** 16 rekordów EIRRI, 4 klastry typologiczne + mapa 16 województw, 10 warstw mapowych, 16 rekomendacji JST, 16 pozycji macierzy EKO_Lokacji, 5 klas benchmarku krajowego, 16 alarmów, 10 pakietów DSS, sieć SNA (6 węzłów / 9 krawędzi).

---

## 2. ZNALEZISKA

### A-1 (KRYTYCZNE) — Produkt 11.5 pokazuje liczbę wyliczoną ze wzoru pod etykietą źródła GUS BDL / Eurostat

**Objaw:** W trybie badawczym karta „Polska na tle UE" prezentuje `summaryInnovationIndex = 52.9` z polem `source: "GUS BDL / Eurostat 2024 Snapshot"` i **bez** etykiety `[DEMO / SYMULACJA]`.

**Przyczyna:** `calculateTask11` ma trzy gałęzie benchmarku ([greenstrat_engine.js:1016-1064](../engine/greenstrat_engine.js#L1016)):

1. `isDemo` → wartości poglądowe z etykietą `[DEMO / SYMULACJA]`,
2. `options.externalSnapshot.polandNational` → realne dane ze snapshotu (indeks 72,4),
3. `options.useExternalBenchmark` → **wartość wyprodukowana wzorem** `Math.min(95, Math.max(50, round(eispi * 0.724 * 10)/10))`.

Klient wywołuje wyłącznie gałąź 3 — [index.html:3908](../src/gas/index.html#L3908) i [index.html:10620](../src/gas/index.html#L10620) przekazują `{ demoMode, useExternalBenchmark }` i **nigdy** `externalSnapshot`. Gałąź 2 jest w przeglądarce kodem martwym: snapshot `data/external_benchmarks_snapshot.json` czytany jest przez `tools/import_external_datasets.js`, czyli moduł Node — niedostępny w GAS ani w przeglądarce.

**Dowód arytmetyczny (z żywej sesji):** `EISPI = 73` → `73 × 0,724 = 52,852` → zaokrąglenie `52,9` = dokładnie wartość pokazana użytkownikowi.

**Dlaczego `npm test` tego nie łapie:** test Z-16 ([run_tests.js:486](../test/run_tests.js#L486)) sprawdza `etl.getInternationalBenchmarkData()` — czyli moduł ETL czytający JSON — a **nie** `calculateTask11`. Zielona asercja „Indeks=72,4" dowodzi jedynie, że Node potrafi odczytać plik snapshotu. Ścieżka, którą realnie wykonuje aplikacja, nie jest pokryta żadnym testem.

**Naruszone zasady:** #1 (ZERO DANYCH WYMYŚLONYCH), zakaz z `AGENTS.md`: *„Nie wpisuj wartości referencyjnych i benchmarków w kod — źródłem może być wyłącznie arkusz danych lub plik konfiguracyjny oznaczony pochodzeniem"*.

**Dodatkowo:** nawet gałąź 2 miesza dane ze snapshotu z literałami zaszytymi w kodzie — `v4: 76.5`, `oecd: 85.0`, `v4Benchmark: { czechia: 91.2, slovakia: 68.5, hungary: 69.8 }`. Wartość `85.0` nie występuje w pliku snapshotu w ogóle.

---

### A-2 (POWAŻNE) — Stempel `datasetHash` nieporównywalny między aplikacją a wyrocznią

**Objaw:** Ten sam plik daje `debee221` w aplikacji i `17d343dc` w `npm test`.

**Przyczyna — ustalona eksperymentalnie, nie jest to błąd algorytmu:**

- Algorytm FNV-1a jest spójny środowiskowo. Mikro-test na identycznej tablicy wejściowej dał w Node i w przeglądarce te same hasze (`cf4a39f8`, `f56ed50c`), a źródło funkcji w przeglądarce jest bajt w bajt identyczne z `engine/greenstrat_engine.js`. **Błąd #23 z Księgi Błędów pozostaje rozwiązany.**
- Rozjazd wynika z **różnych danych wejściowych**: arkusz ma 18 kolumn, ale parser UI dokłada do każdego rekordu wyliczone pole `DELTA_TRL` ([index.html:3764](../src/gas/index.html#L3764)) zanim rekord trafi do stemplowania. Wyrocznia stempluje surowe wiersze arkusza ([run_tests.js:517](../test/run_tests.js#L517)).
- Hash obejmuje **wszystkie** pola rekordu (`Object.keys(p).sort()`), więc jedno dodatkowe pole zmienia stempel.

**Dowód:** dodanie `DELTA_TRL = TRL_KONIEC - TRL_START` do surowych wierszy po stronie Node daje dokładnie `debee221` — hash z przeglądarki. Wykluczono `defval: ''` (Node zwraca `17d343dc` w obu wariantach, zero różnic w zestawach kluczy) oraz wartości typu `Date` (wszystkie 31 301 × 18 komórek to `number`/`string`).

**Skutek:** stempel Z-5 miał identyfikować zbiór danych. Badacz porównujący stempel z eksportu aplikacji z tabelą regresji z `npm test` zobaczy rozbieżność i wyciągnie wniosek o dryfie danych, którego nie ma.

---

### A-3 (POWAŻNE) — Brak kolumny ROK daje oś czasu 2021–2027 zamiast komunikatu o braku danych

**Objaw:** Plik nie zawiera kolumny `ROK` (potwierdzone: 18 kolumn). Mimo to `task11.trends` zwraca 7 roczników 2021–2027, każdy z `projects: 0, ecoProjects: 0, funding: 0, ecoFunding: 0, patents: 0`. UI renderuje te lata jako oś czasu; komunikat „BRAK DANYCH CZASOWYCH" **nie pojawia się** (weryfikacja tekstu zakładki Zadanie 11). `cagr = 0`.

**Konflikt z ustaleniem Z-6:** *„W trybie badawczym roczniki pobierane są wyłącznie z kolumny ROK (`null` przy braku), sekcja trendów w UI pokazuje istniejący już komunikat »BRAK DANYCH CZASOWYCH«"*.

**Skutek:** wykres komunikuje „w latach 2021–2027 było 0 projektów", podczas gdy prawdą jest „rok realizacji jest nieznany dla wszystkich 31 301 projektów". Zero i brak danych to nie to samo — dokładnie wzorzec błędu #10 z Księgi Błędów. `cagr = 0` sugeruje zerowy wzrost zamiast braku podstawy do wyliczenia.

---

### A-4 (DROBNE) — Dwie karty wykresów w Zadaniu 8 są trwale puste

**Objaw:** `#chartGpqiBenchmarking` („Analiza Odchyleń Programów od Średniej Krajowej") i `#chartGpqiBottleneck` („Średni czas procedowania i wskaźnik odrzutów formalnych/merytorycznych") są widoczne, mają wysokość 288 px i **zero elementów potomnych**, podczas gdy pozostałe 11 wykresów tej zakładki renderuje się poprawnie. Nie zgłaszają błędu.

**Przyczyna:** w całym `index.html` nie istnieje kod renderujący do tych kontenerów — są tam wyłącznie deklaracje `<div>` ([index.html:1787](../src/gas/index.html#L1787), [index.html:1811](../src/gas/index.html#L1811)) oraz przyciski eksportu `📷 PNG` / `📊 XLS`, które wskazują na puste elementy.

**Uwaga merytoryczna:** druga karta opisuje „średni czas procedowania" — wymiar nieobecny w 18-kolumnowym schemacie danych, więc nie ma dla niej źródła.

---

## 3. REKOMENDACJE (wymagają decyzji człowieka — HITL)

| # | Znalezisko | Proponowany kierunek | Wymaga decyzji |
|---|---|---|---|
| A-1 | Fabrykowany benchmark | Usunąć gałąź `useExternalBenchmark`; wbudować snapshot w blok `ENGINE` (dostępny dla przeglądarki i GAS) albo zwracać `null` + komunikat zastępczy. Przenieść literały `v4`/`oecd`/`v4Benchmark` do snapshotu z oznaczeniem pochodzenia. Dodać test wywołujący `calculateTask11` ścieżką produkcyjną. | Wybór wariantu (snapshot w ENGINE vs `null`) — zmiana kontraktu wyjścia |
| A-2 | Rozjazd stempla | Ujednolicić wejście stemplowania: albo hashować surowe pola arkusza przed wzbogaceniem, albo dorównać wyrocznię do rekordu produkcyjnego. | Który zbiór pól jest kanoniczny dla stempla |
| A-3 | Oś czasu bez ROK | Zwracać `trends: []` / `null` i `cagr: null` przy braku kolumny ROK; wyzwolić istniejący komunikat „BRAK DANYCH CZASOWYCH". | Zmiana kontraktu wyjścia `task11.trends` — punkt STOP-AND-ASK wskazany wprost w `docs/BACKLOG_FAZY_B.md` |
| A-4 | Puste karty | Zaimplementować oba wykresy albo usunąć karty wraz z przyciskami eksportu. | Czy „czas procedowania" wchodzi do schematu danych |

Zgodnie z zasadą #2 (STOP-AND-ASK) i #6 (formuły zamrożone) żadna z powyższych zmian nie została wykonana — raport zamyka fazę diagnostyczną.

---

## 4. STATUS WERYFIKACJI

- `npm test` — **[PASS]**, hasze wyroczni bez zmian (`e69d1ad3`, `a41fae75`, `32dd9923`, `17d343dc`).
- Podczas audytu nie zmodyfikowano żadnego pliku aplikacji ani silnika.
