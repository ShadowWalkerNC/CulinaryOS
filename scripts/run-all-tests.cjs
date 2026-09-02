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

const testFiles = [
  ...findTestFiles(path.normalize('packages')),
  ...findTestFiles(path.normalize('tests'))
];

console.log(`Found ${testFiles.length} test files to run.\n`);

let totalPassed = 0;
let totalFailed = 0;

if (!process.env.ESBUILD_BINARY_PATH) {
  const pnpmDir = path.resolve(__dirname, '..', 'node_modules', '.pnpm');
  if (fs.existsSync(pnpmDir)) {
    const entries = fs.readdirSync(pnpmDir);
    const platformEntries = entries.filter(e => e.startsWith('@esbuild+win32-x64@') || e.startsWith('@esbuild+'));
    platformEntries.sort().reverse();
    for (const entry of platformEntries) {
      const parts = entry.split('@');
      const pkgName = parts[1]?.split('+')[0] || (process.platform === 'win32' ? 'win32-x64' : process.platform + '-' + process.arch);
      const ext = process.platform === 'win32' ? 'esbuild.exe' : 'esbuild';
      const candidate = path.join(pnpmDir, entry, 'node_modules', '@esbuild', pkgName, ext);
      if (fs.existsSync(candidate)) {
        process.env.ESBUILD_BINARY_PATH = candidate;
        break;
      }
    }
  }
}

for (const file of testFiles) {
  console.log(`========================================`);
  console.log(` Running: ${file}`);
  console.log(`========================================`);
  try {
    const output = execSync(`node -r ./scripts/test-hook.cjs --import tsx "${file}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
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
