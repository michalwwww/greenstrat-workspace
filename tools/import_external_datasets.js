/**
 * GREENSTRAT — Importer ETL Danych Zewnętrznych (tools/import_external_datasets.js)
 * Importer danych z GUS BDL API, Eurostat REST API oraz lokalnych snapshotów.
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.join(__dirname, '..', 'data', 'external_benchmarks_snapshot.json');

/**
 * Wczytuje zwalidowany snapshot danych zewnętrznych.
 */
function loadExternalSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(`[ETL ERROR] Brak pliku snapshotu: ${SNAPSHOT_PATH}`);
  }
  const content = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  return JSON.parse(content);
}

/**
 * Formatowanie danych międzynarodowych Polski na tle UE27 i V4 (Produkt 11.5)
 */
function getInternationalBenchmarkData() {
  const snapshot = loadExternalSnapshot();
  const nat = snapshot.polandNational;

  return {
    year: nat.year,
    summaryInnovationIndex: nat.summaryInnovationIndex,
    eu27AverageIndex: nat.eu27AverageIndex,
    distanceToEuAverage: nat.distanceToEuAverage,
    v4Benchmark: nat.v4Benchmark,
    indicators: nat.indicators,
    status: "OK",
    source: "GUS BDL / Eurostat / RIS Snapshot 2024"
  };
}

/**
 * Formatowanie europejskiego benchmarku regionów NUTS 2 (Produkt 14.5)
 */
function getEuropeanRegionalBenchmarkData(regionName) {
  const snapshot = loadExternalSnapshot();
  const regKey = (regionName || '').toLowerCase().trim();
  const regData = snapshot.regionsNuts2[regKey];

  if (!regData) {
    return {
      region: regionName,
      status: "NOT_FOUND",
      message: `Brak danych benchmarkowych NUTS 2 dla regionu: ${regionName}`
    };
  }

  return {
    region: regionName,
    risClass: regData.risClass,
    risScore: regData.risScore,
    structuralTwins: regData.structuralTwins,
    aspirationalRegion: regData.aspirationalRegion,
    pillarsData: regData.pillarsData,
    status: "OK"
  };
}

module.exports = {
  loadExternalSnapshot,
  getInternationalBenchmarkData,
  getEuropeanRegionalBenchmarkData
};
