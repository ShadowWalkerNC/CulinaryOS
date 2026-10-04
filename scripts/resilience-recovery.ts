// ============================================================================
// CulinaryOS — R8 isolated backup/restore rehearsal.
// Dumps an EXPLICIT TEST database with explicit PostgreSQL binaries, restores
// into a generated scratch database, and verifies table-inventory + row-count
// parity. All artifacts stay inside a temp-contained rehearsal root.
// This file is self-contained (no repo imports) so it runs standalone via
// `tsx scripts/resilience-recovery.ts` and stays decoupled from in-flight
// DB/offline tasks. Guard helpers are intentionally duplicated (not shared)
// with scripts/resilience-capacity.ts for the same reason.
//
// SYNTHETIC LOCAL REHEARSAL ONLY. Output is never a production recovery
// certification: see NON_PRODUCTION_DISCLAIMER, echoed into every report.
// NEVER points at production: loopback test-named databases only, no resets
// of any pre-existing database, and the only DROP ever issued targets the
// generated scratch database this run created.
// ============================================================================

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

export const NON_PRODUCTION_DISCLAIMER =
  'SYNTHETIC LOCAL REHEARSAL ONLY — this report describes an isolated ' +
  'backup/restore rehearsal against an explicitly configured local test ' +
  'database. It is NOT a production disaster-recovery certification, NOT a ' +
  'durability proof under real failure modes, and NOT evidence of production ' +
  'backup integrity, retention, or restore-time behavior.';

export class ResilienceGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResilienceGuardError';
  }
}

/** Redact URL-embedded passwords and password-style key=value pairs. */
export function redactSecrets(text: string): string {
  return text
    .replace(/(\b[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/\s:@]+:)([^@/\s]+)(@)/g, '$1[REDACTED]$3')
    .replace(/((?:password|passwd|pwd|secret|token)\s*[:=]\s*)([^\s&;"']+)/gi, '$1[REDACTED]');
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

/**
 * WHATWG URLs keep IPv6 brackets in `hostname` (`[::1]`), so strip one pair
 * before comparing against the loopback set.
 */
function isLoopbackHostname(hostname: string): boolean {
  const bare = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  return LOOPBACK_HOSTS.has(bare.toLowerCase());
}

/** Strip URL brackets so CLI flags receive a bare host (`-h ::1`, not `-h [::1]`). */
function bareHostname(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

const TEST_DB_NAME_RE =
  /^(culinaryos_verification|rehearsal_[a-z0-9_]+|(test|rehearsal)_[a-z0-9_]*|[a-z0-9_]+_(test|rehearsal|verification|tmp))$/;

/** Only names from the generator below may ever be created or dropped. */
const SCRATCH_DB_NAME_RE = /^rehearsal_scratch_[a-z0-9]+$/;

const TABLE_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Require an explicit local (loopback) postgres URL with a test-only name. */
export function assertTestDatabaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ResilienceGuardError('Invalid database URL');
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new ResilienceGuardError('Database URL must use the postgres scheme');
  }
  if (!isLoopbackHostname(url.hostname)) {
    throw new ResilienceGuardError('Refusing non-loopback database host for the rehearsal.');
  }
  const dbName = url.pathname.replace(/^\//, '').split('/')[0];
  if (!TEST_DB_NAME_RE.test(dbName)) {
    throw new ResilienceGuardError(
      `Refusing database "${dbName}": the rehearsal accepts test-named databases only ` +
        '(culinaryos_verification, *_test, *_rehearsal, *_verification, rehearsal_*, test_*).',
    );
  }
  return url;
}

export interface DatabaseTarget {
  host: string;
  port: string;
  user: string;
  password: string;
  dbName: string;
}

export function parseDatabaseTarget(url: URL): DatabaseTarget {
  return {
    host: bareHostname(url.hostname),
    port: url.port === '' ? '5432' : url.port,
    user: url.username === '' ? 'postgres' : decodeURIComponent(url.username),
    password: url.password === '' ? '' : decodeURIComponent(url.password),
    dbName: url.pathname.replace(/^\//, '').split('/')[0],
  };
}

/**
 * Require the rehearsal root to resolve inside the OS temp directory.
 * Returns the resolved absolute path. Never creates anything.
 */
export function assertRehearsalRoot(raw: string): string {
  if (raw.trim().length === 0) throw new ResilienceGuardError('Rehearsal root must not be empty');
  const tempRoot = resolve(tmpdir());
  const candidate = resolve(raw);
  const relative = candidate.toLowerCase().startsWith(tempRoot.toLowerCase())
    ? candidate.slice(tempRoot.length)
    : null;
  if (relative === null || (relative.length > 0 && !relative.startsWith('\\') && !relative.startsWith('/'))) {
    throw new ResilienceGuardError(
      `Refusing rehearsal root outside the temp directory: ${candidate}. Rehearsal artifacts stay temp-contained.`,
    );
  }
  if (relative.length === 0) {
    throw new ResilienceGuardError('Refusing to use the temp directory itself as the rehearsal root.');
  }
  return candidate;
}

export interface RehearsalBinaries {
  binDir: string;
  pgDump: string;
  pgRestore: string;
  psql: string;
}

function binaryName(base: string): string {
  return process.platform === 'win32' ? `${base}.exe` : base;
}

/** Verify the three required binaries exist as files under the explicit dir. */
export function verifyBinaries(rawBinDir: string): RehearsalBinaries {
  if (rawBinDir.trim().length === 0) {
    throw new ResilienceGuardError('A --bin-dir with PostgreSQL binaries is required (nothing is searched on PATH).');
  }
  const binDir = resolve(rawBinDir);
  const pgDump = join(binDir, binaryName('pg_dump'));
  const pgRestore = join(binDir, binaryName('pg_restore'));
  const psql = join(binDir, binaryName('psql'));
  const missing = [pgDump, pgRestore, psql].filter((file) => {
    try {
      return !statSync(file).isFile();
    } catch {
      return true;
    }
  });
  if (missing.length > 0) {
    throw new ResilienceGuardError(
      `PostgreSQL binaries not found under ${binDir}; missing: ${missing.join(', ')}. ` +
        'Prepare the isolated temp binaries first (see docs/RESILIENCE_OPERATIONS.md); this rehearsal installs nothing.',
    );
  }
  return { binDir, pgDump, pgRestore, psql };
}

/** Milliseconds-since-epoch in base36: lowercase alphanumerics only. */
export function generateScratchDbName(nowMs: number = Date.now()): string {
  const stamp = Math.max(0, Math.floor(nowMs)).toString(36);
  const name = `rehearsal_scratch_${stamp}`;
  if (!SCRATCH_DB_NAME_RE.test(name)) throw new ResilienceGuardError('Generated scratch name failed its own guard');
  return name;
}

export interface RecoveryPlanOptions {
  binDir: string;
  databaseUrl: string;
  targetLabel: string;
  rehearsalRoot?: string;
  scratchDbName?: string;
  keepScratch?: boolean;
  timeoutMs?: number;
  verifyTablesMax?: number;
}

export interface RecoveryPlan {
  targetLabel: string;
  binaries: RehearsalBinaries;
  source: DatabaseTarget;
  rehearsalRoot: string;
  dumpFile: string;
  reportFile: string;
  scratchDbName: string;
  keepScratch: boolean;
  timeoutMs: number;
  verifyTablesMax: number;
}

export function buildRecoveryPlan(options: RecoveryPlanOptions): RecoveryPlan {
  if (!options.targetLabel || options.targetLabel.trim().length === 0) {
    throw new ResilienceGuardError('targetLabel is required: name the explicit local test database under rehearsal');
  }
  const binaries = verifyBinaries(options.binDir);
  const source = parseDatabaseTarget(assertTestDatabaseUrl(options.databaseUrl));
  const rehearsalRoot = assertRehearsalRoot(
    options.rehearsalRoot ?? join(tmpdir(), `culinaryos-rehearsal-${process.pid}`),
  );
  const scratchDbName = options.scratchDbName ?? generateScratchDbName();
  if (!SCRATCH_DB_NAME_RE.test(scratchDbName)) {
    throw new ResilienceGuardError(
      `Refusing scratch database name "${scratchDbName}": generated rehearsal_scratch_* names only.`,
    );
  }
  if (scratchDbName === source.dbName) {
    throw new ResilienceGuardError('Refusing scratch name identical to the source database.');
  }
  const timeoutMs = options.timeoutMs ?? 120_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 5000 || timeoutMs > 600_000) {
    throw new ResilienceGuardError('timeoutMs must be within [5000,600000]');
  }
  const verifyTablesMax = options.verifyTablesMax ?? 25;
  if (!Number.isInteger(verifyTablesMax) || verifyTablesMax < 0 || verifyTablesMax > 200) {
    throw new ResilienceGuardError('verifyTablesMax must be an integer within [0,200]');
  }
  return {
    targetLabel: options.targetLabel.trim(),
    binaries,
    source,
    rehearsalRoot,
    dumpFile: join(rehearsalRoot, 'source.pgcustom'),
    reportFile: join(rehearsalRoot, 'rehearsal-report.json'),
    scratchDbName,
    keepScratch: options.keepScratch ?? false,
    timeoutMs,
    verifyTablesMax,
  };
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export interface ExecLike {
  (file: string, args: string[], opts: { timeoutMs: number }): Promise<ExecResult>;
}

export type StepStatus = 'pass' | 'fail' | 'skipped';

export interface RehearsalStep {
  name: string;
  status: StepStatus;
  ms: number;
  /** Redacted command line (argv only; secrets travel via environment). */
  command: string;
  detail: string;
}

export interface ParitySummary {
  tablesCompared: number;
  tablesMatched: number;
  tablesMismatched: string[];
  sourceOnly: string[];
  scratchOnly: string[];
  rowCountsCompared: number;
  rowCountsMatched: number;
  skipped: boolean;
  skipReason: string | null;
}

export interface RecoveryReport {
  disclaimer: string;
  target: { label: string; host: string; port: string; user: string; database: string };
  scratchDatabase: string;
  scratchDisposition: 'dropped' | 'kept' | 'never-created';
  rehearsalRoot: string;
  dump: { file: string; bytes: number; sha256: string } | null;
  parity: ParitySummary;
  steps: RehearsalStep[];
  limits: string[];
  verified: boolean;
  startedAt: string;
  finishedAt: string;
}

export const REHEARSAL_LIMITS = [
  'Compares table inventory plus row counts only; not full row-byte equality.',
  'Single loopback node; says nothing about networked, replicated, or production restore behavior.',
  'No retention, scheduling, encryption-at-rest, or point-in-time story is exercised.',
  'Never touches production: loopback test-named databases only, no pre-existing database is reset.',
];

const execFileAsync = promisify(execFile);

function redactCommand(file: string, args: string[]): string {
  return redactSecrets([file, ...args].join(' '));
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

function sha256File(path: string): { bytes: number; sha256: string } {
  const data: Buffer = readFileSync(path);
  return { bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
}

async function defaultExec(
  plan: RecoveryPlan,
  file: string,
  args: string[],
  opts: { timeoutMs: number },
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout: opts.timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, PGPASSWORD: plan.source.password },
    });
    return { stdout, stderr };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ResilienceGuardError(redactSecrets(`Command failed: ${file} — ${message}`));
  }
}

/** Quote a validated public-schema table identifier; rejects anything else. */
export function quoteTable(table: string): string {
  if (!TABLE_IDENTIFIER_RE.test(table)) {
    throw new ResilienceGuardError(`Refusing to query unexpected table name: ${table}`);
  }
  return `"public"."${table}"`;
}

function parseLines(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function runRecoveryPlan(
  plan: RecoveryPlan,
  deps: { execImpl?: ExecLike } = {},
): Promise<RecoveryReport> {
  const execImpl: ExecLike =
    deps.execImpl ?? ((file, args, opts) => defaultExec(plan, file, args, opts));
  const startedAt = new Date().toISOString();
  const steps: RehearsalStep[] = [];
  let dump: RecoveryReport['dump'] = null;
  let parity: ParitySummary = {
    tablesCompared: 0,
    tablesMatched: 0,
    tablesMismatched: [],
    sourceOnly: [],
    scratchOnly: [],
    rowCountsCompared: 0,
    rowCountsMatched: 0,
    skipped: true,
    skipReason: 'verification did not run',
  };
  let scratchCreated = false;
  let scratchDropped = false;
  let failed = false;

  async function record(name: string, command: string, fn: () => Promise<string>): Promise<string | null> {
    if (failed) {
      steps.push({ name, status: 'skipped', ms: 0, command, detail: 'skipped: an earlier step failed' });
      return null;
    }
    const start = Date.now();
    try {
      const detail = await fn();
      steps.push({ name, status: 'pass', ms: Date.now() - start, command, detail: redactSecrets(detail) });
      return detail;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps.push({ name, status: 'fail', ms: Date.now() - start, command, detail: redactSecrets(detail) });
      failed = true;
      return null;
    }
  }

  const baseArgs = ['-h', plan.source.host, '-p', plan.source.port, '-U', plan.source.user];

  await record('prepare-root', `(mkdir) ${plan.rehearsalRoot}`, async () => {
    mkdirSync(plan.rehearsalRoot, { recursive: true });
    writeFileSync(
      join(plan.rehearsalRoot, 'plan.json'),
      `${JSON.stringify(
        {
          disclaimer: NON_PRODUCTION_DISCLAIMER,
          targetLabel: plan.targetLabel,
          database: plan.source.dbName,
          scratchDbName: plan.scratchDbName,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    return `rehearsal root ready at ${plan.rehearsalRoot}`;
  });

  const dumpArgs = [...baseArgs, '-d', plan.source.dbName, '-Fc', '-f', plan.dumpFile];
  await record('dump-source', redactCommand(plan.binaries.pgDump, dumpArgs), async () => {
    const { ms } = await timed(() => execImpl(plan.binaries.pgDump, dumpArgs, { timeoutMs: plan.timeoutMs }));
    const hash = sha256File(plan.dumpFile);
    dump = { file: plan.dumpFile, bytes: hash.bytes, sha256: hash.sha256 };
    if (hash.bytes === 0) throw new ResilienceGuardError('Dump file is empty; refusing to continue.');
    return `dumped ${hash.bytes} bytes (sha256 ${hash.sha256}) in ${ms}ms`;
  });

  const createArgs = [...baseArgs, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE "${plan.scratchDbName}"`];
  await record('create-scratch', redactCommand(plan.binaries.psql, createArgs), async () => {
    if (!SCRATCH_DB_NAME_RE.test(plan.scratchDbName)) {
      throw new ResilienceGuardError('Refusing to create a scratch database outside the rehearsal name guard.');
    }
    await execImpl(plan.binaries.psql, createArgs, { timeoutMs: plan.timeoutMs });
    scratchCreated = true;
    return `scratch database ${plan.scratchDbName} created`;
  });

  const restoreArgs = [...baseArgs, '-d', plan.scratchDbName, '--exit-on-error', '--single-transaction', plan.dumpFile];
  await record('restore-scratch', redactCommand(plan.binaries.pgRestore, restoreArgs), async () => {
    const { ms } = await timed(() => execImpl(plan.binaries.pgRestore, restoreArgs, { timeoutMs: plan.timeoutMs }));
    return `restored into ${plan.scratchDbName} in ${ms}ms`;
  });

  const inventorySql = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1";
  await record('verify-parity', `(psql inventory + counts on ${plan.source.dbName} vs ${plan.scratchDbName})`, async () => {
    const sourceArgs = [...baseArgs, '-d', plan.source.dbName, '-t', '-A', '-c', inventorySql];
    const scratchArgs = [...baseArgs, '-d', plan.scratchDbName, '-t', '-A', '-c', inventorySql];
    const [sourceOut, scratchOut] = await Promise.all([
      execImpl(plan.binaries.psql, sourceArgs, { timeoutMs: plan.timeoutMs }),
      execImpl(plan.binaries.psql, scratchArgs, { timeoutMs: plan.timeoutMs }),
    ]);
    const sourceTables = parseLines(sourceOut.stdout);
    const scratchTables = parseLines(scratchOut.stdout);
    const sourceSet = new Set(sourceTables);
    const scratchSet = new Set(scratchTables);
    const sourceOnly = sourceTables.filter((t) => !scratchSet.has(t));
    const scratchOnly = scratchTables.filter((t) => !sourceSet.has(t));
    const common = sourceTables.filter((t) => scratchSet.has(t));
    const mismatched: string[] = [...sourceOnly, ...scratchOnly];
    let countsCompared = 0;
    let countsMatched = 0;
    const countTargets = common.slice(0, plan.verifyTablesMax);
    for (const table of countTargets) {
      const quoted = quoteTable(table);
      const countSql = `SELECT count(*) FROM ${quoted}`;
      const [sourceCount, scratchCount] = await Promise.all([
        execImpl(plan.binaries.psql, [...baseArgs, '-d', plan.source.dbName, '-t', '-A', '-c', countSql], {
          timeoutMs: plan.timeoutMs,
        }),
        execImpl(plan.binaries.psql, [...baseArgs, '-d', plan.scratchDbName, '-t', '-A', '-c', countSql], {
          timeoutMs: plan.timeoutMs,
        }),
      ]);
      countsCompared += 1;
      const left = parseLines(sourceCount.stdout)[0] ?? '';
      const right = parseLines(scratchCount.stdout)[0] ?? '';
      if (left !== '' && left === right) countsMatched += 1;
      else mismatched.push(`${table} (rows ${left || '?'} vs ${right || '?'})`);
    }
    parity = {
      tablesCompared: common.length,
      // Inventory agrees on exactly the common set; source-only and
      // scratch-only tables are reported separately below, not netted here.
      tablesMatched: common.length,
      tablesMismatched: mismatched,
      sourceOnly,
      scratchOnly,
      rowCountsCompared: countsCompared,
      rowCountsMatched: countsMatched,
      skipped: false,
      skipReason: null,
    };
    if (mismatched.length > 0) {
      throw new ResilienceGuardError(`Parity mismatch: ${mismatched.join(', ')}`);
    }
    return `inventory + row counts match (${common.length} tables, ${countsCompared} counts)`;
  });

  // Cleanup runs even after failure (best effort), but ONLY for the guarded
  // scratch name this run created. It never drops the source or anything else.
  if (scratchCreated && !plan.keepScratch) {
    const dropArgs = [...baseArgs, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE "${plan.scratchDbName}"`];
    const start = Date.now();
    try {
      if (!SCRATCH_DB_NAME_RE.test(plan.scratchDbName)) {
        throw new ResilienceGuardError('Refusing to drop a database outside the rehearsal name guard.');
      }
      await execImpl(plan.binaries.psql, dropArgs, { timeoutMs: plan.timeoutMs });
      scratchDropped = true;
      steps.push({
        name: 'drop-scratch',
        status: 'pass',
        ms: Date.now() - start,
        command: redactCommand(plan.binaries.psql, dropArgs),
        detail: `scratch database ${plan.scratchDbName} dropped`,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      steps.push({
        name: 'drop-scratch',
        status: 'fail',
        ms: Date.now() - start,
        command: redactCommand(plan.binaries.psql, dropArgs),
        detail: redactSecrets(detail),
      });
      failed = true;
    }
  } else if (scratchCreated && plan.keepScratch) {
    steps.push({
      name: 'drop-scratch',
      status: 'skipped',
      ms: 0,
      command: '(skipped: --keep-scratch)',
      detail: `scratch database ${plan.scratchDbName} retained for inspection`,
    });
  }

  const report: RecoveryReport = {
    disclaimer: NON_PRODUCTION_DISCLAIMER,
    target: {
      label: plan.targetLabel,
      host: plan.source.host,
      port: plan.source.port,
      user: plan.source.user,
      database: plan.source.dbName,
    },
    scratchDatabase: plan.scratchDbName,
    scratchDisposition: scratchDropped ? 'dropped' : scratchCreated ? 'kept' : 'never-created',
    rehearsalRoot: plan.rehearsalRoot,
    dump,
    parity,
    steps,
    limits: [...REHEARSAL_LIMITS],
    verified: !failed,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  try {
    mkdirSync(dirname(plan.reportFile), { recursive: true });
    writeFileSync(plan.reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch {
    // Report persistence is best effort; the JSON still goes to stdout.
  }
  return report;
}

interface CliArgs {
  help: boolean;
  binDir: string;
  databaseUrl: string | null;
  targetLabel: string;
  rehearsalRoot: string | null;
  keepScratch: boolean;
  timeoutMs: number;
  verifyTablesMax: number;
}

function printHelp(): void {
  console.log(`CulinaryOS R8 isolated backup/restore rehearsal — ${NON_PRODUCTION_DISCLAIMER}

Usage:
  tsx scripts/resilience-recovery.ts --bin-dir <dir> --target-label <name> [options]

Required:
  --bin-dir <dir>            Directory holding pg_dump, pg_restore, psql.
                             Nothing is searched on PATH; missing binaries are
                             a NOT RUN refusal, never an install.
  --target-label <name>      Explicit label for the local test database under
                             rehearsal (recorded verbatim in the report).

Options:
  --database-url <url>       Explicit TEST database (loopback + test-named
                             only; never production). Env TEST_DATABASE_URL
                             also accepted.
  --root <dir>               Rehearsal artifact directory. Must resolve inside
                             the OS temp directory. Default: a fresh
                             temp/culinaryos-rehearsal-<pid> directory.
  --keep-scratch             Retain the scratch database after verification
                             for inspection. Default: drop the scratch
                             database this run created (the source is never
                             dropped or reset).
  --timeout-ms <n>           Per-command timeout, 5000..600000. Default: 120000
  --verify-tables-max <n>    Row-count tables compared, 0..200. Default: 25
                             (0 compares inventory only).

Guardrails: loopback test-named databases only, temp-contained artifacts,
generated rehearsal_scratch_* names only for create/drop, secrets redacted
in every message, no installs, no production destinations, no resets.`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    binDir: '',
    databaseUrl: null,
    targetLabel: '',
    rehearsalRoot: null,
    keepScratch: false,
    timeoutMs: 120_000,
    verifyTablesMax: 25,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = (): string => {
      const value = argv[i + 1];
      if (value === undefined) throw new ResilienceGuardError(`Missing value for ${token}`);
      i += 1;
      return value;
    };
    switch (token) {
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--bin-dir':
        args.binDir = next();
        break;
      case '--database-url':
        args.databaseUrl = next();
        break;
      case '--target-label':
        args.targetLabel = next();
        break;
      case '--root':
        args.rehearsalRoot = next();
        break;
      case '--keep-scratch':
        args.keepScratch = true;
        break;
      case '--timeout-ms':
        args.timeoutMs = Number(next());
        break;
      case '--verify-tables-max':
        args.verifyTablesMax = Number(next());
        break;
      default:
        throw new ResilienceGuardError(`Unknown argument: ${token} (see --help)`);
    }
  }
  return args;
}

async function main(argv: string[]): Promise<number> {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    return 2;
  }
  if (args.help) {
    printHelp();
    return 0;
  }
  const databaseUrl = args.databaseUrl ?? process.env.TEST_DATABASE_URL ?? null;
  if (databaseUrl === null) {
    console.error(
      'NOT RUN: no test database configured. Pass --database-url <loopback test url> or set TEST_DATABASE_URL ' +
        'to an explicit local test connection. Production connections are always refused.',
    );
    return 2;
  }
  let plan: RecoveryPlan;
  try {
    plan = buildRecoveryPlan({
      binDir: args.binDir,
      databaseUrl,
      targetLabel: args.targetLabel,
      rehearsalRoot: args.rehearsalRoot ?? undefined,
      keepScratch: args.keepScratch,
      timeoutMs: args.timeoutMs,
      verifyTablesMax: args.verifyTablesMax,
    });
  } catch (error) {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    return 2;
  }
  try {
    const report = await runRecoveryPlan(plan);
    console.log(JSON.stringify(report, null, 2));
    if (!report.verified) {
      console.error('Rehearsal did not verify: see the step table above. No production state was touched.');
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}

const invokedAsScript =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsScript) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    });
}
