const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

// Execute the real installer with isolated command doubles: no package downloads,
// browser launches, elevation, firewall changes or customer files are touched.
for (const failureAt of [0, 1, 2, 3, 4]) {
  test(failureAt ? `Windows setup stops at failed pnpm step ${failureAt}` : 'Windows setup reaches launch when all commands succeed', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'culinaryos-installer-'));
    try {
      writeFileSync(join(fixture, '.env'), 'SYNTHETIC_TEST_ONLY=1\n');
      const installer = resolve('scripts/install.ps1').replaceAll("'", "''");
      const wrapper = `
$global:setupCalls = 0
function node { $global:LASTEXITCODE = 0 }
function pnpm {
  $global:setupCalls++
  Write-Output "TEST_STEP_$global:setupCalls"
  $global:LASTEXITCODE = $(if ($global:setupCalls -eq ${failureAt}) { 37 } else { 0 })
}
& '${installer}'
Write-Output 'TEST_REACHED_END'
`;
      const result = spawnSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', wrapper], {
        cwd: fixture, encoding: 'utf8', timeout: 30000,
      });
      assert.ifError(result.error);
      const output = result.stdout + result.stderr;
      if (failureAt === 0) {
        assert.equal(result.status, 0, output);
        assert.match(output, /TEST_STEP_4/);
        assert.match(output, /TEST_REACHED_END/);
        return;
      }
      assert.notEqual(result.status, 0, output);
      assert.match(output, /Setup command failed/);
      assert.match(output, new RegExp(`TEST_STEP_${failureAt}`));
      assert.doesNotMatch(output, new RegExp(`TEST_STEP_${failureAt + 1}`));
      assert.doesNotMatch(output, /TEST_REACHED_END/);
      if (failureAt < 4) assert.doesNotMatch(output, /Development dependencies installed!/);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
}
