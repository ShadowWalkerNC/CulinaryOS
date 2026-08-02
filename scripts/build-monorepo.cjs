const { execSync } = require('child_process');
const path = require('path');

console.log('Building CulinaryOS Monorepo via Turborepo...');
try {
  const output = execSync('npx.cmd pnpm@9 run build', {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'inherit',
    shell: 'cmd.exe'
  });
  console.log('Build completed successfully!');
} catch (err) {
  console.error('Build failed:', err.message);
  process.exit(1);
}
