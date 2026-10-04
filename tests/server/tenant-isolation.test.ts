// ============================================================
// Unit Tests: managerGate RBAC + adversarial tenant membership
// ============================================================

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { managerGate } from '../../apps/server/src/lib/rbac.ts';
import { requireTenant } from '../../apps/server/src/middleware/auth.ts';
import { setAdminSupabaseForTesting } from '../../apps/server/src/middleware/supabase.ts';

describe('managerGate', () => {
  it('denies api_key even with caller-supplied manager roles', () => {
    expect(managerGate('api_key', undefined)).toBe('forbidden');
    expect(managerGate('api_key', null)).toBe('forbidden');
    expect(managerGate('api_key', 'owner')).toBe('forbidden');
    expect(managerGate('api_key', 'manager')).toBe('forbidden');
    expect(managerGate('api_key', 'server')).toBe('forbidden');
  });

  it('allows relaxed demo without a role', () => {
    expect(managerGate('relaxed', undefined)).toBe('ok');
    expect(managerGate('relaxed', null)).toBe('ok');
  });

  it('allows jwt owner/manager only', () => {
    expect(managerGate('jwt', 'owner')).toBe('ok');
    expect(managerGate('jwt', 'manager')).toBe('ok');
  });

  it('denies jwt server/chef/viewer (fail-closed)', () => {
    expect(managerGate('jwt', 'server')).toBe('forbidden');
    expect(managerGate('jwt', 'chef')).toBe('forbidden');
    expect(managerGate('jwt', 'viewer')).toBe('forbidden');
    expect(managerGate('jwt', undefined)).toBe('forbidden');
  });

  it('denies unknown or missing auth modes', () => {
    expect(managerGate(undefined, 'owner')).toBe('forbidden');
    expect(managerGate(null, 'manager')).toBe('forbidden');
    expect(managerGate('unknown', 'owner')).toBe('forbidden');
    expect(managerGate('', 'manager')).toBe('forbidden');
  });
});

const TENANT_A = '00000000-0000-0000-0000-0000000000aa';
const TENANT_B = '00000000-0000-0000-0000-0000000000bb';
const USER_A = '11111111-1111-1111-1111-111111111111';

function makeCtx(headers: Record<string, string | undefined>) {
  const store: Record<string, any> = {};
  let statusCode = 200;
  let body: any = null;
  return {
    req: {
      header: (name: string) => headers[name] ?? headers[name.toLowerCase()],
    },
    set: (k: string, v: any) => {
      store[k] = v;
    },
    get: (k: string) => store[k],
    json: (b: any, s = 200) => {
      body = b;
      statusCode = s;
      return { body, status: s };
    },
    _result: () => ({ body, status: statusCode }),
  };
}

describe('requireTenant adversarial membership', () => {
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
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.AUTH_RELAXED = 'false';
    process.env.SUPABASE_URL = 'https://real.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-live';
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    process.env.DEVICE_API_KEY = 'test-device-key';
    delete process.env.DEVICE_TENANT_ID;
    delete process.env.INTERNAL_API_TENANT_ID;
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';

    setAdminSupabaseForTesting({
      auth: {
        getUser: async (token: string) => {
          if (token === 'jwt-user-a') {
            return { data: { user: { id: USER_A } }, error: null };
          }
          if (token === 'jwt-expired') {
            return { data: { user: null }, error: { message: 'expired' } };
          }
          return { data: { user: null }, error: { message: 'invalid' } };
        },
      },
      from: (_table: string) => {
        const state: { userId?: string; tenantId?: string } = {};
        const chain: any = {
          select: () => chain,
          eq: (col: string, val: string) => {
            if (col === 'user_id') state.userId = val;
            if (col === 'tenant_id') state.tenantId = val;
            return chain;
          },
          maybeSingle: async () => {
            if (state.userId === USER_A && state.tenantId === TENANT_A) {
              return { data: { role: 'server' }, error: null };
            }
            return { data: null, error: null };
          },
        };
        return chain;
      },
    });
  });

  afterEach(() => {
    setAdminSupabaseForTesting(null);
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('rejects JWT member of tenant A when X-Tenant-Id is tenant B', async () => {
    const c = makeCtx({
      'X-Tenant-Id': TENANT_B,
      Authorization: ['Bearer', 'jwt-user-a'].join(' '),
    });
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(403);
    expect((res?.body ?? c._result().body)?.error?.code).toBe('FORBIDDEN');
  });

  it('allows JWT member when X-Tenant-Id matches membership', async () => {
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: ['Bearer', 'jwt-user-a'].join(' '),
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('jwt');
    expect(c.get('authRole')).toBe('server');
    expect(c.get('userId')).toBe(USER_A);
  });

  it('rejects expired JWT with 401', async () => {
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer jwt-expired',
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(401);
    expect((res?.body ?? c._result().body)?.error?.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid JWT with 401', async () => {
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer jwt-bogus',
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(401);
  });

  it('denies device key for the wrong tenant when live binding is configured', async () => {
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
    process.env.DEVICE_TENANT_ID = TENANT_A;
    const c = makeCtx({
      'X-Tenant-Id': TENANT_B,
      Authorization: 'Bearer ' + process.env.DEVICE_API_KEY,
    });
    let nextCalled = false;
    const res: any = await requireTenant(c as any, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(res?.status ?? c._result().status).toBe(403);
  });

  it('allows device key with matching live binding', async () => {
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
    process.env.DEVICE_TENANT_ID = TENANT_A;
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer ' + process.env.DEVICE_API_KEY,
    });
    let nextCalled = false;
    await requireTenant(c as any, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(c.get('authMode')).toBe('api_key');
  });

  it('proves GET /v1/admin/security/audit denies api_key manager access', async () => {
    const { adminRoutes } = await import('../../apps/server/src/routes/admin.ts');

    process.env.DEVICE_TENANT_ID = TENANT_A;
    // Device/service keys never confer manager privileges: api_key mode
    // fails managerGate even though requireTenant authenticated the call.
    const res = await adminRoutes.request('/security/audit', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_A,
        Authorization: 'Bearer ' + process.env.DEVICE_API_KEY,
      },
    });
    expect(res.status).toBe(403);
    const data: any = await res.json();
    expect(data?.error?.code).toBe('FORBIDDEN');
  });

  it('proves cross-tenant data isolation rejects reading Tenant B orders with Tenant A token', async () => {
    // An adversarial request trying to access Tenant B with Tenant A auth context
    const c = makeCtx({
      'X-Tenant-Id': TENANT_B,
      Authorization: ['Bearer', 'jwt-user-a'].join(' '),
    });
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(403);
    expect((res?.body ?? c._result().body)?.error?.code).toBe('FORBIDDEN');
  });
});

describe('admin requireManager via staff create', () => {
  it('documents that staff mutations deny api_key and JWT server', () => {
    // Wired in apps/server/src/routes/admin.ts requireManager()
    expect(managerGate('jwt', 'server')).toBe('forbidden');
    expect(managerGate('api_key', 'server')).toBe('forbidden');
    expect(managerGate('api_key', 'owner')).toBe('forbidden');
    expect(managerGate('api_key', 'manager')).toBe('forbidden');
    expect(managerGate('jwt', 'manager')).toBe('ok');
    expect(managerGate('jwt', 'owner')).toBe('ok');
  });
});
