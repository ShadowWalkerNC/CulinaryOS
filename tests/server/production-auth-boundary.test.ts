import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, it } from 'bun:test';
import {
  assertProductionAuthConfiguration, isAuthRelaxed, isDemoAuthAllowed,
  isLiveSupabaseConfigured,
} from '../../apps/server/src/lib/secrets.ts';
import { authRoutes } from '../../apps/server/src/routes/auth.ts';

const keys = ['NODE_ENV', 'VITEST', 'AUTH_RELAXED', 'CULINARYOS_DEMO_MODE',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
  'CULINARYOS_ALLOW_LIVE_TEST_SERVICES', 'DATABASE_URL'] as const;
const saved: Partial<Record<(typeof keys)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of keys) { saved[key] = process.env[key]; delete process.env[key]; }
  process.env.NODE_ENV = 'production';
});
afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function validProductionFixture() {
  // Fictional credentials: configuration tests never connect to this host.
  process.env.SUPABASE_URL = 'https://auth-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-key-no-network';
  process.env.SUPABASE_ANON_KEY = 'fixture-anon-key-no-network';
}

describe('production authentication fails closed', () => {
  it('rejects missing backend configuration', () => {
    assert.throws(assertProductionAuthConfiguration, /Production authentication configuration rejected/);
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('rejects placeholder credentials without exposing their values', () => {
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
    let message = '';
    try { assertProductionAuthConfiguration(); } catch (error) { message = (error as Error).message; }
    assert.match(message, /SUPABASE_SERVICE_ROLE_KEY is required/);
    assert.equal(message.includes('your-service-role-key'), false);
    assert.equal(message.includes('your-project'), false);
  });
  for (const flag of ['AUTH_RELAXED', 'CULINARYOS_DEMO_MODE'] as const) {
    it(`rejects ${flag} even with a configured backend`, () => {
      validProductionFixture();
      process.env[flag] = 'true';
      assert.throws(assertProductionAuthConfiguration, /demo authentication must be disabled/);
      assert.equal(isDemoAuthAllowed(), false);
      assert.equal(isAuthRelaxed(), false);
    });
  }
  it('does not let VITEST switch production helpers into mock mode', () => {
    validProductionFixture();
    process.env.VITEST = 'true';
    assert.equal(isLiveSupabaseConfigured(), true);
    assert.equal(isDemoAuthAllowed(), false);
    assert.throws(assertProductionAuthConfiguration, /VITEST must be unset/);
  });
  it('requires the anon key needed for live PIN session exchange', () => {
    validProductionFixture();
    delete process.env.SUPABASE_ANON_KEY;
    assert.throws(assertProductionAuthConfiguration, /SUPABASE_ANON_KEY is required/);
  });
  for (const url of ['not-a-url', 'http://auth-fixture.invalid', 'https://user:secret@auth-fixture.invalid']) {
    it(`rejects unsafe backend URL form: ${url.split('@').pop()}`, () => {
      validProductionFixture();
      process.env.SUPABASE_URL = url;
      assert.throws(assertProductionAuthConfiguration, /SUPABASE_URL/);
    });
  }
  it('accepts configured production posture without claiming service readiness', () => {
    validProductionFixture();
    assert.doesNotThrow(assertProductionAuthConfiguration);
    assert.equal(isLiveSupabaseConfigured(), true);
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('does not mistake DATABASE_URL for an implemented authentication backend', () => {
    process.env.DATABASE_URL = 'postgres://fixture.invalid/test';
    assert.throws(assertProductionAuthConfiguration, /SUPABASE_URL is required/);
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('rejects a demo PIN when production routes are mounted without the boot entrypoint', async () => {
    process.env.AUTH_RELAXED = 'true';
    const response = await authRoutes.request('/pin-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '1234', tenant_id: '00000000-0000-0000-0000-000000000001' }),
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.data, undefined);
  });
  it('rejects header-only authentication when production routes are mounted directly', async () => {
    const response = await authRoutes.request('/me', {
      headers: { 'X-Tenant-Id': '00000000-0000-0000-0000-000000000001' },
    });
    assert.equal(response.status, 401);
  });
  it('exits the actual production entrypoint before opening a listener with missing credentials', () => {
    const result = spawnSync(process.execPath,
      ['-r', './scripts/test-hook.cjs', '--import', 'tsx', '-e', "import('./apps/server/src/index.ts')"],
      { cwd: process.cwd(), env: { ...process.env, PORT: '0', SUPABASE_URL: '',
        SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_ANON_KEY: '', STRIPE_SECRET_KEY: '',
        ANTHROPIC_API_KEY: '' }, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Production authentication configuration rejected/);
    assert.equal(result.stdout.includes('listening on'), false);
  });
});

describe('explicit local demo and isolated test behavior', () => {
  it('does not grant local demo access just because credentials are missing', () => {
    process.env.NODE_ENV = 'development';
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('accepts explicit local demo mode without relaxing a live backend', () => {
    process.env.NODE_ENV = 'development';
    process.env.CULINARYOS_DEMO_MODE = 'true';
    assert.equal(isDemoAuthAllowed(), true);
    validProductionFixture();
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('preserves explicit AUTH_RELAXED local compatibility', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_RELAXED = 'true';
    assert.equal(isDemoAuthAllowed(), true);
    assert.equal(isAuthRelaxed(), true);
  });
  it('does not allow demo mode on a staging runtime', () => {
    process.env.NODE_ENV = 'staging';
    process.env.CULINARYOS_DEMO_MODE = 'true';
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('refuses local demo with a configured PostgreSQL database', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_RELAXED = 'true';
    process.env.DATABASE_URL = 'postgres://fixture.invalid/test';
    assert.equal(isDemoAuthAllowed(), false);
  });
  it('keeps ordinary automated tests isolated from configured live services', () => {
    process.env.NODE_ENV = 'test';
    validProductionFixture();
    assert.equal(isLiveSupabaseConfigured(), false);
    assert.equal(isDemoAuthAllowed(), true);
  });
  it('does not relax integration tests that explicitly opt into live configuration', () => {
    process.env.NODE_ENV = 'test';
    validProductionFixture();
    process.env.CULINARYOS_ALLOW_LIVE_TEST_SERVICES = 'true';
    assert.equal(isLiveSupabaseConfigured(), true);
    assert.equal(isDemoAuthAllowed(), false);
  });
});
