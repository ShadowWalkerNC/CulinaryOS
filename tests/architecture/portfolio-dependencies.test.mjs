import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importsFromSource, checkPackageAppBoundary } from '../../scripts/check-portfolio-dependencies.mjs';
if (!process.env.FOUNDATION_TYPESCRIPT) throw new Error('Set FOUNDATION_TYPESCRIPT to an existing TypeScript module.');
const ts = createRequire(import.meta.url)(process.env.FOUNDATION_TYPESCRIPT);
test('AST distinguishes imports from comments and ordinary strings', () => {
  const result = importsFromSource(ts, `// import x from 'fake';\nconst text="require('fake')";\nexport {x} from 'real';\nimport y = require('legacy');\nimport('dynamic');\nrequire(name);`, 'sample.ts');
  assert.deepEqual(result.map(item => item.specifier), ['real', 'legacy', 'dynamic', null]);
});
test('package boundary rejects app package, relative and alias imports; unresolved is incomplete', async () => {
  const root = await mkdtemp(join(tmpdir(), 'culinary-foundation-'));
  try {
    for (const path of ['apps/pos/src', 'packages/shared/src']) await mkdir(join(root, path), { recursive: true });
    await writeFile(join(root, 'apps/pos/package.json'), JSON.stringify({ name: '@fixture/pos' }));
    await writeFile(join(root, 'apps/pos/src/index.ts'), 'export const value = 1;');
    await writeFile(join(root, 'packages/shared/package.json'), JSON.stringify({ name: '@fixture/shared' }));
    await writeFile(join(root, 'packages/shared/tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@app/*': ['../../apps/pos/src/*'] }, moduleResolution: 'bundler' }, include: ['src'] }));
    const source = join(root, 'packages/shared/src/index.ts');
    await writeFile(source, `import '@fixture/pos'; export * from '../../../apps/pos/src/index'; import '@app/index';`);
    const failed = await checkPackageAppBoundary(root, ts);
    assert.equal(failed.status, 'FAIL'); assert.equal(failed.violations.length, 3);
    await writeFile(source, `import './missing';`);
    assert.equal((await checkPackageAppBoundary(root, ts)).status, 'INCOMPLETE');
    await writeFile(source, `// import '@fixture/pos';\nexport const safe=1;`);
    assert.equal((await checkPackageAppBoundary(root, ts)).status, 'PASS');
  } finally { await rm(root, { recursive: true, force: true }); }
});
