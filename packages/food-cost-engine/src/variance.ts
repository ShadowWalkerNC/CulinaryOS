// ============================================================
// CulinaryOS — Actual-vs-Theoretical Food Cost Variance Engine
// Compares theoretical recipe usage (POS sales × BOM) vs
// actual inventory consumption + recorded kitchen waste loss.
// ============================================================

export interface TheoreticalUsageItem {
  ingredientId?: string;
  ingredientName: string;
  theoreticalQuantity: number;
  unit: string;
  unitCost: number; // Cost per unit in dollars
  theoreticalCost?: number;
}

export interface ActualUsageItem {
  ingredientId?: string;
  ingredientName: string;
  startingStock?: number;
  receivedStock?: number;
  endingStock?: number;
  actualQuantity: number; // Consumption = starting + received - ending
  unit: string;
  unitCost: number;
  actualCost?: number;
}

export interface WasteLogItem {
  id?: string;
  ingredientId?: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  wasteCost: number;
  reason: 'dropped' | 'burned' | 'spoiled' | 'overportion' | 'void_cooked' | string;
  loggedAt?: string;
  notes?: string;
}

export interface IngredientVariance {
  ingredientId?: string;
  ingredientName: string;
  unit: string;
  unitCost: number;
  theoreticalQuantity: number;
  theoreticalCost: number;
  actualQuantity: number;
  actualCost: number;
  wasteQuantity: number;
  wasteCost: number;
  varianceQuantity: number; // actual - theoretical
  varianceCost: number;     // actualCost - theoreticalCost
  variancePct: number;      // (varianceCost / theoreticalCost) * 100
  unexplainedQuantity: number; // (actual - theoretical) - waste
  unexplainedCost: number;     // varianceCost - wasteCost
  unexplainedPct: number;      // (unexplainedCost / theoreticalCost) * 100
  status: 'ok' | 'warn' | 'alert';
}

export interface FoodCostVarianceReport {
  period?: { from?: string; to?: string };
  totalTheoreticalCost: number;
  totalActualCost: number;
  totalWasteCost: number;
  totalVarianceCost: number;
  overallVariancePct: number;
  totalUnexplainedCost: number;
  unexplainedVariancePct: number;
  overallStatus: 'ok' | 'warn' | 'alert';
  ingredients: IngredientVariance[];
  topOffenders: IngredientVariance[];
}

/**
 * Calculates variance metrics for a single ingredient.
 * Thresholds:
 * - ok: abs(variancePct) < 2%
 * - warn: 2% <= abs(variancePct) < 5%
 * - alert: abs(variancePct) >= 5%
 */
export function calculateIngredientVariance(
  theoreticalQty: number,
  actualQty: number,
  wasteQty: number,
  unitCost: number,
  ingredientName = 'Item',
  unit = 'unit',
  ingredientId?: string
): IngredientVariance {
  const theoreticalCost = Math.round(theoreticalQty * unitCost * 100) / 100;
  const actualCost = Math.round(actualQty * unitCost * 100) / 100;
  const wasteCost = Math.round(wasteQty * unitCost * 100) / 100;

  const varianceQuantity = Math.round((actualQty - theoreticalQty) * 1000) / 1000;
  const varianceCost = Math.round((actualCost - theoreticalCost) * 100) / 100;

  const variancePct = theoreticalCost > 0
    ? Math.round((varianceCost / theoreticalCost) * 10_000) / 100
    : actualCost > 0
      ? 100
      : 0;

  const unexplainedQuantity = Math.round((varianceQuantity - wasteQty) * 1000) / 1000;
  const unexplainedCost = Math.round((varianceCost - wasteCost) * 100) / 100;

  const unexplainedPct = theoreticalCost > 0
    ? Math.round((unexplainedCost / theoreticalCost) * 10_000) / 100
    : unexplainedCost > 0
      ? 100
      : 0;

  const absVariance = Math.abs(variancePct);
  const status: 'ok' | 'warn' | 'alert' =
    absVariance >= 5 ? 'alert' : absVariance >= 2 ? 'warn' : 'ok';

  const result: IngredientVariance = {
    ingredientName,
    unit,
    unitCost,
    theoreticalQuantity: Math.round(theoreticalQty * 1000) / 1000,
    theoreticalCost,
    actualQuantity: Math.round(actualQty * 1000) / 1000,
    actualCost,
    wasteQuantity: Math.round(wasteQty * 1000) / 1000,
    wasteCost,
    varianceQuantity,
    varianceCost,
    variancePct,
    unexplainedQuantity,
    unexplainedCost,
    unexplainedPct,
    status,
  };
  if (ingredientId) result.ingredientId = ingredientId;
  return result;
}

/**
 * Calculates a complete Actual vs Theoretical Food Cost Variance report.
 */
export function calculateActualVsTheoretical(params: {
  theoreticalUsage: TheoreticalUsageItem[];
  actualUsage: ActualUsageItem[];
  wasteLogs?: WasteLogItem[];
  period?: { from?: string; to?: string };
}): FoodCostVarianceReport {
  const { theoreticalUsage, actualUsage, wasteLogs = [], period } = params;

  // Aggregate theoretical usage by ingredient name
  const theoreticalMap = new Map<string, TheoreticalUsageItem>();
  for (const t of theoreticalUsage) {
    const key = t.ingredientName.trim().toLowerCase();
    const cur = theoreticalMap.get(key);
    if (cur) {
      cur.theoreticalQuantity += t.theoreticalQuantity;
    } else {
      theoreticalMap.set(key, { ...t });
    }
  }

  // Aggregate actual usage by ingredient name
  const actualMap = new Map<string, ActualUsageItem>();
  for (const a of actualUsage) {
    const key = a.ingredientName.trim().toLowerCase();
    const cur = actualMap.get(key);
    if (cur) {
      cur.actualQuantity += a.actualQuantity;
    } else {
      actualMap.set(key, { ...a });
    }
  }

  // Aggregate waste logs by ingredient name
  const wasteMap = new Map<string, { quantity: number; cost: number }>();
  for (const w of wasteLogs) {
    const key = w.ingredientName.trim().toLowerCase();
    const cur = wasteMap.get(key) ?? { quantity: 0, cost: 0 };
    cur.quantity += w.quantity;
    cur.cost += w.wasteCost;
    wasteMap.set(key, cur);
  }

  // Combine all distinct ingredient keys
  const allKeys = new Set<string>([
    ...theoreticalMap.keys(),
    ...actualMap.keys(),
    ...wasteMap.keys(),
  ]);

  const ingredients: IngredientVariance[] = [];

  for (const key of allKeys) {
    const theo = theoreticalMap.get(key);
    const act = actualMap.get(key);
    const waste = wasteMap.get(key) ?? { quantity: 0, cost: 0 };

    const name = theo?.ingredientName ?? act?.ingredientName ?? key;
    const unit = theo?.unit ?? act?.unit ?? 'g';
    const unitCost = theo?.unitCost ?? act?.unitCost ?? 0;
    const id = theo?.ingredientId ?? act?.ingredientId;

    const theoQty = theo?.theoreticalQuantity ?? 0;
    const actQty = act?.actualQuantity ?? (theoQty + waste.quantity);

    const variance = calculateIngredientVariance(
      theoQty,
      actQty,
      waste.quantity,
      unitCost,
      name,
      unit,
      id
    );

    ingredients.push(variance);
  }

  // Sort ingredients by absolute variance cost descending
  ingredients.sort((a, b) => Math.abs(b.varianceCost) - Math.abs(a.varianceCost));

  const totalTheoreticalCost = Math.round(
    ingredients.reduce((sum, i) => sum + i.theoreticalCost, 0) * 100
  ) / 100;
  const totalActualCost = Math.round(
    ingredients.reduce((sum, i) => sum + i.actualCost, 0) * 100
  ) / 100;
  const totalWasteCost = Math.round(
    ingredients.reduce((sum, i) => sum + i.wasteCost, 0) * 100
  ) / 100;
  const totalVarianceCost = Math.round(
    (totalActualCost - totalTheoreticalCost) * 100
  ) / 100;

  const overallVariancePct = totalTheoreticalCost > 0
    ? Math.round((totalVarianceCost / totalTheoreticalCost) * 10_000) / 100
    : 0;

  const totalUnexplainedCost = Math.round(
    (totalVarianceCost - totalWasteCost) * 100
  ) / 100;

  const unexplainedVariancePct = totalTheoreticalCost > 0
    ? Math.round((totalUnexplainedCost / totalTheoreticalCost) * 10_000) / 100
    : 0;

  const absOverall = Math.abs(overallVariancePct);
  const overallStatus: 'ok' | 'warn' | 'alert' =
    absOverall >= 5 ? 'alert' : absOverall >= 2 ? 'warn' : 'ok';

  // Top offenders: highest positive variance (excess depletion) or highest alert
  const topOffenders = ingredients
    .filter((i) => i.status === 'alert' || i.status === 'warn' || i.varianceCost > 0)
    .slice(0, 5);

  const report: FoodCostVarianceReport = {
    totalTheoreticalCost,
    totalActualCost,
    totalWasteCost,
    totalVarianceCost,
    overallVariancePct,
    totalUnexplainedCost,
    unexplainedVariancePct,
    overallStatus,
    ingredients,
    topOffenders,
  };
  if (period) report.period = period;
  return report;
}
