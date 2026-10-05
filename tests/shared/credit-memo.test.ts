import { describe, it, expect } from 'bun:test';
import {
  generateSupplierCreditMemo,
  exportCreditMemoCsv,
  type SupplierCreditMemoItem,
} from '../../packages/waste-engine/src/credit-memo.js';

describe('Supplier Credit Memo Generation & Waste Integration', () => {
  it('generates a formal supplier credit memo from spoiled/damaged waste items', () => {
    const items: SupplierCreditMemoItem[] = [
      {
        ingredient: 'Atlantic Salmon Fillet',
        quantityGrams: 4500,
        quantityDisplay: '10 lbs',
        costPerGram: 0.025,
        totalCostDollars: 112.50,
        reason: 'Temperature abuse on delivery (>45°F)',
        lotNumber: 'LOT-SALM-8891',
        poNumber: 'PO-2026-1044',
      },
      {
        ingredient: 'Organic Baby Arugula',
        quantityGrams: 1800,
        quantityDisplay: '4 lbs',
        costPerGram: 0.012,
        totalCostDollars: 21.60,
        reason: 'Spoiled / slimy on arrival',
        lotNumber: 'LOT-ARUG-201',
        poNumber: 'PO-2026-1044',
      },
    ];

    const memo = generateSupplierCreditMemo('Dennis Food Service', items, {
      invoiceReference: 'INV-DENNIS-9921',
      poReference: 'PO-2026-1044',
      vendorEmail: 'claims@dennisfoods.com',
      restaurantName: 'Cheezies Gourmet',
    });

    expect(memo.vendorName).toBe('Dennis Food Service');
    expect(memo.items).toHaveLength(2);
    expect(memo.totalCreditDollars).toBe(134.10);
    expect(memo.status).toBe('draft');
    expect(memo.requestText).toContain('Dennis Food Service');
    expect(memo.requestText).toContain('$134.10');
    expect(memo.requestText).toContain('Atlantic Salmon Fillet');
    expect(memo.requestText).toContain('INV-DENNIS-9921');
  });

  it('exports credit memo to standard accounts payable CSV', () => {
    const items: SupplierCreditMemoItem[] = [
      {
        ingredient: 'Heavy Whipping Cream',
        quantityGrams: 3000,
        quantityDisplay: '3 qts',
        costPerGram: 0.008,
        totalCostDollars: 24.00,
        reason: 'Curdled before expiration date',
        lotNumber: 'LOT-DAIRY-44',
      },
    ];

    const memo = generateSupplierCreditMemo('Sysco Boston', items, {
      invoiceReference: 'SYSCO-INV-771',
    });

    const csv = exportCreditMemoCsv(memo);
    expect(csv).toContain('Memo Number,Vendor,Invoice Ref,PO Ref,Date,Ingredient,Quantity,Credit Amount,Reason,Lot Number');
    expect(csv).toContain('Sysco Boston');
    expect(csv).toContain('SYSCO-INV-771');
    expect(csv).toContain('Heavy Whipping Cream');
    expect(csv).toContain('24.00');
  });
});
