// ============================================================
// @culinaryops/waste-engine — Supplier Credit Memo Generator
// Integrates kitchen waste loss with vendor credit claims for
// items arrived spoiled, damaged, out-of-temp, or bad lot/cut.
// ============================================================

export interface SupplierCreditMemoItem {
  ingredient: string;
  quantityGrams: number;
  quantityDisplay?: string | undefined;
  costPerGram: number;
  totalCostDollars: number;
  reason: string;
  lotNumber?: string | undefined;
  poNumber?: string | undefined;
}

export interface SupplierCreditMemo {
  id: string;
  memoNumber: string;
  vendorName: string;
  vendorEmail?: string | undefined;
  invoiceReference?: string | undefined;
  poReference?: string | undefined;
  generatedDate: string;
  items: SupplierCreditMemoItem[];
  totalCreditDollars: number;
  status: 'draft' | 'submitted' | 'credited' | 'disputed';
  notes?: string | undefined;
  requestText: string;
}

export interface CreditMemoOptions {
  memoNumber?: string | undefined;
  invoiceReference?: string | undefined;
  poReference?: string | undefined;
  notes?: string | undefined;
  vendorEmail?: string | undefined;
  restaurantName?: string | undefined;
}

/**
 * Generates a formal supplier credit memo from wasted/rejected delivery items.
 */
export function generateSupplierCreditMemo(
  vendorName: string,
  items: SupplierCreditMemoItem[],
  opts?: CreditMemoOptions
): SupplierCreditMemo {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]!;
  const randSuffix = Math.floor(100 + Math.random() * 900);
  const memoNumber =
    opts?.memoNumber || `CM-${dateStr.replace(/-/g, '')}-${randSuffix}`;

  const totalCredit = items.reduce((sum, item) => sum + item.totalCostDollars, 0);
  const totalCreditDollars = Math.round(totalCredit * 100) / 100;

  const restaurantName = opts?.restaurantName || 'CulinaryOS Kitchen';

  // Construct formal claim text
  const itemRows = items
    .map((item, idx) => {
      const qty = item.quantityDisplay || `${item.quantityGrams}g`;
      const lot = item.lotNumber ? ` (Lot: ${item.lotNumber})` : '';
      return `${idx + 1}. ${item.ingredient} — ${qty} @ $${item.totalCostDollars.toFixed(2)}${lot}\n   Reason: ${item.reason}`;
    })
    .join('\n');

  const requestText = `
CREDIT MEMO REQUEST: ${memoNumber}
Date: ${dateStr}
To: ${vendorName} ${opts?.vendorEmail ? `(${opts.vendorEmail})` : ''}
From: ${restaurantName}
Invoice Ref: ${opts?.invoiceReference || 'N/A'}
PO Ref: ${opts?.poReference || 'N/A'}

Please issue a credit memo to our account for the following rejected/spoiled delivery items:

${itemRows}

TOTAL CREDIT REQUESTED: $${totalCreditDollars.toFixed(2)}

${opts?.notes ? `Notes: ${opts.notes}\n` : ''}
Thank you,
Management, ${restaurantName}
`.trim();

  return {
    id: `memo-${Date.now()}-${randSuffix}`,
    memoNumber,
    vendorName,
    vendorEmail: opts?.vendorEmail,
    invoiceReference: opts?.invoiceReference,
    poReference: opts?.poReference,
    generatedDate: dateStr,
    items,
    totalCreditDollars,
    status: 'draft',
    notes: opts?.notes,
    requestText,
  };
}

/**
 * Formats a supplier credit memo into a CSV string for AP/accounting export.
 */
export function exportCreditMemoCsv(memo: SupplierCreditMemo): string {
  const headers = [
    'Memo Number',
    'Vendor',
    'Invoice Ref',
    'PO Ref',
    'Date',
    'Ingredient',
    'Quantity',
    'Credit Amount',
    'Reason',
    'Lot Number',
  ];

  const rows = memo.items.map((item) => [
    `"${memo.memoNumber}"`,
    `"${memo.vendorName}"`,
    `"${memo.invoiceReference || ''}"`,
    `"${memo.poReference || ''}"`,
    `"${memo.generatedDate}"`,
    `"${item.ingredient}"`,
    `"${item.quantityDisplay || `${item.quantityGrams}g`}"`,
    item.totalCostDollars.toFixed(2),
    `"${item.reason.replace(/"/g, '""')}"`,
    `"${item.lotNumber || ''}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
