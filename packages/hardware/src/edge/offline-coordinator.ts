import { EscposBuilder } from '../drivers/escpos.js';
import { ReceiptPrinterDriver } from '../drivers/printer.js';

export interface OfflineOrderItem {
  id: string;
  name: string;
  quantity: number;
  priceCents: number;
  notes?: string | undefined;
}

export interface OfflineOrder {
  id: string;
  tenantId: string;
  locationId?: string | undefined;
  tableOrTab?: string | undefined;
  serverName?: string | undefined;
  items: OfflineOrderItem[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  idempotencyKey: string;
  createdAt: number;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface QueuedOfflineRecord {
  order: OfflineOrder;
  status: SyncStatus;
  queuedAt: number;
  syncedAt?: number | undefined;
  retryCount: number;
  lastError?: string | undefined;
  remoteOrderId?: string | undefined;
}

export interface CloudSyncResult {
  success: boolean;
  remoteId?: string | undefined;
  error?: string | undefined;
}

export type CloudSyncHandler = (order: OfflineOrder) => Promise<CloudSyncResult>;

export interface EdgeOfflineCoordinatorOptions {
  kitchenPrinter?: ReceiptPrinterDriver | undefined;
  receiptPrinter?: ReceiptPrinterDriver | undefined;
  initialOnlineState?: boolean | undefined;
}

/**
 * Edge Offline Continuity Coordinator
 * Coordinates edge POS continuity during internet drops:
 * - Buffers orders locally with idempotency keys
 * - Dispatches kitchen / receipt tickets directly to local hardware
 * - Sequentially reconciles pending queue with cloud once WAN reconnects
 */
export class EdgeOfflineCoordinator {
  private queue: Map<string, QueuedOfflineRecord> = new Map();
  private kitchenPrinter?: ReceiptPrinterDriver | undefined;
  private receiptPrinter?: ReceiptPrinterDriver | undefined;
  private isOnline: boolean = false;

  constructor(options?: EdgeOfflineCoordinatorOptions) {
    this.kitchenPrinter = options?.kitchenPrinter;
    this.receiptPrinter = options?.receiptPrinter;
    this.isOnline = options?.initialOnlineState ?? false;
  }

  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  setKitchenPrinter(printer: ReceiptPrinterDriver): void {
    this.kitchenPrinter = printer;
  }

  setReceiptPrinter(printer: ReceiptPrinterDriver): void {
    this.receiptPrinter = printer;
  }

  /**
   * Accepts and buffers an order during offline or degraded mode.
   * Immediately prints kitchen ticket locally to avoid kitchen service delays.
   */
  async processOfflineOrder(order: OfflineOrder, autoPrintKitchenTicket: boolean = true): Promise<QueuedOfflineRecord> {
    if (!order.idempotencyKey) {
      throw new Error('Order missing required idempotencyKey for offline queueing');
    }

    const existing = this.queue.get(order.idempotencyKey);
    if (existing) {
      // Idempotent return of already-queued order
      return existing;
    }

    const record: QueuedOfflineRecord = {
      order,
      status: 'pending',
      queuedAt: Date.now(),
      retryCount: 0,
    };

    this.queue.set(order.idempotencyKey, record);

    if (autoPrintKitchenTicket && this.kitchenPrinter) {
      const ticketBytes = this.formatKitchenTicket(order);
      await this.kitchenPrinter.printRaw(ticketBytes);
    }

    return record;
  }

  /**
   * Formats standard kitchen ticket ESC/POS byte sequence.
   */
  formatKitchenTicket(order: OfflineOrder): Uint8Array {
    const builder = new EscposBuilder();
    builder
      .align('center')
      .size('double-both')
      .line('*** KITCHEN TICKET ***')
      .size('normal')
      .line(`Table / Tab: ${order.tableOrTab || 'N/A'}`)
      .line(`Server: ${order.serverName || 'Staff'}`)
      .line(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`)
      .divider('=')
      .align('left');

    for (const item of order.items) {
      builder
        .size('double-height')
        .line(`${item.quantity}x ${item.name}`)
        .size('normal');
      if (item.notes) {
        builder.line(`   * ${item.notes}`);
      }
    }

    builder
      .divider('-')
      .align('center')
      .line(`[OFFLINE ORDER: ${order.idempotencyKey.slice(0, 8)}]`)
      .feed(2)
      .cut();

    return builder.build();
  }

  /**
   * Formats customer receipt ESC/POS byte sequence.
   */
  formatCustomerReceipt(order: OfflineOrder, restaurantName: string = 'CulinaryOS'): Uint8Array {
    const builder = new EscposBuilder();
    builder
      .align('center')
      .size('double-width')
      .line(restaurantName)
      .size('normal')
      .line(`Order #${order.id.slice(0, 6).toUpperCase()}`)
      .line(new Date(order.createdAt).toLocaleString())
      .divider('=')
      .align('left');

    for (const item of order.items) {
      const priceStr = `$${(item.priceCents / 100).toFixed(2)}`;
      builder.twoColumn(`${item.quantity}x ${item.name}`, priceStr);
    }

    builder
      .divider('-')
      .twoColumn('Subtotal:', `$${(order.subtotalCents / 100).toFixed(2)}`)
      .twoColumn('Tax:', `$${(order.taxCents / 100).toFixed(2)}`);

    if (order.tipCents > 0) {
      builder.twoColumn('Tip:', `$${(order.tipCents / 100).toFixed(2)}`);
    }

    builder
      .divider('=')
      .bold(true)
      .twoColumn('TOTAL:', `$${(order.totalCents / 100).toFixed(2)}`)
      .bold(false)
      .feed(1)
      .align('center')
      .line('Thank you for dining with us!')
      .feed(2)
      .cut();

    return builder.build();
  }

  /**
   * Reconciles all pending offline orders with cloud using provided sync function.
   * Guarantees sequential order and preserves idempotency.
   */
  async reconcileWithCloud(syncHandler: CloudSyncHandler): Promise<{
    syncedCount: number;
    failedCount: number;
    pendingCount: number;
  }> {
    let syncedCount = 0;
    let failedCount = 0;

    for (const [key, record] of this.queue.entries()) {
      if (record.status === 'synced') {
        continue;
      }

      record.status = 'syncing';
      record.retryCount += 1;

      try {
        const result = await syncHandler(record.order);
        if (result.success) {
          record.status = 'synced';
          record.syncedAt = Date.now();
          if (result.remoteId !== undefined) {
            record.remoteOrderId = result.remoteId;
          }
          syncedCount += 1;
        } else {
          record.status = 'failed';
          record.lastError = result.error || 'Unknown sync error';
          failedCount += 1;
        }
      } catch (err: any) {
        record.status = 'failed';
        record.lastError = err?.message || String(err);
        failedCount += 1;
      }
    }

    const pendingCount = this.getPendingCount();
    return { syncedCount, failedCount, pendingCount };
  }

  getPendingCount(): number {
    let count = 0;
    for (const record of this.queue.values()) {
      if (record.status === 'pending' || record.status === 'failed') {
        count += 1;
      }
    }
    return count;
  }

  getQueueSnapshot(): QueuedOfflineRecord[] {
    return Array.from(this.queue.values());
  }

  getOrderByKey(idempotencyKey: string): QueuedOfflineRecord | undefined {
    return this.queue.get(idempotencyKey);
  }

  clearQueue(): void {
    this.queue.clear();
  }
}
