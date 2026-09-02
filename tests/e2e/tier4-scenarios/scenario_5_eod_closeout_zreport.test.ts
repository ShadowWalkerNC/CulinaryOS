// ============================================================
// Tier 4 — Scenario 5: End-of-Day Shift Closeout, Tip Pooling & Z-Report
// Features Exercised: F3.3 (Multi-Rate Tax Engine),
// F3.4 (Role-Weighted Tip Pooling Distribution),
// F3.5 (Automated EOD Z-Report & Cash Drawer Reconciliation).
// ============================================================

import { describe, expect, it } from 'bun:test';
import { generateZReport, type CashDrawerAudit, type ShiftTransaction } from '../tier1-features/f3_5_eod_z_report.test.js';
import { distributeTipPool, type StaffShift } from '../tier1-features/f3_4_tip_pooling.test.js';
import { EscPosEncoder } from '@culinaryos/shared';

describe('Tier 4 — Scenario 5: EOD Shift Closeout, Tips & Z-Report', () => {
  it('executes full daily closeout: sales aggregation, tax breakdown, tip pool payout, drawer audit, and Z-report sealing', () => {
    // 1. Shift Sales Ledger (Food, Liquor, Beer, Wine, Retail, Voids, Comps)
    const shiftTransactions: ShiftTransaction[] = [
      // Table 1: Food + Wine (Credit)
      { id: 'tx-1', type: 'sale', category: 'food', paymentMethod: 'credit', subtotalCents: 12000, taxCents: 990, tipCents: 2500, discountCents: 0, totalCents: 15490 },
      { id: 'tx-2', type: 'sale', category: 'wine', paymentMethod: 'credit', subtotalCents: 8000, taxCents: 1200, tipCents: 1500, discountCents: 0, totalCents: 10700 },

      // Table 2: Food + Beer (Cash)
      { id: 'tx-3', type: 'sale', category: 'food', paymentMethod: 'cash', subtotalCents: 6500, taxCents: 536, tipCents: 1200, discountCents: 0, totalCents: 8236 },
      { id: 'tx-4', type: 'sale', category: 'beer', paymentMethod: 'cash', subtotalCents: 2400, taxCents: 360, tipCents: 500, discountCents: 0, totalCents: 3260 },

      // Table 3: Retail Merch (Credit - Tax Exempt)
      { id: 'tx-5', type: 'sale', category: 'retail', paymentMethod: 'credit', subtotalCents: 4500, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 4500 },

      // VIP Table: Manager Comped Food
      { id: 'tx-6', type: 'comp', category: 'food', paymentMethod: 'credit', subtotalCents: 3500, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },

      // Kitchen Error: Voided Line
      { id: 'tx-7', type: 'void', category: 'food', paymentMethod: 'credit', subtotalCents: 2200, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },
    ];

    // 2. Physical Cash Drawer Count at Midnight Close
    // Cash sales = 8236 + 3260 = 11496 ($114.96)
    // Opening Float = 25000 ($250.00)
    // Expected Cash in Drawer = 25000 + 11496 = 36496 ($364.96)
    const drawerAudit: CashDrawerAudit = {
      openingFloatCents: 25000,
      actualCashInDrawerCents: 36496, // Exact match
    };

    // 3. Generate Z-Report Summary
    const zReport = generateZReport('2026-09-01', shiftTransactions, drawerAudit, true);

    expect(zReport.grossSalesCents).toBe(12000 + 8000 + 6500 + 2400 + 4500); // 33400 ($334.00)
    expect(zReport.netSalesCents).toBe(33400);
    expect(zReport.compsCents).toBe(3500);
    expect(zReport.voidsCents).toBe(2200);
    expect(zReport.totalTaxCents).toBe(990 + 1200 + 536 + 360); // 3086 ($30.86)
    expect(zReport.totalTipsCents).toBe(2500 + 1500 + 1200 + 500); // 5700 ($57.00)

    expect(zReport.categorySales.food).toBe(12000 + 6500); // 18500
    expect(zReport.categorySales.wine).toBe(8000);
    expect(zReport.categorySales.beer).toBe(2400);
    expect(zReport.categorySales.retail).toBe(4500);

    expect(zReport.cashReconciliation.overShortCents).toBe(0);
    expect(zReport.isSealed).toBe(true);

    // 4. Distribute Total Shift Tips ($57.00 / 5700 cents) Across Shift Roster
    const shiftStaff: StaffShift[] = [
      { staffId: 's1', name: 'Lead Server', role: 'server', hoursWorked: 7 },
      { staffId: 's2', name: 'Bartender', role: 'bartender', hoursWorked: 7 },
      { staffId: 's3', name: 'Busser', role: 'busser', hoursWorked: 6 },
    ];

    const tipDistribution = distributeTipPool(zReport.totalTipsCents, shiftStaff, 'role_weighted', {
      server: 1.0,    // 7 pts
      bartender: 0.8, // 5.6 pts
      busser: 0.5,    // 3.0 pts
      kitchen: 0.0,
    });

    expect(tipDistribution.poolConservationCheck).toBe(true);
    expect(tipDistribution.totalDistributedCents).toBe(5700);

    // 5. Thermal Z-Report Receipt Output
    const encoder = new EscPosEncoder();
    encoder
      .init()
      .align('center')
      .doubleSize(true)
      .line('END OF DAY Z-REPORT')
      .doubleSize(false)
      .line(`DATE: ${zReport.shiftDate}`)
      .divider('=', 48)
      .row('GROSS SALES:', `$${(zReport.grossSalesCents / 100).toFixed(2)}`, 48)
      .row('NET SALES:', `$${(zReport.netSalesCents / 100).toFixed(2)}`, 48)
      .row('TOTAL TAX:', `$${(zReport.totalTaxCents / 100).toFixed(2)}`, 48)
      .row('TOTAL TIPS:', `$${(zReport.totalTipsCents / 100).toFixed(2)}`, 48)
      .row('DRAWER OVER/SHORT:', `$${(zReport.cashReconciliation.overShortCents / 100).toFixed(2)}`, 48)
      .divider('=', 48)
      .line('*** SHIFT SEALED & FINALIZED ***')
      .cut();

    expect(encoder.getBuffer().length).toBeGreaterThan(100);
  });
});
