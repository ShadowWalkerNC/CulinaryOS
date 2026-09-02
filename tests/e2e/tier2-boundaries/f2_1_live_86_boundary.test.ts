// ============================================================
// Tier 2 — F2.1: Live 86 Countdowns (Boundary & Corner Cases)
// Covers: 0 initial portion count, ordering exact total remaining count,
// 0 quantity orders, negative count protection, and unconstrained inventory.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  decrementLive86,
  type CountdownItem,
} from '../tier1-features/f2_1_live_86.test.js';

describe('F2.1 Live 86 Countdowns — Tier 2 Boundaries', () => {
  it('1. transitions to 86d when single bulk order buys 100% of remaining stock', () => {
    const item: CountdownItem = {
      id: 'item-duck',
      name: 'Peking Duck',
      status: 'available',
      countRemaining: 5,
      autoLockAtZero: true,
    };
    const { updatedItem, statusChangedTo86, error } = decrementLive86(item, 5);
    expect(error).toBeUndefined();
    expect(updatedItem.countRemaining).toBe(0);
    expect(updatedItem.status).toBe('86d');
    expect(statusChangedTo86).toBe(true);
  });

  it('2. handles 0 quantity sold without count mutation or status change', () => {
    const item: CountdownItem = {
      id: 'item-soup',
      name: 'Lobster Bisque',
      status: 'available',
      countRemaining: 10,
      autoLockAtZero: true,
    };
    const { updatedItem, statusChangedTo86, error } = decrementLive86(item, 0);
    expect(error).toBeUndefined();
    expect(updatedItem.countRemaining).toBe(10);
    expect(statusChangedTo86).toBe(false);
  });

  it('3. rejects orders when countRemaining is already 0', () => {
    const zeroStockItem: CountdownItem = {
      id: 'item-truffle',
      name: 'White Truffle Pasta',
      status: 'available',
      countRemaining: 0,
      autoLockAtZero: true,
    };
    const { updatedItem, error } = decrementLive86(zeroStockItem, 1);
    expect(error).toContain("is 86'd and unavailable");
    expect(updatedItem.status).toBe('86d');
  });

  it('4. prevents negative countRemaining values from persisting', () => {
    const item: CountdownItem = {
      id: 'item-ribs',
      name: 'Prime Rib',
      status: 'available',
      countRemaining: 2,
      autoLockAtZero: true,
    };
    const { error } = decrementLive86(item, 3); // request 3, have 2
    expect(error).toContain('Insufficient portion stock');
  });

  it('5. preserves available status at 0 count when autoLockAtZero is false (unlocked warning mode)', () => {
    const unlockedItem: CountdownItem = {
      id: 'item-unlocked',
      name: 'House Coffee',
      status: 'available',
      countRemaining: 1,
      autoLockAtZero: false,
    };
    const { updatedItem, statusChangedTo86 } = decrementLive86(unlockedItem, 1);
    expect(updatedItem.countRemaining).toBe(0);
    expect(updatedItem.status).toBe('available');
    expect(statusChangedTo86).toBe(false);
  });
});
