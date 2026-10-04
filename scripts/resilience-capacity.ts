// ============================================================================
// CulinaryOS — R7 local capacity / fairness / observability harness.
// Bounded synthetic load against an EXPLICIT LOCAL test server. Measures
// latency percentiles, pool pressure (in-flight + optional DB probe) and
// queue age (optional JSON probe). Non-destructive by default: GET-only.
// This file is self-contained (no repo imports) so it runs standalone via
// `tsx scripts/resilience-capacity.ts` and stays decoupled from in-flight
// DB/offline tasks. Guard helpers are intentionally duplicated (not shared)
// with scripts/resilience-recovery.ts for the same reason.
//
// SYNTHETIC LOCAL MEASUREMENT ONLY. Output is never a production
// certification: see NON_PRODUCTION_DISCLAIMER, echoed into every report.
// ============================================================================

import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const NON_PRODUCTION_DISCLAIMER =
  'SYNTHETIC LOCAL MEASUREMENT ONLY — this report describes a bounded load run ' +
  'against an explicitly configured local test target. It is NOT a production ' +
  'capacity certification. HTTP timings cover response headers, not full bodies. NOT a multi-tenant fairness proof, and NOT evidence ' +
  'of real-network, real-device, or payment-reader behavior.';

export const FIXTURE_OPT_IN_ENV = 'RESILIENCE_FIXTURES';

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

/** Require an explicit local (loopback) http(s) target. Rejects credentials. */
export function assertLoopbackUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ResilienceGuardError(`Invalid target URL: ${redactSecrets(raw)}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ResilienceGuardError(`Target must be http(s); got ${url.protocol}`);
  }
  if (!isLoopbackHostname(url.hostname)) {
    throw new ResilienceGuardError(
      `Refusing non-local target host "${url.hostname}": this harness measures local test endpoints only.`,
    );
  }
  if (url.username !== '' || url.password !== '') {
    throw new ResilienceGuardError('Refusing target URL with embedded credentials.');
  }
  return url;
}

/** Nearest-rank percentile over an ASCENDING-sorted sample. p in [0,100]. */
export function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) throw new ResilienceGuardError('percentile of empty sample');
  if (!Number.isFinite(p) || p < 0 || p > 100) {
    throw new ResilienceGuardError(`percentile p must be within [0,100]; got ${p}`);
  }
  const rank = Math.ceil((p / 100) * sortedAscending.length);
  return sortedAscending[Math.min(sortedAscending.length - 1, Math.max(0, rank - 1))];
}

export interface LatencySummary {
  count: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export function summarizeLatencies(samplesMs: number[]): LatencySummary {
  if (samplesMs.length === 0) throw new ResilienceGuardError('Cannot summarize zero samples');
  for (const s of samplesMs) {
    if (!Number.isFinite(s) || s < 0) throw new ResilienceGuardError(`Invalid latency sample: ${s}`);
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    meanMs: sum / sorted.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
  };
}

export interface EndpointSpec {
  method: 'GET' | 'POST';
  path: string;
  body?: string;
  headers?: Record<string, string>;
}

/** Default read-only plan: liveness + catalog/inventory/settings reads. */
export const DEFAULT_READ_ENDPOINTS: EndpointSpec[] = [
  { method: 'GET', path: '/health' },
  { method: 'GET', path: '/v1/menu/golden-fork' },
  { method: 'GET', path: '/v1/pantry' },
  { method: 'GET', path: '/v1/settings' },
];

export interface CapacityPlanOptions {
  baseUrl: string;
  targetLabel: string;
  tenantId?: string;
  requests?: number;
  concurrency?: number;
  timeoutMs?: number;
  endpoints?: EndpointSpec[];
  queueAgeProbePath?: string;
  databaseProbe?: boolean;
  /** Write methods require BOTH allowWrites and the env opt-in. */
  allowWrites?: boolean;
  fixturesOptIn?: boolean;
}

export interface CapacityPlan {
  baseUrl: string;
  targetLabel: string;
  tenantId: string;
  requests: number;
  concurrency: number;
  timeoutMs: number;
  endpoints: EndpointSpec[];
  queueAgeProbePath: string | null;
  databaseProbe: boolean;
  destructive: boolean;
}

const MAX_REQUESTS = 100_000;
const MAX_CONCURRENCY = 256;

export function buildCapacityPlan(options: CapacityPlanOptions): CapacityPlan {
  const url = assertLoopbackUrl(options.baseUrl);
  const requests = options.requests ?? 200;
  const concurrency = options.concurrency ?? 10;
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isInteger(requests) || requests < 1 || requests > MAX_REQUESTS) {
    throw new ResilienceGuardError(`requests must be an integer within [1,${MAX_REQUESTS}]`);
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_CONCURRENCY) {
    throw new ResilienceGuardError(`concurrency must be an integer within [1,${MAX_CONCURRENCY}]`);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
    throw new ResilienceGuardError('timeoutMs must be within [100,30000]');
  }
  if (!options.targetLabel || options.targetLabel.trim().length === 0) {
    throw new ResilienceGuardError('targetLabel is required: name the explicit local target under test');
  }
  const endpoints = options.endpoints ?? DEFAULT_READ_ENDPOINTS;
  if (endpoints.length === 0) throw new ResilienceGuardError('At least one endpoint is required');
  for (const endpoint of endpoints) {
    if (!endpoint.path.startsWith('/')) {
      throw new ResilienceGuardError(`Endpoint path must start with "/": ${endpoint.path}`);
    }
    if (endpoint.method !== 'GET' && endpoint.method !== 'POST') {
      throw new ResilienceGuardError(`Unsupported method (GET or POST only): ${endpoint.method}`);
    }
  }
  const wantsWrites = endpoints.some((endpoint) => endpoint.method !== 'GET');
  if (wantsWrites && !(options.allowWrites === true && options.fixturesOptIn === true)) {
    throw new ResilienceGuardError(
      `Refusing non-GET endpoints without explicit opt-in: pass --allow-writes AND set ${FIXTURE_OPT_IN_ENV}=1. ` +
        'Default runs are read-only.',
    );
  }
  let queueAgeProbePath: string | null = options.queueAgeProbePath ?? null;
  if (queueAgeProbePath !== null && !queueAgeProbePath.startsWith('/')) {
    throw new ResilienceGuardError('queueAgeProbePath must start with "/"');
  }
  return {
    baseUrl: url.toString().replace(/\/$/, ''),
    targetLabel: options.targetLabel.trim(),
    tenantId: options.tenantId ?? '00000000-0000-0000-0000-000000000001',
    requests,
    concurrency,
    timeoutMs,
    endpoints: endpoints.map((endpoint) => ({ ...endpoint })),
    queueAgeProbePath,
    databaseProbe: options.databaseProbe ?? false,
    destructive: wantsWrites,
  };
}

export interface FetchLike {
  (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal; redirect: 'error' }): Promise<{
    status: number;
    json(): Promise<unknown>;
  }>;
}

export interface DbProbeLike {
  /** One lightweight read; returns pool/wait observation. Never writes. */
  (): Promise<{ probeMs: number; waitingCount: number | null }>;
}

export interface ClockLike {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface CapacityReport {
  disclaimer: string;
  target: { label: string; baseUrl: string; destructive: boolean };
  config: { requests: number; concurrency: number; timeoutMs: number; tenantId: string };
  http: {
    attempted: number;
    completed: number;
    timeouts: number;
    errors: number;
    statusCounts: Record<string, number>;
    maxInFlight: number;
    latenciesMs: LatencySummary | null;
    perEndpoint: Record<string, LatencySummary>;
  };
  queueAgeMs: LatencySummary | null;
  database: { measured: boolean; probes: number; waitingMax: number | null; latenciesMs: LatencySummary | null };
  startedAt: string;
  finishedAt: string;
}

const realClock: ClockLike = {
  now: () => performance.now(),
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};

function statusKey(status: number): string {
  return Number.isInteger(status) ? String(status) : 'unknown';
}

export async function runCapacityPlan(
  plan: CapacityPlan,
  deps: { fetchImpl?: FetchLike; clock?: ClockLike; dbProbe?: DbProbeLike } = {},
): Promise<CapacityReport> {
  const fetchImpl: FetchLike =
    deps.fetchImpl ??
    ((globalThis.fetch as unknown as FetchLike | undefined) as FetchLike);
  if (!fetchImpl) throw new ResilienceGuardError('No fetch implementation available');
  const clock = deps.clock ?? realClock;
  const startedAt = new Date().toISOString();

  const latencies: number[] = [];
  const perEndpointSamples = new Map<string, number[]>();
  const statusCounts: Record<string, number> = {};
  let completed = 0;
  let timeouts = 0;
  let errors = 0;
  let inFlight = 0;
  let maxInFlight = 0;
  let nextIndex = 0;

  async function oneRequest(): Promise<void> {
    const endpoint = plan.endpoints[nextIndex % plan.endpoints.length];
    nextIndex += 1;
    const key = `${endpoint.method} ${endpoint.path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), plan.timeoutMs);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const start = clock.now();
    try {
      const response = await fetchImpl(`${plan.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'X-Tenant-Id': plan.tenantId, ...(endpoint.headers ?? {}) },
        body: endpoint.body,
        signal: controller.signal, redirect: 'error',
      });
      const elapsed = clock.now() - start;
      latencies.push(elapsed);
      const samples = perEndpointSamples.get(key) ?? [];
      samples.push(elapsed);
      perEndpointSamples.set(key, samples);
      statusCounts[statusKey(response.status)] = (statusCounts[statusKey(response.status)] ?? 0) + 1;
      completed += 1;
    } catch (error) {
      if (controller.signal.aborted) timeouts += 1;
      else errors += 1;
      void error;
    } finally {
      clearTimeout(timer);
      inFlight -= 1;
    }
  }

  async function worker(): Promise<void> {
    while (nextIndex < plan.requests) {
      await oneRequest();
    }
  }

  const workers: Promise<void>[] = [];
  const workerCount = Math.min(plan.concurrency, plan.requests);
  for (let i = 0; i < workerCount; i += 1) workers.push(worker());
  await Promise.all(workers);

  // Queue-age probe: best-effort GET samples parsed from a JSON number field.
  let queueAgeMs: LatencySummary | null = null;
  if (plan.queueAgeProbePath !== null) {
    const samples: number[] = [];
    const probeCount = Math.min(20, Math.max(1, Math.floor(plan.requests / 10)));
    for (let i = 0; i < probeCount; i += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), plan.timeoutMs);
        try {
          const response = await fetchImpl(`${plan.baseUrl}${plan.queueAgeProbePath}`, {
            method: 'GET',
            headers: { 'X-Tenant-Id': plan.tenantId },
            signal: controller.signal, redirect: 'error',
          });
          const payload = (await response.json()) as Record<string, unknown>;
          const value =
            payload.oldest_pending_age_ms ?? payload.queue_age_ms ?? payload.oldestPendingAgeMs ?? null;
          if (typeof value === 'number' && Number.isFinite(value) && value >= 0) samples.push(value);
        } finally {
          clearTimeout(timer);
        }
      } catch {
        // Probe failures are recorded as absence, never fabricated.
      }
      if (i + 1 < probeCount) await clock.sleep(50);
    }
    queueAgeMs = samples.length > 0 ? summarizeLatencies(samples) : null;
  }

  // Database pool probe: injected by the CLI only for explicit test databases.
  const dbLatencies: number[] = [];
  let waitingMax: number | null = null;
  let dbProbes = 0;
  if (plan.databaseProbe && deps.dbProbe) {
    const probeCount = Math.min(20, Math.max(1, Math.floor(plan.requests / 10)));
    for (let i = 0; i < probeCount; i += 1) {
      try {
        const observation = await deps.dbProbe();
        dbLatencies.push(observation.probeMs);
        if (observation.waitingCount !== null) {
          waitingMax = waitingMax === null ? observation.waitingCount : Math.max(waitingMax, observation.waitingCount);
        }
        dbProbes += 1;
      } catch {
        // Probe failures are recorded as absence, never fabricated.
      }
      if (i + 1 < probeCount) await clock.sleep(50);
    }
  }

  const perEndpoint: Record<string, LatencySummary> = {};
  for (const [key, samples] of perEndpointSamples) {
    perEndpoint[key] = summarizeLatencies(samples);
  }

  return {
    disclaimer: NON_PRODUCTION_DISCLAIMER,
    target: { label: plan.targetLabel, baseUrl: plan.baseUrl, destructive: plan.destructive },
    config: {
      requests: plan.requests,
      concurrency: plan.concurrency,
      timeoutMs: plan.timeoutMs,
      tenantId: plan.tenantId,
    },
    http: {
      attempted: plan.requests,
      completed,
      timeouts,
      errors,
      statusCounts,
      maxInFlight,
      latenciesMs: latencies.length > 0 ? summarizeLatencies(latencies) : null,
      perEndpoint,
    },
    queueAgeMs,
    database: {
      measured: dbProbes > 0,
      probes: dbProbes,
      waitingMax,
      latenciesMs: dbLatencies.length > 0 ? summarizeLatencies(dbLatencies) : null,
    },
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

interface CliArgs {
  help: boolean;
  baseUrl: string;
  targetLabel: string;
  tenantId: string;
  requests: number;
  concurrency: number;
  timeoutMs: number;
  endpoints: EndpointSpec[] | null;
  queueAgeProbePath: string | null;
  databaseUrl: string | null;
  allowWrites: boolean;
  out: string | null;
}

function printHelp(): void {
  console.log(`CulinaryOS R7 local capacity harness — ${NON_PRODUCTION_DISCLAIMER}

Usage:
  tsx scripts/resilience-capacity.ts --target-label <name> [options]

Required:
  --target-label <name>     Explicit label for the local target under test
                            (recorded verbatim in the report).

Options:
  --base-url <url>          Local target base URL (loopback only). Default: http://127.0.0.1:3000
  --tenant-id <uuid>        X-Tenant-Id header for requests. Default: demo tenant UUID
  --requests <n>            Total requests, 1..100000. Default: 200
  --concurrency <n>         Max in-flight requests, 1..256. Default: 10
  --timeout-ms <n>          Per-request timeout, 100..30000. Default: 5000
  --endpoint <METHOD:path>  Repeatable. Default plan is read-only GETs:
                            /health, /v1/menu/golden-fork, /v1/pantry, /v1/settings
  --queue-age-probe <path>  Optional GET probe returning JSON with
                            oldest_pending_age_ms (else NOT MEASURED).
  --database-url <url>      Optional explicit TEST database for the read-only pool
                            probe. Loopback + test-named databases only; never
                            production. Env TEST_DATABASE_URL also accepted.
  --allow-writes            Required together with ${FIXTURE_OPT_IN_ENV}=1 to permit
                            non-GET endpoints (opt-in fixtures only).
  --out <file>              Write the JSON report to a file (in addition to stdout).

Guardrails: loopback targets only, GET-only by default, no credentials in URLs,
bounded requests/concurrency, probes report absence instead of fabricating data.`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    baseUrl: 'http://127.0.0.1:3000',
    targetLabel: '',
    tenantId: '00000000-0000-0000-0000-000000000001',
    requests: 200,
    concurrency: 10,
    timeoutMs: 5000,
    endpoints: null,
    queueAgeProbePath: null,
    databaseUrl: null,
    allowWrites: false,
    out: null,
  };
  const collected: EndpointSpec[] = [];
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
      case '--base-url':
        args.baseUrl = next();
        break;
      case '--target-label':
        args.targetLabel = next();
        break;
      case '--tenant-id':
        args.tenantId = next();
        break;
      case '--requests':
        args.requests = Number(next());
        break;
      case '--concurrency':
        args.concurrency = Number(next());
        break;
      case '--timeout-ms':
        args.timeoutMs = Number(next());
        break;
      case '--endpoint': {
        const spec = next();
        const separator = spec.indexOf(':');
        if (separator <= 0) throw new ResilienceGuardError(`--endpoint expects METHOD:path, got "${spec}"`);
        const method = spec.slice(0, separator).toUpperCase();
        const path = spec.slice(separator + 1);
        if (method !== 'GET' && method !== 'POST') {
          throw new ResilienceGuardError(`--endpoint supports GET or POST only, got "${method}"`);
        }
        collected.push({ method, path });
        break;
      }
      case '--queue-age-probe':
        args.queueAgeProbePath = next();
        break;
      case '--database-url':
        args.databaseUrl = next();
        break;
      case '--allow-writes':
        args.allowWrites = true;
        break;
      case '--out':
        args.out = next();
        break;
      default:
        throw new ResilienceGuardError(`Unknown argument: ${token} (see --help)`);
    }
  }
  if (collected.length > 0) args.endpoints = collected;
  return args;
}

const TEST_DB_NAME_RE = /^(culinaryos_verification|rehearsal_[a-z0-9_]+|(test|rehearsal)_[a-z0-9_]*|[a-z0-9_]+_(test|rehearsal|verification|tmp))$/;

/** Local copy of the test-database gate (see resilience-recovery.ts). */
function assertTestDatabaseUrl(raw: string): URL {
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
    throw new ResilienceGuardError('Refusing non-loopback database host for the pool probe.');
  }
  const dbName = url.pathname.replace(/^\//, '').split('/')[0];
  if (!TEST_DB_NAME_RE.test(dbName)) {
    throw new ResilienceGuardError(
      `Refusing database "${dbName}": the probe accepts test-named databases only ` +
        '(culinaryos_verification, *_test, *_rehearsal, *_verification, rehearsal_*, test_*).',
    );
  }
  return url;
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
  let plan: CapacityPlan;
  try {
    plan = buildCapacityPlan({
      baseUrl: args.baseUrl,
      targetLabel: args.targetLabel,
      tenantId: args.tenantId,
      requests: args.requests,
      concurrency: args.concurrency,
      timeoutMs: args.timeoutMs,
      endpoints: args.endpoints ?? undefined,
      queueAgeProbePath: args.queueAgeProbePath ?? undefined,
      databaseProbe: args.databaseUrl !== null || process.env.TEST_DATABASE_URL !== undefined,
      allowWrites: args.allowWrites,
      fixturesOptIn: process.env[FIXTURE_OPT_IN_ENV] === '1',
    });
  } catch (error) {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    return 2;
  }

  let dbProbe: DbProbeLike | undefined;
  let closePool: (() => Promise<void>) | undefined;
  const databaseUrl = args.databaseUrl ?? process.env.TEST_DATABASE_URL ?? null;
  if (plan.databaseProbe && databaseUrl !== null) {
    try {
      assertTestDatabaseUrl(databaseUrl);
      const pg = await import('pg').catch(() => null);
      if (pg === null) {
        console.error('Database probe requested but the "pg" driver is unavailable; continuing without it.');
      } else {
        const pool = new pg.Pool({
          connectionString: databaseUrl,
          max: 2,
          connectionTimeoutMillis: 4000,
          statement_timeout: 4000,
        });
        closePool = async () => {
          await pool.end();
        };
        dbProbe = async () => {
          const start = performance.now();
          await pool.query('SELECT 1');
          let waiting: number | null = null;
          try {
            const result = await pool.query(
              "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE wait_event IS NOT NULL AND datname = current_database()",
            );
            const row = result.rows[0] as { waiting?: unknown } | undefined;
            if (row !== undefined && typeof row.waiting === 'number') waiting = row.waiting;
          } catch {
            waiting = null;
          }
          return { probeMs: performance.now() - start, waitingCount: waiting };
        };
      }
    } catch (error) {
      console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
      return 2;
    }
  }

  try {
    const report = await runCapacityPlan(plan, { dbProbe });
    const rendered = JSON.stringify(report, null, 2);
    if (args.out !== null) writeFileSync(args.out, `${rendered}\n`, 'utf8');
    console.log(rendered);
    if (report.http.completed === 0) {
      console.error('No requests completed: target unreachable or every request failed. No timings are reported.');
      return 1;
    }
    return 0;
  } catch (error) {
    console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
    return 1;
  } finally {
    if (closePool) await closePool().catch(() => undefined);
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
