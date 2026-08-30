const { execSync } = require('child_process');
const path = require('path');

console.log('Building CulinaryOS Monorepo via Turborepo...');
try {
  const isWindows = process.platform === 'win32';
  const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';
  execSync(`${pnpmCmd} run build`, {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'inherit',
    shell: true,
  });
  console.log('Build completed successfully!');
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}

