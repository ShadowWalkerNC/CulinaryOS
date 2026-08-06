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
  action: 'create_order' | 'add_line_item' | 'apply_discount' | 'finalize_payment' | 'void_order';
  payload: Record<string, any>;
  timestamp: string;
  synced?: boolean;
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
      if (!supabase) {
        // Demo mode — accept all deltas for the tenant
        confirmedIds.push(delta.id);
        continue;
      }

      switch (delta.action) {
        case 'finalize_payment': {
          // Only cash/comp offline finalize — card must go through Stripe capture
          const method = delta.payload?.method ?? 'cash';
          if (method === 'card' && !delta.payload?.allow_offline_card) {
            failures.push({ id: delta.id, error: 'card payments require online capture' });
            break;
          }

          const amount = delta.payload?.amount ?? delta.payload?.total ?? 0;
          const tip = delta.payload?.tip_amount ?? delta.payload?.tip_cents ?? 0;

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
              void_reason: delta.payload?.reason ?? 'offline_void',
            })
            .eq('id', delta.order_id)
            .eq('tenant_id', tenantId);
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        case 'create_order': {
          const { error } = await supabase.from('pos_orders').upsert({
            id: delta.order_id,
            tenant_id: tenantId,
            table_number: delta.payload?.tableNumber ?? delta.payload?.table_number ?? null,
            cover_count: delta.payload?.coverCount ?? 1,
            server_name: delta.payload?.serverName ?? 'POS',
            status: delta.payload?.status ?? 'open',
            subtotal: delta.payload?.subtotal ?? 0,
            tax: delta.payload?.tax ?? 0,
            total: delta.payload?.total ?? 0,
            notes: delta.payload?.notes ?? null,
          }, { onConflict: 'id' });
          if (error) failures.push({ id: delta.id, error: error.message });
          else confirmedIds.push(delta.id);
          break;
        }

        case 'add_line_item': {
          const line = delta.payload ?? {};
          const { error } = await supabase.from('pos_order_line_items').insert({
            id: line.id,
            tenant_id: tenantId,
            order_id: delta.order_id,
            menu_item_id: line.menu_item_id ?? line.menuItemId ?? null,
            name: line.name ?? 'Item',
            quantity: line.quantity ?? 1,
            unit_price: line.unit_price ?? line.unitPrice ?? 0,
            line_total: line.line_total ?? line.lineTotal ?? 0,
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

        case 'apply_discount': {
          const { error } = await supabase
            .from('pos_orders')
            .update({
              discount_percent: delta.payload?.discount_percent ?? delta.payload?.discountPercent ?? 0,
              discount_flat: delta.payload?.discount_flat ?? delta.payload?.discountFlat ?? 0,
              total: delta.payload?.total,
            })
            .eq('id', delta.order_id)
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
