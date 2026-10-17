import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signupRoutes } from '../../apps/server/src/routes/signup.js';
import { paymentsRoutes } from '../../apps/server/src/routes/payments.js';

describe('Phase 3: Public Self-Serve SaaS Launch & Signup Flow', () => {
  it('rejects invalid email formats during signup', async () => {
    const res = await signupRoutes.request('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_name: 'Harbor Grill',
        email: 'not-an-email',
        password: 'Password123!',
      }),
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('rejects short passwords (<8 characters)', async () => {
    const res = await signupRoutes.request('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_name: 'Harbor Grill',
        email: 'chef@harborgrill.com',
        password: 'short',
      }),
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('rejects missing restaurant names', async () => {
    const res = await signupRoutes.request('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_name: '',
        email: 'chef@harborgrill.com',
        password: 'SecurePassword123!',
      }),
    });

    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('provisions 14-day trial account upon valid self-serve signup', async () => {
    const res = await signupRoutes.request('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurant_name: 'The Rustic Hearth',
        email: 'owner@rustichearth.com',
        password: 'ValidPassword123!',
        timezone: 'America/New_York',
      }),
    });

    assert.ok(res.status === 201 || res.status === 200, `Expected 200 or 201, got ${res.status}`);
    const body = await res.json();
    assert.ok(body.data?.tenant_id || body.tenant_id, 'Must return provisioned tenant ID');
  });

  it('generates merchant Stripe Connect Standard onboarding link', async () => {
    const res = await paymentsRoutes.request('/connect/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data?.url || body.url, 'Must return onboarding link');
    assert.ok(body.data?.account_id || body.account_id, 'Must return connected account ID');
  });
});
