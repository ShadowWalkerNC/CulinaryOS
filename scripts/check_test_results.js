import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

const failed = [];

for (const file of testFiles) {
  try {
    execSync(`npx tsx@4.7.1 -r ./scripts/test-hook.cjs "${file}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (err) {
    failed.push({ file, err: err.stderr || err.stdout || err.message });
  }
}

console.log('Failed tests:', failed);
