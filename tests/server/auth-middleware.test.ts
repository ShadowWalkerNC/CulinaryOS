// ============================================================
// Unit Tests: requireTenant auth middleware
// ============================================================

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const TENANT_A = '00000000-0000-0000-0000-000000000001';
const TENANT_B = '00000000-0000-0000-0000-000000000002';

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
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
  process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
}

describe('requireTenant middleware', () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(async () => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.AUTH_RELAXED = 'true';
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    process.env.DEVICE_API_KEY = 'test-device-key';
    delete process.env.DEVICE_TENANT_ID;
    delete process.env.INTERNAL_API_TENANT_ID;
    delete process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES;
    const { setAdminSupabaseForTesting } = await import('../../apps/server/src/middleware/supabase.ts');
    // Even an unexpected bearer must not trigger a network request in this suite.
    setAdminSupabaseForTesting({
      auth: { getUser: async () => ({ data: { user: null }, error: { message: 'invalid fixture token' } }) },
    });
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

  it('rejects missing X-Tenant-Id', async () => {
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({});
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(422);
  });

  it('rejects slug-like tenant ids', async () => {
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({ 'X-Tenant-Id': 'demo-bistro' });
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(422);
  });

  it('allows UUID tenant in relaxed mode without bearer', async () => {
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({ 'X-Tenant-Id': TENANT_A });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('tenantId')).toBe(TENANT_A);
    expect(c.get('authMode')).toBe('relaxed');
  });

  it('accepts device API key with valid tenant binding outside demo', async () => {
    liveEnv();
    process.env.DEVICE_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer ' + process.env.DEVICE_API_KEY,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('denies device API key without tenant binding outside demo', async () => {
    liveEnv();
    delete process.env.DEVICE_TENANT_ID;
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer ' + process.env.DEVICE_API_KEY,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
    expect((res?.body ?? c._result().body)?.error?.code).toBe('FORBIDDEN');
  });

  it('denies device API key for the wrong tenant outside demo', async () => {
    liveEnv();
    process.env.DEVICE_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_B,
      Authorization: 'Bearer ' + process.env.DEVICE_API_KEY,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
  });

  it('accepts internal API key with valid tenant binding on tenant routes', async () => {
    liveEnv();
    process.env.INTERNAL_API_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer ' + process.env.INTERNAL_API_KEY,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('denies internal API key with mismatched binding on tenant routes', async () => {
    liveEnv();
    process.env.INTERNAL_API_TENANT_ID = TENANT_B;
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer ' + process.env.INTERNAL_API_KEY,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
  });

  it('rejects ambiguous same internal/device key outside demo', async () => {
    liveEnv();
    process.env.INTERNAL_API_KEY = 'same-key-both';
    process.env.DEVICE_API_KEY = 'same-key-both';
    process.env.DEVICE_TENANT_ID = TENANT_A;
    process.env.INTERNAL_API_TENANT_ID = TENANT_A;
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer same-key-both',
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(401);
  });

  it('allows same keys when demo predicate permits (compatibility)', async () => {
    process.env.INTERNAL_API_KEY = 'same-key-both';
    process.env.DEVICE_API_KEY = 'same-key-both';
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer same-key-both',
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('never grants api_key for placeholder keys', async () => {
    liveEnv();
    process.env.DEVICE_API_KEY = 'placeholder-device-key';
    const { setAdminSupabaseForTesting } = await import(
      '../../apps/server/src/middleware/supabase.ts'
    );
    setAdminSupabaseForTesting({
      auth: {
        getUser: async () => ({ data: { user: null }, error: { message: 'invalid' } }),
      },
    });
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
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

  it('keeps configured credentials out of ordinary automated tests', async () => {
    process.env.SUPABASE_URL = 'https://real.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    delete process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES;
    const { setAdminSupabaseForTesting } = await import('../../apps/server/src/middleware/supabase.ts');
    // Even an unexpected bearer must not trigger a network request in this suite.
    setAdminSupabaseForTesting({
      auth: { getUser: async () => ({ data: { user: null }, error: { message: 'invalid fixture token' } }) },
    });

    const { isLiveSupabaseConfigured } = await import('@culinaryos/server/lib/secrets');
    expect(isLiveSupabaseConfigured()).toBe(false);
  });

  it('never allows header-only authentication when live credentials are configured', async () => {
    process.env.AUTH_RELAXED = 'true';
    process.env.SUPABASE_URL = 'https://real.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
    const { requireTenant } = await import('@culinaryos/server/middleware/auth');
    const c = makeCtx({ 'X-Tenant-Id': TENANT_A });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(401);
  });
});
