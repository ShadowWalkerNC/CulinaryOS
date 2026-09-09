import { describe, it, expect } from 'vitest';
import {
  createZReportJournalEntry,
  exportToQuickBooksCsv,
  exportToXeroCsv,
  calculateRestaurantPL,
} from '../../packages/accounting-engine/src/index.js';

describe('Accounting Engine Ledger & P&L', () => {
  const sampleZData = {
    date: '2026-09-02',
    zReportNumber: 'Z-20260902-0001',
    cashReceivedCents: 40000,
    creditCardReceivedCents: 155000,
    foodSalesCents: 160000,
    beverageSalesCents: 30000,
    compsCents: 10000,
    salesTaxPayableCents: 20000,
    cashOverShortCents: -5000, // $50 short: debit 5000 to expense
  };

  it('generates a balanced double-entry General Ledger journal entry', () => {
    const entry = createZReportJournalEntry(sampleZData);
    expect(entry.isBalanced).toBe(true);
    expect(entry.totalDebitCents).toBe(entry.totalCreditCents);
    expect(entry.lines.length).toBeGreaterThanOrEqual(6);
  });

  it('exports journal entries to QuickBooks IIF format with headers', () => {
    const entry = createZReportJournalEntry(sampleZData);
    const qb = exportToQuickBooksCsv(entry);
    expect(qb).toContain('!TRNS');
    expect(qb).toContain('GENERAL JOURNAL');
    expect(qb).toContain('Z-20260902-0001');
  });

  it('exports journal entries to Xero format with base-excluded tax codes', () => {
    const entry = createZReportJournalEntry(sampleZData);
    const xero = exportToXeroCsv(entry);
    expect(xero).toContain('*Narration,*Date');
    expect(xero).toContain('BASEXCLUDED');
  });

  it('calculates Restaurant P&L statement metrics and margins accurately', () => {
    const pl = calculateRestaurantPL({
      periodStart: '2026-09-01',
      periodEnd: '2026-09-02',
      grossRevenueCents: 500000, // $5,000
      discountsCompsCents: 20000, // $200
      cogsFoodCents: 120000,     // $1,200 (25% of net)
      cogsAlcoholCents: 30000,    // $300
      laborExpenseCents: 150000,  // $1,500
      wasteLossCents: 15000,      // $150
    });

    expect(pl.netRevenueCents).toBe(480000);
    expect(pl.totalCogsCents).toBe(150000);
    expect(pl.grossProfitCents).toBe(330000);
    expect(pl.grossProfitMarginPercent).toBe(68.75);
    expect(pl.operatingIncomeCents).toBe(165000);
  });

  it('balances cash drawer shortage as an operating expense debit', () => {
    // Equation: cashReceived (19500) + shortExpense (500) = foodSales (20000)
    const entry = createZReportJournalEntry({
      date: '2026-09-08',
      zReportNumber: 'CASH-DECL-SHORT',
      cashReceivedCents: 19500, // $195 declared
      creditCardReceivedCents: 0,
      foodSalesCents: 20000,    // $200 recorded sales
      beverageSalesCents: 0,
      compsCents: 0,
      salesTaxPayableCents: 0,
      cashOverShortCents: -500, // $5 shortage debit
    });

    expect(entry.isBalanced).toBe(true);
    const shortLine = entry.lines.find(l => l.accountCode === '6080');
    expect(shortLine).toBeDefined();
    expect(shortLine?.debitCents).toBe(500);
  });

  it('balances cash drawer overage as an operating revenue credit', () => {
    // Equation: cashReceived (20500) = foodSales (20000) + overIncome (500)
    const entry = createZReportJournalEntry({
      date: '2026-09-08',
      zReportNumber: 'CASH-DECL-OVER',
      cashReceivedCents: 20500, // $205 declared
      creditCardReceivedCents: 0,
      foodSalesCents: 20000,    // $200 recorded sales
      beverageSalesCents: 0,
      compsCents: 0,
      salesTaxPayableCents: 0,
      cashOverShortCents: 500,  // $5 overage credit
    });

    expect(entry.isBalanced).toBe(true);
    const overLine = entry.lines.find(l => l.accountCode === '4080');
    expect(overLine).toBeDefined();
    expect(overLine?.creditCents).toBe(500);
  });
});
