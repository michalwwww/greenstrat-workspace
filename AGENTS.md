# GREENSTRAT — Reguły projektu dla agenta

## Kontekst (przeczytaj przed pierwszym planem)

GREENSTRAT to system monitorowania i wspomagania decyzji polityki ekoinnowacyjnej.
Stack FAKTYCZNY: Google Apps Script (web app `src/gas/Code.gs`) + Google Sheets jako baza
("Master Ledger") + frontend jednoplikowy `src/gas/index.html` (Tailwind CDN, ApexCharts,
SheetJS) + Gemini API (klucz w ScriptProperties). Docelowa skala danych: 31 301 projektów.

Mapa wiedzy projektu (czytaj przez `@`):
- `docs/macierz_traceability.csv` — 69 wymagań ze statusami pokrycia (kolumny: Status = spec v2.0; ostatnia kolumna = stan aplikacji z audytu kodu). To jest mapa zakresu.
- `docs/BACKLOG_AGENTA.md` — Twoja kolejka zadań Z-0…Z-5. Wykonujesz WYŁĄCZNIE zadanie wskazane w bieżącej misji.
- `test/fixtures_kontrolne.json` — WYROCZNIA: wartości wskaźników wyliczone niezależnie od kodu. Nienaruszalne.
- `test-data/*.xlsx` — dane testowe (schemat 18 kolumn zgodny z importem aplikacji).

## Zasady twarde (obowiązują zawsze, w każdej misji)

1. **ZERO DANYCH WYMYŚLONYCH.** Brak danych = `null` / `-99` + flaga braku i raport — nigdy wartość
   zastępcza, nigdy "sensowny default", nigdy liczba wpisana na sztywno, żeby wykres wyglądał na żywy.
   Istniejące w kodzie symulacje (rok z hasha ID, benchmark `eu27: 76.5`, `baseProgramSpecs`,
   `ris3Alignment = 82`, losowe patenty) to błędy do usunięcia wg backlogu — nie wzorce do naśladowania.
2. **STOP-AND-ASK.** Niejednoznaczność wymagania, konflikt z regułami, konieczność zmiany schematu
   danych, formuły wskaźnika lub progu → zatrzymaj się i zadaj pytanie w artefakcie Plan.
   Nie doprojektowuj wymagań. Nie wybieraj interpretacji po cichu — wypisz warianty.
3. **CHIRURGIA, NIE REFAKTOR.** Minimalny diff realizujący zadanie. Nie poprawiaj sąsiedniego kodu,
   komentarzy ani formatowania. Dopasuj się do istniejącego stylu (`var`, funkcje nazwane, polskie
   komunikaty UI). Nie rozbijaj `index.html` na moduły bez osobnego zadania. Każda zmieniona linia
   musi wynikać wprost z treści zadania.
4. **NAJPIERW WYROCZNIA, POTEM KOD.** Zadanie nie jest ukończone bez zielonego `npm test`.
   Wartości w `test/fixtures_kontrolne.json` i pliki `test-data/` są NIENARUSZALNE — jeśli test nie
   przechodzi, naprawiasz kod, nigdy wyrocznię. Propozycja zmiany fixtures = incydent do zgłoszenia
   człowiekowi z uzasadnieniem.
5. **JEDNO ŹRÓDŁO PRAWDY OBLICZEŃ.** Po zadaniu Z-1 cała logika wskaźników żyje wyłącznie w
   `engine/greenstrat_engine.js` (czyste funkcje, bez zależności od SpreadsheetApp i DOM).
   Zakaz duplikowania formuł w kliencie lub serwerze poza mechanizmem synchronizacji opisanym w Z-1.
6. **FORMUŁY WSKAŹNIKÓW SĄ ZAMROŻONE.** EIFII, ISBI (SDmax=40), CRI ważone, EIRSI-LQ, EIPI, TTEI,
   TRLI, EISEI z dynamicznym przeskalowaniem wag — zmiana którejkolwiek wymaga wyraźnego zadania
   i akceptu człowieka. Ekstrakcja (Z-1) = przeniesienie 1:1.
7. **GRANICE PLATFORMY GAS.** Limit ~6 min na wykonanie; brak `require`/npm po stronie serwera;
   I/O na Sheets zawsze zbiorczo (`getValues`/`setValues` na zakresach — nigdy pętla po komórkach);
   import danych porcjami ≤ 10 434 wierszy (pliki `czesc_1..3`); duże pętle po 31 301 rekordów pisz
   jednoprzebiegowo.
8. **HITL.** Decyzje oznaczone D.* podejmuje człowiek. Wdrożenie na serwer (`clasp push` lub wklejka
   do edytora Apps Script) wyłącznie po akceptacji Walkthrough przez człowieka — nigdy automatycznie.
9. **ARTEFAKTY OBOWIĄZKOWE w każdej misji:** (a) Plan przed jakimkolwiek kodem: kroki, lista plików
   do zmiany, założenia, pytania; (b) po implementacji Walkthrough: co zmieniono, pełny wynik
   `npm test`, instrukcja weryfikacji ręcznej; (c) wpis w `CHANGELOG.md` (data, zadanie, zakres).
10. **BEZPIECZEŃSTWO.** Klucz `GEMINI_API_KEY` istnieje tylko w ScriptProperties — nigdy w kodzie,
    logach ani artefaktach. Dane beneficjentów nie trafiają do logów ani przykładów w dokumentacji.

## Parametry środowiska

- Komenda testów: `npm test` (uruchamiana z korzenia workspace).
- Kod źródłowy aplikacji: `src/gas/` (synchronizacja z Apps Script przez `clasp` albo ręczną wklejkę — patrz README_WORKSPACE.md; wybór należy do człowieka).
- Parsowanie XLSX w testach: biblioteka `xlsx` (SheetJS) — ta sama, której używa frontend; dzięki temu testy i aplikacja czytają dane identycznie.

## Czego nie robić (lekcje z audytu tego repozytorium)

- Nie generuj brakujących wymiarów danych (lat, patentów, emisji) żadną formułą ani hashem.
- Nie wpisuj wartości referencyjnych i benchmarków w kod — źródłem może być wyłącznie arkusz danych lub plik konfiguracyjny oznaczony pochodzeniem.
- Nie nadawaj brakom ocen wartości domyślnych, które zmieniają klasyfikację rekordu (grzech `INNOWACYJNOSC: 1`).
- Nie dodawaj "domyślnych" elementów wizualizacji, gdy zbiór jest pusty (grzech fikcyjnych krawędzi sieci SNA).
- Nie twierdź, że coś działa, bez pokazania wyniku testu lub zrzutu z przeglądarki w Walkthrough.
