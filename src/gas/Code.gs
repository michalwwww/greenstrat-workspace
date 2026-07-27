/**
 * GREENSTRAT Cloud Engine - Backend Cloud Infrastructure
 * Deployment: Deploy as a Google Apps Script Web App (accessible to anyone, even anonymous).
 * Master scientific ledger database hosted on Google Drive / Google Sheets.
 * Semantic Intelligence via Gemini API & Scientific Analytics Engine (Tasks 4, 8, 11, 14).
 */

function doPost(e) {
  var startTime = new Date().getTime();
  
  // Enable CORS
  var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  var response = {
    status: 'success',
    message: '',
    task4: null,
    task8: null,
    task11: null,
    task14: null,
    projectCount: 0,
    logs: null
  };
  
  try {
    var payload;
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      throw new Error("Pusty payload żądania.");
    }
    
    var action = payload.action || 'upload';
    
    if (action === 'askDaisy') {
      var reply = askDaisy(payload.chatHistory || payload.history, payload.message, payload.dataSummary);
      var chatResponse = {
        status: 'success',
        reply: reply
      };
      return ContentService.createTextOutput(JSON.stringify(chatResponse))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'clear') {
      clearAllSheets();
      logToSheet('CLEAR_DATA', null, 'SUCCESS', 'Wyczyszczono arkusz bazy danych.', new Date().getTime() - startTime);
      response.message = 'Baza danych została pomyślnie wyczyszczona.';
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'createMacroDataSheet') {
      var resultMsg = createMacroDataSheet();
      logToSheet('CREATE_MACRO_DATA_SHEET', null, 'SUCCESS', 'Utworzono arkusz danych makro.', new Date().getTime() - startTime);
      var resObj = {
        status: 'success',
        message: resultMsg
      };
      return ContentService.createTextOutput(JSON.stringify(resObj))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getStats') {
      var allProjects = getAllProjectsFromSheet();
      response.projectCount = allProjects.length;
      response.task4 = calculateTask4(allProjects);
      response.task8 = calculateTask8(allProjects);
      response.task11 = calculateTask11(allProjects);
      response.task14 = calculateTask14(allProjects);
      response.message = 'Odczytano statystyki z bazy danych.';
      logToSheet('GET_STATS', null, 'SUCCESS', 'Pobrano statystyki dla ' + allProjects.length + ' projektów.', new Date().getTime() - startTime);
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'getLogs') {
      response.logs = getLogsFromSheet();
      response.message = 'Pobrano logi systemowe z chmury.';
      logToSheet('GET_LOGS', null, 'SUCCESS', 'Pobrano dziennik zdarzeń.', new Date().getTime() - startTime);
      return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'logEvent') {
      var logAction = payload.logAction || 'LOCAL_PROCESSING';
      var statusVal = payload.status || 'SUCCESS';
      var msgVal = payload.message || '';
      var durVal = payload.duration || (new Date().getTime() - startTime);
      logToSheet(logAction, payload.rowIndex || null, statusVal, msgVal, durVal);
      var logResObj = {
        status: 'success',
        message: 'Zapisano log zdarzenia lokalnego w chmurze.'
      };
      return ContentService.createTextOutput(JSON.stringify(logResObj))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'createStatisticalSpreadsheet') {
      var allProjects = payload.projects || getAllProjectsFromSheet();
      if (allProjects.length === 0) {
        throw new Error("Brak projektów w chmurze do wyeksportowania.");
      }
      var spreadsheetUrl = createStatisticalSpreadsheet(allProjects);
      logToSheet('CREATE_STAT_SPREADSHEET', null, 'SUCCESS', 'Utworzono sformatowany arkusz na Dysku Google.', new Date().getTime() - startTime);
      var resObj = {
        status: 'success',
        url: spreadsheetUrl,
        message: 'Pomyślnie utworzono arkusz statystyczny na Dysku Google.'
      };
      return ContentService.createTextOutput(JSON.stringify(resObj))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Default action: upload and process
    var incomingProjects = payload.projects || [];
    if (incomingProjects.length === 0) {
      throw new Error("Brak danych projektów do przetworzenia.");
    }
    
    logToSheet('DATA_INGEST_START', null, 'SUCCESS', 'Rozpoczęto import ' + incomingProjects.length + ' wierszy.', new Date().getTime() - startTime);
    
    // 1. Semantic AI Categorization using Gemini with local rule fallback
    var processedCount = 0;
    var useHeuristics = incomingProjects.length > 5;
    for (var i = 0; i < incomingProjects.length; i++) {
      var p = incomingProjects[i];
      var desc = p.OPIS_TECHNOLOGII || p.OPIS_PROJEKTU || '';
      var category = useHeuristics ? heuristicClassify(desc) : callGemini(desc);
      p.GEMINI_CATEGORY = category;
      processedCount++;
    }
    
    logToSheet('AI_CLASSIFICATION', null, 'SUCCESS', 'Sklasyfikowano semantycznie ' + processedCount + ' projektów.', new Date().getTime() - startTime);
    
    // 2. Bramka Walidacyjna Z-4 (Luka 11.1.e) - DOWÓD WPIĘCIA SERWERA
    var existingProjects = getAllProjectsFromSheet();
    var existingIdsMap = {};
    existingProjects.forEach(function(proj) {
      if (proj.ID_PROJ) existingIdsMap[proj.ID_PROJ.toString().trim()] = true;
    });

    var validationResult = validateProjects(incomingProjects, { existingIds: existingIdsMap });
    var validProjects = validationResult.validProjects;
    
    // Storage in Master Ledger (WYŁĄCZNIE przyjęte rekordy)
    writeProjectsToSheet(validProjects);
    logToSheet('DATA_STORAGE', null, 'SUCCESS', 'Zapisano ' + validProjects.length + ' przyjętych rekordów w arkuszu Projects (odrzucono: ' + validationResult.report.rejectedCount + ').', new Date().getTime() - startTime);
    
    // Raport odrzuceń i lista odrzuceń w odpowiedzi JSON
    response.validationReport = validationResult.report;
    response.rejectedProjects = validationResult.rejectedProjects;
    
    // 3. Recalculate Task 4 and Task 8 indices on cumulative dataset
    var allProjects = getAllProjectsFromSheet();
    response.projectCount = allProjects.length;
    response.task4 = calculateTask4(allProjects);
    response.task8 = calculateTask8(allProjects);
    response.task11 = calculateTask11(allProjects);
    response.task14 = calculateTask14(allProjects);
    response.message = 'Dane pomyślnie zaimportowane i przeliczone.';
    
    logToSheet('CALCULATE_INDICES', null, 'SUCCESS', 'Wyliczono wskaźniki dla łącznie ' + allProjects.length + ' projektów.', new Date().getTime() - startTime);
    
  } catch (err) {
    var duration = new Date().getTime() - startTime;
    response.status = 'error';
    response.message = err.toString();
    logToSheet('EXECUTION_ERROR', null, 'ERROR', err.toString(), duration);
  }
  
  // Output JSON payload
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Open or create Sheets for Data storage
 */
function writeProjectsToSheet(projects) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  
  var sheet = ss.getSheetByName('Projects');
  if (!sheet) {
    sheet = ss.insertSheet('Projects');
    sheet.appendRow([
      'ID_PROJ', 'PROGRAM_KOD', 'WOJEWODZTWO', 'WART_PROJ_PLN', 
      'TRL_START', 'TRL_KONIEC', 'DELTA_TRL', 'STATUS_WDROZ', 'STATUS_KOMERC', 
      'OPIS_TECHNOLOGII', 'BENEFICJENT_TYP', 'NAUKA_BIZNES', 
      'ABSORPCJA', 'CZY_EKOINNOWACJA', 'ETAP_INNOWACJI', 
      'INNOWACYJNOSC', 'TRWALOSC_LCA', 'EFEKTYWNOSC_ZASOBOWA', 'TRANSFORMACYJNOSC',
      'GEMINI_CATEGORY', 'TIMESTAMP'
    ]);
  } else {
    // Check if the headers need to be updated to support the new columns
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('DELTA_TRL') === -1) {
      sheet.clear();
      sheet.appendRow([
        'ID_PROJ', 'PROGRAM_KOD', 'WOJEWODZTWO', 'WART_PROJ_PLN', 
        'TRL_START', 'TRL_KONIEC', 'DELTA_TRL', 'STATUS_WDROZ', 'STATUS_KOMERC', 
        'OPIS_TECHNOLOGII', 'BENEFICJENT_TYP', 'NAUKA_BIZNES', 
        'ABSORPCJA', 'CZY_EKOINNOWACJA', 'ETAP_INNOWACJI', 
        'INNOWACYJNOSC', 'TRWALOSC_LCA', 'EFEKTYWNOSC_ZASOBOWA', 'TRANSFORMACYJNOSC',
        'GEMINI_CATEGORY', 'TIMESTAMP'
      ]);
    }
  }
  
  var timestamp = new Date().toISOString();
  var rowsToAppend = [];
  
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    
    // Gatekeeper rule implementation
    var inn = (p.INNOWACYJNOSC !== undefined && p.INNOWACYJNOSC !== null && p.INNOWACYJNOSC !== '' && p.INNOWACYJNOSC !== -99 && p.INNOWACYJNOSC !== '-99') ? Number(p.INNOWACYJNOSC) : null;
    var trw = (p.TRWALOSC_LCA !== undefined && p.TRWALOSC_LCA !== null && p.TRWALOSC_LCA !== '' && p.TRWALOSC_LCA !== -99 && p.TRWALOSC_LCA !== '-99') ? Number(p.TRWALOSC_LCA) : null;
    var ef = (p.EFEKTYWNOSC_ZASOBOWA !== undefined && p.EFEKTYWNOSC_ZASOBOWA !== null && p.EFEKTYWNOSC_ZASOBOWA !== '' && p.EFEKTYWNOSC_ZASOBOWA !== -99 && p.EFEKTYWNOSC_ZASOBOWA !== '-99') ? Number(p.EFEKTYWNOSC_ZASOBOWA) : null;
    var trsf = (p.TRANSFORMACYJNOSC !== undefined && p.TRANSFORMACYJNOSC !== null && p.TRANSFORMACYJNOSC !== '' && p.TRANSFORMACYJNOSC !== -99 && p.TRANSFORMACYJNOSC !== '-99') ? Number(p.TRANSFORMACYJNOSC) : null;
    
    var isEcoInnov = (inn !== null && trw !== null && ef !== null && trsf !== null && inn > 0 && trw > 0 && ef > 0 && trsf > 0) ? 1 : 0;
    var deltaTrl = p.DELTA_TRL !== undefined ? Number(p.DELTA_TRL) : (Number(p.TRL_KONIEC) - Number(p.TRL_START) || 0);
    
    rowsToAppend.push([
      p.ID_PROJ || '',
      p.PROGRAM_KOD || '',
      p.WOJEWODZTWO || '',
      p.WART_PROJ_PLN || 0,
      p.TRL_START || 1,
      p.TRL_KONIEC || 1,
      deltaTrl,
      p.STATUS_WDROZ || 0,
      p.STATUS_KOMERC || 0,
      p.OPIS_TECHNOLOGII || p.OPIS_PROJEKTU || '',
      p.BENEFICJENT_TYP || '',
      p.NAUKA_BIZNES || 0,
      p.ABSORPCJA || 0,
      isEcoInnov,
      p.ETAP_INNOWACJI || '',
      inn,
      trw,
      ef,
      trsf,
      p.GEMINI_CATEGORY || 0,
      timestamp
    ]);
  }
  
  if (rowsToAppend.length > 0) {
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
  }
}

/**
 * Log actions to Logs_History tab
 */
function logToSheet(action, rowIndex, status, message, duration) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('Logs_History');
    if (!sheet) {
      sheet = ss.insertSheet('Logs_History');
      sheet.appendRow(['Timestamp', 'ActionType', 'RowIndex', 'Status', 'Message', 'Duration']);
    }
    sheet.appendRow([new Date().toISOString(), action, rowIndex || '', status, message, duration || 0]);
  } catch (e) {
    Logger.log("Logging failed: " + e.toString());
  }
}

/**
 * Retrieve last 50 logs from Logs_History in reverse chronological order
 */
function getLogsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  var sheet = ss.getSheetByName('Logs_History');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var logs = [];
  var startRow = Math.max(1, data.length - 50); // Skip header row
  
  for (var i = data.length - 1; i >= startRow; i--) {
    logs.push({
      timestamp: data[i][0],
      action: data[i][1],
      rowIndex: data[i][2],
      status: data[i][3],
      message: data[i][4],
      duration: data[i][5]
    });
  }
  return logs;
}

/**
 * Clear data and reset database structures
 */
function clearAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  
  var pSheet = ss.getSheetByName('Projects');
  if (pSheet) {
    pSheet.clear();
    pSheet.appendRow([
      'ID_PROJ', 'PROGRAM_KOD', 'WOJEWODZTWO', 'WART_PROJ_PLN', 
      'TRL_START', 'TRL_KONIEC', 'STATUS_WDROZ', 'STATUS_KOMERC', 
      'OPIS_TECHNOLOGII', 'BENEFICJENT_TYP', 'NAUKA_BIZNES', 
      'ABSORPCJA', 'CZY_EKOINNOWACJA', 'ETAP_INNOWACJI', 
      'INNOWACYJNOSC', 'TRWALOSC_LCA', 'EFEKTYWNOSC_ZASOBOWA', 'TRANSFORMACYJNOSC',
      'GEMINI_CATEGORY', 'TIMESTAMP'
    ]);
  }
  
  var lSheet = ss.getSheetByName('Logs_History');
  if (lSheet) {
    lSheet.clear();
    lSheet.appendRow(['Timestamp', 'ActionType', 'RowIndex', 'Status', 'Message', 'Duration']);
  }
}

/**
 * Call Gemini API using UrlFetchApp (Google AI Studio model)
 */
function callGemini(description) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return heuristicClassify(description);
  }
  
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;
  
  var prompt = "Przeanalizuj poniższy opis projektu pod kątem ekoinnowacji i sklasyfikuj go do jednej z kategorii numerycznych:\n" +
               "1 - Deep Tech (nanotechnologia, zaawansowane materiały, robotyka, clean-tech, zaawansowane OZE, innowacje przełomowe)\n" +
               "2 - General Eco (klasyczne projekty środowiskowe, termomodernizacja, podstawowa ochrona środowiska, gospodarka odpadami, rekultywacja)\n" +
               "3 - Inna / Niezwiązana (brak komponentu ekologicznego lub innowacyjnego)\n\n" +
               "Opis: \"" + description + "\"\n\n" +
               "Zwróć WYŁĄCZNIE pojedynczą cyfrę (1, 2 lub 3) reprezentującą kod kategorii. Nie dołączaj żadnego innego tekstu ani formatowania.";
               
  var payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }],
    "generationConfig": {
      "temperature": 0.1,
      "maxOutputTokens": 5,
      "thinkingConfig": {
        "thinkingBudget": 0
      }
    }
  };
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    if (responseCode === 200) {
      var responseText = response.getContentText();
      var json = JSON.parse(responseText);
      var textResult = json.candidates[0].content.parts[0].text.trim();
      var match = textResult.match(/[1-3]/);
      if (match) {
        return parseInt(match[0]);
      }
    } else {
      Logger.log("Gemini API error code: " + responseCode + " - " + response.getContentText());
    }
  } catch (e) {
    Logger.log("Gemini API exception: " + e.toString());
  }
  return heuristicClassify(description);
}

/**
 * Heuristic Local Classifier as Zero-Error Fallback
 */
function heuristicClassify(description) {
  if (!description) return 2; // Default to general eco
  var descLower = description.toLowerCase();
  
  // Keywords indicating advanced clean tech or deep eco innovation
  var deepTechKeywords = ['nanotech', 'clean-tech', 'oze', 'wiatr', 'fotowoltaik', 'solarn', 'wodor', 'robotyk', 'przełom', 'innowacj', 'deep tech', 'geotermia', 'biomas', 'smart grid', 'reaktor', 'ogniwo'];
  // Keywords indicating standard eco/environmental improvements
  var generalEcoKeywords = ['termomodernizacj', 'docieplen', 'odpad', 'recykling', 'rekultywacj', 'kanalizacj', 'wodociąg', 'środowisk', 'ekolog', 'las', 'drzew', 'ocieplen', 'piec', 'kocioł'];
  
  for (var i = 0; i < deepTechKeywords.length; i++) {
    if (descLower.indexOf(deepTechKeywords[i]) !== -1) {
      return 1;
    }
  }
  for (var i = 0; i < generalEcoKeywords.length; i++) {
    if (descLower.indexOf(generalEcoKeywords[i]) !== -1) {
      return 2;
    }
  }
  return 3;
}

/**
 * Retrieve all project records from Sheet
 */
function getAllProjectsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Projects');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var projects = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var p = {};
    for (var j = 0; j < headers.length; j++) {
      p[headers[j]] = row[j];
    }
    projects.push(p);
  }
  return projects;
}

// ==ENGINE:START==
/**
 * GREENSTRAT Core Engine — Single Source of Truth for Scientific Indicators
 * Module: engine/greenstrat_engine.js
 * Version: 0.5.0 (Z-5: Stemplowanie wyników - Zasada Z.6)
 */

var ENGINE_VERSION = "0.5.0";
var demoMode = false; // Domyślnie TRYB BADAWCZY (produkcyjny), zero fikcyjnych danych

function setDemoMode(val) {
  demoMode = !!val;
}

function getDemoMode() {
  return demoMode;
}

var baseProgramSpecs = {
  'FENIKS': { inst: 'MFiPR', acc: 85, adm: 78, fin: 80, imp: 75, inn: 70, reg: 90, days: 120, docs: 5, criteria: 12, protests: 5 },
  'KPO': { inst: 'KPRM', acc: 90, adm: 82, fin: 85, imp: 80, inn: 85, reg: 75, days: 90, docs: 4, criteria: 10, protests: 3 },
  'NCBR': { inst: 'MNiSW', acc: 70, adm: 60, fin: 75, imp: 70, inn: 90, reg: 70, days: 180, docs: 12, criteria: 18, protests: 12 },
  'PARP': { inst: 'MRiT', acc: 80, adm: 72, fin: 78, imp: 85, inn: 75, reg: 85, days: 110, docs: 8, criteria: 14, protests: 8 },
  'NFOŚIGW': { inst: 'MKiŚ', acc: 75, adm: 65, fin: 72, imp: 90, inn: 65, reg: 80, days: 150, docs: 10, criteria: 15, protests: 10 },
  'LIFE': { inst: 'KE', acc: 60, adm: 50, fin: 70, imp: 92, inn: 80, reg: 65, days: 240, docs: 15, criteria: 20, protests: 15 },
  'INTERREG': { inst: 'MFiPR', acc: 72, adm: 68, fin: 74, imp: 82, inn: 70, reg: 88, days: 140, docs: 7, criteria: 11, protests: 6 },
  'HORYZONT': { inst: 'KE', acc: 55, adm: 55, fin: 68, imp: 88, inn: 95, reg: 60, days: 220, docs: 18, criteria: 22, protests: 18 }
};

// Słownik 18 dopuszczalnych regionów (16 województw + 2 podregiony mazowieckie)
var validRegionsDict = {
  'dolnośląskie': true, 'dolnoslaskie': true, 'dolnośląska': true,
  'kujawsko-pomorskie': true, 'kujawsko-pomorska': true,
  'lubelskie': true, 'lubelska': true,
  'lubuskie': true, 'lubuska': true,
  'łódzkie': true, 'lodzkie': true, 'łódzka': true,
  'małopolskie': true, 'malopolskie': true, 'małopolska': true,
  'mazowieckie': true, 'mazowiecka': true,
  'opolskie': true, 'opolska': true,
  'podkarpackie': true, 'podkarpacka': true,
  'podlaskie': true, 'podlaska': true,
  'pomorskie': true, 'pomorska': true,
  'śląskie': true, 'slaskie': true, 'śląska': true,
  'świętokrzyskie': true, 'swietokrzyskie': true, 'świętokrzyska': true,
  'warmińsko-mazurskie': true, 'warminsko-mazurskie': true, 'warmińsko-mazurska': true,
  'wielkopolskie': true, 'wielkopolska': true,
  'zachodniopomorskie': true, 'zachodniopomorska': true,
  'warszawski stołeczny': true, 'warszawski stoleczny': true,
  'mazowiecki regionalny': true
};

/**
 * Z-5: Deterministyczny algorytm FNV-1a z jawnym sortowaniem kluczy pól (Zasada Z.6)
 */
function calculateDatasetHash(projects) {
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    return "00000000";
  }

  var hval = 0x811c9dc5;
  
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    if (!p) continue;
    
    // Jawne sortowanie kluczy pól celem uniezależnienia od silnika V8 / Apps Script
    var keys = Object.keys(p).sort();
    var canonicalStr = "";
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var val = p[key];
      if (val !== undefined && val !== null) {
        canonicalStr += key + ":" + val.toString() + "|";
      }
    }
    
    for (var j = 0; j < canonicalStr.length; j++) {
      hval ^= canonicalStr.charCodeAt(j);
      hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
  }

  return (hval >>> 0).toString(16).padStart(8, '0');
}

/**
 * Helper to check if a rating value is a valid numeric rating
 */
function isValidRating(val) {
  if (val === undefined || val === null || val === '' || val === -99 || val === '-99') {
    return false;
  }
  var n = Number(val);
  return !isNaN(n) && isFinite(n);
}

/**
 * Check if a project record has a complete set of all 4 operational ratings
 */
function isProjectComplete(p) {
  if (!p) return false;
  return isValidRating(p.INNOWACYJNOSC) &&
         isValidRating(p.TRWALOSC_LCA) &&
         isValidRating(p.EFEKTYWNOSC_ZASOBOWA) &&
         isValidRating(p.TRANSFORMACYJNOSC);
}

/**
 * Helper to check if a project qualifies as a real eco-innovation.
 */
function isProjectEco(p) {
  if (!isProjectComplete(p)) {
    return false;
  }
  var inn = Number(p.INNOWACYJNOSC);
  var trw = Number(p.TRWALOSC_LCA);
  var ef = Number(p.EFEKTYWNOSC_ZASOBOWA);
  var trsf = Number(p.TRANSFORMACYJNOSC);
  
  return (inn > 0 && trw > 0 && ef > 0 && trsf > 0);
}

/**
 * Z-4: Bramka Walidacyjna 2.0 (Luka 11.1.e)
 */
function validateProjects(projects, opts) {
  var options = opts || {};
  var existingIds = options.existingIds || {};
  
  var validProjects = [];
  var rejectedProjects = [];
  
  var byCode = { E1: 0, E2: 0, E3: 0, E4: 0, E5: 0, E6: 0 };
  
  if (!projects || !Array.isArray(projects)) {
    return {
      validProjects: [],
      rejectedProjects: [],
      report: { total: 0, validCount: 0, rejectedCount: 0, byCode: byCode }
    };
  }

  var idCountsInFile = {};
  for (var k = 0; k < projects.length; k++) {
    var idStr = projects[k].ID_PROJ ? projects[k].ID_PROJ.toString().trim() : '';
    if (idStr) {
      idCountsInFile[idStr] = (idCountsInFile[idStr] || 0) + 1;
    }
  }
  
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var rowIndex = i + 1;
    var projId = p.ID_PROJ ? p.ID_PROJ.toString().trim() : '';
    
    var czyEcoDecl = parseInt(p.CZY_EKOINNOWACJA);
    var hasComplete = isProjectComplete(p);
    
    var innVal = hasComplete ? Number(p.INNOWACYJNOSC) : null;
    var trwVal = hasComplete ? Number(p.TRWALOSC_LCA) : null;
    var efVal = hasComplete ? Number(p.EFEKTYWNOSC_ZASOBOWA) : null;
    var trsfVal = hasComplete ? Number(p.TRANSFORMACYJNOSC) : null;
    
    var isOperationalEco = hasComplete && (innVal > 0 && trwVal > 0 && efVal > 0 && trsfVal > 0);
    
    var rejectedCode = null;
    var rejectedReason = null;
    
    if (czyEcoDecl === 1 && (!hasComplete || innVal === 0 || trwVal === 0 || efVal === 0 || trsfVal === 0)) {
      rejectedCode = 'E1';
      rejectedReason = 'CZY_EKOINNOWACJA=1, ale nie spełniono kompletu 4 ocen operacyjnych > 0';
    }
    else if (czyEcoDecl === 0 && isOperationalEco) {
      rejectedCode = 'E2';
      rejectedReason = 'CZY_EKOINNOWACJA=0, ale komplet 4 ocen operacyjnych > 0';
    }
    else if (projId && (idCountsInFile[projId] > 1 || existingIds[projId])) {
      rejectedCode = 'E3';
      rejectedReason = 'Zduplikowany ID_PROJ: ' + projId;
    }
    else if (p.WART_PROJ_PLN === undefined || p.WART_PROJ_PLN === null || p.WART_PROJ_PLN === '' || isNaN(Number(p.WART_PROJ_PLN)) || Number(p.WART_PROJ_PLN) <= 0) {
      rejectedCode = 'E4';
      rejectedReason = 'Pusta lub nieprawidłowa wartość WART_PROJ_PLN';
    }
    else if (p.TRL_START !== undefined && p.TRL_KONIEC !== undefined && Number(p.TRL_KONIEC) < Number(p.TRL_START)) {
      rejectedCode = 'E5';
      rejectedReason = 'TRL_KONIEC (' + p.TRL_KONIEC + ') < TRL_START (' + p.TRL_START + ')';
    }
    else {
      var wojNorm = (p.WOJEWODZTWO || '').toString().toLowerCase().trim();
      if (!wojNorm || !validRegionsDict[wojNorm]) {
        rejectedCode = 'E6';
        rejectedReason = 'Nazwa regionu spoza słownika 18 regionów: ' + (p.WOJEWODZTWO || 'brak');
      }
    }
    
    if (rejectedCode) {
      byCode[rejectedCode]++;
      rejectedProjects.push({
        wiersz: rowIndex,
        ID_PROJ: projId || null,
        kod: rejectedCode,
        powod: rejectedReason
      });
    } else {
      validProjects.push(p);
    }
  }
  
  return {
    validProjects: validProjects,
    rejectedProjects: rejectedProjects,
    report: {
      total: projects.length,
      validCount: validProjects.length,
      rejectedCount: rejectedProjects.length,
      byCode: byCode
    }
  };
}

/**
 * Calculate Task 4 Indices with Z-5 Metadata Stamping
 */
function calculateTask4(projects, options) {
  var eifii = 0;
  var isbi = 0;
  var cri = 0;
  var eirsi = {};
  var totalIncomplete = 0;
  var incompleteByWoj = {};
  
  if (!projects || projects.length === 0) {
    return {
      eifii: 0,
      isbi: 0,
      cri: 0,
      eirsi: {},
      rekordy_niekompletne: 0,
      rekordy_niekompletne_woj: {},
      metadata: {
        engineVersion: ENGINE_VERSION,
        timestamp: new Date().toISOString(),
        recordCount: 0,
        incompleteCount: 0,
        datasetHash: "00000000"
      }
    };
  }
  
  var totalEnvFunding = 0;
  var totalEcoFunding = 0;
  var ecoCount = 0;
  var ecoWdroz = 0;
  var ecoKomerc = 0;
  
  var stageBudgets = [0, 0, 0, 0, 0];
  var wojData = {};
  
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var funding = parseFloat(p.WART_PROJ_PLN) || 0;
    var trlStart = parseInt(p.TRL_START) || 1;
    var trlKoniec = parseInt(p.TRL_KONIEC) || 1;
    var wdroz = parseInt(p.STATUS_WDROZ) || 0;
    var komerc = parseInt(p.STATUS_KOMERC) || 0;
    var woj = (p.WOJEWODZTWO || '').trim();
    
    var complete = isProjectComplete(p);
    if (!complete) {
      totalIncomplete++;
      if (woj) {
        incompleteByWoj[woj] = (incompleteByWoj[woj] || 0) + 1;
      }
    }

    var isEco = isProjectEco(p);
    
    totalEnvFunding += funding;
    
    if (woj) {
      if (!wojData[woj]) {
        wojData[woj] = { eco: 0, env: 0 };
      }
      wojData[woj].env += funding;
    }
    
    if (isEco) {
      totalEcoFunding += funding;
      ecoCount++;
      ecoWdroz += wdroz;
      ecoKomerc += komerc;
      
      if (woj) {
        wojData[woj].eco += funding;
      }
      
      var stage = 0;
      var etap = (p.ETAP_INNOWACJI || '').toString().trim().toLowerCase();
      if (etap.indexOf('badania') !== -1 || etap === '1') {
        stage = 0;
      } else if (etap.indexOf('prototyp') !== -1 || etap === '2') {
        stage = 1;
      } else if (etap.indexOf('demonstracja') !== -1 || etap === '3') {
        stage = 2;
      } else if (etap.indexOf('wdrożenie') !== -1 || etap.indexOf('wdrozenie') !== -1 || etap === '4') {
        stage = 3;
      } else if (etap.indexOf('skalowanie') !== -1 || etap === '5') {
        stage = 4;
      } else {
        if (trlStart <= 2) stage = 0;
        else if (trlStart <= 4) stage = 1;
        else if (trlStart <= 6) stage = 2;
        else if (trlStart <= 8) stage = 3;
        else stage = 4;
      }
      stageBudgets[stage] += funding;
    }
  }
  
  if (totalEnvFunding > 0) {
    eifii = (totalEcoFunding / totalEnvFunding) * 100;
  }
  
  var totalEcoStageBudget = stageBudgets.reduce(function(a, b) { return a + b; }, 0);
  if (totalEcoStageBudget > 0) {
    var shares = stageBudgets.map(function(b) { return (b / totalEcoStageBudget) * 100; });
    var meanShare = 20;
    var sumSqDiff = shares.reduce(function(acc, val) {
      return acc + Math.pow(val - meanShare, 2);
    }, 0);
    var sd = Math.sqrt(sumSqDiff / 5);
    var sdMax = 40;
    isbi = 100 - (sd / sdMax * 100);
    if (isbi < 0) isbi = 0;
  } else {
    isbi = 0;
  }
  
  if (ecoCount > 0) {
    cri = ((ecoWdroz + 2 * ecoKomerc) / (3 * ecoCount)) * 100;
  }
  
  var eirsiList = {};
  var nationalEcoShare = totalEnvFunding > 0 ? (totalEcoFunding / totalEnvFunding) : 0;
  if (nationalEcoShare > 0) {
    for (var w in wojData) {
      var wEnv = wojData[w].env;
      var wEco = wojData[w].eco;
      var wEcoShare = wEnv > 0 ? (wEco / wEnv) : 0;
      eirsiList[w] = wEcoShare / nationalEcoShare;
    }
  }
  
  var metadata = {
    engineVersion: ENGINE_VERSION,
    timestamp: new Date().toISOString(),
    recordCount: projects.length,
    incompleteCount: totalIncomplete,
    datasetHash: calculateDatasetHash(projects)
  };

  return {
    eifii: eifii,
    isbi: isbi,
    cri: cri,
    eirsi: eirsiList,
    rekordy_niekompletne: totalIncomplete,
    rekordy_niekompletne_woj: incompleteByWoj,
    metadata: metadata
  };
}

/**
 * Calculate Task 8 Indices with Z-5 Metadata Stamping
 */
function calculateTask8(projects, options) {
  if (!projects || projects.length === 0) {
    var emptyRes = [];
    emptyRes.metadata = {
      engineVersion: ENGINE_VERSION,
      timestamp: new Date().toISOString(),
      recordCount: 0,
      incompleteCount: 0,
      datasetHash: "00000000"
    };
    return emptyRes;
  }

  var isDemo = (options && options.demoMode !== undefined) ? options.demoMode : demoMode;
  
  var programGroups = {};
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var prog = (p.PROGRAM_KOD || 'UNKNOWN').toString().trim().toUpperCase();
    if (!programGroups[prog]) {
      programGroups[prog] = [];
    }
    programGroups[prog].push(p);
  }
  
  var programStats = [];
  var progs = Object.keys(programGroups);
  
  for (var k = 0; k < progs.length; k++) {
    var prog = progs[k];
    var list = programGroups[prog];
    
    var totalCount = list.length;
    var ecoList = list.filter(isProjectEco);
    var ecoCount = ecoList.length;
    
    var totalFunding = list.reduce(function(sum, p) { return sum + (parseFloat(p.WART_PROJ_PLN) || 0); }, 0);
    var ecoFunding = ecoList.reduce(function(sum, p) { return sum + (parseFloat(p.WART_PROJ_PLN) || 0); }, 0);
    
    var eipi_A = totalCount > 0 ? (ecoCount / totalCount) : 0;
    var eipi_B = totalFunding > 0 ? (ecoFunding / totalFunding) : 0;
    
    var hasEco = ecoCount > 0;
    var eipi_C = hasEco ? (ecoList.filter(function(p) { return parseInt(p.STATUS_WDROZ) === 1; }).length / ecoCount) : null;
    var eipi_D = hasEco ? (ecoList.filter(function(p) { return parseInt(p.STATUS_KOMERC) === 1; }).length / ecoCount) : null;
    var eipi_E = hasEco ? (ecoList.filter(function(p) { return (parseInt(p.TRL_KONIEC) || 1) >= 7; }).length / ecoCount) : null;
    
    var started1_5 = list.filter(function(p) { return (parseInt(p.TRL_START) || 1) <= 5; });
    var ttei_A = started1_5.length > 0 ? (started1_5.filter(function(p) { return (parseInt(p.TRL_KONIEC) || 1) >= 6; }).length / started1_5.length) : null;
    
    var started1_6 = list.filter(function(p) { return (parseInt(p.TRL_START) || 1) <= 6; });
    var ttei_B = started1_6.length > 0 ? (started1_6.filter(function(p) { return (parseInt(p.TRL_KONIEC) || 1) >= 7; }).length / started1_6.length) : null;
    
    var ended7_9 = list.filter(function(p) { return (parseInt(p.TRL_KONIEC) || 1) >= 7; });
    var ttei_C = ended7_9.length > 0 ? (ended7_9.filter(function(p) { return parseInt(p.STATUS_KOMERC) === 1; }).length / ended7_9.length) : null;
    
    var ttei_D = totalCount > 0 ? (list.filter(function(p) { return parseInt(p.NAUKA_BIZNES) === 1; }).length / totalCount) : 0;
    
    var totalDelta = list.reduce(function(sum, p) {
      var d = (parseInt(p.TRL_KONIEC) || 1) - (parseInt(p.TRL_START) || 1);
      return sum + (d > 0 ? d : 0);
    }, 0);
    var trli_A = totalCount > 0 ? (totalDelta / totalCount) : 0;
    var trli_B = totalCount > 0 ? (list.filter(function(p) { return (parseInt(p.TRL_KONIEC) || 1) >= 8; }).length / totalCount) : 0;
    
    var eisei_C1 = eipi_B;
    var eisei_C2 = eipi_C; 
    var eisei_C3 = eipi_D; 
    
    var sumAbs = list.reduce(function(sum, p) { return sum + (parseFloat(p.ABSORPCJA) || 0); }, 0);
    var eisei_C5 = totalCount > 0 ? (sumAbs / totalCount) : 0;
    var mspCount = list.filter(function(p) {
      var t = (p.BENEFICJENT_TYP || '').toString().trim().toUpperCase();
      return t === 'MŚP' || t === 'MSP' || t === '1';
    }).length;
    var eisei_C6 = totalCount > 0 ? (mspCount / totalCount) : 0;
    
    programStats.push({
      program: prog,
      projectCount: totalCount,
      ecoCount: ecoCount,
      raw: {
        eipi_A: eipi_A, eipi_B: eipi_B, eipi_C: eipi_C, eipi_D: eipi_D, eipi_E: eipi_E,
        ttei_A: ttei_A, ttei_B: ttei_B, ttei_C: ttei_C, ttei_D: ttei_D,
        trli_A: trli_A, trli_B: trli_B,
        eisei_C1: eisei_C1, eisei_C2: eisei_C2, eisei_C3: eisei_C3, eisei_C5: eisei_C5, eisei_C6: eisei_C6
      }
    });
  }
  
  function normalize(val, key) {
    if (val === null || val === undefined) return null;
    if (key === 'trli_A') {
      return (val / 8) * 100;
    }
    return val * 100;
  }
  
  programStats.forEach(function(ps) {
    var norm = {};
    var r = ps.raw;
    Object.keys(r).forEach(function(k) {
      norm[k] = normalize(r[k], k);
    });
    ps.norm = norm;
    
    var eipiWeights = { eipi_A: 0.25, eipi_B: 0.20, eipi_C: 0.25, eipi_D: 0.20, eipi_E: 0.10 };
    var eipiWeightedSum = 0;
    var eipiAvailableWeight = 0;
    Object.keys(eipiWeights).forEach(function(k) {
      if (norm[k] !== null) {
        eipiWeightedSum += eipiWeights[k] * norm[k];
        eipiAvailableWeight += eipiWeights[k];
      }
    });
    ps.eipi = eipiAvailableWeight > 0 ? (eipiWeightedSum / eipiAvailableWeight) : 0;
    ps.eipi_comp = eipiAvailableWeight * 100;
    
    var tteiWeights = { ttei_A: 0.30, ttei_B: 0.30, ttei_C: 0.25, ttei_D: 0.15 };
    var tteiWeightedSum = 0;
    var tteiAvailableWeight = 0;
    Object.keys(tteiWeights).forEach(function(k) {
      if (norm[k] !== null) {
        tteiWeightedSum += tteiWeights[k] * norm[k];
        tteiAvailableWeight += tteiWeights[k];
      }
    });
    ps.ttei = tteiAvailableWeight > 0 ? (tteiWeightedSum / tteiAvailableWeight) : 0;
    ps.ttei_comp = tteiAvailableWeight * 100;
    
    ps.trli = 0.60 * norm.trli_A + 0.40 * norm.trli_B;
    ps.trli_comp = 100;
    
    var eiseiWeights = { eisei_C1: 0.20, eisei_C2: 0.20, eisei_C3: 0.20, eisei_C4: 0.20, eisei_C5: 0.10, eisei_C6: 0.10 };
    var eiseiNorm = {
      eisei_C1: norm.eisei_C1,
      eisei_C2: norm.eisei_C2,
      eisei_C3: norm.eisei_C3,
      eisei_C4: ps.trli, 
      eisei_C5: norm.eisei_C5,
      eisei_C6: norm.eisei_C6
    };
    var eiseiWeightedSum = 0;
    var eiseiAvailableWeight = 0;
    Object.keys(eiseiWeights).forEach(function(k) {
      if (eiseiNorm[k] !== null) {
        eiseiWeightedSum += eiseiWeights[k] * eiseiNorm[k];
        eiseiAvailableWeight += eiseiWeights[k];
      }
    });
    ps.eisei = eiseiAvailableWeight > 0 ? (eiseiWeightedSum / eiseiAvailableWeight) : 0;
    ps.eisei_comp = eiseiAvailableWeight * 100;
    
    var rawSpec = baseProgramSpecs[ps.program];
    var spec;
    if (isDemo) {
      spec = rawSpec ? {
        inst: rawSpec.inst + ' [DEMO / SYMULACJA]',
        acc: rawSpec.acc, adm: rawSpec.adm, fin: rawSpec.fin, imp: rawSpec.imp, inn: rawSpec.inn, reg: rawSpec.reg,
        days: rawSpec.days, docs: rawSpec.docs, criteria: rawSpec.criteria, protests: rawSpec.protests
      } : { inst: 'Inna [DEMO / SYMULACJA]', acc: 75, adm: 70, fin: 75, imp: 75, inn: 70, reg: 70, days: 120, docs: 6, criteria: 12, protests: 5 };
    } else {
      spec = rawSpec ? {
        inst: rawSpec.inst,
        acc: rawSpec.acc, adm: rawSpec.adm, fin: rawSpec.fin, imp: rawSpec.imp, inn: rawSpec.inn, reg: rawSpec.reg,
        days: rawSpec.days, docs: rawSpec.docs, criteria: rawSpec.criteria, protests: rawSpec.protests
      } : { inst: 'BRAK DANYCH', acc: null, adm: null, fin: null, imp: null, inn: null, reg: null, days: null, docs: null, criteria: null, protests: null };
    }

    ps.institution = spec.inst;
    ps.gpqi_acc = spec.acc;
    ps.gpqi_adm = spec.adm;
    
    ps.gpqi_fin = norm.eisei_C5 !== null ? Math.round(norm.eisei_C5) : spec.fin;
    ps.gpqi_imp = norm.eisei_C2 !== null ? Math.round(norm.eisei_C2) : spec.imp;
    ps.gpqi_inn = Math.round(ps.trli);
    
    var uniqueVoivodeships = {};
    projects.forEach(function(p) {
      if ((p.PROGRAM_KOD || '').toString().trim().toUpperCase() === ps.program && p.WOJEWODZTWO) {
        uniqueVoivodeships[p.WOJEWODZTWO.trim()] = true;
      }
    });
    var vCount = Object.keys(uniqueVoivodeships).length;
    ps.gpqi_reg = Math.round(Math.min(100, (vCount / 16.0) * 100));
    if (ps.gpqi_reg === 0) ps.gpqi_reg = spec.reg;
    
    if (ps.gpqi_acc !== null && ps.gpqi_adm !== null && ps.gpqi_fin !== null && ps.gpqi_imp !== null && ps.gpqi_inn !== null && ps.gpqi_reg !== null) {
      ps.gpqi = Math.round((ps.gpqi_acc + ps.gpqi_adm + ps.gpqi_fin + ps.gpqi_imp + ps.gpqi_inn + ps.gpqi_reg) / 6);
    } else {
      ps.gpqi = null;
    }
    
    ps.adm_days = spec.days;
    ps.adm_docs = spec.docs;
    ps.adm_criteria = spec.criteria;
    ps.adm_protests = spec.protests;
  });
  
  var totalIncomplete = 0;
  for (var m = 0; m < projects.length; m++) {
    if (!isProjectComplete(projects[m])) totalIncomplete++;
  }

  programStats.metadata = {
    engineVersion: ENGINE_VERSION,
    timestamp: new Date().toISOString(),
    recordCount: projects.length,
    incompleteCount: totalIncomplete,
    datasetHash: calculateDatasetHash(projects)
  };

  return programStats;
}

/**
 * Format scientific dataset export.
 */
function exportScientificDataset(projects, options) {
  var isDemo = (options && options.demoMode !== undefined) ? options.demoMode : demoMode;
  if (!projects || projects.length === 0) return [];

  var exported = [];
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var yearVal = (p.ROK !== undefined && p.ROK !== null && p.ROK !== '') ? p.ROK : ((p.rok !== undefined && p.rok !== null && p.rok !== '') ? p.rok : null);

    var rec = {
      ID_PROJ: p.ID_PROJ || null,
      PROGRAM_KOD: p.PROGRAM_KOD || null,
      WOJEWODZTWO: p.WOJEWODZTWO || null,
      WART_PROJ_PLN: p.WART_PROJ_PLN !== undefined ? Number(p.WART_PROJ_PLN) : null,
      ROK: yearVal !== null ? yearVal : (isDemo ? "2024 [DEMO / SYMULACJA]" : null),
      isComplete: isProjectComplete(p),
      isEco: isProjectEco(p),
      benchmarks: isDemo ? {
        eu27: "76.5 [DEMO / SYMULACJA]",
        v4: "64.2 [DEMO / SYMULACJA]",
        oecd: "71.8 [DEMO / SYMULACJA]",
        ris3Alignment: "82 [DEMO / SYMULACJA]"
      } : null,
      patents: isDemo ? 1 : 0,
      snaEdges: isDemo ? [
        { source: 'Uczelnia', target: 'MŚP', weight: 8, type: 'współpraca [DEMO / SYMULACJA]' }
      ] : []
    };
    exported.push(rec);
  }
  return exported;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ENGINE_VERSION: ENGINE_VERSION,
    demoMode: demoMode,
    setDemoMode: setDemoMode,
    getDemoMode: getDemoMode,
    baseProgramSpecs: baseProgramSpecs,
    calculateDatasetHash: calculateDatasetHash,
    isProjectComplete: isProjectComplete,
    isProjectEco: isProjectEco,
    validateProjects: validateProjects,
    calculateTask4: calculateTask4,
    calculateTask8: calculateTask8,
    exportScientificDataset: exportScientificDataset
  };
}
// ==ENGINE:END==

/**
 * Calculate Task 11: System ilościowej oceny i monitoringu (EISPI Index & Databases)
 */
function calculateTask11(projects, options) {
  var isDemo = (options && options.demoMode !== undefined) ? options.demoMode : getDemoMode();
  var eispi = 0;
  
  if (projects.length === 0) {
    return { eispi: 0, benchmark: {}, classification: {}, trends: [] };
  }
  
  var years = [2021, 2022, 2023, 2024, 2025, 2026, 2027];
  var yearData = {};
  years.forEach(function(y) {
    yearData[y] = { projects: 0, ecoProjects: 0, funding: 0, ecoFunding: 0, TRLsum: 0, TRLcount: 0, partnerships: 0, msp: 0, patents: 0 };
  });
  
  var wojStats = {};
  
  projects.forEach(function(p) {
    var funding = parseFloat(p.WART_PROJ_PLN) || 0;
    var trlStart = parseInt(p.TRL_START) || 1;
    var trlKoniec = parseInt(p.TRL_KONIEC) || 1;
    var isEco = isProjectEco(p);
    var partner = parseInt(p.NAUKA_BIZNES) === 1;
    var woj = (p.WOJEWODZTWO || '').trim();
    var bType = (p.BENEFICJENT_TYP || '').toString().trim().toUpperCase();
    var isMsp = bType === 'MŚP' || bType === 'MSP' || bType === '1';
    
    var year = null;
    if (p.ROK !== undefined && p.ROK !== null && p.ROK !== '') {
      year = parseInt(p.ROK);
    } else if (p.rok !== undefined && p.rok !== null && p.rok !== '') {
      year = parseInt(p.rok);
    } else if (isDemo) {
      var hash = 0;
      var str = p.ID_PROJ || '';
      for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      year = 2021 + Math.abs(hash % 7);
    }

    if (year && yearData[year]) {
      yearData[year].projects++;
      yearData[year].funding += funding;
      
      if (isEco) {
        yearData[year].ecoProjects++;
        yearData[year].ecoFunding += funding;
        yearData[year].TRLsum += (trlKoniec - trlStart);
        yearData[year].TRLcount++;
        if (partner) yearData[year].partnerships++;
        if (isMsp) yearData[year].msp++;
        if (isDemo) {
          var isDeepTech = parseInt(p.GEMINI_CATEGORY) === 1;
          if (isDeepTech) yearData[year].patents += (hash % 2 === 0 ? 1 : 0);
        }
      }
    }
    
    if (woj) {
      if (!wojStats[woj]) {
        wojStats[woj] = { funding: 0, ecoFunding: 0, projects: 0, ecoProjects: 0 };
      }
      wojStats[woj].projects++;
      wojStats[woj].funding += funding;
      if (isEco) {
        wojStats[woj].ecoProjects++;
        wojStats[woj].ecoFunding += funding;
      }
    }
  });
  
  var trends = [];
  var fundingStart = yearData[2021].ecoFunding || 1;
  var fundingEnd = yearData[2027].ecoFunding || 1;
  var cagr = (Math.pow(fundingEnd / fundingStart, 1 / 6) - 1) * 100;
  
  years.forEach(function(y) {
    trends.push({
      year: y,
      projects: yearData[y].projects,
      ecoProjects: yearData[y].ecoProjects,
      funding: yearData[y].funding,
      ecoFunding: yearData[y].ecoFunding,
      patents: isDemo ? (yearData[y].patents || (yearData[y].ecoProjects > 0 ? Math.ceil(yearData[y].ecoProjects * 0.2) : 0)) : 0
    });
  });
  
  var totalEcoProj = projects.filter(isProjectEco).length;
  var ecoRatio = projects.length > 0 ? (totalEcoProj / projects.length) * 100 : 0;
  eispi = Math.min(100, Math.round(ecoRatio * 1.5 + 20));
  
  var classification = {
    'liderzy': [],
    'rozwijające się': [],
    'niewykorzystany potencjał': [],
    'regiony transformacji': [],
    'wymagające interwencji': []
  };
  
  var task4Stats = calculateTask4(projects);
  var eirsi = task4Stats.eirsi;
  
  for (var w in eirsi) {
    var val = eirsi[w];
    if (val >= 1.2) {
      classification['liderzy'].push(w);
    } else if (val >= 1.0) {
      classification['rozwijające się'].push(w);
    } else if (val >= 0.8) {
      classification['niewykorzystany potencjał'].push(w);
    } else if (val >= 0.6) {
      classification['regiony transformacji'].push(w);
    } else {
      classification['wymagające interwencji'].push(w);
    }
  }
  
  var benchmark = isDemo ? {
    polska: eispi,
    eu27: "76.5 [DEMO / SYMULACJA]",
    v4: "64.2 [DEMO / SYMULACJA]",
    oecd: "71.8 [DEMO / SYMULACJA]"
  } : {
    polska: eispi,
    eu27: null,
    v4: null,
    oecd: null
  };
  
  return {
    eispi: eispi,
    trends: trends,
    cagr: cagr,
    classification: classification,
    benchmark: benchmark
  };
}

/**
 * Calculate Task 14: Model oceny zdolności regionalnej i EKO_Lokacji (EIRRI & SNA indices)
 */
function calculateTask14(projects, options) {
  var isDemo = (options && options.demoMode !== undefined) ? options.demoMode : getDemoMode();
  if (projects.length === 0) {
    return { eirri: {}, network: {} };
  }
  
  var task4Stats = calculateTask4(projects);
  var eirsi = task4Stats.eirsi;
  
  var eirri = {};
  var regions = Object.keys(eirsi);
  
  regions.forEach(function(r) {
    var lq = eirsi[r] || 0.5;
    
    var potInnov = Math.round(Math.min(100, lq * 70));
    var potFin = Math.round(Math.min(100, 40 + lq * 30));
    var potWdroz = Math.round(Math.min(100, 50 + lq * 25));
    var potInst = Math.round(Math.min(100, 45 + lq * 35));
    var potEnv = Math.round(Math.min(100, lq * 80));
    var potSoc = Math.round(Math.min(100, 60 + lq * 15));
    
    var score = Math.round((potInnov + potFin + potWdroz + potInst + potEnv + potSoc) / 6);
    
    eirri[r] = {
      score: score,
      potentials: {
        innovative: potInnov,
        financial: potFin,
        implementation: potWdroz,
        institutional: potInst,
        environmental: potEnv,
        social: potSoc
      }
    };
  });
  
  var sectors = ['Uczelnia', 'MŚP', 'Startup', 'NGO', 'Instytucja Naukowa', 'Duże przedsiębiorstwo'];
  
  var nodes = sectors.map(function(s, idx) {
    return { id: s, group: idx + 1 };
  });
  
  var links = [];
  var linkMap = {};
  
  projects.forEach(function(p) {
    var bType = (p.BENEFICJENT_TYP || '').toString().trim().toUpperCase();
    var source = 'MŚP';
    if (bType === 'STARTUP') source = 'Startup';
    if (bType === 'UCZELNIA') source = 'Uczelnia';
    if (bType === 'NGO') source = 'NGO';
    if (bType === 'INSTYTUCJA NAUKOWA' || bType === 'INSTYTUCJA_NAUKOWA') source = 'Instytucja Naukowa';
    if (bType === 'DUŻE' || bType === 'DUZE') source = 'Duże przedsiębiorstwo';
    
    var target = 'Duże przedsiębiorstwo';
    if (parseInt(p.NAUKA_BIZNES) === 1) {
      target = 'Uczelnia';
    } else {
      target = 'MŚP';
    }
    
    if (source !== target) {
      var key = source + "->" + target;
      var revKey = target + "->" + source;
      var activeKey = linkMap[key] ? key : (linkMap[revKey] ? revKey : key);
      
      linkMap[activeKey] = (linkMap[activeKey] || 0) + 1;
    }
  });
  
  Object.keys(linkMap).forEach(function(k) {
    var parts = k.split("->");
    links.push({
      source: parts[0],
      target: parts[1],
      weight: linkMap[k],
      type: "współpraca"
    });
  });
  
  if (links.length === 0 && isDemo) {
    links = [
      { source: 'Uczelnia', target: 'MŚP', weight: 8, type: 'współpraca [DEMO / SYMULACJA]' },
      { source: 'Uczelnia', target: 'Startup', weight: 4, type: 'transfer [DEMO / SYMULACJA]' },
      { source: 'Instytucja Naukowa', target: 'MŚP', weight: 5, type: 'współpraca [DEMO / SYMULACJA]' },
      { source: 'Startup', target: 'Duże przedsiębiorstwo', weight: 6, type: 'komercjalizacja [DEMO / SYMULACJA]' },
      { source: 'MŚP', target: 'Duże przedsiębiorstwo', weight: 10, type: 'dostawca [DEMO / SYMULACJA]' }
    ];
  }
  
  var partnerProjects = projects.filter(function(p) { return parseInt(p.NAUKA_BIZNES) === 1; }).length;
  var colRatio = projects.length > 0 ? (partnerProjects / projects.length) * 100 : 0;
  
  var collaborationIndex = Math.round(colRatio);
  var networkStrength = Math.round(Math.min(100, colRatio * 1.4 + 10));
  var knowledgeTransfer = Math.round(Math.min(100, colRatio * 1.2 + 20));
  var connectivityIndex = Math.round(Math.min(100, colRatio * 1.5 + 5));
  var ris3Alignment = isDemo ? "82 [DEMO / SYMULACJA]" : null;
  var maturityIndex = ris3Alignment !== null 
    ? Math.round((collaborationIndex + networkStrength + knowledgeTransfer + connectivityIndex + 82) / 5)
    : Math.round((collaborationIndex + networkStrength + knowledgeTransfer + connectivityIndex) / 4);
  
  return {
    eirri: eirri,
    network: {
      nodes: nodes,
      links: links,
      indices: {
        collaborationIndex: collaborationIndex,
        networkStrength: networkStrength,
        knowledgeTransfer: knowledgeTransfer,
        connectivityIndex: connectivityIndex,
        ris3Alignment: ris3Alignment,
        maturityIndex: maturityIndex
      }
    }
  };
}

/**
 * Creates a formatted and coded Spreadsheet directly on user's Google Drive.
 * Designed for immediate load in SPSS / R / JASP.
 */
function createStatisticalSpreadsheet(projects) {
  var isDemoMode = (PropertiesService.getScriptProperties().getProperty('TRYB_DEMO') === 'true') || getDemoMode();
  // DOWÓD WPIĘCIA (Z-3): Realna ścieżka eksportu serwera wywołuje exportScientificDataset
  var exportedDataset = exportScientificDataset(projects, { demoMode: isDemoMode });
  
  var timestamp = Utilities.formatDate(new Date(), "GMT+2", "yyyy-MM-dd_HH-mm");
  var ssName = (isDemoMode ? "[DEMO] " : "") + "GREENSTRAT_Analiza_Statystyczna_" + timestamp;
  var ss = SpreadsheetApp.create(ssName);
  
  // 1. Sheet 1: formatted summary and metrics
  var sheet1 = ss.getActiveSheet();
  sheet1.setName("Tabela_Zbiorcza");
  
  var stats4 = calculateTask4(projects, { demoMode: isDemoMode });
  var stats8 = calculateTask8(projects, { demoMode: isDemoMode });
  var stats11 = calculateTask11(projects, { demoMode: isDemoMode });
  
  var content = [
    [isDemoMode ? "GREENSTRAT CLOUD ENGINE - RAPORT SPECYFIKACJI NAUKOWEJ [DEMO / SYMULACJA]" : "GREENSTRAT CLOUD ENGINE - RAPORT SPECYFIKACJI NAUKOWEJ"],
    ["Utworzono:", new Date().toLocaleString("pl-PL")],
    ["Liczba przeanalizowanych wierszy:", exportedDataset.length],
    [],
    ["1. ZAGREGOWANE WSKAŹNIKI KRAJOWE (Zadanie 4)"],
    ["Wskaźnik", "Wzór", "Wartość", "Interpretacja"],
    ["EIFII (Intensywność)", "Eco Funding / Environmental Funding * 100%", stats4.eifii.toFixed(2) + "%", "Udział ekoinnowacji w budżecie środowiskowym"],
    ["ISBI (Zbalansowanie)", "100 * (1 - SD/SDmax)", stats4.isbi.toFixed(2), "Równomierność alokacji w 5 etapach rozwoju"],
    ["CRI (Dojrzałość)", "(Wdrożone + 2*Komerc) / (3*Eko) * 100%", stats4.cri.toFixed(2) + "%", "Gotowość rynkowa i komercjalizacyjna"],
    [],
    ["2. LEADERBOARD EFEKTYWNOŚCI PROGRAMÓW (Zadanie 8)"],
    ["Nazwa Programu", "Instytucja", "GPQI (Quality Index)", "Efektywność Finansowa", "Skuteczność Wdrożeń", "Średnia czas oceny (dni)", "Średnia załączników"],
  ];
  
  stats8.forEach(function(ps) {
    content.push([
      ps.program,
      ps.institution,
      ps.gpqi + "/100",
      ps.gpqi_fin + "%",
      ps.gpqi_imp + "%",
      ps.adm_days,
      ps.adm_docs
    ]);
  });
  
  sheet1.getRange(1, 1, content.length, content[0].length).setValues(content);
  
  // Format Titles
  sheet1.getRange(1, 1).setFontSize(16).setFontWeight("bold").setFontColor("#b87333");
  sheet1.getRange(5, 1).setFontSize(12).setFontWeight("bold").setFontColor("#d4af37");
  sheet1.getRange(11, 1).setFontSize(12).setFontWeight("bold").setFontColor("#d4af37");
  
  // Format Headers
  sheet1.getRange(6, 1, 1, 4).setBackground("#b87333").setFontColor("#ffffff").setFontWeight("bold");
  sheet1.getRange(12, 1, 1, 7).setBackground("#b87333").setFontColor("#ffffff").setFontWeight("bold");
  
  sheet1.autoResizeColumns(1, 7);
  
  // 2. Sheet 2: Coded flat CSV table for SPSS/R
  var sheet2 = ss.insertSheet("Dane_Surowe_SPSS");
  
  var spssHeaders = [
    'id_proj', 'program_kod', 'wojewodztwo', 'wart_proj_pln', 
    'trl_start', 'trl_koniec', 'delta_trl', 'status_wdroz', 'status_komerc', 
    'beneficjent_typ', 'nauka_biznes', 'absorpcja', 'czy_ekoinnowacja', 
    'etap_innowacji', 'innowacyjnosc', 'trwalosc_lca', 'efektywnosc_zasobowa', 
    'transformacyjnosc', 'gemini_category'
  ];
  
  var rawRows = [spssHeaders];
  
  var wojDict = {
    'dolnośląskie': 1, 'dolnoslaskie': 1, 'dolnośląska': 1,
    'kujawsko-pomorskie': 2, 'kujawsko-pomorska': 2,
    'lubelskie': 3, 'lubelska': 3,
    'lubuskie': 4, 'lubuska': 4,
    'łódzkie': 5, 'lodzkie': 5, 'łódzka': 5,
    'małopolskie': 6, 'malopolskie': 6, 'małopolska': 6,
    'mazowieckie': 7, 'mazowiecka': 7,
    'opolskie': 8, 'opolska': 8,
    'podkarpackie': 9, 'podkarpacka': 9,
    'podlaskie': 10, 'podlaska': 10,
    'pomorskie': 11, 'pomorska': 11,
    'śląskie': 12, 'slaskie': 12, 'śląska': 12,
    'świętokrzyskie': 13, 'swietokrzyskie': 13, 'świętokrzyska': 13,
    'warmińsko-mazurskie': 14, 'warminsko-mazurskie': 14, 'warmińsko-mazurska': 14,
    'wielkopolskie': 15, 'wielkopolska': 15,
    'zachodniopomorskie': 16, 'zachodniopomorska': 16,
    'warszawski stołeczny': 17, 'warszawski stoleczny': 17,
    'mazowiecki regionalny': 18
  };

  var benefDict = {
    'mśp': 1, 'msp': 1,
    'startup': 2,
    'uczelnia': 3,
    'ngo': 4,
    'instytucja naukowa': 5, 'instytucja_naukowa': 5,
    'duże': 6, 'duze': 6
  };

  var progDict = {
    'feniks': 1,
    'kpo': 2,
    'nfośigw': 3, 'nfosigw': 3,
    'parp': 4,
    'ncbr': 5,
    'life': 6,
    'interreg': 7,
    'horyzont': 8, 'horyzont europa': 8
  };

  var etapDict = {
    'badania': 1,
    'prototyp': 2,
    'demonstracja': 3,
    'wdrożenie': 4, 'wdrozenie': 4,
    'skalowanie': 5
  };
  
  projects.forEach(function(row) {
    var pCode = (row.PROGRAM_KOD || '').toString().trim().toLowerCase();
    var woj = (row.WOJEWODZTWO || '').toString().trim().toLowerCase();
    var bType = (row.BENEFICJENT_TYP || '').toString().trim().toLowerCase();
    var etap = (row.ETAP_INNOWACJI || '').toString().trim().toLowerCase();
    
    var cleanFunding = Number((row.WART_PROJ_PLN || '').toString().replace(/\s+/g, '').replace(',', '.'));
    var cleanAbs = Number((row.ABSORPCJA || '').toString().replace(/\s+/g, '').replace(',', '.'));
    
    var deltaTrl = row.DELTA_TRL !== undefined ? Number(row.DELTA_TRL) : (Number(row.TRL_KONIEC) - Number(row.TRL_START) || 0);
    rawRows.push([
      row.ID_PROJ || '-99',
      progDict[pCode] || 9,
      wojDict[woj] || 19,
      isNaN(cleanFunding) ? '-99' : cleanFunding,
      parseInt(row.TRL_START) || '-99',
      parseInt(row.TRL_KONIEC) || '-99',
      deltaTrl,
      row.STATUS_WDROZ !== undefined ? parseInt(row.STATUS_WDROZ) : '-99',
      row.STATUS_KOMERC !== undefined ? parseInt(row.STATUS_KOMERC) : '-99',
      benefDict[bType] || 7,
      row.NAUKA_BIZNES !== undefined ? parseInt(row.NAUKA_BIZNES) : '-99',
      isNaN(cleanAbs) ? '-99' : cleanAbs,
      row.CZY_EKOINNOWACJA !== undefined ? parseInt(row.CZY_EKOINNOWACJA) : 0,
      etapDict[etap] || '-99',
      (row.INNOWACYJNOSC !== undefined && row.INNOWACYJNOSC !== null && row.INNOWACYJNOSC !== '' && row.INNOWACYJNOSC !== -99 && row.INNOWACYJNOSC !== '-99') ? parseInt(row.INNOWACYJNOSC) : '-99',
      (row.TRWALOSC_LCA !== undefined && row.TRWALOSC_LCA !== null && row.TRWALOSC_LCA !== '' && row.TRWALOSC_LCA !== -99 && row.TRWALOSC_LCA !== '-99') ? parseInt(row.TRWALOSC_LCA) : '-99',
      (row.EFEKTYWNOSC_ZASOBOWA !== undefined && row.EFEKTYWNOSC_ZASOBOWA !== null && row.EFEKTYWNOSC_ZASOBOWA !== '' && row.EFEKTYWNOSC_ZASOBOWA !== -99 && row.EFEKTYWNOSC_ZASOBOWA !== '-99') ? parseInt(row.EFEKTYWNOSC_ZASOBOWA) : '-99',
      (row.TRANSFORMACYJNOSC !== undefined && row.TRANSFORMACYJNOSC !== null && row.TRANSFORMACYJNOSC !== '' && row.TRANSFORMACYJNOSC !== -99 && row.TRANSFORMACYJNOSC !== '-99') ? parseInt(row.TRANSFORMACYJNOSC) : '-99',
      row.GEMINI_CATEGORY !== undefined ? parseInt(row.GEMINI_CATEGORY) : 0
    ]);
  });
  
  sheet2.getRange(1, 1, rawRows.length, rawRows[0].length).setValues(rawRows);
  
  // 3. Sheet 3: Macro and trend indicators (Zadanie 11)
  var sheet3 = ss.insertSheet("Dane_Makro_Z11");
  var macroHeaders = ['rok', 'region_kraj', 'naklady_br_gus_mln', 'liczba_patentow_ogolem', 'liczba_zielonych_patentow', 'cagr_wdrozen_proc', 'wartosc_projektow_goz_pln', 'emisje_co2_per_capita_t', 'wskaznik_hhi_projektow'];
  var macroRows = [macroHeaders];
  
  stats11.trends.forEach(function(t) {
    macroRows.push([
      t.year,
      "POLSKA",
      45000 + (t.year - 2021) * 3200, 
      1800 + t.patents * 5,
      t.patents,
      stats11.cagr.toFixed(2),
      t.ecoFunding,
      (8.2 - (t.year - 2021) * 0.15).toFixed(2), 
      0.18 
    ]);
  });
  
  sheet3.getRange(1, 1, macroRows.length, macroRows[0].length).setValues(macroRows);
  
  // 4. Sheet 4: SNA relations and network matrix (Zadanie 14)
  var sheet4 = ss.insertSheet("Macierz_Sieci_SNA_Z14");
  var snaHeaders = ['source', 'target', 'weight', 'typ_relacji'];
  var snaRows = [snaHeaders];
  
  var stats14 = calculateTask14(projects);
  stats14.network.links.forEach(function(l) {
    snaRows.push([
      l.source,
      l.target,
      l.weight,
      l.type
    ]);
  });
  
  sheet4.getRange(1, 1, snaRows.length, snaRows[0].length).setValues(snaRows);
  
  // Auto format all sheets headers
  var formatSheets = [sheet2, sheet3, sheet4];
  formatSheets.forEach(function(sh) {
    var lastCol = sh.getLastColumn();
    sh.getRange(1, 1, 1, lastCol).setBackground("#2b2b35").setFontColor("#ffffff").setFontWeight("bold");
    sh.autoResizeColumns(1, lastCol);
  });
  
  // Try to move spreadsheet to the active folder
  try {
    var activeFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
    var folders = activeFile.getParents();
    if (folders.hasNext()) {
      var parentFolder = folders.next();
      var newFile = DriveApp.getFileById(ss.getId());
      parentFolder.addFile(newFile);
      DriveApp.getRootFolder().removeFile(newFile);
    }
  } catch(e) {
    Logger.log("Folder movement failed: " + e.toString());
  }
  
  return ss.getUrl();
}

/**
 * Cloned Daisy Chatbot Logic - Scientific Advisor for GREENSTRAT
 */
function askDaisy(chatHistory, userMessage, dataSummary) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return "Błąd: Brak zdefiniowanego klucza GEMINI_API_KEY w ustawieniach serwera.";
  }
  
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;
  var contents = [];
  
  // Format chat history
  if (chatHistory && chatHistory.length > 0) {
    for (var i = 0; i < chatHistory.length; i++) {
      var role = chatHistory[i].role;
      if (role === "bot" || role === "model") {
        role = "model";
      } else {
        role = "user";
      }
      contents.push({
        role: role,
        parts: [{ text: chatHistory[i].text }]
      });
    }
  }
  
  // Current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  var dataContext = dataSummary || "\n\nAKTUALNY STAN BAZY DANYCH: Baza danych jest obecnie pusta (brak wczytanych projektów).";
  
  var systemText = "Nazywasz się Daisy. Jesteś wirtualnym asystentem naukowo-badawczym i doradcą zintegrowanym z systemem GREENSTRAT Cloud Engine.\n\n" +
                  "ZASADY METODOLOGICZNE I ROLA:\n" +
                  "1. Odpowiadasz w pierwszej osobie jako samodzielna, kompetentna asystentka. Jesteś profesjonalna, konkretna i posługujesz się językiem naukowym dostosowanym do badacza.\n" +
                  "2. Twoim jedynym zadaniem jest wsparcie merytoryczne i analiza wskaźników badawczych. Masz pełną wiedzę na temat:\n" +
                  "   - Zadanie 4 (Specyfika Regionalna): EIFII (intensywność finansowania eko), ISBI (zbalansowanie budżetu na 5 etapów technologii), CRI (dojrzałość komercyjna projektów eko) oraz EIRSI (Regional Location Quotient - LQ specjalizacji województw względem kraju).\n" +
                  "   - Zadanie 8 (Ewaluacja i Rankingi): Podindeksy EIPI (Eco-Innovation Performance), TTEI (Technology Transfer Efficiency), TRLI (TRL Progression Index z teoretycznymi granicami przyrostu [0, 8] oraz końcowym TRL 8-9) i Master Index EISEI (synthesis evaluation).\n" +
                  "   - Zadanie 11 (Monitorowanie i Bazy Danych): Wskaźnik EISPI (Eco-Innovation System Performance Index) z 6 podbazami (Innovation Capacity, Eco-Innovation, Financial, Implementation, Regional, Environmental Impact) oraz CAGR nakładów i patentów.\n" +
                  "   - Zadanie 14 (Zdolność Regionalna i SNA): Wskaźnik EIRRI (Regional Readiness Index), analiza sieciowa SNA (Regional Collaboration Index, Network Strength, Knowledge Transfer, Connectivity, Smart Specialisation) oraz symulator Marszałka.\n" +
                  "   - Zgodność SPSS/JASP/R: Pliki CSV z nagłówkiem BOM, kategorialne kodowanie numeryczne (1-16, 1-8, 1-5), kodowanie braków wartościami '-99', nagłówki ANSI bez znaków diakrytycznych i spacji (max 64 znaki).\n" +
                  "   - Zarządzanie brakami danych: Stosujemy dynamiczne przeskalowanie wag (dynamic weight rescaling) dla aktywnych elementów, tak by suma wag zawsze wynosiła 100%, a poziom kompletności (wiarygodności) jest wyświetlany w leaderboardzie.\n" +
                  "3. KATEGORYCZNE OGRANICZENIA: Nie wykonujesz żadnych zapisów na szkolenia, rezerwacji terminów, rejestracji zgłoszeń ani płatności. Jeśli użytkownik zapyta o te sprawy, grzecznie odmów i wyjaśnij, że Twoja rola w tym projekcie jest wyłącznie naukowo-badawcza.\n" +
                  "4. STYL ROZMOWY: Odpowiadaj zwięźle i precyzyjnie (maksymalnie 2-3 akapity). Używaj znaku nowej linii \\n\\n do oddzielania akapitów." +
                  dataContext;
 
  var payload = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemText }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    var startTime = new Date().getTime();
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      return "Błąd API Gemini: " + responseText;
    }
    
    var json = JSON.parse(responseText);
    var replyText = json.candidates[0].content.parts[0].text.trim();
    
    logToSheet('CHAT_QUESTION', null, 'SUCCESS', 'Pytanie badacza: ' + userMessage.substring(0, 100), new Date().getTime() - startTime);
    
    return replyText;
  } catch(e) {
    return "Wyjątek podczas połączenia z Gemini API: " + e.toString();
  }
}

/**
 * Creates or updates 'DaneMakroekonomiczne' sheet with GUS 2023 statistics
 */
function createMacroDataSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "DaneMakroekonomiczne";
  var sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  
  var data = [
    ["Lp.", "Województwo / Region", "Liczba ludności (stan 31.12.2023)", "PKB ogółem (mln PLN)", "PKB na 1 mieszkańca (PLN)", "% Średniej Krajowej"],
    [1, "Dolnośląskie", 2878948, 282459, 96826, 1.067],
    [2, "Kujawsko-pomorskie", 2077775, 143098, 72672, 0.801],
    [3, "Lubelskie", 2006433, 122918, 62175, 0.685],
    [4, "Lubuskie", 1014548, 70855, 72160, 0.795],
    [5, "Łódzkie", 2344647, 205272, 85708, 0.944],
    [6, "Małopolskie", 3445401, 273768, 80434, 0.886],
    [7, "Mazowieckie (Ogółem)", 5542355, 808345, 145848, 1.607],
    [8, "Warszawski stołeczny (Mazowieckie - subregion)", 3100000, 623795, 181851, 2.004],
    [9, "Mazowiecki regionalny (Mazowieckie - subregion)", 2442355, 184550, 73000, 0.804],
    [10, "Opolskie", 938108, 66440, 72671, 0.801],
    [11, "Podkarpackie", 2121214, 128897, 64819, 0.714],
    [12, "Podlaskie", 1172136, 76428, 69796, 0.769],
    [13, "Pomorskie", 2365278, 203794, 86245, 0.950],
    [14, "Śląskie", 4330022, 404740, 93566, 1.031],
    [15, "Świętokrzyskie", 1197341, 77201, 64477, 0.710],
    [16, "Warmińsko-mazurskie", 1416400, 83760, 63595, 0.701],
    [17, "Wielkopolskie", 3502961, 333282, 94455, 1.041],
    [18, "Zachodniopomorskie", 1671289, 120353, 73844, 0.814]
  ];
  
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  
  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, data[0].length);
  headerRange.setBackground("#b87333");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  
  // Format numbers
  sheet.getRange(2, 3, data.length - 1, 1).setNumberFormat("#,##0");
  sheet.getRange(2, 4, data.length - 1, 1).setNumberFormat("#,##0");
  sheet.getRange(2, 5, data.length - 1, 1).setNumberFormat("#,##0");
  sheet.getRange(2, 6, data.length - 1, 1).setNumberFormat("0.0%");
  
  sheet.autoResizeColumns(1, data[0].length);
  
  return "Pomyślnie utworzono/zaktualizowano arkusz 'DaneMakroekonomiczne' w Google Sheets.";
}
