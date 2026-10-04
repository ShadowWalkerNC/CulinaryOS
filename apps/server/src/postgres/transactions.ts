import { DomainError } from './domain.js';
import type { AuthRunner, NativeExecutor, NativeVerifiedIdentity, TenantRunner } from './executor.js';
import type { PoolLike } from './identity.js';

const TOKEN_HASH_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResolveIdentityRow {
  kind: unknown;
  user_id: unknown;
  tenant_id: unknown;
  role: unknown;
  device_id: unknown;
  capabilities: unknown;
}

function toVerifiedIdentity(row: ResolveIdentityRow): NativeVerifiedIdentity {
  if (row.kind !== 'session' && row.kind !== 'device') {
    throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
  }
  if (typeof row.tenant_id !== 'string' || !UUID_RE.test(row.tenant_id)) {
    throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
  }
  if (row.user_id !== null && (typeof row.user_id !== 'string' || !UUID_RE.test(row.user_id))) {
    throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
  }
  if (row.device_id !== null && (typeof row.device_id !== 'string' || !UUID_RE.test(row.device_id))) {
    throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
  }
  if (row.role !== null && typeof row.role !== 'string') {
    throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
  }
  const capabilities = Array.isArray(row.capabilities)
    ? row.capabilities.filter((entry): entry is string => typeof entry === 'string')
    : [];
  if (row.kind === 'session') {
    if (typeof row.user_id !== 'string' || typeof row.role !== 'string') {
      throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
    }
    return { kind: 'session', tenantId: row.tenant_id.toLowerCase(), userId: row.user_id, role: row.role, deviceId: typeof row.device_id === 'string' ? row.device_id : null, capabilities: [] };
  }
  return { kind: 'device', tenantId: row.tenant_id.toLowerCase(), userId: null, role: null, deviceId: typeof row.device_id === 'string' ? row.device_id : null, capabilities };
}

/**
 * Auth-plane transaction: restricted role, no tenant settings. For
 * pre-authentication identity work only (PIN lookup, session mint).
 * Equivalent to the peer's `withAppTransaction`; implemented locally to
 * respect the server tsconfig boundary (no cross-project import).
 */
export function createAuthRunner(pool: PoolLike): AuthRunner {
  return async <T,>(callback: (tx: NativeExecutor) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE culinaryos_app');
      const tx: NativeExecutor = {
        query: async <Row,>(text: string, params?: unknown[]) => {
          const result = await client.query(text, params);
          return { rows: result.rows as Row[], rowCount: result.rowCount ?? 0 };
        },
      };
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Surface the original failure.
      }
      throw error;
    } finally {
      client.release();
    }
  };
}

/**
 * Token-bound tenant transaction. Resolves the opaque token hash through
 * `resolve_identity` AFTER the restricted role is set and fails closed on
 * zero rows (unknown, revoked, expired, or membership/device-invalid).
 * Then pins ONLY `app.token_hash`: every 007 policy re-derives the tenant
 * from that credential, so no tenant/user/role setting exists to forge.
 * The only input is the token hash. Tenant tables are unreachable without
 * a live credential.
 */
export function createTenantRunner(pool: PoolLike): TenantRunner {
  return async <T,>(tokenHash: string, callback: (tx: NativeExecutor, identity: NativeVerifiedIdentity) => Promise<T>): Promise<T> => {
    if (typeof tokenHash !== 'string' || !TOKEN_HASH_RE.test(tokenHash)) {
      throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE culinaryos_app');
      const found = await client.query(
        'SELECT kind, user_id, tenant_id, role, device_id, capabilities FROM public.resolve_identity($1)',
        [tokenHash],
      );
      const row = (found.rows as ResolveIdentityRow[])[0];
      if (!row) {
        throw new DomainError('UNAUTHORIZED', 'Invalid credential', 401);
      }
      const identity = toVerifiedIdentity(row);
      await client.query("SELECT set_config('app.token_hash', $1, true)", [tokenHash]);
      const tx: NativeExecutor = {
        query: async <Out,>(text: string, params?: unknown[]) => {
          const result = await client.query(text, params);
          return { rows: result.rows as Out[], rowCount: result.rowCount ?? 0 };
        },
      };
      const result = await callback(tx, identity);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Surface the original failure.
      }
      throw error;
    } finally {
      client.release();
    }
  };
}
