// ============================================================
// Handler: prep.task.completed (Milestone 6.2)
// Decrements raw ingredient inventory when a shift prep task
// is completed and triggers low-stock alerts if <= reorder_at.
// ============================================================

import type { EventHandler } from '../broker';
import type { DomainEvent } from '../types';
import { handleLowStock } from './recipeos-pantry-low-stock';

export interface PrepTaskDecrementItem {
  ingredient: string;
  quantity: number;
  unit?: string;
  ingredientId?: string;
}

export interface PrepTaskCompletedEventPayload {
  taskId: string;
  completedAt: string;
  decrements: PrepTaskDecrementItem[];
  recipeId?: string;
  recipeName?: string;
  completedBy?: string;
}

export const handlePrepTaskCompleted: EventHandler<PrepTaskCompletedEventPayload> = async (
  event: DomainEvent<PrepTaskCompletedEventPayload>,
  supabase: any
) => {
  const decrements = Array.isArray(event.payload?.decrements) ? event.payload.decrements : [];
  if (decrements.length === 0 || !supabase) return;

  for (const dec of decrements) {
    const qty = Number(dec.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) continue;

    try {
      const table = supabase.from('pantry_items');
      if (!table || typeof table.select !== 'function') continue;

      let query = table.select('id, name, current_qty, reorder_at, unit').eq('tenant_id', event.tenantId);
      if (dec.ingredientId) {
        query = query.eq('id', dec.ingredientId);
      } else if (dec.ingredient) {
        query = query.ilike ? query.ilike('name', dec.ingredient) : query.eq('name', dec.ingredient);
      }

      const { data: item } = await (query.maybeSingle ? query.maybeSingle() : query.single());
      if (!item) continue;

      const currentQty = Number(item.current_qty ?? 0);
      const nextQty = Math.max(0, Number((currentQty - qty).toFixed(4)));
      const reorderAt = Number(item.reorder_at ?? 0);

      await supabase
        .from('pantry_items')
        .update({ current_qty: nextQty, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('tenant_id', event.tenantId);

      if (reorderAt > 0 && nextQty <= reorderAt) {
        await handleLowStock(
          {
            eventId: `${event.eventId}-low-${item.id}`,
            eventType: 'recipeos:pantry:low-stock',
            tenantId: event.tenantId,
            source: 'prep-engine',
            timestamp: new Date().toISOString(),
            version: 1,
            payload: {
              ingredientId: String(item.id),
              ingredientName: String(item.name ?? dec.ingredient),
              currentQty: nextQty,
              unit: String(item.unit ?? dec.unit ?? 'units'),
              reorderAt,
            },
          },
          supabase
        );
      }
    } catch (err: any) {
      console.warn(`[prep.task.completed] Non-fatal inventory decrement warning: ${err?.message ?? err}`);
    }
  }
};
