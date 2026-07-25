import { execSync } from 'node:child_process';
import glob from 'fast-glob';

const testFiles = [
  'packages/ratio-engine/src/index.test.ts',
  ...glob.sync('tests/**/*.test.ts')
];

console.log(`Found ${testFiles.length} test files to run.\n`);

let totalPassed = 0;
let totalFailed = 0;

for (const file of testFiles) {
  console.log(`========================================`);
  console.log(` Running: ${file}`);
  console.log(`========================================`);
  try {
    const output = execSync(`npx tsx@4.7.1 -r ./scripts/test-hook.cjs ${file}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(output);
    totalPassed++;
  } catch (err) {
    console.error(`FAILED: ${file}`);
    console.error(err.stdout || err.message);
    totalFailed++;
  }
}

console.log(`\n========================================`);
console.log(` TEST SUMMARY: ${totalPassed} passed, ${totalFailed} failed.`);
console.log(`========================================\n`);

if (totalFailed > 0) {
  process.exit(1);
}
