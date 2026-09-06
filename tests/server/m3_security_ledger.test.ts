// ============================================================
// Milestone 3: Security, Void Governance & Accounting Ledger Tests
// ============================================================

import { beforeAll, describe, expect, it } from 'bun:test';
import { authRoutes } from '@culinaryos/server/routes/auth';
import { ordersRoutes } from '@culinaryos/server/routes/orders';
import { reportsRoutes } from '@culinaryos/server/routes/reports';
import { calculateMultiRateTax } from '@culinaryos/shared';
import { calculateTipPool } from '@culinaryos/labor-engine';
import { calculateVoidWaste } from '@culinaryos/waste-engine';

const TENANT = '00000000-0000-0000-0000-000000000001';

function tenantHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': TENANT,
    Authorization: `Bearer ${process.env.DEVICE_API_KEY ?? 'test-key-ci'}`,
    ...extra,
  };
}

describe('Milestone 3: Security, Void Governance & Accounting Ledger', () => {
  beforeAll(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.DEVICE_API_KEY = 'test-key-ci';
    process.env.INTERNAL_API_KEY = 'test-key-ci';
    process.env.SUPABASE_URL = 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
  });

  // ------------------------------------------------------------
  // F3.1: Manager PIN Authorization Gatekeeper
  // ------------------------------------------------------------
  describe('F3.1: Manager PIN Verification & Security Gates', () => {
    it('verifies valid manager PIN (5678) successfully', async () => {
      const res = await authRoutes.request('/verify-manager-pin', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ pin: '5678', tenant_id: TENANT }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.authorized).toBe(true);
      expect(body.data.role).toBe('manager');
    });

    it('rejects server PIN (1234) for manager gate', async () => {
      const res = await authRoutes.request('/verify-manager-pin', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ pin: '1234', tenant_id: TENANT }),
      });

      const body = await res.json();
      expect(body.data.authorized).toBe(false);
    });

    it('rejects completely invalid PINs', async () => {
      const res = await authRoutes.request('/verify-manager-pin', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ pin: '9999', tenant_id: TENANT }),
      });

      const body = await res.json();
      expect(body.data.authorized).toBe(false);
    });

    it('blocks post-send order void without Manager PIN', async () => {
      const orderId = 'o-void-sec-test-1';
      // First send the order
      await ordersRoutes.request(`/${orderId}/send`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({
          order: {
            tableNumber: '4',
            items: [{ lineItemId: 'li-101', name: 'Burger', unitPrice: 1500, quantity: 1, station: 'grill', courseNumber: 1 }],
          },
        }),
      });

      // Attempt to void without manager PIN
      const voidRes = await ordersRoutes.request(`/${orderId}/void`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({ reason: 'customer_change' }),
      });

      expect(voidRes.status).toBe(403);
      const voidBody = await voidRes.json();
      expect(voidBody.ok).toBe(false);
      expect(voidBody.error.code).toBe('MANAGER_PIN_REQUIRED');
    });

    it('authorizes post-send order void with Manager PIN (5678)', async () => {
      const orderId = 'o-void-sec-test-1';
      const voidRes = await ordersRoutes.request(`/${orderId}/void`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({
          managerPin: '5678',
          reasonCode: 'customer_change',
          isCooked: true,
          notes: 'Customer changed mind after grill fire',
        }),
      });

      expect(voidRes.status).toBe(200);
      const voidBody = await voidRes.json();
      expect(voidBody.ok).toBe(true);
      expect(voidBody.data.status).toBe('voided');
      expect(voidBody.data.void_reason).toBe('customer_change');
    });

    it('protects manual cash drawer open with Manager PIN', async () => {
      const unauthRes = await ordersRoutes.request('/drawer/open', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ pin: '1234' }),
      });
      expect(unauthRes.status).toBe(403);

      const authRes = await ordersRoutes.request('/drawer/open', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ managerPin: '5678', reason: 'change_request' }),
      });
      expect(authRes.status).toBe(200);
      const authBody = await authRes.json();
      expect(authBody.data.authorized).toBe(true);
      expect(authBody.data.reason).toBe('change_request');
    });
  });

  // ------------------------------------------------------------
  // F3.2: Automated Waste Debiting on Post-Send Voids
  // ------------------------------------------------------------
  describe('F3.2: Automated Waste Debiting', () => {
    it('calculates ingredient scrap and food cost loss for cooked items', () => {
      const wasteRecords = calculateVoidWaste(
        {
          itemName: 'Prime Bistro Burger',
          quantity: 2,
          unitPriceCents: 1850,
          reasonCode: 'kitchen_error',
          isCooked: true,
          notes: 'Overcooked patty',
        },
        TENANT,
        { orderId: 'o-test-waste', lineItemId: 'li-test-waste' }
      );

      expect(wasteRecords).toHaveLength(1);
      expect(wasteRecords[0].isCooked).toBe(true);
      expect(wasteRecords[0].quantityGrams).toBe(500); // 250g * 2
      expect(wasteRecords[0].wasteCost).toBe(11.1); // 30% of $37.00
      expect(wasteRecords[0].wasteCostCents).toBe(1110);
      expect(wasteRecords[0].reason).toBe('void_cooked');
      expect(wasteRecords[0].reasonCode).toBe('kitchen_error');
    });

    it('does not generate scrap waste if item was uncooked', () => {
      const wasteRecords = calculateVoidWaste(
        {
          itemName: 'Prime Bistro Burger',
          quantity: 1,
          unitPriceCents: 1850,
          reasonCode: 'customer_change',
          isCooked: false,
        },
        TENANT
      );

      expect(wasteRecords).toHaveLength(0);
    });

    it('voids line item post-send with Manager PIN and recalcs order', async () => {
      const orderId = 'o-void-item-test';
      await ordersRoutes.request(`/${orderId}/send`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({
          order: {
            tableNumber: '8',
            items: [
              { lineItemId: 'li-item-1', name: 'Steak', unitPrice: 3200, quantity: 1, station: 'grill', courseNumber: 1 },
              { lineItemId: 'li-item-2', name: 'Wine', unitPrice: 1400, quantity: 1, station: 'bar', courseNumber: 1 },
            ],
          },
        }),
      });

      // Void item with Manager PIN
      const res = await ordersRoutes.request(`/${orderId}/items/li-item-1/void`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({
          managerPin: '5678',
          reasonCode: 'damaged',
          isCooked: true,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.item.is_voided).toBe(true);
      expect(body.data.item.void_reason).toBe('damaged');
      expect(body.data.orderTotals.subtotal).toBe(1400);
    });
  });

  // ------------------------------------------------------------
  // F3.3: Multi-Rate Tax Engine
  // ------------------------------------------------------------
  describe('F3.3: Multi-Rate Tax Calculations', () => {
    it('calculates separate tax for prepared food (8.25%), alcohol (10.0%), and exempt (0%)', () => {
      const items = [
        { name: 'Burger', station: 'grill', lineTotalCents: 2000 },       // prepared food @ 8.25% = 165
        { name: 'Red Wine', station: 'bar', lineTotalCents: 3000 },        // alcohol @ 10.0% = 300
        { name: 'Raw Veggies', isTaxExempt: true, lineTotalCents: 1000 }, // exempt @ 0% = 0
      ];

      const result = calculateMultiRateTax(items, {
        preparedFoodRatePercent: 8.25,
        alcoholRatePercent: 10.0,
      });

      expect(result.subtotalCents).toBe(6000);
      expect(result.breakdown.preparedFood.taxableSalesCents).toBe(2000);
      expect(result.breakdown.preparedFood.taxAmountCents).toBe(165);
      expect(result.breakdown.alcohol.taxableSalesCents).toBe(3000);
      expect(result.breakdown.alcohol.taxAmountCents).toBe(300);
      expect(result.breakdown.exempt.taxableSalesCents).toBe(1000);
      expect(result.breakdown.exempt.taxAmountCents).toBe(0);
      expect(result.totalTaxCents).toBe(465);
      expect(result.totalCents).toBe(6465);
    });

    it('tax calculation route POST /v1/reports/tax/calculate works correctly', async () => {
      const res = await reportsRoutes.request('/tax/calculate', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({
          items: [
            { name: 'Pasta', station: 'hot', lineTotalCents: 4000 },
            { name: 'IPA Beer', station: 'bar', lineTotalCents: 2000 },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.subtotalCents).toBe(6000);
      expect(body.data.breakdown.preparedFood.taxAmountCents).toBe(330); // 4000 * 0.0825
      expect(body.data.breakdown.alcohol.taxAmountCents).toBe(200);      // 2000 * 0.10
      expect(body.data.totalTaxCents).toBe(530);
    });
  });

  // ------------------------------------------------------------
  // F3.4: Role-Weighted Tip Pooling Engine
  // ------------------------------------------------------------
  describe('F3.4: Role-Weighted Tip Pooling Engine', () => {
    it('distributes tips weighted by role points and hours with exact zero-cent remainder', () => {
      const staff = [
        { staffId: 's1', staffName: 'Server 1', role: 'server', hours: 8.0 },      // weight 1.0 -> 8.0 pts
        { staffId: 's2', staffName: 'Bartender', role: 'bartender', hours: 6.0 },   // weight 0.9 -> 5.4 pts
        { staffId: 's3', staffName: 'Busser', role: 'busser', hours: 5.0 },        // weight 0.4 -> 2.0 pts
        { staffId: 's4', staffName: 'Line Cook', role: 'line_cook', hours: 8.0 },  // weight 0.25 -> 2.0 pts
      ];

      const poolTotalCents = 35000; // $350.00
      const summary = calculateTipPool(
        { method: 'role_weighted', poolTotalCents },
        staff
      );

      expect(summary.totalPoints).toBe(17.4);
      expect(summary.totalEligibleHours).toBe(27.0);

      // Sum of payouts must equal poolTotalCents exactly
      const sumPayouts = summary.staffPayouts.reduce((s, p) => s + p.payoutCents, 0);
      expect(sumPayouts).toBe(35000);

      // Server should receive highest payout
      const serverPayout = summary.staffPayouts.find((p) => p.staffId === 's1')!;
      const busserPayout = summary.staffPayouts.find((p) => p.staffId === 's3')!;
      expect(serverPayout.payoutCents).toBeGreaterThan(busserPayout.payoutCents);
      expect(serverPayout.effectiveHourlyTipRateCents).toBeGreaterThan(0);
    });

    it('supports hours-worked equal distribution', () => {
      const staff = [
        { staffId: 's1', role: 'server', hours: 5.0 },
        { staffId: 's2', role: 'server', hours: 5.0 },
      ];

      const summary = calculateTipPool(
        { method: 'hours_worked', poolTotalCents: 10001 }, // $100.01 with 1 remainder cent
        staff
      );

      const sumPayouts = summary.staffPayouts.reduce((s, p) => s + p.payoutCents, 0);
      expect(sumPayouts).toBe(10001);
    });

    it('strictly excludes managers and supervisors from tip pools under FLSA even with custom override', () => {
      const staff = [
        { staffId: 's1', staffName: 'Lead Server', role: 'server', hours: 8.0 },
        { staffId: 's2', staffName: 'Floor Manager', role: 'manager', hours: 8.0 },
        { staffId: 's3', staffName: 'Shift Supervisor', role: 'shift_supervisor', hours: 6.0 },
        { staffId: 's4', staffName: 'Owner Operator', role: 'owner', hours: 10.0 },
      ];

      // Even if a tenant tries to pass custom weights assigning 2.0 to manager/owner
      const summary = calculateTipPool(
        {
          method: 'hours_worked',
          poolTotalCents: 20000,
          roles: [
            { role: 'manager', weight: 2.0 },
            { role: 'owner', weight: 5.0 },
          ],
        },
        staff
      );

      const managerPayout = summary.staffPayouts.find((p) => p.staffId === 's2')!;
      const supervisorPayout = summary.staffPayouts.find((p) => p.staffId === 's3')!;
      const ownerPayout = summary.staffPayouts.find((p) => p.staffId === 's4')!;
      const serverPayout = summary.staffPayouts.find((p) => p.staffId === 's1')!;

      expect(managerPayout.payoutCents).toBe(0);
      expect(managerPayout.weight).toBe(0);
      expect(supervisorPayout.payoutCents).toBe(0);
      expect(supervisorPayout.weight).toBe(0);
      expect(ownerPayout.payoutCents).toBe(0);
      expect(ownerPayout.weight).toBe(0);

      // Entire pool goes to eligible server
      expect(serverPayout.payoutCents).toBe(20000);
      expect(summary.totalEligibleHours).toBe(8.0);
    });

    it('exports tip pool distribution to payroll CSV', async () => {
      const res = await reportsRoutes.request('/tips/export/csv?poolTotalCents=30000&method=hours_worked', {
        method: 'GET',
        headers: tenantHeaders(),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      const csvText = await res.text();
      expect(csvText).toContain('Date,Staff ID,Staff Name,Role,Hours,FLSA Status,Effective Hourly Tip ($),Tip Payout ($)');
      expect(csvText).toContain('Alice Vance (Server)');
    });
  });

  // ------------------------------------------------------------
  // F3.5: Automated End-of-Day Z-Report & Shift Closeout
  // ------------------------------------------------------------
  describe('F3.5: End-of-Day Z-Report Generation & Shift Closing', () => {
    const testDate = new Date().toISOString().split('T')[0]!;

    it('generates live preview Z-Report with multi-rate tax and cash float audit', async () => {
      const res = await reportsRoutes.request(
        `/z-report?date=${testDate}&openingFloatCents=20000&actualCashCountedCents=22500`,
        {
          headers: tenantHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      const report = body.data;

      expect(report.status).toBe('preview');
      expect(report.taxBreakdown).toBeDefined();
      expect(report.cashReconciliation).toBeDefined();
      expect(report.cashReconciliation.openingFloatCents).toBe(20000);
      expect(report.cashReconciliation.actualCountedCents).toBe(22500);
      expect(report.tipPoolSummary).toBeDefined();
    });

    it('rejects closing shift without Manager PIN', async () => {
      const res = await reportsRoutes.request('/z-report/close', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({
          date: testDate,
          actualCashCountedCents: 20000,
        }),
      });

      expect(res.status).toBe(403);
    });

    it('closes shift and creates immutable Z-Report with Manager PIN (5678)', async () => {
      const res = await reportsRoutes.request('/z-report/close', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({
          managerPin: '5678',
          date: testDate,
          openingFloatCents: 20000,
          actualCashCountedCents: 20000,
          tipPoolMethod: 'role_weighted',
          notes: 'Shift closed smoothly',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.ok).toBe(true);
      const report = body.data;

      expect(report.status).toBe('closed');
      expect(report.zReportNumber).toMatch(/^Z-\d{8}-\d{4}$/);
      expect(report.closedBy).toBeDefined();
      expect(report.closedBy.role).toBe('manager');
      expect(report.cashReconciliation.overShortCents).toBeDefined();

      // Subsequent GET /z-report for this date returns the closed immutable report
      const getRes = await reportsRoutes.request(`/z-report?date=${testDate}`, {
        headers: tenantHeaders(),
      });
      const getBody = await getRes.json();
      expect(getBody.data.status).toBe('closed');
      expect(getBody.data.zReportNumber).toBe(report.zReportNumber);
    });
  });
});
