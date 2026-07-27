# 📘 INSTRUKCJA OBSŁUGI SYSTEMU GREENSTRAT CLOUD ENGINE
**Wersja:** v0.5.0  
**Status:** Produkcyjny / Badawczy  
**Repozytorium GitHub:** [https://github.com/michalwwww/greenstrat-workspace](https://github.com/michalwwww/greenstrat-workspace)  
**System Analizy Ekoinnowacji i Ewaluacji Funduszy Europejskich**

---

## 📑 Spis Treści
1. [Wstęp i Przeznaczenie Systemu](#1-wstęp-i-przeznaczenie-systemu)
2. [Szybki Start — Przewodnik Krok po Kroku](#2-szybki-start--przewodnik-krok-po-kroku)
3. [Opis Sekcji i Podmenu Zadań](#3-opis-sekcji-i-podmenu-zadań)
   - [🗂️ Ingestia & Walidacja](#-ingestia--walidacja)
   - [🌿 Zadanie 4: Specyfika Regionalna](#-zadanie-4-specyfika-regionalna)
   - [📈 Zadanie 8: Ewaluacja & Rankingi](#-zadanie-8-ewaluacja--rankingi)
   - [📊 Zadanie 11: Monitorowanie EISPI](#-zadanie-11-monitorowanie-eispi)
   - [🗺️ Zadanie 14: EKO_Lokacja & Sieci Regionalne](#-zadanie-14-eko_lokacja--sieci-regionalne)
   - [🖥️ Logi Chmurowe & Dziennik Audytowy](#️-logi-chmurowe--dziennik-audytowy)
   - [📖 Metodologia & Wskaźniki](#-metodologia--wskaźniki)
4. [Bramka Walidacji Z-4 (Kody Błędów E1–E6)](#4-bramka-walidacji-z-4-kody-błędów-e1e6)
5. [Bezpieczniki Analityczne i Reżim HITL](#5-bezpieczniki-analityczne-i-reżim-hitl)
6. [Źródła Danych Empirycznych (GUS BDL, Eurostat, UPRP, KOBiZE)](#6-źródła-danych-empirycznych-gus-bdl-eurostat-uprp-kobize)
7. [Moduł Wieloformatowego Eksportu Wyników](#7-moduł-wieloformatowego-eksportu-wyników)

---

## 1. Wstęp i Przeznaczenie Systemu

**GREENSTRAT Cloud Engine** to profesjonalne środowisko analityczno-badawcze przeznaczone do kwantyfikowania i ewaluacji ekoinnowacyjności projektów współfinansowanych z Funduszy Europejskich (m.in. FEnIKS, FENG, NFOŚiGW, NCBR, programy regionalne JST).

System łączy deterministyczne algorytmy badawcze z analizą wielokryterialną, modeli klastrowania 6D, symulacjami Monte Carlo / PCA oraz zweryfikowanymi danymi empirycznymi z baz GUS BDL, Eurostat NUTS 2, Urzędu Patentowego RP (UPRP) i KOBiZE.

---

## 2. Szybki Start — Przewodnik Krok po Kroku

Na samej górze ekranu znajduje się interaktywny **PRZEWODNIK KROK PO KROKU** (Stepper Bar). Kliknięcie dowolnego z 5 przycisków natychmiast przenosi użytkownika do właściwej sekcji:

1. **`1. Ustawienia & Źródła`** — Sprawdzenie statusu połączenia z chmurą Google Apps Script oraz wybranego źródła danych zewnętrznych.
2. **`2. Załadunek Pliku`** — Wskazanie pliku arkusza `.xlsx` lub surowego `.csv` (system obsługuje zbiory przekraczające 30 000 wierszy).
3. **`3. Bramka Walidacji`** — Uruchomienie Testu Walidacyjnego Z-4 (odrzucanie wpisów niekompletnych, błędnych TRL i zduplikowanych umów).
4. **`4. Moduły & Mapy`** — Przejście do analizy 6 filarów gotowości EIRRI, 10 warstw mapowych oraz typologii regionalnej.
5. **`5. Rekomendacje & Eksport`** — Weryfikacja rekomendacji DSS w modelu Human-In-The-Loop (HITL) oraz pobranie raportów (BigQuery, DuckDB, CSV, PDF, Markdown).

---

## 3. Opis Sekcji i Podmenu Zadań

Wszystkie zakłady w gónym przyklejonym panelu nawigacyjnym (`Sticky Non-blocking Header`) zapewniają pełny dostęp do modułów analitycznych:

### 🗂️ Ingestia & Walidacja
* **Strefa Załadunku Pliku (Dropzone):** Przeciągnij i upuść plik `.xlsx` / `.csv`.
* **Formularz Wprowadzania Ręcznego:** Pozwala dodać pojedynczy projekt do bazy.
* **Panel Filtrowania Dużych Zbiorów:** Pozwala wyselekcjonować zakres wierszy dla obszernych baz danych.
* **Raport Bramki Walidacji Z-4:** Tabela Accepted/Rejected ze szczegółowym zestawieniem kodów E1–E6.

### 🌿 Zadanie 4: Specyfika Regionalna
* **Wskaźnik Intensywności EIFII (%):** Udział nakładów ekoinnowacyjnych w budżecie ogółem.
* **Zbalansowanie Innowacji ISBI:** Zrównoważenie wymiaru technologicznego i środowiskowego.
* **Wskaźnik Dojrzałości Komercyjnej CRI (%):** Udział projektów o wyższych poziomach TRL (7–9).
* **Indeks Specjalizacji EIRSI (Location Quotient):** Określa czy dany region posiada relatywną przewagę w ekoinnowacjach (LQ $\ge$ 1.2 oznacza lidera).
* **Kafelkowa Mapa Polski & Wykres Radarowy 4 Wskaźników.**

### 📈 Zadanie 8: Ewaluacja & Rankingi
* **Wskaźnik EISEI (0–100):** Zbiorcza ocena efektywności programów wsparcia.
* **Liderboard Programów (EPI, TTEI, TRLI):** Ranking instytucji i programów operacyjnych.
* **Wykres Kaskadowy Budżetów (Waterfall Funding Gap).**
* **Krzywa Lorenza i Nierówności Parecie:** Wykres koncentracji alokacji środków.
* **Pod-tab 5: Silnik Statystyczny JASP:** Automatyczne przeliczanie testów ANOVA, regresji i testów t-Studenta.

### 📊 Zadanie 11: Monitorowanie EISPI
* **Karta Główna EISPI Index (0–100):** Ogólny indeks sprawności systemu ekoinnowacji.
* **Wykres Trendów Alokacji z Wskaźnikiem CAGR (%):** Średnioroczna stopa wzrostu.
* **Benchmark Międzynarodowy (Polska 72.4 vs UE-27 100.0 vs V4 76.5 vs OECD 85.0):** Z dedykowanym przyciskiem przełączania widoczności modułu na żywo (`⚡ Przełącz Widoczność Modułu`).
* **Pod-tab 2: Live Data Inspector z 6 Podbazami Danych:**
  1. *Innovation Capacity (GUS BDL & UPRP)* — Nakłady B+R GERD i zgłoszenia patentowe UPRP.
  2. *Eco-Innovation (Zielone Patenty Y02/Y04 & Klastry GOZ)*.
  3. *Financial Database (NFOŚiGW, FEnIKS, FENG)*.
  4. *Implementation (Status Wdrożeń Rzeczywistych)*.
  5. *Regional Database (Specjalizacja NUTS 2)*.
  6. *Environmental Impact (Emisje KOBiZE, GOZ Eurostat, OZE GUS BDL)*.

### 🗺️ Zadanie 14: EKO_Lokacja & Sieci Regionalne
* **Wskaźnik EIRRI z 6 Filarami (Env, Imp, Inn, Econ, Abs, Inst):** Gotowość ekoinnowacyjna regionu z wagami PCA (Decyzja D.2).
* **Typologia Klastrowa NUTS 2:** 4 klastry (K1 Liderzy, K2 Dojrzałe, K3 Transformacja, K4 Wymagające).
* **10 Warstw Mapowych (Produkt 14.6):** Wizualizacja wskaźników przestrzennych.
* **Katalog 17 Instrumentów EKO_Lokacji (Produkt 14.8).**
* **Katalog Rekomendacji JST (Produkt 14.9).**

### 🖥️ Logi Chmurowe & Dziennik Audytowy
* Transakcyjny podgląd historii operacji na serwerze Google Apps Script oraz w konsoli audytowej przeglądarki na żywo.

---

## 4. Bramka Walidacji Z-4 (Kody Błędów E1–E6)

Każdy wczytany rekord podlega rygorystycznemu testowi **Zero-Error Tolerance**:

| Kod Błędu | Nazwa Błędu | Opis i Przyczyna Odrzucenia |
| :---: | :--- | :--- |
| **Kod E1** | `Brak kompletu 4 ocen` | Rekord zadeklarowany jako `CZY_EKOINNOWACJA=1`, ale brakuje co najmniej jednej z 4 ocen operacyjnych > 0. |
| **Kod E2** | `Sprzeczność ekoinnowacji` | Oceny operacyjne > 0 obecne, ale `CZY_EKOINNOWACJA=0`. |
| **Kod E3** | `Zduplikowany ID_PROJ` | Więcej niż 1 rekord o tym samym numerze umowy (zapobieganie podwójnemu liczeniu budżetu). |
| **Kod E4** | `Pusta wartość PLN` | Pole `WART_PROJ_PLN` puste, ujemne lub wynoszące `0 PLN`. |
| **Kod E5** | `Błąd TRL` | Ujemny przyrost TRL (`TRL_KONIEC < TRL_START`, np. TRL 7 $\rightarrow$ 3) lub TRL spoza zakrzywienia 1–9. |
| **Kod E6** | `Błąd słownika regionów` | Nazwa województwa spoza oficjalnego słownika 16 regionów (np. "Mazowsze", "Zagranica"). |

---

## 5. Bezpieczniki Analityczne i Reżim HITL

System posiada 4 aktywne wskaźniki bezpieczników w czasie rzeczywistym:

1. **🛡️ BEZPIECZNIK NISKIEJ BAZY:**  
   Wykrywa sytuacje, gdy 1 projekt stanowi > 30% budżetu regionu lub liczba projektów w próbie < 5. Powstrzymuje automatyczne skalowanie budżetu.
2. **🛡️ NIEPEWNOŚĆ WAG (PCA):**  
   Monitoruje rozrzut wyników pomiędzy 3 wariantami ważenia (*Equal*, *PCA*, *Expert*). Przy rozrzucie > 15 pkt włącza wariant fallback.
3. **👤 REŻIM HUMAN-IN-THE-LOOP (HITL):**  
   Wszystkie rekomendacje generowane przez silnik DSS posiadają status `AUTOMATYCZNA`. Żadna decyzja budżetowa nie zostaje podjęta bez bezwzględnego zatwierdzenia przez człowieka.
4. **🔍 BRAMKA WALIDACJI Z-4:**  
   Prezentuje rzeczywistą liczbę rekordów przyjętych (np. 27 913) i odrzuconych (np. 3 388) oraz cyfrowy hash integrity FNV-1a (np. `e69d1ad3`).

---

## 6. Źródła Danych Empirycznych (GUS BDL, Eurostat, UPRP, KOBiZE)

Wszystkie statystyki referencyjne w systemie są powiązane z oficjalnymi bazami danych:
* **Urząd Patentowy RP (UPRP):** Faktyczna liczba zgłoszeń patentowych (3 361 – 3 580) oraz zielonych patentów IPC Y02/Y04 (128 – 188).
* **GUS Bank Danych Lokalnych:** Nakłady B+R GERD (37,7 mld PLN – 56,4 mld PLN), wskaźniki OZE (15,6% – 20,4%) oraz wskaźniki makroekonomiczne NUTS 2.
* **Eurostat:** Regional Innovation Scoreboard (RIS3), wskaźnik GOZ Circular Material Use Rate (10.2% – 12.1%) oraz benchmarki UE-27 / V4.
* **KOBiZE:** Emisje CO2 per capita w Polsce (8.12 t – 7.10 t).

---

## 7. Moduł Wieloformatowego Eksportu Wyników

System umożliwia eksport kompletnych wyników analiz do następujących formatów (Produkt 11.1 / Zadanie Z-13):

1. **Google BigQuery NDJSON & GoogleSQL DDL** — Do zasilania chmurowych hurtowni danych i pulpitów w **Google Looker Studio**.
2. **DuckDB SQL DDL** — Do analitycznych baz danych w pamięci RAM.
3. **JSON-Stat v2.0** — Standard wymiany danych statystycznych Eurostat/GUS.
4. **Pakiet SPSS (.csv z kodowaniem ANSI/UTF-8 BOM)** — Do zaawansowanych analiz statystycznych w pakietach IBM SPSS / JASP.
5. **Raport PDF & Markdown (.md)** — Kompletny raport naukowo-ewaluacyjny z wykresami i rekomendacjami.
