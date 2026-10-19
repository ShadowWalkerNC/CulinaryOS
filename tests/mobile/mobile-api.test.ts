import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loginWithPin,
  fetchLiveOrders,
  fetchLiveMenu,
  fetchLiveInventory,
} from '../../mobile/lib/api.js';

describe('Mobile Companion App & API Client', () => {
  it('authenticates server with PIN 1234 and enforces non-manager role', async () => {
    const auth = await loginWithPin('1234');
    assert.equal(auth.role, 'server');
    assert.equal(auth.name, 'Marcus Vance');
    assert.equal(auth.isManager, false);
    assert.ok(auth.token.length > 0);
  });

  it('authenticates general manager with PIN 5678 and grants elevated role', async () => {
    const auth = await loginWithPin('5678');
    assert.equal(auth.role, 'manager');
    assert.equal(auth.name, 'Elena Rostova (GM)');
    assert.equal(auth.isManager, true);
    assert.ok(auth.token.length > 0);
  });

  it('rejects unrecognized PINs fail-closed', async () => {
    await assert.rejects(async () => {
      await loginWithPin('0000');
    }, /Invalid PIN/);
  });

  it('retrieves live orders with line items in integer cents', async () => {
    const orders = await fetchLiveOrders();
    assert.ok(orders.length >= 2, 'Should return active orders');

    for (const order of orders) {
      assert.ok(order.total_cents > 0, 'Order total must be in positive integer cents');
      assert.ok(order.items.length > 0, 'Order must contain line items');
      assert.ok(Number.isInteger(order.total_cents), 'Total cents must be integer');
    }
  });

  it('retrieves menu catalog with categories and descriptions', async () => {
    const menu = await fetchLiveMenu();
    assert.ok(menu.length >= 5, 'Should return menu items');

    const categories = new Set(menu.map((m) => m.category));
    assert.ok(categories.has('Starters'));
    assert.ok(categories.has('Mains'));
    assert.ok(categories.has('Beverages'));
  });

  it('retrieves pantry inventory and flags items below par level', async () => {
    const inventory = await fetchLiveInventory();
    assert.ok(inventory.length >= 4, 'Should return inventory items');

    const lowStockItems = inventory.filter((i) => i.is_low_stock);
    assert.ok(lowStockItems.length > 0, 'Should detect low stock items');

    for (const item of lowStockItems) {
      assert.ok(item.quantity <= item.par_level, 'Low stock item must be at or below par level');
    }
  });
});
