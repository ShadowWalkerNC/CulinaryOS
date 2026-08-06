// ============================================================
// Unit Tests: requireTenant auth middleware
// ============================================================

import { describe, it, expect, beforeEach } from 'bun:test';

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

describe('requireTenant middleware', () => {
  beforeEach(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = '';
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    process.env.DEVICE_API_KEY = 'test-device-key';
  });

  it('rejects missing X-Tenant-Id', async () => {
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({});
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(422);
  });

  it('rejects slug-like tenant ids', async () => {
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({ 'X-Tenant-Id': 'demo-bistro' });
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(422);
  });

  it('allows UUID tenant in relaxed mode without bearer', async () => {
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({ 'X-Tenant-Id': '00000000-0000-0000-0000-000000000001' });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('tenantId')).toBe('00000000-0000-0000-0000-000000000001');
    expect(c.get('authMode')).toBe('relaxed');
  });

  it('accepts device API key', async () => {
    process.env.AUTH_RELAXED = 'false';
    process.env.SUPABASE_URL = 'https://real.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
      Authorization: 'Bearer test-device-key',
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });
});
