// ============================================================
// CulinaryOS — Shared Middleware
// Auth: JWT membership OR internal/device API key + X-Tenant-Id
// ============================================================

import type { Context, Next } from 'hono';
import type { Env } from '../types.js';
import { adminSupabase } from './supabase.js';
import { isLiveSupabaseConfigured, isPlaceholderSecret } from '../lib/secrets.js';

function isAuthRelaxed(): boolean {
  if (process.env.AUTH_RELAXED === 'true') return true;
  // Demo / local without live Supabase — keep header-only tenant mode
  return !isLiveSupabaseConfigured();
}

function extractBearer(c: Context<Env>): string | null {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function isServiceOrDeviceKey(token: string): boolean {
  const internal = process.env.INTERNAL_API_KEY;
  const device = process.env.DEVICE_API_KEY;
  if (internal && !isPlaceholderSecret(internal) && token === internal) return true;
  if (device && !isPlaceholderSecret(device) && token === device) return true;
  return false;
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
 *   3. X-Tenant-Id only when AUTH_RELAXED or Supabase is not configured (local demo)
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

  if (token && isServiceOrDeviceKey(token)) {
    c.set('authMode', 'api_key');
    await next();
    return;
  }

  if (token) {
    const supabase = adminSupabase();
    if (!supabase) {
      if (isAuthRelaxed()) {
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

  if (isAuthRelaxed()) {
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
  if (!key || key !== process.env.INTERNAL_API_KEY) {
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
