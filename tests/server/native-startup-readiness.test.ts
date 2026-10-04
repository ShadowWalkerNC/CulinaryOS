process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'bun:test';
import { Hono } from 'hono';
import { app } from '../../apps/server/src/index.ts';
import {
  checkNativeHealth,
  getNativeStartupState,
  resetNativeStartupState,
  setupNativePostgres,
} from '../../apps/server/src/postgres/startup.ts';
import { createNativePostgresApp } from '../../apps/server/src/postgres/app.ts';
import type { NativeVerifiedIdentity, NativeExecutor } from '../../apps/server/src/postgres/executor.ts';

const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEVICE_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

interface MockRoleRow {
  login: unknown;
  effective: unknown;
  login_superuser: unknown;
  login_bypassrls: unknown;
  login_canlogin: unknown;
  login_app_member: unknown;
  login_identity_member: unknown;
  login_owned_public_tables: unknown;
}

const GOOD_ROLE_ROW: MockRoleRow = {
  login: 'culinaryos_runtime_test',
  effective: 'culinaryos_runtime_test',
  login_superuser: false,
  login_bypassrls: false,
  login_canlogin: true,
  login_app_member: true,
  login_identity_member: false,
  login_owned_public_tables: 0,
};

function createMockPool(options?: {
  roleRow?: MockRoleRow | null;
  pingFails?: boolean;
  roleFails?: boolean;
}) {
  let released = 0;
  const client = {
    async query(sql: string, _params?: unknown[]) {
      if (sql.includes('SELECT 1')) {
        if (options?.pingFails) throw new Error('connection closed');
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      }
      if (sql.includes('session_user AS login')) {
        if (options?.roleFails) throw new Error('database down');
        const row = options?.roleRow !== undefined ? options.roleRow : GOOD_ROLE_ROW;
        return row ? { rows: [row], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      released++;
    },
  };
  return {
    connect: async () => client,
    end: async () => {},
    released: () => released,
  };
}

describe('H1 Native startup role guard and readiness', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetNativeStartupState();
    delete process.env.CULINARYOS_NATIVE_PG;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetNativeStartupState();
    process.env = { ...originalEnv };
  });

  it('skips native postgres setup when CULINARYOS_NATIVE_PG is unset', async () => {
    const testApp = new Hono();
    const result = await setupNativePostgres(testApp);
    assert.equal(result.enabled, false);
    assert.equal(result.pool, null);
    assert.equal(result.roleInfo, null);
    assert.equal(result.error, null);
  });

  it('fails startup closed when CULINARYOS_NATIVE_PG=true but no DATABASE_URL exists', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    await assert.rejects(
      async () => setupNativePostgres(testApp),
      /no valid DATABASE_URL configured/
    );
    const state = getNativeStartupState();
    assert.equal(state.enabled, true);
    assert.equal(state.roleInfo, null);
    assert.ok(state.error);
  });

  it('fails startup closed when database login is a superuser', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    const badPool = createMockPool({
      roleRow: { ...GOOD_ROLE_ROW, login_superuser: true },
    });
    await assert.rejects(
      async () => setupNativePostgres(testApp, { pool: badPool as never }),
      /login is a superuser/
    );
    const state = getNativeStartupState();
    assert.equal(state.enabled, true);
    assert.equal(state.roleInfo, null);
    assert.ok(state.error?.message.includes('superuser'));
  });

  it('fails startup closed when database login owns public tables', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    const badPool = createMockPool({
      roleRow: { ...GOOD_ROLE_ROW, login_owned_public_tables: 3 },
    });
    await assert.rejects(
      async () => setupNativePostgres(testApp, { pool: badPool as never }),
      /login owns 3 public table\(s\)/
    );
  });

  it('fails startup closed when database login is not member of culinaryos_app', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    const badPool = createMockPool({
      roleRow: { ...GOOD_ROLE_ROW, login_app_member: false },
    });
    await assert.rejects(
      async () => setupNativePostgres(testApp, { pool: badPool as never }),
      /login is not a member of "culinaryos_app"/
    );
  });

  it('fails startup closed when database login is a member of culinaryos_identity', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    const badPool = createMockPool({
      roleRow: { ...GOOD_ROLE_ROW, login_identity_member: true },
    });
    await assert.rejects(
      async () => setupNativePostgres(testApp, { pool: badPool as never }),
      /login is a member of "culinaryos_identity"/
    );
  });

  it('accepts restricted login, stores roleInfo, and enables readiness', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    const goodPool = createMockPool();
    const result = await setupNativePostgres(testApp, { pool: goodPool as never });
    assert.equal(result.enabled, true);
    assert.equal(result.roleInfo?.login, 'culinaryos_runtime_test');
    assert.equal(result.roleInfo?.appMember, true);
    assert.equal(result.roleInfo?.ownedPublicTables, 0);

    const health = await checkNativeHealth();
    assert.equal(health.ok, true);
    assert.equal(health.status, 'ready');
    assert.equal(health.role, 'culinaryos_runtime_test');
  });

  it('reports unready when native pool ping fails', async () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    const testApp = new Hono();
    const flakyPool = createMockPool({ pingFails: true });
    await setupNativePostgres(testApp, { pool: flakyPool as never });

    const health = await checkNativeHealth();
    assert.equal(health.ok, false);
    assert.equal(health.status, 'unready');
    assert.ok(health.error?.includes('connection closed'));
  });

  it('separates /health (liveness) from /ready (readiness)', async () => {
    // /health returns 200 with service and uptime
    const healthRes = await app.request('/health');
    assert.equal(healthRes.status, 200);
    const healthBody = (await healthRes.json()) as { service: string; status: string; uptime: number };
    assert.equal(healthBody.service, 'culinaryos-api');
    assert.equal(healthBody.status, 'healthy');
    assert.equal(typeof healthBody.uptime, 'number');

    // /ready reflects backend readiness
    const readyRes = await app.request('/ready');
    assert.ok([200, 503].includes(readyRes.status));
  });
});

describe('H1 Native session rotation, revoke, and device lifecycle routes', () => {
  function testFixture(role: string = 'manager', kind: 'session' | 'device' = 'session') {
    const identity: NativeVerifiedIdentity = {
      kind,
      tenantId: TENANT_ID,
      userId: kind === 'session' ? USER_ID : null,
      role: kind === 'session' ? role : null,
      deviceId: kind === 'device' ? DEVICE_ID : null,
      capabilities: kind === 'device' ? ['orders:read', 'orders:write'] : [],
    };
    const executedQueries: { sql: string; params?: unknown[] }[] = [];
    const tx: NativeExecutor = {
      query: async (sql: string, params?: unknown[]) => {
        executedQueries.push({ sql, params });
        if (sql.includes('mint_session')) {
          return { rows: [{ mint_session: role }], rowCount: 1 };
        }
        if (sql.includes('revoke_session')) {
          return { rows: [{ revoke_session: true }], rowCount: 1 };
        }
        if (sql.includes('register_device_key')) {
          return { rows: [{ register_device_key: DEVICE_ID }], rowCount: 1 };
        }
        if (sql.includes('revoke_device_key')) {
          return { rows: [{ revoke_device_key: true }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    };
    const pool = {
      connect: async () => ({
        query: async (sql: string) => {
          if (sql.includes('resolve_identity')) {
            return {
              rows: [{
                kind,
                tenant_id: TENANT_ID,
                user_id: identity.userId,
                role: identity.role,
                device_id: identity.deviceId,
                capabilities: identity.capabilities,
              }],
              rowCount: 1,
            };
          }
          return { rows: [], rowCount: 0 };
        },
        release() {},
      }),
    };
    const nativeApp = createNativePostgresApp({
      enabled: true,
      pool,
      runTenant: async (_hash, callback) => callback(tx, identity),
      runAuth: async (callback) => callback(tx),
    });
    const token = `${kind === 'device' ? 'cd' : 'cs'}_${'y'.repeat(43)}`;
    return {
      app: nativeApp,
      token,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      queries: () => executedQueries,
    };
  }

  it('allows human session rotation and revokes prior token', async () => {
    const f = testFixture('server', 'session');
    const res = await f.app.request('/v1/native/auth/rotate', {
      method: 'POST',
      headers: f.headers,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; data: { token: string; role: string } };
    assert.equal(body.ok, true);
    assert.ok(body.data.token.startsWith('cs_'));
    assert.equal(body.data.role, 'server');
    const mintQuery = f.queries().find((q) => q.sql.includes('mint_session'));
    const revokeQuery = f.queries().find((q) => q.sql.includes('revoke_session'));
    assert.ok(mintQuery, 'mint_session must be executed');
    assert.ok(revokeQuery, 'revoke_session must be executed for prior token');
  });

  it('denies session rotation to device keys', async () => {
    const f = testFixture('manager', 'device');
    const res = await f.app.request('/v1/native/auth/rotate', {
      method: 'POST',
      headers: f.headers,
    });
    assert.equal(res.status, 403);
  });

  it('allows self-revocation of session', async () => {
    const f = testFixture('server', 'session');
    const res = await f.app.request('/v1/native/auth/revoke', {
      method: 'POST',
      headers: f.headers,
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; data: { revoked: boolean } };
    assert.equal(body.ok, true);
    assert.equal(body.data.revoked, true);
  });

  it('allows manager to register a device key', async () => {
    const f = testFixture('manager', 'session');
    const res = await f.app.request('/v1/native/devices', {
      method: 'POST',
      headers: f.headers,
      body: JSON.stringify({
        label: 'Kitchen Tablet 1',
        capabilities: ['tickets:read', 'tickets:write'],
        ttlDays: 90,
      }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { ok: boolean; data: { deviceId: string; token: string } };
    assert.equal(body.ok, true);
    assert.equal(body.data.deviceId, DEVICE_ID);
    assert.ok(body.data.token.startsWith('cd_'));
    const regQuery = f.queries().find((q) => q.sql.includes('register_device_key'));
    assert.ok(regQuery);
  });

  it('denies device registration to non-managers and device keys', async () => {
    const fServer = testFixture('server', 'session');
    const resServer = await fServer.app.request('/v1/native/devices', {
      method: 'POST',
      headers: fServer.headers,
      body: JSON.stringify({ label: 'Tablet', capabilities: ['orders:read'] }),
    });
    assert.equal(resServer.status, 403);

    const fDevice = testFixture('manager', 'device');
    const resDevice = await fDevice.app.request('/v1/native/devices', {
      method: 'POST',
      headers: fDevice.headers,
      body: JSON.stringify({ label: 'Tablet', capabilities: ['orders:read'] }),
    });
    assert.equal(resDevice.status, 403);
  });

  it('allows manager to revoke a device key', async () => {
    const f = testFixture('owner', 'session');
    const res = await f.app.request(`/v1/native/devices/${DEVICE_ID}`, {
      method: 'DELETE',
      headers: f.headers,
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; data: { revoked: boolean } };
    assert.equal(body.ok, true);
    assert.equal(body.data.revoked, true);
  });

  it('denies device revocation to non-managers', async () => {
    const f = testFixture('server', 'session');
    const res = await f.app.request(`/v1/native/devices/${DEVICE_ID}`, {
      method: 'DELETE',
      headers: f.headers,
    });
    assert.equal(res.status, 403);
  });

  it('mirrors pilot routes on /v1 as well as /v1/native', async () => {
    const f = testFixture('manager', 'session');
    const resNative = await f.app.request('/v1/native/auth/me', { headers: f.headers });
    const resPilot = await f.app.request('/v1/auth/me', { headers: f.headers });
    assert.equal(resNative.status, 200);
    assert.equal(resPilot.status, 200);
    const dataNative = (await resNative.json()) as { data: { tenantId: string } };
    const dataPilot = (await resPilot.json()) as { data: { tenantId: string } };
    assert.equal(dataNative.data.tenantId, dataPilot.data.tenantId);
  });
});
