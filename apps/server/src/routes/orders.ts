// ============================================================
// POS — /v1/orders routes  (extended with manual course fire)
//
// POST   /v1/orders                 create order
// GET    /v1/orders                 list active orders
// GET    /v1/orders/:id             get order detail
// PATCH  /v1/orders/:id/send        send to kitchen (fire course 1)
// PATCH  /v1/orders/:id/void        void order
// POST   /v1/orders/:id/fire-course  manually fire a held course
// PATCH  /v1/orders/:id/items/:itemId/void  void a single line item
// ============================================================

import { Hono } from 'hono';
import { handleIncomingEvent } from '@culinaryos/event-bus';
import { calculateVoidWaste, isPostSendStatus } from '@culinaryos/waste-engine';
import { calculateMultiRateTax } from '@culinaryos/shared';
import { requireTenant, ok, err } from '../middleware/auth.js';
import { createMockTicketsFromOrder, decrementMock86 } from '../lib/mock-kitchen.js';
import { verifyManagerPinDirectly, logAuditTrail } from '../lib/audit.js';
import type { Env } from '../types.js';

export const ordersRoutes = new Hono<Env>();

ordersRoutes.use('*', requireTenant);

/** Prefer CULINARYOS_URL; accept bare host in CULINARYOS_HOST. */
function resolveCulinaryOsUrl(): string {
  if (process.env.CULINARYOS_URL) return process.env.CULINARYOS_URL.replace(/\/$/, '');
  const host = process.env.CULINARYOS_HOST;
  if (!host) return 'http://localhost:3000';
  if (host.startsWith('http://') || host.startsWith('https://')) return host.replace(/\/$/, '');
  return `https://${host}`;
}

// Local Mock Database for Offline/Demo Mode
let mockOrders: any[] = [];

function mapLineItemsToEventPayload(items: any[]) {
  return (items ?? []).map((li: any) => {
    const rawMods = li.modifiers ?? [];
    const modifiers = Array.isArray(rawMods)
      ? rawMods.map((m: any) => (typeof m === 'string' ? m : m?.name ?? String(m)))
      : [];
    return {
      lineItemId: li.id ?? li.lineItemId ?? crypto.randomUUID(),
      menuItemId: li.menu_item_id ?? li.menuItemId,
      name: li.name,
      quantity: li.quantity,
      station: li.station ?? 'hot',
      courseNumber: li.course_number ?? li.courseNumber ?? 1,
      modifiers,
      notes: li.notes ?? null,
      recipeId: li.recipe_id ?? li.recipeId,
    };
  });
}

async function emitOrderCreated(opts: {
  tenantId: string;
  orderId: string;
  tableNumber?: string | null;
  serverName?: string | null;
  createdAt?: string;
  items: ReturnType<typeof mapLineItemsToEventPayload>;
}) {
  const event = {
    eventId: crypto.randomUUID(),
    eventType: 'pos:order:created' as const,
    tenantId: opts.tenantId,
    source: 'pos',
    timestamp: new Date().toISOString(),
    version: 1,
    payload: {
      orderId: opts.orderId,
      tableNumber: opts.tableNumber ?? undefined,
      serverName: opts.serverName ?? undefined,
      createdAt: opts.createdAt ?? new Date().toISOString(),
      items: opts.items,
    },
  };

  // In-process first (reliable; no self-HTTP / API-key race)
  const result = await handleIncomingEvent(event);
  if (!result.ok) {
    // Fallback HTTP for split-process deploys
    const base = resolveCulinaryOsUrl();
    await fetch(`${base}/internal/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        'X-Tenant-Id': opts.tenantId,
        'X-Caller-Service': 'pos',
      },
      body: JSON.stringify(event),
    }).catch(() => null);
  }
  return result;
}

// POST /v1/orders
ordersRoutes.post('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const body      = await c.req.json();

  if (!body.tableNumber && !body.takeaway)
    return err(c, 'VALIDATION_ERROR', 'tableNumber or takeaway:true is required', 422);

  if (!supabase) {
    const newOrder = {
      id: `o-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant_id: tenantId,
      table_number: body.tableNumber ?? null,
      cover_count: body.coverCount ?? null,
      server_name: body.serverName ?? 'AI Assistant',
      status: 'open',
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: new Date().toISOString(),
      items: []
    };
    mockOrders.push(newOrder);
    return ok(c, newOrder, 201);
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .insert({
      tenant_id:    tenantId,
      table_number: body.tableNumber ?? null,
      cover_count:  body.coverCount  ?? null,
      server_name:  body.serverName  ?? null,
      status:       'open',
      subtotal:     0,
      tax:          0,
      total:        0,
    })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// POST /v1/orders/:id/items
ordersRoutes.post('/:id/items', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

    const price = body.unitPrice ?? 0;
    const quantity = body.quantity ?? 1;
    const lineTotal = price * quantity;

    const newItem = {
      id: `li-${Math.floor(10000 + Math.random() * 90000)}`,
      order_id: id,
      menu_item_id: body.menuItemId,
      name: body.name,
      quantity,
      unit_price: price,
      line_total: lineTotal,
      station: body.station ?? 'hot',
      course_number: body.courseNumber ?? 1,
      notes: body.notes ?? null,
    };

    order.items = order.items || [];
    order.items.push(newItem);
    const activeItems = order.items.filter((i: any) => !i.is_voided);
    const taxResult = calculateMultiRateTax(
      activeItems.map((i: any) => ({
        name: i.name,
        station: i.station,
        category: i.category,
        lineTotalCents: i.line_total,
      }))
    );
    order.subtotal = taxResult.subtotalCents;
    order.tax = taxResult.totalTaxCents;
    order.total = taxResult.totalCents;

    return ok(c, newItem, 201);
  }

  const { data, error } = await supabase
    .from('pos_order_line_items')
    .insert({
      tenant_id:     tenantId,
      order_id:      id,
      menu_item_id:  body.menuItemId,
      name:          body.name,
      quantity:      body.quantity ?? 1,
      unit_price:    body.unitPrice,
      line_total:    body.unitPrice * (body.quantity ?? 1),
      station:       body.station ?? 'hot',
      course_number: body.courseNumber ?? 1,
      notes:         body.notes ?? null,
    })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);

  // Update order subtotal and multi-rate tax
  const { data: items } = await supabase
    .from('pos_order_line_items')
    .select('name, station, line_total, is_voided')
    .eq('order_id', id)
    .neq('is_voided', true);

  const taxResult = calculateMultiRateTax(
    (items ?? []).map((i: any) => ({
      name: i.name,
      station: i.station,
      lineTotalCents: i.line_total,
    }))
  );

  await supabase
    .from('pos_orders')
    .update({
      subtotal: taxResult.subtotalCents,
      tax: taxResult.totalTaxCents,
      total: taxResult.totalCents,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  return ok(c, data, 201);
});

// GET /v1/orders
ordersRoutes.get('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const status    = c.req.query('status');

  if (!supabase) {
    let list = mockOrders.filter(o => o.tenant_id === tenantId);
    if (status) list = list.filter(o => o.status === status);
    else list = list.filter(o => ['open','sent','in-progress','ready'].includes(o.status));
    return ok(c, list);
  }

  let q = supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  else q = q.in('status', ['open','sent','in-progress','ready']);

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/orders/:id
ordersRoutes.get('/:id', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    return ok(c, order);
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  return ok(c, data);
});

// PATCH /v1/orders/:id/send
// Body (optional, demo/offline): { order: { tableNumber, serverName, items, createdAt } }
// When Supabase is offline, client may supply the order snapshot so KDS mock store updates.
ordersRoutes.patch('/:id/send', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();
  const body      = await c.req.json().catch(() => ({} as any));

  if (!supabase) {
    let order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);

    // Accept client-provided snapshot when order lives only in the POS browser mock DB
    if (!order && body?.order?.items) {
      order = {
        id,
        tenant_id: tenantId,
        table_number: body.order.tableNumber ?? null,
        server_name: body.order.serverName ?? null,
        status: 'open',
        created_at: body.order.createdAt ?? new Date().toISOString(),
        items: (body.order.items as any[]).map((li: any) => ({
          id: li.lineItemId ?? li.id ?? crypto.randomUUID(),
          menu_item_id: li.menuItemId,
          name: li.name,
          quantity: li.quantity,
          station: li.station ?? 'hot',
          course_number: li.courseNumber ?? 1,
          modifiers: li.modifiers ?? [],
          notes: li.notes ?? null,
          recipe_id: li.recipeId,
          unit_price: li.unitPrice ?? li.unit_price ?? 0,
          line_total: (li.unitPrice ?? li.unit_price ?? 0) * (li.quantity ?? 1),
        })),
      };
      mockOrders.push(order);
    }

    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    if (order.status === 'sent') {
      return ok(c, { orderId: id, status: 'sent', ticketCount: 0, alreadySent: true });
    }
    if (order.status !== 'open') {
      return err(c, 'CONFLICT', `Order is already ${order.status}`, 409);
    }

    order.status = 'sent';
    order.fired_at = new Date().toISOString();

    // Live 86 Inventory Countdown decrementing
    const decrements = (order.items ?? []).map((li: any) => {
      const { item, is86 } = decrementMock86(li.name, li.quantity || 1);
      return {
        itemName: li.name,
        countRemaining: item?.countRemaining ?? null,
        is86,
      };
    });

    const items = mapLineItemsToEventPayload(order.items ?? []);
    const tickets = createMockTicketsFromOrder({
      tenantId,
      orderId: id,
      tableNumber: order.table_number,
      items,
    });

    console.log(`[mock event-bus] pos:order:created → ${tickets.length} kitchen ticket(s) for ${id}`);
    return ok(c, { orderId: id, status: 'sent', ticketCount: tickets.length, decrements });
  }

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  if (!['open'].includes(order.status))
    return err(c, 'CONFLICT', `Order is already ${order.status}`, 409);

  await supabase
    .from('pos_orders')
    .update({ status: 'sent', fired_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  // Supabase 86 decrementing
  const decrements: any[] = [];
  for (const item of order.items || []) {
    if (item.menu_item_id) {
      const { data: mItem } = await supabase
        .from('menu_items')
        .select('id, name, count_remaining, status')
        .eq('id', item.menu_item_id)
        .eq('tenant_id', tenantId)
        .single();

      if (mItem && mItem.count_remaining !== null) {
        const newCount = Math.max(0, mItem.count_remaining - (item.quantity || 1));
        const is86 = newCount <= 0;
        await supabase
          .from('menu_items')
          .update({
            count_remaining: newCount,
            status: is86 ? '86d' : mItem.status,
            is_available: !is86,
          })
          .eq('id', item.menu_item_id)
          .eq('tenant_id', tenantId);

        decrements.push({
          menuItemId: item.menu_item_id,
          itemName: mItem.name,
          countRemaining: newCount,
          is86,
        });
      }
    }
  }

  const items = mapLineItemsToEventPayload(order.items ?? []);
  await emitOrderCreated({
    tenantId,
    orderId: id,
    tableNumber: order.table_number,
    serverName: order.server_name,
    createdAt: order.created_at,
    items,
  });

  return ok(c, { orderId: id, status: 'sent', decrements });
});

// POST /v1/orders/:id/fire-course
ordersRoutes.post('/:id/fire-course', async (c) => {
  const supabase    = c.get('supabase');
  const tenantId    = c.get('tenantId');
  const { id }      = c.req.param();
  const body        = await c.req.json();

  if (!body.courseNumber)
    return err(c, 'VALIDATION_ERROR', 'courseNumber is required', 422);

  const courseNumber = Number(body.courseNumber);
  if (isNaN(courseNumber) || courseNumber < 2)
    return err(c, 'VALIDATION_ERROR', 'courseNumber must be 2 or greater', 422);

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    return ok(c, { orderId: id, courseNumber, firedTickets: 1, firedBy: body.serverName ?? 'server' });
  }

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders').select('id, status').eq('id', id).eq('tenant_id', tenantId).single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  if (['paid','voided'].includes(order.status))
    return err(c, 'CONFLICT', `Cannot fire course on a ${order.status} order`, 409);

  const now = new Date().toISOString();
  const { data: heldTickets, error: heldErr } = await supabase
    .from('kitchen_tickets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_id', id)
    .eq('course_number', courseNumber)
    .eq('course_hold_status', 'held');

  if (heldErr) return err(c, 'INTERNAL_ERROR', heldErr.message, 500);
  if (!heldTickets || heldTickets.length === 0)
    return err(c, 'NOT_FOUND', `No held tickets for course ${courseNumber} on order ${id}`, 404);

  const heldIds = heldTickets.map((t: any) => t.id);

  await supabase
    .from('kitchen_tickets')
    .update({ course_hold_status: 'fired', status: 'queued', fired_at: now })
    .in('id', heldIds)
    .eq('tenant_id', tenantId);

  await supabase.from('course_fire_log').insert({
    tenant_id:     tenantId,
    order_id:      id,
    course_number: courseNumber,
    fired_by:      body.serverName ?? 'server',
    fired_at:      now,
    ticket_ids:    heldIds,
  });

  await handleIncomingEvent({
    eventId:   crypto.randomUUID(),
    eventType: 'kds:course:fired',
    tenantId,
    source:    'pos',
    timestamp: now,
    version:   1,
    payload: {
      orderId:        id,
      courseNumber,
      firedTicketIds: heldIds,
      firedBy:        body.serverName ?? 'server',
    },
  });

  return ok(c, {
    orderId:     id,
    courseNumber,
    firedTickets: heldIds.length,
    firedBy:     body.serverName ?? 'server',
  });
});

// PATCH /v1/orders/:id/void
ordersRoutes.patch('/:id/void', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  let order: any = null;
  if (!supabase) {
    order = mockOrders.find((o) => o.id === id && o.tenant_id === tenantId);
  } else {
    const { data, error } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_line_items(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    if (error || !data) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    order = data;
  }

  if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

  // Security Gate: Check if order is post-send
  const postSend = isPostSendStatus(order.status);
  let managerInfo: { managerId: string; managerName: string } = { managerId: 'system', managerName: 'Manager' };

  if (postSend) {
    const pin = String(body.managerPin || body.pin || '').trim();
    if (!pin) {
      return err(c, 'MANAGER_PIN_REQUIRED', 'Manager PIN is required to void an order that was sent to the kitchen', 403);
    }
    const authResult = await verifyManagerPinDirectly(tenantId, pin);
    if (!authResult.authorized) {
      return err(c, 'FORBIDDEN', authResult.error || 'Invalid manager authorization PIN', 403);
    }
    managerInfo = {
      managerId: authResult.managerId || 'manager',
      managerName: authResult.managerName || 'Manager',
    };
  }

  const reasonCode = body.reasonCode || body.reason || 'customer_change';
  const isCooked = body.isCooked !== undefined ? Boolean(body.isCooked) : postSend;

  // Automated Waste Debiting on Post-Send Voids (F3.2)
  if (isCooked && order.items && order.items.length > 0) {
    const activeItems = order.items.filter((i: any) => !i.is_voided);
    for (const item of activeItems) {
      const wasteEvents = calculateVoidWaste(
        {
          itemName: item.name,
          quantity: item.quantity || 1,
          unitPriceCents: item.unit_price || item.unitPrice || 0,
          reasonCode,
          isCooked: true,
          notes: body.notes,
        },
        tenantId,
        {
          orderId: id,
          lineItemId: item.id,
          createdBy: managerInfo.managerId,
        }
      );

      if (supabase && wasteEvents.length > 0) {
        try {
          await supabase.from('waste_events').insert(
            wasteEvents.map((w: any) => ({
              id: w.id,
              tenant_id: w.tenantId,
              ingredient: w.ingredient,
              quantity_grams: w.quantityGrams,
              cost_per_gram: w.costPerGram,
              waste_cost: w.wasteCost,
              reason: w.reason,
              notes: w.notes,
              log_date: w.logDate,
              created_at: w.createdAt,
            }))
          );
        } catch (e) {
          // Non-blocking DB write
        }
      }
    }
  }

  // Audit trail logging
  if (postSend) {
    await logAuditTrail(supabase, {
      tenantId,
      managerId: managerInfo.managerId,
      managerName: managerInfo.managerName,
      action: 'post_send_void',
      targetType: 'order',
      targetId: id,
      reasonCode,
      reasonDescription: `Voided order ${id} (status was ${order.status})`,
      amountCents: order.total || order.subtotal || 0,
      notes: body.notes,
    });
  }

  const now = new Date().toISOString();
  if (!supabase) {
    order.status = 'voided';
    order.void_reason = reasonCode;
    order.voided_at = now;
    return ok(c, order);
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .update({ status: 'voided', void_reason: reasonCode, voided_at: now })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

  await supabase
    .from('kitchen_tickets')
    .update({ status: 'voided' })
    .eq('tenant_id', tenantId)
    .eq('order_id', id)
    .not('status', 'in', '("bumped","voided")');

  return ok(c, data);
});

// PATCH /v1/orders/:id/items/:itemId/void
ordersRoutes.patch('/:id/items/:itemId/void', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id, itemId } = c.req.param();
  const body = await c.req.json().catch(() => ({}));

  let order: any = null;
  let item: any = null;

  if (!supabase) {
    order = mockOrders.find((o) => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    item = order.items?.find((i: any) => i.id === itemId);
    if (!item) return err(c, 'NOT_FOUND', `Item ${itemId} not found`, 404);
  } else {
    const { data: parent, error: parentErr } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_line_items(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (parentErr || !parent) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    order = parent;
    item = parent.items?.find((i: any) => i.id === itemId);
    if (!item) return err(c, 'NOT_FOUND', `Item ${itemId} not found`, 404);
  }

  const postSend = isPostSendStatus(order.status);
  let managerInfo: { managerId: string; managerName: string } = { managerId: 'system', managerName: 'Manager' };

  if (postSend) {
    const pin = String(body.managerPin || body.pin || '').trim();
    if (!pin) {
      return err(c, 'MANAGER_PIN_REQUIRED', 'Manager PIN is required to void a line item on a sent order', 403);
    }
    const authResult = await verifyManagerPinDirectly(tenantId, pin);
    if (!authResult.authorized) {
      return err(c, 'FORBIDDEN', authResult.error || 'Invalid manager authorization PIN', 403);
    }
    managerInfo = {
      managerId: authResult.managerId || 'manager',
      managerName: authResult.managerName || 'Manager',
    };
  }

  const reasonCode = body.reasonCode || body.reason || 'kitchen_error';
  const isCooked = body.isCooked !== undefined ? Boolean(body.isCooked) : postSend;

  // Automated Waste Debiting (F3.2)
  if (isCooked) {
    const wasteEvents = calculateVoidWaste(
      {
        itemName: item.name,
        quantity: item.quantity || 1,
        unitPriceCents: item.unit_price || item.unitPrice || 0,
        reasonCode,
        isCooked: true,
        notes: body.notes,
      },
      tenantId,
      {
        orderId: id,
        lineItemId: itemId,
        createdBy: managerInfo.managerId,
      }
    );

    if (supabase && wasteEvents.length > 0) {
      try {
        await supabase.from('waste_events').insert(
          wasteEvents.map((w: any) => ({
            id: w.id,
            tenant_id: w.tenantId,
            ingredient: w.ingredient,
            quantity_grams: w.quantityGrams,
            cost_per_gram: w.costPerGram,
            waste_cost: w.wasteCost,
            reason: w.reason,
            notes: w.notes,
            log_date: w.logDate,
            created_at: w.createdAt,
          }))
        );
      } catch (e) {
        // Non-blocking
      }
    }
  }

  // Audit trail logging
  if (postSend) {
    await logAuditTrail(supabase, {
      tenantId,
      managerId: managerInfo.managerId,
      managerName: managerInfo.managerName,
      action: 'item_void',
      targetType: 'line_item',
      targetId: itemId,
      reasonCode,
      reasonDescription: `Voided item "${item.name}" (order ${id})`,
      amountCents: item.line_total || (item.unit_price * (item.quantity || 1)),
      notes: body.notes,
    });
  }

  if (!supabase) {
    item.is_voided = true;
    item.void_reason = reasonCode;

    // Recalculate order subtotal and multi-rate tax
    const activeItems = (order.items || []).filter((i: any) => !i.is_voided);
    const taxResult = calculateMultiRateTax(
      activeItems.map((i: any) => ({
        name: i.name,
        station: i.station,
        category: i.category,
        lineTotalCents: i.line_total || ((i.unit_price ?? i.unitPrice ?? 0) * (i.quantity || 1)),
      }))
    );
    order.subtotal = taxResult.subtotalCents;
    order.tax = taxResult.totalTaxCents;
    order.total = taxResult.totalCents;

    return ok(c, { item, orderTotals: { subtotal: order.subtotal, tax: order.tax, total: order.total } });
  }

  const { data: updatedItem, error: itemErr } = await supabase
    .from('pos_order_line_items')
    .update({ is_voided: true, void_reason: reasonCode })
    .eq('id', itemId)
    .eq('order_id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (itemErr || !updatedItem) return err(c, 'NOT_FOUND', `Item ${itemId} not found`, 404);

  // Recalculate order totals in Supabase
  const { data: remainingItems } = await supabase
    .from('pos_order_line_items')
    .select('name, station, line_total, is_voided')
    .eq('order_id', id)
    .eq('tenant_id', tenantId)
    .neq('is_voided', true);

  const taxResult = calculateMultiRateTax(
    (remainingItems ?? []).map((i: any) => ({
      name: i.name,
      station: i.station,
      lineTotalCents: i.line_total,
    }))
  );

  await supabase
    .from('pos_orders')
    .update({
      subtotal: taxResult.subtotalCents,
      tax: taxResult.totalTaxCents,
      total: taxResult.totalCents,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  return ok(c, {
    item: updatedItem,
    orderTotals: {
      subtotal: taxResult.subtotalCents,
      tax: taxResult.totalTaxCents,
      total: taxResult.totalCents,
    },
  });
});

// POST /v1/orders/drawer/open  (Manual Cash Drawer Pop with Manager Authorization Gate)
ordersRoutes.post('/drawer/open', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{ managerPin?: string; pin?: string; reason?: string; notes?: string }>().catch(() => ({} as any));

  const pin = String(body.managerPin || body.pin || '').trim();
  if (!pin) {
    return err(c, 'MANAGER_PIN_REQUIRED', 'Manager PIN is required to open cash drawer', 403);
  }

  const authResult = await verifyManagerPinDirectly(tenantId, pin);
  if (!authResult.authorized) {
    return err(c, 'FORBIDDEN', authResult.error || 'Invalid manager authorization PIN', 403);
  }

  const reason = body.reason || 'no_sale_open';
  await logAuditTrail(supabase, {
    tenantId,
    managerId: authResult.managerId || 'manager',
    managerName: authResult.managerName || 'Manager',
    action: 'drawer_open',
    targetType: 'drawer',
    reasonCode: reason,
    reasonDescription: 'Manual Cash Drawer Open / No-Sale Override',
    notes: body.notes,
  });

  return ok(c, {
    success: true,
    authorized: true,
    openedAt: new Date().toISOString(),
    managerId: authResult.managerId,
    managerName: authResult.managerName,
    reason,
  });
});

// POST /v1/orders/:id/split
ordersRoutes.post('/:id/split', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const body = await c.req.json<{
    splitType?: 'seat' | 'items' | 'custom';
    partitions?: {
      seatNumber?: number;
      itemIds: string[];
      guestLabel?: string;
    }[];
  }>().catch(() => ({} as any));

  const partitions = Array.isArray(body.partitions) ? body.partitions : [];
  if (partitions.length < 2) {
    return err(c, 'VALIDATION_ERROR', 'At least 2 split partitions are required', 422);
  }

  const allItemIds = partitions.flatMap((p: any) => p.itemIds || []);
  if (allItemIds.length === 0) {
    return err(c, 'VALIDATION_ERROR', 'At least one item must be assigned to partitions', 422);
  }

  if (!supabase) {
    const newOrderIds = partitions.map((_: any, idx: number) => `${id}-split-${idx + 1}`);
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
      originalOrderId: id,
      newOrderIds,
      partitions: partitionResults,
    });
  }

  try {
    const { data: originalOrder, error: orderErr } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_line_items(*)')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (orderErr || !originalOrder) {
      return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
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
          notes: `Split Check ${i + 1}/${partitions.length} from ${id}`,
        })
        .select()
        .single();

      if (createErr || !newOrder) {
        return err(c, 'DB_ERROR', createErr?.message || 'Failed creating split check', 500);
      }

      newOrderIds.push(newOrder.id);

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

    await supabase
      .from('pos_orders')
      .update({ status: 'split' })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    return ok(c, {
      success: true,
      originalOrderId: id,
      newOrderIds,
      partitions: partitionResults,
    });
  } catch (error: any) {
    return err(c, 'INTERNAL_ERROR', error.message || 'Order split failed', 500);
  }
});

export default ordersRoutes;

