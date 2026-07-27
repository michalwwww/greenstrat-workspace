# 🌿 GREENSTRAT CLOUD ENGINE
**System Analizy Ekoinnowacji i Ewaluacji Funduszy Europejskich**  
**Wersja:** v0.5.0 | **Status:** Faza A & Faza B (100% PASS)  
**Repozytorium:** [https://github.com/michalwwww/greenstrat-workspace](https://github.com/michalwwww/greenstrat-workspace)

---

## 📌 Opis Projektu

**GREENSTRAT Cloud Engine** to profesjonalne środowisko badawcze i analityczne przeznaczone do oceny, kwantyfikacji oraz wspomagania decyzji w polityce ekoinnowacyjnej i funduszach unijnych (m.in. FEnIKS, FENG, NFOŚiGW, NCBR, programy regionalne JST).

System charakteryzuje się:
* **Ścisłym rygoryzmem naukowym (`Strict Research Mode`):** 0% danych symulowanych w trybie badawczym, brak nieuprawnionych mutacji ani domysłów.
* **Bramką Walidacji Z-4 (`Zero-Error Tolerance`):** Wykrywanie błędów schematu, duplikatów umów i regresji TRL na zbiorach do 31 301 wierszy.
* **Wielowymiarowym Indeksem EIRRI (6 Filarów & PCA):** Wyznaczanie gotowości ekoinnowacyjnej 16 województw NUTS 2.
* **Wielokryterialnym Systemem DSS w Modelu HITL (`Human-in-the-Loop`):** Deterministyczny generator rekomendacji dla programów i regionów.
* **Wieloformatowym Eksportem Wyników:** Bezpośrednia integracja z Google BigQuery (NDJSON/DDL), DuckDB, JSON-Stat v2.0, SPSS, PDF oraz Markdown.

---

## 🏗️ Architektura Systemu

```
greenstrat-workspace/
├── audit/                             ← Raporty audytu technicznego i spójności naukowej
│   ├── GREENSTRAT_audyt_techniczny.md
│   └── RAPORT_WERYFIKACJI_AUDYTU_v0.5.0.md
├── engine/
│   └── greenstrat_engine.js           ← Kanoniczny Silnik Obliczeniowy (Jedno źródło prawdy)
├── src/
│   └── gas/
│       ├── Code.gs                    ← Backend Google Apps Script Web App (doPost)
│       └── index.html                 ← Jednoplikowy Interfejs Użytkownika (Vanilla JS, Tailwind, ApexCharts)
├── data/
│   └── external_benchmarks_snapshot.json ← Empiryczny Snapshot GUS BDL, Eurostat NUTS 2 & UPRP (2021-2024)
├── tools/
│   ├── sync_engine.js                 ← Synchronizacja silnika (npm run sync)
│   ├── import_external_datasets.js    ← Importer ETL baz zewnętrznych
│   └── export_formats.js              ← Wieloformatowy silnik eksportu
├── docs/
│   ├── INSTRUKCJA_OBSLUGI_GREENSTRAT.md ← Kompletna Instrukcja Obsługi Systemu dla Użytkownika
│   └── BACKLOG_FAZY_B.md              ← Specyfikacja wymagań Fazy B
├── test/
│   ├── run_tests.js                   ← Automatyczny harness testowy (npm test)
│   └── fixtures_kontrolne.json        ← Niewzruszona Wyrocznia Testowa
├── GREENSTRAT_PROJECT_CONTEXT.md      ← Pełny kontekst architektoniczny projektu
├── CHANGELOG.md                       ← Chronologiczny rejestr wydań i poprawek
└── README_WORKSPACE.md                ← Przewodnik po montażu workspace w Antigravity
```

---

## ⚡ Szybki Start & Praca z Kodem

### 1. Wymagania wstępne
* Node.js v18+ (LTS)

### 2. Instalacja zależności
```bash
npm install
```

### 3. Uruchomienie testów automatycznych
```bash
npm test
```

### 4. Synchronizacja silnika analitycznego z backendem i frontendem
```bash
npm run sync
```

---

## 📘 Podręcznik Użytkownika & Instrukcja Obsługi

Szczegółowy opis działania interfejsu, podmenu wszystkich zadań, bezpieczników analitycznych oraz kodów błędów walidatora znajduje się w pliku:  
👉 **[docs/INSTRUKCJA_OBSLUGI_GREENSTRAT.md](docs/INSTRUKCJA_OBSLUGI_GREENSTRAT.md)**

---

## 🛡️ Bezpieczniki Analityczne i Reżim HITL

System posiada 4 wbudowane bezpieczniki w czasie rzeczywistym:
1. **🛡️ Bezpiecznik Niskiej Bazy:** Powstrzymuje skalowanie przy braku dywersyfikacji ($>30\%$ udziału 1 projektu).
2. **🛡️ Niepewność Wag (PCA):** Wykrywa rozrzut wariantów ważenia ($>15$ pkt) i uruchamia wariant fallback.
3. **👤 Reżim Human-in-the-Loop (HITL):** Rekomendacje generowane są w statusie `AUTOMATYCZNA` i wymagają zatwierdzenia przez człowieka.
4. **🔍 Bramka Walidacji Z-4:** Gwarantuje 100% spójności danych przy pomocy 32-bitowego hasza integralności FNV-1a.
