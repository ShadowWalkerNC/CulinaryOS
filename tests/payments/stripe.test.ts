import { describe, it, expect } from 'bun:test';

// ─── Charge amount + tip calculation ──────────────────────────────────────────
describe('Charge amount and tip calculation', () => {
  function tipCents(totalCents: number, pct: number): number {
    return Math.round(totalCents * pct / 100);
  }
  function chargeCents(total: number, tip: number): number {
    return total + tip;
  }

  it('20% tip on $50 order',       () => expect(tipCents(5000, 20)).toBe(1000));
  it('15% tip on $33.33 order',    () => expect(tipCents(3333, 15)).toBe(500));
  it('0% tip is zero',             () => expect(tipCents(5000, 0)).toBe(0));
  it('charge includes tip',        () => expect(chargeCents(5000, 1000)).toBe(6000));
  it('charge with no tip = order', () => expect(chargeCents(5000, 0)).toBe(5000));
  it('tip rounds to nearest cent', () => expect(tipCents(3333, 18)).toBe(600));
});

// ─── Payment status state machine ─────────────────────────────────────────────
describe('Payment status state machine', () => {
  const VALID: Record<string, string[]> = {
    pending:   ['completed', 'failed'],
    completed: ['refunded'],
    failed:    [],
    refunded:  [],
  };
  function can(from: string, to: string): boolean {
    return VALID[from]?.includes(to) ?? false;
  }

  it('pending → completed',           () => expect(can('pending',   'completed')).toBe(true));
  it('pending → failed',              () => expect(can('pending',   'failed')).toBe(true));
  it('completed → refunded',          () => expect(can('completed', 'refunded')).toBe(true));
  it('cannot refund a failed payment',() => expect(can('failed',    'refunded')).toBe(false));
  it('refunded is terminal',          () => expect(can('refunded',  'completed')).toBe(false));
  it('cannot skip to refunded',       () => expect(can('pending',   'refunded')).toBe(false));
});

// ─── Order closure on payment capture ─────────────────────────────────────────
describe('Order closure on payment capture', () => {
  type OrderStatus = 'open' | 'sent' | 'in-progress' | 'ready' | 'served' | 'paid' | 'voided';
  function closeOrder(status: OrderStatus): { newStatus: OrderStatus; closeable: boolean } {
    const closeable = !['paid', 'voided'].includes(status);
    return { newStatus: closeable ? 'paid' : status, closeable };
  }

  it('open order can be paid',         () => expect(closeOrder('open').closeable).toBe(true));
  it('served order can be paid',       () => expect(closeOrder('served').closeable).toBe(true));
  it('paid order is not re-closeable', () => expect(closeOrder('paid').closeable).toBe(false));
  it('voided order is not closeable',  () => expect(closeOrder('voided').closeable).toBe(false));
});

// ─── Refund amount validation ──────────────────────────────────────────────────
describe('Refund amount validation', () => {
  function validateRefund(refundCents: number, originalCents: number): string | null {
    if (refundCents <= 0)             return 'Refund must be > 0';
    if (refundCents > originalCents)  return 'Refund exceeds original amount';
    return null;
  }

  it('full refund is valid',    () => expect(validateRefund(5000, 5000)).toBeNull());
  it('partial refund is valid', () => expect(validateRefund(2500, 5000)).toBeNull());
  it('over-refund is invalid',  () => expect(validateRefund(6000, 5000)).not.toBeNull());
  it('zero refund is invalid',  () => expect(validateRefund(0,    5000)).not.toBeNull());
});
