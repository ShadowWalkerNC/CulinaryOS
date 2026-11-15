import { DomainError, integer, text, uuid } from './domain.js';
import { KDS_ACTIVE_STATUSES, resolveDbStations } from '@culinaryos/shared';
import type { NativeExecutor } from './executor.js';
import { getOrder, listLineItems, type LineItemRow } from './orders.js';
import { claimReceipt, finalizeReceipt, operationKey, requestFingerprint } from './receipts.js';

export async function listKitchenTickets(
  tx: NativeExecutor,
  tenantId: string,
  station?: string,
  status?: string,
) {
  const stations = station && station !== 'all' && station !== 'expo' ? resolveDbStations(station) : null;
  if (stations !== null && !Array.isArray(stations)) return [];
  const { rows } = await tx.query(
    `SELECT t.*, COALESCE((
       SELECT jsonb_agg(i ORDER BY i.sort_order, i.id)
       FROM public.ticket_items i WHERE i.tenant_id = t.tenant_id AND i.ticket_id = t.id
     ), '[]'::jsonb) AS ticket_items
     FROM public.kitchen_tickets t
     WHERE t.tenant_id = $1 AND t.status = ANY($2::text[])
       AND ($3::text[] IS NULL OR t.station = ANY($3::text[]))
     ORDER BY t.fired_at ASC NULLS LAST, t.created_at ASC, t.id ASC`,
    [tenantId, status ? [status] : [...KDS_ACTIVE_STATUSES], stations],
  );
  return rows;
}

export interface OrderCreatedItem {
  lineItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  station: string;
  courseNumber: number;
  modifiers: string[];
  notes: string | null;
  recipeId?: string;
}

export interface OrderCreatedEvent {
  eventId: string;
  eventType: 'pos:order:created';
  tenantId: string;
  source: string;
  timestamp: string;
  version: number;
  payload: {
    orderId: string;
    orderNumber?: number;
    tableNumber?: string;
    serverName?: string;
    createdAt: string;
    items: OrderCreatedItem[];
  };
}

export interface KitchenTicketRow {
  id: string;
  tenant_id: string;
  order_id: string;
  order_number: number;
  station: string;
  status: string;
  priority: string;
  table_number: string | null;
  course_number: number;
  course_hold_status: string;
  held_at: string | null;
  fired_at: string | null;
  bumped_at: string | null;
}

function initialCourseState(courseNumber: number): { status: string; hold: string } {
  const fired = courseNumber <= 1;
  return { status: fired ? 'fired' : 'queued', hold: fired ? 'fired' : 'held' };
}

async function lineModifiers(tx: NativeExecutor, tenantId: string, lineItemIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (lineItemIds.length === 0) return map;
  const result = await tx.query<{ line_item_id: string; name: string }>(
    'SELECT line_item_id, name FROM public.line_item_modifiers WHERE tenant_id = $1 AND line_item_id = ANY($2::uuid[]) ORDER BY name',
    [tenantId, lineItemIds],
  );
  for (const row of result.rows) {
    const list = map.get(row.line_item_id) ?? [];
    list.push(row.name);
    map.set(row.line_item_id, list);
  }
  return map;
}

function groupByStationAndCourse(items: OrderCreatedItem[]): Map<string, OrderCreatedItem[]> {
  const map = new Map<string, OrderCreatedItem[]>();
  for (const item of items) {
    const key = `${item.station}::${item.courseNumber ?? 1}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

export function buildOrderCreatedEvent(input: {
  eventId: string;
  tenantId: string;
  orderId: string;
  orderNumber?: number;
  tableNumber?: string | null;
  serverName?: string | null;
  createdAt: string;
  items: OrderCreatedItem[];
}): OrderCreatedEvent {
  return {
    eventId: uuid(input.eventId, 'event'),
    eventType: 'pos:order:created',
    tenantId: uuid(input.tenantId, 'tenant'),
    source: 'pos',
    timestamp: new Date().toISOString(),
    version: 1,
    payload: {
      orderId: uuid(input.orderId, 'order'),
      ...(input.orderNumber !== undefined ? { orderNumber: input.orderNumber } : {}),
      ...(input.tableNumber ? { tableNumber: input.tableNumber } : {}),
      ...(input.serverName ? { serverName: input.serverName } : {}),
      createdAt: input.createdAt,
      items: input.items,
    },
  };
}

async function toEventItems(
  tx: NativeExecutor,
  tenantId: string,
  items: LineItemRow[],
): Promise<OrderCreatedItem[]> {
  const active = items.filter((item) => !item.is_voided);
  const modifiers = await lineModifiers(tx, tenantId, active.map((item) => item.id));
  return active.map((item) => ({
    lineItemId: item.id,
    menuItemId: item.menu_item_id,
    name: item.name,
    quantity: item.quantity,
    station: item.station,
    courseNumber: item.course_number,
    modifiers: modifiers.get(item.id) ?? [],
    notes: item.notes,
    ...(item.recipe_id ? { recipeId: item.recipe_id } : {}),
  }));
}

/**
 * Committed send with transactional outbox and deduped kitchen effects.
 * Same operation ID + same payload replays the stored result; same ID +
 * different payload is a 409 conflict. All writes commit atomically.
 */
export async function sendOrderToKitchen(
  tx: NativeExecutor,
  tenantId: string,
  orderId: string,
  operationId: string,
  input?: { eventId?: string },
): Promise<{ event: OrderCreatedEvent; tickets: KitchenTicketRow[]; replayed: boolean }> {
  const orderUuid = uuid(orderId, 'order');
  const key = operationKey(operationId);
  const locked = await tx.query<{ id: string }>(
    'SELECT id FROM public.pos_orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
    [tenantId, orderUuid],
  );
  if (!locked.rows[0]) throw new DomainError('NOT_FOUND', 'Order not found', 404);
  const order = await getOrder(tx, tenantId, orderUuid);
  const lines = await listLineItems(tx, tenantId, orderUuid);
  const eventItems = await toEventItems(tx, tenantId, lines);
  if (eventItems.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'Order has no active items to send', 422);
  }
  const payloadForHash = {
    orderId: orderUuid,
    items: eventItems.map((item) => ({
      lineItemId: item.lineItemId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      station: item.station,
      course: item.courseNumber,
    })),
  };
  const hash = requestFingerprint(payloadForHash);
  const claim = await claimReceipt(tx, tenantId, key, hash);
  if (!claim.owned) {
    const prior = claim.receipt.result as { event?: OrderCreatedEvent; tickets?: KitchenTicketRow[] };
    if (!prior.event || !Array.isArray(prior.tickets)) {
      throw new DomainError('INTERNAL_ERROR', 'Stored send receipt is incomplete', 500);
    }
    return { event: prior.event, tickets: prior.tickets, replayed: true };
  }
  // New sends are single-shot from open; replays above already returned.
  if (order.status !== 'open') {
    throw new DomainError('CONFLICT', `Order is ${order.status}; send is single-shot from open`, 409);
  }
  const eventId = input?.eventId === undefined ? crypto.randomUUID() : uuid(input.eventId, 'event');
  const event = buildOrderCreatedEvent({
    eventId,
    tenantId,
    orderId: orderUuid,
    ...(order.order_number !== undefined && order.order_number !== null ? { orderNumber: order.order_number } : {}),
    tableNumber: order.table_number,
    serverName: order.server_name,
    createdAt: order.created_at,
    items: eventItems,
  });
  try {
    await tx.query(
      `INSERT INTO public.domain_events (event_id, event_type, tenant_id, source, version, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [event.eventId, event.eventType, tenantId, event.source, event.version, JSON.stringify(event)],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('duplicate') || message.includes('unique')) {
      throw new DomainError('CONFLICT', 'Send event was already recorded', 409);
    }
    throw error;
  }
  const groups = groupByStationAndCourse(eventItems);
  const tickets: KitchenTicketRow[] = [];
  const now = new Date().toISOString();
  const orderNumber = order.order_number ?? Math.floor(Date.now() % 100000);
  for (const [groupKey, groupItems] of groups.entries()) {
    const [stationName, courseRaw] = groupKey.split('::');
    const courseNumber = integer(Number(courseRaw || '1'), 'course', 1, 25);
    if (!stationName) throw new DomainError('VALIDATION_ERROR', 'Ticket station is required', 422);
    const hasAllergy = groupItems.some((item) => item.modifiers.some((mod) => /allerg/i.test(mod)));
    const state = initialCourseState(courseNumber);
    const fired = state.hold === 'fired';
    const ticketId = crypto.randomUUID();
    const inserted = await tx.query<KitchenTicketRow>(
      `INSERT INTO public.kitchen_tickets
        (id, tenant_id, order_id, order_number, station, status, course_hold_status, priority, table_number, course_number, fired_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        ticketId, tenantId, orderUuid, orderNumber, stationName, state.status, state.hold,
        hasAllergy ? 'allergy' : 'normal', order.table_number, courseNumber, fired ? now : null,
      ],
    );
    const ticket = inserted.rows[0];
    if (!ticket) throw new DomainError('INTERNAL_ERROR', 'Ticket insert failed', 500);
    tickets.push(ticket);
    let sort = 0;
    for (const item of groupItems) {
      await tx.query(
        `INSERT INTO public.ticket_items (tenant_id, ticket_id, line_item_id, name, quantity, modifiers, notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tenantId, ticketId, item.lineItemId, item.name, item.quantity, item.modifiers, item.notes, sort],
      );
      sort += 1;
    }
    await tx.query(
      `INSERT INTO public.pending_push (tenant_id, station_id, event_type, payload)
       VALUES ($1, $2, $3, $4)`,
      [
        tenantId, stationName, fired ? 'kds:ticket:fired' : 'kds:ticket:held',
        JSON.stringify({ ticketId, orderId: orderUuid, station: stationName, courseNumber, status: fired ? 'fired' : 'queued' }),
      ],
    );
  }
  await tx.query('UPDATE public.pos_orders SET status = $3, fired_at = $4 WHERE tenant_id = $1 AND id = $2', [
    tenantId, orderUuid, 'sent', now,
  ]);
  await tx.query('UPDATE public.domain_events SET processed = true, processed_at = $4 WHERE tenant_id = $1 AND event_id = $2 AND event_type = $3', [
    tenantId, event.eventId, event.eventType, now,
  ]);
  const result = { event, tickets };
  await finalizeReceipt(tx, tenantId, key, JSON.parse(JSON.stringify(result)) as Record<string, unknown>);
  return { ...result, replayed: false };
}

/** Held course fires exactly once; concurrent repeats replay the first effect. */
export async function fireCourse(
  tx: NativeExecutor,
  tenantId: string,
  orderId: string,
  courseNumber: number,
  operationId: string,
): Promise<{ tickets: KitchenTicketRow[]; replayed: boolean }> {
  const orderUuid = uuid(orderId, 'order');
  const course = integer(courseNumber, 'course', 1, 25);
  const key = operationKey(operationId);
  const hash = requestFingerprint({ orderId: orderUuid, course });
  const claim = await claimReceipt(tx, tenantId, key, hash);
  if (!claim.owned) {
    const prior = claim.receipt.result as { tickets?: KitchenTicketRow[] };
    if (!Array.isArray(prior.tickets)) throw new DomainError('INTERNAL_ERROR', 'Stored fire receipt is incomplete', 500);
    return { tickets: prior.tickets, replayed: true };
  }
  const locked = await tx.query<KitchenTicketRow>(
    `SELECT * FROM public.kitchen_tickets WHERE tenant_id = $1 AND order_id = $2 AND course_number = $3 FOR UPDATE`,
    [tenantId, orderUuid, course],
  );
  if (locked.rows.length === 0) throw new DomainError('NOT_FOUND', 'No tickets for this course', 404);
  const now = new Date().toISOString();
  const fired: KitchenTicketRow[] = [];
  for (const ticket of locked.rows) {
    if (ticket.course_hold_status === 'fired' || ticket.status === 'fired' || ticket.status === 'cooking' || ticket.status === 'bumped') {
      fired.push(ticket);
      continue;
    }
    const updated = await tx.query<KitchenTicketRow>(
      `UPDATE public.kitchen_tickets SET status = 'fired', course_hold_status = 'fired', fired_at = $3
       WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      [tenantId, ticket.id, now],
    );
    const row = updated.rows[0];
    if (row) {
      fired.push(row);
      await tx.query(
        `INSERT INTO public.pending_push (tenant_id, station_id, event_type, payload)
         VALUES ($1, $2, 'kds:ticket:fired', $3)`,
        [tenantId, row.station, JSON.stringify({ ticketId: row.id, orderId: orderUuid, station: row.station, courseNumber: course, status: 'fired' })],
      );
    }
  }
  await finalizeReceipt(tx, tenantId, key, JSON.parse(JSON.stringify({ tickets: fired })) as Record<string, unknown>);
  return { tickets: fired, replayed: false };
}

export type TicketAction = 'bump' | 'hold' | 'fire';

export interface TicketActionResult {
  ticket: KitchenTicketRow;
  replayed: boolean;
  /** True when this bump advanced the order to served (POS-visible completion). */
  orderServed: boolean;
}

const TICKET_ACTIONS = new Set(['bump', 'hold', 'fire']);
const TERMINAL_TICKET_STATUSES = new Set(['bumped', 'voided']);
/** Order statuses that a fully-bumped rail may advance to served; paid/voided never regress. */
const SERVABLE_ORDER_STATUSES = new Set(['sent', 'in-progress', 'ready']);

function storedTicketActionResult(value: unknown): { ticket: KitchenTicketRow; orderServed: boolean } {
  const result = value as { ticket?: KitchenTicketRow; orderServed?: boolean };
  if (!result || typeof result !== 'object' || !result.ticket || typeof result.ticket.id !== 'string') {
    throw new DomainError('INTERNAL_ERROR', 'Stored ticket receipt is incomplete', 500);
  }
  return { ticket: result.ticket, orderServed: result.orderServed === true };
}

/**
 * Native KDS ticket actions consumed by the KDS client
 * (PATCH /v1/kds/tickets/:id/bump|hold|fire) and the CLI.
 *
 * - bump: queued/fired/cooking/recalled -> bumped (bumped_at set). When no
 *   active ticket remains on the order, the order advances to served unless it
 *   is already paid/voided, so POS sees completion. Repeat bumps replay.
 * - hold: marks course_hold_status held (held_at set); bumped/voided tickets
 *   cannot be held. Repeat holds replay.
 * - fire: held/queued -> fired (fired_at set) with a kds:ticket:fired push
 *   event; bumped/voided tickets cannot fire. Repeat fires replay.
 *
 * With operationId the effect is receipt-backed (same ID + same payload replays
 * the stored result; same ID + different payload is a 409). Without one the
 * transition is state-convergent: re-applying an already-satisfied action
 * returns the current ticket with replayed: true and writes nothing.
 */
export async function applyTicketAction(
  tx: NativeExecutor,
  tenantId: string,
  ticketId: string,
  action: string,
  operationId?: string,
): Promise<TicketActionResult> {
  if (!TICKET_ACTIONS.has(action)) {
    throw new DomainError('VALIDATION_ERROR', 'Ticket action must be bump, hold, or fire', 422);
  }
  const id = uuid(ticketId, 'ticket');
  const locked = await tx.query<KitchenTicketRow>(
    'SELECT * FROM public.kitchen_tickets WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
    [tenantId, id],
  );
  const current = locked.rows[0];
  if (!current) throw new DomainError('NOT_FOUND', 'Ticket not found', 404);

  let key: string | null = null;
  if (operationId !== undefined) {
    key = operationKey(operationId);
    const claim = await claimReceipt(tx, tenantId, key, requestFingerprint({ ticketId: id, action }));
    if (!claim.owned) {
      const prior = storedTicketActionResult(claim.receipt.result);
      return { ticket: prior.ticket, replayed: true, orderServed: prior.orderServed };
    }
  }

  const now = new Date().toISOString();
  let ticket = current;
  let replayed = false;
  let orderServed = false;

  if (action === 'bump') {
    if (current.status === 'bumped') {
      replayed = true;
    } else {
      if (TERMINAL_TICKET_STATUSES.has(current.status)) {
        throw new DomainError('CONFLICT', `Ticket is ${current.status}; bump is not available`, 409);
      }
      const updated = await tx.query<KitchenTicketRow>(
        `UPDATE public.kitchen_tickets SET status = 'bumped', bumped_at = $3
         WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id, now],
      );
      const bumped = updated.rows[0];
      if (!bumped) throw new DomainError('INTERNAL_ERROR', 'Ticket bump failed', 500);
      ticket = bumped;
      const remaining = await tx.query<{ id: string }>(
        `SELECT id FROM public.kitchen_tickets
         WHERE tenant_id = $1 AND order_id = $2 AND status = ANY($3::text[]) LIMIT 1`,
        [tenantId, ticket.order_id, [...KDS_ACTIVE_STATUSES]],
      );
      if (remaining.rows.length === 0) {
        const orderRow = await tx.query<{ status: string }>(
          'SELECT status FROM public.pos_orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE',
          [tenantId, ticket.order_id],
        );
        const orderStatus = orderRow.rows[0]?.status;
        if (orderStatus && SERVABLE_ORDER_STATUSES.has(orderStatus)) {
          await tx.query('UPDATE public.pos_orders SET status = $3 WHERE tenant_id = $1 AND id = $2', [
            tenantId, ticket.order_id, 'served',
          ]);
          orderServed = true;
        }
      }
    }
  } else if (action === 'hold') {
    if (TERMINAL_TICKET_STATUSES.has(current.status)) {
      throw new DomainError('CONFLICT', `Ticket is ${current.status}; hold is not available`, 409);
    }
    if (current.course_hold_status === 'held') {
      replayed = true;
    } else {
      const updated = await tx.query<KitchenTicketRow>(
        `UPDATE public.kitchen_tickets SET course_hold_status = 'held', held_at = $3
         WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id, now],
      );
      const held = updated.rows[0];
      if (!held) throw new DomainError('INTERNAL_ERROR', 'Ticket hold failed', 500);
      ticket = held;
    }
  } else {
    if (TERMINAL_TICKET_STATUSES.has(current.status)) {
      throw new DomainError('CONFLICT', `Ticket is ${current.status}; fire is not available`, 409);
    }
    if (current.course_hold_status === 'fired') {
      replayed = true;
    } else {
      const updated = await tx.query<KitchenTicketRow>(
        `UPDATE public.kitchen_tickets SET status = CASE WHEN status = 'queued' THEN 'fired' ELSE status END,
           course_hold_status = 'fired', fired_at = $3
         WHERE tenant_id = $1 AND id = $2 RETURNING *`,
        [tenantId, id, now],
      );
      const fired = updated.rows[0];
      if (!fired) throw new DomainError('INTERNAL_ERROR', 'Ticket fire failed', 500);
      ticket = fired;
      await tx.query(
        `INSERT INTO public.pending_push (tenant_id, station_id, event_type, payload)
         VALUES ($1, $2, 'kds:ticket:fired', $3)`,
        [tenantId, ticket.station, JSON.stringify({ ticketId: ticket.id, orderId: ticket.order_id, station: ticket.station, courseNumber: ticket.course_number, status: 'fired' })],
      );
    }
  }

  if (key) {
    await finalizeReceipt(tx, tenantId, key, JSON.parse(JSON.stringify({ ticket, orderServed })) as Record<string, unknown>);
  }
  return { ticket, replayed, orderServed };
}

export async function listPendingPush(
  tx: NativeExecutor,
  tenantId: string,
  input: { stationId?: string; since?: string; limit?: number },
): Promise<Array<{ id: string; stationId: string | null; eventType: string; payload: unknown; createdAt: string }>> {
  const limit = input.limit === undefined ? 100 : integer(input.limit, 'limit', 1, 500);
  const stationId = input.stationId === undefined ? null : text(input.stationId, 'station', 64);
  const since = input.since === undefined ? null : text(input.since, 'since', 64);
  const result = await tx.query<{ id: string; station_id: string | null; event_type: string; payload: unknown; created_at: string }>(
    `SELECT id, station_id, event_type, payload, created_at FROM public.pending_push
     WHERE tenant_id = $1 AND delivered_at IS NULL
       AND ($2::text IS NULL OR station_id = $2)
       AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)
     ORDER BY created_at LIMIT $4`,
    [tenantId, stationId, since, limit],
  );
  return result.rows.map((row) => ({
    id: row.id,
    stationId: row.station_id,
    eventType: row.event_type,
    payload: row.payload,
    createdAt: row.created_at,
  }));
}

export async function ackPendingPush(tx: NativeExecutor, tenantId: string, ids: string[]): Promise<number> {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  if (ids.length > 500) throw new DomainError('VALIDATION_ERROR', 'Too many push IDs', 422);
  const normalized = ids.map((id) => uuid(id, 'push'));
  const result = await tx.query(
    `UPDATE public.pending_push SET delivered_at = now()
     WHERE tenant_id = $1 AND id = ANY($2::uuid[]) AND delivered_at IS NULL`,
    [tenantId, normalized],
  );
  return result.rowCount;
}
