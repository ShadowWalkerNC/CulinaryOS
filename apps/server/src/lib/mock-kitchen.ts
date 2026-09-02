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

export interface Mock86Item {
  id: string;
  name: string;
  countRemaining: number | null;
  is86: boolean;
  station?: string;
}

const INITIAL_86: Mock86Item[] = [
  { id: 'm-1', name: 'Prime Ribeye Steak', countRemaining: 8, is86: false, station: 'grill' },
  { id: 'm-2', name: 'Atlantic Salmon Fillet', countRemaining: 5, is86: false, station: 'grill' },
  { id: 'm-3', name: 'Smash Burger Double', countRemaining: null, is86: false, station: 'grill' },
  { id: 'm-4', name: 'Catch of the Day (Halibut)', countRemaining: 0, is86: true, station: 'grill' },
  { id: 'm-5', name: 'Truffle Pasta', countRemaining: 3, is86: false, station: 'hot' },
  { id: 'm-6', name: 'Chocolate Lava Cake', countRemaining: 4, is86: false, station: 'pastry' },
];

let mock86Items: Mock86Item[] = [...INITIAL_86];

export function getMock86Items(): Mock86Item[] {
  return mock86Items;
}

export function setMock86Count(idOrName: string, count: number): Mock86Item | null {
  const item = mock86Items.find(
    (i) => i.id === idOrName || i.name.toLowerCase() === idOrName.toLowerCase()
  );
  if (!item) {
    const newItem: Mock86Item = {
      id: idOrName.startsWith('m-') ? idOrName : `m-${Date.now().toString().slice(-4)}`,
      name: idOrName,
      countRemaining: Math.max(0, count),
      is86: count <= 0,
    };
    mock86Items.push(newItem);
    return newItem;
  }
  item.countRemaining = Math.max(0, count);
  item.is86 = count <= 0;
  return item;
}

export function toggleMock86(idOrName: string): Mock86Item | null {
  const item = mock86Items.find(
    (i) => i.id === idOrName || i.name.toLowerCase() === idOrName.toLowerCase()
  );
  if (!item) {
    const newItem: Mock86Item = {
      id: idOrName.startsWith('m-') ? idOrName : `m-${Date.now().toString().slice(-4)}`,
      name: idOrName,
      countRemaining: 0,
      is86: true,
    };
    mock86Items.push(newItem);
    return newItem;
  }
  item.is86 = !item.is86;
  if (item.is86) {
    item.countRemaining = 0;
  } else if (item.countRemaining === 0) {
    item.countRemaining = 10;
  }
  return item;
}

export function decrementMock86(nameOrId: string, quantity = 1): { item: Mock86Item | null; is86: boolean } {
  const item = mock86Items.find(
    (i) => i.id === nameOrId || i.name.toLowerCase() === nameOrId.toLowerCase()
  );
  if (!item) return { item: null, is86: false };

  if (item.countRemaining !== null) {
    item.countRemaining = Math.max(0, item.countRemaining - quantity);
    if (item.countRemaining <= 0) {
      item.countRemaining = 0;
      item.is86 = true;
    }
  }
  return { item, is86: item.is86 };
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
  ticket.status = 'fired';
  ticket.course_hold_status = 'fired';
  ticket.fired_at = new Date().toISOString();
  return ticket;
}

export function holdMockTicket(id: string): MockKitchenTicket | null {
  const ticket = mockTickets.find((t) => t.id === id);
  if (!ticket) return null;
  ticket.course_hold_status = 'held';
  ticket.status = 'queued';
  return ticket;
}
