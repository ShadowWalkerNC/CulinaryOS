import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { runDatabaseCli } from '../../packages/db/src/cli.ts';

describe('Database CLI credential boundaries', () => {
  it('never uses runtime credentials to apply migrations', async () => {
    const runtime = process.env.DATABASE_URL;
    const migration = process.env.DATABASE_MIGRATION_URL;
    process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/runtime_test';
    delete process.env.DATABASE_MIGRATION_URL;
    try { await assert.rejects(runDatabaseCli(['migrate', '--apply']), /DATABASE_MIGRATION_URL/); }
    finally {
      if (runtime === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = runtime;
      if (migration === undefined) delete process.env.DATABASE_MIGRATION_URL; else process.env.DATABASE_MIGRATION_URL = migration;
    }
  });
  it('plans without connecting or applying anything', async () => {
    const original = console.log;
    const output: string[] = [];
    console.log = (...values) => output.push(values.join(' '));
    try {
      await runDatabaseCli(['migrate']);
      const result = JSON.parse(output[0]!);
      assert.equal(result.applied, false);
      assert.ok(result.migrations.length >= 7);
      assert.ok(result.migrations.every((row: { checksum: string }) => /^[a-f0-9]{64}$/.test(row.checksum)));
    } finally { console.log = original; }
  });
  it('rejects unknown commands and options before database access', async () => {
    await assert.rejects(runDatabaseCli(['reset']), /Unknown database/);
    await assert.rejects(runDatabaseCli(['status', '--apply']), /Unknown database/);
    await assert.rejects(runDatabaseCli(['migrate', '--reset']), /Unknown database/);
  });
});