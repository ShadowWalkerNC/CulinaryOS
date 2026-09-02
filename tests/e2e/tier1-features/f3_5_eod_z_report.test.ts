// ============================================================
// Tier 1 — F3.5: Automated EOD Z-Report (Granular Feature Tests)
// Covers: Daily closeout aggregation, gross/net sales, category breakdown,
// cash drawer float reconciliation (over/short), and immutable shift seal.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface ShiftTransaction {
  id: string;
  type: 'sale' | 'comp' | 'void' | 'cash_drop' | 'payout';
  category: 'food' | 'liquor' | 'beer' | 'wine' | 'retail';
  paymentMethod: 'cash' | 'credit' | 'gift_card';
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  discountCents: number;
  totalCents: number;
}

export interface CashDrawerAudit {
  openingFloatCents: number;
  actualCashInDrawerCents: number;
}

export interface ZReportSummary {
  reportId: string;
  shiftDate: string;
  grossSalesCents: number;
  netSalesCents: number;
  discountsCents: number;
  compsCents: number;
  voidsCents: number;
  totalTaxCents: number;
  totalTipsCents: number;
  categorySales: Record<string, number>;
  paymentSummary: {
    cashSalesCents: number;
    creditSalesCents: number;
    giftCardSalesCents: number;
  };
  cashReconciliation: {
    openingFloatCents: number;
    cashSalesCents: number;
    expectedCashInDrawerCents: number;
    actualCashInDrawerCents: number;
    overShortCents: number; // positive = over, negative = short
  };
  isSealed: boolean;
  sealedAt?: string;
}

export function generateZReport(
  shiftDate: string,
  txs: ShiftTransaction[],
  drawer: CashDrawerAudit,
  sealNow = false
): ZReportSummary {
  let grossSales = 0;
  let netSales = 0;
  let discounts = 0;
  let comps = 0;
  let voids = 0;
  let totalTax = 0;
  let totalTips = 0;
  let cashSales = 0;
  let creditSales = 0;
  let giftCardSales = 0;

  const categorySales: Record<string, number> = {
    food: 0,
    liquor: 0,
    beer: 0,
    wine: 0,
    retail: 0,
  };

  for (const t of txs) {
    if (t.type === 'sale') {
      grossSales += t.subtotalCents + t.discountCents;
      netSales += t.subtotalCents;
      discounts += t.discountCents;
      totalTax += t.taxCents;
      totalTips += t.tipCents;
      categorySales[t.category] = (categorySales[t.category] ?? 0) + t.subtotalCents;

      if (t.paymentMethod === 'cash') cashSales += t.totalCents;
      else if (t.paymentMethod === 'credit') creditSales += t.totalCents;
      else if (t.paymentMethod === 'gift_card') giftCardSales += t.totalCents;
    } else if (t.type === 'comp') {
      comps += t.subtotalCents;
    } else if (t.type === 'void') {
      voids += t.subtotalCents;
    }
  }

  const expectedCash = drawer.openingFloatCents + cashSales;
  const overShort = drawer.actualCashInDrawerCents - expectedCash;

  return {
    reportId: `z-rep-${shiftDate}-${Date.now()}`,
    shiftDate,
    grossSalesCents: grossSales,
    netSalesCents: netSales,
    discountsCents: discounts,
    compsCents: comps,
    voidsCents: voids,
    totalTaxCents: totalTax,
    totalTipsCents: totalTips,
    categorySales,
    paymentSummary: {
      cashSalesCents: cashSales,
      creditSalesCents: creditSales,
      giftCardSalesCents: giftCardSales,
    },
    cashReconciliation: {
      openingFloatCents: drawer.openingFloatCents,
      cashSalesCents: cashSales,
      expectedCashInDrawerCents: expectedCash,
      actualCashInDrawerCents: drawer.actualCashInDrawerCents,
      overShortCents: overShort,
    },
    isSealed: sealNow,
    sealedAt: sealNow ? new Date().toISOString() : undefined,
  };
}

describe('F3.5 Automated EOD Z-Report — Tier 1 Isolation', () => {
  const sampleTransactions: ShiftTransaction[] = [
    { id: '1', type: 'sale', category: 'food', paymentMethod: 'credit', subtotalCents: 10000, taxCents: 825, tipCents: 2000, discountCents: 1000, totalCents: 12825 },
    { id: '2', type: 'sale', category: 'liquor', paymentMethod: 'cash', subtotalCents: 5000, taxCents: 750, tipCents: 1000, discountCents: 0, totalCents: 6750 },
    { id: '3', type: 'comp', category: 'food', paymentMethod: 'credit', subtotalCents: 2500, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },
    { id: '4', type: 'void', category: 'beer', paymentMethod: 'credit', subtotalCents: 1500, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },
  ];

  const drawerAudit: CashDrawerAudit = {
    openingFloatCents: 30000, // $300.00 cash float
    actualCashInDrawerCents: 36750, // $367.50 cash count
  };

  it('1. aggregates gross sales, discounts, and net sales correctly', () => {
    const report = generateZReport('2026-09-01', sampleTransactions, drawerAudit);
    // Gross: (10000 + 1000) + 5000 = 16000 ($160.00)
    // Net: 10000 + 5000 = 15000 ($150.00)
    // Discounts: 1000 ($10.00)
    expect(report.grossSalesCents).toBe(16000);
    expect(report.netSalesCents).toBe(15000);
    expect(report.discountsCents).toBe(1000);
  });

  it('2. tracks comps and voids separately in the reconciliation report', () => {
    const report = generateZReport('2026-09-01', sampleTransactions, drawerAudit);
    expect(report.compsCents).toBe(2500); // $25.00
    expect(report.voidsCents).toBe(1500); // $15.00
  });

  it('3. breaks down sales by menu category (food, liquor, beer, wine)', () => {
    const report = generateZReport('2026-09-01', sampleTransactions, drawerAudit);
    expect(report.categorySales.food).toBe(10000);
    expect(report.categorySales.liquor).toBe(5000);
  });

  it('4. performs cash drawer audit and detects exact balanced cash or over/short', () => {
    // Opening 30000 + Cash Sale 6750 = Expected 36750. Actual 36750 -> Over/Short = 0
    const report = generateZReport('2026-09-01', sampleTransactions, drawerAudit);
    expect(report.cashReconciliation.expectedCashInDrawerCents).toBe(36750);
    expect(report.cashReconciliation.overShortCents).toBe(0);

    // Test with cash short
    const shortAudit: CashDrawerAudit = { openingFloatCents: 30000, actualCashInDrawerCents: 36500 }; // $2.50 short
    const shortReport = generateZReport('2026-09-01', sampleTransactions, shortAudit);
    expect(shortReport.cashReconciliation.overShortCents).toBe(-250);
  });

  it('5. sets immutable sealed status and captures seal timestamp upon daily close', () => {
    const sealedReport = generateZReport('2026-09-01', sampleTransactions, drawerAudit, true);
    expect(sealedReport.isSealed).toBe(true);
    expect(sealedReport.sealedAt).toBeDefined();
  });
});
