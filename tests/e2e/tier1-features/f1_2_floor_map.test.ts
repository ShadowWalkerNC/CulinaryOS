// ============================================================
// Tier 1 — F1.2: 2D/3D Floor Map Operations (Granular Feature Tests)
// Covers: Table merging, seat bill splitting, server transfer,
// and tableside assistance notifications.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface TableNode {
  id: string;
  tableNumber: string;
  section: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'merged';
  currentOrderId?: string;
  serverId?: string;
  mergedIntoTableId?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  seatNumber?: number;
  unitPriceCents: number;
  quantity: number;
}

export interface FloorOrder {
  id: string;
  tableId: string;
  serverId: string;
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function mergeTables(
  sourceTables: TableNode[],
  targetTable: TableNode,
  orders: FloorOrder[]
): { updatedTables: TableNode[]; mergedOrder: FloorOrder } {
  const sourceTableIds = new Set(sourceTables.map((t) => t.id));
  const relevantOrders = orders.filter((o) => sourceTableIds.has(o.tableId) || o.tableId === targetTable.id);

  const combinedItems: OrderItem[] = [];
  for (const ord of relevantOrders) {
    combinedItems.push(...ord.items);
  }

  const subtotal = combinedItems.reduce((acc, i) => acc + i.unitPriceCents * i.quantity, 0);
  const tax = Math.round(subtotal * 0.0825);
  const total = subtotal + tax;

  const mergedOrder: FloorOrder = {
    id: `merged-${Date.now()}`,
    tableId: targetTable.id,
    serverId: targetTable.serverId || 'srv-default',
    items: combinedItems,
    subtotalCents: subtotal,
    taxCents: tax,
    totalCents: total,
  };

  const updatedTables: TableNode[] = [
    { ...targetTable, status: 'occupied', currentOrderId: mergedOrder.id },
    ...sourceTables.map((t) => ({
      ...t,
      status: 'merged' as const,
      mergedIntoTableId: targetTable.id,
      currentOrderId: undefined,
    })),
  ];

  return { updatedTables, mergedOrder };
}

export function splitOrderBySeats(
  order: FloorOrder
): Record<number, { items: OrderItem[]; subtotalCents: number; taxCents: number; totalCents: number }> {
  const splits: Record<number, { items: OrderItem[]; subtotalCents: number; taxCents: number; totalCents: number }> = {};

  for (const item of order.items) {
    const seat = item.seatNumber ?? 1;
    if (!splits[seat]) {
      splits[seat] = { items: [], subtotalCents: 0, taxCents: 0, totalCents: 0 };
    }
    splits[seat].items.push(item);
    splits[seat].subtotalCents += item.unitPriceCents * item.quantity;
  }

  for (const seat of Object.keys(splits)) {
    const s = splits[Number(seat)];
    s.taxCents = Math.round(s.subtotalCents * 0.0825);
    s.totalCents = s.subtotalCents + s.taxCents;
  }

  return splits;
}

export function transferTableServer(
  table: TableNode,
  order: FloorOrder | undefined,
  newServerId: string,
  managerPinVerified: boolean
): { table: TableNode; order?: FloorOrder } {
  if (!managerPinVerified) {
    throw new Error('Manager authorization required to transfer table ownership');
  }
  const updatedTable: TableNode = { ...table, serverId: newServerId };
  const updatedOrder = order ? { ...order, serverId: newServerId } : undefined;
  return { table: updatedTable, order: updatedOrder };
}

export function triggerAssistanceBuzzer(
  tableNumber: string,
  type: 'server' | 'water' | 'bill'
): { notificationId: string; tableNumber: string; type: string; timestamp: string; message: string } {
  const messages: Record<string, string> = {
    server: `Table ${tableNumber} requested server assistance`,
    water: `Table ${tableNumber} requested water refill`,
    bill: `Table ${tableNumber} requested the check`,
  };
  return {
    notificationId: `buzz-${Math.random().toString(36).substring(2, 9)}`,
    tableNumber,
    type,
    timestamp: new Date().toISOString(),
    message: messages[type] || `Table ${tableNumber} assistance call`,
  };
}

describe('F1.2 2D/3D Floor Map Operations — Tier 1 Isolation', () => {
  const table1: TableNode = { id: 't-1', tableNumber: '12', section: 'Patio', capacity: 4, status: 'occupied', serverId: 'srv-1', currentOrderId: 'ord-1' };
  const table2: TableNode = { id: 't-2', tableNumber: '13', section: 'Patio', capacity: 4, status: 'occupied', serverId: 'srv-1', currentOrderId: 'ord-2' };
  const targetTable: TableNode = { id: 't-master', tableNumber: '12-13M', section: 'Patio', capacity: 8, status: 'available', serverId: 'srv-1' };

  const order1: FloorOrder = {
    id: 'ord-1',
    tableId: 't-1',
    serverId: 'srv-1',
    items: [{ id: 'i-1', name: 'Filet Mignon', seatNumber: 1, unitPriceCents: 4500, quantity: 1 }],
    subtotalCents: 4500,
    taxCents: 371,
    totalCents: 4871,
  };

  const order2: FloorOrder = {
    id: 'ord-2',
    tableId: 't-2',
    serverId: 'srv-1',
    items: [{ id: 'i-2', name: 'Sea Bass', seatNumber: 2, unitPriceCents: 3800, quantity: 1 }],
    subtotalCents: 3800,
    taxCents: 314,
    totalCents: 4114,
  };

  it('1. merges multiple source tables into a single target table order', () => {
    const { updatedTables, mergedOrder } = mergeTables([table1, table2], targetTable, [order1, order2]);

    expect(mergedOrder.items).toHaveLength(2);
    expect(mergedOrder.subtotalCents).toBe(4500 + 3800); // 8300
    expect(updatedTables.find((t) => t.id === 't-1')?.status).toBe('merged');
    expect(updatedTables.find((t) => t.id === 't-2')?.status).toBe('merged');
    expect(updatedTables.find((t) => t.id === 't-master')?.status).toBe('occupied');
  });

  it('2. splits multi-seat order into individual seat sub-bills accurately', () => {
    const multiSeatOrder: FloorOrder = {
      id: 'ord-multi',
      tableId: 't-1',
      serverId: 'srv-1',
      items: [
        { id: 'i-1', name: 'Calamari', seatNumber: 1, unitPriceCents: 1600, quantity: 1 },
        { id: 'i-2', name: 'Ribeye Steak', seatNumber: 1, unitPriceCents: 4200, quantity: 1 },
        { id: 'i-3', name: 'Pasta Primavera', seatNumber: 2, unitPriceCents: 2400, quantity: 1 },
      ],
      subtotalCents: 8200,
      taxCents: 677,
      totalCents: 8877,
    };

    const splits = splitOrderBySeats(multiSeatOrder);
    expect(splits[1]).toBeDefined();
    expect(splits[2]).toBeDefined();
    expect(splits[1].subtotalCents).toBe(1600 + 4200); // 5800
    expect(splits[2].subtotalCents).toBe(2400);
    expect(splits[1].subtotalCents + splits[2].subtotalCents).toBe(multiSeatOrder.subtotalCents);
  });

  it('3. transfers server ownership when manager authorization is verified', () => {
    const result = transferTableServer(table1, order1, 'srv-2-marcus', true);
    expect(result.table.serverId).toBe('srv-2-marcus');
    expect(result.order?.serverId).toBe('srv-2-marcus');
  });

  it('4. blocks server table transfer if manager PIN verification is missing', () => {
    expect(() => {
      transferTableServer(table1, order1, 'srv-2-marcus', false);
    }).toThrow('Manager authorization required');
  });

  it('5. generates assistance buzzer notifications with accurate payload', () => {
    const call = triggerAssistanceBuzzer('14', 'water');
    expect(call.tableNumber).toBe('14');
    expect(call.type).toBe('water');
    expect(call.message).toContain('water refill');
    expect(call.notificationId).toBeDefined();
  });
});
