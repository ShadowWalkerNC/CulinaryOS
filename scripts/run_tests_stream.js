const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'test_output.log');
const outStream = fs.createWriteStream(logFile, { flags: 'w' });

console.log('Starting streaming test run to:', logFile);

const child = spawn('node', ['./scripts/run-all-tests.cjs'], {
  cwd: path.join(__dirname, '..')
});

child.stdout.on('data', (data) => {
  outStream.write(data);
});

child.stderr.on('data', (data) => {
  outStream.write(data);
});

child.on('close', (code) => {
  outStream.write(`\nPROCESS EXITED WITH CODE: ${code}\n`);
  outStream.end();
  console.log(`Test run completed with exit code: ${code}`);
});
