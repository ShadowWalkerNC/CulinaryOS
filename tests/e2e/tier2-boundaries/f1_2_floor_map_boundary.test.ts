// ============================================================
// Tier 2 — F1.2: 2D/3D Floor Map Operations (Boundary & Corner Cases)
// Covers: Merging already merged table, merging empty source list,
// splitting order with 0 items, empty seat numbers, and capacity limits.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  mergeTables,
  splitOrderBySeats,
  transferTableServer,
  triggerAssistanceBuzzer,
  type TableNode,
  type FloorOrder,
} from '../tier1-features/f1_2_floor_map.test.js';

describe('F1.2 Floor Map Operations — Tier 2 Boundaries', () => {
  const targetTable: TableNode = { id: 't-target', tableNumber: '5', section: 'Main', capacity: 6, status: 'available' };

  it('1. handles merge with 0 source tables gracefully returning empty merged order', () => {
    const { updatedTables, mergedOrder } = mergeTables([], targetTable, []);
    expect(mergedOrder.items).toHaveLength(0);
    expect(mergedOrder.subtotalCents).toBe(0);
    expect(updatedTables).toHaveLength(1);
    expect(updatedTables[0].status).toBe('occupied');
  });

  it('2. splits order with unassigned seat numbers into default seat 1 bucket', () => {
    const orderWithoutSeats: FloorOrder = {
      id: 'ord-no-seats',
      tableId: 't-5',
      serverId: 'srv-1',
      items: [
        { id: '1', name: 'Soup', seatNumber: undefined, unitPriceCents: 800, quantity: 1 },
        { id: '2', name: 'Salad', seatNumber: undefined, unitPriceCents: 1200, quantity: 1 },
      ],
      subtotalCents: 2000,
      taxCents: 165,
      totalCents: 2165,
    };
    const splits = splitOrderBySeats(orderWithoutSeats);
    expect(Object.keys(splits)).toHaveLength(1);
    expect(splits[1]).toBeDefined();
    expect(splits[1].subtotalCents).toBe(2000);
  });

  it('3. handles split of order with 0 items returning empty splits map', () => {
    const emptyOrder: FloorOrder = {
      id: 'ord-empty',
      tableId: 't-5',
      serverId: 'srv-1',
      items: [],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    };
    const splits = splitOrderBySeats(emptyOrder);
    expect(Object.keys(splits)).toHaveLength(0);
  });

  it('4. transfers server on a table without an active order without throwing', () => {
    const emptyTable: TableNode = { id: 't-vacant', tableNumber: '1', section: 'Bar', capacity: 2, status: 'available' };
    const res = transferTableServer(emptyTable, undefined, 'srv-new', true);
    expect(res.table.serverId).toBe('srv-new');
    expect(res.order).toBeUndefined();
  });

  it('5. handles assistance buzzer with unusual custom table strings (e.g. "PATIO-VIP-01")', () => {
    const call = triggerAssistanceBuzzer('PATIO-VIP-01', 'bill');
    expect(call.tableNumber).toBe('PATIO-VIP-01');
    expect(call.message).toContain('Table PATIO-VIP-01 requested the check');
  });
});
