# PROMPT MISJI — FAZA A (do wklejenia w nowej rozmowie agenta w Antigravity)

MISJA: FAZA A — PEŁNA SEKWENCJA Z-0 → Z-5

Kontekst obowiązkowy (przeczytaj w tej kolejności, zanim cokolwiek zrobisz):
1. AGENTS.md — konstytucja projektu, nadrzędna wobec tej misji.
2. docs/BACKLOG_AGENTA.md — definicje zadań Z-0…Z-5 z kryteriami ukończenia (DoD).
3. test/fixtures_kontrolne.json — wyrocznia; nienaruszalna.

Uwaga porządkowa: ta misja świadomie nadpisuje zasadę „jedna misja = jedno zadanie"
z backlogu — wykonujesz całą sekwencję Z-0…Z-5 w tej jednej rozmowie, zachowując
bramki opisane niżej. Wszystkie pozostałe reguły backlogu i AGENTS.md obowiązują.

CEL: doprowadzić projekt do stanu, w którym wszystkie DoD zadań Z-0…Z-5 są spełnione,
`npm test` jest w całości zielony, a komplet artefaktów istnieje.

PĘTLA WYKONANIA — dla każdego zadania Z-n, ściśle po kolei:
1. Artefakt „Plan Z-n": kroki, pełna lista plików do utworzenia/zmiany, założenia, pytania.
2. [BRAMKA] Zatrzymaj się. Czekaj na moje słowo: AKCEPT. Bez niego nie piszesz kodu.
3. Implementacja wyłącznie w zakresie Z-n (chirurgia — zasada 3 konstytucji).
4. `npm test` — iteruj do zielonego. Czerwony wynik naprawiasz w kodzie,
   nigdy w fixtures ani w test-data.
5. Uruchom workflow /weryfikacja.
6. Artefakt „Walkthrough Z-n": lista zmienionych plików, pełny wklejony output testów,
   instrukcja weryfikacji ręcznej dla człowieka.
7. Wpis do CHANGELOG.md.
8. [BRAMKA] Czekaj na moje słowo: DALEJ. Dopiero wtedy zaczynasz kolejne zadanie.

TWARDE WARUNKI ZATRZYMANIA (STOP-AND-ASK — przerwij natychmiast i zadaj pytanie):
- test przechodzi tylko pod warunkiem zmiany fixtures lub plików test-data;
- realizacja zdaje się wymagać zmiany formuły wskaźnika, schematu danych ponad opis
  w backlogu, albo plików spoza zakresu zadania;
- istnieją dwie sprzeczne interpretacje wymagania;
- jakikolwiek krok prowadziłby do `clasp push` / `clasp deploy` / wdrożenia —
  wdrożenia są poza tą misją i zawsze wymagają osobnej zgody.

ZAKRES WYKLUCZONY: Faza B (realne moduły zadań 11/14), wdrożenia na serwer,
refaktory „przy okazji", zmiany w calculateTask11/14 poza tym, czego wprost wymaga Z-3.

NA KONIEC MISJI — artefakt „RAPORT FAZY A":
- tabela Z-0…Z-5: status, kluczowe pliki, spełnienie DoD (punkt po punkcie);
- końcowy pełny output `npm test` oraz /weryfikacja;
- lista pytań otwartych i rekomendacji do Fazy B.

Zacznij teraz od artefaktu „Plan Z-0".
