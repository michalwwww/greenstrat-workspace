# INSTRUKCJA — GREENSTRAT WERSJA PODSTAWOWA (BEZ BOTA I GENERATORA ARTYKUŁÓW)

**Data utworzenia:** 03.08.2026
**Punkt wyjścia:** `greenstrat-workspace` @ `7d5fd37` (silnik `ENGINE_VERSION = 0.5.0`)
**Cel wersji podstawowej:** szybsze dojście do poprawności zadań i wyliczeń przez usunięcie warstw, które nie wpływają na wskaźniki, a generują największe ryzyko metodologiczne i najdłuższy cykl weryfikacji.

> **Dokument towarzyszący:** `docs/WYCIAG_BLEDOW_I_WERYFIKACJA.md` — pełny wyciąg wykrytych błędów (klasy A–I) wraz z procedurą weryfikacji nowego kodu i skanerem `tools/verify_known_issues.js`. Ten plik opisuje **zakres cięcia**; tamten — **jak sprawdzić, że nowy kod nie odtwarza znanych błędów**.

---

## 1. ZASADA NACZELNA NOWEGO PROJEKTU

> Wersja podstawowa istnieje po to, żeby **liczby były poprawne**. Wszystko, co nie liczy wskaźnika i nie jest potrzebne do jego weryfikacji, jest poza zakresem.

Kryterium rozstrzygające przy każdej wątpliwości „czy to zostaje?": **czy usunięcie tego zmieni którąkolwiek wartość w tabeli regresji `npm test`?** Jeśli nie — może zostać usunięte bez ryzyka.

---

## 2. CO USUWAMY I DLACZEGO

### 2.1 Chatbot „Daisy" (integracja Gemini)

**Uzasadnienie:** nie uczestniczy w żadnym wyliczeniu; wymaga klucza `GEMINI_API_KEY` w ScriptProperties i działającego endpointu GAS, co blokuje pracę offline; był źródłem błędów #24 i #25 z Księgi Błędów oraz ustalenia audytowego C-001 (XSS w odpowiedzi AI).

**Kotwice do usunięcia w `src/gas/index.html`** (numery linii ze stanu `7d5fd37` — traktuj je jako orientacyjne, kotwicą właściwą są nazwy):

| Warstwa | Kotwica | Orientacyjnie |
|---|---|---|
| CSS | reguły `.chatbot-*` (launcher, window, messages, input) | ~199–356 |
| HTML | `<div id="chatbot-launcher">` … `<div id="chatbot-window">` wraz z zawartością (`chatbot-messages`, `chatbot-input-field`) | ~2981–3010 |
| JS | `toggleChatbot()`, `handleChatbotKeypress()`, `handleChatbotSend()`, `addChatbotMessage()`, `askAboutDaisyMetric()` oraz budowanie `dataSummary` na potrzeby promptu | ~7608–7755 |

**Wywołania do wyczyszczenia po usunięciu:** `onclick="toggleChatbot()"`, `onkeypress="handleChatbotKeypress(event)"`, przyciski wywołujące `askAboutDaisyMetric('ISBI' | 'EISEI' | 'JASP')` przy kartach wskaźników.

**Po stronie `src/gas/Code.gs`:** usuń obsługę akcji czatu w `doPost` oraz wywołanie API Gemini. Klucz `GEMINI_API_KEY` przestaje być potrzebny — usuń również wzmianki z dokumentacji, żeby nikt go nie konfigurował bez powodu.

### 2.2 Kreator Artykułu (generator tekstu naukowego)

**Uzasadnienie:** to najpoważniejsze źródło ryzyka metodologicznego w całej aplikacji. Raport `audit/RAPORT_WERYFIKACJI_AUDYTU_v0.5.0.md` odnotował tu dwa ustalenia P0: **P0-1** (hardkodowana tabela wyników w generowanym dokumencie) i **P0-2** (fabrykowane wnioski i fikcyjne przypisy, np. `SIMIK_2026_1`). Funkcja `simulatePaperText()` z definicji produkuje tekst, który *wygląda* na wynik badania. Usunięcie jej likwiduje całą tę klasę ryzyka jednym cięciem.

**Kotwice do usunięcia w `src/gas/index.html`:**

| Warstwa | Kotwica | Orientacyjnie |
|---|---|---|
| Przyciski podzakładek | `switchSubTab('taskN', 'ai')` — 4 wystąpienia (`btn-sub-task4-ai`, `-task8-`, `-task11-`, `-task14-`) | 1037, 1463, 2059, 2315 |
| Panele HTML | bloki `<!-- SUB-PANEL 4: KREATOR ARTYKUŁU -->` wraz z formularzami `ai-structure-*`, `ai-prompt-*`, `ai-lang-*`, `ai-style-*`, `ai-words-*`, `ai-bib-*` i podglądem `ai-preview-*` | 1321, 1918, 2216, 2623 |
| JS | sekcja `// ==================== AI RESEARCH PAPER GENERATION & DOCX ====================`: `generatedPapers`, `generateResearchPaper()`, `simulatePaperText()`, `downloadPaperFile()` | ~9190–9330 |

**Uwaga na `switchSubTab`:** po usunięciu podzakładki `ai` zostają cztery: `dashboard`, `inspector`, `spss`, `jasp` (ta ostatnia tylko dla `task4` i `task8`). Sprawdź, czy `switchSubTab` nie ma nigdzie `'ai'` jako wartości domyślnej.

### 2.3 Czego **NIE** usuwać przy okazji

- **Eksport do SPSS/CSV** — to realny kanał weryfikacji wyliczeń, zostaje.
- **Live Data Inspector** — służy do ręcznego sprawdzania rekordów, zostaje.
- **Moduł JASP** — liczy regresję na danych, jest częścią warstwy obliczeniowej.
- **Eksporty PNG/XLS/PDF/Markdown** — nie fabrykują treści, tylko odwzorowują wyliczone wartości.

---

## 3. CO JEST NIETYKALNE

1. **`engine/greenstrat_engine.js`** — jedyne źródło prawdy obliczeń. Każda formuła żyje wyłącznie tutaj.
2. **`test/fixtures_kontrolne.json`** — wyrocznia. Jeśli test nie przechodzi, naprawiasz kod, nigdy wyrocznię. Propozycja zmiany wyroczni = incydent do zgłoszenia człowiekowi z uzasadnieniem.
3. **`test-data/*.xlsx`** — zbiory kontrolne.
4. **Mechanizm `npm run sync`** — po każdej zmianie silnika. Blok `ENGINE` w `index.html` i `Code.gs` jest generowany, nie edytuj go ręcznie.
5. **Bramka walidacyjna Z-4** (`validateProjects`) i precedencja błędów E1→E6.
6. **Zamrożone formuły:** EIFII, ISBI ($SD_{max}=40$), CRI ważone, EIRSI-LQ, EIPI, TTEI, TRLI, EISEI, EISPI, EIRRI. Zmiana wymaga wyraźnej dyspozycji człowieka.

**Wartości kontrolne, które muszą zostać bez zmian po uproszczeniu** (jeśli którakolwiek drgnie — cięcie dotknęło warstwy obliczeniowej i trzeba je cofnąć):

| Plik | Wiersze | EIFII | ISBI | CRI | eco_n | Hash |
|---|---|---|---|---|---|---|
| `proba_1000` | 1000 | 34,90 | 84,65 | 23,00 | 329 | `e69d1ad3` |
| `proba_5000` | 5000 | 35,21 | 90,52 | 22,35 | 1742 | `a41fae75` |
| `czesc_1` | 10434 | 35,37 | 90,48 | 22,15 | 3717 | `32dd9923` |
| `pelna_baza` | 31301 | 35,71 | 88,97 | 21,81 | 11148 | `17d343dc` |

Bramka Z-4 na `walidacja_negatywna_1000`: **880 przyjętych / 120 odrzuconych** (E1:30, E2:30, E3:20, E4:20, E5:10, E6:10).

---

## 4. STAN WYJŚCIOWY — CO PRZENIEŚĆ DO NOWEGO PROJEKTU

### 4.1 Naprawione, przenieś w całości

**A-1 (Produkt 11.5)** — benchmark międzynarodowy. Karta „Polska na tle UE" pokazywała w trybie badawczym wartość wyliczoną wzorem `clamp(EISPI × 0.724, 50, 95)` pod etykietą źródła „GUS BDL / Eurostat" (na pełnej bazie: 52,9 zamiast rzeczywistych 72,4). Naprawa polegała na wbudowaniu snapshotu jako stałej `EXTERNAL_BENCHMARKS_SNAPSHOT` w bloku `ENGINE` i usunięciu gałęzi ze wzorem.

> **Lekcja architektoniczna, którą trzeba przenieść:** przeglądarka i Google Apps Script **nie mają dostępu do modułów Node ani do systemu plików**. Każda gałąź kodu czytająca dane przez `require()` lub `fs` jest na kliencie martwa. Jeśli dane mają być dostępne w aplikacji, muszą trafić do bloku `ENGINE`. Sprawdzaj to przy każdym nowym źródle danych.

### 4.2 Otwarte — przenieś jako backlog

| # | Opis | Waga |
|---|---|---|
| **A-2** | `datasetHash` nieporównywalny między aplikacją a wyrocznią: parser UI dokłada wyliczone pole `DELTA_TRL` przed stemplowaniem, a wyrocznia stempluje surowe 18 kolumn arkusza. Algorytm FNV-1a jest spójny środowiskowo — to różnica danych wejściowych, nie błąd hasza. **Decyzja do podjęcia:** który zestaw pól jest kanoniczny dla stempla. | Poważne |
| **A-3** | Brak kolumny `ROK` daje oś czasu 2021–2027 z samymi zerami zamiast komunikatu „BRAK DANYCH CZASOWYCH"; `cagr = 0` sugeruje zerowy wzrost zamiast braku podstawy. Konflikt z ustaleniem Z-6. **Decyzja:** zmiana kontraktu `task11.trends`. | Poważne |
| **A-4** | `chartGpqiBenchmarking` i `chartGpqiBottleneck` nie mają kodu renderującego — puste karty 288 px z działającymi przyciskami eksportu. Druga opisuje „średni czas procedowania", wymiar nieobecny w 18-kolumnowym schemacie. **Decyzja:** implementacja albo usunięcie kart. | Drobne |

Pełny opis z dowodami: `audit/RAPORT_AUDYTU_UI_PELNA_BAZA_31301.md`.

> **A-4 rozwiąż przy okazji uproszczenia** — usunięcie dwóch pustych kart wraz z przyciskami eksportu wpisuje się w zakres cięcia i nie dotyka warstwy obliczeniowej.

---

## 5. PROCEDURA WERYFIKACJI

### 5.1 Po każdej zmianie silnika

```bash
npm run sync
```

```bash
npm test
```

Zadanie nie jest ukończone bez zielonego `npm test`. Sprawdź, czy tabela regresji zgadza się z sekcją 3.

### 5.2 Audyt UI w przeglądarce (metoda sprawdzona na 31 301 rekordach)

Testy jednostkowe nie wyłapią błędów runtime w kliencie ani rozjazdu między silnikiem a warstwą prezentacji — A-1 przechodziło przez zieloną siatkę. Procedura:

1. **Serwer statyczny na korzeniu workspace** (nie na `src/gas`), żeby `index.html` i `test-data/*.xlsx` były pod tym samym originem.
2. **Pułapki błędów przed wczytaniem danych:**
   ```js
   window.__err = [];
   window.addEventListener('error', e => window.__err.push(e.message));
   window.addEventListener('unhandledrejection', e => window.__err.push(String(e.reason)));
   window.alert = m => window.__alerts.push(String(m));
   ```
   Przechwycenie `alert()` jest istotne — aplikacja raportuje przez nie wynik bramki.
3. **Wstrzyknięcie pliku bez klikania** — przez `DataTransfer`:
   ```js
   const buf = await (await fetch('/test-data/GREENSTRAT_test_pelna_baza_31301.xlsx')).arrayBuffer();
   const dt = new DataTransfer();
   dt.items.add(new File([buf], 'GREENSTRAT_test_pelna_baza_31301.xlsx'));
   const inp = document.getElementById('fileInput');
   inp.files = dt.files;
   inp.dispatchEvent(new Event('change', { bubbles: true }));
   ```
4. **Uruchomienie obliczeń:** `document.getElementById('btnProcess').click()` — samo wczytanie pliku tylko parsuje, nie liczy.
5. **Przejście wszystkich ścieżek** z licznikiem błędów przed i po każdym kroku. Po uproszczeniu lista to 4 zakładki × (`dashboard`, `inspector`, `spss`) + `jasp` dla `task4`/`task8` + 6 podbaz zakładki 11 + zakładki `ingest`, `logs`, `docs`.
6. **Porównanie wyliczeń z wyrocznią** — odczytaj `backendCalculatedData.task4` i zestaw z tabelą z sekcji 3.

### 5.3 Pułapki środowiskowe (zweryfikowane, nie teoretyczne)

- **Sekwencje dłuższe niż ~30 s** w przeglądarce przekraczają limit pojedynczego wywołania. Uruchamiaj przejście jako zadanie w tle zapisujące wynik do `window.__walk` i odpytuj o stan osobnym wywołaniem.
- **Wykresy o szerokości 0 px** przy ukrytym panelu przeglądarki — ApexCharts pomija wtedy rysowanie geometrii. **To nie jest defekt aplikacji.** Żeby zweryfikować zawartość wykresu, wymuś render przy jawnej szerokości (`host.style.width = '900px'`) albo czytaj dane z obiektu wyników, nie z DOM.
- **`npm run sync` przepisuje końce linii** — plik potrafi pokazać się jako zmodyfikowany przy pustym `git diff`. To zmiana CRLF/LF, nie treści.
- **Repozytorium ma hook auto-push po commicie.** Przy równoległej pracy odbija się o `fetch first` — zrób `git fetch` + `git rebase origin/main` i wypchnij ręcznie.
- **PowerShell psuje wieloliniowe komunikaty commita.** Zapisz komunikat do pliku i użyj `git commit -F <plik>`.
- **`XLSX.utils.sheet_to_json` z `defval: ''` i bez** — daje ten sam hash na kontrolnych zbiorach; jeśli hasze się różnią, przyczyną są różne **pola rekordu**, nie opcje parsera.

---

## 6. DEFINICJA UKOŃCZENIA UPROSZCZENIA

- [ ] Zero wystąpień `chatbot`, `Daisy`, `Gemini`, `GEMINI_API_KEY` w `index.html` i `Code.gs`.
- [ ] Zero wystąpień `simulatePaperText`, `generateResearchPaper`, `downloadPaperFile`, `ai-preview-`, `KREATOR ARTYKUŁU`.
- [ ] Brak martwych wywołań `onclick`/`onkeypress` wskazujących na usunięte funkcje (przejdź aplikację z otwartą konsolą — `ReferenceError` ujawni każde przeoczenie).
- [ ] `npm test` **[PASS]**, tabela regresji identyczna z sekcją 3, cztery hasze bez zmian.
- [ ] Test walidacji składni JS klienta przechodzi (liczba bloków `<script>` może się zmniejszyć — to oczekiwane).
- [ ] Audyt UI wg 5.2: zero błędów runtime, bramka 31 301/0, wskaźniki zgodne z wyrocznią.
- [ ] Wpis w `CHANGELOG.md` z zakresem cięcia i wynikiem regresji.

---

## 7. ZASADY PRACY (obowiązują dalej)

Pełna wersja: `AGENTS.md`. Skrót krytyczny:

1. **ZERO DANYCH WYMYŚLONYCH.** Brak danych = `null` / `-99` + flaga braku. Nigdy „sensowny default", nigdy liczba wpisana, żeby wykres wyglądał na żywy. Nigdy wartość referencyjna zaszyta w kodzie — źródłem może być wyłącznie arkusz danych albo plik konfiguracyjny oznaczony pochodzeniem.
2. **STOP-AND-ASK.** Niejednoznaczność, konflikt z regułami, konieczność zmiany schematu, formuły lub progu → zatrzymaj się i zapytaj. Nie doprojektowuj wymagań.
3. **CHIRURGIA, NIE REFAKTOR.** Minimalny diff. Każda zmieniona linia musi wynikać wprost z treści zadania. Uproszczenie jest wyjątkiem *tylko* w zakresie opisanym w sekcji 2 — nie jest zaproszeniem do przebudowy reszty.
4. **NAJPIERW WYROCZNIA, POTEM KOD.**
5. **JEDNO ŹRÓDŁO PRAWDY OBLICZEŃ** — silnik + `npm run sync`.
6. **HITL.** Wdrożenie na serwer GAS wyłącznie na wyraźne polecenie człowieka.

### Lekcja z audytu, która kosztowała najwięcej

> Zielony test nie dowodzi poprawności ścieżki, której nie wywołuje. Asercja Z-16 sprawdzała moduł ETL zamiast `calculateTask11` — dokładnie tej funkcji, którą uruchamia aplikacja. Fabrykowana wartość przechodziła przez pełną siatkę regresyjną.
>
> **Przy każdym nowym teście zadaj pytanie: czy wywołuję kod dokładnie tak, jak robi to aplikacja?** Jeśli test przekazuje opcje, których klient nie przekazuje — testujesz inną ścieżkę niż produkcyjna.
