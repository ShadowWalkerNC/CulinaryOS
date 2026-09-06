// ============================================================
// CulinaryOS — Table Operations Route (apps/server)
// Merging, Splitting, Server Transfers & Tableside Assistance
// ============================================================

import { Hono } from 'hono';
import { handleIncomingEvent } from '@culinaryos/event-bus';
import { requireTenant, ok, err } from '../middleware/auth.js';
import { verifyManagerPinHelper } from './auth.js';
import type { Env } from '../types.js';

export const tablesRoutes = new Hono<Env>();

tablesRoutes.use('*', requireTenant);

// High-performance indexed in-memory store for Demo/Mock mode table state & assistance buzzers
export interface StoredAssistance {
  id: string;
  tenantId: string;
  tableId: string;
  tableNumber: string;
  type: 'server' | 'water' | 'bill' | 'help';
  note?: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

// Tenant-indexed storage: tenantId -> Map<id, StoredAssistance>
const tenantAssistanceStore = new Map<string, Map<string, StoredAssistance>>();
// Tenant version counter for lightweight ETag generation: tenantId -> version number
const tenantAssistanceVersion = new Map<string, number>();

function getTenantAssistanceMap(tenantId: string): Map<string, StoredAssistance> {
  let map = tenantAssistanceStore.get(tenantId);
  if (!map) {
    map = new Map();
    tenantAssistanceStore.set(tenantId, map);
  }
  return map;
}

function bumpTenantVersion(tenantId: string): number {
  const next = (tenantAssistanceVersion.get(tenantId) || 0) + 1;
  tenantAssistanceVersion.set(tenantId, next);
  return next;
}

// Local mock tables if DB is offline
const mockTableState: Record<string, {
  mergedIntoTableId?: string;
  mergedTableIds?: string[];
  assignedServerId?: string;
  assignedServerName?: string;
}> = {};

// POST /v1/tables/merge
tablesRoutes.post('/merge', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{
    sourceTableIds?: string[];
    targetTableId?: string;
    managerPin?: string;
  }>().catch(() => ({} as any));

  const sourceTableIds = Array.isArray(body.sourceTableIds) ? body.sourceTableIds.filter(Boolean) : [];
  const targetTableId = String(body.targetTableId ?? '').trim();

  if (!targetTableId) {
    return err(c, 'VALIDATION_ERROR', 'targetTableId is required', 422);
  }

  if (sourceTableIds.length === 0) {
    return err(c, 'VALIDATION_ERROR', 'sourceTableIds must contain at least one source table', 422);
  }

  if (sourceTableIds.includes(targetTableId)) {
    return err(c, 'VALIDATION_ERROR', 'targetTableId cannot be in sourceTableIds', 422);
  }

  // If manager PIN is provided, verify it (optional for basic merges or required if policy set)
  if (body.managerPin) {
    const pinAuth = await verifyManagerPinHelper(body.managerPin, tenantId);
    if (!pinAuth.authorized) {
      return err(c, 'UNAUTHORIZED', 'Invalid manager PIN for table merge', 403);
    }
  }

  if (!supabase) {
    // Demo / mock mode table merge
    const mergedOrderId = `o-merged-${Date.now()}`;
    const allTableNumbers = [targetTableId, ...sourceTableIds];

    mockTableState[targetTableId] = {
      ...mockTableState[targetTableId],
      mergedTableIds: [...(mockTableState[targetTableId]?.mergedTableIds || []), ...sourceTableIds],
    };

    for (const src of sourceTableIds) {
      mockTableState[src] = {
        ...mockTableState[src],
        mergedIntoTableId: targetTableId,
      };
    }

    await handleIncomingEvent({
      eventId: crypto.randomUUID(),
      eventType: 'pos:table:merged',
      tenantId,
      source: 'pos',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        targetTableId,
        sourceTableIds,
        mergedOrderId,
      },
    });

    return ok(c, {
      success: true,
      targetTableId,
      mergedOrderId,
      mergedSourceTableIds: sourceTableIds,
      mergedTableNumbers: allTableNumbers,
      combinedItemsCount: 4,
      newTotalCents: 6500,
    });
  }

  // Live Supabase path
  try {
    // Find active orders for target and source tables
    const allTableIds = [targetTableId, ...sourceTableIds];
    const { data: openOrders, error: findErr } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_line_items(*)')
      .eq('tenant_id', tenantId)
      .in('table_number', allTableIds)
      .in('status', ['open', 'sent', 'in-progress']);

    if (findErr) return err(c, 'DB_ERROR', findErr.message, 500);

    let targetOrder = openOrders?.find((o: any) => String(o.table_number) === targetTableId);
    const sourceOrders = openOrders?.filter((o: any) => String(o.table_number) !== targetTableId) ?? [];

    if (!targetOrder) {
      if (sourceOrders.length > 0) {
        // Promote first source order to target table
        targetOrder = sourceOrders[0];
        await supabase
          .from('pos_orders')
          .update({ table_number: targetTableId })
          .eq('id', targetOrder.id)
          .eq('tenant_id', tenantId);
      } else {
        // Create new open order on target table
        const { data: newTarget, error: createErr } = await supabase
          .from('pos_orders')
          .insert({
            tenant_id: tenantId,
            table_number: targetTableId,
            status: 'open',
            subtotal: 0,
            tax: 0,
            total: 0,
          })
          .select('*, items:pos_order_line_items(*)')
          .single();

        if (createErr) return err(c, 'DB_ERROR', createErr.message, 500);
        targetOrder = newTarget;
      }
    }

    // Move line items from all other source orders to targetOrder
    for (const srcOrder of sourceOrders) {
      if (srcOrder.id === targetOrder.id) continue;

      // Re-parent line items
      await supabase
        .from('pos_order_line_items')
        .update({ order_id: targetOrder.id })
        .eq('order_id', srcOrder.id)
        .eq('tenant_id', tenantId);

      // Mark source order as merged
      await supabase
        .from('pos_orders')
        .update({ status: 'merged', notes: `Merged into table ${targetTableId} (order ${targetOrder.id})` })
        .eq('id', srcOrder.id)
        .eq('tenant_id', tenantId);
    }

    // Recalculate target order totals
    const { data: allItems } = await supabase
      .from('pos_order_line_items')
      .select('line_total')
      .eq('order_id', targetOrder.id)
      .eq('tenant_id', tenantId);

    const subtotal = allItems?.reduce((sum: number, it: any) => sum + (it.line_total || 0), 0) ?? 0;
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    await supabase
      .from('pos_orders')
      .update({ subtotal, tax, total })
      .eq('id', targetOrder.id)
      .eq('tenant_id', tenantId);

    await handleIncomingEvent({
      eventId: crypto.randomUUID(),
      eventType: 'pos:table:merged',
      tenantId,
      source: 'pos',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        targetTableId,
        sourceTableIds,
        mergedOrderId: targetOrder.id,
      },
    });

    return ok(c, {
      success: true,
      targetTableId,
      mergedOrderId: targetOrder.id,
      mergedSourceTableIds: sourceTableIds,
      mergedTableNumbers: allTableIds,
      combinedItemsCount: allItems?.length ?? 0,
      newTotalCents: total,
    });
  } catch (error: any) {
    return err(c, 'INTERNAL_ERROR', error.message || 'Table merge failed', 500);
  }
});

// POST /v1/tables/split or /v1/orders/:id/split
async function handleOrderSplit(c: any, orderIdParam?: string) {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body: any = await (c.req as any).json().catch(() => ({}));

  const orderId = orderIdParam ?? body.orderId;
  if (!orderId) {
    return err(c, 'VALIDATION_ERROR', 'orderId is required', 422);
  }

  const partitions = Array.isArray(body.partitions) ? body.partitions : [];
  if (partitions.length < 2) {
    return err(c, 'VALIDATION_ERROR', 'At least 2 split partitions are required', 422);
  }

  // Validate items
  const allItemIds = partitions.flatMap((p: any) => p.itemIds || []);
  if (allItemIds.length === 0) {
    return err(c, 'VALIDATION_ERROR', 'At least one item must be assigned to partitions', 422);
  }

  if (!supabase) {
    // Demo / mock mode split
    const newOrderIds = partitions.map((_: any, idx: number) => `${orderId}-split-${idx + 1}`);
    const partitionResults = partitions.map((p: any, idx: number) => {
      const subtotal = (p.itemIds.length || 1) * 1500;
      const tax = Math.round(subtotal * 0.1);
      return {
        orderId: newOrderIds[idx],
        subtotal,
        tax,
        total: subtotal + tax,
        itemCount: p.itemIds.length,
        seatNumber: p.seatNumber,
        guestLabel: p.guestLabel,
      };
    });


    return ok(c, {
      success: true,
      originalOrderId: orderId,
      newOrderIds,
      partitions: partitionResults,
    });
  }

  // Live Supabase split
  try {
    const { data: originalOrder, error: orderErr } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_line_items(*)')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderErr || !originalOrder) {
      return err(c, 'NOT_FOUND', `Order ${orderId} not found`, 404);
    }

    const newOrderIds: string[] = [];
    const partitionResults: any[] = [];

    for (let i = 0; i < partitions.length; i++) {
      const partition = partitions[i];
      const partitionItems = (originalOrder.items ?? []).filter((item: any) =>
        partition.itemIds.includes(item.id)
      );

      const subtotal = partitionItems.reduce((sum: number, it: any) => sum + (it.line_total || 0), 0);
      const tax = Math.round(subtotal * 0.1);
      const total = subtotal + tax;

      // Create new split order
      const { data: newOrder, error: createErr } = await supabase
        .from('pos_orders')
        .insert({
          tenant_id: tenantId,
          table_number: originalOrder.table_number,
          cover_count: 1,
          server_name: originalOrder.server_name,
          status: originalOrder.status,
          subtotal,
          tax,
          total,
          notes: `Split Check ${i + 1}/${partitions.length} from ${orderId}`,
        })
        .select()
        .single();

      if (createErr || !newOrder) {
        return err(c, 'DB_ERROR', createErr?.message || 'Failed creating split check', 500);
      }

      newOrderIds.push(newOrder.id);

      // Move items to new order
      if (partition.itemIds.length > 0) {
        await supabase
          .from('pos_order_line_items')
          .update({ order_id: newOrder.id, seat_number: partition.seatNumber ?? 1 })
          .in('id', partition.itemIds)
          .eq('tenant_id', tenantId);
      }

      partitionResults.push({
        orderId: newOrder.id,
        subtotal,
        tax,
        total,
        itemCount: partitionItems.length,
        seatNumber: partition.seatNumber,
        guestLabel: partition.guestLabel,
      });
    }

    // Mark original order as split
    await supabase
      .from('pos_orders')
      .update({ status: 'split' })
      .eq('id', orderId)
      .eq('tenant_id', tenantId);

    return ok(c, {
      success: true,
      originalOrderId: orderId,
      newOrderIds,
      partitions: partitionResults,
    });
  } catch (error: any) {
    return err(c, 'INTERNAL_ERROR', error.message || 'Order split failed', 500);
  }
}

// POST /v1/tables/split
tablesRoutes.post('/split', async (c) => handleOrderSplit(c));

// POST /v1/tables/transfer
tablesRoutes.post('/transfer', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{
    tableId?: string;
    fromServerId?: string;
    toServerId?: string;
    toServerName?: string;
    managerPin?: string;
  }>().catch(() => ({} as any));

  const tableId = String(body.tableId ?? '').trim();
  const fromServerId = String(body.fromServerId ?? '').trim();
  const toServerId = String(body.toServerId ?? '').trim();
  const toServerName = String(body.toServerName ?? toServerId).trim();
  const managerPin = String(body.managerPin ?? '').trim();

  if (!tableId || !toServerId) {
    return err(c, 'VALIDATION_ERROR', 'tableId and toServerId are required', 422);
  }

  if (!managerPin) {
    return err(c, 'VALIDATION_ERROR', 'managerPin is required for server transfer authorization', 422);
  }

  // Authorize with Manager PIN
  const pinAuth = await verifyManagerPinHelper(managerPin, tenantId);
  if (!pinAuth.authorized) {
    return err(c, 'UNAUTHORIZED', 'Invalid manager authorization PIN for server transfer', 403);
  }

  const transferredAt = new Date().toISOString();

  if (!supabase) {
    mockTableState[tableId] = {
      ...mockTableState[tableId],
      assignedServerId: toServerId,
      assignedServerName: toServerName,
    };

    await handleIncomingEvent({
      eventId: crypto.randomUUID(),
      eventType: 'pos:table:transferred',
      tenantId,
      source: 'pos',
      timestamp: transferredAt,
      version: 1,
      payload: {
        tableId,
        fromServerId,
        toServerId,
        toServerName,
        managerId: pinAuth.managerId,
      },
    });

    return ok(c, {
      success: true,
      tableId,
      fromServerId,
      toServerId,
      toServerName,
      transferredAt,
    });
  }

  try {
    // Update active orders for this table
    const { data: updatedOrders, error: updateErr } = await supabase
      .from('pos_orders')
      .update({ server_name: toServerName })
      .eq('table_number', tableId)
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'sent', 'in-progress'])
      .select();

    if (updateErr) return err(c, 'DB_ERROR', updateErr.message, 500);

    const orderId = updatedOrders?.[0]?.id;

    await handleIncomingEvent({
      eventId: crypto.randomUUID(),
      eventType: 'pos:table:transferred',
      tenantId,
      source: 'pos',
      timestamp: transferredAt,
      version: 1,
      payload: {
        tableId,
        orderId,
        fromServerId,
        toServerId,
        toServerName,
        managerId: pinAuth.managerId,
      },
    });

    return ok(c, {
      success: true,
      tableId,
      orderId,
      fromServerId,
      toServerId,
      toServerName,
      transferredAt,
    });
  } catch (error: any) {
    return err(c, 'INTERNAL_ERROR', error.message || 'Table transfer failed', 500);
  }
});

// POST /v1/tables/:id/assistance (Buzzer)
tablesRoutes.post('/:id/assistance', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const body = await c.req.json<{
    tableNumber?: string;
    type?: 'server' | 'water' | 'bill' | 'help';
    note?: string;
  }>().catch(() => ({} as any));

  const tableNumber = String(body.tableNumber ?? id).trim();
  const type = body.type || 'server';
  const timestamp = new Date().toISOString();
  const now = Date.now();

  const map = getTenantAssistanceMap(tenantId);

  // Debounce & deduplication check:
  // If an active request of the exact same type was created for this table within 15 seconds,
  // reuse the active request to avoid server thrashing and event storms.
  for (const existing of map.values()) {
    if (
      existing.status === 'active' &&
      (existing.tableId === id || existing.tableNumber === tableNumber) &&
      existing.type === type
    ) {
      const ageMs = now - new Date(existing.timestamp).getTime();
      if (ageMs < 15_000) {
        return ok(
          c,
          {
            notificationId: existing.id,
            timestamp: existing.timestamp,
            tableId: existing.tableId,
            tableNumber: existing.tableNumber,
            type: existing.type,
            status: existing.status,
            deduplicated: true,
          },
          200
        );
      }
    }
  }

  const notificationId = `ast-${now}-${Math.floor(Math.random() * 1000)}`;

  const req: StoredAssistance = {
    id: notificationId,
    tenantId,
    tableId: id,
    tableNumber,
    type,
    note: body.note,
    timestamp,
    status: 'active',
  };

  map.set(notificationId, req);
  bumpTenantVersion(tenantId);

  // Auto-prune resolved entries older than 1 hour to keep memory lightweight
  if (map.size > 200) {
    const oneHourAgo = now - 3600_000;
    for (const [key, val] of map.entries()) {
      if (val.status !== 'active' && new Date(val.timestamp).getTime() < oneHourAgo) {
        map.delete(key);
      }
    }
  }

  // Broadcast buzzer notification to POS & KDS terminals
  await handleIncomingEvent({
    eventId: crypto.randomUUID(),
    eventType: 'pos:table:assistance',
    tenantId,
    source: 'web_tableside',
    timestamp,
    version: 1,
    payload: {
      notificationId,
      tableId: id,
      tableNumber,
      type,
      note: body.note,
    },
  });

  return ok(c, {
    notificationId,
    timestamp,
    tableId: id,
    tableNumber,
    type,
    status: 'active',
  }, 201);
});

// GET /v1/tables/assistance/active
tablesRoutes.get('/assistance/active', async (c) => {
  const tenantId = c.get('tenantId');
  const version = tenantAssistanceVersion.get(tenantId) || 0;
  const etag = `W/"ast-${tenantId}-${version}"`;

  const clientIfNoneMatch = c.req.header('If-None-Match');
  if (clientIfNoneMatch && clientIfNoneMatch === etag) {
    return c.body(null, 304);
  }

  const map = getTenantAssistanceMap(tenantId);
  const active: StoredAssistance[] = [];
  for (const item of map.values()) {
    if (item.status === 'active') {
      active.push(item);
    }
  }

  // Set ETag & Cache-Control for polling clients
  c.header('ETag', etag);
  c.header('Cache-Control', 'private, no-cache');
  return ok(c, active);
});

// PATCH /v1/tables/assistance/:notificationId/dismiss
tablesRoutes.patch('/assistance/:notificationId/dismiss', async (c) => {
  const tenantId = c.get('tenantId');
  const { notificationId } = c.req.param();
  const map = getTenantAssistanceMap(tenantId);
  const item = map.get(notificationId);
  if (item) {
    item.status = 'resolved';
    bumpTenantVersion(tenantId);
  }
  return ok(c, { success: true, notificationId, status: 'resolved' });
});

export default tablesRoutes;
