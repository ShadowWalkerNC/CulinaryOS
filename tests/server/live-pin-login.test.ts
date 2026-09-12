import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { authRoutes } from '../../apps/server/src/routes/auth.ts';
import { setAdminSupabaseForTesting } from '../../apps/server/src/middleware/supabase.ts';

const TENANT = '00000000-0000-0000-0000-000000000001';
const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEVICE_API_KEY',
  'CULINARYOS_ALLOW_LIVE_TEST_SERVICES',
] as const;

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function noMatchingPinAdmin() {
  const result = { data: [], error: null };
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return {
    from: () => chain,
    auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
  };
}

describe('live PIN authentication boundary', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.SUPABASE_URL = 'https://real.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key-live';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-live';
    process.env.DEVICE_API_KEY = 'device-key-live';
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
    setAdminSupabaseForTesting(noMatchingPinAdmin());
  });

  afterEach(() => {
    setAdminSupabaseForTesting(null);
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('never turns a demo PIN into a device session when live auth finds no staff match', async () => {
    const response = await authRoutes.request('/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '5678', tenant_id: TENANT }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.data).toBeUndefined();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
