import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

describe('Daypart Pricing API Endpoints (F1.3)', () => {
  it('1. GET /v1/dayparts returns schedule list with formatted time windows', async () => {
    const res = await app.request('/v1/dayparts', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].timeWindowLabel).toBeDefined();
  });

  it('2. POST /v1/dayparts validates schedule input and creates rule', async () => {
    // Missing required fields
    const invalidRes = await app.request('/v1/dayparts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        name: '',
        daysOfWeek: [],
      }),
    });
    expect(invalidRes.status).toBe(422);

    // Valid schedule creation
    const validRes = await app.request('/v1/dayparts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        name: 'Late Night Dessert Rush',
        daysOfWeek: [4, 5, 6],
        startTime: '21:00',
        endTime: '23:30',
        adjustmentType: 'percent',
        value: 25,
        categoryIds: ['Desserts'],
      }),
    });
    expect(validRes.status).toBe(201);
    const body = await validRes.json();
    expect(body.ok).toBe(true);
    expect(body.data.name).toBe('Late Night Dessert Rush');
    expect(body.data.value).toBe(25);
  });

  it('3. POST /v1/dayparts/calculate-price computes effective price dynamically', async () => {
    const res = await app.request('/v1/dayparts/calculate-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        basePriceCents: 2000,
        categoryId: 'Cocktails',
        // 2026-09-01 17:00:00 (Tuesday within standard happy hour 16:00-18:30)
        atTime: '2026-09-01T17:00:00.000Z',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.originalPriceCents).toBe(2000);
    expect(body.data.effectivePriceCents).toBeLessThanOrEqual(2000);
  });
});
