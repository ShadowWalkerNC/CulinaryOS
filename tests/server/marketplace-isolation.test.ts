import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

const TENANT_A = '00000000-0000-0000-0000-000000000001';
const TENANT_B = '00000000-0000-0000-0000-000000000002';

describe('Marketplace Multi-Tenant Isolation & AI Flag Controls', () => {
  it('1. Proves cross-tenant isolation: Tenant A installing an extension does NOT affect Tenant B', async () => {
    // Tenant A installs extension 'com.culinaryos.ext.recipeos'
    const extId = 'com.culinaryos.ext.recipeos';

    const installResA = await app.request(`/v1/marketplace/extensions/${extId}/install`, {
      method: 'POST',
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(installResA.status).toBe(200);
    const installBodyA = await installResA.json();
    expect(installBodyA.ok).toBe(true);
    expect(installBodyA.data.installed).toBe(true);
    expect(installBodyA.data.tenant_id).toBe(TENANT_A);

    // Verify status for Tenant A shows installed
    const statusResA = await app.request(`/v1/marketplace/extensions/${extId}/status`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(statusResA.status).toBe(200);
    const statusBodyA = await statusResA.json();
    expect(statusBodyA.data.installed).toBe(true);
    expect(statusBodyA.data.tenant_id).toBe(TENANT_A);

    // Verify status for Tenant B MUST NOT be installed (tenant isolation)
    const statusResB = await app.request(`/v1/marketplace/extensions/${extId}/status`, {
      headers: { 'X-Tenant-Id': TENANT_B },
    });
    expect(statusResB.status).toBe(200);
    const statusBodyB = await statusResB.json();
    expect(statusBodyB.data.installed).toBe(false);
    expect(statusBodyB.data.tenant_id).toBe(TENANT_B);
  });

  it('2. Rejects extension install without tenant identification', async () => {
    const res = await app.request('/v1/marketplace/extensions/recipeos-bridge/install', {
      method: 'POST',
    });
    // With no tenant header and strict tenant middleware, must be rejected
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('3. AI Marketplace endpoints fail-closed when feature flag is disabled (Rule 6)', async () => {
    // With ENABLE_AI_MARKETPLACE and ENABLE_AI_AUTOPILOT unset
    const originalFlag = process.env.ENABLE_AI_MARKETPLACE;
    delete process.env.ENABLE_AI_MARKETPLACE;
    delete process.env.ENABLE_AI_AUTOPILOT;

    try {
      const res = await app.request('/v1/marketplace/ai/ops-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': TENANT_A,
        },
        body: JSON.stringify({ wastePercent: 4.2 }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('FEATURE_DISABLED');
    } finally {
      if (originalFlag) process.env.ENABLE_AI_MARKETPLACE = originalFlag;
    }
  });

  it('4. Custom tool registration is scoped to the tenant', async () => {
    const res = await app.request('/v1/marketplace/extensions/custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_A,
      },
      body: JSON.stringify({
        name: 'Patio QR Drink Runner',
        category: 'Service Tools',
        description: 'Direct kitchen chit print for patio cocktail orders.',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.tenant_id).toBe(TENANT_A);
    const customId = body.data.extension.id;

    // Verify Tenant A sees it in extensions list
    const listA = await app.request('/v1/marketplace/extensions', {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    const bodyListA = await listA.json();
    expect(bodyListA.data.some((e: any) => e.id === customId)).toBe(true);

    // Verify Tenant B DOES NOT see Tenant A custom tool
    const listB = await app.request('/v1/marketplace/extensions', {
      headers: { 'X-Tenant-Id': TENANT_B },
    });
    const bodyListB = await listB.json();
    expect(bodyListB.data.some((e: any) => e.id === customId)).toBe(false);
  });
});
