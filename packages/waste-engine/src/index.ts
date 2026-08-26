/**
 * @culinaryops/waste-engine
 * Pure functions for waste log analysis and reduction scoring.
 */

export interface WasteEntry {
  date: string;        // YYYY-MM-DD
  ingredient: string;
  quantity: number;    // grams
  reason: 'spoilage' | 'trim' | 'overcook' | 'drop' | 'expired' | 'other';
  costPerGram: number;
}

export interface WasteSummary {
  totalGrams: number;
  totalCost: number;
  byReason: Record<string, { grams: number; cost: number }>;
  topWastedIngredients: Array<{ ingredient: string; grams: number; cost: number }>;
}

/** Summarize waste entries over a period. */
export function summarizeWaste(entries: WasteEntry[]): WasteSummary {
  const byReason: Record<string, { grams: number; cost: number }> = {};
  const byIngredient: Record<string, { grams: number; cost: number }> = {};
  let totalGrams = 0;
  let totalCost  = 0;

  for (const e of entries) {
    const cost = e.quantity * e.costPerGram;
    totalGrams += e.quantity;
    totalCost  += cost;

    byReason[e.reason] ??= { grams: 0, cost: 0 };
    byReason[e.reason].grams += e.quantity;
    byReason[e.reason].cost  += cost;

    byIngredient[e.ingredient] ??= { grams: 0, cost: 0 };
    byIngredient[e.ingredient].grams += e.quantity;
    byIngredient[e.ingredient].cost  += cost;
  }

  const topWastedIngredients = Object.entries(byIngredient)
    .map(([ingredient, v]) => ({ ingredient, ...v }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return {
    totalGrams: Math.round(totalGrams),
    totalCost:  Math.round(totalCost * 100) / 100,
    byReason,
    topWastedIngredients,
  };
}

/** Calculate waste as a percentage of total food cost. */
export function wastePct(totalWasteCost: number, totalFoodCost: number): number {
  if (totalFoodCost === 0) return 0;
  return Math.round((totalWasteCost / totalFoodCost) * 10_000) / 100;
}
