// ============================================================
// CulinaryOS — Shared Middleware
// Auth: JWT membership OR internal/device API key + X-Tenant-Id
// ============================================================

import type { Context, Next } from 'hono';
import type { Env } from '../types.js';
import { adminSupabase } from './supabase.js';
import { isDemoAuthAllowed, isPlaceholderSecret } from '../lib/secrets.js';

function extractBearer(c: Context<Env>): string | null {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string | undefined | null): boolean {
  return Boolean(value && UUID_RE.test(value));
}

function getConfiguredApiKey(kind: 'internal' | 'device'): string | null {
  const raw = kind === 'internal' ? process.env.INTERNAL_API_KEY : process.env.DEVICE_API_KEY;
  if (!raw || isPlaceholderSecret(raw)) return null;
  return raw;
}

async function verifyTenantMembership(
  userId: string,
  tenantId: string
): Promise<{ ok: true; role: string } | { ok: false }> {
  const supabase = adminSupabase();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from('tenant_users')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) return { ok: false };
  return { ok: true, role: data.role };
}

/**
 * Tenant context + authentication.
 * Accepts:
 *   1. Bearer Supabase JWT + X-Tenant-Id (membership verified)
 *   2. Bearer INTERNAL_API_KEY or DEVICE_API_KEY + X-Tenant-Id (terminals / MCP)
 *      Outside isDemoAuthAllowed(), a matching DEVICE_API_KEY requires
 *      DEVICE_TENANT_ID (valid UUID) matching the requested tenant, and a
 *      matching INTERNAL_API_KEY on tenant routes requires
 *      INTERNAL_API_TENANT_ID matching the tenant. Missing/invalid/
 *      mismatched binding denies access. An ambiguous same internal/device
 *      key value outside demo denies rather than falling back.
 *   3. X-Tenant-Id only when explicit local demo or isolated test mode
 *      is permitted by isDemoAuthAllowed(). Never enabled by missing production credentials.
 */
export async function requireTenant(c: Context<Env>, next: Next) {
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Missing X-Tenant-Id header' } },
      422
    );
  }

  // Reject obvious non-UUIDs that are slugs (online ordering bug)
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(tenantId) && tenantId !== 'demo') {
    return c.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'X-Tenant-Id must be a tenant UUID (resolve slug server-side)',
        },
      },
      422
    );
  }

  c.set('tenantId', tenantId);
  c.set('callerService', c.req.header('X-Caller-Service') ?? 'unknown');
  c.set('requestId', c.req.header('X-Request-Id') ?? crypto.randomUUID());

  const token = extractBearer(c);

  const internalKey = getConfiguredApiKey('internal');
  const deviceKey = getConfiguredApiKey('device');
  const matchesInternal = Boolean(token && internalKey && token === internalKey);
  const matchesDevice = Boolean(token && deviceKey && token === deviceKey);
  if (process.env.CULINARYOS_DEBUG_AUTH === 'true') {
    const codes = (s: string | null) => s === null ? null : { len: s.length, codes: [...s].map((ch) => ch.charCodeAt(0)) };
    console.log('[auth-debug]', JSON.stringify({ token, internalKey, deviceKey, matchesInternal, matchesDevice, demo: isDemoAuthAllowed(), tCodes: codes(token), dCodes: codes(deviceKey), iCodes: codes(internalKey) }));
  }

  if (token && (matchesInternal || matchesDevice)) {
    // Local demo compatibility: when the demo predicate permits, preserve
    // the existing key behavior without tenant binding.
    if (isDemoAuthAllowed()) {
      c.set('authMode', 'api_key');
      await next();
      return;
    }

    // Outside demo, an ambiguous same value for both keys denies access
    // rather than permitting a fallback scope.
    if (matchesInternal && matchesDevice) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Ambiguous API key configuration' } },
        401
      );
    }

    if (matchesDevice) {
      const binding = process.env.DEVICE_TENANT_ID ?? '';
      if (!isValidUuid(binding) || binding.toLowerCase() !== tenantId.toLowerCase()) {
        return c.json(
          { ok: false, error: { code: 'FORBIDDEN', message: 'API key not authorized for this tenant' } },
          403
        );
      }
      c.set('authMode', 'api_key');
      await next();
      return;
    }

    // Matching INTERNAL_API_KEY on tenant routes requires binding.
    const binding = process.env.INTERNAL_API_TENANT_ID ?? '';
    if (!isValidUuid(binding) || binding.toLowerCase() !== tenantId.toLowerCase()) {
      return c.json(
        { ok: false, error: { code: 'FORBIDDEN', message: 'API key not authorized for this tenant' } },
        403
      );
    }
    c.set('authMode', 'api_key');
    await next();
    return;
  }

  if (token) {
    const supabase = adminSupabase();
    if (!supabase) {
      if (isDemoAuthAllowed()) {
        c.set('authMode', 'relaxed');
        await next();
        return;
      }
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Auth backend unavailable' } },
        401
      );
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return c.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } },
        401
      );
    }

    const membership = await verifyTenantMembership(userData.user.id, tenantId);
    if (!membership.ok) {
      return c.json(
        {
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Not a member of this tenant' },
        },
        403
      );
    }

    c.set('userId', userData.user.id);
    c.set('authRole', membership.role);
    c.set('authMode', 'jwt');
    await next();
    return;
  }

  if (isDemoAuthAllowed()) {
    c.set('authMode', 'relaxed');
    await next();
    return;
  }

  return c.json(
    {
      ok: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization Bearer token required (user JWT or device API key)',
      },
    },
    401
  );
}

// Service-to-service API key auth
export async function requireApiKey(c: Context<Env>, next: Next) {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  const expected = process.env.INTERNAL_API_KEY;
  // Placeholder/empty keys never authenticate — fail closed.
  if (!key || !expected || isPlaceholderSecret(expected) || key !== expected) {
    return c.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } },
      401
    );
  }
  await next();
}

// Standard success response
export function ok<T>(c: Context<Env>, data: T, status = 200) {
  return c.json(
    {
      ok: true,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME ?? 'culinaryos',
      data,
    },
    status as any
  );
}

// Standard error response
export function err(
  c: Context<Env>,
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return c.json(
    {
      ok: false,
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME ?? 'culinaryos',
      error: { code, message, ...(details ? { details } : {}) },
    },
    status as any
  );
}

/** Escape text for safe HTML interpolation (HTMX / receipts). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
