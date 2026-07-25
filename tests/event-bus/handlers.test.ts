// ============================================================
// Tests: Event Bus Handlers — logic isolation
// ============================================================

import { describe, it, expect, mock } from 'bun:test';

// ---- Helpers ----

function makeSupabase(overrides: Record<string, any> = {}) {
  const base = {
    from: (table: string) => ({
      select: () => ({
        eq:     () => ({ data: [], error: null }),
        in:     () => ({ data: [], error: null }),
        not:    () => ({ error: null }),
        single: () => ({ data: null, error: null }),
      }),
      insert: () => ({ error: null }),
      update: () => ({
        eq:   () => ({ error: null }),
        neq:  () => ({ error: null }),
        not:  () => ({ error: null }),
        single: () => ({ data: {}, error: null }),
      }),
    }),
    ...overrides,
  };
  return base as any;
}

function makeEvent<T>(eventType: string, payload: T) {
  return {
    eventId:   crypto.randomUUID(),
    eventType,
    tenantId:  'tenant-test',
    source:    'test',
    timestamp: new Date().toISOString(),
    version:   1,
    payload,
  } as any;
}

// ---- kds-ticket-bumped ----

describe('handleTicketBumped', () => {
  it('marks order ready when all tickets are bumped', async () => {
    const updated: string[] = [];
    const sb = makeSupabase({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                data: [
                  { id: 't1', status: 'bumped' },
                  { id: 't2', status: 'bumped' },
                ],
                error: null,
              }),
            }),
          }),
        }),
        update: (vals: any) => ({
          eq: () => ({
            eq: () => {
              updated.push(vals.status);
              return { error: null };
            },
          }),
        }),
      }),
    });

    const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');
    await handleTicketBumped(
      makeEvent('kds:ticket:bumped', { ticketId: 't1', orderId: 'ord-1', station: 'grill', bumpedAt: new Date().toISOString(), cookTimeSeconds: 300 }),
      sb
    );

    expect(updated).toContain('ready');
  });

  it('marks order in-progress when only some tickets bumped', async () => {
    const updated: string[] = [];
    const sb = makeSupabase({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                data: [
                  { id: 't1', status: 'bumped' },
                  { id: 't2', status: 'cooking' },
                ],
                error: null,
              }),
            }),
          }),
        }),
        update: (vals: any) => ({
          eq: () => ({
            eq: () => {
              updated.push(vals.status);
              return { error: null };
            },
          }),
        }),
      }),
    });

    const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');
    await handleTicketBumped(
      makeEvent('kds:ticket:bumped', { ticketId: 't1', orderId: 'ord-1', station: 'grill', bumpedAt: new Date().toISOString(), cookTimeSeconds: 180 }),
      sb
    );

    expect(updated).toContain('in-progress');
  });

  it('does nothing when no tickets returned', async () => {
    const updated: string[] = [];
    const sb = makeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({ data: [], error: null }),
            }),
          }),
        }),
        update: (vals: any) => ({ eq: () => ({ eq: () => { updated.push(vals.status); return { error: null }; } }) }),
      }),
    });

    const { handleTicketBumped } = await import('../../packages/event-bus/src/handlers/kds-ticket-bumped');
    await handleTicketBumped(
      makeEvent('kds:ticket:bumped', { ticketId: 't1', orderId: 'ord-1', station: 'grill', bumpedAt: new Date().toISOString(), cookTimeSeconds: 0 }),
      sb
    );

    expect(updated).toHaveLength(0);
  });
});

// ---- pos-order-cancelled ----

describe('handleOrderCancelled', () => {
  it('voids active tickets for the cancelled order', async () => {
    let updatedStatus: string | null = null;
    const sb = makeSupabase({
      from: () => ({
        update: (vals: any) => ({
          eq: () => ({
            eq: () => ({
              not: () => {
                updatedStatus = vals.status;
                return { error: null };
              },
            }),
          }),
        }),
      }),
    });

    const { handleOrderCancelled } = await import('../../packages/event-bus/src/handlers/pos-order-cancelled');
    await handleOrderCancelled(
      makeEvent('pos:order:cancelled', { orderId: 'ord-x', reason: 'Customer left' }),
      sb
    );

    expect(updatedStatus).toBe('voided');
  });
});
