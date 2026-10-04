import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'bun:test';
import { auditRlsCoverage, runDoctor } from '../../cli/src/commands/system.ts';

describe('Security doctor evidence boundaries', () => {
  it('fails source coverage when no migration directory exists', () => {
    const result = auditRlsCoverage([path.join(os.tmpdir(), `missing-migrations-${crypto.randomUUID()}`)]);
    assert.equal(result.ok, false);
    assert.equal(result.totalTables, 0);
    assert.equal(result.rlsTables, 0);
  });
  it('detects missing RLS statements rather than inventing coverage', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'culinaryos-doctor-'));
    const filename = path.join(directory, '001_fixture.sql');
    try {
      fs.writeFileSync(filename, 'CREATE TABLE public.protected_rows (id uuid); CREATE TABLE public.exposed_rows (id uuid); ALTER TABLE public.protected_rows ENABLE ROW LEVEL SECURITY;');
      const result = auditRlsCoverage([directory]);
      assert.equal(result.ok, false);
      assert.deepEqual(result.missing, ['exposed_rows']);
      assert.equal(result.totalTables, 2);
    } finally {
      fs.unlinkSync(filename);
      fs.rmdirSync(directory);
    }
  });
  it('never presents source/configuration checks as live isolation proof', async () => {
    const originalLog = console.log;
    const originalExitCode = process.exitCode;
    const captured: string[] = [];
    console.log = (...values: unknown[]) => captured.push(values.join(' '));
    try {
      await runDoctor('security');
      const output = captured.join('\n');
      assert.match(output, /NOT VERIFIED/);
      assert.match(output, /NOT RUN: durable replay/);
      assert.match(output, /NOT RUN: manager\/supervisor/);
      assert.doesNotMatch(output, /Security posture verified|No cross-tenant leak vectors detected|V1-V17 migrations verified/);
    } finally {
      console.log = originalLog;
      process.exitCode = originalExitCode;
    }
  });
});