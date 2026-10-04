// ============================================================
// Unit Tests: device/internal API key tenant boundary (E03/P2b)
// Bounded containment: outside isDemoAuthAllowed(), a matching
// DEVICE_API_KEY requires DEVICE_TENANT_ID (valid UUID) matching
// the requested tenant; a matching INTERNAL_API_KEY on tenant
// routes requires INTERNAL_API_TENANT_ID matching the tenant.
// Missing/invalid/mismatched binding denies access. Ambiguous
// same internal/device key outside demo denies rather than
// falling back. requireApiKey service endpoints are unchanged.
// ============================================================

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const TENANT_A = '00000000-0000-0000-0000-0000000000aa';
const TENANT_B = '00000000-0000-0000-0000-0000000000bb';
const DEVICE_KEY = 'test-device-key-bound-001';
const INTERNAL_KEY = 'test-internal-key-bound-001';
const SAME_KEY = 'test-same-key-ambiguous-001';

function makeCtx(headers: Record<string, string | undefined>) {
  const store: Record<string, any> = {};
  let statusCode = 200;
  let body: any = null;
  return {
    req: {
      header: (name: string) => headers[name] ?? headers[name.toLowerCase()],
    },
    set: (k: string, v: any) => { store[k] = v; },
    get: (k: string) => store[k],
    json: (b: any, s = 200) => {
      body = b;
      statusCode = s;
      return { body, status: s };
    },
    _result: () => ({ body, status: statusCode }),
  };
}

const ENV_KEYS = [
  'AUTH_RELAXED',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_API_KEY',
  'DEVICE_API_KEY',
  'DEVICE_TENANT_ID',
  'INTERNAL_API_TENANT_ID',
  'CULINARYOS_ALLOW_LIVE_TEST_SERVICES',
] as const;

function liveEnv() {
  process.env.AUTH_RELAXED = 'false';
  process.env.SUPABASE_URL = 'https://real.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-live';
  process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
}

function demoEnv() {
  process.env.AUTH_RELAXED = 'true';
  process.env.SUPABASE_URL = 'https://your-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  delete process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES;
}

describe('device/internal key tenant boundary', () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    liveEnv();
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    process.env.DEVICE_API_KEY = DEVICE_KEY;
    delete process.env.DEVICE_TENANT_ID;
    delete process.env.INTERNAL_API_TENANT_ID;
  });

  afterEach(async () => {
    const { setAdminSupabaseForTesting } = await import(
      '../../apps/server/src/middleware/supabase.ts'
    );
    setAdminSupabaseForTesting(null);
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('allows device key with valid tenant binding (scoped access)', async () => {
    process.env.DEVICE_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${DEVICE_KEY}`,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('denies device key when binding is missing outside demo', async () => {
    delete process.env.DEVICE_TENANT_ID;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${DEVICE_KEY}`,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
    expect((res?.body ?? c._result().body)?.error?.code).toBe('FORBIDDEN');
  });

  it('denies device key for the wrong tenant (cross-tenant containment)', async () => {
    process.env.DEVICE_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_B,
      Authorization: `Bearer ${DEVICE_KEY}`,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
  });

  it('denies device key when binding is not a valid UUID', async () => {
    process.env.DEVICE_TENANT_ID = 'not-a-uuid';
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${DEVICE_KEY}`,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
  });

  it('allows internal key with valid tenant binding on tenant routes', async () => {
    process.env.INTERNAL_API_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${INTERNAL_KEY}`,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('denies internal key on tenant routes when binding is missing or mismatched', async () => {
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    delete process.env.INTERNAL_API_TENANT_ID;
    const missing = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${INTERNAL_KEY}`,
    });
    let nextCalled = false;
    const resMissing: any = await requireTenant(missing as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(resMissing?.status ?? missing._result().status).toBe(403);

    process.env.INTERNAL_API_TENANT_ID = TENANT_B;
    const wrong = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${INTERNAL_KEY}`,
    });
    nextCalled = false;
    const resWrong: any = await requireTenant(wrong as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(resWrong?.status ?? wrong._result().status).toBe(403);
  });

  it('rejects ambiguous same internal/device key outside demo', async () => {
    process.env.INTERNAL_API_KEY = SAME_KEY;
    process.env.DEVICE_API_KEY = SAME_KEY;
    process.env.DEVICE_TENANT_ID = TENANT_A;
    process.env.INTERNAL_API_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${SAME_KEY}`,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(401);
  });

  it('preserves demo compatibility: same keys allowed when demo predicate permits', async () => {
    demoEnv();
    process.env.INTERNAL_API_KEY = SAME_KEY;
    process.env.DEVICE_API_KEY = SAME_KEY;
    delete process.env.DEVICE_TENANT_ID;
    delete process.env.INTERNAL_API_TENANT_ID;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${SAME_KEY}`,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('preserves demo compatibility: device key without binding when demo allowed', async () => {
    demoEnv();
    process.env.DEVICE_API_KEY = DEVICE_KEY;
    delete process.env.DEVICE_TENANT_ID;
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: `Bearer ${DEVICE_KEY}`,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('never grants api_key for placeholder keys', async () => {
    process.env.DEVICE_API_KEY = 'placeholder-device-key';
    const { setAdminSupabaseForTesting } = await import(
      '../../apps/server/src/middleware/supabase.ts'
    );
    setAdminSupabaseForTesting({
      auth: {
        getUser: async () => ({ data: { user: null }, error: { message: 'invalid' } }),
      },
    });
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer placeholder-device-key',
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(c.get('authMode')).not.toBe('api_key');
    expect(res?.status ?? c._result().status).toBe(401);
  });

  it('leaves requireApiKey service endpoints unchanged (no tenant binding)', async () => {
    delete process.env.DEVICE_TENANT_ID;
    delete process.env.INTERNAL_API_TENANT_ID;
    const { requireApiKey } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({ Authorization: `Bearer ${INTERNAL_KEY}` });
    let nextCalled = false;
    await requireApiKey(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    const denied = makeCtx({ Authorization: 'Bearer wrong-key' });
    nextCalled = false;
    const res: any = await requireApiKey(denied as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? denied._result().status).toBe(401);
  });
});
