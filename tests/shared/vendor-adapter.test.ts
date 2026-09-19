// ============================================================
// CulinaryOS — Vendor Adapter & Purchasing Tests
// Covers: Sysco EDI/REST, US Foods, Local Farm purveyors,
// PO submission, invoice parsing, and Invoice Price Variance (IPV).
// ============================================================

import { describe, it, expect } from 'bun:test';
import {
  SyscoAdapter,
  USFoodsAdapter,
  LocalDirectAdapter,
  VendorRegistry,
  calculateInvoicePriceVariance,
  type PurchaseOrderPayload,
  type ParsedVendorInvoice,
} from '../../packages/shared/src/vendor-adapter.js';

describe('Vendor Adapter Engine & Purchasing', () => {
  const sysco = new SyscoAdapter();
  const usFoods = new USFoodsAdapter();
  const localFarm = new LocalDirectAdapter('green_meadows', 'Green Meadows Organics');

  it('1. searches Sysco catalog with keyword and category filter', async () => {
    const allFlour = await sysco.searchCatalog('flour');
    expect(allFlour.length).toBeGreaterThan(0);
    expect(allFlour[0]?.vendorSku).toBe('SYS-782194');
    expect(allFlour[0]?.unitPriceCents).toBe(2450); // $24.50

    const dairyOnly = await sysco.searchCatalog('cream', 'dairy');
    expect(dairyOnly.length).toBe(1);
    expect(dairyOnly[0]?.category).toBe('dairy');
  });

  it('2. returns live pricing map for specified vendor SKUs', async () => {
    const skus = ['SYS-782194', 'SYS-109283', 'NON-EXISTENT'];
    const priceMap = await sysco.getLivePricing(skus);
    expect(priceMap.get('SYS-782194')).toBe(2450);
    expect(priceMap.get('SYS-109283')).toBe(11800);
    expect(priceMap.has('NON-EXISTENT')).toBe(false);
  });

  it('3. submits purchase order and receives vendor electronic confirmation', async () => {
    const poPayload: PurchaseOrderPayload = {
      poNumber: 'PO-2026-0042',
      venueId: 'venue-downtown',
      organizationId: 'org-culinary-corp',
      vendorId: 'sysco',
      deliveryDateRequested: '2026-09-20',
      items: [
        {
          ingredientId: 'ing-flour',
          vendorSku: 'SYS-782194',
          name: 'Flour All-Purpose High Gluten',
          quantityOrdered: 4,
          unitPriceCents: 2450,
          extendedPriceCents: 9800,
        },
        {
          ingredientId: 'ing-butter',
          vendorSku: 'SYS-109283',
          name: 'Butter Unsalted Solid Grade AA',
          quantityOrdered: 2,
          unitPriceCents: 11800,
          extendedPriceCents: 23600,
        },
      ],
      totalAmountCents: 33400, // $334.00
    };

    const confirmation = await sysco.submitPurchaseOrder(poPayload);
    expect(confirmation.success).toBe(true);
    expect(confirmation.vendorName).toBe('Sysco Foods');
    expect(confirmation.status).toBe('accepted');
    expect(confirmation.vendorOrderRef).toContain('SYS-ORD-');
    expect(confirmation.totalConfirmedCents).toBe(33400);
  });

  it('4. rejects empty purchase orders with descriptive error', async () => {
    const emptyPo: PurchaseOrderPayload = {
      poNumber: 'PO-EMPTY',
      venueId: 'venue-1',
      organizationId: 'org-1',
      vendorId: 'sysco',
      deliveryDateRequested: '2026-09-20',
      items: [],
      totalAmountCents: 0,
    };

    await expect(sysco.submitPurchaseOrder(emptyPo)).rejects.toThrow('Cannot submit empty purchase order');
  });

  it('5. handles US Foods catalog and order transmission', async () => {
    const items = await usFoods.searchCatalog('romaine');
    expect(items.length).toBe(1);
    expect(items[0]?.vendorSku).toBe('USF-445566');

    const po: PurchaseOrderPayload = {
      poNumber: 'PO-USF-101',
      venueId: 'venue-uptown',
      organizationId: 'org-culinary-corp',
      vendorId: 'us_foods',
      deliveryDateRequested: '2026-09-21',
      items: [
        {
          ingredientId: 'ing-romaine',
          vendorSku: 'USF-445566',
          name: 'Fresh Romaine Hearts',
          quantityOrdered: 5,
          unitPriceCents: 3200,
          extendedPriceCents: 16000,
        },
      ],
      totalAmountCents: 16000,
    };

    const conf = await usFoods.submitPurchaseOrder(po);
    expect(conf.success).toBe(true);
    expect(conf.status).toBe('accepted');
  });

  it('6. parses electronic invoice and computes Invoice Price Variance (IPV)', async () => {
    const rawInvoice = `
SKU,Name,Quantity,UnitPriceCents,TotalCents
SYS-782194,Flour All-Purpose High Gluten,4,2600,10400
SYS-109283,Butter Unsalted Solid Grade AA,2,11800,23600
`;

    const parsedInvoice = await sysco.parseElectronicInvoice(rawInvoice);
    expect(parsedInvoice.items.length).toBe(2);
    expect(parsedInvoice.totalCents).toBe(34000);

    const originalPo: PurchaseOrderPayload = {
      poNumber: 'PO-2026-0042',
      venueId: 'venue-downtown',
      organizationId: 'org-culinary-corp',
      vendorId: 'sysco',
      deliveryDateRequested: '2026-09-20',
      items: [
        {
          ingredientId: 'ing-flour',
          vendorSku: 'SYS-782194',
          name: 'Flour All-Purpose High Gluten',
          quantityOrdered: 4,
          unitPriceCents: 2450, // ordered at $24.50
          extendedPriceCents: 9800,
        },
        {
          ingredientId: 'ing-butter',
          vendorSku: 'SYS-109283',
          name: 'Butter Unsalted Solid Grade AA',
          quantityOrdered: 2,
          unitPriceCents: 11800, // ordered at $118.00
          extendedPriceCents: 23600,
        },
      ],
      totalAmountCents: 33400,
    };

    const variances = calculateInvoicePriceVariance(originalPo, parsedInvoice);
    expect(variances.length).toBe(2);

    // Item 1: Flour was invoiced at $26.00 instead of agreed $24.50 (+$1.50 overcharge per unit, $6.00 total)
    const flourVariance = variances.find(v => v.vendorSku === 'SYS-782194')!;
    expect(flourVariance.status).toBe('overcharge');
    expect(flourVariance.variancePerUnitCents).toBe(150);
    expect(flourVariance.totalVarianceCents).toBe(600);

    // Item 2: Butter was invoiced at exact ordered price ($118.00)
    const butterVariance = variances.find(v => v.vendorSku === 'SYS-109283')!;
    expect(butterVariance.status).toBe('match');
    expect(butterVariance.variancePerUnitCents).toBe(0);
    expect(butterVariance.totalVarianceCents).toBe(0);
  });

  it('7. registers and retrieves custom purveyors via VendorRegistry', () => {
    VendorRegistry.register(localFarm);
    const retrieved = VendorRegistry.get('green_meadows');
    expect(retrieved).toBeDefined();
    expect(retrieved?.vendorName).toBe('Green Meadows Organics');

    const allVendors = VendorRegistry.list();
    expect(allVendors.some(v => v.vendorId === 'sysco')).toBe(true);
    expect(allVendors.some(v => v.vendorId === 'us_foods')).toBe(true);
    expect(allVendors.some(v => v.vendorId === 'green_meadows')).toBe(true);
  });
});
