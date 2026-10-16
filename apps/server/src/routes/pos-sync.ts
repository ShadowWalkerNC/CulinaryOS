// ============================================================
// CulinaryOS — POS Sync Deltas (offline replay)
// POST /v1/pos/sync-deltas
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const posSyncRoutes = new Hono<Env>();

posSyncRoutes.use('*', requireTenant);

interface OfflineDelta {
  id: string;
  tenant_id: string;
  order_id: string;
  action:
    | 'create_order'
    | 'add_line_item'
    | 'void_line_item'
    | 'apply_discount'
    | 'finalize_payment'
    | 'void_order'
    | 'lock_table'
    | 'transfer_table'
    | 'fire_course';
  payload: Record<string, any>;
  timestamp: string;
  synced?: boolean;
}

function isNonNegativeIntCents(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

posSyncRoutes.post('/sync-deltas', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{ deltas?: OfflineDelta[] }>().catch(() => ({ deltas: [] as OfflineDelta[] }));
  const deltas = Array.isArray(body.deltas) ? body.deltas : [];

  if (deltas.length === 0) {
    return ok(c, { confirmedIds: [], applied: 0 });
  }

  // Sort by timestamp for deterministic replay
  const sorted = [...deltas].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const confirmedIds: string[] = [];
  const failures: { id: string; error: string }[] = [];

  for (const delta of sorted) {
    if (delta.tenant_id && delta.tenant_id !== tenantId) {
      failures.push({ id: delta.id, error: 'tenant_id mismatch' });
      continue;
    }

    try {
      if (delta.action === 'finalize_payment') {
        const method = delta.payload?.method ?? 'cash';
        if (!['cash', 'comp'].includes(method)) {
          failures.push({
            id: delta.id,
            error: 'Only cash/comp payments may be finalized through offline replay; card payments require verified processor settlement',
          });
          continue;
        }
        const amount = delta.payload?.amount ?? delta.payload?.total ?? 0;
        const tip = delta.payload?.tip_amount ?? delta.payload?.tip_cents ?? 0;
        if (!isNonNegativeIntCents(amount) || !isNonNegativeIntCents(tip)) {
          failures.push({
            id: delta.id,
            error: 'Payment amount and tip must be non-negative integer cents',
          });
          continue;
        }
      }

      if (delta.action === 'void_line_item') {
        const itemId = delta.payload?.itemId ?? delta.payload?.item_id ?? delta.payload?.line_item_id;
        if (typeof itemId !== 'string' || itemId.trim().length === 0) {
          failures.push({ id: delta.id, error: 'itemId is required for void_line_item' });
          continue;
        }
      }

      if (!supabase) {
        // Demo mode — accept valid non-card deltas for the tenant
        confirmedIds.push(delta.id);
        continue;
      }

      switch (delta.action) {
        case 'finalize_payment': {
          // Only cash/comp offline finalize — card must go through Stripe capture
          const method = delta.payload?.method ?? 'cash';
          const amount = delta.payload?.amount ?? delta.payload?.total ?? 0;
          const tip = delta.payload?.tip_amount ?? delta.payload?.tip_cents ?? 0;

          const ordersTable: any = supabase.from('pos_orders');
          if (typeof ordersTable.select === 'function') {
            const { data: existingOrder, error: fetchErr } = await ordersTable
              .select('id, tenant_id, total')
              .eq('id', delta.order_id)
              .eq('tenant_id', tenantId)
              .maybeSingle();

            if (fetchErr) {
              failures.push({ id: delta.id, error: fetchErr.message });
              break;
            }
            if (!existingOrder) {
              failures.push({ id: delta.id, error: 'Order not found for tenant' });
              break;
            }
            if (
              typeof existingOrder.total === 'number' &&
              existingOrder.total > 0 &&
              amount !== existingOrder.total
            ) {
              failures.push({
                id: delta.id,
                error: `Payment amount (${amount}) does not match authoritative order total (${existingOrder.total})`,
              });
              break;
            }
          }

          const { error: payErr } = await supabase.from('payments').insert({
            tenant_id: tenantId,
            order_id: delta.order_id,
            amount,
            tip_amount: tip,
            tip_cents: tip,
            method,
            status: 'completed',
            processed_at: delta.timestamp ?? new Date().toISOString(),
            reference_id: delta.id,
          });

          if (payErr && !payErr.message.includes('duplicate')) {
            failures.push({ id: delta.id, error: payErr.message });
            break;
          }

          const { error: orderErr } = await supabase
            .from('pos_orders')
            .update({
              status: 'paid',
              paid_at: delta.timestamp ?? new Date().toISOString(),
              total: amount,
            })
            .eq('id', delta.order_id)
            .eq('tenant_id', tenantId);

          if (orderErr) {
            failures.push({ id: delta.id, error: orderErr.message });
            break;
          }
          confirmedIds.push(delta.id);
          break;
        }

        case 'void_order': {
          const { error } = await supabase
            .from('pos_orders')
            .update({
              status: 'voided',
              void_reason: delta.payload?.reasonCode ?? delta.payload?.reason ?? 'offline_void',
            })
            .eq('id', delta.order_id)
            .eq('tenant_id', tenantId);
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        case 'create_order': {
          const subtotal = delta.payload?.subtotal ?? 0;
          const tax = delta.payload?.tax ?? 0;
          const total = delta.payload?.total ?? 0;
          if (
            !isNonNegativeIntCents(subtotal) ||
            !isNonNegativeIntCents(tax) ||
            !isNonNegativeIntCents(total)
          ) {
            failures.push({ id: delta.id, error: 'Order totals must be non-negative integer cents' });
            break;
          }

          const ordersTable: any = supabase.from('pos_orders');
          if (typeof ordersTable.select === 'function') {
            const { data: existingOrder, error: lookupErr } = await ordersTable
              .select('id, tenant_id')
              .eq('id', delta.order_id)
              .maybeSingle();

            if (lookupErr) {
              failures.push({ id: delta.id, error: lookupErr.message });
              break;
            }
            if (existingOrder && existingOrder.tenant_id !== tenantId) {
              failures.push({ id: delta.id, error: 'Cross-tenant order ID collision rejected' });
              break;
            }
          }

          const orderRow = {
            id: delta.order_id,
            tenant_id: tenantId,
            table_number: delta.payload?.tableNumber ?? delta.payload?.table_number ?? null,
            cover_count: delta.payload?.coverCount ?? delta.payload?.cover_count ?? 1,
            server_name: delta.payload?.serverName ?? delta.payload?.server_name ?? 'POS',
            status: delta.payload?.status ?? 'open',
            subtotal,
            tax,
            total,
            notes: delta.payload?.notes ?? null,
          };

          const { error } = await supabase
            .from('pos_orders')
            .upsert(orderRow, { onConflict: 'id' });
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        case 'add_line_item': {
          const line = delta.payload ?? {};
          const quantity = line.quantity ?? 1;
          const unitPrice = line.unit_price ?? line.unitPrice ?? 0;
          if (
            typeof quantity !== 'number' ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !isNonNegativeIntCents(unitPrice)
          ) {
            failures.push({
              id: delta.id,
              error: 'Line item quantity (>0) and unit_price (>=0) must be integers',
            });
            break;
          }

          const ordersTable: any = supabase.from('pos_orders');
          if (typeof ordersTable.select === 'function') {
            const { data: parentOrder, error: parentErr } = await ordersTable
              .select('id, tenant_id')
              .eq('id', delta.order_id)
              .eq('tenant_id', tenantId)
              .maybeSingle();

            if (parentErr) {
              failures.push({ id: delta.id, error: parentErr.message });
              break;
            }
            if (!parentOrder) {
              failures.push({ id: delta.id, error: 'Parent order not found for tenant' });
              break;
            }
          }

          const computedLineTotal = unitPrice * quantity;
          const { error } = await supabase.from('pos_order_line_items').insert({
            id: line.id,
            tenant_id: tenantId,
            order_id: delta.order_id,
            menu_item_id: line.menu_item_id ?? line.menuItemId ?? null,
            name: line.name ?? 'Item',
            quantity,
            unit_price: unitPrice,
            line_total: computedLineTotal,
            station: line.station ?? 'hot',
            course_number: line.course_number ?? line.courseNumber ?? 1,
            notes: line.notes ?? null,
          });
          if (error && !String(error.message).includes('duplicate')) {
            failures.push({ id: delta.id, error: error.message });
          } else {
            confirmedIds.push(delta.id);
          }
          break;
        }

        case 'void_line_item': {
          const itemId = String(
            delta.payload?.itemId ?? delta.payload?.item_id ?? delta.payload?.line_item_id ?? ''
          ).trim();
          const reasonCode =
            delta.payload?.reasonCode ?? delta.payload?.reason ?? 'offline_void';

          const updateChain: any = supabase
            .from('pos_order_line_items')
            .update({ is_voided: true, void_reason: reasonCode })
            .eq('id', itemId)
            .eq('order_id', delta.order_id)
            .eq('tenant_id', tenantId);

          if (typeof updateChain.select === 'function') {
            const { data: updatedRows, error: voidErr } = await updateChain.select('id');
            if (voidErr) {
              failures.push({ id: delta.id, error: voidErr.message });
              break;
            }
            if (!updatedRows || updatedRows.length === 0) {
              failures.push({ id: delta.id, error: 'Line item not found for tenant order' });
              break;
            }
            confirmedIds.push(delta.id);
          } else {
            const { error: voidErr } = await updateChain;
            if (voidErr) failures.push({ id: delta.id, error: voidErr.message });
            else confirmedIds.push(delta.id);
          }
          break;
        }

        case 'apply_discount': {
          const discountPercent =
            delta.payload?.discount_percent ?? delta.payload?.discountPercent ?? 0;
          const discountFlat =
            delta.payload?.discount_flat ?? delta.payload?.discountFlat ?? 0;
          if (
            typeof discountPercent !== 'number' ||
            !Number.isFinite(discountPercent) ||
            discountPercent < 0 ||
            discountPercent > 100 ||
            !isNonNegativeIntCents(discountFlat)
          ) {
            failures.push({ id: delta.id, error: 'Invalid discount values' });
            break;
          }

          const updatePayload: Record<string, any> = {
            discount_percent: discountPercent,
            discount_flat: discountFlat,
          };
          if (isNonNegativeIntCents(delta.payload?.total)) {
            updatePayload.total = delta.payload.total;
          }

          const { error } = await supabase
            .from('pos_orders')
            .update(updatePayload)
            .eq('id', delta.order_id)
            .eq('tenant_id', tenantId);
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        case 'lock_table': {
          // Edge lock synchronization
          confirmedIds.push(delta.id);
          break;
        }

        case 'transfer_table': {
          const toServer = delta.payload?.toServerName ?? delta.payload?.to_server_name ?? 'Transferred';
          const { error } = await supabase
            .from('pos_orders')
            .update({ server_name: toServer })
            .eq('id', delta.order_id)
            .eq('tenant_id', tenantId);
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        case 'fire_course': {
          const courseNum = delta.payload?.course_number ?? delta.payload?.courseNumber ?? 1;
          const { error } = await supabase
            .from('pos_order_line_items')
            .update({ is_fired: true, fired_at: delta.timestamp })
            .eq('order_id', delta.order_id)
            .eq('course_number', courseNum)
            .eq('tenant_id', tenantId);
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        default:
          failures.push({ id: delta.id, error: `unknown action` });
      }
    } catch (e: any) {
      failures.push({ id: delta.id, error: e?.message ?? 'apply failed' });
    }
  }

  return ok(c, {
    confirmedIds,
    applied: confirmedIds.length,
    failures,
  });
});

export default posSyncRoutes;
