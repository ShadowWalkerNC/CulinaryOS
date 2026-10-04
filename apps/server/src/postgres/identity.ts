import { createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
import { DomainError, opaqueToken, tokenHash, uuid } from './domain.js';
import { getPinLookupSecret } from './config.js';
import type { NativeExecutor, NativeVerifiedIdentity } from './executor.js';

export type { NativeAuthKind, NativeVerifiedIdentity as NativeAuthContext } from './executor.js';

export interface PoolLike {
  connect(): Promise<{
    query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
    release(): void;
  }>;
}

interface ResolveIdentityRow {
  kind: string;
  user_id: string | null;
  tenant_id: string;
  role: string | null;
  device_id: string | null;
  capabilities: unknown;
}

const TOKEN_RE = /^(cs|cd)_[A-Za-z0-9_-]{43}$/;
const MANAGER_ROLES = new Set(['owner', 'manager']);

export function hasCapability(context: NativeVerifiedIdentity, capability: string): boolean {
  if (context.kind !== 'device') return false;
  return context.capabilities.includes(capability);
}

/**
 * Route capability check. Human sessions pass (role gates apply separately);
 * device keys must carry the required verified capability.
 */
export function satisfiesCapability(context: NativeVerifiedIdentity, capability: string): boolean {
  if (context.kind !== 'device') return true;
  return context.capabilities.includes(capability);
}

/** Human manager only. Device keys never satisfy, even with capabilities. */
export function managerGateNative(context: NativeVerifiedIdentity | null): 'ok' | 'forbidden' {
  if (!context) return 'forbidden';
  if (context.kind !== 'session') return 'forbidden';
  if (context.role && MANAGER_ROLES.has(context.role)) return 'ok';
  return 'forbidden';
}

function normalizeCapabilities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

/**
 * Verify an opaque token against `resolve_identity`.
 * Uses a dedicated checkout with `SET LOCAL ROLE` only; never presets
 * `app.tenant_id` from a caller header. Tenant comes from the database.
 */
export async function resolveNativeIdentity(pool: PoolLike, token: string): Promise<NativeVerifiedIdentity | null> {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const hash = tokenHash(token);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE culinaryos_app');
    const result = await client.query('SELECT * FROM public.resolve_identity($1)', [hash]);
    await client.query('COMMIT');
    const row = (result.rows as ResolveIdentityRow[])[0];
    if (!row) return null;
    if (row.kind !== 'session' && row.kind !== 'device') return null;
    let tenantId: string;
    try {
      tenantId = uuid(row.tenant_id, 'tenant');
    } catch {
      return null;
    }
    if (row.kind === 'session') {
      if (!row.user_id || !row.role) return null;
      return {
        kind: 'session',
        tenantId,
        userId: row.user_id,
        role: row.role,
        deviceId: row.device_id,
        capabilities: [],
      };
    }
    return {
      kind: 'device',
      tenantId,
      userId: null,
      role: null,
      deviceId: row.device_id,
      capabilities: normalizeCapabilities(row.capabilities),
    };
  } catch {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Surface null, not rollback noise.
    }
    return null;
  } finally {
    client.release();
  }
}

/** HMAC contract proposal: HMAC-SHA256(secret, "<tenant>:<pin>"). Hex output. */
export function pinLookupHash(tenantId: string, pin: string, secret: string): string {
  return createHmac('sha256', secret).update(`${tenantId.toLowerCase()}:${pin}`).digest('hex');
}

/**
 * Asynchronous scrypt verification (same `<saltHex>:<hashHex>` format as the
 * existing PIN helper). Async so PIN logins never block the request loop.
 */
export async function verifyPinHash(pin: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  let prev: Buffer;
  try {
    prev = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  const next = (await scryptAsync(pin, salt, 32)) as Buffer;
  if (prev.length !== next.length) return false;
  try {
    return timingSafeEqual(prev, next);
  } catch {
    return false;
  }
}

export interface PinLoginResult {
  token: string;
  userId: string;
  tenantId: string;
  role: string;
  displayName: string;
  expiresAt: string;
}

interface StaffPinRow {
  user_id: string;
  pin_hash: string;
  display_name: string;
}

/**
 * PIN-first login: `find_staff_pin` + off-DB scrypt verification, then the
 * 007 `mint_session(hash, user, tenant, device, expires, pinProof, NULL)`
 * lifecycle function (direct `auth_sessions` writes are revoked for the
 * runtime role). The role comes from the live membership row inside
 * `mint_session`, never from a caller argument, and the database re-checks
 * the PIN proof at the mint boundary. Tenant comes from the verified PIN
 * scope, not headers. Callers must run this inside a `culinaryos_app`
 * checkout; `tx` is that handle.
 */
export async function verifyPinAndMintSession(
  tx: NativeExecutor,
  input: { tenantId: string; pin: string; deviceId?: string | null; ttlHours?: number },
): Promise<PinLoginResult> {
  const tenantId = uuid(input.tenantId, 'tenant');
  if (!/^\d{4,8}$/.test(input.pin)) {
    throw new DomainError('VALIDATION_ERROR', 'PIN must be 4-8 digits', 422);
  }
  const secret = getPinLookupSecret();
  if (!secret) {
    throw new DomainError('SERVICE_UNAVAILABLE', 'PIN login is not configured', 503);
  }
  const lookup = pinLookupHash(tenantId, input.pin, secret);
  const pinResult = await tx.query<StaffPinRow>('SELECT * FROM public.find_staff_pin($1, $2)', [tenantId, lookup]);
  const candidate = pinResult.rows[0];
  if (!candidate || !(await verifyPinHash(input.pin, candidate.pin_hash))) {
    throw new DomainError('UNAUTHORIZED', 'Invalid PIN', 401);
  }
  const ttl = input.ttlHours ?? 12;
  if (!Number.isSafeInteger(ttl) || ttl < 1 || ttl > 72) {
    throw new DomainError('VALIDATION_ERROR', 'Session TTL must be 1-72 hours', 422);
  }
  let deviceId: string | null = null;
  if (input.deviceId !== undefined && input.deviceId !== null) {
    deviceId = uuid(input.deviceId, 'device');
  }
  const token = opaqueToken('session');
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + ttl * 3600_000).toISOString();
  let role: string;
  try {
    const minted = await tx.query<{ mint_session: string }>(
      'SELECT public.mint_session($1, $2, $3, $4, $5, $6, NULL) AS mint_session',
      [hash, candidate.user_id, tenantId, deviceId, expiresAt, lookup],
    );
    role = minted.rows[0]?.mint_session ?? '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('no membership')) {
      throw new DomainError('FORBIDDEN', 'Staff membership not found', 403);
    }
    if (message.includes('device is unknown')) {
      throw new DomainError('VALIDATION_ERROR', 'Device is unknown, revoked, or expired', 422);
    }
    if (message.includes('PIN proof invalid')) {
      throw new DomainError('UNAUTHORIZED', 'Invalid PIN', 401);
    }
    throw error;
  }
  if (!role) throw new DomainError('INTERNAL_ERROR', 'Session mint failed', 500);
  return { token, userId: candidate.user_id, tenantId, role, displayName: candidate.display_name, expiresAt };
}
