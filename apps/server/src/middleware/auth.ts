// ============================================================
// CulinaryOS — Shared Middleware
// Migrated from backend/middleware/auth.ts
// ============================================================

import type { Context, Next } from 'hono';

// Service-to-service API key auth
export async function requireApiKey(c: Context, next: Next) {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return c.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } },
      401
    );
  }
  await next();
}

// Tenant context — every request must carry X-Tenant-Id
export async function requireTenant(c: Context, next: Next) {
  const tenantId = c.req.header('X-Tenant-Id');
  if (!tenantId) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Missing X-Tenant-Id header' } },
      422
    );
  }
  c.set('tenantId', tenantId);
  c.set('callerService', c.req.header('X-Caller-Service') ?? 'unknown');
  c.set('requestId', c.req.header('X-Request-Id') ?? crypto.randomUUID());
  await next();
}

// Standard success response
export function ok<T>(c: Context, data: T, status = 200) {
  return c.json({
    ok: true,
    requestId: c.get('requestId'),
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME ?? 'culinaryos',
    data,
  }, status as any);
}

// Standard error response
export function err(c: Context, code: string, message: string, status = 400, details?: unknown) {
  return c.json({
    ok: false,
    requestId: c.get('requestId'),
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME ?? 'culinaryos',
    error: { code, message, ...(details ? { details } : {}) },
  }, status as any);
}
