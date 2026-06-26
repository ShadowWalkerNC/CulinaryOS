import type { SupabaseClient } from '@supabase/supabase-js';

interface LowStockPayload {
  ingredientId:   string;
  ingredientName: string;
  currentQty:     number;
  reorderAt:      number;
  reorderQty:     number;
  unit:           string;
  supplier?:      string;
}

/**
 * Handles recipeos:pantry:low-stock events.
 *
 * Strategy:
 *  1. Check if an open (draft/approved) PO already contains this ingredient.
 *     If yes, skip — avoid duplicate POs for the same item.
 *  2. If no open PO covers it, create a draft PO with a single line
 *     using the ingredient’s reorder_qty and cost_per_unit.
 *
 * The admin can then review, merge, approve and send from the dashboard.
 */
export async function handlePantryLowStock(
  supabase:  SupabaseClient,
  tenantId:  string,
  payload:   LowStockPayload
): Promise<void> {
  // 1. Is there already an open PO covering this ingredient?
  const { data: existingLines } = await supabase
    .from('po_line_items')
    .select('id, po_id, restock_purchase_orders!inner(status)')
    .eq('ingredient_id', payload.ingredientId)
    .in('restock_purchase_orders.status', ['draft', 'approved', 'sent']);

  if (existingLines && existingLines.length > 0) {
    console.log(
      `[PantryHandler] Ingredient ${payload.ingredientName} already covered by open PO — skipping`
    );
    return;
  }

  // 2. Generate PO number
  const { data: poNumber } = await supabase
    .rpc('next_po_number', { p_tenant_id: tenantId });

  // 3. Create draft PO header
  const { data: po, error: poErr } = await supabase
    .from('restock_purchase_orders')
    .insert({
      tenant_id:  tenantId,
      po_number:  poNumber ?? `PO-AUTO-${Date.now()}`,
      supplier:   payload.supplier ?? null,
      notes:      `Auto-generated from low-stock alert: ${payload.ingredientName}`,
      created_by: 'event-bus',
    })
    .select()
    .single();

  if (poErr || !po) {
    console.error('[PantryHandler] Failed to create draft PO:', poErr?.message);
    return;
  }

  // 4. Fetch current ingredient cost
  const { data: ing } = await supabase
    .from('ingredients')
    .select('cost_per_unit')
    .eq('id', payload.ingredientId)
    .single();

  const unitCost = ing?.cost_per_unit ?? 0;

  // 5. Insert PO line item
  await supabase.from('po_line_items').insert({
    po_id:           po.id,
    ingredient_id:   payload.ingredientId,
    ingredient_name: payload.ingredientName,
    unit:            payload.unit,
    ordered_qty:     payload.reorderQty,
    unit_cost:       unitCost,
  });

  // 6. Update total_cost on the PO
  await supabase
    .from('restock_purchase_orders')
    .update({ total_cost: payload.reorderQty * unitCost })
    .eq('id', po.id);

  console.log(
    `[PantryHandler] Draft PO ${po.po_number} created for ${payload.ingredientName} ×${payload.reorderQty}${payload.unit}`
  );
}
