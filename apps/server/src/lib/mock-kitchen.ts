// ============================================================
// In-memory kitchen ticket store for demo / offline (no Supabase)
// Shared by orders send path and KDS routes so POS → KDS works.
// ============================================================

export interface MockTicketItem {
  id: string;
  line_item_id?: string | undefined;
  name: string;
  quantity: number;
  modifiers: string[];
  notes?: string | null | undefined;
  station?: string | undefined;
}

export interface MockKitchenTicket {
  id: string;
  tenant_id: string;
  order_id: string;
  order_number?: number;
  table_number?: string | null;
  station: string;
  status: string;
  course_number: number;
  course_hold_status: string;
  priority?: string;
  created_at: string;
  fired_at: string | null;
  bumped_at?: string | null;
  items: MockTicketItem[];
  ticket_items: MockTicketItem[];
}

export interface FireOrderItemInput {
  lineItemId?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  station?: string;
  courseNumber?: number;
  modifiers?: Array<string | { name?: string }>;
  notes?: string | null;
}

const INITIAL: MockKitchenTicket[] = [
  {
    id: 't-101',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    order_id: 'o-201',
    table_number: '4',
    station: 'grill',
    status: 'fired',
    course_number: 1,
    course_hold_status: 'fired',
    created_at: new Date().toISOString(),
    fired_at: new Date().toISOString(),
    items: [
      { id: 'i-1', name: 'Smash Burger Double', quantity: 2, modifiers: ['No Onions'], station: 'grill' },
    ],
    ticket_items: [
      { id: 'i-1', name: 'Smash Burger Double', quantity: 2, modifiers: ['No Onions'], station: 'grill' },
    ],
  },
];

let mockTickets: MockKitchenTicket[] = [...INITIAL];

export function getMockTickets(): MockKitchenTicket[] {
  return mockTickets;
}

export function resetMockTickets(seed: MockKitchenTicket[] = INITIAL): void {
  mockTickets = seed.map((t) => ({
    ...t,
    items: [...(t.items ?? [])],
    ticket_items: [...(t.ticket_items ?? t.items ?? [])],
  }));
}

function normalizeModifiers(
  modifiers: FireOrderItemInput['modifiers']
): string[] {
  if (!Array.isArray(modifiers)) return [];
  return modifiers.map((m) => (typeof m === 'string' ? m : m?.name ?? String(m)));
}

/** Group items by station + course and append kitchen tickets. */
export function createMockTicketsFromOrder(input: {
  tenantId: string;
  orderId: string;
  tableNumber?: string | null;
  orderNumber?: number;
  items: FireOrderItemInput[];
}): MockKitchenTicket[] {
  const now = new Date().toISOString();
  const groups = new Map<string, FireOrderItemInput[]>();

  for (const item of input.items) {
    const station = item.station ?? 'hot';
    const course = item.courseNumber ?? 1;
    const key = `${station}::${course}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const created: MockKitchenTicket[] = [];

  for (const [key, groupItems] of groups.entries()) {
    const [station, courseStr] = key.split('::');
    const courseNumber = parseInt(courseStr || '1', 10);
    const isFirstCourse = courseNumber <= 1;
    const ticketId = `t-${Math.floor(10000 + Math.random() * 90000)}`;

    const ticketItems: MockTicketItem[] = groupItems.map((item, idx) => {
      const row: MockTicketItem = {
        id: item.lineItemId ?? `ti-${ticketId}-${idx}`,
        name: item.name,
        quantity: item.quantity,
        modifiers: normalizeModifiers(item.modifiers),
        notes: item.notes ?? null,
        station,
      };
      if (item.lineItemId) row.line_item_id = item.lineItemId;
      return row;
    });

    const stationName = station ?? 'hot';
    const ticket: MockKitchenTicket = {
      id: ticketId,
      tenant_id: input.tenantId,
      order_id: input.orderId,
      order_number: input.orderNumber ?? Math.floor(Date.now() % 100000),
      table_number: input.tableNumber ?? null,
      station: stationName,
      status: isFirstCourse ? 'fired' : 'queued',
      course_number: courseNumber,
      course_hold_status: isFirstCourse ? 'fired' : 'held',
      priority: ticketItems.some((i) =>
        i.modifiers.some((m) => /allerg/i.test(m))
      )
        ? 'allergy'
        : 'normal',
      created_at: now,
      fired_at: isFirstCourse ? now : null,
      items: ticketItems,
      ticket_items: ticketItems,
    };

    mockTickets.push(ticket);
    created.push(ticket);
  }

  return created;
}

export function bumpMockTicket(id: string): MockKitchenTicket | null {
  const ticket = mockTickets.find((t) => t.id === id);
  if (!ticket) return null;
  ticket.status = 'bumped';
  ticket.bumped_at = new Date().toISOString();
  return ticket;
}

export function fireMockTicket(id: string): MockKitchenTicket | null {
  const ticket = mockTickets.find((t) => t.id === id);
  if (!ticket) return null;
  ticket.course_hold_status = 'fired';
  ticket.status = 'fired';
  ticket.fired_at = new Date().toISOString();
  return ticket;
}
