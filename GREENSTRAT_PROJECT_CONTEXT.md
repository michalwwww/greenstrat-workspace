# GREENSTRAT — PEŁNY KONTEKST PROJEKTOWY DLA MODELU LLM (KIMI)

> **Plik kontekstowy dla modelu Kimi (LLM):**  
> Przeczytaj ten plik przed podjęciem jakichkolwiek prac w projekcie GREENSTRAT. Zawiera on komplet wiedzy o architekturze, historii zmian, zasadach twardych, kanonicznym silniku obliczeniowym oraz aktualnym stanie prac na początku Fazy B.

---

## 1. OPIS SYSTEMU I CELE BADAWCZE

**GREENSTRAT** to zaawansowany system monitorowania, weryfikacji i wspomagania decyzji w polityce ekoinnowacyjnej.
* **Docelowa skala danych:** Pliki produkcyjne zawierają do 31 301 rekordów projektów (`GREENSTRAT_test_pelna_baza_31301.xlsx`).
* **Dwa Tryby Działania Systemu:**
  1. **Tryb Badawczy / Naukowy (`demoMode = false`, `TRYB_DEMO = false`):** Domyślny tryb produkcyjny. Obowiązuje w nim **rygoryzm naukowy** — ZERO danych symulowanych, brakujących ocen ani wymyślonych wartości referencyjnych. Brakujące dane to `null` / `-99` + odpowiednia flaga braku.
  2. **Tryb DEMO (`demoMode = true`, `TRYB_DEMO = true`):** Tryb pokazowy/prezentacyjny dla UI. Wszystkie wartości symulowane i atrapowe noszą bezwzględnie etykietę `"[DEMO / SYMULACJA]"`.

---

## 2. ARCHITEKTURA TECHNOLOGICZNA I STACK

* **Backend / Serwer chmurowy:** Google Apps Script Web App ([src/gas/Code.gs](file:///d:/Antygravity2.0/greenstrat-workspace/greenstrat-workspace/src/gas/Code.gs)), dostępny przez punkt końcowy HTTP POST (`doPost(e)`).
* **Baza danych ("Master Ledger"):** Google Sheets — zakładki `Projects` (rekordy projektowe) oraz `Logs_History` (dziennik zdarzeń audytowych).
* **Frontend / Interfejs Użytkownika:** Jednoplikowa aplikacja [src/gas/index.html](file:///d:/Antygravity2.0/greenstrat-workspace/greenstrat-workspace/src/gas/index.html) napisana w Vanilla JS z wykorzystaniem Tailwind CSS CDN, ApexCharts (wykresy) oraz SheetJS (parsowanie plików Excel).
* **Kanoniczny Silnik Obliczeniowy:** [engine/greenstrat_engine.js](file:///d:/Antygravity2.0/greenstrat-workspace/greenstrat-workspace/engine/greenstrat_engine.js) — jedno źródło prawdy dla wszystkich wskaźników statystycznych (czysty JavaScript bez zależności od DOM czy `SpreadsheetApp`).
* **Mechanizm Synchronizacji:** [tools/sync_engine.js](file:///d:/Antygravity2.0/greenstrat-workspace/greenstrat-workspace/tools/sync_engine.js) uruchamiany poleceniem `npm run sync`. Kopiuje zawartość bloku `// ==ENGINE:START==` ... `// ==ENGINE:END==` z silnika do plików `Code.gs` oraz `index.html`.
* **Siatka Testowa i Wyrocznia:** [test/run_tests.js](file:///d:/Antygravity2.0/greenstrat-workspace/greenstrat-workspace/test/run_tests.js) uruchamiany poleceniem `npm test`. Weryfikuje poprawność obliczeń względem niewzruszonej wyroczni [test/fixtures_kontrolne.json](file:///d:/Antygravity2.0/greenstrat-workspace/greenstrat-workspace/test/fixtures_kontrolne.json).

---

## 3. ZASADY TWARDE (DEKALOG AGENTA)

1. **ZERO DANYCH WYMYŚLONYCH:** W trybie badawczym brak danych = `null` / `-99` + flaga braku. Nigdy nie używaj wartości zastępczych, sensownych defaultów ani losowych liczb, aby wykres wyglądał na żywy.
2. **STOP-AND-ASK:** W przypadku niejednoznaczności wymagania, konfliktu z regułami lub konieczności zmiany schematu/formuły — zatrzymaj się i zapytaj użytkownika (Human-in-the-Loop). Nie doprojektowuj wymagań samoczynnie.
3. **CHIRURGIA, NIE REFAKTOR:** Wykonuj minimalny możliwy git diff. Nie poprawiaj sąsiedniego kodu, komentarzy ani formatowania. Dopasuj się do istniejącego stylu (`var`, funkcje nazwane, polskie komunikaty UI).
4. **NAJPIERW WYROCZNIA, POTEM KOD:** Zadanie nie jest ukończone bez zielonego `npm test`. Plik wyroczni `test/fixtures_kontrolne.json` jest NIENARUSZALNY. Naprawiasz kod, nigdy wyrocznię.
5. **JEDNO ŹRÓDŁO PRAWDY OBLICZEŃ:** Cała logika wskaźników żyje wyłącznie w `engine/greenstrat_engine.js`. Zakaz duplikowania formuł poza silnikiem i mechanizmem `npm run sync`.
6. **FORMUŁY WSKAŹNIKÓW SĄ ZAMROŻONE:** EIFII, ISBI ($SD_{max}=40$), CRI ważone, EIRSI-LQ, EIPI, TTEI, TRLI, EISEI, EISPI, EIRRI — zmiana jakiejkolwiek formuły wymaga wyraźnej dyspozycji użytkownika.
7. **WDROŻENIA NA SERWER (HITL):** Wdrożenie kodu na serwer Google Apps Script (poprzez `clasp push` lub ręczną wklejkę) następuje **WYŁĄCZNIE na wyraźne polecenie użytkownika** po akceptacji raportu z testów.

---

## 4. DOKUMENTACJA WSKAŹNIKÓW BADAWCZYCH

### Task 4 — Podstawowe Wskaźniki Strukturalne
* **EIFII (Eco-Innovation Financial Intensity Index):** Stosunek wartości finansowej projektów ekoinnowacyjnych do wartości całego portfela.
* **ISBI (Indicator of Structural Balance of Innovation):** Wskaźnik zbalansowania strukturalnego ($SD_{max} = 40$).
* **CRI (Commercialization Readiness Index):** Indeks gotowości komercyjnej ważony ocenami operacyjnymi.
* **EIRSI (Eco-Innovation Regional Specialization Index):** Wskaźnik specjalizacji regionalnej bazujący na formule Location Quotient (LQ).

### Task 8 — Wskaźniki Wydajności Programów
* **GPQI (Green Program Quality Index):** Zagregowany wskaźnik jakości programów finansujących (akceptacja, administracja, finanse, wdrażanie, innowacyjność, regionalność).
* **TRLI (Technology Readiness Level Index):** Przyrost poziomu TRL ($\Delta TRL = TRL_{koniec} - TRL_{start}$).
* **EISEI (Eco-Innovation Structural Effectiveness Index):** Dynamicznie przeskalowywane wskaźniki efektywności.

### Task 11 — System Monitorowania Krajowego
* **EISPI (Eco-Innovation System Performance Index):** Krajowy indeks wydajności systemu ekoinnowacji.
* **CAGR (Compound Annual Growth Rate):** Średnioroczne tempo wzrostu finansowania ekoinnowacji.
* **Klasyfikacja Regionów:** Podział 16 województw na 5 klas (`liderzy`, `rozwijające się`, `niewykorzystany potencjał`, `regiony transformacji`, `wymagające interwencji`).

### Task 14 — Model Zdolności Regionalnej i EKO_Lokacji
* **EIRRI (Eco-Innovation Regional Readiness Index):** Ocena potencjału w 6 filarach (innowacyjny, finansowy, wdrożeniowy, instytucjonalny, środowiskowy, społeczny).
* **Sieć SNA:** Graf powiązań międzysektorowych (Uczelnia, MŚP, Startup, NGO, Instytucja Naukowa, Duże przedsiębiorstwo).

---

## 5. PODSUMOWANIE DOKONANYCH PRAC I ZAMKNIĘTYCH ZADAŃ

### Faza A (Zamknięta w 100% PASS):
* **Z-0:** Inicjalizacja workspace `greenstrat-workspace`, utworzenie `package.json`, podpięcie testów.
* **Z-1:** Utworzenie kanonicznego silnika `engine/greenstrat_engine.js` i mechanizmu `npm run sync`.
* **Z-2:** Neutralizacja niekompletnych rekordów. Wprowadzenie `isProjectComplete` (wymóg kompletu 4 ocen operacyjnych: innowacyjność, trwałość LCA, efektywność zasobowa, transformacyjność). Rekordy niekompletne nie są ekoinnowacjami.
* **Z-3:** Separacja trybu DEMO od trybu badawczego (Decyzja D.12).
* **Z-4:** Bramka Walidacyjna 2.0 (`validateProjects`) ze słownikiem 18 regionów i ścisłą precedencją błędów E1→E2→E3→E4→E5→E6.
* **Z-5:** Stemplowanie wyników (`ENGINE_VERSION = "0.5.0"`), deterministyczny hash FNV-1a 32-bit z sortowaniem kluczy `Object.keys(p).sort()`.

### Rozwiązane Incydenty i Korekty Audytowe:
* **SyntaxError w index.html:5161:** Usunięto wiszącą deklarację `const trendsOptions`. Dodano stały test automatycznej walidacji składni klienckiej (`new Function(code)`) w `test/run_tests.js`.
* **Luka L.18 (Z-6 Fazy A):** Usunięto automatyczną mutację ocen (`isCollinear`) oraz auto-korektę regresji TRL z parsera w `index.html`.
* **Luka L.19:** Usunięto reguły blokowania całego pliku z `runGatekeeperValidation()`, przekazując walidację wierszową w 100% do Bramki Z-4.
* **Test D.11:** Zbadano i zweryfikowano próg przełączania na przetwarzanie lokalne. Próg ustalony na kanonicznym poziomie 500 wierszy.

### Faza B (W trakcie):
* **Z-6 (Faza B):** Domknięcie L.20 (Jedno źródło prawdy dla Task 11 / Task 14). Przeniesiono `calculateTask11` i `calculateTask14` do bloku `ENGINE` w `greenstrat_engine.js`. Usunięto nie-bramkowane funkcje lokalne oraz zduplikowaną logikę `isEcoProj`. W trybie badawczym roczniki pobierane są wyłącznie z kolumny `ROK` (`null` przy braku), a benchmarki UE i `ris3Alignment` zwracają `null`.
* **Z-7 (Faza B):** Produkt 14.2 (Realny Indeks Gotowości EIRRI w 6 filarach). Zaimplementowano 6-filarowy model empiryczny EIRRI (gospodarczy, naukowo-innowacyjny, absorpcyjny, wdrożeniowy, środowiskowo-transformacyjny, instytucjonalny). Zaimplementowano wagi PCA (Decyzja D.2), 3 warianty ważenia (equal, pca, expert), zakres wrażliwości oraz poziom niepewności w silniku.
* **Z-8 (Faza B):** Produkt 11.7 (System progów z rozkładów i Rejestr Alarmów). Zaimplementowano dynamiczne progi ostrzegawcze ($P25$/$Q1$) i krytyczne ($P10$/$IQR$) z rozkładów statystycznych, rejestr alarmów z 3 kolorami (`ZIELONY`, `ŻÓŁTY`, `CZERWONY`), wskaźnikami trwałości, poziomami wiarygodności, flagą `baseEffect` oraz wyliczaniem wartości bez obserwacji dominującej.
* **Z-9 (Faza B):** Produkt 11.4 (Benchmark Krajowy w 5 klasach statystycznych). Zaimplementowano klasyfikację podmiotów i regionów do 5 klas benchmarkowych (*Liderzy systemowi*, *Ponadprzeciętni*, *Poziom referencyjny*, *Wymagający poprawy*, *Krytyczni*) z percentile distribution ($P10$, $P25$, $P75$, $P90$) oraz z bezpiecznikiem blokującym sztucznego Lidera przy braku dywersyfikacji.
* **Z-10 (Faza B):** Produkt 14.3 (Typologia Regionalna i Klasteryzacja na 6 filarach EIRRI). Zaimplementowano klasteryzację 16 województw do 4 archetypów rozwoju ekoinnowacyjnego na wektorach 6D, z wyliczaną odległością od centroidu, głównym atutem, deficytem i typem rekomendowanej interwencji publicznej.





---

## 6. MAPA KATALOGÓW I PLIKÓW PROJEKTU

```text
greenstrat-workspace/
├── engine/
│   └── greenstrat_engine.js       <-- KANONICZNY SILNIK OBLICZENIOWY (JEDNO ŹRÓDŁO PRAWDY)
├── src/
│   └── gas/
│       ├── Code.gs                <-- BACKEND GOOGLE APPS SCRIPT (doPost, Sheets I/O)
│       └── index.html             <-- FRONTEND KLIENTA (Vanilla JS, UI, ApexCharts)
├── tools/
│   └── sync_engine.js             <-- SKRYPT SYNCHRONIZUJĄCY ENGINE (npm run sync)
├── test/
│   ├── run_tests.js               <-- GŁÓWNA HARNESS TESTOWA (npm test)
│   └── fixtures_kontrolne.json    <-- WYROCZNIA (KONTROLNE WARTOŚCI WSKAŹNIKÓW)
├── test-data/                     <-- PLIKI TESTOWE EXCEL (1000, 5000, 10434, 31301 wierszy)
├── docs/
│   ├── BACKLOG_FAZY_B.md          <-- MAPA DROGOWA I BACKLOG FAZY B (Z-6...Z-16)
│   ├── macierz_traceability.csv   <-- MACIERZ 69 WYMAGAŃ I STANU SYSTEMU
│   └── protokol_testu.docx        <-- PROTOKÓŁ TESTU OBCIĄŻENIOWEGO D.11
├── AGENTS.md                      <-- REGULAMIN I DEKALOG AGENTA
├── CHANGELOG.md                   <-- CHRONOLOGICZNY REJESTR ZMIAN
└── package.json                   <-- KONFIGURACJA NPM (skrypty test i sync)
```

---

## 7. INSTRUKCJA DLA KIMI: JAK PRACOWAĆ Z PROJEKTEM

1. **Zanim zaczniesz jakiekolwiek zadanie:**
   - Przeczytaj wytyczne w `AGENTS.md` oraz opis zadania w `docs/BACKLOG_FAZY_B.md`.
   - Zawsze wygeneruj najpierw artefakt `implementation_plan.md` i zaczekaj na akceptację użytkownika przed edycją kodu.
2. **Podczas wprowadzania zmian:**
   - Zmień `engine/greenstrat_engine.js`.
   - Uruchom synchronizację: `npm run sync`.
   - Uruchom testy: `npm test`.
   - Jeśli musisz dopasować testy pod nowe zadanie z backlogu, rozbudowuj `test/run_tests.js`, nie dotykając wartości wyroczni `fixtures_kontrolne.json`.
3. **Po zakończeniu prac:**
   - Przedstaw artefakt `walkthrough.md` zawierający opis zmian, dowody grep PRZED/PO, `git diff --stat` oraz surowy output z `npm test`.
   - Zaktualizuj plik `CHANGELOG.md`.

---
*Dokumentację przygotowano dla modelu Kimi (LLM) — Stan na dzień: 27.07.2026.*
