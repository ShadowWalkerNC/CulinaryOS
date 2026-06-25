// ============================================================
// Handler: pos:menu:item-sold
//
// When an item is sold via POS:
//   - Forward to RecipeOS to decrement pantry stock
//   - Only fires if the item has a recipeId
// ============================================================

import type { EventHandler } from '../broker';
import type { MenuItemSoldPayload, DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

export const handleMenuItemSold: EventHandler<MenuItemSoldPayload> = async (
  event: DomainEvent<MenuItemSoldPayload>,
  _supabase: SupabaseClient
) => {
  const { menuItemId, recipeId, quantity, soldAt } = event.payload;

  // No recipeId = no pantry link, nothing to do
  if (!recipeId) return;

  const recipeOsUrl = process.env.RECIPEOS_URL ?? 'http://localhost:3001';

  try {
    await fetch(`${recipeOsUrl}/v1/pantry/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': event.tenantId,
        'X-Caller-Service': 'culinaryos',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
      },
      body: JSON.stringify({ recipeId, quantity, soldAt }),
    });
    console.log(`[pos:menu:item-sold] Deducted pantry for recipe ${recipeId} x${quantity}`);
  } catch (err: any) {
    // RecipeOS being down doesn't break POS — log and move on
    console.warn(`[pos:menu:item-sold] RecipeOS deduct failed (non-fatal): ${err.message}`);
  }
};
