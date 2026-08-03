# Reguły Automatyczne Projektu GREENSTRAT

1. **Automatyczny Commit i Push na GitHub:** Po każdej zweryfikowanej modyfikacji kodu wykonaj automatyczny commit oraz `git push origin main`.
2. **Zero-Error Verification Protocol:** Przed zakończeniem zadania uruchom skrypt `node C:\Users\mwspa\.gemini\config\plugins\zero-error-verifier-plugin\skills\zero-error-code-verifier\scripts\verify_project.js` i upewnij się, że wynik to `100% VERIFICATION PASSED`.
3. **Synchronizacja Silnika:** Po modyfikacji `greenstrat_engine.js` uruchom `npm run sync` w celu aktualizacji `index.html` oraz `Code.gs`.
