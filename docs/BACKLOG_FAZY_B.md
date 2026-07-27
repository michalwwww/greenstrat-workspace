# BACKLOG FAZY B — GREENSTRAT

Kontekst: Faza A zamknięta (Z-0…Z-5). Architektura rozstrzygnięta: D.11 = ŻÓŁTY/hybryda,
D.1 = wariant rozdzielony (klucz populacyjny), D.2 = PCA jako wariant empiryczny,
D.3 = Rada metodologiczna jako właściciel progów. Pełny kontekst decyzji:
`docs/GREENSTRAT_macierz_traceability_v1_3.xlsx` (arkusz REJESTR_DECYZJI).

Zasady identyczne jak w Fazie A (patrz `AGENTS.md`): zero danych wymyślonych,
STOP-AND-ASK przy niejednoznaczności, chirurgia nie refaktor, wyrocznia nienaruszalna,
dowody wpięcia obowiązkowe, jedna misja = jedno zadanie chyba że jawnie zgrupowane.

---

## ZNALEZISKO WSTĘPNE — L.20 (odkryte 27.07.2026, poza formalnym zakresem Fazy A)

Podczas przeglądu kodu pod kątem planowania Fazy B ustalono, że separacja trybu DEMO
z Z-3 objęła wyłącznie `exportScientificDataset` oraz karty programów w bloku ENGINE.
Funkcje **`calculateTask11Local`** i **`calculateTask14Local`** — używane przy KAŻDYM
imporcie w trybie lokalnym (>500 wierszy, czyli w praktyce większość ruchu) — leżą
POZA blokiem ENGINE i nigdy nie zostały dotknięte. Nadal bezwarunkowo:

```javascript
// calculateTask11Local — fikcyjny rok, zero gate'u DEMO
let hash = 0;
let str = p.ID_PROJ || '';
for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
let year = 2021 + Math.abs(hash % 7);
...
let benchmark = { polska: eispi, eu27: 76.5, v4: 64.2, oecd: 71.8 };
```

```javascript
// calculateTask14Local — bez gate'u
let ris3Alignment = 82;
```

Dodatkowo `calculateTask11Local` zawiera WŁASNĄ, trzecią kopię logiki `isEcoProj`
(nie wywołuje kanonicznego `isProjectEco` z silnika) — nowa instancja wzorca L.15.

**Konsekwencja:** dashboard zakładek Zadanie 11 i Zadanie 14 pokazuje fikcyjne lata
i twardo wpisany benchmark UE niezależnie od trybu badawczego, przy każdym imporcie
lokalnym. To bieżący stan produkcji, nie ryzyko teoretyczne.

---

## Z-6 — Domknięcie L.20: jedno źródło prawdy dla Task 11/14 (P0, gotowe do startu)

**Cel:** `calculateTask11` i `calculateTask14` przenoszą się do bloku ENGINE na wzór
Z-1 (Task4/Task8), z pełnym bramkowaniem `TRYB_DEMO` i bez zdublowanej logiki.

**Zakres:**
- Przenieś `calculateTask11` i `calculateTask14` do sekcji `// ==ENGINE:START==`
  jako funkcje kanoniczne — przeniesienie **1:1** logiki obliczeniowej (te same wzory
  EISPI/EIRRI/CAGR/klasyfikacja), z DWOMA wyjątkami wymaganymi przez tryb badawczy:
  1. Rok: w trybie badawczym (`demoMode=false`) używaj WYŁĄCZNIE kolumny `ROK`/`rok`
     z danych wejściowych; brak kolumny → `null` dla danego rekordu, sekcja trendów
     w UI pokazuje istniejący już komunikat "BRAK DANYCH CZASOWYCH" (patrz Z-3).
     W trybie DEMO zachowaj hash-rok, ale oznacz wynik etykietą `[DEMO / SYMULACJA]`.
  2. Benchmark UE i `ris3Alignment`: w trybie badawczym `null`/obiekt nieobecny
     (UI już ma gotowy komunikat zastępczy z Z-3); w DEMO — obecne wartości z etykietą.
- Wywołaj wewnątrz `isProjectEco` z silnika zamiast lokalnej kopii `isEcoProj`.
- Ustaw aliasy wsteczne `calculateTask11Local = calculateTask11;
  calculateTask14Local = calculateTask14;` (wzorem `calculateTask4Local` z Z-1) —
  wszystkie istniejące wywołania w `index.html` działają bez zmian.
- `npm run sync`.

**Test (rozszerzenie `test/run_tests.js`):**
- Test niezmienniczości trybu (wzorzec z Z-3) rozszerzony o Task11/Task14: wartości
  EISPI/EIRRI identyczne w obu trybach dla danych z kompletną kolumną ROK; różnice
  wyłącznie w polach benchmark/rok przy braku tej kolumny.
- Test negatywny: na `proba_1000.xlsx` (brak kolumny ROK) w trybie badawczym —
  `trends` puste/null, `benchmark` null, `ris3Alignment` null — zero wystąpień
  wartości `76.5`, `64.2`, `71.8`, `82` w wyniku `calculateTask11`/`calculateTask14`.
- Regresja: liczby kontrolne z wyroczni (EIFII/ISBI/CRI/EIRSI, Task4/Task8) bez zmian.

**Dowody wpięcia (obowiązkowe w Walkthrough):**
- `grep -n "isEcoProj\|eu27: 76" src/gas/index.html` PRZED i PO — dowód, że zdublowana
  logika i gołe literały zniknęły spoza bloku ENGINE.
- Potwierdzenie, że wywołania w `renderResultsDashboard`/`populateSnaVariables` itd.
  używają teraz aliasów wskazujących na funkcje z ENGINE (nie starych, osobnych ciał
  funkcji) — pokaż `git diff --stat` obejmujący usunięcie starych definicji.

**STOP-AND-ASK, jeśli:** komunikaty zastępcze w UI dla `chartTreemap`/klasyfikacji
regionów (używające `data.task11.classification`) wymagają zmiany struktury przy
braku danych rocznych — to modyfikacja kontraktu wyjścia, nie tylko przeniesienie.

---

## Z-7…Z-16 — mapa drogowa (kolejność, NIE gotowe do uruchomienia)

Każde zadanie poniżej wymaga osobnej rundy doprecyzowania DoD z Krzysztofem/Zamawiającym
przed wygenerowaniem promptu — w większości przypadków chodzi o definicje zmiennych
merytorycznych (np. skład sześciu filarów EIRRI), nie o decyzje inżynierskie.

| # | Zadanie | Pozycje macierzy | Blokuje start |
|---|---|---|---|
| Z-7 | 14.2 Indeks Gotowości — prawdziwe EIRRI (6 filarów z realnych zmiennych, PCA wg D.2, 3 warianty wag, wrażliwość) | 14.2.a–e | Skład zmiennych per filar (Krzysztof) |
| Z-8 | 11.7 Progi z rozkładów zamiast „z ręki”, rekord alarmu, semantyka ochronna | 11.7.0–c | Metoda derywacji progów zatwierdzona przez Radę (D.3) |
| Z-9 | 11.4 Benchmark krajowy — 5 klas z rozkładów | 11.4.a–b | Z-8 (wspólna procedura progowa) |
| Z-10 | 14.4 Typologia regionów — k-means z silnika na filarach Z-7 | 14.4.a–b | Z-7 |
| Z-11 | 11.8 Krajowy DSS — bramka deterministyczna, katalog instrumentów, kontrakt JSON | 11.8.a–d | Z-8 (progi jako wejście reguł) + katalog instrumentów (Krzysztof) |
| Z-12 | 14.7 Regionalny DSS — bezpiecznik z wariantami fallback | 14.7.a–b | Z-11 (wzorzec architektury) |
| Z-13 | 14.1 Baza regionalna — integracja GUS/Eurostat/RIS/środowiskowe do sejfu (D.5) | 14.1.a–g | Pozyskanie danych zewnętrznych — praca badawcza, nie kodowa |
| Z-14 | 11.1/11.2 Rejestr źródeł, katalog 10 wymiarów KPI | 11.1.b,d,e; 11.2.a–d | Może iść równolegle z Z-13 |
| Z-15 | 11.5/14.5 Benchmarki międzynarodowe — ETL zamiast atrapy | 11.5.a–b; 14.5.a–b | Z-13 (wspólna infrastruktura danych) |
| Z-16 | 14.6 Mapy, 14.8 EKO_Lokacje, 14.9 Katalog JST | pozostałe P1 | Większość powyższych |

Poza Fazą B (→ Faza C, decyzja D.6): `14.1.g` (poziom powiat/gmina).
