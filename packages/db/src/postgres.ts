// ============================================================
// CulinaryOS — Plain PostgreSQL tenant adapter (fresh DB, no Supabase)
// R2 pg-foundation: lazy bounded pool + verified-identity transactions.
//
// Tenant authorization is bound to a database-verified opaque token hash.
// withVerifiedTenantTransaction sets ONLY app.token_hash; every RLS policy
// re-derives the tenant from that credential
// (app.token_hash -> resolve_identity -> app_verified_tenant_id), so no
// caller-supplied tenant/user/role setting exists to forge — changing
// app.tenant_id after resolution is meaningless because no policy reads it.
// There is deliberately no raw-context transaction: bootstrap inserts are
// performed by the migration-owner login, never through the runtime role.
// ============================================================

import { Pool, type PoolClient } from 'pg';

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
}

export interface SqlExecutor {
  query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export type VerifiedIdentityKind = 'session' | 'device';

/** Database-verified identity returned by public.resolve_identity. */
export interface VerifiedIdentity {
  kind: VerifiedIdentityKind;
  userId: string | null;
  tenantId: string;
  role: string | null;
  deviceId: string | null;
  capabilities: unknown;
}

export interface VerifiedTransaction {
  tx: SqlExecutor;
  identity: VerifiedIdentity;
}

export interface VerifiedTransactionOptions {
  /** SHA-256 hex of the opaque session token or device key. */
  tokenHash: string;
}

export interface PostgresPoolOptions {
  connectionString?: string;
  max?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  statementTimeoutMillis?: number;
}

/** Restricted runtime role. Owns nothing, cannot login, cannot bypass RLS. */
export const CULINARYOS_APP_ROLE = 'culinaryos_app';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_HASH_RE = /^[0-9a-f]{64}$/;

export function assertTokenHash(value: string): void {
  if (typeof value !== 'string' || !TOKEN_HASH_RE.test(value)) {
    throw new Error('Invalid tokenHash: expected 64 lowercase hex chars (SHA-256)');
  }
}

interface IdentityRow {
  kind: unknown;
  user_id: unknown;
  tenant_id: unknown;
  role: unknown;
  device_id: unknown;
  capabilities: unknown;
}

/** Fail closed on any malformed identity row; the database is authoritative. */
function toVerifiedIdentity(row: IdentityRow): VerifiedIdentity {
  if (row.kind !== 'session' && row.kind !== 'device') {
    throw new Error('Authentication failed: identity lookup returned an unknown kind');
  }
  if (typeof row.tenant_id !== 'string' || !UUID_RE.test(row.tenant_id)) {
    throw new Error('Authentication failed: identity lookup returned an invalid tenant');
  }
  if (row.user_id !== null && (typeof row.user_id !== 'string' || !UUID_RE.test(row.user_id))) {
    throw new Error('Authentication failed: identity lookup returned an invalid user');
  }
  if (row.device_id !== null && (typeof row.device_id !== 'string' || !UUID_RE.test(row.device_id))) {
    throw new Error('Authentication failed: identity lookup returned an invalid device');
  }
  if (row.role !== null && typeof row.role !== 'string') {
    throw new Error('Authentication failed: identity lookup returned an invalid role');
  }
  return {
    kind: row.kind,
    userId: row.user_id,
    tenantId: row.tenant_id,
    role: row.role,
    deviceId: row.device_id,
    capabilities: row.capabilities ?? null,
  };
}

let poolSingleton: Pool | null = null;

/**
 * Lazily create (or return) the shared pg pool. Reads DATABASE_URL only when
 * first called — importing this module never connects. No dotenv loading here;
 * the process environment is the only source. Production passes the
 * restricted runtime-login URL explicitly; the owner/migration URL must never
 * be used for request traffic.
 */
export function getPostgresPool(options: PostgresPoolOptions = {}): Pool {
  if (poolSingleton) return poolSingleton;
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured; cannot create Postgres pool');
  }
  poolSingleton = new Pool({
    connectionString,
    max: options.max ?? 10,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5000,
    idleTimeoutMillis: options.idleTimeoutMillis ?? 30000,
    statement_timeout: options.statementTimeoutMillis ?? 15000,
  });
  return poolSingleton;
}

/** End the shared pool if initialized; safe to call when never initialized. */
export async function closePostgresPool(): Promise<void> {
  if (!poolSingleton) return;
  const pool = poolSingleton;
  poolSingleton = null;
  await pool.end();
}

function toExecutor(client: PoolClient): SqlExecutor {
  return {
    async query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await client.query(text, params as unknown[] | undefined);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
  };
}

async function setLocalTokenHash(client: PoolClient, tokenHash: string): Promise<void> {
  await client.query("SELECT set_config('app.token_hash', $1, true)", [tokenHash]);
}

/**
 * Run a callback inside an auth-plane transaction: restricted role, no tenant
 * settings. For pre-authentication identity operations only (resolve_identity,
 * find_staff_pin, mint_session with proof). Tenant tables are unreachable
 * here by construction — RLS denies reads without app.token_hash — so a
 * leaked handle cannot exfiltrate tenant data.
 */
export async function withAppTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  callback: (tx: SqlExecutor) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${CULINARYOS_APP_ROLE}`);
    const result = await callback(toExecutor(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback best-effort; surface the original failure.
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run a callback inside a tenant-scoped transaction bound to a verified
 * opaque token hash. The hash is resolved through public.resolve_identity
 * AFTER the restricted role is set; zero rows (unknown, revoked, expired, or
 * membership/device-invalid credentials) fails closed before the callback
 * runs. The transaction then carries ONLY app.token_hash: every RLS policy
 * re-derives the tenant from that credential, so there is no
 * caller-supplied tenant setting to forge. The adapter-level resolution
 * fail-fast and the returned identity exist so the server can enforce
 * role/capability gates without a second lookup; the database remains the
 * authorization backstop. Device identities resolve with role null: the
 * server must enforce their verified capabilities and must never treat them
 * as managers.
 */
export async function withVerifiedTenantTransaction<T>(
  pool: Pick<Pool, 'connect'>,
  options: VerifiedTransactionOptions,
  callback: (verified: VerifiedTransaction) => Promise<T>,
): Promise<T> {
  if (!options || typeof options.tokenHash !== 'string') {
    throw new Error('Invalid VerifiedTransactionOptions: tokenHash is required');
  }
  assertTokenHash(options.tokenHash);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE ${CULINARYOS_APP_ROLE}`);
    const found = await client.query(
      'SELECT kind, user_id, tenant_id, role, device_id, capabilities' +
        ' FROM public.resolve_identity($1)',
      [options.tokenHash],
    );
    const row = found.rows[0] as IdentityRow | undefined;
    if (!row) {
      throw new Error('Authentication failed: unknown, revoked, or expired credentials');
    }
    const identity = toVerifiedIdentity(row);
    await setLocalTokenHash(client, options.tokenHash);
    const result = await callback({ tx: toExecutor(client), identity });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback best-effort; surface the original failure.
    }
    throw error;
  } finally {
    client.release();
  }
}

export {
  assertRuntimeDatabaseRole,
  CULINARYOS_IDENTITY_ROLE,
  type RuntimeDatabaseRoleInfo,
} from './runtime-role.js';

