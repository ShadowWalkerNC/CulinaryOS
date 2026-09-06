// ============================================================
// CulinaryOS — Pacing, Assistance & Coaching Optimization Tests
// Verifies:
// 1. Tableside assistance debounce & deduplication
// 2. Active assistance conditional ETag caching & 304 response
// 3. Pure course pacing calculations & urgency alert thresholds
// 4. GET /v1/kds/pacing with computePacingOverview & ETag 304
// ============================================================

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';
import { kdsRoutes } from '@culinaryos/server/routes/kds';
import { resetMockTickets } from '@culinaryos/server/lib/mock-kitchen';
import {
  calculateCoursePacingAlert,
  computePacingOverview,
  STANDARD_PACING_CONFIG,
} from '@culinaryos/shared';

const TENANT = '00000000-0000-0000-0000-000000000001';

function tenantHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': TENANT,
    Authorization: `Bearer ${process.env.DEVICE_API_KEY ?? 'test-key-ci'}`,
    ...extra,
  };
}

describe('Kitchen Pacing, Assistance Request & Coaching Optimizations', () => {
  beforeAll(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.DEVICE_API_KEY = 'test-key-ci';
    process.env.INTERNAL_API_KEY = 'test-key-ci';
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
  });

  beforeEach(() => {
    resetMockTickets([]);
  });

  afterEach(() => {
    resetMockTickets();
  });

  describe('1. Tableside Assistance Deduplication & ETag 304 Optimization', () => {
    it('deduplicates rapid repeated buzzer taps from the same table within 15 seconds', async () => {
      // First tap
      const res1 = await app.request('/v1/tables/T5/assistance', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ tableNumber: 'T5', type: 'water', note: 'Water refill' }),
      });
      expect(res1.status).toBe(201);
      const data1 = (await res1.json()).data;
      expect(data1.notificationId).toBeDefined();

      // Immediate second tap (guest double-tapping the screen)
      const res2 = await app.request('/v1/tables/T5/assistance', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ tableNumber: 'T5', type: 'water', note: 'Water refill' }),
      });
      expect(res2.status).toBe(200);
      const data2 = (await res2.json()).data;
      expect(data2.deduplicated).toBe(true);
      expect(data2.notificationId).toBe(data1.notificationId);
    });

    it('returns 304 Not Modified when client sends matching If-None-Match ETag header', async () => {
      // Initial fetch
      const res1 = await app.request('/v1/tables/assistance/active', {
        headers: tenantHeaders(),
      });
      expect(res1.status).toBe(200);
      const etag = res1.headers.get('ETag');
      expect(etag).toBeDefined();

      // Polling request with If-None-Match header
      const res2 = await app.request('/v1/tables/assistance/active', {
        headers: tenantHeaders({ 'If-None-Match': etag }),
      });
      expect(res2.status).toBe(304);
    });
  });

  describe('2. Pure Course Pacing Engine & Alert Thresholds', () => {
    it('computes correct pacing alert levels based on Course 1 elapsed seconds', () => {
      // < 12 minutes (720s) -> normal
      expect(calculateCoursePacingAlert(300, 'held')).toBe('normal');
      expect(calculateCoursePacingAlert(719, 'held')).toBe('normal');

      // 12m - 15m (720s - 899s) -> warning
      expect(calculateCoursePacingAlert(720, 'held')).toBe('warning');
      expect(calculateCoursePacingAlert(850, 'held')).toBe('warning');

      // 15m+ (900s+) -> urgent
      expect(calculateCoursePacingAlert(900, 'held')).toBe('urgent');
      expect(calculateCoursePacingAlert(1200, 'held')).toBe('urgent');

      // Already fired or no held status -> normal
      expect(calculateCoursePacingAlert(1200, 'fired')).toBe('normal');
    });

    it('batch computes pacing overview across ticket arrays', () => {
      const now = Date.now();
      const mockTickets = [
        {
          id: 't-1',
          orderId: 'o-101',
          tableNumber: 'Table 4',
          courseNumber: 1,
          status: 'cooking',
          courseHoldStatus: 'fired',
          firedAt: new Date(now - 750 * 1000).toISOString(),
        },
        {
          id: 't-2',
          orderId: 'o-101',
          tableNumber: 'Table 4',
          courseNumber: 2,
          status: 'queued',
          courseHoldStatus: 'held',
          createdAt: new Date(now - 750 * 1000).toISOString(),
        },
      ];

      const overview = computePacingOverview(mockTickets, now);
      expect(overview).toHaveLength(1);
      const summary = overview[0];
      expect(summary.orderId).toBe('o-101');
      expect(summary.c1Status).toBe('cooking');
      expect(summary.c2Status).toBe('held');
      expect(summary.c1ElapsedSeconds).toBeGreaterThanOrEqual(749);
      expect(summary.pacingAlert).toBe('warning');
    });
  });

  describe('3. GET /v1/kds/pacing Endpoint & ETag Optimization', () => {
    it('returns pacing orders and supports conditional ETag 304', async () => {
      const res1 = await kdsRoutes.request('/pacing', {
        headers: tenantHeaders(),
      });
      expect(res1.status).toBe(200);
      const etag = res1.headers.get('ETag');
      expect(etag).toBeDefined();

      const res2 = await kdsRoutes.request('/pacing', {
        headers: tenantHeaders({ 'If-None-Match': etag }),
      });
      expect(res2.status).toBe(304);
    });
  });
});
