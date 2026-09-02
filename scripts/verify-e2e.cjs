const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findTestFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.turbo') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findTestFiles(filePath, fileList);
    } else if (file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const e2eFiles = findTestFiles(path.normalize('tests/e2e'));
console.log(`\n========================================`);
console.log(` RUNNING E2E TEST SUITES (${e2eFiles.length} files)`);
console.log(`========================================\n`);

let passed = 0;
let failed = 0;

for (const file of e2eFiles) {
  try {
    const output = execSync(`node -r ./scripts/test-hook.cjs --import tsx "${file}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    console.log(`✓ ${file}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAILED: ${file}`);
    console.error(err.stdout || err.message);
    failed++;
  }
}

console.log(`\n========================================`);
console.log(` E2E SUMMARY: ${passed} passed, ${failed} failed.`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
