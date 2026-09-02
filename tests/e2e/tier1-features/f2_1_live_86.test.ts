// ============================================================
// Tier 1 — F2.1: Live 86 Countdowns (Granular Feature Tests)
// Covers: Real-time portion decrement, automatic 86 status lock at 0,
// preventing order submission on 86'd items, and event notification.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface CountdownItem {
  id: string;
  name: string;
  status: 'available' | '86d';
  countRemaining: number | null; // null = unconstrained
  autoLockAtZero: boolean;
}

export function decrementLive86(
  item: CountdownItem,
  quantitySold: number
): { updatedItem: CountdownItem; statusChangedTo86: boolean; error?: string } {
  if (item.status === '86d' || (item.countRemaining !== null && item.countRemaining <= 0)) {
    return {
      updatedItem: { ...item, status: '86d', countRemaining: 0 },
      statusChangedTo86: false,
      error: `Item "${item.name}" is 86'd and unavailable`,
    };
  }

  if (item.countRemaining === null) {
    return { updatedItem: item, statusChangedTo86: false };
  }

  if (quantitySold > item.countRemaining) {
    return {
      updatedItem: item,
      statusChangedTo86: false,
      error: `Insufficient portion stock for "${item.name}". Requested ${quantitySold}, only ${item.countRemaining} remaining`,
    };
  }

  const remaining = item.countRemaining - quantitySold;
  const isNow86 = remaining === 0 && item.autoLockAtZero;

  const updated: CountdownItem = {
    ...item,
    countRemaining: remaining,
    status: isNow86 ? '86d' : item.status,
  };

  return {
    updatedItem: updated,
    statusChangedTo86: isNow86,
  };
}

describe('F2.1 Live 86 Countdowns — Tier 1 Isolation', () => {
  const specialCatch: CountdownItem = {
    id: 'item-halibut',
    name: 'Alaskan Halibut Special',
    status: 'available',
    countRemaining: 3,
    autoLockAtZero: true,
  };

  it('1. decrements portion count on successful order placement', () => {
    const { updatedItem, statusChangedTo86, error } = decrementLive86(specialCatch, 1);
    expect(error).toBeUndefined();
    expect(updatedItem.countRemaining).toBe(2);
    expect(updatedItem.status).toBe('available');
    expect(statusChangedTo86).toBe(false);
  });

  it('2. transitions item status to 86d automatically when remaining reaches exactly 0', () => {
    const itemWithOneLeft: CountdownItem = { ...specialCatch, countRemaining: 1 };
    const { updatedItem, statusChangedTo86, error } = decrementLive86(itemWithOneLeft, 1);
    expect(error).toBeUndefined();
    expect(updatedItem.countRemaining).toBe(0);
    expect(updatedItem.status).toBe('86d');
    expect(statusChangedTo86).toBe(true);
  });

  it('3. rejects orders requesting more portions than current available countdown', () => {
    const itemWithTwoLeft: CountdownItem = { ...specialCatch, countRemaining: 2 };
    const { updatedItem, error } = decrementLive86(itemWithTwoLeft, 5);
    expect(error).toContain('Insufficient portion stock');
    expect(updatedItem.countRemaining).toBe(2);
  });

  it('4. blocks new orders when item status is already 86d', () => {
    const soldOutItem: CountdownItem = { ...specialCatch, countRemaining: 0, status: '86d' };
    const { error } = decrementLive86(soldOutItem, 1);
    expect(error).toContain("is 86'd and unavailable");
  });

  it('5. handles unconstrained items (countRemaining = null) without status change', () => {
    const unconstrainedItem: CountdownItem = {
      id: 'item-soda',
      name: 'Draft Soda',
      status: 'available',
      countRemaining: null,
      autoLockAtZero: false,
    };
    const { updatedItem, statusChangedTo86, error } = decrementLive86(unconstrainedItem, 10);
    expect(error).toBeUndefined();
    expect(updatedItem.countRemaining).toBeNull();
    expect(updatedItem.status).toBe('available');
    expect(statusChangedTo86).toBe(false);
  });
});
