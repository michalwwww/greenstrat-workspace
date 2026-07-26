# /weryfikacja — pełna weryfikacja regresyjna projektu

Kroki (wykonaj wszystkie, po kolei, bez pomijania):
1. Uruchom `npm test` z korzenia workspace i zachowaj PEŁNY output.
2. Porównaj wyniki z `test/fixtures_kontrolne.json` (tolerancje z pliku).
3. Sprawdź, czy diff bieżącej pracy nie dotyka: `test/fixtures_kontrolne.json`, `test-data/*`,
   sekcji formuł wskaźników poza zakresem bieżącego zadania.
4. Wygeneruj artefakt "Raport weryfikacji": tabela zestaw → wynik (OK/BŁĄD, wartość vs oczekiwana),
   status plików nienaruszalnych, wklejony output testów.
5. Jeżeli COKOLWIEK czerwone: zatrzymaj się, nie poprawiaj fixtures, nie wdrażaj — opisz rozbieżność
   i zadaj pytanie człowiekowi.
