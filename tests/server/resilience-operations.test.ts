// ============================================================================
// CulinaryOS — R7/R8 resilience operations tests.
// Covers the capacity harness (scripts/resilience-capacity.ts) and the
// backup/restore rehearsal (scripts/resilience-recovery.ts): percentile
// accounting, concurrency accounting, loopback/test-database guardrails,
// write opt-in, path containment, scratch-name guards, and secret redaction.
// All load/database/process execution is faked; these tests prove harness
// accounting and guardrails, never production capacity or recovery.
// ============================================================================

import { afterEach, describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  DEFAULT_READ_ENDPOINTS,
  FIXTURE_OPT_IN_ENV,
  NON_PRODUCTION_DISCLAIMER as CAPACITY_DISCLAIMER,
  assertLoopbackUrl,
  buildCapacityPlan,
  percentile,
  redactSecrets as redactCapacity,
  runCapacityPlan,
  summarizeLatencies,
} from '../../scripts/resilience-capacity.ts';
import type { CapacityPlan, FetchLike } from '../../scripts/resilience-capacity.ts';
import {
  NON_PRODUCTION_DISCLAIMER as RECOVERY_DISCLAIMER,
  assertRehearsalRoot,
  assertTestDatabaseUrl,
  buildRecoveryPlan,
  generateScratchDbName,
  parseDatabaseTarget,
  quoteTable,
  redactSecrets as redactRecovery,
  runRecoveryPlan,
  verifyBinaries,
} from '../../scripts/resilience-recovery.ts';
import type { ExecLike } from '../../scripts/resilience-recovery.ts';

describe('capacity percentile accounting', () => {
  it('computes nearest-rank percentiles over 1..100', () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(samples, 50)).toBe(50);
    expect(percentile(samples, 95)).toBe(95);
    expect(percentile(samples, 99)).toBe(99);
    expect(percentile(samples, 100)).toBe(100);
  });

  it('returns the single sample for any percentile', () => {
    expect(percentile([7], 50)).toBe(7);
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([7], 100)).toBe(7);
  });

  it('rejects empty samples and out-of-range percentiles', () => {
    expect(() => percentile([], 50)).toThrow(/empty/);
    expect(() => percentile([1], 101)).toThrow(/\[0,100\]/);
    expect(() => percentile([1], -1)).toThrow(/\[0,100\]/);
    expect(() => percentile([1], Number.NaN)).toThrow(/\[0,100\]/);
  });

  it('summarizes count, extremes, mean, and percentiles', () => {
    const summary = summarizeLatencies([10, 20, 30, 40]);
    expect(summary.count).toBe(4);
    expect(summary.minMs).toBe(10);
    expect(summary.maxMs).toBe(40);
    expect(summary.meanMs).toBe(25);
    expect(summary.p50Ms).toBe(20);
    expect(summary.p95Ms).toBe(40);
    expect(summary.p99Ms).toBe(40);
  });

  it('rejects empty, negative, and non-finite latency samples', () => {
    expect(() => summarizeLatencies([])).toThrow(/zero samples/);
    expect(() => summarizeLatencies([5, -1])).toThrow(/Invalid latency/);
    expect(() => summarizeLatencies([Number.NaN])).toThrow(/Invalid latency/);
  });
});

describe('capacity target guardrails', () => {
  it('accepts loopback http(s) targets', () => {
    expect(assertLoopbackUrl('http://127.0.0.1:3000/x').hostname).toBe('127.0.0.1');
    expect(assertLoopbackUrl('http://localhost:3000').hostname).toBe('localhost');
    expect(assertLoopbackUrl('https://[::1]/health').hostname).toBe('[::1]');
  });

  it('refuses non-loopback hosts including LAN addresses', () => {
    expect(() => assertLoopbackUrl('http://example.com/')).toThrow(/non-local/);
    expect(() => assertLoopbackUrl('http://192.168.1.200:9100/')).toThrow(/non-local/);
    expect(() => assertLoopbackUrl('http://10.0.0.5/')).toThrow(/non-local/);
  });

  it('refuses credentials, non-http schemes, and malformed URLs', () => {
    expect(() => assertLoopbackUrl('http://user:pass@127.0.0.1/')).toThrow(/credentials/);
    expect(() => assertLoopbackUrl('ftp://127.0.0.1/')).toThrow(/http/);
    expect(() => assertLoopbackUrl('not a url')).toThrow(/Invalid target/);
  });

  it('defaults to a read-only plan with bounded knobs', () => {
    const plan = buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'local-api' });
    expect(plan.destructive).toBe(false);
    expect(plan.endpoints.length).toBe(4);
    expect(plan.endpoints.every((e) => e.method === 'GET')).toBe(true);
    expect(plan.requests).toBe(200);
    expect(plan.concurrency).toBe(10);
    expect(plan.tenantId).toBe('00000000-0000-0000-0000-000000000001');
  });

  it('keeps the default endpoint list read-only and rooted', () => {
    expect(DEFAULT_READ_ENDPOINTS.length).toBeGreaterThan(0);
    expect(DEFAULT_READ_ENDPOINTS.every((e) => e.method === 'GET')).toBe(true);
    expect(DEFAULT_READ_ENDPOINTS.every((e) => e.path.startsWith('/'))).toBe(true);
    expect(DEFAULT_READ_ENDPOINTS.some((e) => e.path === '/health')).toBe(true);
  });

  it('requires a target label, rooted paths, and bounded knobs', () => {
    expect(() => buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: '  ' })).toThrow(/targetLabel/);
    expect(() =>
      buildCapacityPlan({
        baseUrl: 'http://127.0.0.1:3000',
        targetLabel: 'x',
        endpoints: [{ method: 'GET', path: 'no-slash' }],
      }),
    ).toThrow(/start with "\/"/);
    expect(() =>
      buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'x', endpoints: [] }),
    ).toThrow(/At least one endpoint/);
    expect(() => buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'x', requests: 0 })).toThrow(
      /requests/,
    );
    expect(() => buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'x', concurrency: 300 })).toThrow(
      /concurrency/,
    );
    expect(() => buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'x', timeoutMs: 50 })).toThrow(
      /timeoutMs/,
    );
  });

  it('requires both allow-writes and the fixture opt-in for non-GET endpoints', () => {
    const post = [{ method: 'POST' as const, path: '/v1/fixture' }];
    expect(() =>
      buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'x', endpoints: post }),
    ).toThrow(/allow-writes/);
    expect(() =>
      buildCapacityPlan({
        baseUrl: 'http://127.0.0.1:3000',
        targetLabel: 'x',
        endpoints: post,
        allowWrites: true,
        fixturesOptIn: false,
      }),
    ).toThrow(/allow-writes/);
    expect(() =>
      buildCapacityPlan({
        baseUrl: 'http://127.0.0.1:3000',
        targetLabel: 'x',
        endpoints: post,
        allowWrites: false,
        fixturesOptIn: true,
      }),
    ).toThrow(/allow-writes/);
    const plan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:3000',
      targetLabel: 'x',
      endpoints: post,
      allowWrites: true,
      fixturesOptIn: true,
    });
    expect(plan.destructive).toBe(true);
  });

  it('pins the documented fixture opt-in variable name', () => {
    expect(FIXTURE_OPT_IN_ENV).toBe('RESILIENCE_FIXTURES');
  });
});

function makeClock() {
  let t = 1_000_000;
  return {
    clock: {
      now: () => t,
      sleep: async (ms: number) => {
        t += ms;
      },
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('capacity run accounting', () => {
  it('measures exact latencies sequentially with tenant header and status counts', async () => {
    const { clock, advance } = makeClock();
    const deltas: Record<string, number> = { '/a': 5, '/b': 15 };
    const seenTenants: string[] = [];
    const fetchImpl: FetchLike = async (url, init) => {
      const path = new URL(url).pathname;
      seenTenants.push(init.headers['X-Tenant-Id']);
      advance(deltas[path] ?? 1);
      return { status: path === '/b' ? 503 : 200, json: async () => ({}) };
    };
    const plan: CapacityPlan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:9',
      targetLabel: 'unit-fixture',
      requests: 4,
      concurrency: 1,
      endpoints: [
        { method: 'GET', path: '/a' },
        { method: 'GET', path: '/b' },
      ],
    });
    const report = await runCapacityPlan(plan, { fetchImpl, clock });
    expect(report.disclaimer).toBe(CAPACITY_DISCLAIMER);
    expect(report.disclaimer.includes('NOT')).toBe(true);
    expect(report.target.destructive).toBe(false);
    expect(report.http.attempted).toBe(4);
    expect(report.http.completed).toBe(4);
    expect(report.http.timeouts).toBe(0);
    expect(report.http.errors).toBe(0);
    expect(report.http.statusCounts).toEqual({ '200': 2, '503': 2 });
    expect(report.http.maxInFlight).toBe(1);
    expect(seenTenants.length).toBe(4);
    expect(seenTenants.every((t) => t === '00000000-0000-0000-0000-000000000001')).toBe(true);
    const latencies = report.http.latenciesMs;
    expect(latencies === null).toBe(false);
    if (latencies === null) throw new Error('expected latency summary');
    expect(latencies.count).toBe(4);
    expect(latencies.minMs).toBe(5);
    expect(latencies.maxMs).toBe(15);
    expect(latencies.meanMs).toBe(10);
    expect(latencies.p50Ms).toBe(5);
    expect(report.http.perEndpoint['GET /a'].count).toBe(2);
    expect(report.http.perEndpoint['GET /a'].maxMs).toBe(5);
    expect(report.http.perEndpoint['GET /b'].minMs).toBe(15);
    expect(report.queueAgeMs).toBeNull();
    expect(report.database.measured).toBe(false);
  });

  it('bounds in-flight work under concurrency and keeps exact counters', async () => {
    const { clock, advance } = makeClock();
    let observed = 0;
    let observedMax = 0;
    const fetchImpl: FetchLike = async (url) => {
      observed += 1;
      observedMax = Math.max(observedMax, observed);
      try {
        await new Promise((resolve) => setImmediate(resolve));
        const path = new URL(url).pathname;
        advance(path === '/b' ? 15 : 5);
        return { status: path === '/b' ? 503 : 200, json: async () => ({}) };
      } finally {
        observed -= 1;
      }
    };
    const plan: CapacityPlan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:9',
      targetLabel: 'concurrency-fixture',
      requests: 20,
      concurrency: 4,
      endpoints: [
        { method: 'GET', path: '/a' },
        { method: 'GET', path: '/b' },
      ],
    });
    const report = await runCapacityPlan(plan, { fetchImpl, clock });
    expect(report.http.attempted).toBe(20);
    expect(report.http.completed).toBe(20);
    expect(report.http.statusCounts).toEqual({ '200': 10, '503': 10 });
    // All four workers reach in-flight before any yielded fetch resolves.
    expect(report.http.maxInFlight).toBe(4);
    expect(observedMax).toBe(4);
    expect(report.http.perEndpoint['GET /a'].count).toBe(10);
    expect(report.http.perEndpoint['GET /b'].count).toBe(10);
    const latencies = report.http.latenciesMs;
    expect(latencies === null).toBe(false);
    if (latencies === null) throw new Error('expected latency summary');
    expect(latencies.count).toBe(20);
    expect(latencies.minMs).toBeGreaterThanOrEqual(5);
  });

  it('separates timeouts from errors and reports absent timings honestly', async () => {
    const { clock } = makeClock();
    const hanging: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const timeoutPlan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:9',
      targetLabel: 'timeout-fixture',
      requests: 3,
      concurrency: 3,
      timeoutMs: 100,
      endpoints: [{ method: 'GET', path: '/slow' }],
    });
    const timeoutReport = await runCapacityPlan(timeoutPlan, { fetchImpl: hanging, clock });
    expect(timeoutReport.http.attempted).toBe(3);
    expect(timeoutReport.http.completed).toBe(0);
    expect(timeoutReport.http.timeouts).toBe(3);
    expect(timeoutReport.http.errors).toBe(0);
    expect(timeoutReport.http.latenciesMs).toBeNull();

    const failing: FetchLike = async () => {
      throw new Error('connection refused');
    };
    const errorPlan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:9',
      targetLabel: 'error-fixture',
      requests: 4,
      concurrency: 2,
      endpoints: [{ method: 'GET', path: '/down' }],
    });
    const errorReport = await runCapacityPlan(errorPlan, { fetchImpl: failing, clock });
    expect(errorReport.http.completed).toBe(0);
    expect(errorReport.http.timeouts).toBe(0);
    expect(errorReport.http.errors).toBe(4);
    expect(errorReport.http.latenciesMs).toBeNull();
  });

  it('summarizes queue-age probes and reports absence as null', async () => {
    const { clock, advance } = makeClock();
    const probePath = '/probe/queue';
    const fetchImpl: FetchLike = async (url) => {
      advance(2);
      const path = new URL(url).pathname;
      if (path === probePath) return { status: 200, json: async () => ({ oldest_pending_age_ms: 250 }) };
      return { status: 200, json: async () => ({}) };
    };
    const plan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:9',
      targetLabel: 'probe-fixture',
      requests: 20,
      concurrency: 2,
      endpoints: [{ method: 'GET', path: '/a' }],
      queueAgeProbePath: probePath,
    });
    const report = await runCapacityPlan(plan, { fetchImpl, clock });
    expect(report.queueAgeMs === null).toBe(false);
    if (report.queueAgeMs === null) throw new Error('expected queue-age summary');
    expect(report.queueAgeMs.count).toBe(2);
    expect(report.queueAgeMs.minMs).toBe(250);
    expect(report.queueAgeMs.maxMs).toBe(250);

    const emptyProbe: FetchLike = async () => ({ status: 200, json: async () => ({ nope: true }) });
    const absent = await runCapacityPlan(plan, { fetchImpl: emptyProbe, clock });
    expect(absent.queueAgeMs).toBeNull();
  });

  it('aggregates injected database pool probes without fabricating data', async () => {
    const { clock, advance } = makeClock();
    const fetchImpl: FetchLike = async () => {
      advance(1);
      return { status: 200, json: async () => ({}) };
    };
    let calls = 0;
    const plan = buildCapacityPlan({
      baseUrl: 'http://127.0.0.1:9',
      targetLabel: 'db-probe-fixture',
      requests: 20,
      concurrency: 2,
      endpoints: [{ method: 'GET', path: '/a' }],
      databaseProbe: true,
    });
    const report = await runCapacityPlan(plan, {
      fetchImpl,
      clock,
      dbProbe: async () => {
        calls += 1;
        return { probeMs: 3 + calls, waitingCount: calls };
      },
    });
    expect(report.database.measured).toBe(true);
    expect(report.database.probes).toBe(2);
    expect(report.database.waitingMax).toBe(2);
    expect(report.database.latenciesMs === null).toBe(false);
    if (report.database.latenciesMs === null) throw new Error('expected db latency summary');
    expect(report.database.latenciesMs.count).toBe(2);
    expect(report.database.latenciesMs.minMs).toBe(4);
    expect(report.database.latenciesMs.maxMs).toBe(5);
  });
});

describe('capacity secret redaction', () => {
  it('redacts URL-embedded passwords', () => {
    const redacted = redactCapacity('postgresql://postgres:s3cret@127.0.0.1:5432/db');
    expect(redacted.includes('s3cret')).toBe(false);
    expect(redacted.includes('[REDACTED]')).toBe(true);
    expect(redacted.includes('127.0.0.1')).toBe(true);
  });

  it('redacts password-style assignments', () => {
    const redacted = redactCapacity('login failed password=hunter2 for user');
    expect(redacted.includes('hunter2')).toBe(false);
    expect(redacted.includes('[REDACTED]')).toBe(true);
  });

  it('leaves clean text untouched', () => {
    expect(redactCapacity('nothing sensitive here')).toBe('nothing sensitive here');
  });
});

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop() as string;
    rmSync(dir, { recursive: true, force: true });
  }
});

function trackTemp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function makeFakeBin(): string {
  const dir = trackTemp('rehearsal-bin-');
  const ext = process.platform === 'win32' ? '.exe' : '';
  for (const base of ['pg_dump', 'pg_restore', 'psql']) {
    writeFileSync(join(dir, base + ext), 'fake-binary');
  }
  return dir;
}

const TEST_DB_URL = 'postgresql://postgres:s3cret-pw@127.0.0.1:55432/culinaryos_verification';

describe('recovery database guardrails', () => {
  it('accepts loopback test-named databases', () => {
    for (const name of ['culinaryos_verification', 'orders_test', 'rehearsal_nightly', 'test_scratch', 'nightly_tmp']) {
      const url = assertTestDatabaseUrl(`postgresql://postgres@127.0.0.1:5432/${name}`);
      expect(url.hostname).toBe('127.0.0.1');
    }
    expect(assertTestDatabaseUrl('postgres://postgres@localhost:5432/rehearsal_x').hostname).toBe('localhost');
    const v6 = assertTestDatabaseUrl('postgresql://postgres@[::1]:5432/rehearsal_x');
    expect(parseDatabaseTarget(v6).host).toBe('::1');
  });

  it('refuses remote hosts, production names, wrong schemes, and garbage', () => {
    expect(() =>
      assertTestDatabaseUrl('postgresql://postgres:x@db.example.com:5432/culinaryos_verification'),
    ).toThrow(/loopback/);
    expect(() => assertTestDatabaseUrl('postgresql://postgres:x@192.168.1.10:5432/orders_test')).toThrow(/loopback/);
    expect(() => assertTestDatabaseUrl('postgresql://postgres:x@127.0.0.1:5432/restaurants')).toThrow(/test-named/);
    expect(() => assertTestDatabaseUrl('postgresql://postgres:x@127.0.0.1:5432/postgres')).toThrow(/test-named/);
    expect(() => assertTestDatabaseUrl('http://127.0.0.1:5432/culinaryos_verification')).toThrow(/postgres scheme/);
    expect(() => assertTestDatabaseUrl('garbage')).toThrow(/Invalid/);
  });

  it('keeps the rehearsal root temp-contained', () => {
    const inside = assertRehearsalRoot(join(tmpdir(), 'rehearsal-ok-123'));
    expect(inside.includes('rehearsal-ok-123')).toBe(true);
    expect(() => assertRehearsalRoot(process.cwd())).toThrow(/temp/);
    expect(() => assertRehearsalRoot(join(`${tmpdir()}-evil`, 'x'))).toThrow(/temp/);
    expect(() => assertRehearsalRoot(tmpdir())).toThrow(/itself/);
    expect(() => assertRehearsalRoot('   ')).toThrow(/empty/);
  });

  it('verifies binaries under the explicit directory only', () => {
    const binDir = makeFakeBin();
    const binaries = verifyBinaries(binDir);
    expect(binaries.pgDump.includes('pg_dump')).toBe(true);
    expect(binaries.pgRestore.includes('pg_restore')).toBe(true);
    expect(binaries.psql.includes('psql')).toBe(true);
    expect(() => verifyBinaries('   ')).toThrow(/bin-dir/);

    const partial = trackTemp('rehearsal-partial-');
    const ext = process.platform === 'win32' ? '.exe' : '';
    writeFileSync(join(partial, `pg_dump${ext}`), 'fake');
    writeFileSync(join(partial, `psql${ext}`), 'fake');
    expect(() => verifyBinaries(partial)).toThrow(/pg_restore/);
  });

  it('generates guarded scratch names and quotes only safe identifiers', () => {
    const first = generateScratchDbName(1_700_000_000_000);
    const second = generateScratchDbName(1_700_000_000_001);
    expect(/^rehearsal_scratch_[a-z0-9]+$/.test(first)).toBe(true);
    expect(first === second).toBe(false);
    expect(quoteTable('orders')).toBe('"public"."orders"');
    expect(() => quoteTable('orders; DROP TABLE orders')).toThrow(/unexpected table/);
    expect(() => quoteTable('public.orders')).toThrow(/unexpected table/);
    expect(() => quoteTable('')).toThrow(/unexpected table/);
  });

  it('builds plans only for labeled, guarded, temp-contained rehearsals', () => {
    const binDir = makeFakeBin();
    const root = join(trackTemp('rehearsal-root-'), 'run');
    const plan = buildRecoveryPlan({ binDir, databaseUrl: TEST_DB_URL, targetLabel: 'unit-fixture', rehearsalRoot: root });
    expect(plan.source.dbName).toBe('culinaryos_verification');
    expect(plan.source.port).toBe('55432');
    expect(plan.keepScratch).toBe(false);
    expect(/^rehearsal_scratch_[a-z0-9]+$/.test(plan.scratchDbName)).toBe(true);
    expect(plan.dumpFile.startsWith(plan.rehearsalRoot)).toBe(true);

    expect(() => buildRecoveryPlan({ binDir, databaseUrl: TEST_DB_URL, targetLabel: '  ' })).toThrow(/targetLabel/);
    expect(() =>
      buildRecoveryPlan({ binDir: join(trackTemp('rehearsal-empty-')), databaseUrl: TEST_DB_URL, targetLabel: 'x' }),
    ).toThrow(/not found/);
    expect(() =>
      buildRecoveryPlan({
        binDir,
        databaseUrl: 'postgresql://postgres:x@127.0.0.1:5432/restaurants',
        targetLabel: 'x',
      }),
    ).toThrow(/test-named/);
    expect(() =>
      buildRecoveryPlan({ binDir, databaseUrl: TEST_DB_URL, targetLabel: 'x', rehearsalRoot: process.cwd() }),
    ).toThrow(/temp/);
    expect(() =>
      buildRecoveryPlan({ binDir, databaseUrl: TEST_DB_URL, targetLabel: 'x', scratchDbName: 'orders_test' }),
    ).toThrow(/scratch/);
    expect(() =>
      buildRecoveryPlan({ binDir, databaseUrl: TEST_DB_URL, targetLabel: 'x', timeoutMs: 1000 }),
    ).toThrow(/timeoutMs/);
    expect(() =>
      buildRecoveryPlan({ binDir, databaseUrl: TEST_DB_URL, targetLabel: 'x', verifyTablesMax: 500 }),
    ).toThrow(/verifyTablesMax/);
  });
});

interface FakeRehearsal {
  exec: ExecLike;
  commands: string[];
}

function successExec(options: {
  dumpFile: string;
  sourceDb: string;
  tables: string[];
  counts: Record<string, string>;
  scratchTables?: string[];
}): FakeRehearsal {
  const commands: string[] = [];
  const exec: ExecLike = async (file, args) => {
    commands.push(`${file} ${args.join(' ')}`);
    if (file.endsWith('pg_dump') || file.endsWith('pg_dump.exe')) {
      writeFileSync(options.dumpFile, 'fake-dump-bytes');
      return { stdout: '', stderr: '' };
    }
    const cIndex = args.indexOf('-c');
    const sql = cIndex >= 0 ? args[cIndex + 1] : '';
    const dIndex = args.indexOf('-d');
    const db = dIndex >= 0 ? args[dIndex + 1] : '';
    if (sql.startsWith('SELECT tablename')) {
      const list = db === options.sourceDb ? options.tables : (options.scratchTables ?? options.tables);
      return { stdout: `${list.join('\n')}\n`, stderr: '' };
    }
    if (sql.startsWith('SELECT count(*)')) {
      const match = sql.match(/"public"\."([a-zA-Z0-9_]+)"/);
      const table = match ? match[1] : '';
      return { stdout: `${options.counts[table] ?? '0'}\n`, stderr: '' };
    }
    return { stdout: '', stderr: '' };
  };
  return { exec, commands };
}

describe('recovery rehearsal run', () => {
  it('verifies parity end to end and drops only the guarded scratch database', async () => {
    const binDir = makeFakeBin();
    const root = join(trackTemp('rehearsal-run-'), 'run');
    const plan = buildRecoveryPlan({
      binDir,
      databaseUrl: TEST_DB_URL,
      targetLabel: 'unit-fixture',
      rehearsalRoot: root,
    });
    const tables = ['items', 'orders'];
    const fake = successExec({ dumpFile: plan.dumpFile, sourceDb: 'culinaryos_verification', tables, counts: { items: '40', orders: '12' } });
    const report = await runRecoveryPlan(plan, { execImpl: fake.exec });

    expect(report.disclaimer).toBe(RECOVERY_DISCLAIMER);
    expect(report.verified).toBe(true);
    expect(report.steps.map((s) => `${s.name}:${s.status}`).join(',')).toBe(
      'prepare-root:pass,dump-source:pass,create-scratch:pass,restore-scratch:pass,verify-parity:pass,drop-scratch:pass',
    );
    expect(report.scratchDisposition).toBe('dropped');
    expect(report.dump === null).toBe(false);
    if (report.dump === null) throw new Error('expected dump record');
    expect(report.dump.bytes).toBe('fake-dump-bytes'.length);
    expect(report.dump.sha256).toBe(createHash('sha256').update('fake-dump-bytes').digest('hex'));
    expect(report.parity.skipped).toBe(false);
    expect(report.parity.tablesCompared).toBe(2);
    expect(report.parity.tablesMatched).toBe(2);
    expect(report.parity.rowCountsCompared).toBe(2);
    expect(report.parity.rowCountsMatched).toBe(2);
    expect(report.limits.length).toBeGreaterThan(0);

    const drops = fake.commands.filter((c) => c.includes('DROP DATABASE'));
    expect(drops.length).toBe(1);
    expect(drops[0].includes(plan.scratchDbName)).toBe(true);
    expect(drops[0].includes('culinaryos_verification')).toBe(false);
    expect(fake.commands.some((c) => c.includes('DROP DATABASE "culinaryos_verification"'))).toBe(false);

    const rendered = JSON.stringify(report);
    expect(rendered.includes('s3cret-pw')).toBe(false);
    expect(rendered.includes('[REDACTED]') || rendered.includes('culinaryos_verification')).toBe(true);
    for (const step of report.steps) {
      expect(step.command.includes('s3cret-pw')).toBe(false);
      expect(step.detail.includes('s3cret-pw')).toBe(false);
    }
    expect(existsSync(plan.reportFile)).toBe(true);
    expect(existsSync(join(plan.rehearsalRoot, 'plan.json'))).toBe(true);
    const planFile = readFileSync(join(plan.rehearsalRoot, 'plan.json'), 'utf8');
    expect(planFile.includes('s3cret-pw')).toBe(false);
  });

  it('fails closed on parity mismatch yet still drops its scratch database', async () => {
    const binDir = makeFakeBin();
    const root = join(trackTemp('rehearsal-mismatch-'), 'run');
    const plan = buildRecoveryPlan({
      binDir,
      databaseUrl: TEST_DB_URL,
      targetLabel: 'mismatch-fixture',
      rehearsalRoot: root,
    });
    const fake = successExec({
      dumpFile: plan.dumpFile,
      sourceDb: 'culinaryos_verification',
      tables: ['items', 'orders'],
      counts: { items: '40', orders: '12' },
      scratchTables: ['items'],
    });
    const report = await runRecoveryPlan(plan, { execImpl: fake.exec });
    expect(report.verified).toBe(false);
    expect(report.parity.skipped).toBe(false);
    expect(report.parity.sourceOnly).toEqual(['orders']);
    const verify = report.steps.find((s) => s.name === 'verify-parity');
    expect(verify === undefined).toBe(false);
    expect(verify?.status).toBe('fail');
    expect(report.scratchDisposition).toBe('dropped');
  });

  it('retains the scratch database only with the explicit keep flag', async () => {
    const binDir = makeFakeBin();
    const root = join(trackTemp('rehearsal-keep-'), 'run');
    const plan = buildRecoveryPlan({
      binDir,
      databaseUrl: TEST_DB_URL,
      targetLabel: 'keep-fixture',
      rehearsalRoot: root,
      keepScratch: true,
    });
    const fake = successExec({
      dumpFile: plan.dumpFile,
      sourceDb: 'culinaryos_verification',
      tables: ['items'],
      counts: { items: '1' },
    });
    const report = await runRecoveryPlan(plan, { execImpl: fake.exec });
    expect(report.verified).toBe(true);
    expect(report.scratchDisposition).toBe('kept');
    expect(fake.commands.some((c) => c.includes('DROP DATABASE'))).toBe(false);
    const drop = report.steps.find((s) => s.name === 'drop-scratch');
    expect(drop?.status).toBe('skipped');
  });

  it('skips later steps when the dump fails and creates nothing', async () => {
    const binDir = makeFakeBin();
    const root = join(trackTemp('rehearsal-dumpfail-'), 'run');
    const plan = buildRecoveryPlan({
      binDir,
      databaseUrl: TEST_DB_URL,
      targetLabel: 'dumpfail-fixture',
      rehearsalRoot: root,
    });
    const commands: string[] = [];
    const exec: ExecLike = async (file, args) => {
      commands.push(`${file} ${args.join(' ')}`);
      throw new Error('pg_dump exploded: password=hunter2');
    };
    const report = await runRecoveryPlan(plan, { execImpl: exec });
    expect(report.verified).toBe(false);
    expect(report.dump).toBeNull();
    expect(report.parity.skipped).toBe(true);
    expect(report.scratchDisposition).toBe('never-created');
    expect(report.steps.map((s) => `${s.name}:${s.status}`).join(',')).toBe(
      'prepare-root:pass,dump-source:fail,create-scratch:skipped,restore-scratch:skipped,verify-parity:skipped',
    );
    expect(commands.some((c) => c.includes('CREATE DATABASE'))).toBe(false);
    const rendered = JSON.stringify(report);
    expect(rendered.includes('hunter2')).toBe(false);
    expect(rendered.includes('[REDACTED]')).toBe(true);
  });
});

describe('recovery secret redaction', () => {
  it('redacts URL-embedded passwords', () => {
    const redacted = redactRecovery('postgresql://postgres:s3cret@127.0.0.1:5432/db');
    expect(redacted.includes('s3cret')).toBe(false);
    expect(redacted.includes('[REDACTED]')).toBe(true);
  });

  it('redacts password-style assignments', () => {
    const redacted = redactRecovery('command failed: PGPASSWORD=hunter2 rejected');
    expect(redacted.includes('hunter2')).toBe(false);
    expect(redacted.includes('[REDACTED]')).toBe(true);
  });

  it('leaves clean text untouched', () => {
    expect(redactRecovery('nothing sensitive here')).toBe('nothing sensitive here');
  });
});

// Independent integration review: a local server must not redirect the
// measurement tool to an external destination (including queue-age probes).
describe('capacity redirect containment', () => {
  it('requests redirect rejection for workload and queue probes', async () => {
    const settings: string[] = [];
    const plan = buildCapacityPlan({ baseUrl: 'http://127.0.0.1:3000', targetLabel: 'redirect-fixture', requests: 2, concurrency: 1, endpoints: [{ method: 'GET', path: '/redirect' }], queueAgeProbePath: '/queue' });
    const report = await runCapacityPlan(plan, { fetchImpl: async (_url, init) => {
      settings.push(init.redirect);
      return { status: 200, json: async () => ({ oldest_pending_age_ms: 10 }) };
    } });
    expect(settings.length).toBe(3);
    expect(settings.every(value => value === 'error')).toBe(true);
    expect(report.http.completed).toBe(2);
  });
});
