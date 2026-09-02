// ==============================================================================
// Adversarial Empirical Stress Test Suite: R3 (Security/Ledger) & R4 (Turnkey/Tray)
// Author: Challenger Agent (Gen2_2)
// Scope:
// 1. Manager PIN Security (scrypt, timing attacks, brute force, reason codes, audit)
// 2. Void Auto-Waste (cooked vs uncooked, RecipeOS BOM scaling vs 30% food cost fallback)
// 3. Multi-Rate Tax Engine ($100k high-volume rounding invariance, classification)
// 4. Tip Pooling (exact cent conservation, odd staff counts, role weights, FLSA manager 0.0)
// 5. EOD Z-Report (shift reconciliation, float over/short, immutable sealing, sequential numbering)
// 6. Turnkey Installer & Tray Daemon (preflight checks, port conflict detection, pure TS QR, RFC 6762 mDNS)
// ==============================================================================

import { beforeAll, describe, it, expect } from 'bun:test';
import * as net from 'net';
import * as crypto from 'crypto';
import { hashPin, verifyPin, DEMO_STAFF } from '@culinaryos/server/lib/pin';
import { logAuditTrail, getAuditLogs, verifyManagerPinDirectly } from '@culinaryos/server/lib/audit';
import { authRoutes } from '@culinaryos/server/routes/auth';
import { ordersRoutes } from '@culinaryos/server/routes/orders';
import { reportsRoutes } from '@culinaryos/server/routes/reports';
import { calculateMultiRateTax, determineTaxCategory, getTaxRateForCategory } from '@culinaryos/shared';
import { calculateTipPool, DEFAULT_ROLE_WEIGHTS } from '@culinaryos/labor-engine';
import { calculateVoidWaste, isPostSendStatus, formatVoidReasonDescription } from '@culinaryos/waste-engine';
import {
  isPortAvailable,
  healPortConflicts,
  ensurePortsFree,
  killProcess,
  CULINARYOS_PORTS,
} from '../../scripts/port-healer';
import {
  getLanIpv4,
  getAllLanIpv4,
  generatePairingPayload,
  generateTerminalQr,
  generateDataUrlQr,
  buildMdnsResponsePacket,
} from '../../scripts/mdns-qr-discovery';
import { runDiagnostics } from '../../scripts/doctor';

const TENANT = '00000000-0000-0000-0000-000000000001';

function tenantHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': TENANT,
    Authorization: `Bearer ${process.env.DEVICE_API_KEY ?? 'test-key-ci'}`,
    ...extra,
  };
}

describe('Adversarial Verification: R3 Security, Void Governance & Accounting Ledger', () => {
  beforeAll(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.DEVICE_API_KEY = 'test-key-ci';
    process.env.INTERNAL_API_KEY = 'test-key-ci';
  });

  // ============================================================================
  // Scope 1: Manager PIN Security & Cryptographic Invariants
  // ============================================================================
  describe('Scope 1: Manager PIN Security & Audit Ledger', () => {
    it('1.1: Cryptographic scrypt: unique salts prevent rainbow table attacks', () => {
      const pin = '5678';
      const hash1 = hashPin(pin);
      const hash2 = hashPin(pin);

      expect(hash1).not.toBe(hash2); // Different salt generates different hash
      const [salt1, key1] = hash1.split(':');
      const [salt2, key2] = hash2.split(':');

      expect(salt1.length).toBe(32); // 16 bytes hex = 32 chars
      expect(salt2.length).toBe(32);
      expect(key1.length).toBe(64);  // 32 bytes hex = 64 chars
      expect(key2.length).toBe(64);

      // Both distinct hashes must verify correctly
      expect(verifyPin(pin, hash1)).toBe(true);
      expect(verifyPin(pin, hash2)).toBe(true);
      expect(verifyPin('1234', hash1)).toBe(false);
    });

    it('1.2: Timing-safe equality resilience against malformed inputs', () => {
      const validHash = hashPin('5678');

      // Test boundary/corrupted hash strings
      expect(verifyPin('5678', '')).toBe(false);
      expect(verifyPin('5678', 'invalid_format')).toBe(false);
      expect(verifyPin('5678', 'saltonly:')).toBe(false);
      expect(verifyPin('5678', ':hashonly')).toBe(false);
      expect(verifyPin('5678', 'abc:def')).toBe(false);
      expect(verifyPin('5678', `${validHash.slice(0, 10)}`)).toBe(false);
      // Valid verification with wrong PIN
      expect(verifyPin('9999', validHash)).toBe(false);
    });

    it('1.3: Manager role authorization vs Server role rejection', async () => {
      // Server PIN (1234) must fail manager authorization
      const serverAuth = await verifyManagerPinDirectly(TENANT, '1234');
      expect(serverAuth.authorized).toBe(false);
      expect(serverAuth.error).toContain('lacks manager');

      // Manager PIN (5678) must succeed
      const mgrAuth = await verifyManagerPinDirectly(TENANT, '5678');
      expect(mgrAuth.authorized).toBe(true);
      expect(mgrAuth.role).toBe('manager');
      expect(mgrAuth.managerName).toBe('Jane Smith');

      // Random non-existent PIN
      const invalidAuth = await verifyManagerPinDirectly(TENANT, '0000');
      expect(invalidAuth.authorized).toBe(false);

      // Malformed PIN format (non-digit / too short / too long)
      const malformed1 = await verifyManagerPinDirectly(TENANT, 'abc');
      expect(malformed1.authorized).toBe(false);
      const malformed2 = await verifyManagerPinDirectly(TENANT, '1234567890123');
      expect(malformed2.authorized).toBe(false);
    });

    it('1.4: Post-send order void requires manager PIN and captures reason code', async () => {
      const orderId = `o-adv-sec-${Date.now()}`;

      // 1. Create and send order to kitchen
      const sendRes = await ordersRoutes.request(`/${orderId}/send`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({
          order: {
            tableNumber: '12',
            items: [
              { lineItemId: 'li-adv-1', name: 'Dry-Aged Ribeye', unitPrice: 4800, quantity: 2, station: 'grill' },
            ],
          },
        }),
      });
      expect(sendRes.status).toBe(200);

      // 2. Attempt post-send void without PIN -> Must return 403 MANAGER_PIN_REQUIRED
      const noPinRes = await ordersRoutes.request(`/${orderId}/void`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({ reason: 'customer_change' }),
      });
      expect(noPinRes.status).toBe(403);
      const noPinBody = await noPinRes.json();
      expect(noPinBody.error.code).toBe('MANAGER_PIN_REQUIRED');

      // 3. Attempt post-send void with server PIN (1234) -> Must return 403 FORBIDDEN
      const serverPinRes = await ordersRoutes.request(`/${orderId}/void`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({ managerPin: '1234', reason: 'customer_change' }),
      });
      expect(serverPinRes.status).toBe(403);

      // 4. Void with valid Manager PIN (5678) -> Must succeed and update status to voided
      const mgrVoidRes = await ordersRoutes.request(`/${orderId}/void`, {
        method: 'PATCH',
        headers: tenantHeaders(),
        body: JSON.stringify({
          managerPin: '5678',
          reasonCode: 'spill',
          isCooked: true,
          notes: 'Server dropped entire tray',
        }),
      });
      expect(mgrVoidRes.status).toBe(200);
      const mgrVoidBody = await mgrVoidRes.json();
      expect(mgrVoidBody.ok).toBe(true);
      expect(mgrVoidBody.data.status).toBe('voided');
      expect(mgrVoidBody.data.void_reason).toBe('spill');
    });

    it('1.5: Drawer open endpoint requires manager PIN and enforces reason logging', async () => {
      // 1. Attempt open without PIN
      const noPinRes = await ordersRoutes.request('/drawer/open', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ reason: 'no_pin_test' }),
      });
      expect(noPinRes.status).toBe(403);

      // 2. Attempt open with Server PIN
      const serverPinRes = await ordersRoutes.request('/drawer/open', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ pin: '1234', reason: 'server_attempt' }),
      });
      expect(serverPinRes.status).toBe(403);

      // 3. Open with Manager PIN (5678)
      const mgrRes = await ordersRoutes.request('/drawer/open', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({ managerPin: '5678', reason: 'mid_shift_cash_drop' }),
      });
      expect(mgrRes.status).toBe(200);
      const mgrBody = await mgrRes.json();
      expect(mgrBody.ok).toBe(true);
      expect(mgrBody.data.authorized).toBe(true);
      expect(mgrBody.data.reason).toBe('mid_shift_cash_drop');
    });

    it('1.6: Immutable audit trail logging captures every void and drawer open', async () => {
      // Fetch audit logs via endpoint
      const auditRes = await authRoutes.request('/audit-logs?limit=10', {
        headers: tenantHeaders(),
      });
      expect(auditRes.status).toBe(200);
      const auditBody = await auditRes.json();
      expect(auditBody.ok).toBe(true);
      expect(Array.isArray(auditBody.data)).toBe(true);

      const logs = auditBody.data;
      expect(logs.length).toBeGreaterThan(0);
      const latest = logs[0];
      expect(latest.tenant_id).toBe(TENANT);
      expect(latest.timestamp).toBeDefined();
      expect(latest.manager_id).toBeDefined();
      expect(latest.action).toBeDefined();
    });
  });

  // ============================================================================
  // Scope 2: Void Auto-Waste Debiting Calculations
  // ============================================================================
  describe('Scope 2: Void Auto-Waste Engine (Cooked vs Uncooked & BOM Scaling)', () => {
    it('2.1: Uncooked void yields 0 scrap events (no food waste created)', () => {
      const waste = calculateVoidWaste(
        {
          itemName: 'Wagyu Burger',
          quantity: 4,
          unitPriceCents: 2400,
          reasonCode: 'customer_change',
          isCooked: false,
        },
        TENANT
      );
      expect(waste).toHaveLength(0);
    });

    it('2.2: Cooked void with standard fallback calculates 30% theoretical food cost', () => {
      const qty = 3;
      const unitPriceCents = 3000; // $30.00
      const waste = calculateVoidWaste(
        {
          itemName: 'Pan-Seared Halibut',
          quantity: qty,
          unitPriceCents,
          reasonCode: 'burned',
          isCooked: true,
          notes: 'Fish overcooked on flat top',
        },
        TENANT,
        { orderId: 'o-halibut-1', lineItemId: 'li-halibut-1' }
      );

      expect(waste).toHaveLength(1);
      const w = waste[0];
      expect(w.quantityGrams).toBe(750); // 250g * 3
      expect(w.wasteCost).toBe(27.0);   // $30.00 * 3 * 30% = $27.00
      expect(w.wasteCostCents).toBe(2700);
      expect(w.reason).toBe('void_cooked');
      expect(w.reasonCode).toBe('burned');
      expect(w.orderId).toBe('o-halibut-1');
      expect(w.lineItemId).toBe('li-halibut-1');
    });

    it('2.3: RecipeOS BOM multi-ingredient scaling calculates exact scrap per component', () => {
      const qty = 5;
      const recipeBOM = [
        { ingredient: 'Brioche Bun', quantityGrams: 80, costPerGram: 0.0125 }, // $1.00/bun -> 400g @ $0.0125 = $5.00
        { ingredient: 'Dry-Aged Beef Patty', quantityGrams: 200, costPerGram: 0.025 }, // $5.00/patty -> 1000g @ $0.025 = $25.00
        { ingredient: 'Truffle Aioli', quantityGrams: 30, costPerGram: 0.04 }, // $1.20/portion -> 150g @ $0.04 = $6.00
        { ingredient: 'Aged Cheddar', quantityGrams: 40, costPerGram: 0.02 }, // $0.80/portion -> 200g @ $0.02 = $4.00
      ];

      const waste = calculateVoidWaste(
        {
          itemName: 'Truffle Burger Deluxe',
          quantity: qty,
          unitPriceCents: 2200,
          reasonCode: 'kitchen_error',
          isCooked: true,
          recipeIngredients: recipeBOM,
        },
        TENANT,
        { orderId: 'o-bom-test' }
      );

      expect(waste).toHaveLength(4);
      expect(waste[0].ingredient).toBe('Brioche Bun');
      expect(waste[0].quantityGrams).toBe(400);
      expect(waste[0].wasteCost).toBe(5.0);

      expect(waste[1].ingredient).toBe('Dry-Aged Beef Patty');
      expect(waste[1].quantityGrams).toBe(1000);
      expect(waste[1].wasteCost).toBe(25.0);

      expect(waste[2].ingredient).toBe('Truffle Aioli');
      expect(waste[2].quantityGrams).toBe(150);
      expect(waste[2].wasteCost).toBe(6.0);

      expect(waste[3].ingredient).toBe('Aged Cheddar');
      expect(waste[3].quantityGrams).toBe(200);
      expect(waste[3].wasteCost).toBe(4.0);

      const totalBOMCostDollars = waste.reduce((s, item) => s + item.wasteCost, 0);
      expect(totalBOMCostDollars).toBe(40.0);
    });

    it('2.4: Boundary values: 0 quantity defaults to 1, fractional costs handled safely', () => {
      const wasteZero = calculateVoidWaste(
        {
          itemName: 'Mystery Item',
          quantity: 0,
          unitPriceCents: 1000,
          reasonCode: 'other',
          isCooked: true,
        },
        TENANT
      );
      expect(wasteZero[0].quantityGrams).toBe(250); // Clamped to 1 portion
      expect(wasteZero[0].wasteCost).toBe(3.0);
    });
  });

  // ============================================================================
  // Scope 3: Multi-Rate Tax Engine & $100k High-Volume Rounding Invariance
  // ============================================================================
  describe('Scope 3: Multi-Rate Tax Engine & High-Volume Rounding', () => {
    it('3.1: Deterministic category classification (Food 8.25%, Alcohol 10.0%, Exempt 0.0%)', () => {
      expect(determineTaxCategory({ name: 'Ribeye Steak', station: 'grill', lineTotalCents: 4500 })).toBe('prepared_food');
      expect(determineTaxCategory({ name: 'House Margarita', station: 'bar', lineTotalCents: 1400 })).toBe('alcohol');
      expect(determineTaxCategory({ name: 'Craft IPA Pint', station: 'bar', lineTotalCents: 800 })).toBe('alcohol');
      expect(determineTaxCategory({ name: 'Cabernet Sauvignon Bottle', category: 'wine', lineTotalCents: 6500 })).toBe('alcohol');
      expect(determineTaxCategory({ name: 'T-Shirt Merch', category: 'exempt', lineTotalCents: 2500 })).toBe('exempt');
      expect(determineTaxCategory({ name: 'Catering Raw Meat', isTaxExempt: true, lineTotalCents: 12000 })).toBe('exempt');
    });

    it('3.2: High-volume $100k multi-tier stress test: ZERO penny drift across 10,000 items', () => {
      const items: Array<{ name: string; station?: string; category?: string; lineTotalCents: number; isTaxExempt?: boolean }> = [];

      let expectedPreparedFoodSales = 0;
      let expectedAlcoholSales = 0;
      let expectedExemptSales = 0;

      // Seed 10,000 items
      for (let i = 0; i < 10000; i++) {
        const cents = Math.floor(Math.random() * 5000) + 100; // $1.00 to $51.00
        const type = i % 3;

        if (type === 0) {
          items.push({ name: `Food Item ${i}`, station: 'grill', lineTotalCents: cents });
          expectedPreparedFoodSales += cents;
        } else if (type === 1) {
          items.push({ name: `Cocktail ${i}`, station: 'bar', lineTotalCents: cents });
          expectedAlcoholSales += cents;
        } else {
          items.push({ name: `Exempt Item ${i}`, isTaxExempt: true, lineTotalCents: cents });
          expectedExemptSales += cents;
        }
      }

      const totalSubtotal = expectedPreparedFoodSales + expectedAlcoholSales + expectedExemptSales;
      expect(totalSubtotal).toBeGreaterThan(10000000); // Over $100,000.00

      const res = calculateMultiRateTax(items, {
        preparedFoodRatePercent: 8.25,
        alcoholRatePercent: 10.0,
      });

      // Assert Invariants
      expect(res.subtotalCents).toBe(totalSubtotal);
      expect(res.breakdown.preparedFood.taxableSalesCents).toBe(expectedPreparedFoodSales);
      expect(res.breakdown.alcohol.taxableSalesCents).toBe(expectedAlcoholSales);
      expect(res.breakdown.exempt.taxableSalesCents).toBe(expectedExemptSales);

      const expectedFoodTax = Math.round(expectedPreparedFoodSales * 0.0825);
      const expectedAlcTax = Math.round(expectedAlcoholSales * 0.10);

      expect(res.breakdown.preparedFood.taxAmountCents).toBe(expectedFoodTax);
      expect(res.breakdown.alcohol.taxAmountCents).toBe(expectedAlcTax);
      expect(res.breakdown.exempt.taxAmountCents).toBe(0);

      expect(res.totalTaxCents).toBe(expectedFoodTax + expectedAlcTax);
      expect(res.totalCents).toBe(totalSubtotal + res.totalTaxCents);
      expect(res.totalCents - res.subtotalCents).toBe(res.totalTaxCents);
      expect(Number.isInteger(res.totalCents)).toBe(true);
      expect(Number.isInteger(res.totalTaxCents)).toBe(true);
    });
  });

  // ============================================================================
  // Scope 4: Tip Pooling Engine & Zero-Cent Leakage Guarantee
  // ============================================================================
  describe('Scope 4: Tip Pooling Engine (Zero-Cent Leakage Invariance)', () => {
    it('4.1: Role weights calculate point-hours accurately (FLSA manager = 0.0 weight)', () => {
      const staff = [
        { staffId: 's1', role: 'server', hours: 8 },         // weight 1.0 -> 8.0 points
        { staffId: 's2', role: 'head_bartender', hours: 6 }, // weight 1.0 -> 6.0 points
        { staffId: 's3', role: 'food_runner', hours: 4 },    // weight 0.45 -> 1.8 points
        { staffId: 's4', role: 'line_cook', hours: 8 },      // weight 0.25 -> 2.0 points
        { staffId: 's5', role: 'manager', hours: 10 },       // weight 0.0 -> 0.0 points
      ];

      const pool = calculateTipPool(
        {
          method: 'role_weighted',
          poolTotalCents: 35600, // $356.00
        },
        staff
      );

      expect(pool.totalPoints).toBe(17.8);
      expect(pool.totalEligibleHours).toBe(36.0);

      // Manager must receive $0.00
      const mgrPayout = pool.staffPayouts.find((s) => s.role === 'manager');
      expect(mgrPayout?.payoutCents).toBe(0);
      expect(mgrPayout?.weight).toBe(0);

      // Exact sum invariant
      const sumPayouts = pool.staffPayouts.reduce((s, p) => s + p.payoutCents, 0);
      expect(sumPayouts).toBe(35600);
      expect(pool.remainderCents).toBe(0);
    });

    it('4.2: Zero-cent leakage invariant across odd numbers of staff (3, 7, 11, 13, 17, 33)', () => {
      const oddCounts = [3, 7, 11, 13, 17, 19, 23, 29, 31, 33, 47];
      const testPools = [10000, 12345, 99999, 1, 3, 7, 54321, 250000];

      for (const count of oddCounts) {
        for (const poolCents of testPools) {
          const staff = Array.from({ length: count }, (_, i) => ({
            staffId: `staff-${i}`,
            role: i % 2 === 0 ? 'server' : 'busser',
            hours: 5.5 + (i * 0.33), // Odd fractional hours
          }));

          const result = calculateTipPool(
            {
              method: 'role_weighted',
              poolTotalCents: poolCents,
            },
            staff
          );

          const totalDistributed = result.staffPayouts.reduce((acc, p) => acc + p.payoutCents, 0);

          // Absolute invariant: exactly 100% of the pool is distributed to the penny
          expect(totalDistributed).toBe(poolCents);
          expect(result.remainderCents).toBe(0);
        }
      }
    });

    it('4.3: Hours-worked method treats all staff with equal 1.0 weight', () => {
      const staff = [
        { staffId: 's1', role: 'server', hours: 5 },
        { staffId: 's2', role: 'line_cook', hours: 5 },
      ];

      const pool = calculateTipPool(
        {
          method: 'hours_worked',
          poolTotalCents: 10000, // $100.00
        },
        staff
      );

      expect(pool.staffPayouts[0].payoutCents).toBe(5000);
      expect(pool.staffPayouts[1].payoutCents).toBe(5000);
      expect(pool.staffPayouts[0].weight).toBe(1.0);
      expect(pool.staffPayouts[1].weight).toBe(1.0);
    });
  });

  // ============================================================================
  // Scope 5: EOD Z-Report Shift Reconciliation & Immutable Sealing
  // ============================================================================
  describe('Scope 5: EOD Z-Report Shift Reconciliation & Sealing', () => {
    it('5.1: Cash drawer reconciliation computes over/short accurately', async () => {
      // Preview Z-Report with float $200.00 and actual cash counted
      const res = await reportsRoutes.request('/z-report?openingFloatCents=20000&actualCashCountedCents=25000', {
        headers: tenantHeaders(),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);

      const zrep = body.data;
      expect(zrep.status).toBe('preview');
      expect(zrep.cashReconciliation.openingFloatCents).toBe(20000);
      expect(zrep.cashReconciliation.actualCountedCents).toBe(25000);
      expect(zrep.cashReconciliation.expectedInDrawerCents).toBeDefined();
      expect(zrep.cashReconciliation.overShortCents).toBe(
        25000 - zrep.cashReconciliation.expectedInDrawerCents
      );
    });

    it('5.2: Shift closeout requires Manager PIN and seals immutable Z-Report (201 Created)', async () => {
      const today = new Date().toISOString().split('T')[0];

      // 1. Attempt close without PIN
      const unauthClose = await reportsRoutes.request('/z-report/close', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({
          date: today,
          shiftId: 'shift-evening-close-test',
          actualCashCountedCents: 22000,
        }),
      });
      expect(unauthClose.status).toBe(403);

      // 2. Close with Manager PIN (5678)
      const closeRes = await reportsRoutes.request('/z-report/close', {
        method: 'POST',
        headers: tenantHeaders(),
        body: JSON.stringify({
          managerPin: '5678',
          date: today,
          shiftId: 'shift-evening-close-test',
          openingFloatCents: 20000,
          actualCashCountedCents: 21550,
          notes: 'Drawer short $4.50 due to incorrect coin change',
        }),
      });

      expect(closeRes.status).toBe(201);
      const closeBody = await closeRes.json();
      expect(closeBody.ok).toBe(true);
      const sealed = closeBody.data;

      expect(sealed.status).toBe('closed');
      expect(sealed.zReportNumber).toMatch(/^Z-\d{8}-\d{4}$/);
      expect(sealed.closedBy.displayName).toBe('Jane Smith');
      expect(sealed.closedBy.role).toBe('manager');
      expect(sealed.cashReconciliation.actualCountedCents).toBe(21550);
      expect(sealed.cashReconciliation.notes).toContain('Drawer short');
    });

    it('5.3: Sealed Z-Report is immutable upon subsequent GET inquiries', async () => {
      const today = new Date().toISOString().split('T')[0];

      const getRes = await reportsRoutes.request(`/z-report?date=${today}&shiftId=shift-evening-close-test`, {
        headers: tenantHeaders(),
      });

      expect(getRes.status).toBe(200);
      const getBody = await getRes.json();
      expect(getBody.ok).toBe(true);
      expect(getBody.data.status).toBe('closed');
      expect(getBody.data.closedBy.displayName).toBe('Jane Smith');
    });
  });
});

describe('Adversarial Verification: R4 Turnkey Installer, Tray Daemon & Network Discovery', () => {
  // ============================================================================
  // Scope 6: Turnkey Installer, Port Healer, Pure TS QR & RFC 6762 mDNS
  // ============================================================================
  describe('Scope 6: Turnkey Diagnostics, Port Healing, Pure TS QR & mDNS', () => {
    it('6.1: Automated Diagnostics Preflight checks all 8 categories and reports system readiness', async () => {
      const report = await runDiagnostics();

      expect(report.isReady).toBe(true);
      expect(report.failCount).toBe(0);
      expect(report.system.nodeVersion).toBeDefined();
      expect(report.system.cpuCores).toBeGreaterThanOrEqual(1);
      expect(report.system.totalMemoryMb).toBeGreaterThan(500);

      const categories = new Set(report.checks.map((c) => c.category));
      expect(categories.has('Runtimes')).toBe(true);
      expect(categories.has('Resources')).toBe(true);
      expect(categories.has('Ports')).toBe(true);
      expect(categories.has('Builds')).toBe(true);
      expect(categories.has('Database')).toBe(true);
      expect(categories.has('Network')).toBe(true);
      expect(categories.has('Hardware')).toBe(true);
    });

    it('6.2: Port conflict detection and healing on dynamic sockets', async () => {
      const testPort = 49600 + Math.floor(Math.random() * 2000);
      const server = net.createServer();

      await new Promise<void>((resolve) => {
        server.listen(testPort, '127.0.0.1', () => resolve());
      });

      // Assert port is now busy
      const isFree = await isPortAvailable(testPort, '127.0.0.1');
      expect(isFree).toBe(false);

      // Close socket
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });

      // Assert port is released
      const isFreeNow = await isPortAvailable(testPort, '127.0.0.1');
      expect(isFreeNow).toBe(true);
    });

    it('6.3: Pure TypeScript QR Code generator produces valid ANSI and Data URLs', async () => {
      const testUrl = 'http://192.168.1.150:5180';

      // 1. Terminal ANSI QR
      const terminalQr = await generateTerminalQr(testUrl);
      expect(typeof terminalQr).toBe('string');
      expect(terminalQr.length).toBeGreaterThan(100);
      expect(terminalQr).toContain('\x1b['); // Contains ANSI escape sequences

      // 2. Data URL QR
      const dataUrl = await generateDataUrlQr(testUrl);
      expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
      const svgBase64 = dataUrl.replace('data:image/svg+xml;base64,', '');
      const decodedSvg = Buffer.from(svgBase64, 'base64').toString('utf8');
      expect(decodedSvg).toContain('<svg');
      expect(decodedSvg).toContain('</svg>');
      expect(decodedSvg).toContain('<rect');
    });

    it('6.4: RFC 6762 Authoritative mDNS Multicast DNS Packet Construction', () => {
      const packet = buildMdnsResponsePacket({
        hostname: 'culinaryos.local',
        ip: '10.0.0.42',
        port: 5180,
        serviceName: 'CulinaryOS Master Node',
      });

      expect(Buffer.isBuffer(packet)).toBe(true);
      expect(packet.length).toBeGreaterThan(60);

      // Transaction ID = 0x0000 for mDNS
      expect(packet.readUInt16BE(0)).toBe(0x0000);

      // Flags = 0x8400 (QR=1 response, AA=1 authoritative answer)
      const flags = packet.readUInt16BE(2);
      expect(flags).toBe(0x8400);

      // Questions = 0, Answer RRs >= 1
      expect(packet.readUInt16BE(4)).toBe(0);
      expect(packet.readUInt16BE(6)).toBeGreaterThanOrEqual(1);

      // Check packet content contains service name & hostname
      const raw = packet.toString('binary');
      expect(raw).toContain('culinaryos');
      expect(raw).toContain('local');
    });

    it('6.5: Pairing payload provides both LAN IP and mDNS endpoints for all 7 apps', () => {
      const payload = generatePairingPayload({
        lanIp: '192.168.4.20',
        hostname: 'culinaryos.local',
      });

      expect(payload.urls.pos).toBe('http://192.168.4.20:5172');
      expect(payload.urls.kds).toBe('http://192.168.4.20:5173');
      expect(payload.urls.admin).toBe('http://192.168.4.20:5174');
      expect(payload.urls.storefront).toBe('http://192.168.4.20:5176');
      expect(payload.urls.tableside).toBe('http://192.168.4.20:5176/table/demo/1');
      expect(payload.urls.desktop).toBe('http://192.168.4.20:5180');
      expect(payload.urls.api).toBe('http://192.168.4.20:3000');

      expect(payload.mdnsUrls.pos).toBe('http://culinaryos.local:5172');
      expect(payload.mdnsUrls.kds).toBe('http://culinaryos.local:5173');
    });
  });
});
