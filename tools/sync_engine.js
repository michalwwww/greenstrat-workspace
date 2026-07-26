const fs = require('fs');
const path = require('path');

function syncEngine() {
  const rootDir = path.resolve(__dirname, '..');
  const enginePath = path.join(rootDir, 'engine', 'greenstrat_engine.js');

  if (!fs.existsSync(enginePath)) {
    console.error(`[ERROR] Nie znaleziono pliku silnika: ${enginePath}`);
    process.exit(1);
  }

  const engineContent = fs.readFileSync(enginePath, 'utf8').trim();

  const targets = [
    {
      file: path.join(rootDir, 'src', 'gas', 'Code.gs'),
      extraCode: ''
    },
    {
      file: path.join(rootDir, 'src', 'gas', 'index.html'),
      extraCode: '\n\n// Aliasy wsteczne dla lokalnego interfejsu index.html\nvar calculateTask4Local = calculateTask4;\nvar calculateTask8Local = calculateTask8;'
    }
  ];

  let modifiedCount = 0;

  for (const target of targets) {
    if (!fs.existsSync(target.file)) {
      console.error(`[ERROR] Nie znaleziono pliku docelowego: ${target.file}`);
      process.exit(1);
    }

    const content = fs.readFileSync(target.file, 'utf8');

    const startMarker = '// ==ENGINE:START==';
    const endMarker = '// ==ENGINE:END==';

    const startCount = (content.split(startMarker).length - 1);
    const endCount = (content.split(endMarker).length - 1);

    if (startCount !== 1 || endCount !== 1) {
      console.error(`[ERROR] Nieprawidłowa liczba znaczników w pliku ${target.file}: START=${startCount}, END=${endCount}. Wymagany dokładnie 1 komplet znaczników!`);
      process.exit(1);
    }

    const startIndex = content.indexOf(startMarker) + startMarker.length;
    const endIndex = content.indexOf(endMarker);

    if (startIndex >= endIndex) {
      console.error(`[ERROR] Znacznik END znajduje się przed START w pliku ${target.file}`);
      process.exit(1);
    }

    const newEngineBlock = '\n' + engineContent + target.extraCode + '\n';
    const currentBlock = content.substring(startIndex, endIndex);

    if (currentBlock === newEngineBlock) {
      console.log(`[OK] Plik ${path.basename(target.file)} jest już aktualny (0 zmian).`);
      continue;
    }

    const updatedContent = content.substring(0, startIndex) + newEngineBlock + content.substring(endIndex);
    fs.writeFileSync(target.file, updatedContent, 'utf8');
    console.log(`[SYNCED] Zaktualizowano sekcję ENGINE w: ${path.basename(target.file)}`);
    modifiedCount++;
  }

  console.log(`[SUCCESS] Synchronizacja zakończona sukcesem. Zmodyfikowano plików: ${modifiedCount}.`);
}

syncEngine();
