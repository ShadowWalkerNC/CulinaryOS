/**
 * @culinaryos/accounting-engine
 * Pure functions for chart of accounts mapping, P&L calculations,
 * and standard QuickBooks / Xero journal entry export formatting.
 */

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debitCents: number;
  creditCents: number;
  description: string;
}

export interface JournalEntry {
  entryDate: string; // YYYY-MM-DD
  reference: string; // e.g. "Z-20260902-0001"
  memo: string;
  lines: JournalEntryLine[];
  totalDebitCents: number;
  totalCreditCents: number;
  isBalanced: boolean;
}

export interface RestaurantPLSummary {
  periodStart: string;
  periodEnd: string;
  grossRevenueCents: number;
  discountsCompsCents: number;
  netRevenueCents: number;
  cogsFoodCents: number;
  cogsAlcoholCents: number;
  totalCogsCents: number;
  grossProfitCents: number;
  grossProfitMarginPercent: number;
  laborExpenseCents: number;
  wasteLossCents: number;
  operatingIncomeCents: number;
}

/**
 * Maps an end-of-day restaurant financial summary into balanced double-entry
 * General Ledger journal entries.
 */
export function createZReportJournalEntry(data: {
  date: string;
  zReportNumber: string;
  cashReceivedCents: number;
  creditCardReceivedCents: number;
  foodSalesCents: number;
  beverageSalesCents: number;
  compsCents: number;
  salesTaxPayableCents: number;
  cashOverShortCents: number; // positive = debit cash over, negative = debit cash short expense
}): JournalEntry {
  const lines: JournalEntryLine[] = [];

  // Assets (Debits)
  if (data.cashReceivedCents > 0) {
    lines.push({
      accountCode: '1010',
      accountName: 'Cash on Hand (Undeposited Funds)',
      debitCents: data.cashReceivedCents,
      creditCents: 0,
      description: `Daily cash receipts - ${data.zReportNumber}`,
    });
  }

  if (data.creditCardReceivedCents > 0) {
    lines.push({
      accountCode: '1020',
      accountName: 'Credit Card Merchant Clearing',
      debitCents: data.creditCardReceivedCents,
      creditCents: 0,
      description: `Daily terminal merchant batches - ${data.zReportNumber}`,
    });
  }

  // Comps / Discounts (Contra-Revenue Debit)
  if (data.compsCents > 0) {
    lines.push({
      accountCode: '4090',
      accountName: 'Discounts & Promotional Comps',
      debitCents: data.compsCents,
      creditCents: 0,
      description: `Manager approved discounts - ${data.zReportNumber}`,
    });
  }

  // Cash Drawer Over / Short
  if (data.cashOverShortCents < 0) {
    // Shortage is an expense (Debit)
    lines.push({
      accountCode: '6080',
      accountName: 'Cash Drawer Over/Short Expense',
      debitCents: Math.abs(data.cashOverShortCents),
      creditCents: 0,
      description: `Cash drawer shortage - ${data.zReportNumber}`,
    });
  } else if (data.cashOverShortCents > 0) {
    // Overage is income (Credit)
    lines.push({
      accountCode: '4080',
      accountName: 'Cash Drawer Over/Short Income',
      debitCents: 0,
      creditCents: data.cashOverShortCents,
      description: `Cash drawer overage - ${data.zReportNumber}`,
    });
  }

  // Revenue (Credits)
  if (data.foodSalesCents > 0) {
    lines.push({
      accountCode: '4010',
      accountName: 'Food Sales Revenue',
      debitCents: 0,
      creditCents: data.foodSalesCents,
      description: `Food sales - ${data.zReportNumber}`,
    });
  }

  if (data.beverageSalesCents > 0) {
    lines.push({
      accountCode: '4020',
      accountName: 'Alcohol & Beverage Sales Revenue',
      debitCents: 0,
      creditCents: data.beverageSalesCents,
      description: `Beverage sales - ${data.zReportNumber}`,
    });
  }

  // Liabilities (Credits)
  if (data.salesTaxPayableCents > 0) {
    lines.push({
      accountCode: '2020',
      accountName: 'Sales Tax Payable',
      debitCents: 0,
      creditCents: data.salesTaxPayableCents,
      description: `State and local sales tax collected - ${data.zReportNumber}`,
    });
  }

  const totalDebitCents = lines.reduce((acc, l) => acc + l.debitCents, 0);
  const totalCreditCents = lines.reduce((acc, l) => acc + l.creditCents, 0);

  return {
    entryDate: data.date,
    reference: data.zReportNumber,
    memo: `CulinaryOS Shift Closeout ${data.zReportNumber}`,
    lines,
    totalDebitCents,
    totalCreditCents,
    isBalanced: totalDebitCents === totalCreditCents,
  };
}

/**
 * Format journal entries into QuickBooks Online standard IIF / CSV format.
 */
export function exportToQuickBooksCsv(entry: JournalEntry): string {
  const header = '!TRNS,TRNSID,TRNSTYPE,DATE,ACCNT,NAME,AMOUNT,DOCNUM,MEMO\n!SPL,SPLID,TRNSTYPE,DATE,ACCNT,NAME,AMOUNT,DOCNUM,MEMO\n!ENDTRNS\n';
  const rows: string[] = [];

  entry.lines.forEach((l, idx) => {
    const netAmount = (l.debitCents - l.creditCents) / 100;
    const tag = idx === 0 ? 'TRNS' : 'SPL';
    rows.push(`${tag},,"GENERAL JOURNAL","${entry.entryDate}","${l.accountCode} - ${l.accountName}",,"${netAmount.toFixed(2)}","${entry.reference}","${l.description}"`);
  });

  return header + rows.join('\n') + '\nENDTRNS\n';
}

/**
 * Format journal entries into Xero standard Manual Journal CSV format.
 */
export function exportToXeroCsv(entry: JournalEntry): string {
  const header = '*Narration,*Date,*Description,*AccountCode,*TaxType,*Amount\n';
  const rows = entry.lines.map((l) => {
    const amount = (l.debitCents > 0 ? l.debitCents : -l.creditCents) / 100;
    return `"${entry.memo}","${entry.entryDate}","${l.description}","${l.accountCode}","BASEXCLUDED",${amount.toFixed(2)}`;
  });
  return header + rows.join('\n');
}

/**
 * Computes restaurant Profit & Loss statement economics.
 */
export function calculateRestaurantPL(input: {
  periodStart: string;
  periodEnd: string;
  grossRevenueCents: number;
  discountsCompsCents: number;
  cogsFoodCents: number;
  cogsAlcoholCents: number;
  laborExpenseCents: number;
  wasteLossCents: number;
}): RestaurantPLSummary {
  const netRevenueCents = input.grossRevenueCents - input.discountsCompsCents;
  const totalCogsCents = input.cogsFoodCents + input.cogsAlcoholCents;
  const grossProfitCents = netRevenueCents - totalCogsCents;
  const grossProfitMarginPercent = netRevenueCents > 0
    ? Math.round((grossProfitCents / netRevenueCents) * 10000) / 100
    : 0;
  const operatingIncomeCents = grossProfitCents - input.laborExpenseCents - input.wasteLossCents;

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    grossRevenueCents: input.grossRevenueCents,
    discountsCompsCents: input.discountsCompsCents,
    netRevenueCents,
    cogsFoodCents: input.cogsFoodCents,
    cogsAlcoholCents: input.cogsAlcoholCents,
    totalCogsCents,
    grossProfitCents,
    grossProfitMarginPercent,
    laborExpenseCents: input.laborExpenseCents,
    wasteLossCents: input.wasteLossCents,
    operatingIncomeCents,
  };
}
