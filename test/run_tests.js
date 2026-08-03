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

    // Walidacja składni Code.gs
    const codeGsPath = path.join(__dirname, '..', 'src', 'gas', 'Code.gs');
    if (fs.existsSync(codeGsPath)) {
      const codeGsContent = fs.readFileSync(codeGsPath, 'utf8');
      try {
        new Function(
          'PropertiesService', 'SpreadsheetApp', 'Logger', 'ContentService', 'DriveApp', 'Utilities',
          codeGsContent
        );
        console.log('  [OK] Parsowanie JavaScript w src/gas/Code.gs: SKŁADNIA POPRAWNA [PASS]');
      } catch (err) {
        console.error(`  [FAIL] Błąd składni w src/gas/Code.gs: ${err.message}`);
        hasError = true;
      }
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

  console.log("\n--- TESTY L.20 / Z-6: TASK 11 I TASK 14 W SILNIKU ---");
  const task11Research = engine.calculateTask11(sampleData, { demoMode: false });
  const task14Research = engine.calculateTask14(sampleData, { demoMode: false });
  const task11Demo = engine.calculateTask11(sampleData, { demoMode: true });
  const task14Demo = engine.calculateTask14(sampleData, { demoMode: true });

  // 1. Asercje braku danych symulowanych na proba_1000.xlsx w trybie badawczym
  const stringified11 = JSON.stringify(task11Research);
  const stringified14 = JSON.stringify(task14Research);
  const forbiddenLiterals = ["76.5 [DEMO", "64.2 [DEMO", "71.8 [DEMO", "82 [DEMO"];
  let hasForbiddenLiteral = false;
  for (const lit of forbiddenLiterals) {
    if (stringified11.includes(lit) || stringified14.includes(lit)) {
      hasForbiddenLiteral = true;
      console.error(`  [FAIL] Wykryto zakazany literał symulacji '${lit}' w wyniku trybu badawczego!`);
    }
  }

  // A-1: kontrakt zmieniony — benchmark nie jest już `null`, lecz musi pochodzić ze snapshotu
  // z jawnym oznaczeniem pochodzenia. Zakazane pozostają wartości bez pokrycia w źródle.
  const snapForAssert = require('../data/external_benchmarks_snapshot.json');

  // A-1: snapshot istnieje w dwóch kopiach — plik JSON (źródło prawdy dla ETL/Node) oraz stała
  // wbudowana w blok ENGINE (jedyna dostępna dla przeglądarki i Google Apps Script).
  // Ta asercja pilnuje, żeby nie dało się zaktualizować jednej strony bez drugiej.
  if (JSON.stringify(engine.EXTERNAL_BENCHMARKS_SNAPSHOT) === JSON.stringify(snapForAssert)) {
    console.log(`  [OK] A-1 Snapshot wbudowany w ENGINE jest identyczny z data/external_benchmarks_snapshot.json (wersja ${snapForAssert.version}).`);
  } else {
    console.error("  [FAIL] A-1 ROZJAZD: stała EXTERNAL_BENCHMARKS_SNAPSHOT w silniku różni się od pliku data/external_benchmarks_snapshot.json!");
    hasError = true;
  }

  const bmR = task11Research.benchmark;
  const benchmarkFromSnapshot = !!bmR &&
    bmR.summaryInnovationIndex === snapForAssert.polandNational.summaryInnovationIndex &&
    bmR.distanceToEuAverage === snapForAssert.polandNational.distanceToEuAverage &&
    bmR.snapshotVersion === snapForAssert.version &&
    !('v4' in bmR) && !('oecd' in bmR);

  if (!hasForbiddenLiteral && benchmarkFromSnapshot && task14Research.network.indices.ris3Alignment === null) {
    console.log(`  [OK] Tryb badawczy dla proba_1000 (Z-6/A-1): benchmark ze snapshotu ${bmR.snapshotVersion} (indeks=${bmR.summaryInnovationIndex}, brak pól v4/oecd), ris3Alignment === null, brak zakazanych literałów symulowanych.`);
  } else {
    console.error("  [FAIL] Niezgodność strukturalna wyników trybu badawczego dla Task 11 / Task 14!");
    hasError = true;
  }

  // A-1: REGRESJA ŚCIEŻKI PRODUKCYJNEJ — dokładnie tak wywołuje silnik klient (index.html)
  // i Google Apps Script: bez `externalSnapshot`, bo nie mają dostępu do modułów Node.
  // Audyt UI (31 301) wykazał, że ta ścieżka zwracała wartość wyliczoną wzorem clamp(EISPI*0.724, 50, 95)
  // pod etykietą źródła GUS BDL / Eurostat, a żaden test jej nie pokrywał.
  const task11Prod = engine.calculateTask11(sampleData, { demoMode: false, useExternalBenchmark: true });
  const bmProd = task11Prod.benchmark;
  const fabricatedValue = Math.min(95.0, Math.max(50.0, Math.round((task11Prod.eispi * 0.724) * 10) / 10));
  const prodOk = !!bmProd &&
    bmProd.summaryInnovationIndex === snapForAssert.polandNational.summaryInnovationIndex &&
    bmProd.summaryInnovationIndex !== fabricatedValue &&
    !('v4' in bmProd) && !('oecd' in bmProd) &&
    typeof bmProd.source === 'string' && bmProd.source.indexOf(snapForAssert.version) !== -1;

  if (prodOk) {
    console.log(`  [OK] A-1 Ścieżka produkcyjna (useExternalBenchmark, bez externalSnapshot): indeks=${bmProd.summaryInnovationIndex} ze snapshotu, a NIE wartość ze wzoru (${fabricatedValue}); źródło="${bmProd.source}".`);
  } else {
    console.error(`  [FAIL] A-1 Ścieżka produkcyjna zwraca wartość spoza snapshotu! Otrzymano indeks=${bmProd ? bmProd.summaryInnovationIndex : 'null'}, oczekiwano ${snapForAssert.polandNational.summaryInnovationIndex} (wartość ze wzoru: ${fabricatedValue}).`);
    hasError = true;
  }

  // 2. Asercja obecności oznaczeń symulacji w trybie DEMO
  if (task11Demo.benchmark && JSON.stringify(task11Demo.benchmark).includes("[DEMO / SYMULACJA]") &&
      task14Demo.network.indices.ris3Alignment && task14Demo.network.indices.ris3Alignment.includes("[DEMO / SYMULACJA]")) {
    console.log("  [OK] Tryb DEMO dla Task 11 / Task 14 (Z-6): wskaźniki posiadają etykiety [DEMO / SYMULACJA].");
  } else {
    console.error("  [FAIL] Brak wymaganych etykiet [DEMO / SYMULACJA] w trybie DEMO dla Task 11 / Task 14!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-7: PRODUKT 14.2 REALNY INDEKS EIRRI Z 6 FILARAMI I PCA (D.2) ---");
  const eirriResult = task14Research.eirri;
  const sampleRegion = eirriResult['mazowieckie'];

  if (sampleRegion && sampleRegion.scoreVariants && 
      sampleRegion.scoreVariants.pca !== undefined &&
      sampleRegion.scoreVariants.equal !== undefined &&
      sampleRegion.scoreVariants.expert !== undefined &&
      sampleRegion.potentials.economic !== undefined &&
      sampleRegion.potentials.innovative !== undefined &&
      sampleRegion.potentials.absorption !== undefined &&
      sampleRegion.potentials.implementation !== undefined &&
      sampleRegion.potentials.environmental !== undefined &&
      sampleRegion.potentials.institutional !== undefined) {
    console.log(`  [OK] Z-7 EIRRI Mazowieckie: scorePCA=${sampleRegion.scoreVariants.pca}, scoreEqual=${sampleRegion.scoreVariants.equal}, scoreExpert=${sampleRegion.scoreVariants.expert}, niepewność=${sampleRegion.uncertaintyLevel} (Zakres=${sampleRegion.sensitivityRange}).`);
    console.log(`  [OK] 6 Filarów: Env=${sampleRegion.potentials.environmental}, Wdroż=${sampleRegion.potentials.implementation}, Innov=${sampleRegion.potentials.innovative}, Econ=${sampleRegion.potentials.economic}, Abs=${sampleRegion.potentials.absorption}, Inst=${sampleRegion.potentials.institutional}.`);
  } else {
    console.error("  [FAIL] Brak pełnej struktury 6 filarów lub 3 wariantów ważenia w wyniku Z-7 EIRRI!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-8: PRODUKT 11.7 PROGI Z ROZKŁADÓW STATYSTYCZNYCH I REJESTR ALARMÓW ---");
  const alarms = task11Research.alarms;
  const statsDist = task11Research.statsDistribution;

  if (alarms && Array.isArray(alarms) && alarms.length > 0 && statsDist && statsDist.median !== undefined) {
    const redAlarms = alarms.filter(a => a.color === 'CZERWONY').length;
    const yellowAlarms = alarms.filter(a => a.color === 'ŻÓŁTY').length;
    const greenAlarms = alarms.filter(a => a.color === 'ZIELONY').length;
    console.log(`  [OK] Z-8 Statystyka rozkładu EIRSI: Mediana=${statsDist.median}, P25=${statsDist.p25}, P75=${statsDist.p75}, IQR=${statsDist.iqr}, PrógOstrzegawczy=${statsDist.thresholdWarn}, PrógKrytyczny=${statsDist.thresholdCrit}.`);
    console.log(`  [OK] Z-8 Rejestr alarmów (rekordów=${alarms.length}): ZIELONY=${greenAlarms}, ŻÓŁTY=${yellowAlarms}, CZERWONY=${redAlarms}.`);
  } else {
    console.error("  [FAIL] Brak rejestru alarmów lub statystyk rozkładu w wyniku Zadania 11!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-9: PRODUKT 11.4 BENCHMARK KRAJOWY W 5 KLASACH STATYSTYCZNYCH ---");
  const natBench = task11Research.nationalBenchmark;

  if (natBench && natBench.fiveClasses && 
      natBench.fiveClasses['liderzy systemowi'] !== undefined &&
      natBench.fiveClasses['ponadprzeciętni'] !== undefined &&
      natBench.fiveClasses['poziom referencyjny'] !== undefined &&
      natBench.fiveClasses['wymagający poprawy'] !== undefined &&
      natBench.fiveClasses['krytyczni'] !== undefined &&
      Array.isArray(natBench.entityMatrix)) {
    const counts = {
      liderzy: natBench.fiveClasses['liderzy systemowi'].length,
      ponad: natBench.fiveClasses['ponadprzeciętni'].length,
      ref: natBench.fiveClasses['poziom referencyjny'].length,
      poprawa: natBench.fiveClasses['wymagający poprawy'].length,
      kryt: natBench.fiveClasses['krytyczni'].length
    };
    console.log(`  [OK] Z-9 Benchmark krajowy w 5 klasach: Liderzy=${counts.liderzy}, Ponadprzeciętni=${counts.ponad}, Referencyjny=${counts.ref}, WymagającyPoprawy=${counts.poprawa}, Krytyczni=${counts.kryt}.`);
    console.log(`  [OK] Z-9 Progi percentylowe: P90=${natBench.percentileThresholds.p90}, P75=${natBench.percentileThresholds.p75}, P25=${natBench.percentileThresholds.p25}, P10=${natBench.percentileThresholds.p10}.`);
  } else {
    console.error("  [FAIL] Brak prawidłowej struktury Benchmarku Krajowego w 5 klasach!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-10: PRODUKT 14.3 TYPOLOGIA REGIONALNA I KLASTERYZACJA Z 6 FILARAMI ---");
  const typology = task14Research.typology;

  if (typology && typology.clusters && typology.regionTypologyMap &&
      typology.clusters['1'] && typology.clusters['2'] && typology.clusters['3'] && typology.clusters['4']) {
    const regMaz = typology.regionTypologyMap['mazowieckie'];
    console.log(`  [OK] Z-10 Typologia klastrowa 16 województw: K1=${typology.clusters['1'].regions.length}, K2=${typology.clusters['2'].regions.length}, K3=${typology.clusters['3'].regions.length}, K4=${typology.clusters['4'].regions.length}.`);
    if (regMaz) {
      console.log(`  [OK] Z-10 Mazowieckie: Archetyp=${regMaz.archetypeName} (K${regMaz.clusterId}), OdległośćCentroid=${regMaz.distanceToCenter}, Atut=${regMaz.dominantStrength}, Deficyt=${regMaz.dominantDeficit}.`);
    }
  } else {
    console.error("  [FAIL] Brak prawidłowej struktury Typologii Regionalnej (Produkt 14.3)!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-11: PRODUKT 11.8 KRAJOWY DETERMINISTYCZNY DSS W MODELU HITL ---");
  const natDSS = task11Research.nationalDSS;

  if (natDSS && Array.isArray(natDSS.recommendations) && natDSS.recommendations.length > 0) {
    const sampleRec = natDSS.recommendations[0];
    console.log(`  [OK] Z-11 Krajowy DSS wygenerował rekomendacje dla ${natDSS.recommendations.length} programów.`);
    if (sampleRec && sampleRec.actionVariants && sampleRec.actionVariants.length === 3 && sampleRec.hitlStatus === "AUTOMATYCZNA") {
      console.log(`  [OK] Z-11 Rekomendacja DSS ${sampleRec.unitId}: Klasa=${sampleRec.efficiencyClass}, Alarm=${sampleRec.alarmStatus}, HITLStatus=${sampleRec.hitlStatus}, LiczbaWariantów=${sampleRec.actionVariants.length}.`);
    } else {
      console.error("  [FAIL] Brak 3 wariantów akcji lub statusu HITL w rekomendacji DSS!");
      hasError = true;
    }
  } else {
    console.error("  [FAIL] Brak prawidłowej struktury Krajowego DSS (Produkt 11.8)!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-12: PRODUKT 14.7 REGIONALNY DSS Z BEZPIECZNIKIEM I FALLBACK ---");
  const regDSS = task14Research.regionalDSS;

  if (regDSS && Array.isArray(regDSS.recommendations) && regDSS.recommendations.length > 0) {
    const mazRec = regDSS.recommendations.find(r => r.region === 'mazowieckie') || regDSS.recommendations[0];
    console.log(`  [OK] Z-12 Regionalny DSS wygenerował rekomendacje dla ${regDSS.recommendations.length} regionów.`);
    if (mazRec && mazRec.primaryIntervention && mazRec.fallbackOption && mazRec.hitlStatus === "AUTOMATYCZNA") {
      console.log(`  [OK] Z-12 Rekomendacja regionalna ${mazRec.region}: Archetyp=${mazRec.archetype}, EIRRIScore=${mazRec.eirriScore}, Niepewność=${mazRec.uncertaintyLevel}, HITLStatus=${mazRec.hitlStatus}.`);
    } else {
      console.error("  [FAIL] Brak wariantu głównego lub fallback w rekomendacji Regionalnego DSS!");
      hasError = true;
    }
  } else {
    console.error("  [FAIL] Brak prawidłowej struktury Regionalnego DSS (Produkt 14.7)!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-13: MODUŁ WIELOFORMATOWEGO EKSPORTU DANYCH (BIGQUERY, DUCKDB, JSON-STAT, CSV) ---");
  const sampleMatrix = task11Research.nationalBenchmark.entityMatrix;
  const exporter = require('../tools/export_formats');

  const csvOut = exporter.exportToCSV(sampleMatrix);
  const ndjsonOut = exporter.exportToNDJSON(sampleMatrix);
  const bqSqlOut = exporter.exportToBigQuerySQL(sampleMatrix, 'monitoring_test');
  const jsonStatOut = exporter.exportToJSONStat(sampleMatrix, 'GREENSTRAT Test Cube');
  const duckDbOut = exporter.exportToDuckDB(sampleMatrix, 'monitoring_duckdb');

  if (csvOut.startsWith('\uFEFF') && ndjsonOut.includes('\n') && bqSqlOut.includes('CREATE OR REPLACE TABLE') &&
      jsonStatOut.version === '2.0' && duckDbOut.includes('CREATE TABLE')) {
    console.log(`  [OK] Z-13 Eksport CSV: ${csvOut.length} bajtów (UTF-8 BOM).`);
    console.log(`  [OK] Z-13 Eksport Google BigQuery NDJSON: ${ndjsonOut.split('\n').length} wierszy.`);
    console.log(`  [OK] Z-13 Schemat Google BigQuery GoogleSQL DDL wygenerowany poprawnie.`);
    console.log(`  [OK] Z-13 Eksport JSON-Stat v2.0: ${jsonStatOut.value.length} wartości w sześcianie statystycznym.`);
    console.log(`  [OK] Z-13 Skrypt DuckDB DDL wygenerowany poprawnie.`);
  } else {
    console.error("  [FAIL] Błąd generowania plików wieloformatowego eksportu!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-14: PRODUKT 14.8 MODEL EKO_LOKACJI I KATALOG 17 INSTRUMENTÓW ---");
  const ekoLok = task14Research.ekoLokacje;

  if (ekoLok && Array.isArray(ekoLok.matrix) && ekoLok.matrix.length === 16) {
    const sampleEko = ekoLok.matrix[0];
    console.log(`  [OK] Z-14 Model EKO_Lokacji wyznaczony dla ${ekoLok.matrix.length} województw.`);
    if (sampleEko && sampleEko.recommendedModel && sampleEko.locationVariant && sampleEko.hitlStatus === "AUTOMATYCZNA") {
      console.log(`  [OK] Z-14 EKO_Lokacja ${sampleEko.region}: Model=${sampleEko.recommendedModel}, Lokalizacja=${sampleEko.locationVariant}, Odbiorcy=${sampleEko.targetAudience}.`);
    } else {
      console.error("  [FAIL] Brak modelu lub wariantu lokalizacji w wyniku EKO_Lokacji!");
      hasError = true;
    }
  } else {
    console.error("  [FAIL] Brak prawidłowej struktury EKO_Lokacji (Produkt 14.8)!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-15: PRODUKT 14.6 (10 WARSTW MAPOWYCH) I PRODUKT 14.9 (KATALOG REKOMENDACJI JST) ---");
  const regMaps = task14Research.regionalMaps;
  const jstRecs = task14Research.jstRecommendations;

  if (regMaps && regMaps.layers && Object.keys(regMaps.layers).length === 10) {
    console.log(`  [OK] Z-15 Wygenerowano 10 warstw mapowych (Produkt 14.6) dla wszystkich 16 województw.`);
  } else {
    console.error("  [FAIL] Brak prawidłowych 10 warstw mapowych w Produkcie 14.6!");
    hasError = true;
  }

  if (jstRecs && Array.isArray(jstRecs.recommendations) && jstRecs.recommendations.length === 16) {
    const sampleJst = jstRecs.recommendations[0];
    console.log(`  [OK] Z-15 Wygenerowano ${jstRecs.recommendations.length} rekomendacji JST (Produkt 14.9).`);
    console.log(`  [OK] Z-15 Rekomendacja JST ${sampleJst.region}: Interwencja=${sampleJst.interwencja}, Podmiot=${sampleJst.odpowiedzialnyPodmiot}, HITLStatus=${sampleJst.hitlStatus}.`);
  } else {
    console.error("  [FAIL] Brak prawidłowej struktury katalogu rekomendacji JST (Produkt 14.9)!");
    hasError = true;
  }

  console.log("\n--- TESTY Z-16: PRODUKT 11.5 (BENCHMARK MIĘDZYNARODOWY POLSKI) I PRODUKT 14.5 (BENCHMARK NUTS 2) ---");
  const etl = require('../tools/import_external_datasets');
  const snapshotData = etl.loadExternalSnapshot();

  if (snapshotData && snapshotData.polandNational && snapshotData.regionsNuts2) {
    console.log(`  [OK] Z-16 Wczytano statyczny snapshot danych zewnętrznych GUS BDL / Eurostat (${Object.keys(snapshotData.regionsNuts2).length} województw NUTS 2).`);
  } else {
    console.error("  [FAIL] Błąd wczytywania snapshotu danych zewnętrznych!");
    hasError = true;
  }

  const intBench = etl.getInternationalBenchmarkData();
  if (intBench && intBench.status === 'OK' && intBench.v4Benchmark) {
    console.log(`  [OK] Z-16 Benchmark międzynarodowy Polski: Indeks=${intBench.summaryInnovationIndex}, DystansUE=${intBench.distanceToEuAverage}, Czechy=${intBench.v4Benchmark.czechia}.`);
  } else {
    console.error("  [FAIL] Błąd wyliczania benchmarku międzynarodowego Polski (Produkt 11.5)!");
    hasError = true;
  }

  const mazBench = etl.getEuropeanRegionalBenchmarkData('mazowieckie');
  if (mazBench && mazBench.status === 'OK' && mazBench.structuralTwins) {
    console.log(`  [OK] Z-16 Benchmark NUTS 2 mazowieckie: Klasa=${mazBench.risClass}, RegionyBliźniacze=${mazBench.structuralTwins.join(', ')}, RegionAspiracyjny=${mazBench.aspirationalRegion}.`);
  } else {
    console.error("  [FAIL] Błąd wyliczania europejskiego benchmarku regionów NUTS 2 (Produkt 14.5)!");
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
