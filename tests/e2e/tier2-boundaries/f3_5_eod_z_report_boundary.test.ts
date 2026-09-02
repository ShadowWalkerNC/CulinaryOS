// ============================================================
// Tier 2 — F3.5: Automated EOD Z-Report (Boundary & Corner Cases)
// Covers: 0-transaction shift closeout, $0 opening cash float,
// massive cash overage ($1,000) and shortage (-$500), and all-void shifts.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  generateZReport,
  type CashDrawerAudit,
  type ShiftTransaction,
} from '../tier1-features/f3_5_eod_z_report.test.js';

describe('F3.5 EOD Z-Report — Tier 2 Boundaries', () => {
  it('1. generates clean zero report for a shift with 0 transactions', () => {
    const emptyDrawer: CashDrawerAudit = { openingFloatCents: 20000, actualCashInDrawerCents: 20000 };
    const report = generateZReport('2026-09-01', [], emptyDrawer);
    expect(report.grossSalesCents).toBe(0);
    expect(report.netSalesCents).toBe(0);
    expect(report.totalTaxCents).toBe(0);
    expect(report.totalTipsCents).toBe(0);
    expect(report.cashReconciliation.overShortCents).toBe(0);
  });

  it('2. audits shift with $0 opening float accurately', () => {
    const cashTx: ShiftTransaction = {
      id: 'tx-1',
      type: 'sale',
      category: 'food',
      paymentMethod: 'cash',
      subtotalCents: 4000,
      taxCents: 330,
      tipCents: 500,
      discountCents: 0,
      totalCents: 4830,
    };
    const zeroFloatAudit: CashDrawerAudit = { openingFloatCents: 0, actualCashInDrawerCents: 4830 };
    const report = generateZReport('2026-09-01', [cashTx], zeroFloatAudit);
    expect(report.cashReconciliation.expectedCashInDrawerCents).toBe(4830);
    expect(report.cashReconciliation.overShortCents).toBe(0);
  });

  it('3. detects large cash shortage (-$500.00 / -50000 cents)', () => {
    const cashTx: ShiftTransaction = {
      id: 'tx-2',
      type: 'sale',
      category: 'food',
      paymentMethod: 'cash',
      subtotalCents: 100000, // $1,000 cash sale
      taxCents: 8250,
      tipCents: 0,
      discountCents: 0,
      totalCents: 108250,
    };
    // Expected = 20000 + 108250 = 128250. Actual = 78250 (-50000 short)
    const shortAudit: CashDrawerAudit = { openingFloatCents: 20000, actualCashInDrawerCents: 78250 };
    const report = generateZReport('2026-09-01', [cashTx], shortAudit);
    expect(report.cashReconciliation.overShortCents).toBe(-50000);
  });

  it('4. detects large cash overage (+$1,000.00 / +100000 cents)', () => {
    const overAudit: CashDrawerAudit = { openingFloatCents: 20000, actualCashInDrawerCents: 120000 };
    const report = generateZReport('2026-09-01', [], overAudit);
    expect(report.cashReconciliation.overShortCents).toBe(100000);
  });

  it('5. calculates 100% voided shift with $0 net sales and accurate void total', () => {
    const allVoidTxs: ShiftTransaction[] = [
      { id: 'v1', type: 'void', category: 'food', paymentMethod: 'credit', subtotalCents: 5000, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },
      { id: 'v2', type: 'void', category: 'liquor', paymentMethod: 'cash', subtotalCents: 3000, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },
    ];
    const drawer: CashDrawerAudit = { openingFloatCents: 20000, actualCashInDrawerCents: 20000 };
    const report = generateZReport('2026-09-01', allVoidTxs, drawer);
    expect(report.netSalesCents).toBe(0);
    expect(report.voidsCents).toBe(8000); // $80.00
  });
});
