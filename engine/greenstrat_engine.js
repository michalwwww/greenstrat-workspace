/**
 * GREENSTRAT Core Engine — Single Source of Truth for Scientific Indicators
 * Module: engine/greenstrat_engine.js
 * Version: 0.3.1 (Z-3: Separacja trybu DEMO od trybu badawczego - D.12)
 */

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

/**
 * Helper to check if a rating value is a valid numeric rating
 * Invalid: undefined, null, empty string "", -99, NaN
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
 * Z-2 Rule (L.16): Only complete records with all 4 ratings > 0 qualify as eco-innovations.
 * Incomplete records (missing any rating) are NEVER eco-innovations.
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
 * Calculate Task 4 Indices (Eco-Innovation regional & technology stage metrics)
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
      rekordy_niekompletne_woj: {}
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
  
  return {
    eifii: eifii,
    isbi: isbi,
    cri: cri,
    eirsi: eirsiList,
    rekordy_niekompletne: totalIncomplete,
    rekordy_niekompletne_woj: incompleteByWoj
  };
}

/**
 * Calculate Task 8 Indices (Program performance 0-100 scale metrics)
 */
function calculateTask8(projects, options) {
  if (!projects || projects.length === 0) return [];
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
  
  return programStats;
}

/**
 * Format scientific dataset export.
 * Structural assertions (Z-3):
 * - In RESEARCH mode (demoMode = false): benchmarks = null, patents = 0, years = input subset or null
 * - In DEMO mode (demoMode = true): benchmarks labeled with "[DEMO / SYMULACJA]"
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
    demoMode: demoMode,
    setDemoMode: setDemoMode,
    getDemoMode: getDemoMode,
    baseProgramSpecs: baseProgramSpecs,
    isProjectComplete: isProjectComplete,
    isProjectEco: isProjectEco,
    calculateTask4: calculateTask4,
    calculateTask8: calculateTask8,
    exportScientificDataset: exportScientificDataset
  };
}
