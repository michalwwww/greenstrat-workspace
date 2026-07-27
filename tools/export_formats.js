/**
 * GREENSTRAT — Multi-Format Data Exporter (tools/export_formats.js)
 * Formaty: Google BigQuery (GoogleSQL DDL + NDJSON), Parquet, DuckDB, JSON-Stat v2.0, CSV
 */

const fs = require('fs');
const path = require('path');

/**
 * 1. Export to CSV (UTF-8 z BOM)
 */
function exportToCSV(records, delimiter = ';') {
  if (!Array.isArray(records) || records.length === 0) return '';
  const headers = Object.keys(records[0]);
  
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const csvRows = [];
  csvRows.push(headers.join(delimiter));
  
  records.forEach(row => {
    const cells = headers.map(h => escapeCell(row[h]));
    csvRows.push(cells.join(delimiter));
  });

  // UTF-8 BOM: \uFEFF
  return '\uFEFF' + csvRows.join('\n');
}

/**
 * 2. Export to NDJSON (Newline-Delimited JSON for Google BigQuery Load Jobs)
 */
function exportToNDJSON(records) {
  if (!Array.isArray(records)) return '';
  return records.map(r => JSON.stringify(r)).join('\n');
}

/**
 * 3. Export to Google BigQuery GoogleSQL DDL + Load Script
 */
function exportToBigQuerySQL(records, tableName = 'greenstrat_monitoring') {
  if (!Array.isArray(records) || records.length === 0) return '';
  const sample = records[0];

  const columnDefs = Object.keys(sample).map(key => {
    const val = sample[key];
    let bqType = 'STRING';
    if (val !== null && val !== undefined) {
      if (Number.isInteger(val)) bqType = 'INT64';
      else if (typeof val === 'number') bqType = 'NUMERIC';
      else if (typeof val === 'boolean') bqType = 'BOOLEAN';
      else if (typeof val === 'object') bqType = 'JSON';
    }
    return `  \`${key}\` ${bqType}`;
  }).join(',\n');

  const ddl = `-- ==================================================\n` +
    `-- GREENSTRAT Google BigQuery Schema DDL\n` +
    `-- Tabela: ${tableName}\n` +
    `-- ==================================================\n` +
    `CREATE OR REPLACE TABLE \`greenstrat.${tableName}\` (\n` +
    `${columnDefs}\n` +
    `) OPTIONS(\n` +
    `  description="Zintegrowana baza monitoringowa polityki ekoinnowacyjnej GREENSTRAT",\n` +
    `  labels=[("project", "greenstrat"), ("task", "11_14")]\n` +
    `);\n\n` +
    `-- Polecenie załadunku CLI:\n` +
    `-- bq load --source_format=NEWLINE_DELIMITED_JSON greenstrat.${tableName} gs://your-bucket/${tableName}.ndjson\n`;

  return ddl;
}

/**
 * 4. Export to JSON-Stat v2.0 (Międzynarodowy standard Eurostat/GUS)
 */
function exportToJSONStat(records, datasetTitle = 'GREENSTRAT Monitoring Indicator Cube') {
  if (!Array.isArray(records) || records.length === 0) return {};

  const dimensions = {
    id: ['wojewodztwo', 'indicator', 'year'],
    size: [16, 1, 1],
    role: {
      metric: ['indicator'],
      time: ['year'],
      geo: ['wojewodztwo']
    },
    dimension: {
      wojewodztwo: {
        label: "Województwo",
        category: {
          index: [],
          label: {}
        }
      },
      indicator: {
        label: "Wskaźnik Ekoinnowacji",
        category: {
          index: ["EIRSI"],
          label: { "EIRSI": "Ekologiczny Indeks Odporności Społeczno-Innowacyjnej" }
        }
      },
      year: {
        label: "Rok Referencyjny",
        category: {
          index: ["2024"],
          label: { "2024": "2024" }
        }
      }
    }
  };

  const values = [];
  const wojSet = new Set();

  records.forEach(r => {
    const woj = r.WOJEWODZTWO || r.wojewodztwo || r.entity || 'Nieokreślony';
    if (!wojSet.has(woj)) {
      wojSet.add(woj);
      dimensions.dimension.wojewodztwo.category.index.push(woj);
      dimensions.dimension.wojewodztwo.category.label[woj] = woj;
    }
    const val = parseFloat(r.EIRSI || r.val || r.score || 0);
    values.push(val);
  });

  dimensions.size[0] = dimensions.dimension.wojewodztwo.category.index.length;

  return {
    version: "2.0",
    class: "dataset",
    label: datasetTitle,
    source: "GREENSTRAT Engine v0.5.0",
    updated: new Date().toISOString(),
    id: dimensions.id,
    size: dimensions.size,
    dimension: dimensions.dimension,
    value: values
  };
}

/**
 * 5. Export to DuckDB (SQL DDL + DuckDB Parquet loader script)
 */
function exportToDuckDB(records, tableName = 'greenstrat_analytics') {
  if (!Array.isArray(records) || records.length === 0) return '';
  const sample = records[0];

  const columnDefs = Object.keys(sample).map(key => {
    const val = sample[key];
    let duckType = 'VARCHAR';
    if (val !== null && val !== undefined) {
      if (Number.isInteger(val)) duckType = 'BIGINT';
      else if (typeof val === 'number') duckType = 'DOUBLE';
      else if (typeof val === 'boolean') duckType = 'BOOLEAN';
    }
    return `  "${key}" ${duckType}`;
  }).join(',\n');

  const sql = `-- ==================================================\n` +
    `-- GREENSTRAT DuckDB In-Memory Analytics Script\n` +
    `-- Tabela: ${tableName}\n` +
    `-- ==================================================\n` +
    `CREATE TABLE IF NOT EXISTS ${tableName} (\n` +
    `${columnDefs}\n` +
    `);\n\n` +
    `-- Załadunek bezpośredni z Parquet / CSV w DuckDB:\n` +
    `-- COPY ${tableName} FROM '${tableName}.csv' (HEADER, DELIMITER ';');\n` +
    `-- CREATE TABLE ${tableName}_parquet AS SELECT * FROM read_parquet('${tableName}.parquet');\n`;

  return sql;
}

/**
 * Zbiór wszystkich funkcji eksportowych
 */
module.exports = {
  exportToCSV,
  exportToNDJSON,
  exportToBigQuerySQL,
  exportToJSONStat,
  exportToDuckDB
};
