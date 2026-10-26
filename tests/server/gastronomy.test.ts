import { describe, expect, it } from 'bun:test';
import { gastronomyRoutes } from '../../apps/server/src/routes/gastronomy.ts';
import { Hono } from 'hono';
import type { Env } from '../../apps/server/src/types.ts';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function createApp() {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    c.set('tenantId', TENANT_ID);
    c.set('requestId', 'req-test-gastronomy');
    await next();
  });
  app.route('/v1/gastronomy', gastronomyRoutes);
  return app;
}

describe('Server Route — /v1/gastronomy', () => {
  const app = createApp();

  it('POST /v1/gastronomy/gelatin/bloom converts Bloom strength', async () => {
    const res = await app.request('/v1/gastronomy/gelatin/bloom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        massGrams: 15,
        fromBloom: 'silver',
        toBloom: 'gold',
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.sourceBloom).toBe(160);
    expect(json.data.targetBloom).toBe(200);
    expect(json.data.targetMassGrams).toBeLessThan(15);
  });

  it('POST /v1/gastronomy/agar calculates fluid gel formulation', async () => {
    const res = await app.request('/v1/gastronomy/agar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        liquidMassGrams: 500,
        texture: 'fluid',
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.agarGrams).toBe(3.5);
    expect(json.data.hydrationTempC).toBe(95);
  });

  it('POST /v1/gastronomy/spherification formulates reverse spherification', async () => {
    const res = await app.request('/v1/gastronomy/spherification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        type: 'reverse',
        liquidBaseGrams: 400,
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.baseCalciumGrams).toBe(8.0);
    expect(json.data.bathAlginateGrams).toBe(5.0);
  });

  it('POST /v1/gastronomy/sous-vide/pasteurize validates thermal curve', async () => {
    const res = await app.request('/v1/gastronomy/sous-vide/pasteurize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        protein: 'poultry_breast',
        thicknessMm: 20,
        bathTempC: 64.0,
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.isSafe).toBe(true);
    expect(json.data.log10Reduction).toBe(6.5);
    expect(json.data.totalCookTimeMinutes).toBeGreaterThan(0);
  });

  it('POST /v1/gastronomy/sous-vide/egg predicts yolk stage', async () => {
    const res = await app.request('/v1/gastronomy/sous-vide/egg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        bathTempC: 66.5,
        cookMinutes: 45,
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.stage).toBe('jammy');
  });

  it('POST /v1/gastronomy/frozen/balance calculates gelato balance', async () => {
    const res = await app.request('/v1/gastronomy/frozen/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        dessertType: 'gelato',
        ingredients: [
          { name: 'Whole Milk', weightGrams: 600, fatPct: 3.5, msnfPct: 8.5, solidsPct: 12.0 },
          { name: 'Heavy Cream', weightGrams: 150, fatPct: 36.0, msnfPct: 5.5, solidsPct: 41.5 },
          { name: 'Skim Milk Powder', weightGrams: 40, msnfPct: 97.0, solidsPct: 97.0 },
          { name: 'Sucrose', weightGrams: 140, sugarType: 'sucrose' },
          { name: 'Dextrose', weightGrams: 70, sugarType: 'dextrose' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.totalWeightGrams).toBe(1000);
    expect(json.data.pacPercentage).toBeGreaterThan(20);
  });

  it('POST /v1/gastronomy/brining/equilibrium returns exact salt grams', async () => {
    const res = await app.request('/v1/gastronomy/brining/equilibrium', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        proteinWeightGrams: 1000,
        waterWeightGrams: 1000,
        targetSaltPct: 1.5,
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.saltWeightGrams).toBe(30.0);
  });

  it('POST /v1/gastronomy/flavor/affinity computes molecular pair', async () => {
    const res = await app.request('/v1/gastronomy/flavor/affinity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        ingredientA: 'dark_chocolate',
        ingredientB: 'blue_cheese',
      }),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.affinityScore).toBeGreaterThan(30);
    expect(json.data.sharedVolatiles).toContain('tetramethylpyrazine');
  });

  it('GET /v1/gastronomy/catalog returns database reference', async () => {
    const res = await app.request('/v1/gastronomy/catalog', {
      method: 'GET',
      headers: {
        'X-Tenant-Id': TENANT_ID,
      },
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.gelatinBloomGrades.gold).toBe(200);
    expect(json.data.flavorProfiles.length).toBeGreaterThan(10);
  });
});
