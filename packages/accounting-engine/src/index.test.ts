import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createZReportJournalEntry } from './index.js';

describe('Accounting Engine: Z-Report Double Entry Mapping', () => {
  it('generates a strictly balanced journal entry for typical daily sales', () => {
    const entry = createZReportJournalEntry({
      date: '2026-10-17',
      zReportNumber: 'Z-20261017-001',
      cashReceivedCents: 50000,
      creditCardReceivedCents: 150000,
      foodSalesCents: 165000,
      beverageSalesCents: 25000,
      compsCents: 5000,
      salesTaxPayableCents: 15000,
      cashOverShortCents: 0,
    });

    assert.equal(entry.isBalanced, true);
    assert.equal(entry.totalDebitCents, entry.totalCreditCents);
    assert.ok(entry.lines.length >= 4);
    assert.equal(entry.reference, 'Z-20261017-001');
  });

  it('balances journal entries with cash short expense', () => {
    const entry = createZReportJournalEntry({
      date: '2026-10-17',
      zReportNumber: 'Z-20261017-002',
      cashReceivedCents: 49000,
      creditCardReceivedCents: 150000,
      foodSalesCents: 165000,
      beverageSalesCents: 25000,
      compsCents: 5000,
      salesTaxPayableCents: 15000,
      cashOverShortCents: -1000,
    });

    assert.equal(entry.isBalanced, true);
    assert.equal(entry.totalDebitCents, entry.totalCreditCents);
  });
});
