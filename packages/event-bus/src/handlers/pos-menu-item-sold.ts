// ============================================================
// Handler: pos:menu:item-sold
// Deducts pantry stock via CulinaryOS /v1/pantry/deduct.
// RecipeOS used to own this endpoint; pantry now lives on apps/server.
// Failure is non-fatal — logs a warning and continues.
// ============================================================

import type { EventHandler } from '../broker';
import type { MenuItemSoldPayload, DomainEvent } from '../types';

type SupabaseClient = any;

export const handleMenuItemSold: EventHandler<MenuItemSoldPayload> = async (
  event: DomainEvent<MenuItemSoldPayload>,
  _supabase: SupabaseClient
) => {
  const { recipeId, quantity, soldAt, menuItemId } = event.payload as MenuItemSoldPayload & {
    menuItemId?: string;
  };
  // Prefer explicit pantry item id; recipeId is accepted as itemId for demo links
  const itemId = (event.payload as { itemId?: string }).itemId ?? recipeId ?? menuItemId;
  if (!itemId) return;

  const base =
    process.env.CULINARYOS_URL ??
    (process.env.CULINARYOS_HOST?.startsWith('http')
      ? process.env.CULINARYOS_HOST
      : process.env.CULINARYOS_HOST
        ? `https://${process.env.CULINARYOS_HOST}`
        : 'http://localhost:3000');

  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/pantry/deduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': event.tenantId,
        'X-Caller-Service': 'culinaryos',
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY ?? process.env.DEVICE_API_KEY ?? ''}`,
      },
      body: JSON.stringify({
        itemId,
        quantity,
        reason: 'sale',
        referenceId: recipeId ?? null,
        soldAt,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(
        `[pos:menu:item-sold] Pantry deduct failed (${res.status}) for ${itemId}: ${text}`
      );
      return;
    }
    console.log(`[pos:menu:item-sold] Deducted pantry for item ${itemId} x${quantity}`);
  } catch (err: any) {
    console.warn(`[pos:menu:item-sold] Pantry deduct failed (non-fatal): ${err.message}`);
  }
};
