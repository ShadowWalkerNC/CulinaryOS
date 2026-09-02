import { describe, it, expect } from 'vitest';
import {
  calculateStoreReplenishmentOrder,
  aggregateCommissaryProduction,
  generateCommissaryLotCode,
  calculateFranchiseRoyaltyLedger,
} from '../../packages/commissary-engine/src/index.js';

describe('Commissary Engine & Multi-Unit Distribution', () => {
  describe('Store Replenishment Order Calculation', () => {
    it('calculates replenishment requests based on store par levels and reorder multiples', () => {
      const items = [
        { ingredientId: 'ing-1', name: 'Brioche Buns', unit: 'packs', currentStock: 8, parLevel: 20, reorderMultiple: 6 },
        { ingredientId: 'ing-2', name: 'San Marzano Sauce', unit: 'kg', currentStock: 25, parLevel: 20 }, // Sufficient, should not reorder
        { ingredientId: 'ing-3', name: 'Ground Dry-Aged Beef', unit: 'kg', currentStock: 12, parLevel: 30, reorderMultiple: 5 },
      ];

      const order = calculateStoreReplenishmentOrder('loc-01', 'Downtown Flagship', items);
      expect(order.items.length).toBe(2);

      // Deficit = 12, multiple 6 -> 12
      const buns = order.items.find(i => i.ingredientId === 'ing-1');
      expect(buns?.quantityRequested).toBe(12);

      // Deficit = 18, multiple 5 -> rounded up to 20
      const beef = order.items.find(i => i.ingredientId === 'ing-3');
      expect(beef?.quantityRequested).toBe(20);
    });
  });

  describe('Central Production Batch Aggregation', () => {
    it('aggregates multi-store replenishment requests into central batch production quotas', () => {
      const store1 = {
        storeId: 'loc-01',
        storeName: 'Downtown Flagship',
        items: [
          { ingredientId: 'sauce-01', name: 'Pizza Sauce Base', unit: 'kg', quantityRequested: 50, currentStoreStock: 10, parLevel: 60 },
          { ingredientId: 'beef-01', name: 'Dry-Aged Patties', unit: 'kg', quantityRequested: 40, currentStoreStock: 5, parLevel: 45 },
        ],
      };

      const store2 = {
        storeId: 'loc-02',
        storeName: 'Airport Express',
        items: [
          { ingredientId: 'sauce-01', name: 'Pizza Sauce Base', unit: 'kg', quantityRequested: 80, currentStoreStock: 20, parLevel: 100 },
          { ingredientId: 'fries-01', name: 'Hand-Cut Fries', unit: 'kg', quantityRequested: 100, currentStoreStock: 10, parLevel: 110 },
        ],
      };

      const batches = aggregateCommissaryProduction([store1, store2]);
      expect(batches.length).toBe(3);

      const sauceBatch = batches.find(b => b.ingredientId === 'sauce-01');
      expect(sauceBatch?.totalQuantityRequired).toBe(130);
      expect(sauceBatch?.breakdownByStore.length).toBe(2);
    });
  });

  describe('Batch Lot Code Generation', () => {
    it('generates structured ISO lot tracking codes with date and product prefix', () => {
      const lotCode = generateCommissaryLotCode('Truffle Aioli', new Date('2026-09-02'));
      expect(lotCode).toMatch(/^LOT-20260902-TRUF-[A-Z0-9]{4}$/);
    });
  });

  describe('Franchise Royalty Consolidated Ledger', () => {
    it('computes brand-wide franchise royalty fees based on store gross revenue', () => {
      const ledger = calculateFranchiseRoyaltyLedger({
        organizationId: 'org-golden-fork',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        defaultRoyaltyRatePercent: 5.0,
        stores: [
          { storeId: 'loc-01', storeName: 'Flagship', grossSalesCents: 10000000 }, // $100,000 -> $5,000
          { storeId: 'loc-02', storeName: 'Bistro', grossSalesCents: 5000000, royaltyRatePercent: 4.0 }, // $50,000 -> $2,000
        ],
      });

      expect(ledger.totalGrossSalesCents).toBe(15000000);
      expect(ledger.totalRoyaltyDueCents).toBe(700000);
      expect(ledger.stores[0]?.royaltyDueCents).toBe(500000);
      expect(ledger.stores[1]?.royaltyDueCents).toBe(200000);
    });
  });
});
