# 🏛️ GREENSTRAT Cloud Engine v0.5.0
## Pełna Księga Błędów, Problemów Projektowych i Baza Wiedzy (34 Pozycje)

Dokument stanowi kompletny, kanoniczny rejestr 34 zidentyfikowanych i trwale rozwiązanych błędów, usterek składniowych, nieścisłości metodologicznych oraz wyzwań architektonicznych napotkanych podczas prac nad aplikacją **GREENSTRAT Cloud Engine v0.5.0**.

---

### I. 🚪 Bramka Walidacyjna & Ingestia Surowych Danych MFiPR (Zadanie 4 / Gatekeeper Z-4)

#### 1. Błąd Zerowych Wartości dla Województw z Łącznikiem (`KUJAWSKO-POMORSKIE`, `WARMIŃSKO-MAZURSKIE`)
- **Kategoria:** Parsowanie Danych Surowych MFiPR
- **Objaw:** W surowych danych sprawozdawczych MFiPR (31 302 wiersze) dwa województwa miały wyliczoną wartość **0** projektów.
- **Przyczyna:** Wyrażenie regularne `locationStr.match(/WOJ\.:\s*([A-ZŚĆŹŻÓŁĘĄŃa-zśćźżółęąń]+)/)` w funkcji `extractVoivodeship` nie zawierało znaku myślnika `-`. W efekcie `WOJ.: KUJAWSKO-POMORSKIE` obcinano do `"KUJAWSKO"`, co powodowało odrzucenie nazwy przez słownik NUTS 2.
- **Rozwiązanie:** Zastąpiono regex funkcją `normalizeVoivodeship()`, która usuwa myślniki, dwukropki, prefiksy `RZO: WOJ.` oraz dopiski gminno-powiatowe.

#### 2. Pomijanie Wiersza Nagłówkowego przy Tytułach Sprawozdań (Metadata Offset)
- **Kategoria:** Ingestia Plików Excel
- **Objaw:** Wczytanie pliku rządowego powodowało przypisanie nazw kolumn jako danych wiersza 1 (`Nazwa projektu / Project name`).
- **Przyczyna:** Pliki sprawozdawcze z Funduszy Europejskich mają w 1. wierszu tytuł zestawienia, a właściwy nagłówek w wierszu 2.
- **Rozwiązanie:** Wdrożono detekcję `hasHeaderInRow1` i automatyczną promocję nagłówków z 1. lub 2. wiersza arkusza.

#### 3. Nieobsługiwanie Spacji Niełamliwych (`\u00A0` / `\u00a0`) w Nazwach Kolumn
- **Kategoria:** Normalizacja Ciągów Znaków
- **Objaw:** Kolumna `"Miejsce\u00A0realizacji\u00A0projektu"` z pliku XLSX była traktowana jako nieistniejąca.
- **Przyczyna:** Zastosowanie spacji niełamliwej Unicode `\u00A0` zamiast standardowej spacji `\u0020`.
- **Rozwiązanie:** Wdrożono dynamiczne wyszukiwanie kluczy przez `.toLowerCase().includes('miejsce') && .includes('realizacji')`.

#### 4. Błąd E1 – Pusta nazwa ID_PROJ / Numeru Umowy
- **Kategoria:** Integralność Kluczy Bazy
- **Objaw:** Brak numeru umowy w surowych zestawieniach wywracał relacje w bazie danych.
- **Rozwiązanie:** Automatyczna generacja unikalnych identyfikatorów syntetycznych `RAW-{index+1}` z zachowaniem hash-trace'u.

#### 5. Błąd E2 – Synonimy i Oboczności Nazw Programów
- **Kategoria:** Mapowanie Dziedzinowe
- **Objaw:** Surowe nazwy sprawozdawcze (np. *"Program Fundusze Europejskie na Infrastrukturę, Klimat, Środowisko"*) nie zgadzały się ze słownikiem.
- **Rozwiązanie:** Stworzono słownik synonimów programowych mapujący nazwy surowe na kanoniczne kody `"FEnIKS"`, `"KPO"`, `"NFOŚiGW"`.

#### 6. Błąd E3 – Zduplikowane Rekordy Aneksów Umów
- **Kategoria:** Walidacja Unikalności Rekordów
- **Objaw:** Zdublowane wpisy przy aneksach umów w zestawieniach zbiorczych zawyżały budżet.
- **Rozwiązanie:** Filtrowanie duplikatów przez rejestr `seenIds` i zliczanie odrzuceń pod kodem `E3`.

#### 7. Błąd E4 – Czyszczenie Formatów Kwot Finansowych (WART_PROJ_PLN)
- **Kategoria:** Konwersja Typów Danych
- **Objaw:** Wartości zapisane jako tekst ze spacjami nieodłamkowymi lub przecinkami powodowały błędy `NaN`.
- **Rozwiązanie:** Normalizacja znaków: `val.replace(/\s+/g, '').replace(',', '.')`.

#### 8. Błąd E5 – Logiczna Sprzeczność Poziomów TRL (`TRL_KONIEC < TRL_START`)
- **Kategoria:** Walidacja Logiki Biznesowej
- **Objaw:** Rekordy, w których poziom TRL końcowy był niższy niż początkowy (np. Start=7, Koniec=3).
- **Rozwiązanie:** Bramka walidacyjna `E5` odrzucająca sprzeczne logicznie wpisy.

---

### II. 📈 Wskaźniki, Metodologia i Statystyka (EIFII, ISBI, CRI, EIRSI, EISEI, EIRRI, EISPI)

#### 9. Błąd Wykresu Kaskadowego Luki Finansowej (Waterfall Chart)
- **Kategoria:** Algorytmiczny / UI DataLabels
- **Objaw:** Słupek "Luka finansowa" pokazywał etykietę **`272 797 mln PLN`** (100% budżetu) zamiast faktycznej delty **`50 881 mln PLN`** (`272 797 - 221 916`).
- **Przyczyna:** ApexCharts dla słupków zakresowych (`y: [start, end]`) bez własnej funkcji `dataLabels.formatter` wyświetlał górną wartość zakresu `y[1]`.
- **Rozwiązanie:** Wdrożono formater delty `val[1] - val[0]`, dodano `distributed: true` oraz kaskadowy zakres `y: [ecoMln, totalMln]`.

#### 10. Sztuczne Wartości Absorpcji przy Zerowym Budżecie (0 PLN)
- **Kategoria:** Spójność Metodologiczna
- **Objaw:** Dla lat bez projektów w próbie (np. 2021 lub 2027) system wyświetlał syntetyczny współczynnik absorpcji np. `0.914`.
- **Przyczyna:** Wzór prezentacyjny wyliczał ekstrapolowaną linię trendu bez weryfikacji czy próba posiada budżet.
- **Rozwiązanie:** Wdrożono warunek: `t.funding > 0 ? wyliczenie : 'b.d.'`. Dla lat bez alokacji wskaźnik ma stan **`b.d.`** (*brak danych w próbie*).

#### 11. Zdublowane 100% w Benchmarku Międzynarodowym EISPI
- **Kategoria:** Przeskalowanie Indeksów
- **Objaw:** Wynik Polski i Unii Europejskiej wynosił 100.0/100, znosząc różnicę dystansu rozwojowego.
- **Rozwiązanie:** Ustalono stałą bazę UE-27 = **100.0** (na podstawie *European Innovation Scoreboard 2024*), a polski wynik przeskalowano do **72.4** (dystans **-27.6 pkt**).

#### 12. Dzielenie przez Zero w Indeksie Zbalansowania ISBI
- **Kategoria:** Bezpieczeństwo Obliczeń Statystycznych
- **Objaw:** Wywrócenie obliczeń wskaźnika ISBI, gdy w fazie badań (TRL 1-2) brakowało alokacji finansowej.
- **Rozwiązanie:** Dodano zabezpieczenie dzielnika epsilonem `Math.max(1, sumStage1)`.

#### 13. Zniekształcenie Średnich przez Dominującego Beneficjenta (Dominant Share)
- **Kategoria:** Odporność Statystyczna na Outliery
- **Objaw:** Jeden gigantyczny projekt (np. 500 mln PLN) sztucznie zawyżał wskaźnik całego województwa.
- **Rozwiązanie:** Dodano bezpiecznik dominacji pojedynczego wpisu (>25% budżetu), aktywujący ostrzeżenie ŻÓŁTE/CZERWONE.

---

### III. 📥 Eksporty, Pliki i Obrazy

#### 14. Hardcoded Eksport XLS dla Podbaz w Zadaniu 11
- **Kategoria:** Routing Eksportów / UI
- **Objaw:** Niezależnie od wybranej podbazy (Baza 1–6), kliknięcie `📊 XLS` pobierało zawsze plik Bazy 5 (`GREENSTRAT_EIRRI_Wojewodztwa.xls`).
- **Przyczyna:** Przycisk miał sztywno zakodowaną wartość `downloadModuleXls('baza5')`.
- **Rozwiązanie:** Podpięto przycisk pod zmienną `currentSubDb` i dodano strukturę generowania plików dla baz 1, 2, 3, 4, 5 i 6.

#### 15. Błąd Eksportu Obrazów PNG (`SecurityError: Tainted Canvas`)
- **Kategoria:** Bezpieczeństwo Przeglądarki / CORS
- **Objaw:** Kliknięcie `📷 PNG` przy wykresie wywoływało błąd `Tainted canvases may not be exported`.
- **Przyczyna:** Reguły `@import` zewnętrznych czcionek Google Fonts w kodzie SVG skazywały płótno HTML `<canvas>`.
- **Rozwiązanie:** Wykorzystano silnik `html2canvas` z automatyczną sanitacją kodów SVG i usuwaniem reguł `@import`.

#### 16. Błąd Zablokowanych Okien Podręcznych (Popup Blocker)
- **Kategoria:** Obsługa Wyjątków DOM
- **Objaw:** Blokada wyskakujących okienek w przeglądarce uniemożliwiała generowanie raportu PDF (`TypeError: Cannot read properties of null`).
- **Rozwiązanie:** Wdrożono sprawdzanie `if (!printWindow) { alert("Zablokowano okienko..."); return; }`.

#### 17. Wycieki Pamięci Browsera przy Pobieraniu Plików (`URL.createObjectURL`)
- **Kategoria:** Zarządzanie Pamięcią RAM
- **Objaw:** Narastające zużycie pamięci RAM przy wielokrotnym eksportowaniu plików.
- **Rozwiązanie:** Dodano czyszczenie pamięci po pobraniu: `setTimeout(() => URL.revokeObjectURL(url), 1000)`.

#### 18. Wyświetlanie "Krzaczków" Zamiast Polskich Znaków w MS Excel
- **Kategoria:** Kodowanie Znaków
- **Objaw:** Polskie znaki (ą, ę, ś, ć, ż, ź) ulegały uszkodzeniu po otwarciu pliku CSV/XLS w polskiej wersji programu MS Excel.
- **Rozwiązanie:** Dodano nagłówek `\uFEFF` (Byte Order Mark UTF-8) na początku każdego pliku.

#### 19. Błąd Pobierania Krawędzi Sieci SNA dla Gephi (`downloadSnaEdgesCsv`)
- **Kategoria:** Bezpieczeństwo Struktur Danych
- **Objaw:** Wywołanie pobierania przed załadowaniem danych wywoływało błąd `TypeError: Cannot read properties of undefined (reading 'links')`.
- **Rozwiązanie:** Dodano sprawdzenie istnienia obiektu `backendCalculatedData.task14.network`.

---

### IV. 💻 Składnia, Architektura i Kod

#### 20. Niedomykający się Blok `setTimeout` w Funkcji `handleFile`
- **Kategoria:** Składnia JavaScript
- **Objaw:** Weryfikator składni wyrzucał błąd `missing ) after argument list` przy linijce 7386.
- **Przyczyna:** Brakujące domknięcie `}, 10);` przed blokiem `catch` w pliku `index.html`.
- **Rozwiązanie:** Uzupełniono domknięcie `}, 10);` i utworzono skrypt `verify_project.js`.

#### 21. Rozsynchronizowanie Kodu Silnika (`greenstrat_engine.js` vs `index.html` vs `Code.gs`)
- **Kategoria:** Pipeline Budowania i Synchronizacji
- **Objaw:** Zmiany w silniku wyliczeniowym nie trafiały automatycznie do wersji webowej i Google Apps Script.
- **Rozwiązanie:** Stworzono skrypt synchronizacyjny `tools/sync_engine.js` uruchamiany przez `npm run sync`.

#### 22. Przekroczenie Limitów Google Apps Script (GAS 50MB Limit)
- **Kategoria:** Wydajność API Chmurowego
- **Objaw:** Przesyłanie 31 000 wierszy przez `google.script.run` zawieszało przeglądarkę.
- **Rozwiązanie:** Przeniesienie walidacji i filtrowania na stronę klienta (Client-Side Engine).

#### 23. Niezgodność Sumy Kontrolnej FNV-1a Pomiędzy Node.js a Przeglądarką
- **Kategoria:** Determinizm Algorytmiczny
- **Objaw:** Te same dane wejściowe dawały inny hash w środowisku Node.js i w przeglądarce.
- **Rozwiązanie:** Unifikacja znaku końca linii (`\n`) i bajtów UTF-8 w funkcji `calculateDatasetHash()`.

---

### V. 🤖 Klasyfikacja i Sztuczna Inteligencja (Gemini AI & Daisy)

#### 24. Fałszywie Dodatnie Klasyfikacje Ekoinnowacji w Heurystyce
- **Kategoria:** Klasyfikacja Natural Language Processing
- **Objaw:** Projekt zawierający słowo "las" lub "drzewo" był kwalifikowany jako przełomowa ekoinnowacja TRL 9.
- **Rozwiązanie:** Dwustopniowa heurystyka: słowa kluczowe DeepTech (OZE, wodór, smart grid) $\rightarrow$ Poziom 1, termoizolacje $\rightarrow$ Poziom 2, pozostałe $\rightarrow$ Poziom 3 (nie-eko).

#### 25. Przekroczenie Limitów Kontekstu Gemini API (`Token Limit Exceeded`)
- **Kategoria:** Integracja LLM
- **Objaw:** Przesyłanie pełnego zbioru danych do bota Daisy wywoływało błąd `400 Bad Request`.
- **Rozwiązanie:** Generowanie zagęszczonego podsumowania syntetycznego `dataSummary` ze skompilowanymi wskaźnikami.

#### 26. Brak Automatycznej Kontroli Jakości w Cyklu Twórczym
- **Kategoria:** Kontrola Jakości (QA)
- **Objaw:** Ryzyko przeoczenia niewidocznych błędów składniowych lub prezentacyjnych.
- **Rozwiązanie:** Wdrożenie ogólnoekranowego skilla `zero-error-code-verifier` w lokalizacji `C:\Users\mwspa\.gemini\config\plugins\zero-error-verifier-plugin\`.

---

### VI. 🎨 Interfejs, Responsywność i Wydajność UI/UX

#### 27. Animowany Wskaźnik Postępu Ładowania Plików (%)
- **Kategoria:** UI Feedback
- **Objaw:** Podczas wczytywania dużych arkuszy Excel (31 302 wiersze) interfejs sprawiał wrażenie "zamrożonego".
- **Rozwiązanie:** Wdrożono animowany pasek stanu z procentowym wskaźnikiem postępu parsowania SheetJS.

#### 28. Nakładanie się Etykiet Osi X na Małych Ekranach (Responsive Breakpoints)
- **Kategoria:** Responsywność UI
- **Objaw:** Na laptopach i ekranach mobilnych 16 nazw województw w wykresach ApexCharts nachodziło na siebie.
- **Rozwiązanie:** Dodano automatyczną rotację etykiet osi X o `-45°` oraz dynamiczne zmniejszanie czcionki.

#### 29. Niespójność Kolorystyczna przy Przełączaniu Motywów (Dark / Light Mode)
- **Kategoria:** Design System
- **Objaw:** Przełączenie motywu aplikacji z ciemnego na jasny pozostawiało biały tekst etykiet na białym tle.
- **Rozwiązanie:** Zlinkowano siatki i etykiety wykresów z dynamicznym wskaźnikiem motywu `theme: { mode: isDark ? 'dark' : 'light' }`.

---

### VII. 🧮 Obliczenia Statystyczne i Krawędziowe Przypadki Danych (Edge-Cases)

#### 30. Weryfikacja Województw z 0 Projektami przy Małych Próbach (np. 100 Wierszy)
- **Kategoria:** Interpretacja Wyników
- **Objaw:** W małych zestawieniach testowych (np. próba 100 wierszy) małe województwa nie miały ani jednego projektu.
- **Rozwiązanie:** Dodano komunikat wyjaśniający, że wynik `0` wynika z reprezentatywności losowej próby, a nie z braku inwestycji.

#### 31. Ujemne Wartości przy Wyliczaniu Rozkładów Statystycznych (Z-8 / Produkt 11.7)
- **Kategoria:** Statystyka Opisowa
- **Objaw:** Wskaźnik IQR i progi percentylowe P10/P25 przyjmowały niekiedy wartości ujemne.
- **Rozwiązanie:** Dodano obcięcie dolne `Math.max(0, val)` zapobiegające ujemnym wartościom granicznym.

#### 32. Niedeterministyczne Sortowanie Tabeli Liderów EISEI (Zadanie 8)
- **Kategoria:** Sortowanie Deterministyczne
- **Objaw:** Przy identycznym wyniku wskaźnika EISEI dwóch programów kolejność na liście zmieniała się przy odświeżaniu.
- **Rozwiązanie:** Dodano drugi stopień sortowania po wskaźniku wiarygodności danych (`eisei_comp`).

---

### VIII. 🗄️ Eksporty Bazodanowe i Wydajność Pamięci (BigQuery, DuckDB, SNA)

#### 33. Walidacja Nazw Kolumn dla Google BigQuery i DuckDB (Z-13)
- **Kategoria:** Zgodność ze Standardami SQL
- **Objaw:** Eksport schematu GoogleSQL / DuckDB wywalał błąd w chmurze przy kolumnach z polskimi znakami.
- **Rozwiązanie:** Wdrożono funkcję `toSqlSafeColumnName()`, zamieniającą polskie znaki na odpowiedniki ASCII.

#### 34. Przekroczenie Pamięci RAM przy Sieciach Powiązań Instytucjonalnych SNA
- **Kategoria:** Złożoność Obliczeniowa Graph Mining
- **Objaw:** Dla 31 300 projektów wygenerowanie pełnej macierzy krawędzi tworzyło >100 000 połączeń, przeciążając browser.
- **Rozwiązanie:** Wdrożono algorytm przycinania krawędzi do **top 500** najsilniejszych relacji dla wizualizacji w Gephi.
