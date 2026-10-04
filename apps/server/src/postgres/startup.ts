import { Pool } from 'pg';
import { assertRuntimeDatabaseRole, type RuntimeDatabaseRoleInfo } from '@culinaryos/db';
import { isNativePostgresEnabled, getNativeDatabaseUrl } from './config.js';
import { createNativePostgresApp } from './app.js';
import { createAuthRunner, createTenantRunner } from './transactions.js';
import type { Hono } from 'hono';

export interface NativeStartupState {
  enabled: boolean;
  pool: Pool | null;
  roleInfo: RuntimeDatabaseRoleInfo | null;
  error: Error | null;
}

let state: NativeStartupState = {
  enabled: false,
  pool: null,
  roleInfo: null,
  error: null,
};

export function getNativeStartupState(): Readonly<NativeStartupState> {
  return state;
}

/** Reset startup state for test isolation. */
export function resetNativeStartupState(): void {
  if (state.pool) {
    state.pool.end().catch(() => {});
  }
  state = {
    enabled: false,
    pool: null,
    roleInfo: null,
    error: null,
  };
}

/**
 * Perform startup role verification and mount native app if enabled.
 * Must be called before server listener starts.
 * If native PostgreSQL is enabled and the role check fails, this throws
 * and prevents the server listener from starting.
 */
export async function setupNativePostgres(
  app: Hono<any>,
  options?: { pool?: Pool; databaseUrl?: string; enabled?: boolean }
): Promise<NativeStartupState> {
  const enabled = options?.enabled ?? isNativePostgresEnabled();
  if (!enabled) {
    state = { enabled: false, pool: null, roleInfo: null, error: null };
    return state;
  }

  const databaseUrl = options?.databaseUrl ?? getNativeDatabaseUrl();
  if (!databaseUrl && !options?.pool) {
    const error = new Error('Native PostgreSQL enabled (CULINARYOS_NATIVE_PG=true) but no valid DATABASE_URL configured');
    state = { enabled: true, pool: null, roleInfo: null, error };
    throw error;
  }

  const pool = options?.pool ?? new Pool({
    connectionString: databaseUrl ?? undefined,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
  });

  try {
    const roleInfo = await assertRuntimeDatabaseRole(pool);
    state = { enabled: true, pool, roleInfo, error: null };

    console.log(
      `[culinaryos-api] DATABASE ROLE: RESTRICTED — login "${roleInfo.login}" is a verified member of culinaryos_app (0 public tables owned, NOBYPASSRLS).`
    );

    const nativeApp = createNativePostgresApp({
      enabled: true,
      pool,
      runTenant: createTenantRunner(pool),
      runAuth: createAuthRunner(pool),
    });

    app.route('/', nativeApp);
    return state;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    state = { enabled: true, pool: null, roleInfo: null, error: err };
    try {
      await pool.end();
    } catch {
      // Best-effort pool cleanup on failed assertion
    }
    console.error(`[culinaryos-api] ❌ FATAL: Runtime database role assertion failed: ${err.message}`);
    throw err;
  }
}

/**
 * Check health of native database connection.
 */
export async function checkNativeHealth(): Promise<{
  ok: boolean;
  status: string;
  role?: string;
  latencyMs?: number;
  error?: string;
}> {
  if (!state.enabled) {
    return { ok: false, status: 'disabled' };
  }
  if (!state.pool || !state.roleInfo) {
    return { ok: false, status: 'unready', error: state.error?.message ?? 'Role check failed or pool uninitialized' };
  }
  const start = performance.now();
  try {
    const client = await state.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    return { ok: true, status: 'ready', role: state.roleInfo.login, latencyMs };
  } catch (err) {
    return { ok: false, status: 'unready', error: err instanceof Error ? err.message : 'Database ping failed' };
  }
}
