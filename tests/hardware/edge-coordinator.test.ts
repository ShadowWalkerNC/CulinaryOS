import { describe, it, expect } from 'bun:test';
import {
  EdgeOfflineCoordinator,
  LoopbackPrinterDriver,
  OfflineOrder,
} from '../../packages/hardware/src/index';

describe('CulinaryOS Edge Offline Continuity Coordinator', () => {
  const mockOrder: OfflineOrder = {
    id: 'ord-offline-001',
    tenantId: '00000000-0000-0000-0000-000000000001',
    tableOrTab: 'Table 4',
    serverName: 'Gabriel M.',
    items: [
      { id: 'item-1', name: 'Wood-Fired Ribeye', quantity: 2, priceCents: 4500, notes: 'Medium Rare' },
      { id: 'item-2', name: 'Truffle Fries', quantity: 1, priceCents: 1200 },
    ],
    subtotalCents: 10200,
    taxCents: 816,
    tipCents: 2000,
    totalCents: 13016,
    idempotencyKey: 'idem-ord-offline-001-abc',
    createdAt: 1728000000000,
  };

  it('buffers order offline and immediately prints kitchen ticket locally', async () => {
    const kitchenPrinter = new LoopbackPrinterDriver('BOH Line Printer');
    const coordinator = new EdgeOfflineCoordinator({
      kitchenPrinter,
      initialOnlineState: false,
    });

    expect(coordinator.getOnlineStatus()).toBe(false);

    const record = await coordinator.processOfflineOrder(mockOrder, true);
    expect(record.status).toBe('pending');
    expect(record.order.idempotencyKey).toBe(mockOrder.idempotencyKey);
    expect(coordinator.getPendingCount()).toBe(1);

    // Verify printer received the ticket
    expect(kitchenPrinter.getJobCount()).toBe(1);
    const printedJob = kitchenPrinter.getPrintedJobs()[0];
    const ticketText = new TextDecoder().decode(printedJob);
    expect(ticketText).toContain('KITCHEN TICKET');
    expect(ticketText).toContain('Wood-Fired Ribeye');
    expect(ticketText).toContain('Medium Rare');
    expect(ticketText).toContain('Table 4');
  });

  it('guarantees idempotency when same order is processed multiple times', async () => {
    const kitchenPrinter = new LoopbackPrinterDriver('BOH Printer');
    const coordinator = new EdgeOfflineCoordinator({ kitchenPrinter });

    await coordinator.processOfflineOrder(mockOrder);
    await coordinator.processOfflineOrder(mockOrder);

    expect(coordinator.getPendingCount()).toBe(1);
    expect(coordinator.getQueueSnapshot()).toHaveLength(1);
  });

  it('formats customer receipt with integer cents and tax breakdown', () => {
    const coordinator = new EdgeOfflineCoordinator();
    const receiptBytes = coordinator.formatCustomerReceipt(mockOrder, 'The Bistro');
    const receiptText = new TextDecoder().decode(receiptBytes);

    expect(receiptText).toContain('The Bistro');
    expect(receiptText).toContain('Subtotal:');
    expect(receiptText).toContain('$102.00');
    expect(receiptText).toContain('Tax:');
    expect(receiptText).toContain('$8.16');
    expect(receiptText).toContain('Tip:');
    expect(receiptText).toContain('$20.00');
    expect(receiptText).toContain('TOTAL:');
    expect(receiptText).toContain('$130.16');
  });

  it('reconciles pending queue sequentially with cloud on reconnect', async () => {
    const coordinator = new EdgeOfflineCoordinator();
    await coordinator.processOfflineOrder(mockOrder, false);

    const secondOrder: OfflineOrder = {
      ...mockOrder,
      id: 'ord-offline-002',
      idempotencyKey: 'idem-ord-offline-002-xyz',
    };
    await coordinator.processOfflineOrder(secondOrder, false);

    expect(coordinator.getPendingCount()).toBe(2);

    // Simulate WAN reconnect
    coordinator.setOnline(true);
    expect(coordinator.getOnlineStatus()).toBe(true);

    const syncedCloudIds: string[] = [];
    const reconciliation = await coordinator.reconcileWithCloud(async (order) => {
      syncedCloudIds.push(order.id);
      return { success: true, remoteId: `cloud-${order.id}` };
    });

    expect(reconciliation.syncedCount).toBe(2);
    expect(reconciliation.failedCount).toBe(0);
    expect(reconciliation.pendingCount).toBe(0);
    expect(syncedCloudIds).toEqual(['ord-offline-001', 'ord-offline-002']);

    const record1 = coordinator.getOrderByKey(mockOrder.idempotencyKey);
    expect(record1?.status).toBe('synced');
    expect(record1?.remoteOrderId).toBe('cloud-ord-offline-001');
    expect(record1?.syncedAt).toBeDefined();
  });

  it('handles and tracks sync errors without dropping orders from queue', async () => {
    const coordinator = new EdgeOfflineCoordinator();
    await coordinator.processOfflineOrder(mockOrder, false);

    const reconciliation = await coordinator.reconcileWithCloud(async () => {
      return { success: false, error: '503 Cloud Gateway Unavailable' };
    });

    expect(reconciliation.syncedCount).toBe(0);
    expect(reconciliation.failedCount).toBe(1);
    expect(coordinator.getPendingCount()).toBe(1);

    const record = coordinator.getOrderByKey(mockOrder.idempotencyKey);
    expect(record?.status).toBe('failed');
    expect(record?.retryCount).toBe(1);
    expect(record?.lastError).toContain('503 Cloud Gateway Unavailable');
  });
});
