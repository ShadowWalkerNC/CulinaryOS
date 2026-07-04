// ============================================================
// Handler: recipeos:pantry:low-stock
// Migrated from backend/event-bus/handlers/recipeos-pantry-low-stock.ts
//
// Logs low-stock alert to console.
// TODO: push to Supabase Realtime 'alerts:{tenantId}' for admin dashboard
// ============================================================

import type { EventHandler } from '../broker';
import type { LowStockPayload, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = any;

export const handleLowStock: EventHandler<LowStockPayload> = async (
  event: DomainEvent<LowStockPayload>,
  _supabase: SupabaseClient
) => {
  const { ingredientName, currentQty, unit, reorderAt } = event.payload;

  console.warn(
    `[recipeos:pantry:low-stock] LOW STOCK: ${ingredientName} — ` +
    `${currentQty}${unit} remaining (reorder at ${reorderAt}${unit})`
  );

  // TODO: push to Supabase Realtime channel `alerts:${event.tenantId}` for admin dashboard
};
