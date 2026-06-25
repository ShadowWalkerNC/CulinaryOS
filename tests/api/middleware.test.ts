// ============================================================
// Tests: Shared middleware helpers
// ============================================================

import { describe, it, expect } from 'bun:test';

// ---- Unit: event envelope validation ----

describe('isValidEvent', () => {
  function isValidEvent(raw: unknown): boolean {
    if (typeof raw !== 'object' || raw === null) return false;
    const e = raw as Record<string, unknown>;
    return (
      typeof e.eventId    === 'string' &&
      typeof e.eventType  === 'string' &&
      typeof e.tenantId   === 'string' &&
      typeof e.source     === 'string' &&
      typeof e.timestamp  === 'string' &&
      typeof e.version    === 'number' &&
      e.payload !== undefined
    );
  }

  it('validates a correct envelope', () => {
    expect(isValidEvent({
      eventId: 'e1', eventType: 'pos:order:created', tenantId: 't1',
      source: 'pos', timestamp: new Date().toISOString(), version: 1, payload: {},
    })).toBe(true);
  });

  it('rejects missing eventId', () => {
    expect(isValidEvent({
      eventType: 'pos:order:created', tenantId: 't1',
      source: 'pos', timestamp: new Date().toISOString(), version: 1, payload: {},
    })).toBe(false);
  });

  it('rejects numeric version as string', () => {
    expect(isValidEvent({
      eventId: 'e1', eventType: 'x', tenantId: 't1',
      source: 'x', timestamp: 'x', version: '1', payload: {},
    })).toBe(false);
  });

  it('rejects null', ()      => expect(isValidEvent(null)).toBe(false));
  it('rejects string', ()    => expect(isValidEvent('oops')).toBe(false));
  it('rejects undefined', () => expect(isValidEvent(undefined)).toBe(false));
  it('rejects array', ()     => expect(isValidEvent([])).toBe(false));

  it('allows payload = false (falsy but defined)', () => {
    expect(isValidEvent({
      eventId: 'e1', eventType: 'x', tenantId: 't1',
      source: 'x', timestamp: 'x', version: 1, payload: false,
    })).toBe(true);
  });
});

// ---- Unit: ok/err response shape ----

describe('response envelope shape', () => {
  function ok<T>(data: T, requestId = 'req-1') {
    return { ok: true, requestId, timestamp: new Date().toISOString(), service: 'test', data };
  }

  function err(code: string, message: string, requestId = 'req-1') {
    return { ok: false, requestId, timestamp: new Date().toISOString(), service: 'test', error: { code, message } };
  }

  it('ok response has expected shape', () => {
    const res = ok({ id: 1 });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ id: 1 });
    expect(typeof res.timestamp).toBe('string');
  });

  it('err response has expected shape', () => {
    const res = err('NOT_FOUND', 'Order not found');
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe('NOT_FOUND');
    expect(res.error.message).toBe('Order not found');
  });
});
