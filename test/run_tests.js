const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const engine = require('../engine/greenstrat_engine.js');

function run() {
  console.log("==================================================");
  console.log("  GREENSTRAT Test Harness — Weryfikacja Z-5 (Stemplowanie & Faza A)");
  console.log("==================================================\n");

  const rootDir = path.resolve(__dirname, '..');
  const fixturesPath = path.join(rootDir, 'test', 'fixtures_kontrolne.json');
  
  if (!fs.existsSync(fixturesPath)) {
    console.error(`[ERROR] Nie znaleziono pliku wyroczni: ${fixturesPath}`);
    process.exit(1);
  }

  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  console.log(`[INFO] Wczytano wyrocznię: fixtures_kontrolne.json (Wersja: ${fixtures.wersja})\n`);

  let hasError = false;

  console.log("--- WALIDACJA SKŁADNI JAVASCRIPT KLIENTA (src/gas/index.html) ---");
  const indexHtmlPath = path.join(rootDir, 'src', 'gas', 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(`[FAIL] Brak pliku index.html pod ścieżką: ${indexHtmlPath}`);
    hasError = true;
  } else {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let blockIndex = 0;
    let htmlSyntaxOk = true;

    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      blockIndex++;
      const fullTag = match[0];
      const code = match[1];

      if (fullTag.includes('src=')) continue;

      try {
        new Function(code);
      } catch (err) {
        console.error(`  [FAIL] Błąd składni w index.html (Blok <script> #${blockIndex}): ${err.message}`);
        htmlSyntaxOk = false;
        hasError = true;
      }
    }

    if (htmlSyntaxOk) {
      console.log(`  [OK] Parsowanie JavaScript w index.html (${blockIndex} bloków <script>): SKŁADNIA POPRAWNA [PASS]`);
    }
  }

  console.log("\n--- TESTY JEDNOSTKOWE SILNIKA (8 REKORDÓW SYNTETYCZNYCH Z-2) ---");
  const syntheticRecords = [
    {
      id: 1,
      name: 'Komplet ocen dodatnich (1, 1, 1, 1)',
      record: { INNOWACYJNOSC: 1, TRWALOSC_LCA: 1, EFEKTYWNOSC_ZASOBOWA: 1, TRANSFORMACYJNOSC: 1 },
      expComplete: true,
      expEco: true
    },
    {
      id: 2,
      name: 'Komplet ocen zerowych (0, 0, 0, 0)',
      record: { INNOWACYJNOSC: 0, TRWALOSC_LCA: 0, EFEKTYWNOSC_ZASOBOWA: 0, TRANSFORMACYJNOSC: 0 },
      expComplete: true,
      expEco: false
    },
    {
      id: 3,
      name: 'Brak jednej oceny (1, null, 1, 1)',
      record: { INNOWACYJNOSC: 1, TRWALOSC_LCA: null, EFEKTYWNOSC_ZASOBOWA: 1, TRANSFORMACYJNOSC: 1 },
      expComplete: false,
      expEco: false
    },
    {
      id: 4,
      name: 'Brak wszystkich ocen (null, null, null, null)',
      record: { INNOWACYJNOSC: null, TRWALOSC_LCA: null, EFEKTYWNOSC_ZASOBOWA: null, TRANSFORMACYJNOSC: null },
      expComplete: false,
      expEco: false
    },
    {
      id: 5,
      name: 'Mieszane oceny dodatnie i zero (1, 0, 1, 1)',
      record: { INNOWACYJNOSC: 1, TRWALOSC_LCA: 0, EFEKTYWNOSC_ZASOBOWA: 1, TRANSFORMACYJNOSC: 1 },
      expComplete: true,
      expEco: false
    },
    {
      id: 6,
      name: 'GEMINI_CATEGORY = 1, ale brak ocen',
      record: { GEMINI_CATEGORY: 1, CZY_EKOINNOWACJA: 1 },
      expComplete: false,
      expEco: false
    },
    {
      id: 7,
      name: 'Jedna ocena = -99 (kod braku danych)',
      record: { INNOWACYJNOSC: 1, TRWALOSC_LCA: -99, EFEKTYWNOSC_ZASOBOWA: 1, TRANSFORMACYJNOSC: 1 },
      expComplete: false,
      expEco: false
    },
    {
      id: 8,
      name: 'Jedna ocena = "" (pusty string)',
      record: { INNOWACYJNOSC: 1, TRWALOSC_LCA: "", EFEKTYWNOSC_ZASOBOWA: 1, TRANSFORMACYJNOSC: 1 },
      expComplete: false,
      expEco: false
    }
  ];

  for (const test of syntheticRecords) {
    const actComplete = engine.isProjectComplete(test.record);
    const actEco = engine.isProjectEco(test.record);

    if (actComplete === test.expComplete && actEco === test.expEco) {
      console.log(`  [OK] Test #${test.id} (${test.name}): isComplete=${actComplete}, isEco=${actEco}`);
    } else {
      console.error(`  [FAIL] Test #${test.id} (${test.name}): Oczekiwano isComplete=${test.expComplete}, isEco=${test.expEco}; Otrzymano isComplete=${actComplete}, isEco=${actEco}`);
      hasError = true;
    }
  }

  console.log("\n--- WERYFIKACJA LICZBY WIERSZY DANYCH WEJŚCIOWYCH ---");
  const datasetsToTest = [
    { name: 'proba_1000', file: 'GREENSTRAT_test_proba_1000.xlsx', expectedRows: fixtures.zestawy['GREENSTRAT_test_proba_1000.xlsx'].wiersze },
    { name: 'proba_5000', file: 'GREENSTRAT_test_proba_5000.xlsx', expectedRows: fixtures.zestawy['GREENSTRAT_test_proba_5000.xlsx'].wiersze },
    { name: 'czesc_1', file: 'GREENSTRAT_test_czesc_1.xlsx', expectedRows: fixtures.zestawy['GREENSTRAT_test_czesc_1.xlsx'].wiersze },
    { name: 'pelna', file: 'GREENSTRAT_test_pelna_baza_31301.xlsx', expectedRows: fixtures.zestawy['GREENSTRAT_test_pelna_baza_31301.xlsx'].wiersze },
    { name: 'walidacja_negatywna', file: 'GREENSTRAT_test_walidacja_negatywna_1000.xlsx', expectedRows: 1000 }
  ];

  const loadedRowsMap = {};

  for (const ds of datasetsToTest) {
    const filePath = path.join(rootDir, 'test-data', ds.file);
    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] Brak pliku: ${ds.file}`);
      hasError = true;
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet);
    const actualCount = rows.length;

    loadedRowsMap[ds.file] = rows;

    if (actualCount === ds.expectedRows) {
      console.log(`[OK] ${ds.name} (${ds.file}): ${actualCount} wierszy (oczekiwano: ${ds.expectedRows})`);
    } else {
      console.error(`[FAIL] ${ds.name} (${ds.file}): ${actualCount} wierszy (oczekiwano: ${ds.expectedRows})`);
      hasError = true;
    }
  }

  console.log("\n--- TESTY BRAMKI WALIDACYJNEJ 2.0 (Z-4) ---");
  const negRows = loadedRowsMap['GREENSTRAT_test_walidacja_negatywna_1000.xlsx'];
  const negRes = engine.validateProjects(negRows);
  const rep = negRes.report;

  const expBledy = fixtures.manifest_negatywny.bledy;

  console.log(`  > Wynik walidacji negatywnej (1000 wierszy): przyjęte=${rep.validCount}, odrzucone=${rep.rejectedCount}`);

  const expectedRejected = 120;
  const expectedValid = 880;

  if (rep.rejectedCount === expectedRejected && rep.validCount === expectedValid) {
    console.log(`  [OK] Asercja sumaryczna: odrzucone = ${rep.rejectedCount} (oczekiwano: ${expectedRejected}), przyjęte = ${rep.validCount} (oczekiwano: ${expectedValid})`);
  } else {
    console.error(`  [FAIL] Asercja sumaryczna: odrzucone = ${rep.rejectedCount} (oczekiwano: ${expectedRejected}), przyjęte = ${rep.validCount} (oczekiwano: ${expectedValid})`);
    hasError = true;
  }

  for (const code of ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']) {
    const act = rep.byCode[code];
    const exp = expBledy[code].wierszy;
    if (act === exp) {
      console.log(`  [OK] Kod ${code} (${expBledy[code].opis}): ${act} odrzuceń (oczekiwano: ${exp})`);
    } else {
      console.error(`  [FAIL] Kod ${code} (${expBledy[code].opis}): ${act} odrzuceń (oczekiwano: ${exp})`);
      hasError = true;
    }
  }

  console.log("\n--- TESTY STEMPLOWANIA I HASHO WANIA FNV-1a (Z-5) ---");
  const sampleData = loadedRowsMap['GREENSTRAT_test_proba_1000.xlsx'];
  
  // 1. Test determinizmu (dwa wywołania na tych samych danych)
  const hash1 = engine.calculateDatasetHash(sampleData);
  const hash2 = engine.calculateDatasetHash(sampleData);
  if (hash1 === hash2 && hash1 !== "00000000") {
    console.log(`  [OK] Test determinizmu: Dwa wywołania wygenerowały identyczny hash FNV-1a (${hash1})`);
  } else {
    console.error(`  [FAIL] Test determinizmu: Hashe różnią się! (${hash1} vs ${hash2})`);
    hasError = true;
  }

  // 2. Test czułości (modyfikacja jednego pola rekordu)
  const sampleDataModified = JSON.parse(JSON.stringify(sampleData));
  sampleDataModified[0].WART_PROJ_PLN = Number(sampleDataModified[0].WART_PROJ_PLN) + 1;
  const hashModified = engine.calculateDatasetHash(sampleDataModified);

  if (hash1 !== hashModified) {
    console.log(`  [OK] Test czułości: Modyfikacja 1 wiersza zmieniła hash (${hash1} -> ${hashModified})`);
  } else {
    console.error(`  [FAIL] Test czułości: Modyfikacja wiersza nie zmieniła hasha!`);
    hasError = true;
  }

  // 3. Test metadanych w wynikach silnika
  const resTask4 = engine.calculateTask4(sampleData);
  const resTask8 = engine.calculateTask8(sampleData);

  if (resTask4.metadata && resTask4.metadata.engineVersion === "0.5.0" && resTask4.metadata.datasetHash === hash1) {
    console.log(`  [OK] Metadane task4: ENGINE_VERSION=${resTask4.metadata.engineVersion}, hash=${resTask4.metadata.datasetHash}, rekordów=${resTask4.metadata.recordCount}`);
  } else {
    console.error(`  [FAIL] Metadane task4 niepoprawne lub brakujące!`);
    hasError = true;
  }

  if (resTask8.metadata && resTask8.metadata.engineVersion === "0.5.0" && resTask8.metadata.datasetHash === hash1) {
    console.log(`  [OK] Metadane task8: ENGINE_VERSION=${resTask8.metadata.engineVersion}, hash=${resTask8.metadata.datasetHash}, rekordów=${resTask8.metadata.recordCount}`);
  } else {
    console.error(`  [FAIL] Metadane task8 niepoprawne lub brakujące!`);
    hasError = true;
  }

  console.log("\n--- TEST NIEZMIENNICZOŚCI TRYBU (Z-3) ---");
  const task4Research = engine.calculateTask4(sampleData, { demoMode: false });
  const task4Demo = engine.calculateTask4(sampleData, { demoMode: true });

  const t4R = JSON.parse(JSON.stringify(task4Research));
  const t4D = JSON.parse(JSON.stringify(task4Demo));
  if (t4R.metadata) delete t4R.metadata.timestamp;
  if (t4D.metadata) delete t4D.metadata.timestamp;

  const isTask4Identical = JSON.stringify(t4R) === JSON.stringify(t4D);
  if (isTask4Identical) {
    console.log("  [OK] task4(proba_1000, badawczy) === task4(proba_1000, demo) w 100% (całkowita niezmienniczość).");
  } else {
    console.error("  [FAIL] task4 różni się między trybami badawczym a DEMO!");
    hasError = true;
  }

  console.log("\n--- STRUKTURALNE TESTY EKSPORTU (Z-3) ---");
  const researchExport = engine.exportScientificDataset(sampleData, { demoMode: false });
  const demoExport = engine.exportScientificDataset(sampleData, { demoMode: true });

  let researchStructuralOk = true;
  for (const row of researchExport) {
    if (row.benchmarks !== null || row.patents !== 0 || row.snaEdges.length !== 0 || row.ROK !== null) {
      researchStructuralOk = false;
      break;
    }
  }

  if (researchStructuralOk) {
    console.log("  [OK] Eksport w trybie badawczym: benchmarks===null, patents===0, snaEdges===[], ROK===null (Asercja strukturalna OK).");
  } else {
    console.error("  [FAIL] Eksport w trybie badawczym zawiera nieuprawnione obiekty symulowane!");
    hasError = true;
  }

  console.log("\n==================================================");
  console.log("  ZBIORCZA TABELA REGRESJI FAZY A (Z-1 DO Z-5)");
  console.log("==================================================");

  const regressionSummaryTable = [];

  for (const [filename, oracle] of Object.entries(fixtures.zestawy)) {
    const rows = loadedRowsMap[filename];
    if (!rows) continue;

    let actualEcoN = 0;
    for (const r of rows) {
      if (engine.isProjectEco(r)) actualEcoN++;
    }

    const t4 = engine.calculateTask4(rows);
    const eirsiList = t4.eirsi || {};

    let maxRegion = null, maxVal = -Infinity;
    let minRegion = null, minVal = Infinity;

    for (const [region, val] of Object.entries(eirsiList)) {
      if (val > maxVal) { maxVal = val; maxRegion = region; }
      if (val < minVal) { minVal = val; minRegion = region; }
    }

    const valRes = engine.validateProjects(rows);

    regressionSummaryTable.push({
      Plik: filename,
      Wiersze: rows.length,
      'Przyjęte Z-4': valRes.report.validCount,
      'Odrzucone Z-4': valRes.report.rejectedCount,
      'eco_n': actualEcoN,
      'EIFII (%)': t4.eifii.toFixed(2),
      'ISBI (%)': t4.isbi.toFixed(2),
      'CRI (%)': t4.cri.toFixed(2),
      'EIRSI Max': `${maxRegion}: ${maxVal.toFixed(3)}`,
      'EIRSI Min': `${minRegion}: ${minVal.toFixed(3)}`,
      Niekompletne: t4.rekordy_niekompletne,
      Hash: t4.metadata.datasetHash
    });
  }

  console.table(regressionSummaryTable);

  console.log("\n==================================================");
  if (hasError) {
    console.error("  WYNIK: TESTY Z-5 ZAKOŃCZONE BŁĘDEM [FAIL]");
    console.log("==================================================");
    process.exit(1);
  } else {
    console.log("  WYNIK: TESTY Z-5 ZAKOŃCZONE SUKCESEM [PASS]");
    console.log("==================================================");
    process.exit(0);
  }
}

run();
