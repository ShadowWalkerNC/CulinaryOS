import { describe, it, expect } from 'bun:test';

// ─── Cart total calculation ─────────────────────────────────────────────────────
describe('Cart total calculation', () => {
  interface CartItem { unit_price: number; quantity: number; }

  function cartTotal(items: CartItem[]): number {
    return items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  }
  function cartCount(items: CartItem[]): number {
    return items.reduce((s, i) => s + i.quantity, 0);
  }

  it('single item total',                 () => expect(cartTotal([{ unit_price: 1200, quantity: 1 }])).toBe(1200));
  it('multiple items',                    () => expect(cartTotal([{ unit_price: 1200, quantity: 2 }, { unit_price: 800, quantity: 1 }])).toBe(3200));
  it('empty cart is 0',                   () => expect(cartTotal([])).toBe(0));
  it('item count sums quantities',        () => expect(cartCount([{ unit_price: 500, quantity: 3 }, { unit_price: 200, quantity: 2 }])).toBe(5));
});

// ─── Modifier price adjustment ──────────────────────────────────────────────────
describe('Modifier price adjustment', () => {
  interface Mod { price_adjustment: number; }

  function effectivePrice(basePrice: number, mods: Mod[]): number {
    return basePrice + mods.reduce((s, m) => s + m.price_adjustment, 0);
  }

  it('adds positive modifier',            () => expect(effectivePrice(1000, [{ price_adjustment: 200 }])).toBe(1200));
  it('subtracts negative modifier',       () => expect(effectivePrice(1000, [{ price_adjustment: -100 }])).toBe(900));
  it('no modifiers returns base price',   () => expect(effectivePrice(1000, [])).toBe(1000));
  it('multiple modifiers stack',          () => expect(effectivePrice(1000, [{ price_adjustment: 100 }, { price_adjustment: 50 }])).toBe(1150));
});

// ─── Menu section filtering ────────────────────────────────────────────────────
describe('Menu section visibility', () => {
  interface Item { status: string; }
  interface Section { menu_items: Item[]; }

  function visibleSections(sections: Section[]): Section[] {
    return sections
      .map((s) => ({ ...s, menu_items: s.menu_items.filter((i) => i.status === 'available') }))
      .filter((s) => s.menu_items.length > 0);
  }

  it('removes 86d items from section', () => {
    const sections = [{ menu_items: [{ status: 'available' }, { status: '86d' }] }];
    expect(visibleSections(sections)[0].menu_items).toHaveLength(1);
  });
  it('hides section if all items unavailable', () => {
    const sections = [{ menu_items: [{ status: '86d' }, { status: 'unavailable' }] }];
    expect(visibleSections(sections)).toHaveLength(0);
  });
  it('keeps sections with all available items', () => {
    const sections = [{ menu_items: [{ status: 'available' }, { status: 'available' }] }];
    expect(visibleSections(sections)).toHaveLength(1);
  });
  it('returns empty array for empty sections input', () => {
    expect(visibleSections([])).toHaveLength(0);
  });
});

// ─── nanoid uniqueness ───────────────────────────────────────────────────────────
describe('Cart item ID uniqueness', () => {
  function simpleId(len: number): string {
    return Array.from({ length: len }, () => Math.random().toString(36)[2] ?? '0').join('');
  }

  it('generates ids of correct length', () => expect(simpleId(12)).toHaveLength(12));
  it('two ids are not equal',           () => expect(simpleId(12)).not.toBe(simpleId(12)));
  it('100 ids are all unique',          () => {
    const ids = Array.from({ length: 100 }, () => simpleId(12));
    expect(new Set(ids).size).toBe(100);
  });
});

// ─── Tableside Dynamic Bill Splitting & Pay-at-Table ────────────────────────────
describe('Tableside Dynamic Bill Splitting', () => {
  interface CheckItem {
    id: string;
    price: number;
    quantity: number;
    seat?: number;
  }

  function computeEqualSplit(items: CheckItem[], guestCount: number) {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const perGuestSubtotal = Math.round(subtotal / Math.max(1, guestCount));
    const tax = Math.round(perGuestSubtotal * 0.1);
    return { perGuestSubtotal, tax, perGuestTotal: perGuestSubtotal + tax };
  }

  function computeSeatSplit(items: CheckItem[], seatNumber: number) {
    const seatItems = items.filter((i) => i.seat === seatNumber);
    const subtotal = seatItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.1);
    return { subtotal, tax, total: subtotal + tax, itemCount: seatItems.length };
  }

  const sampleCheck: CheckItem[] = [
    { id: 'it-1', price: 1200, quantity: 1, seat: 1 },
    { id: 'it-2', price: 2400, quantity: 1, seat: 1 },
    { id: 'it-3', price: 1800, quantity: 1, seat: 2 },
    { id: 'it-4', price: 600, quantity: 2, seat: 2 },
  ];

  it('splits check evenly across N guests with tax', () => {
    // Total subtotal = 1200 + 2400 + 1800 + 1200 = 6600 cents ($66.00)
    const split3 = computeEqualSplit(sampleCheck, 3);
    expect(split3.perGuestSubtotal).toBe(2200); // $22.00
    expect(split3.tax).toBe(220);             // $2.20
    expect(split3.perGuestTotal).toBe(2420);   // $24.20
  });

  it('splits check accurately by seat number', () => {
    // Seat 1: 1200 + 2400 = 3600 cents ($36.00)
    const seat1 = computeSeatSplit(sampleCheck, 1);
    expect(seat1.subtotal).toBe(3600);
    expect(seat1.tax).toBe(360);
    expect(seat1.total).toBe(3960);
    expect(seat1.itemCount).toBe(2);

    // Seat 2: 1800 + 1200 = 3000 cents ($30.00)
    const seat2 = computeSeatSplit(sampleCheck, 2);
    expect(seat2.subtotal).toBe(3000);
    expect(seat2.tax).toBe(300);
    expect(seat2.total).toBe(3300);
  });
});

