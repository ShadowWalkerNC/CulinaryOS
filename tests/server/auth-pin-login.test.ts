/**
 * Phase 0 — PIN login + ops waste (demo path without live Supabase).
 * Call Hono sub-apps directly (no bare `hono` import from tests/).
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import { authRoutes } from '../../apps/server/src/routes/auth.ts';
import { opsRoutes } from '../../apps/server/src/routes/ops.ts';

const TENANT = '00000000-0000-0000-0000-000000000001';

describe('POST /v1/auth/pin-login', () => {
  beforeAll(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.DEVICE_API_KEY = 'test-device-key-phase0';
    process.env.INTERNAL_API_KEY = 'test-internal-key-phase0';
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
  });

  it('demo PIN 1234 returns session with device token', async () => {
    const res = await authRoutes.request('/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234', tenant_id: TENANT }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.mode).toBe('demo');
    expect(body.data.role).toBe('server');
    expect(body.data.accessToken).toBe('test-device-key-phase0');
  });

  it('invalid PIN rejected', async () => {
    const res = await authRoutes.request('/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '0000' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /v1/ops/waste (demo)', () => {
  beforeAll(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.DEVICE_API_KEY = 'test-device-key-phase0';
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
  });

  it('accepts waste without live supabase', async () => {
    const res = await opsRoutes.request('/waste', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT,
        Authorization: 'Bearer test-device-key-phase0',
      },
      body: JSON.stringify({
        ingredient: 'salmon',
        quantity_grams: 200,
        cost_per_gram: 0.05,
        reason: 'spoilage',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.waste_cost).toBe(10);
  });
});
