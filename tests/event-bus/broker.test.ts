// ============================================================
// Tests: Event Bus Broker
// ============================================================

import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mock supabase client
const insertMock = mock(() => Promise.resolve({ error: null }));
const updateMock = mock(() => Promise.resolve({ error: null }));
const fromMock   = mock((table: string) => ({
  insert: () => ({ error: null }),
  update: () => ({ eq: () => ({ error: null }) }),
}));

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: fromMock,
  }),
}));

import { handleIncomingEvent } from '@culinaryos/event-bus';

const BASE_EVENT = {
  eventId:   'evt-001',
  eventType: 'pos:order:created' as const,
  tenantId:  'tenant-001',
  source:    'pos',
  timestamp: new Date().toISOString(),
  version:   1,
  payload:   {},
};

describe('broker.handleIncomingEvent', () => {
  it('rejects non-object input', async () => {
    const result = await handleIncomingEvent('not-an-object');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid event envelope/i);
  });

  it('rejects event missing required fields', async () => {
    const result = await handleIncomingEvent({ eventId: 'x' });
    expect(result.ok).toBe(false);
  });

  it('rejects null payload', async () => {
    const result = await handleIncomingEvent(null);
    expect(result.ok).toBe(false);
  });

  it('accepts a valid event envelope', async () => {
    const result = await handleIncomingEvent(BASE_EVENT);
    expect(result.ok).toBe(true);
  });

  it('accepts event with nested payload', async () => {
    const result = await handleIncomingEvent({
      ...BASE_EVENT,
      payload: { orderId: 'ord-1', items: [{ name: 'Steak', qty: 1 }] },
    });
    expect(result.ok).toBe(true);
  });
});
