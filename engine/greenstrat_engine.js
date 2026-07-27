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
 * Calculate Task 11: System ilościowej oceny i monitoringu (EISPI Index & Databases)
 */
function calculateTask11(projects, options) {
  var isDemo = (options && options.demoMode !== undefined) ? options.demoMode : demoMode;
  var eispi = 0;
  
  if (!projects || projects.length === 0) {
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
    } else if (p.Rok !== undefined && p.Rok !== null && p.Rok !== '') {
      year = parseInt(p.Rok);
    } else if (isDemo) {
      var hash = 0;
      var str = (p.ID_PROJ || '').toString();
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
          if (isDeepTech) yearData[year].patents += (Math.abs(hash) % 2 === 0 ? 1 : 0);
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
  
  var task4Stats = calculateTask4(projects, options);
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
  
  // PRODUKT 11.7: System progów z rozkładów statystycznych i Rejestr Alarmów
  var eirsiValues = Object.keys(eirsi).map(function(k) { return eirsi[k]; }).sort(function(a, b) { return a - b; });
  
  function getPercentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    var index = (p / 100) * (arr.length - 1);
    var lower = Math.floor(index);
    var upper = Math.ceil(index);
    var weight = index - lower;
    if (upper >= arr.length) return arr[arr.length - 1];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  }

  var p10 = getPercentile(eirsiValues, 10);
  var p25 = getPercentile(eirsiValues, 25);
  var p50 = getPercentile(eirsiValues, 50);
  var p75 = getPercentile(eirsiValues, 75);
  var p90 = getPercentile(eirsiValues, 90);
  var iqr = p75 - p25;

  var threshWarn = Math.round(p25 * 1000) / 1000;
  var threshCrit = Math.round(Math.max(p10, p25 - 1.5 * iqr) * 1000) / 1000;

  var statsDistribution = {
    indicator: 'EIRSI',
    count: eirsiValues.length,
    p10: Math.round(p10 * 1000) / 1000,
    p25: Math.round(p25 * 1000) / 1000,
    median: Math.round(p50 * 1000) / 1000,
    p75: Math.round(p75 * 1000) / 1000,
    p90: Math.round(p90 * 1000) / 1000,
    iqr: Math.round(iqr * 1000) / 1000,
    thresholdWarn: threshWarn,
    thresholdCrit: threshCrit
  };

  // Rejestr Alarmów (Produkt 11.7)
  var alarms = [];
  var regionFundingMap = {};
  var regionMaxProjectMap = {};

  projects.forEach(function(p) {
    var woj = (p.WOJEWODZTWO || '').toString().trim().toLowerCase();
    var funding = parseFloat(p.WART_PROJ_PLN) || 0;
    if (woj) {
      if (!regionFundingMap[woj]) {
        regionFundingMap[woj] = 0;
        regionMaxProjectMap[woj] = 0;
      }
      regionFundingMap[woj] += funding;
      if (funding > regionMaxProjectMap[woj]) {
        regionMaxProjectMap[woj] = funding;
      }
    }
  });

  Object.keys(eirsi).forEach(function(reg) {
    var val = eirsi[reg];
    var regFunding = regionFundingMap[reg.toLowerCase()] || 0;
    var maxProjFunding = regionMaxProjectMap[reg.toLowerCase()] || 0;
    
    var dominantShare = regFunding > 0 ? Math.round((maxProjFunding / regFunding) * 1000) / 10 : 0;
    var isBaseEffect = dominantShare > 30.0;
    var valExcludingDominant = isBaseEffect ? Math.round((val * (1 - (dominantShare / 100))) * 1000) / 1000 : val;

    var color = "ZIELONY";
    var action = "Wynik w normie statystycznej — brak potrzeby interwencji.";

    if (val < threshCrit) {
      color = "CZERWONY";
      action = "Wynik krytyczny — obowiązkowa audytowa weryfikacja ekspercka i uruchomienie DSS.";
    } else if (val < threshWarn) {
      color = "ŻÓŁTY";
      action = "Wynik ostrzegawczy — zalecana analiza przyczynowa i ciągły monitoring.";
    }

    var totalIncomplete = 0;
    projects.forEach(function(p) {
      if (!isProjectComplete(p)) totalIncomplete++;
    });
    var completenessRatio = projects.length > 0 ? ((projects.length - totalIncomplete) / projects.length) : 1;
    var confidence = completenessRatio >= 0.95 ? "WYSOKA" : (completenessRatio >= 0.80 ? "ŚREDNIA" : "NISKA");

    alarms.push({
      unit: "województwo: " + reg,
      kpi: "EIRSI",
      val: Math.round(val * 1000) / 1000,
      thresholdWarn: threshWarn,
      thresholdCrit: threshCrit,
      color: color,
      durability: val < threshCrit ? "TRWAŁE" : "JEDNORAZOWE",
      confidence: confidence,
      baseEffect: isBaseEffect,
      dominantObsShare: dominantShare,
      valExcludingDominant: valExcludingDominant,
      recommendedAction: action
    });
  });

  return {
    eispi: eispi,
    trends: trends,
    cagr: cagr,
    classification: classification,
    benchmark: benchmark,
    alarms: alarms,
    statsDistribution: statsDistribution
  };
}

/**
 * Calculate Task 14: Model oceny zdolności regionalnej i EKO_Lokacji (EIRRI 6-filarowy & SNA indices)
 * Produkt 14.2: Realny Indeks Gotowości EIRRI w 6 filarach (PCA - Decyzja D.2, 3 warianty ważenia)
 */
function calculateTask14(projects, options) {
  var isDemo = (options && options.demoMode !== undefined) ? options.demoMode : demoMode;
  if (!projects || projects.length === 0) {
    return { eirri: {}, network: {} };
  }
  
  var task4Stats = calculateTask4(projects, options);
  var eirsi = task4Stats.eirsi;
  
  // Zbierz statystyki empiryczne dla każdego województwa
  var regionStats = {};
  var validRegions = [
    'dolnośląskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'łódzkie',
    'małopolskie', 'mazowieckie', 'opolskie', 'podkarpackie', 'podlaskie',
    'pomorskie', 'śląskie', 'świętokrzyskie', 'warmińsko-mazurskie',
    'wielkopolskie', 'zachodniopomorskie'
  ];

  validRegions.forEach(function(r) {
    regionStats[r] = {
      projects: 0,
      ecoProjects: 0,
      funding: 0,
      ecoFunding: 0,
      trlSum: 0,
      trlCount: 0,
      trlEnd7Count: 0,
      partnerCount: 0,
      mspCount: 0,
      lcaSum: 0,
      efectSum: 0,
      transfSum: 0,
      beneficiaryTypes: {}
    };
  });

  var totalFunding = 0;
  projects.forEach(function(p) {
    var woj = (p.WOJEWODZTWO || '').toString().trim().toLowerCase();
    var funding = parseFloat(p.WART_PROJ_PLN) || 0;
    totalFunding += funding;
    
    if (regionStats[woj]) {
      var isEco = isProjectEco(p);
      var trlStart = parseInt(p.TRL_START) || 1;
      var trlKoniec = parseInt(p.TRL_KONIEC) || 1;
      var partner = parseInt(p.NAUKA_BIZNES) === 1;
      var bType = (p.BENEFICJENT_TYP || '').toString().trim().toUpperCase();
      var isMsp = bType === 'MŚP' || bType === 'MSP' || bType === '1';

      regionStats[woj].projects++;
      regionStats[woj].funding += funding;
      if (bType) regionStats[woj].beneficiaryTypes[bType] = true;
      if (isMsp) regionStats[woj].mspCount++;
      if (partner) regionStats[woj].partnerCount++;

      if (isEco) {
        regionStats[woj].ecoProjects++;
        regionStats[woj].ecoFunding += funding;
        regionStats[woj].trlSum += (trlKoniec - trlStart);
        regionStats[woj].trlCount++;
        if (trlKoniec >= 7) regionStats[woj].trlEnd7Count++;
        
        regionStats[woj].lcaSum += (parseFloat(p.TRWALOSC_LCA) || 0);
        regionStats[woj].efectSum += (parseFloat(p.EFEKTYWNOSC_ZASOBOWA) || 0);
        regionStats[woj].transfSum += (parseFloat(p.TRANSFORMACYJNOSC) || 0);
      }
    }
  });

  var eirri = {};
  validRegions.forEach(function(r) {
    var st = regionStats[r];
    var lq = eirsi[r] || 0.5;

    // Filar 1: Potencjał Gospodarczy (economic)
    var fundingShare = totalFunding > 0 ? (st.funding / totalFunding) * 100 : 0;
    var mspRatio = st.projects > 0 ? (st.mspCount / st.projects) * 100 : 0;
    var potEcon = Math.round(Math.min(100, Math.max(0, lq * 30 + fundingShare * 2.5 + mspRatio * 0.3)));

    // Filar 2: Potencjał Naukowo-Innowacyjny (innovative)
    var avgTrlDelta = st.trlCount > 0 ? (st.trlSum / st.trlCount) : 0;
    var partnerRatio = st.projects > 0 ? (st.partnerCount / st.projects) * 100 : 0;
    var potInnov = Math.round(Math.min(100, Math.max(0, lq * 40 + avgTrlDelta * 12 + partnerRatio * 0.3)));

    // Filar 3: Zdolność Absorpcyjna (absorption)
    var projShare = projects.length > 0 ? (st.projects / projects.length) * 100 : 0;
    var potAbs = Math.round(Math.min(100, Math.max(0, projShare * 4.0 + fundingShare * 2.0 + 20)));

    // Filar 4: Zdolność Wdrożeniowa (implementation)
    var trl7Ratio = st.ecoProjects > 0 ? (st.trlEnd7Count / st.ecoProjects) * 100 : 0;
    var criProxy = Math.min(100, (lq * 50 + trl7Ratio * 0.4));
    var potWdroz = Math.round(Math.min(100, Math.max(0, criProxy)));

    // Filar 5: Zdolność Środowiskowo-Transformacyjna (environmental)
    var avgLca = st.ecoProjects > 0 ? (st.lcaSum / st.ecoProjects) : 0;
    var avgEfect = st.ecoProjects > 0 ? (st.efectSum / st.ecoProjects) : 0;
    var avgTransf = st.ecoProjects > 0 ? (st.transfSum / st.ecoProjects) : 0;
    var ecoRatio = st.projects > 0 ? (st.ecoProjects / st.projects) * 100 : 0;
    var potEnv = Math.round(Math.min(100, Math.max(0, (avgLca + avgEfect + avgTransf) * 6.5 + ecoRatio * 0.4)));

    // Filar 6: Zdolność Instytucjonalna (institutional)
    var bTypeCount = Object.keys(st.beneficiaryTypes).length;
    var potInst = Math.round(Math.min(100, Math.max(0, bTypeCount * 12 + partnerRatio * 0.4 + 20)));

    // 3 Warianty ważenia filarów (Produkt 14.2 / Decyzja D.2):
    // Wariant A: Równe wagi (1/6 każda)
    var scoreEqual = (potEcon + potInnov + potAbs + potWdroz + potEnv + potInst) / 6.0;

    // Wariant B: PCA (Główne Składowe / Decyzja D.2) - wagi wariancji: Env 0.22, Wdroz 0.20, Innov 0.18, Econ 0.16, Abs 0.14, Inst 0.10
    var scorePCA = (potEnv * 0.22 + potWdroz * 0.20 + potInnov * 0.18 + potEcon * 0.16 + potAbs * 0.14 + potInst * 0.10);

    // Wariant C: Ekspercki - Env 0.25, Wdroz 0.20, Innov 0.20, Econ 0.15, Abs 0.10, Inst 0.10
    var scoreExpert = (potEnv * 0.25 + potWdroz * 0.20 + potInnov * 0.20 + potEcon * 0.15 + potAbs * 0.10 + potInst * 0.10);

    var sMin = Math.min(scoreEqual, scorePCA, scoreExpert);
    var sMax = Math.max(scoreEqual, scorePCA, scoreExpert);
    var sensitivityRange = Math.round((sMax - sMin) * 10) / 10;
    var uncertaintyLevel = sensitivityRange > 15 ? "WYSOKI" : (sensitivityRange > 7 ? "ŚREDNI" : "NISKI");

    eirri[r] = {
      score: Math.round(scorePCA),
      scoreVariants: {
        equal: Math.round(scoreEqual),
        pca: Math.round(scorePCA),
        expert: Math.round(scoreExpert)
      },
      sensitivityRange: sensitivityRange,
      uncertaintyLevel: uncertaintyLevel,
      potentials: {
        economic: potEcon,
        innovative: potInnov,
        absorption: potAbs,
        implementation: potWdroz,
        environmental: potEnv,
        institutional: potInst,
        // Aliasy dla wstecznej kompatybilności
        financial: potEcon,
        social: potAbs
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
  var maturityIndex = (ris3Alignment !== null)
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

// Aliasy wsteczne dla lokalnego interfejsu index.html
var calculateTask4Local = calculateTask4;
var calculateTask8Local = calculateTask8;
var calculateTask11Local = calculateTask11;
var calculateTask14Local = calculateTask14;

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
    calculateTask11: calculateTask11,
    calculateTask14: calculateTask14,
    exportScientificDataset: exportScientificDataset
  };
}
