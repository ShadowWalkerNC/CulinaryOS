// ============================================================
// Unit Tests: managerGate RBAC + adversarial tenant membership
// ============================================================

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { managerGate } from '../../apps/server/src/lib/rbac.ts';

describe('managerGate', () => {
  it('allows api_key and relaxed without a role', () => {
    expect(managerGate('api_key', undefined)).toBe('ok');
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
  ] as const;
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.AUTH_RELAXED = 'false';
    process.env.SUPABASE_URL = 'https://real.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-live';
    process.env.INTERNAL_API_KEY = 'test-internal-key';
    process.env.DEVICE_API_KEY = 'test-device-key';

    mock.module('../../apps/server/src/middleware/supabase.ts', () => ({
      adminSupabase: () => ({
        auth: {
          getUser: async (token: string) => {
            if (token === 'jwt-user-a') {
              return { data: { user: { id: USER_A } }, error: null };
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
      }),
    }));
  });

  afterEach(() => {
    mock.restore();
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('rejects JWT member of tenant A when X-Tenant-Id is tenant B', async () => {
    // Fresh import after mock.module
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_B,
      Authorization: 'Bearer jwt-user-a',
    });
    const res: any = await requireTenant(c as any, async () => {});
    expect(res?.status ?? c._result().status).toBe(403);
    expect((res?.body ?? c._result().body)?.error?.code).toBe('FORBIDDEN');
  });

  it('allows JWT member when X-Tenant-Id matches membership', async () => {
    const { requireTenant } = await import('../../apps/server/src/middleware/auth.ts');
    const c = makeCtx({
      'X-Tenant-Id': TENANT_A,
      Authorization: 'Bearer jwt-user-a',
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
});

describe('admin requireManager via staff create', () => {
  it('documents that staff mutations use managerGate (JWT server forbidden)', () => {
    // Wired in apps/server/src/routes/admin.ts requireManager()
    expect(managerGate('jwt', 'server')).toBe('forbidden');
    expect(managerGate('api_key', 'server')).toBe('ok');
  });
});
