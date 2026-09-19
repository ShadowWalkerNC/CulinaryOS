// ============================================================
// CulinaryOS — Purchasing & Lowest-Cost Split MRP Engine Tests
// Harmonized with ShorelineOps models, algorithms, and Dennis CSV import.
// ============================================================

import { describe, it, expect } from 'bun:test';
import {
  calculateSuggestedOrder,
  evaluateMultiDistributorLowestCost,
  optimizeLowestCostSplit,
  parseBroadlineCatalogCsv,
  type OrderGuideEntry,
  type DistributorOffer,
  type VendorItem,
} from '../../packages/shared/src/purchasing.js';

describe('Purchasing & Lowest-Cost Split MRP Engine', () => {
  // Sample order guide entries
  const guideEntries: OrderGuideEntry[] = [
    {
      id: 'og-1',
      vendor_id: 'dennis-1',
      vendor_item_id: 'vi-1',
      item_name: 'Peaches Diced in 100% Juice',
      vendor_sku: 'DNS-1001',
      pack_size: '6/#10 cans',
      uom: 'case',
      par_level: 5,
      on_hand: 2, // deficit 3
      unit_cost: 48.50,
      category: 'Canned Fruits',
      vendor_name: 'Dennis Food Service',
    },
    {
      id: 'og-2',
      vendor_id: 'dennis-1',
      vendor_item_id: 'vi-2',
      item_name: 'Orange Juice Thickened Nectar',
      vendor_sku: 'DNS-1002',
      pack_size: '12/32oz',
      uom: 'case',
      par_level: 4,
      on_hand: 4, // 0 deficit - should not order
      unit_cost: 32.75,
      category: 'Thickened Beverages',
      vendor_name: 'Dennis Food Service',
    },
    {
      id: 'og-3',
      vendor_id: 'dennis-1',
      vendor_item_id: 'vi-3',
      item_name: 'Pureed Green Beans',
      vendor_sku: 'DNS-1003',
      pack_size: '24/4oz',
      uom: 'case',
      par_level: 3,
      on_hand: 1.5, // deficit 1.5 -> ceil = 2
      unit_cost: 29.90,
      category: 'Pureed Foods',
      vendor_name: 'Dennis Food Service',
    },
  ];

  it('1. calculates suggested order quantities from par levels minus on-hand', () => {
    const summary = calculateSuggestedOrder(guideEntries);

    // Only og-1 and og-3 are below par
    expect(summary.totalItems).toBe(2);
    expect(summary.lines.length).toBe(2);

    const peaches = summary.lines.find(l => l.vendorSku === 'DNS-1001')!;
    expect(peaches.suggestedQty).toBe(3);
    expect(peaches.unitCost).toBe(48.50);

    const beans = summary.lines.find(l => l.vendorSku === 'DNS-1003')!;
    expect(beans.suggestedQty).toBe(2); // ceil(3 - 1.5) = 2
    expect(beans.unitCost).toBe(29.90);

    // Total units = 3 + 2 = 5
    expect(summary.totalUnits).toBe(5);

    // Total cost = (3 * 48.50) + (2 * 29.90) = 145.50 + 59.80 = 205.30
    expect(summary.totalCost).toBe(205.30);
    expect(summary.totalCostCents).toBe(20530);
  });

  it('2. evaluates multi-distributor lowest-cost quote and computes cost savings', () => {
    const offers: DistributorOffer[] = [
      {
        vendorId: 'sysco',
        vendorName: 'Sysco Foods',
        vendorSku: 'SYS-112',
        packSizeDesc: '50 LB BAG',
        packUnitGrams: 22679.6, // 50 lbs
        pricePerPack: 24.50,
        deliveryDays: ['Monday', 'Thursday'],
      },
      {
        vendorId: 'us_foods',
        vendorName: 'US Foods',
        vendorSku: 'USF-998',
        packSizeDesc: '50 LB BAG',
        packUnitGrams: 22679.6,
        pricePerPack: 26.20,
        deliveryDays: ['Tuesday', 'Friday'],
      },
      {
        vendorId: 'dennis',
        vendorName: 'Dennis Food Service',
        vendorSku: 'DNS-441',
        packSizeDesc: '50 LB BAG',
        packUnitGrams: 22679.6,
        pricePerPack: 25.00,
        deliveryDays: ['Monday', 'Wednesday'],
      },
    ];

    // Net demand: 100 lbs = 45,359.2 grams (requires 2 bags of 50 lbs)
    const result = evaluateMultiDistributorLowestCost(
      'High Gluten Bread Flour',
      45359.2,
      offers,
      'Monday'
    );

    expect(result.optimalVendor).toBe('Sysco Foods');
    expect(result.packsToOrder).toBe(2);
    expect(result.totalCost).toBe(49.00); // 2 * 24.50
    // Next best is Dennis Food Service @ $25.00 * 2 = $50.00
    expect(result.costSavings).toBe(1.00); // 50.00 - 49.00
    expect(result.alternativeOffers.length).toBe(2);
    expect(result.alternativeOffers[0]?.vendorName).toBe('Dennis Food Service');
    expect(result.alternativeOffers[1]?.vendorName).toBe('US Foods');
  });

  it('3. optimizes lowest-cost split order across multiple vendor catalogs', () => {
    const itemsToOrder: OrderGuideEntry[] = [
      {
        id: 'g-1',
        vendor_id: 'dennis',
        vendor_item_id: 'i-flour',
        item_name: 'All Purpose Flour 50lb',
        vendor_sku: 'SKU-FLOUR',
        par_level: 10,
        on_hand: 4, // needs 6
        unit_cost: 26.00, // Dennis single-source price
        vendor_name: 'Dennis Food Service',
      },
      {
        id: 'g-2',
        vendor_id: 'dennis',
        vendor_item_id: 'i-oil',
        item_name: 'Olive Oil Extra Virgin 4x3L',
        vendor_sku: 'SKU-OIL',
        par_level: 5,
        on_hand: 2, // needs 3
        unit_cost: 62.00, // Dennis single-source price
        vendor_name: 'Dennis Food Service',
      },
    ];

    // Catalogs with competing prices
    const catalogs = new Map<string, { vendorId: string; vendorName: string; items: VendorItem[] }>([
      [
        'sysco',
        {
          vendorId: 'sysco',
          vendorName: 'Sysco Foods',
          items: [
            {
              id: 'sys-flour',
              vendor_id: 'sysco',
              vendor_sku: 'SKU-FLOUR',
              name: 'All Purpose Flour 50lb',
              unit_cost: 23.50, // $2.50 cheaper per bag than Dennis ($26.00)
              active: true,
            },
            {
              id: 'sys-oil',
              vendor_id: 'sysco',
              vendor_sku: 'SKU-OIL',
              name: 'Olive Oil Extra Virgin 4x3L',
              unit_cost: 65.00, // more expensive
              active: true,
            },
          ],
        },
      ],
      [
        'dennis',
        {
          vendorId: 'dennis',
          vendorName: 'Dennis Food Service',
          items: [
            {
              id: 'dns-flour',
              vendor_id: 'dennis',
              vendor_sku: 'SKU-FLOUR',
              name: 'All Purpose Flour 50lb',
              unit_cost: 26.00,
              active: true,
            },
            {
              id: 'dns-oil',
              vendor_id: 'dennis',
              vendor_sku: 'SKU-OIL',
              name: 'Olive Oil Extra Virgin 4x3L',
              unit_cost: 60.00, // $2.00 cheaper than single source benchmark ($62)
              active: true,
            },
          ],
        },
      ],
    ]);

    const splitResult = optimizeLowestCostSplit(itemsToOrder, catalogs);

    // Single vendor benchmark cost: (6 * 26.00) + (3 * 62.00) = 156.00 + 186.00 = 342.00
    expect(splitResult.singleVendorBenchmarkCost).toBe(342.00);

    // Flour should be routed to Sysco @ 23.50 (6 * 23.50 = 141.00)
    // Oil should be routed to Dennis @ 60.00 (3 * 60.00 = 180.00)
    // Total split cost = 141.00 + 180.00 = 321.00
    expect(splitResult.totalSplitCost).toBe(321.00);

    // Projected savings: 342.00 - 321.00 = 21.00
    expect(splitResult.projectedSavings).toBe(21.00);

    expect(splitResult.ordersByVendor.has('sysco')).toBe(true);
    expect(splitResult.ordersByVendor.has('dennis')).toBe(true);

    const syscoOrder = splitResult.ordersByVendor.get('sysco')!;
    expect(syscoOrder.lines.length).toBe(1);
    expect(syscoOrder.lines[0]?.itemName).toBe('All Purpose Flour 50lb');
    expect(syscoOrder.vendorTotalCost).toBe(141.00);

    const dennisOrder = splitResult.ordersByVendor.get('dennis')!;
    expect(dennisOrder.lines.length).toBe(1);
    expect(dennisOrder.lines[0]?.itemName).toBe('Olive Oil Extra Virgin 4x3L');
    expect(dennisOrder.vendorTotalCost).toBe(180.00);
  });

  it('4. parses broadline Dennis / Sysco CSV catalog with fuzzy header detection', () => {
    const sampleCsv = `
Item Number,Description,Brand,Pack / Size,UOM,Category,Price,Par Level,Current On Hand
DNS-1001,"Peaches Diced in 100% Juice, Premium",Dennis Select,6/#10 cans,case,Canned Fruits,$48.50,6,2
DNS-1002,Orange Juice Thickened Nectar,Thick & Easy,12/32oz,case,Thickened Beverages,32.75,4,1
DNS-1003,Pureed Green Beans,Puree Supreme,24/4oz,case,Pureed Foods,29.90,5,3
`;

    const parsed = parseBroadlineCatalogCsv(sampleCsv);
    expect(parsed.length).toBe(3);

    const item1 = parsed[0]!;
    expect(item1.vendorSku).toBe('DNS-1001');
    expect(item1.name).toBe('Peaches Diced in 100% Juice, Premium');
    expect(item1.brand).toBe('Dennis Select');
    expect(item1.packSize).toBe('6/#10 cans');
    expect(item1.uom).toBe('case');
    expect(item1.category).toBe('Canned Fruits');
    expect(item1.unitCost).toBe(48.50);
    expect(item1.parLevel).toBe(6);
    expect(item1.onHand).toBe(2);

    const item2 = parsed[1]!;
    expect(item2.vendorSku).toBe('DNS-1002');
    expect(item2.unitCost).toBe(32.75);
    expect(item2.parLevel).toBe(4);
    expect(item2.onHand).toBe(1);
  });

  it('5. throws an error when required SKU or Name columns are missing in CSV', () => {
    const invalidCsv = `
Category,Pack,Price
Produce,Case,$20.00
`;
    expect(() => parseBroadlineCatalogCsv(invalidCsv)).toThrow(
      'Could not find required "SKU/Item #"'
    );
  });
});
