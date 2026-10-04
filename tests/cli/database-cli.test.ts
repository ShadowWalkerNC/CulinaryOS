import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { runDatabaseCli } from '../../packages/db/src/cli.ts';

describe('Database CLI commands', () => {
  it('prints help with migrate, status, and check-role', async () => {
    const originalLog = console.log;
    const captured: string[] = [];
    console.log = (...values: unknown[]) => captured.push(values.join(' '));
    try {
      await runDatabaseCli(['help']);
      const output = captured.join('\n');
      assert.ok(output.includes('database migrate [--apply] | status | check-role'));
      assert.ok(output.includes('DATABASE_MIGRATION_URL'));
      assert.ok(output.includes('status/check-role read DATABASE_URL'));
    } finally {
      console.log = originalLog;
    }
  });

  it('plans migrations by default without --apply', async () => {
    const originalLog = console.log;
    const captured: string[] = [];
    console.log = (...values: unknown[]) => captured.push(values.join(' '));
    try {
      await runDatabaseCli(['migrate']);
      const output = captured.join('\n');
      const plan = JSON.parse(output) as { applied: boolean; migrations: { version: string }[] };
      assert.equal(plan.applied, false);
      assert.ok(plan.migrations.length >= 8);
      assert.equal(plan.migrations[0]?.version, '001');
    } finally {
      console.log = originalLog;
    }
  });

  it('requires DATABASE_MIGRATION_URL for apply and never falls back to runtime URL', async () => {
    const savedMig = process.env.DATABASE_MIGRATION_URL;
    const savedDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_MIGRATION_URL;
    process.env.DATABASE_URL = 'postgres://runtime_user:secret@localhost:5432/db';
    try {
      await assert.rejects(
        async () => runDatabaseCli(['migrate', '--apply']),
        /DATABASE_MIGRATION_URL is required/
      );
    } finally {
      if (savedMig !== undefined) process.env.DATABASE_MIGRATION_URL = savedMig;
      else delete process.env.DATABASE_MIGRATION_URL;
      if (savedDb !== undefined) process.env.DATABASE_URL = savedDb;
      else delete process.env.DATABASE_URL;
    }
  });

  it('requires DATABASE_URL for check-role and status', async () => {
    const savedDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await assert.rejects(
        async () => runDatabaseCli(['status']),
        /DATABASE_URL is required for status/
      );
      await assert.rejects(
        async () => runDatabaseCli(['check-role']),
        /DATABASE_URL is required for check-role/
      );
    } finally {
      if (savedDb !== undefined) process.env.DATABASE_URL = savedDb;
      else delete process.env.DATABASE_URL;
    }
  });

  it('rejects unknown commands and options', async () => {
    await assert.rejects(
      async () => runDatabaseCli(['drop-database']),
      /Unknown database command/
    );
    await assert.rejects(
      async () => runDatabaseCli(['migrate', '--force']),
      /Unknown database option/
    );
  });
});
