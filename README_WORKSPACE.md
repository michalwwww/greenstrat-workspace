# README — Struktura Workspace GREENSTRAT w Google Antigravity
(Dokument dla właściciela projektu i analityków; opisy struktury produkcyjnej po zakończeniu Fazy A i Fazy B)

## 1. Struktura produkcyjna workspace

```
greenstrat-workspace/
├── AGENTS.md                      ← Konstytucja dla agenta AI
├── README.md                      ← Główny opis projektu w repozytorium GitHub
├── README_WORKSPACE.md            ← Przewodnik po montażu workspace
├── CHANGELOG.md                   ← Rejestr wydań i wprowadzonych prac
├── GREENSTRAT_PROJECT_CONTEXT.md  ← Kontekst badawczo-architektoniczny
├── package.json                   ← Skrypty npm test i npm run sync
├── data/
│   └── external_benchmarks_snapshot.json ← Empiryczny snapshot GUS BDL & Eurostat
├── docs/
│   ├── INSTRUKCJA_OBSLUGI_GREENSTRAT.md ← Kompletna Instrukcja Obsługi Systemu
│   ├── BACKLOG_FAZY_B.md          ← Kolejka zadań Fazy B (16 produktów)
│   └── macierz_traceability.csv   ← Mapa 69 wymagań
├── engine/
│   └── greenstrat_engine.js       ← KANONICZNY SILNIK OBLICZENIOWY (v0.5.0)
├── tools/
│   ├── sync_engine.js             ← Narzędzie synchronizacji silnika
│   ├── import_external_datasets.js← Importer ETL baz zewnętrznych
│   └── export_formats.js          ← Wieloformatowy silnik eksportu
├── test/
│   ├── run_tests.js               ← Harness testowy (wyrocznia i asercje)
│   └── fixtures_kontrolne.json    ← WYROCZNIA TESTOWA FAZY A I B
├── test-data/
│   ├── GREENSTRAT_test_proba_1000.xlsx
│   ├── GREENSTRAT_test_proba_5000.xlsx
│   ├── GREENSTRAT_test_czesc_1.xlsx
│   └── GREENSTRAT_test_pelna_baza_31301.xlsx
└── src/
    └── gas/
        ├── Code.gs                ← Backend Google Apps Script Web App
        └── index.html             ← Jednoplikowa Aplikacja Kliencka (UI)
```

## 2. Rozmieść pliki pakietu
Skopiuj dostarczone pliki dokładnie w ścieżki z drzewa powyżej. Nazw nie zmieniaj —
odwołują się do nich reguły i backlog.

## 3. Wstaw kod źródłowy aplikacji — wybierz ścieżkę

**Ścieżka A — clasp (zalecana, agent sam synchronizuje po Twoim akcepcie):**
1. Zainstaluj Node.js (nodejs.org, wersja LTS).
2. W terminalu: `npm install -g @google/clasp`, następnie `clasp login` (logowanie kontem Google projektu).
3. W Apps Script (script.google.com) otwórz projekt → Ustawienia → skopiuj **Identyfikator skryptu**.
4. W folderze `src/gas/`: `clasp clone <IDENTYFIKATOR>` — pobierze Code.gs i index.html.
5. Wdrożenie po akceptacji Walkthrough: `clasp push` (wyłącznie na Twoją komendę — patrz reguła 8 w AGENTS.md).

**Ścieżka B — ręczna (zero instalacji):** skopiuj treść Code.gs i index.html z edytora
Apps Script do plików w `src/gas/`. Po każdej zaakceptowanej zmianie wklejasz zawartość
z powrotem do edytora online i zapisujesz nową wersję wdrożenia.

## 4. Otwórz workspace w Antigravity
Antigravity → **Open New Workspace** → wskaż folder `greenstrat-workspace`.
Sprawdź w **Customizations → Rules**, że AGENTS.md został wykryty jako reguły workspace.
Workflow `/weryfikacja` będzie dostępny w oknie rozmowy z agentem po wpisaniu ukośnika.

## 5. Ustaw autonomię (ważne)
Profil: **Review-driven development** — NIE Turbo/Agent-driven na start (auto-continue
w świeżym projekcie to proszenie się o niekontrolowane zmiany). Polityka terminala: Auto,
z listą blokad co najmniej: `clasp push`, `clasp deploy`, `rm -rf`, `git push`.

## 6. Uruchom pierwszą misję
Wklej agentowi prompt z końcówki `docs/BACKLOG_AGENTA.md`, wpisując **Z-0**.

## 7. Rytm pracy (bramki, których pilnujesz)
1. Agent oddaje **Plan** → czytasz → akceptujesz albo pytasz.
2. Agent implementuje → oddaje **Walkthrough** z wynikiem `npm test`.
3. Ty (lub agent na Twoją komendę) uruchamiasz `/weryfikacja` — musi być zielono.
4. Dopiero teraz zgoda na `clasp push` / wklejkę do edytora.
5. Kolejne zadanie = nowa rozmowa agenta.

## 8. Czerwone flagi w review (nie musisz czytać kodu — czytaj artefakty)
- Plan wymienia pliki spoza zakresu zadania albo "przy okazji uporządkuję…" → odmowa.
- Agent proponuje zmianę `test/fixtures_kontrolne.json` lub plików w `test-data/` →
  odmowa; to próba dopasowania wyroczni do kodu zamiast kodu do wyroczni.
- Walkthrough bez pełnego, wklejonego wyniku `npm test` (albo "testy przejdą") → odmowa.

## 9. Uwagi końcowe
- Jeśli kiedyś reguły globalne Antigravity będą konfliktować z projektowymi, krytyczne
  zapisy przenieś do `GEMINI.md` w korzeniu (ma wyższy priorytet niż AGENTS.md).
- Test obciążeniowy (docs/protokol_testu.docx) wykonaj ręcznie za pierwszym razem;
  po zadaniu Z-1 możesz zlecać agentowi jego powtórki regresyjne przez przeglądarkę.
