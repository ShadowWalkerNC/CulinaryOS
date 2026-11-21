process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'bun:test';
import { app } from '../../apps/server/src/index.ts';
import {
  resetNativeStartupState,
  setupNativePostgres,
} from '../../apps/server/src/postgres/startup.ts';

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const GOOD_ROLE_ROW = {
  login: 'culinaryos_runtime_test',
  effective: 'culinaryos_runtime_test',
  login_superuser: false,
  login_bypassrls: false,
  login_canlogin: true,
  login_app_member: true,
  login_identity_member: false,
  login_owned_public_tables: 0,
};

function createCutoverPool() {
  const client = {
    async query(sql: string) {
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      }
      if (sql.includes('session_user AS login')) {
        return { rows: [GOOD_ROLE_ROW], rowCount: 1 };
      }
      if (sql.includes('resolve_identity')) {
        return {
          rows: [
            {
              kind: 'session',
              tenant_id: TENANT_ID,
              user_id: USER_ID,
              role: 'manager',
              device_id: null,
              capabilities: [],
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  return {
    connect: async () => client,
    end: async () => {},
  };
}

describe('Live Server Entrypoint Native PostgreSQL Cutover (BLOCKER-2)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetNativeStartupState();
    delete process.env.CULINARYOS_NATIVE_PG;
    delete process.env.DATABASE_URL;
    delete process.env.CULINARYOS_AUTO_MIGRATE;
  });

  afterEach(() => {
    resetNativeStartupState();
    process.env = { ...originalEnv };
  });

  it('allows the idempotency header used by cross-origin POS writes', async () => {
    const response = await app.request('/v1/orders', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5172',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type,idempotency-key',
      },
    });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('Access-Control-Allow-Headers') ?? '', /idempotency-key/i);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5172');
  });

  it('refuses legacy signup, interagency and internal routes in native mode', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    await setupNativePostgres(app, { pool: createCutoverPool() as never });
    for (const path of ['/v1/auth/signup', '/v1/interagency/authorize', '/internal/events']) {
      const response = await app.request(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'operator@example.invalid', password: 'fictional-password', restaurant_name: 'Test' }),
      });
      assert.equal(response.status, 503);
      assert.equal((await response.json() as { error: { code: string } }).error.code, 'NATIVE_FEATURE_UNAVAILABLE');
    }
  });
  it('refuses API access before native startup succeeds', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const response = await app.request('/v1/auth/signup', { method: 'POST' });
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { error: { code: string } }).error.code, 'NATIVE_BACKEND_UNAVAILABLE');
  });
  it('preserves a supported native route reporting a missing order', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    await setupNativePostgres(app, { pool: createCutoverPool() as never });
    const response = await app.request('/v1/orders/dddddddd-dddd-dddd-dddd-dddddddddddd', {
      headers: { Authorization: `Bearer cs_${'z'.repeat(43)}` },
    });
    assert.equal(response.status, 404);
    assert.equal((await response.json() as { error: { code: string } }).error.code, 'NOT_FOUND');
  });
  it('routes /v1/* and /v1/native/* on live server app to nativeApp when CULINARYOS_NATIVE_PG=true', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const pool = createCutoverPool();
    await setupNativePostgres(app, { pool: pool as never });

    const token = `cs_${'z'.repeat(43)}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const resNative = await app.request('/v1/native/auth/me', { headers });
    assert.equal(resNative.status, 200);
    const bodyNative = (await resNative.json()) as {
      ok: boolean;
      data: { tenantId: string; role: string };
    };
    assert.equal(bodyNative.ok, true);
    assert.equal(bodyNative.data.tenantId, TENANT_ID);

    // Verify /v1/auth/me on the live app is served by nativeApp (priority over legacy authRoutes)
    const resV1 = await app.request('/v1/auth/me', { headers });
    assert.equal(resV1.status, 200);
    const bodyV1 = (await resV1.json()) as {
      ok: boolean;
      data: { tenantId: string; role: string };
    };
    assert.equal(bodyV1.ok, true);
    assert.equal(bodyV1.data.tenantId, TENANT_ID);

    // Verify tenant header forgery on /v1/orders is caught by nativeApp middleware (403)
    const forgedRes = await app.request('/v1/orders', {
      method: 'POST',
      headers: {
        ...headers,
        'X-Tenant-Id': '99999999-9999-9999-9999-999999999999',
      },
      body: JSON.stringify({ tableNumber: '1', coverCount: 2, serverName: 'Test' }),
    });
    assert.equal(forgedRes.status, 403);
  });

  it('automatically enables native PostgreSQL cutover when DATABASE_URL is set without CULINARYOS_NATIVE_PG and runs migrations when CULINARYOS_AUTO_MIGRATE=true', async () => {
    process.env.DATABASE_URL = 'postgresql://runtime:fictional@db.invalid/culinaryos';
    process.env.CULINARYOS_AUTO_MIGRATE = 'true';
    const pool = createCutoverPool();
    const state = await setupNativePostgres(app, { pool: pool as never });
    assert.equal(state.enabled, true);
    assert.ok(Array.isArray(state.appliedMigrations));
    assert.ok(state.appliedMigrations.length >= 9);

    const token = `cs_${'z'.repeat(43)}`;
    const resV1 = await app.request('/v1/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    assert.equal(resV1.status, 200);
    const bodyV1 = (await resV1.json()) as {
      ok: boolean;
      data: { tenantId: string; role: string };
    };
    assert.equal(bodyV1.ok, true);
    assert.equal(bodyV1.data.tenantId, TENANT_ID);
  });
});
