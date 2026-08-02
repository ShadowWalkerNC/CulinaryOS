const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function findTestFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
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

const testFiles = [
  path.normalize('packages/ratio-engine/src/index.test.ts'),
  ...findTestFiles(path.normalize('tests'))
];

console.log(`Found ${testFiles.length} test files to run.\n`);

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  console.log(`========================================`);
  console.log(` Running: ${file}`);
  console.log(`========================================`);
  try {
    const output = execSync(`npx -y tsx@4.7.1 -r ./scripts/test-hook.cjs "${file}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    console.log(output);
    totalPassed++;
  } catch (err) {
    console.error(`FAILED: ${file}`);
    console.error(err.stdout || err.message);
    totalFailed++;
  }
}

console.log(`========================================`);
console.log(` TEST SUMMARY: ${totalPassed} passed, ${totalFailed} failed.`);
console.log(`========================================\n`);

if (totalFailed > 0) {
  process.exit(1);
}
