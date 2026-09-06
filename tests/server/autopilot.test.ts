import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

describe('AI Kitchen Autopilot Routes & Rule 6 Security Controls', () => {
  it('1. GET /v1/autopilot/status returns feature flag status without blocking', async () => {
    const res = await app.request('/v1/autopilot/status', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.featureFlag).toBe('ENABLE_AI_AUTOPILOT');
  });

  it('2. Protected AI routes reject with 403 when ENABLE_AI_AUTOPILOT is disabled', async () => {
    const original = process.env.ENABLE_AI_AUTOPILOT;
    delete process.env.ENABLE_AI_AUTOPILOT;

    try {
      const res = await app.request('/v1/autopilot/forecast?day_of_week=5&daypart=dinner', {
        headers: { 'X-Tenant-Id': DEMO_TENANT },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('FEATURE_DISABLED');
    } finally {
      if (original) process.env.ENABLE_AI_AUTOPILOT = original;
    }
  });

  it('3. GET /v1/autopilot/token-dashboard returns token burn audit even when flag is off', async () => {
    const res = await app.request('/v1/autopilot/token-dashboard', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.tenantId).toBe(DEMO_TENANT);
    expect(typeof body.data.totalTokens).toBe('number');
  });

  it('4. Forecast endpoint generates demand prediction and records tokens when enabled', async () => {
    process.env.ENABLE_AI_AUTOPILOT = 'true';

    try {
      const res = await app.request('/v1/autopilot/forecast?day_of_week=5&daypart=dinner&weather_multiplier=1.1', {
        headers: { 'X-Tenant-Id': DEMO_TENANT },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.forecast.predictedOrderCount).toBeGreaterThan(0);
      expect(body.data.forecast.confidenceScorePercent).toBeGreaterThan(0);

      // Verify token dashboard now has logged tokens
      const dashRes = await app.request('/v1/autopilot/token-dashboard', {
        headers: { 'X-Tenant-Id': DEMO_TENANT },
      });
      const dashBody = await dashRes.json();
      expect(dashBody.data.totalTokens).toBeGreaterThan(0);
    } finally {
      delete process.env.ENABLE_AI_AUTOPILOT;
    }
  });
});
