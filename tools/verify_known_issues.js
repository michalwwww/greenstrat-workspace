/**
 * GREENSTRAT — Skaner regresji znanych błędów
 *
 * Sprawdza kod pod kątem sygnatur błędów już raz wykrytych i naprawionych w projekcie.
 * Źródła: GREENSTRAT_Ksiega_Bledow_i_Baza_Wiedzy.md (34 pozycje),
 *         audit/RAPORT_AUDYTU_UI_PELNA_BAZA_31301.md (A-1..A-4),
 *         audit/RAPORT_AUDYTU_BEZPIECZENSTWA_I_KODU_v0.5.0.md (C-001..C-005),
 *         audit/RAPORT_WERYFIKACJI_AUDYTU_v0.5.0.md (P0-1..P0-5).
 *
 * Użycie:
 *   node tools/verify_known_issues.js [ścieżka-do-workspace]
 *
 * Kod wyjścia: 0 = brak wykrytych regresji, 1 = wykryto co najmniej jedną.
 *
 * UWAGA: skaner wykrywa SYGNATURY, nie dowodzi poprawności. Kontrole oznaczone
 * jako MANUALNE wymagają audytu w przeglądarce — patrz docs/WYCIAG_BLEDOW_I_WERYFIKACJA.md.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.resolve(__dirname, '..');

// Pliki poddawane skanowaniu (pomijamy dokumentację, testy i dane wzorcowe)
const TARGETS = [
  'engine/greenstrat_engine.js',
  'src/gas/index.html',
  'src/gas/Code.gs'
];

/**
 * Definicja kontroli.
 *  id           — identyfikator ustalenia źródłowego
 *  opis         — czego dotyczy
 *  wzorzec      — RegExp sygnatury błędu
 *  wyjatek      — RegExp; trafienie ignorowane, gdy sama linia go spełnia (np. etykieta DEMO)
 *  oknoWyjatku  — { wzorzec, promien }; trafienie ignorowane, gdy zabezpieczenie występuje
 *                 w promieniu N linii. Konieczne, bo bramki i asercje w tym kodzie
 *                 są często wieloliniowe — bez tego skaner produkuje fałszywe alarmy.
 */
const CHECKS = [
  // ---------- KLASA A: FABRYKOWANIE DANYCH (łamie zasadę #1) ----------
  {
    id: 'A/L.20/P0-4', klasa: 'Fabrykowanie danych',
    opis: 'Generowanie roku z hasha ID projektu zamiast kolumny ROK',
    wzorzec: /2021\s*\+\s*Math\.abs\s*\(\s*hash|hash\s*%\s*7/,
    oknoWyjatku: { wzorzec: /isDemo|demoMode|TRYB_DEMO/, promien: 3 }
  },
  {
    id: 'A-1', klasa: 'Fabrykowanie danych',
    opis: 'Benchmark międzynarodowy wyliczany wzorem z EISPI zamiast ze snapshotu',
    wzorzec: /0\.724|eispi\s*\*\s*0\.\d+/i
  },
  {
    id: 'A-1/Z-3', klasa: 'Fabrykowanie danych',
    opis: 'Zaszyte wartości referencyjne UE/V4/OECD bez pokrycia w źródle danych',
    wzorzec: /\b(eu27|v4|oecd)\s*:\s*(76\.5|64\.2|71\.8|85\.0)/i,
    wyjatek: /\[DEMO \/ SYMULACJA\]/
  },
  {
    id: 'Z-3', klasa: 'Fabrykowanie danych',
    opis: 'Zaszyta wartość ris3Alignment = 82',
    wzorzec: /ris3Alignment\s*[:=]\s*82\b/,
    wyjatek: /\[DEMO \/ SYMULACJA\]/
  },
  {
    id: 'Ks.#24/P0-3', klasa: 'Fabrykowanie danych',
    opis: 'Losowe wartości (patenty, oceny, TRL) generowane przez Math.random',
    wzorzec: /Math\.random\s*\(/,
    wyjatek: /\[DEMO \/ SYMULACJA\]/
  },
  {
    id: 'L.16/Z-2', klasa: 'Fabrykowanie danych',
    opis: 'Domyślna ocena operacyjna = 1 przy braku danych (grzech INNOWACYJNOSC: 1)',
    wzorzec: /(INNOWACYJNOSC|TRWALOSC_LCA|EFEKTYWNOSC_ZASOBOWA|TRANSFORMACYJNOSC)\s*:\s*[^,;}\n]*\|\|\s*1\b/
  },
  {
    id: 'P0-2', klasa: 'Fabrykowanie danych',
    opis: 'Generator tekstu naukowego / fikcyjne cytowania',
    wzorzec: /simulatePaperText|SIMIK_\d{4}_\d/
  },

  // ---------- KLASA B: BRAK DANYCH PODANY JAKO WARTOŚĆ ----------
  {
    id: 'A-1/UI', klasa: 'Brak danych jako wartość',
    opis: 'Fallback do literału referencyjnego przy braku danych benchmarkowych',
    wzorzec: /\|\|\s*(76\.5|85\.0|64\.2|71\.8)\b/
  },
  {
    id: 'Ks.#12', klasa: 'Brak danych jako wartość',
    opis: 'Dzielenie bez zabezpieczenia mianownika (ryzyko ISBI / dzielenie przez zero)',
    wzorzec: /\/\s*sumStage1(?!\s*\))/,
    wyjatek: /Math\.max/
  },

  // ---------- KLASA C: ODPORNOŚĆ NA NULL / CRASH ----------
  {
    id: 'e9834ee', klasa: 'Odporność na null',
    opis: 'Wywołanie .toString() bezpośrednio na polu wiersza bez zabezpieczenia',
    wzorzec: /\brow\.[A-Za-z_]+\.toString\s*\(/,
    wyjatek: /!==\s*undefined|!==\s*null|\?\./
  },
  {
    id: 'C-002', klasa: 'Odporność na null',
    opis: 'Odczyt odpowiedzi API bez asercji strukturalnej',
    wzorzec: /candidates\s*\[\s*0\s*\]\s*\.content\s*\.parts\s*\[\s*0\s*\]/,
    oknoWyjatku: { wzorzec: /json\s*&&\s*json\.candidates|candidates\.length\s*>\s*0/, promien: 6 }
  },
  {
    id: 'Ks.#19', klasa: 'Odporność na null',
    opis: 'Odwołanie do sieci SNA bez sprawdzenia istnienia obiektu',
    wzorzec: /task14\.network\.links/,
    oknoWyjatku: { wzorzec: /!backendCalculatedData\.task14\.network|task14\.network\s*&&|\?\./, promien: 8 }
  },
  {
    id: 'Ks.#16', klasa: 'Odporność na null',
    opis: 'window.open bez sprawdzenia blokady wyskakujących okien',
    wzorzec: /=\s*window\.open\s*\(/,
    oknoWyjatku: { wzorzec: /if\s*\(\s*!/, promien: 3 }
  },
  {
    id: 'Ks.#17', klasa: 'Odporność na null',
    opis: 'createObjectURL bez zwolnienia pamięci (revokeObjectURL)',
    wzorzec: /URL\.createObjectURL/,
    parujZ: /revokeObjectURL/,
    opisParowania: 'liczba wywołań createObjectURL bez odpowiadających revokeObjectURL'
  },

  // ---------- KLASA D: PARSOWANIE DANYCH SUROWYCH ----------
  {
    id: 'Ks.#1', klasa: 'Parsowanie danych',
    opis: 'Regex województw bez myślnika (ucina KUJAWSKO-POMORSKIE)',
    wzorzec: /match\s*\(\s*\/WOJ\\?\.[^/]*\[A-ZŚĆŹŻÓŁĘĄŃa-zśćźżółęąń\]\+/
  },
  {
    id: 'Ks.#18', klasa: 'Parsowanie danych',
    opis: 'Eksport CSV/XLS bez znacznika BOM UTF-8 (krzaczki w MS Excel)',
    wzorzec: /type\s*:\s*['"]text\/csv/,
    parujZ: /\\uFEFF|﻿/,
    opisParowania: 'eksporty CSV bez nagłówka BOM'
  },

  // ---------- KLASA E: BEZPIECZEŃSTWO ----------
  {
    id: 'C-001', klasa: 'Bezpieczeństwo',
    opis: 'Renderowanie treści z API/użytkownika przez innerHTML (XSS)',
    wzorzec: /innerHTML\s*=\s*[^;]*\b(reply|data\.reply|response|aiText|json\.)/
  },

  // ---------- KLASA F: DETERMINIZM I STEMPLOWANIE ----------
  {
    id: 'Ks.#32', klasa: 'Determinizm',
    opis: 'Sortowanie rankingu bez drugiego kryterium (niedeterministyczna kolejność przy remisie)',
    wzorzec: /\.sort\s*\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*b\.eisei\s*-\s*a\.eisei\s*\)/
  }
];

// ---------- KONTROLE STRUKTURALNE (nie grep-owe) ----------

function sprawdzSpojnoscSnapshotu(root) {
  const jsonPath = path.join(root, 'data', 'external_benchmarks_snapshot.json');
  const enginePath = path.join(root, 'engine', 'greenstrat_engine.js');
  if (!fs.existsSync(jsonPath) || !fs.existsSync(enginePath)) {
    return { id: 'A-1/drift', ok: null, opis: 'Snapshot lub silnik nieobecny — kontrola pominięta.' };
  }
  const engineSrc = fs.readFileSync(enginePath, 'utf8');
  if (engineSrc.indexOf('EXTERNAL_BENCHMARKS_SNAPSHOT') === -1) {
    return {
      id: 'A-1/drift', ok: false,
      opis: 'Snapshot NIE jest wbudowany w blok ENGINE — w przeglądarce i GAS benchmark będzie niedostępny lub fabrykowany.'
    };
  }
  try {
    const engine = require(enginePath);
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const zgodne = JSON.stringify(engine.EXTERNAL_BENCHMARKS_SNAPSHOT) === JSON.stringify(json);
    return {
      id: 'A-1/drift', ok: zgodne,
      opis: zgodne
        ? 'Stała w silniku identyczna z plikiem JSON.'
        : 'ROZJAZD: stała EXTERNAL_BENCHMARKS_SNAPSHOT różni się od data/external_benchmarks_snapshot.json.'
    };
  } catch (e) {
    return { id: 'A-1/drift', ok: false, opis: 'Nie udało się porównać kopii snapshotu: ' + e.message };
  }
}

function sprawdzSynchronizacjeSilnika(root) {
  const enginePath = path.join(root, 'engine', 'greenstrat_engine.js');
  if (!fs.existsSync(enginePath)) return { id: 'Ks.#21', ok: null, opis: 'Brak silnika — kontrola pominięta.' };
  const engineSrc = fs.readFileSync(enginePath, 'utf8').trim();

  const wyniki = [];
  for (const rel of ['src/gas/index.html', 'src/gas/Code.gs']) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    const s = src.indexOf('// ==ENGINE:START==');
    const e = src.indexOf('// ==ENGINE:END==');
    if (s === -1 || e === -1) { wyniki.push(rel + ': BRAK ZNACZNIKÓW ENGINE'); continue; }
    const blok = src.slice(s + '// ==ENGINE:START=='.length, e);
    if (blok.indexOf(engineSrc.slice(0, 400)) === -1) wyniki.push(rel + ': blok ENGINE rozjechany z silnikiem');
  }
  return {
    id: 'Ks.#21', ok: wyniki.length === 0,
    opis: wyniki.length === 0 ? 'Blok ENGINE zgodny w index.html i Code.gs.' : wyniki.join('; ') + ' — uruchom npm run sync.'
  };
}

function sprawdzDuplikacjeFormul(root) {
  const p = path.join(root, 'src', 'gas', 'index.html');
  if (!fs.existsSync(p)) return { id: 'L.15', ok: null, opis: 'Brak index.html — kontrola pominięta.' };
  const src = fs.readFileSync(p, 'utf8');
  const s = src.indexOf('// ==ENGINE:START==');
  const e = src.indexOf('// ==ENGINE:END==');
  if (s === -1 || e === -1) return { id: 'L.15', ok: false, opis: 'Brak znaczników ENGINE w index.html.' };
  const poza = src.slice(0, s) + src.slice(e);
  const podejrzane = ['function isEcoProj', 'function calculateEIFII', 'function calculateISBI', 'function calculateEIRSI']
    .filter(f => poza.indexOf(f) !== -1);
  return {
    id: 'L.15', ok: podejrzane.length === 0,
    opis: podejrzane.length === 0
      ? 'Brak zduplikowanej logiki wskaźników poza blokiem ENGINE.'
      : 'Zduplikowana logika poza ENGINE: ' + podejrzane.join(', ')
  };
}

// ---------- URUCHOMIENIE ----------

function main() {
  console.log('='.repeat(70));
  console.log('  GREENSTRAT — SKANER REGRESJI ZNANYCH BŁĘDÓW');
  console.log('  Workspace: ' + ROOT);
  console.log('='.repeat(70) + '\n');

  let znalezione = 0;
  let pominietePliki = [];

  const pliki = TARGETS
    .map(rel => ({ rel, abs: path.join(ROOT, rel) }))
    .filter(f => { if (!fs.existsSync(f.abs)) { pominietePliki.push(f.rel); return false; } return true; });

  if (pominietePliki.length) console.log('[INFO] Pominięto nieobecne pliki: ' + pominietePliki.join(', ') + '\n');

  console.log('--- KONTROLE SYGNATUROWE ---\n');

  for (const check of CHECKS) {
    const trafienia = [];
    let licznikGlowny = 0, licznikPary = 0;

    for (const f of pliki) {
      const linie = fs.readFileSync(f.abs, 'utf8').split('\n');
      linie.forEach((linia, i) => {
        if (check.wzorzec.test(linia)) {
          licznikGlowny++;
          if (check.wyjatek && check.wyjatek.test(linia)) return;
          if (check.oknoWyjatku) {
            const od = Math.max(0, i - check.oknoWyjatku.promien);
            const doo = Math.min(linie.length, i + check.oknoWyjatku.promien + 1);
            if (check.oknoWyjatku.wzorzec.test(linie.slice(od, doo).join('\n'))) return;
          }
          if (!check.parujZ) trafienia.push(`${f.rel}:${i + 1}  ${linia.trim().slice(0, 110)}`);
        }
        if (check.parujZ && check.parujZ.test(linia)) licznikPary++;
      });
    }

    if (check.parujZ) {
      const brakujace = licznikGlowny - licznikPary;
      if (brakujace > 0) {
        znalezione++;
        console.log(`[REGRESJA] ${check.id} — ${check.opis}`);
        console.log(`           ${check.opisParowania}: ${brakujace} (wystąpień: ${licznikGlowny}, sparowanych: ${licznikPary})\n`);
      } else {
        console.log(`[OK]       ${check.id} — ${check.opis}`);
      }
      continue;
    }

    if (trafienia.length) {
      znalezione++;
      console.log(`[REGRESJA] ${check.id} — ${check.opis}`);
      trafienia.slice(0, 5).forEach(t => console.log('           ' + t));
      if (trafienia.length > 5) console.log(`           ... oraz ${trafienia.length - 5} dalszych`);
      console.log('');
    } else {
      console.log(`[OK]       ${check.id} — ${check.opis}`);
    }
  }

  console.log('\n--- KONTROLE STRUKTURALNE ---\n');
  for (const fn of [sprawdzSpojnoscSnapshotu, sprawdzSynchronizacjeSilnika, sprawdzDuplikacjeFormul]) {
    const r = fn(ROOT);
    if (r.ok === null) console.log(`[POMIN]    ${r.id} — ${r.opis}`);
    else if (r.ok) console.log(`[OK]       ${r.id} — ${r.opis}`);
    else { znalezione++; console.log(`[REGRESJA] ${r.id} — ${r.opis}`); }
  }

  console.log('\n' + '='.repeat(70));
  if (znalezione === 0) {
    console.log('  WYNIK: brak wykrytych sygnatur znanych błędów [PASS]');
    console.log('  UWAGA: to nie dowodzi poprawności. Wykonaj kontrole MANUALNE');
    console.log('  z docs/WYCIAG_BLEDOW_I_WERYFIKACJA.md (sekcja 4).');
  } else {
    console.log(`  WYNIK: wykryto ${znalezione} sygnatur(y) znanych błędów [FAIL]`);
  }
  console.log('='.repeat(70));

  process.exit(znalezione === 0 ? 0 : 1);
}

main();
