import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import {
  CULINARYOS_TIERS,
  CULINARYOS_FEATURE_GATES,
  CULINARYOS_FAILURE_MODES,
  evaluateFeatureEntitlement,
} from '@culinaryos/shared';
import { intelligenceRoutes } from '../../apps/server/src/routes/intelligence.ts';

describe('CulinaryOS Open-Source Core vs. Paid SaaS Tiers & Resilience Matrix', () => {
  it('defines the 3 canonical tiers ($0 Free Core, $49 Cloud Pro, $149 Enterprise) with $0 per-terminal fees', () => {
    assert.equal(CULINARYOS_TIERS.free_opensource.monthlyPriceCents, 0);
    assert.equal(CULINARYOS_TIERS.free_opensource.perTerminalFeeCents, 0);
    assert.equal(CULINARYOS_TIERS.cloud_pro.monthlyPriceCents, 4900);
    assert.equal(CULINARYOS_TIERS.cloud_pro.perTerminalFeeCents, 0);
    assert.equal(CULINARYOS_TIERS.enterprise_multi_unit.monthlyPriceCents, 14900);
    assert.equal(CULINARYOS_TIERS.enterprise_multi_unit.perTerminalFeeCents, 0);
    assert.ok(CULINARYOS_FEATURE_GATES.length >= 9);
    assert.ok(CULINARYOS_FAILURE_MODES.length >= 5);
  });

  it('always unlocks Free Open-Source Core features out of the box with zero SaaS subscription', () => {
    for (const id of [
      'pos.terminal_core',
      'kds.station_rails',
      'compliance.flsa_tips_zreport',
      'hardware.escpos_lan_usb',
      'intelligence.deterministic_core',
    ]) {
      const res = evaluateFeatureEntitlement(id, { activeAddons: [], aiFlagEnabled: false });
      assert.equal(res.entitled, true, `Expected ${id} to be free forever`);
      assert.equal(res.mode, 'full_active');
      assert.equal(res.tier, 'free_opensource');
    }
  });

  it('gates SaaS add-ons and enforces deterministic local fallback when unsubscribed or AI flag is off', () => {
    const unsubCloud = evaluateFeatureEntitlement('cloud.offsite_storage_sync', { activeAddons: [] });
    assert.equal(unsubCloud.entitled, false);
    assert.equal(unsubCloud.mode, 'deterministic_local_fallback');

    const subCloud = evaluateFeatureEntitlement('cloud.offsite_storage_sync', {
      activeAddons: ['cloud_storage'],
    });
    assert.equal(subCloud.entitled, true);
    assert.equal(subCloud.mode, 'full_active');

    // AI Autopilot off-by-default per Rule 6 even if subscribed
    const aiFlagOff = evaluateFeatureEntitlement('intelligence.ai_autopilot', {
      activeAddons: ['ai_autopilot'],
      aiFlagEnabled: false,
    });
    assert.equal(aiFlagOff.entitled, false);
    assert.equal(aiFlagOff.mode, 'deterministic_local_fallback');

    const aiFlagOn = evaluateFeatureEntitlement('intelligence.ai_autopilot', {
      activeAddons: ['ai_autopilot'],
      aiFlagEnabled: true,
    });
    assert.equal(aiFlagOn.entitled, true);
    assert.equal(aiFlagOn.mode, 'full_active');
  });

  it('serves /v1/intelligence/tiers, /chefs-intelligence/skills/:id, and /chefs-intelligence/cost-dish on Hono server', async () => {
    const app = new Hono();
    app.route('/v1/intelligence', intelligenceRoutes);
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
    };

    const tiersRes = await app.request('/v1/intelligence/tiers', { headers });
    assert.equal(tiersRes.status, 200);
    const tiersBody = (await tiersRes.json()) as any;
    assert.ok(tiersBody.data.tiers.free_opensource);
    assert.ok(tiersBody.data.failureModes.length >= 5);

    const skillRes = await app.request('/v1/intelligence/chefs-intelligence/skills/daily-brief-generator', { headers });
    assert.equal(skillRes.status, 200);
    const skillBody = (await skillRes.json()) as any;
    assert.equal(skillBody.data.id, 'daily-brief-generator');
    assert.ok(skillBody.data.markdown.length > 50);

    const costRes = await app.request('/v1/intelligence/chefs-intelligence/cost-dish', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Dry-Aged Ribeye 14oz',
        targetGpPct: 72,
        ingredients: [
          { name: 'Prime Ribeye', weightGrams: 395, bulkPricePerKg: 34.0, trimYieldPct: 85 },
          { name: 'Herb Compound Butter', weightGrams: 30, bulkPricePerKg: 9.5, trimYieldPct: 100 },
        ],
      }),
    });
    assert.equal(costRes.status, 200);
    const costBody = (await costRes.json()) as any;
    assert.equal(costBody.data.dish, 'Dry-Aged Ribeye 14oz');
    assert.equal(costBody.data.targetGp, '72%');
    assert.ok(costBody.data.suggestedMenuPrice > costBody.data.totalRawFoodCost);
  });
});
