import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateStoreReplenishmentOrder, aggregateCommissaryProduction } from './index.js';

describe('Commissary Engine: Store Replenishment and Central Aggregation', () => {
  it('calculates deficit against par levels with reorder multiples', () => {
    const order = calculateStoreReplenishmentOrder('store-downtown', 'Downtown Branch', [
      { ingredientId: 'marinara', name: 'Marinara Sauce', unit: 'qt', currentStock: 4, parLevel: 10, reorderMultiple: 2 }, // deficit 6 -> 6
      { ingredientId: 'pesto', name: 'Basil Pesto', unit: 'qt', currentStock: 7, parLevel: 10, reorderMultiple: 5 },       // deficit 3 -> 5
      { ingredientId: 'parm', name: 'Parmigiano Reggiano', unit: 'lb', currentStock: 15, parLevel: 10 },                    // surplus -> 0
    ]);

    assert.equal(order.items.length, 2);
    assert.equal(order.items[0]?.ingredientId, 'marinara');
    assert.equal(order.items[0]?.quantityRequested, 6);
    assert.equal(order.items[1]?.ingredientId, 'pesto');
    assert.equal(order.items[1]?.quantityRequested, 5);
  });

  it('aggregates multi-store replenishment into central commissary production quotas', () => {
    const store1 = calculateStoreReplenishmentOrder('store-1', 'Store 1', [
      { ingredientId: 'marinara', name: 'Marinara Sauce', unit: 'qt', currentStock: 2, parLevel: 10 }, // 8
    ]);
    const store2 = calculateStoreReplenishmentOrder('store-2', 'Store 2', [
      { ingredientId: 'marinara', name: 'Marinara Sauce', unit: 'qt', currentStock: 5, parLevel: 10 }, // 5
    ]);

    const batch = aggregateCommissaryProduction([store1, store2]);

    assert.equal(batch.length, 1);
    assert.equal(batch[0]?.ingredientId, 'marinara');
    assert.equal(batch[0]?.totalQuantityRequired, 13);
    assert.equal(batch[0]?.breakdownByStore.length, 2);
  });
});
