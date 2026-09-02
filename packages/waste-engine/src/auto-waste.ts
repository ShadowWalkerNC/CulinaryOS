// ============================================================
// @culinaryops/waste-engine — Automated Waste Debiting on Voids
// Pure functions to calculate waste events, ingredient scrap loss,
// and dollar variance when cooked/fired items or orders are voided.
// ============================================================

export interface VoidRecipeIngredient {
  ingredient: string;
  quantityGrams: number;
  costPerGram: number;
}

export interface VoidItemWasteParams {
  menuItemId?: string;
  itemName: string;
  quantity: number;
  unitPriceCents: number;
  reasonCode: 'customer_change' | 'kitchen_error' | 'damaged' | 'spill' | 'wrong_order' | 'cold_food' | '86d_after_order' | string;
  isCooked: boolean;
  notes?: string;
  recipeIngredients?: VoidRecipeIngredient[];
}

export interface VoidWasteEventRecord {
  id: string;
  tenantId: string;
  ingredient: string;
  quantityGrams: number;
  costPerGram: number;
  wasteCost: number; // in dollars for DB consistency
  wasteCostCents: number;
  reason: string;
  reasonCode: string;
  notes: string;
  orderId?: string;
  lineItemId?: string;
  isCooked: boolean;
  logDate: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * Check if an order status is already post-send (sent to kitchen or in cooking/ready state).
 */
export function isPostSendStatus(status: string): boolean {
  return ['sent', 'in-progress', 'ready', 'served'].includes(status.toLowerCase());
}

/**
 * Map UI void reason codes to human-readable audit descriptions and waste categories.
 */
export function formatVoidReasonDescription(reasonCode: string): string {
  const map: Record<string, string> = {
    customer_change: 'Customer Changed Mind (Post-Send)',
    kitchen_error: 'Kitchen Preparation Error / Wrong Item',
    damaged: 'Item Dropped or Physically Damaged',
    spill: 'Beverage or Food Spill Incident',
    wrong_order: 'Order Entry Mistake',
    cold_food: 'Customer Returned / Cold Food',
    '86d_after_order': 'Inventory Depleted (86ed After Order)',
    other: 'Other Manager Authorized Override',
  };
  return map[reasonCode] || reasonCode;
}

/**
 * Calculate waste events for a voided item.
 * If isCooked is false, food was never prepared and no inventory was wasted (returns []).
 * If isCooked is true, computes exact recipe ingredient depletion or food-cost estimation.
 */
export function calculateVoidWaste(
  params: VoidItemWasteParams,
  tenantId: string,
  opts?: {
    orderId?: string;
    lineItemId?: string;
    createdBy?: string;
    logDate?: string;
  }
): VoidWasteEventRecord[] {
  if (!params.isCooked) {
    return [];
  }

  const quantity = Math.max(1, params.quantity || 1);
  const now = new Date().toISOString();
  const logDate = opts?.logDate || now.split('T')[0]!;
  const reasonCode = params.reasonCode || 'kitchen_error';
  const reasonDesc = formatVoidReasonDescription(reasonCode);

  // If explicit recipe ingredients are provided (from RecipeOS bridge or DB)
  if (params.recipeIngredients && params.recipeIngredients.length > 0) {
    return params.recipeIngredients.map((ing) => {
      const totalGrams = Math.round(ing.quantityGrams * quantity * 100) / 100;
      const costPerGram = ing.costPerGram || 0;
      const wasteCostDollars = Math.round(totalGrams * costPerGram * 100) / 100;
      const wasteCostCents = Math.round(wasteCostDollars * 100);

      const record: VoidWasteEventRecord = {
        id: crypto.randomUUID(),
        tenantId,
        ingredient: ing.ingredient,
        quantityGrams: totalGrams,
        costPerGram,
        wasteCost: wasteCostDollars,
        wasteCostCents,
        reason: 'void_cooked',
        reasonCode,
        notes: `Post-send void for ${quantity}x "${params.itemName}": ${reasonDesc}. ${params.notes || ''}`.trim(),
        isCooked: true,
        logDate,
        createdAt: now,
      };
      if (opts?.orderId) record.orderId = opts.orderId;
      if (opts?.lineItemId) record.lineItemId = opts.lineItemId;
      if (opts?.createdBy) record.createdBy = opts.createdBy;
      return record;
    });
  }

  // Standard Food Cost estimation (industry standard ~30% theoretical food cost of item retail price)
  // Standard portion size default: 250 grams per portion
  const unitPriceDollars = (params.unitPriceCents || 0) / 100;
  const theoreticalCostDollars = Math.round(unitPriceDollars * 0.3 * quantity * 100) / 100;
  const portionGrams = 250 * quantity;
  const costPerGram = portionGrams > 0 ? Math.round((theoreticalCostDollars / portionGrams) * 10000) / 10000 : 0.01;

  const defaultRecord: VoidWasteEventRecord = {
    id: crypto.randomUUID(),
    tenantId,
    ingredient: params.itemName,
    quantityGrams: portionGrams,
    costPerGram,
    wasteCost: theoreticalCostDollars,
    wasteCostCents: Math.round(theoreticalCostDollars * 100),
    reason: 'void_cooked',
    reasonCode,
    notes: `Post-send void for ${quantity}x "${params.itemName}": ${reasonDesc}. ${params.notes || ''}`.trim(),
    isCooked: true,
    logDate,
    createdAt: now,
  };
  if (opts?.orderId) defaultRecord.orderId = opts.orderId;
  if (opts?.lineItemId) defaultRecord.lineItemId = opts.lineItemId;
  if (opts?.createdBy) defaultRecord.createdBy = opts.createdBy;

  return [defaultRecord];
}
