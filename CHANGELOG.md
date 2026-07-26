# CHANGELOG — GREENSTRAT

Wszystkie znaczące zmiany w tym projekcie będą dokumentowane w tym pliku.

## [0.1.0] - 2026-07-26
### Dodano
- Inicjalizacja workspace `greenstrat-workspace`.
- Utworzenie pliku `package.json` ze skryptem `test` i zależnością `xlsx`.
- Utworzenie skryptu testowego `test/run_tests.js` do weryfikacji liczby wierszy w plikach testowych Excel (`test-data/*.xlsx`).
- Z-0 — Inicjalizacja workspace i szkielet testów (DoD: weryfikacja wierszy OK, status asercji PENDING).

### Usunięto / Skorygowano
- Usunięto plik `npm.cmd` z korzenia workspace (skorygowano środowisko zgodnie z zaleceniem — rezygnacja z wrappera na rzecz systemowego `npm`).
- Przywrócono standardową instrukcję uruchamiania testów przez `npm test`.
- Z-1 — Jedno źródło prawdy obliczeń (Luka L.15): utworzenie `engine/greenstrat_engine.js`, narzędzia `tools/sync_engine.js` (`npm run sync`) oraz pełnych asercji testowych w `test/run_tests.js`. Ujednolicenie zmieniło zachowanie frontendu dla rekordów niekompletnych (przyjęto logikę serwerową jako kanoniczną); pełna naprawa obu mechanizmów klasyfikacji braków — w Z-2. Z-1 zakończony sukcesem [PASS].
- Z-2 — Braki danych nie są ekoinnowacją (Naprawa luki L.16): usunięto defaulty `: 1` oraz ścieżkę zapasową `GEMINI_CATEGORY ∈ {1,2} → eco` w całym repozytorium. Rekord bez kompletu czterech zdefiniowanych ocen operacyjnych jest klasyfikowany jako niekompletny (`isProjectComplete = false`) i nie jest ekoinnowacją. CZY_EKOINNOWACJA przestaje być podstawą klasyfikacji; pozostaje polem deklaratywnym kontrolowanym przez bramkę spójności (rozbudowa w Z-4). Klasyfikuje wyłącznie komplet czterech ocen operacyjnych. Dodano liczniki `rekordy_niekompletne` oraz 8 syntetycznych testów jednostkowych w `test/run_tests.js`. Z-2 zakończony sukcesem [PASS].
- Z-3 — Separacja trybu DEMO od trybu badawczego (Decyzja D.12): wprowadzono flagę `TRYB_DEMO` / `demoMode` (domyślnie `false` - tryb badawczy). W trybie badawczym usunięto wszystkie generowane wartości symulowane, benchmarki (EU27=76.5, V4=64.2, OECD=71.8, ris3Alignment=82) oraz sztuczne punkty czasowe. W trybie DEMO wartości symulowane noszą etykiety `"[DEMO / SYMULACJA]"`. Dodano automatyczne testy eksportu naukowego w `test/run_tests.js`. Z-3 zakończony sukcesem [PASS].


