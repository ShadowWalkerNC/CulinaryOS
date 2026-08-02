const { execSync } = require('child_process');
const fs = require('fs');

console.log('Running test runner via execSync...');
try {
  const out = execSync('node ./scripts/run-all-tests.cjs', { encoding: 'utf8' });
  fs.writeFileSync('test_results.log', out);
  console.log('SUCCESS: All tests completed.');
  console.log(out);
} catch (err) {
  const errOutput = (err.stdout || '') + '\n' + (err.stderr || err.message);
  fs.writeFileSync('test_results.log', errOutput);
  console.error('FAILURE: Test execution error.');
  console.error(errOutput);
}
