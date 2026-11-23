import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AGENT_CENTER_DEFAULTS,
  CorruptStoreError,
  ValidationError,
  assertSafeIdentifier,
  atomicWriteJson,
  createAgentCenter,
  mkTempDataDir,
  readJsonSafe,
  readJsonlSafe,
  resolveDataDir,
  withStoreLock,
} from '../src/index.js';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, '..', '..', '..');
const TEST_HOOK_PATH = path.join(REPO_ROOT, 'scripts', 'test-hook.cjs');
const LOCK_SRC_PATH = path.resolve(THIS_DIR, '..', 'src', 'storage', 'lock.ts');
const ATOMIC_FS_SRC_PATH = path.resolve(THIS_DIR, '..', 'src', 'storage', 'atomic-fs.ts');

describe('Storage: Atomic FS & Two-Tier Locking', () => {
  it('resolves dataDir from explicit option, AGENT_CENTER_DATA_DIR, or default', () => {
    const prev = process.env[AGENT_CENTER_DEFAULTS.DATA_DIR_ENV];
    try {
      delete process.env[AGENT_CENTER_DEFAULTS.DATA_DIR_ENV];
      assert.equal(
        resolveDataDir(),
        path.resolve(process.cwd(), AGENT_CENTER_DEFAULTS.DEFAULT_DATA_DIR),
      );

      process.env[AGENT_CENTER_DEFAULTS.DATA_DIR_ENV] = './custom-env-dir';
      assert.equal(resolveDataDir(), path.resolve('./custom-env-dir'));
      assert.equal(resolveDataDir('./explicit-dir'), path.resolve('./explicit-dir'));
    } finally {
      if (prev === undefined) {
        delete process.env[AGENT_CENTER_DEFAULTS.DATA_DIR_ENV];
      } else {
        process.env[AGENT_CENTER_DEFAULTS.DATA_DIR_ENV] = prev;
      }
    }
  });

  it('strips UTF-8 BOM on JSON read and throws CorruptStoreError without wiping corrupt files', async () => {
    const dir = await mkTempDataDir('ac-atomic-');
    try {
      const bomFile = path.join(dir, 'bom.json');
      await fs.writeFile(bomFile, '\uFEFF{"ok":true,"count":7}\n', 'utf8');
      const parsed = await readJsonSafe<{ ok: boolean; count: number }>(bomFile, {
        ok: false,
        count: 0,
      });
      assert.deepEqual(parsed, { ok: true, count: 7 });

      const corruptJson = path.join(dir, 'corrupt.json');
      await fs.writeFile(corruptJson, '{broken_json', 'utf8');
      await assert.rejects(() => readJsonSafe(corruptJson, {}), CorruptStoreError);
      assert.equal(await fs.readFile(corruptJson, 'utf8'), '{broken_json');

      const corruptJsonl = path.join(dir, 'corrupt.jsonl');
      await fs.writeFile(corruptJsonl, '{"a":1}\n{bad_line\n', 'utf8');
      await assert.rejects(() => readJsonlSafe(corruptJsonl), CorruptStoreError);
      assert.equal(await fs.readFile(corruptJsonl, 'utf8'), '{"a":1}\n{bad_line\n');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('retries Windows EPERM/EBUSY/EACCES on atomic rename and cleans up tmp on fatal error', async () => {
    const dir = await mkTempDataDir('ac-rename-');
    try {
      const target = path.join(dir, 'state.json');
      let attempts = 0;

      await atomicWriteJson(
        target,
        { saved: 1 },
        {
          baseDelayMs: 5,
          maxRenameAttempts: 5,
          renameFn: async (fromPath, toPath) => {
            attempts += 1;
            if (attempts <= 2) {
              const err = new Error('Simulated AV lock') as NodeJS.ErrnoException;
              err.code = attempts === 1 ? 'EPERM' : 'EBUSY';
              throw err;
            }
            await fs.rename(fromPath, toPath);
          },
        },
      );

      assert.equal(attempts, 3);
      const loaded = await readJsonSafe<{ saved: number }>(target, { saved: 0 });
      assert.equal(loaded.saved, 1);

      await assert.rejects(
        () =>
          atomicWriteJson(
            target,
            { saved: 2 },
            {
              baseDelayMs: 2,
              maxRenameAttempts: 2,
              renameFn: async () => {
                const err = new Error('Fatal permission denied') as NodeJS.ErrnoException;
                err.code = 'EACCES';
                throw err;
              },
            },
          ),
        (err: unknown) => (err as NodeJS.ErrnoException).code === 'EACCES',
      );

      const files = await fs.readdir(dir);
      assert.deepEqual(files, ['state.json']);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('serializes in-process concurrent updates and evicts dead-PID and expired stale locks', async () => {
    const dir = await mkTempDataDir('ac-lock-');
    try {
      const counterPath = path.join(dir, 'counter.json');
      await atomicWriteJson(counterPath, { count: 0 });

      await Promise.all(
        Array.from({ length: 15 }, () =>
          withStoreLock(dir, 'counter', async () => {
            const cur = await readJsonSafe<{ count: number }>(counterPath, { count: 0 });
            await new Promise((r) => setTimeout(r, 2));
            await atomicWriteJson(counterPath, { count: cur.count + 1 });
          }),
        ),
      );
      const after = await readJsonSafe<{ count: number }>(counterPath, { count: 0 });
      assert.equal(after.count, 15);

      // Dead-PID stale lock eviction
      const locksDir = path.join(dir, 'locks');
      await fs.mkdir(locksDir, { recursive: true });
      const deadLockPath = path.join(locksDir, 'dead_key.lock');
      await fs.writeFile(
        deadLockPath,
        JSON.stringify({ pid: 99999999, acquiredAt: Date.now(), nonce: 'dead', key: 'dead_key' }),
        'utf8',
      );
      const res1 = await withStoreLock(dir, 'dead_key', async () => 'acquired_after_dead_evict');
      assert.equal(res1, 'acquired_after_dead_evict');

      // Expired timestamp stale lock eviction (even with live PID)
      const agedLockPath = path.join(locksDir, 'aged_key.lock');
      await fs.writeFile(
        agedLockPath,
        JSON.stringify({
          pid: process.pid,
          acquiredAt: Date.now() - 60_000,
          nonce: 'aged',
          key: 'aged_key',
        }),
        'utf8',
      );
      const res2 = await withStoreLock(
        dir,
        'aged_key',
        async () => 'acquired_after_age_evict',
        { staleLockMs: 500 },
      );
      assert.equal(res2, 'acquired_after_age_evict');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('prevents lost updates across real spawned child Node processes contending on the same lock', async () => {
    const dir = await mkTempDataDir('ac-multiproc-');
    try {
      const targetFile = path.join(dir, 'shared-counter.json');
      await atomicWriteJson(targetFile, { count: 0, writers: [] as number[] });

      const workerScriptPath = path.join(dir, 'worker.ts');
      const lockImportUrl = new URL(`file:///${LOCK_SRC_PATH.replace(/\\/g, '/')}`).href;
      const fsImportUrl = new URL(`file:///${ATOMIC_FS_SRC_PATH.replace(/\\/g, '/')}`).href;

      const workerSource = `
import { withStoreLock } from ${JSON.stringify(lockImportUrl)};
import { atomicWriteJson, readJsonSafe } from ${JSON.stringify(fsImportUrl)};

const [dataDir, targetFile, iterationsStr] = process.argv.slice(2);
const iterations = Number(iterationsStr);

async function run() {
  for (let i = 0; i < iterations; i++) {
    await withStoreLock(dataDir, 'shared_counter', async () => {
      const current = await readJsonSafe<{ count: number; writers: number[] }>(
        targetFile,
        { count: 0, writers: [] },
      );
      await new Promise((r) => setTimeout(r, 8));
      await atomicWriteJson(targetFile, {
        count: current.count + 1,
        writers: [...current.writers, process.pid],
      });
    }, { timeoutMs: 15000, pollIntervalMs: 10 });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;
      await fs.writeFile(workerScriptPath, workerSource, 'utf8');

      const childCount = 4;
      const iterationsPerChild = 5;

      const runChild = (): Promise<void> =>
        new Promise((resolve, reject) => {
          const child = spawn(
            process.execPath,
            ['-r', TEST_HOOK_PATH, '--import', 'tsx', workerScriptPath, dir, targetFile, String(iterationsPerChild)],
            { stdio: ['ignore', 'pipe', 'pipe'] },
          );
          let stderr = '';
          child.stderr.on('data', (chunk) => {
            stderr += String(chunk);
          });
          child.on('error', reject);
          child.on('exit', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Child exited with code ${code}: ${stderr}`));
            }
          });
        });

      await Promise.all(Array.from({ length: childCount }, () => runChild()));

      const finalState = await readJsonSafe<{ count: number; writers: number[] }>(targetFile, {
        count: 0,
        writers: [],
      });
      assert.equal(finalState.count, childCount * iterationsPerChild);
      assert.equal(finalState.writers.length, childCount * iterationsPerChild);
      assert.ok(new Set(finalState.writers).size >= 2);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects path-traversal identifiers and prevents racing stale-lock eviction from deleting fresh locks', async () => {
    assert.equal(assertSafeIdentifier('MSN-01_a.b', 'mission_id'), 'MSN-01_a.b');
    for (const bad of ['', '.', '..', '../evil', 'a/b', 'a\\b', '.hidden', 'has space']) {
      assert.throws(() => assertSafeIdentifier(bad, 'mission_id'), ValidationError);
    }

    const dir = await mkTempDataDir('ac-safe-id-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      await assert.rejects(() => ac.tasks.getMission('../escape'), ValidationError);
      await assert.rejects(
        () => ac.checkpoints.getLatestCheckpoint('MSN-1', '..\\evil'),
        ValidationError,
      );
      await assert.rejects(() => ac.ledger.query({ mission_id: 'a/b' }), ValidationError);
      await assert.rejects(() => ac.budget.getBudgetStatus('.dot'), ValidationError);
      await assert.rejects(() => ac.governance.listApprovals('../x'), ValidationError);

      // Concurrent stale-lock eviction race: 6 concurrent contenders on one expired lock
      const locksDir = path.join(dir, 'locks');
      await fs.mkdir(locksDir, { recursive: true });
      const lockPath = path.join(locksDir, 'race_key.lock');
      await fs.writeFile(
        lockPath,
        JSON.stringify({ pid: 99999998, acquiredAt: Date.now() - 60_000, nonce: 'stale', key: 'race_key' }),
        'utf8',
      );
      const sharedPath = path.join(dir, 'race-counter.json');
      await atomicWriteJson(sharedPath, { count: 0 });

      await Promise.all(
        Array.from({ length: 6 }, () =>
          withStoreLock(
            dir,
            'race_key',
            async () => {
              const cur = await readJsonSafe<{ count: number }>(sharedPath, { count: 0 });
              await new Promise((r) => setTimeout(r, 15));
              await atomicWriteJson(sharedPath, { count: cur.count + 1 });
            },
            { staleLockMs: 500, timeoutMs: 10_000 },
          ),
        ),
      );
      const res = await readJsonSafe<{ count: number }>(sharedPath, { count: 0 });
      assert.equal(res.count, 6);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
