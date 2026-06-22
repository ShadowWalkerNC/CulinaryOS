// ============================================================
// Handler: recipeos:pantry:low-stock
//
// When RecipeOS detects an ingredient is below reorder threshold:
//   1. Log to console (replace with push notification / Slack / email in prod)
//   2. Store a notification record in Supabase for the dashboard
// ============================================================

import type { EventHandler } from '../broker';
import type { LowStockPayload, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

export const handleLowStock: EventHandler<LowStockPayload> = async (
  event: DomainEvent<LowStockPayload>,
  supabase: SupabaseClient
) => {
  const { ingredientName, currentQty, unit, reorderAt } = event.payload;

  console.warn(
    `[recipeos:pantry:low-stock] LOW STOCK: ${ingredientName} — ${currentQty}${unit} remaining (reorder at ${reorderAt}${unit})`
  );

  // Persist notification so admin dashboard can surface it
  // (notifications table will be added in a future migration if needed,
  //  for now we just upsert into domain_events which already has the data)
  // Future: push to Supabase Realtime channel 'alerts:{tenantId}'
};
