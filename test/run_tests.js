const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const engine = require('../engine/greenstrat_engine.js');

function run() {
  console.log("==================================================");
  console.log("  GREENSTRAT Test Harness — Weryfikacja Z-4 (Bramka 2.0)");
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

  console.log("--- TESTY JEDNOSTKOWE SILNIKA (8 REKORDÓW SYNTETYCZNYCH Z-2) ---");
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

  const expOracle = fixtures.manifest_negatywny.oczekiwane_po_Z4;
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

  let codesOk = true;
  for (const code of ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']) {
    const act = rep.byCode[code];
    const exp = expBledy[code].wierszy;
    if (act === exp) {
      console.log(`  [OK] Kod ${code} (${expBledy[code].opis}): ${act} odrzuceń (oczekiwano: ${exp})`);
    } else {
      console.error(`  [FAIL] Kod ${code} (${expBledy[code].opis}): ${act} odrzuceń (oczekiwano: ${exp})`);
      codesOk = false;
      hasError = true;
    }
  }

  // Weryfikacja czystych plików (0 odrzuceń)
  for (const name of ['proba_1000', 'proba_5000', 'czesc_1', 'pelna']) {
    const fn = fixtures.zestawy[datasetsToTest.find(d => d.name === name).file] ? datasetsToTest.find(d => d.name === name).file : '';
    const cleanRows = loadedRowsMap[fn];
    if (cleanRows) {
      const cRes = engine.validateProjects(cleanRows);
      if (cRes.report.rejectedCount === 0) {
        console.log(`  [OK] Plik czysty ${name}: 0 odrzuceń (100% przyjętych: ${cRes.report.validCount})`);
      } else {
        console.error(`  [FAIL] Plik czysty ${name}: odrzucono ${cRes.report.rejectedCount} wierszy!`);
        hasError = true;
      }
    }
  }

  console.log("\n--- TEST NIEZMIENNICZOŚCI TRYBU (Z-3) ---");
  const sampleProjects = loadedRowsMap['GREENSTRAT_test_proba_1000.xlsx'];
  
  const task4Research = engine.calculateTask4(sampleProjects, { demoMode: false });
  const task4Demo = engine.calculateTask4(sampleProjects, { demoMode: true });

  const isTask4Identical = JSON.stringify(task4Research) === JSON.stringify(task4Demo);
  if (isTask4Identical) {
    console.log("  [OK] task4(proba_1000, badawczy) === task4(proba_1000, demo) w 100% (całkowita niezmienniczość).");
  } else {
    console.error("  [FAIL] task4 różni się między trybami badawczym a DEMO!");
    hasError = true;
  }

  const task8Research = engine.calculateTask8(sampleProjects, { demoMode: false });
  const task8Demo = engine.calculateTask8(sampleProjects, { demoMode: true });

  let task8IndicesIdentical = true;
  for (let i = 0; i < task8Research.length; i++) {
    const r = task8Research[i];
    const d = task8Demo[i];

    console.log(`    [PROGRAM ${r.program}] EIPI: badawczy=${r.eipi.toFixed(2)}, demo=${d.eipi.toFixed(2)} | TTEI: badawczy=${r.ttei.toFixed(2)}, demo=${d.ttei.toFixed(2)} | TRLI: badawczy=${r.trli.toFixed(2)}, demo=${d.trli.toFixed(2)} | EISEI: badawczy=${r.eisei.toFixed(2)}, demo=${d.eisei.toFixed(2)}`);

    if (r.eipi !== d.eipi || r.ttei !== d.ttei || r.trli !== d.trli || r.eisei !== d.eisei) {
      task8IndicesIdentical = false;
    }
  }

  if (task8IndicesIdentical) {
    console.log("  [OK] task8: wskaźniki EIPI, TTEI, TRLI, EISEI są w 100% identyczne między trybami badawczym a DEMO.");
  } else {
    console.error("  [FAIL] task8: wskaźniki różnią się między trybami!");
    hasError = true;
  }

  console.log("\n--- STRUKTURALNE TESTY EKSPORTU (Z-3) ---");
  const researchExport = engine.exportScientificDataset(sampleProjects, { demoMode: false });
  const demoExport = engine.exportScientificDataset(sampleProjects, { demoMode: true });

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

  let demoStructuralOk = true;
  for (const row of demoExport) {
    if (!row.benchmarks || !row.benchmarks.eu27.includes("[DEMO / SYMULACJA]") || !row.benchmarks.ris3Alignment.includes("[DEMO / SYMULACJA]")) {
      demoStructuralOk = false;
      break;
    }
  }

  if (demoStructuralOk) {
    console.log("  [OK] Eksport w trybie DEMO: wszystkie pola benchmarków posiadają jawną etykietę [DEMO / SYMULACJA].");
  } else {
    console.error("  [FAIL] Eksport w trybie DEMO nie posiada wymaganych etykiet!");
    hasError = true;
  }

  console.log("\n--- ASERCJE WSKAŹNIKÓW SILNIKA (REGRESJA Z-1 / Z-2) ---");
  const tolWsk = fixtures.tolerancja_wskaznikow;
  const tolEirsi = fixtures.tolerancja_eirsi;

  for (const [filename, oracle] of Object.entries(fixtures.zestawy)) {
    console.log(`\n> Weryfikacja zestawu: ${filename}`);
    const rows = loadedRowsMap[filename];

    if (!rows) {
      console.error(`[FAIL] Brak wczytanych danych dla ${filename}`);
      hasError = true;
      continue;
    }

    let actualEcoN = 0;
    for (const r of rows) {
      if (engine.isProjectEco(r)) {
        actualEcoN++;
      }
    }

    const task4 = engine.calculateTask4(rows);
    const eirsiList = task4.eirsi || {};

    let maxRegion = null;
    let maxVal = -Infinity;
    let minRegion = null;
    let minVal = Infinity;

    for (const [region, val] of Object.entries(eirsiList)) {
      if (val > maxVal) {
        maxVal = val;
        maxRegion = region;
      }
      if (val < minVal) {
        minVal = val;
        minRegion = region;
      }
    }

    if (task4.rekordy_niekompletne === 0) {
      console.log(`  [OK] rekordy_niekompletne = 0 (dane produkcyjne kompletne)`);
    } else {
      console.error(`  [FAIL] rekordy_niekompletne = ${task4.rekordy_niekompletne} (oczekiwano: 0)`);
      hasError = true;
    }

    if (actualEcoN === oracle.eco_n) {
      console.log(`  [OK] eco_n = ${actualEcoN} (oczekiwano: ${oracle.eco_n})`);
    } else {
      console.error(`  [FAIL] eco_n = ${actualEcoN} (oczekiwano: ${oracle.eco_n})`);
      hasError = true;
    }

    const diffEifii = Math.abs(task4.eifii - oracle.eifii);
    if (diffEifii <= tolWsk) {
      console.log(`  [OK] EIFII = ${task4.eifii.toFixed(2)} (oczekiwano: ${oracle.eifii}, różnica: ${diffEifii.toFixed(4)} <= ${tolWsk})`);
    } else {
      console.error(`  [FAIL] EIFII = ${task4.eifii.toFixed(2)} (oczekiwano: ${oracle.eifii}, różnica: ${diffEifii.toFixed(4)} > ${tolWsk})`);
      hasError = true;
    }

    const diffIsbi = Math.abs(task4.isbi - oracle.isbi);
    if (diffIsbi <= tolWsk) {
      console.log(`  [OK] ISBI = ${task4.isbi.toFixed(2)} (oczekiwano: ${oracle.isbi}, różnica: ${diffIsbi.toFixed(4)} <= ${tolWsk})`);
    } else {
      console.error(`  [FAIL] ISBI = ${task4.isbi.toFixed(2)} (oczekiwano: ${oracle.isbi}, różnica: ${diffIsbi.toFixed(4)} > ${tolWsk})`);
      hasError = true;
    }

    const diffCri = Math.abs(task4.cri - oracle.cri);
    if (diffCri <= tolWsk) {
      console.log(`  [OK] CRI = ${task4.cri.toFixed(2)} (oczekiwano: ${oracle.cri}, różnica: ${diffCri.toFixed(4)} <= ${tolWsk})`);
    } else {
      console.error(`  [FAIL] CRI = ${task4.cri.toFixed(2)} (oczekiwano: ${oracle.cri}, różnica: ${diffCri.toFixed(4)} > ${tolWsk})`);
      hasError = true;
    }

    const diffEirsiMax = Math.abs(maxVal - oracle.eirsi_max.wartosc);
    if (maxRegion === oracle.eirsi_max.region && diffEirsiMax <= tolEirsi) {
      console.log(`  [OK] EIRSI MAX = ${maxRegion}: ${maxVal.toFixed(3)} (oczekiwano: ${oracle.eirsi_max.region}: ${oracle.eirsi_max.wartosc})`);
    } else {
      console.error(`  [FAIL] EIRSI MAX = ${maxRegion}: ${maxVal.toFixed(3)} (oczekiwano: ${oracle.eirsi_max.region}: ${oracle.eirsi_max.wartosc})`);
      hasError = true;
    }

    const diffEirsiMin = Math.abs(minVal - oracle.eirsi_min.wartosc);
    if (minRegion === oracle.eirsi_min.region && diffEirsiMin <= tolEirsi) {
      console.log(`  [OK] EIRSI MIN = ${minRegion}: ${minVal.toFixed(3)} (oczekiwano: ${oracle.eirsi_min.region}: ${oracle.eirsi_min.wartosc})`);
    } else {
      console.error(`  [FAIL] EIRSI MIN = ${minRegion}: ${minVal.toFixed(3)} (oczekiwano: ${oracle.eirsi_min.region}: ${oracle.eirsi_min.wartosc})`);
      hasError = true;
    }
  }

  console.log("\n==================================================");
  if (hasError) {
    console.error("  WYNIK: TESTY Z-4 ZAKOŃCZONE BŁĘDEM [FAIL]");
    console.log("==================================================");
    process.exit(1);
  } else {
    console.log("  WYNIK: TESTY Z-4 ZAKOŃCZONE SUKCESEM [PASS]");
    console.log("==================================================");
    process.exit(0);
  }
}

run();
