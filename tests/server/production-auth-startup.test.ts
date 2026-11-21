import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'bun:test';
import { Hono } from 'hono';
import {
  assertProductionAuthConfiguration,
  isAuthRelaxed,
  isDemoAuthAllowed,
  isLiveSupabaseConfigured,
  isNativePostgresConfigured,
} from '../../apps/server/src/lib/secrets.ts';
import {
  checkNativeHealth,
  getNativeStartupState,
  resetNativeStartupState,
  setupNativePostgres,
} from '../../apps/server/src/postgres/startup.ts';

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

function createStartupMockPool() {
  const queries: string[] = [];
  const client = {
    async query(sql: string) {
      queries.push(sql);
      if (sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }], rowCount: 1 };
      }
      if (sql.includes('session_user AS login')) {
        return { rows: [GOOD_ROLE_ROW], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  return {
    connect: async () => client,
    end: async () => {},
    queries: () => queries,
  };
}

describe('Production Auth & Native PostgreSQL Primary Cloud Mode Startup', () => {
  const keys = [
    'NODE_ENV',
    'VITEST',
    'AUTH_RELAXED',
    'CULINARYOS_DEMO_MODE',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'CULINARYOS_ALLOW_LIVE_TEST_SERVICES',
    'DATABASE_URL',
    'DATABASE_MIGRATION_URL',
    'CULINARYOS_NATIVE_PG',
    'CULINARYOS_AUTO_MIGRATE',
  ] as const;
  const saved: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  beforeEach(() => {
    resetNativeStartupState();
    for (const key of keys) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    resetNativeStartupState();
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('enables Native PostgreSQL production auth automatically when DATABASE_URL is configured (zero Supabase env required)', () => {
    process.env.DATABASE_URL = 'postgresql://culinaryos_runtime:secret@postgres.railway.internal:5432/railway';
    assert.equal(isNativePostgresConfigured(), true);
    assert.equal(isLiveSupabaseConfigured(), false);
    assert.equal(isDemoAuthAllowed(), false);
    assert.equal(isAuthRelaxed(), false);
    assert.doesNotThrow(assertProductionAuthConfiguration);
  });

  it('enables Native PostgreSQL production auth when CULINARYOS_NATIVE_PG=true is explicitly set', () => {
    process.env.CULINARYOS_NATIVE_PG = 'true';
    process.env.DATABASE_URL = 'postgresql://runtime:fictional@db.invalid/culinaryos';
    assert.equal(isNativePostgresConfigured(), true);
    assert.doesNotThrow(assertProductionAuthConfiguration);
  });

  it('rejects malformed DATABASE_URL in Native PostgreSQL production mode without leaking secrets', () => {
    process.env.DATABASE_URL = 'https://runtime:private-secret@db.invalid/culinaryos';
    let message = '';
    try {
      assertProductionAuthConfiguration();
    } catch (err) {
      message = (err as Error).message;
    }
    assert.match(message, /DATABASE_URL must be a PostgreSQL URL/);
    assert.equal(message.includes('private-secret'), false);
  });

  it('runs automatic PostgreSQL migrations on boot when CULINARYOS_AUTO_MIGRATE=true', async () => {
    process.env.DATABASE_URL = 'postgresql://runtime:fictional@db.invalid/culinaryos';
    process.env.CULINARYOS_AUTO_MIGRATE = 'true';
    const mockPool = createStartupMockPool();
    const testApp = new Hono();

    const state = await setupNativePostgres(testApp, { pool: mockPool as never });
    assert.equal(state.enabled, true);
    assert.equal(state.roleInfo?.login, 'culinaryos_runtime_test');
    assert.ok(Array.isArray(state.appliedMigrations));
    assert.ok(state.appliedMigrations.length >= 9);
    assert.ok(mockPool.queries().some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS public.schema_migrations')));

    const health = await checkNativeHealth();
    assert.equal(health.ok, true);
    assert.equal(health.status, 'ready');
  });
});
