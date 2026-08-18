# Handoff Report: Ratio Engine Investigation & Contract Specification (Milestone 1)

**Working Directory**: `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_explorer_1`  
**Date**: 2026-08-15  
**Author**: Sub-Orchestrator M1 Explorer 1  
**Target Package**: `packages/ratio-engine/`  

---

## 1. Observation

1. **Current Package Manifest (`packages/ratio-engine/package.json:1–20`)**:
   - `packages/ratio-engine` declares name `@culinaryos/ratio-engine`, version `0.1.0`, `type: "module"`, `main: "./src/index.ts"`, and devDependency `typescript: "^5.4.0"`. It has zero runtime dependencies.
2. **Current Implementation (`packages/ratio-engine/src/index.ts:1–71`)**:
   - Lines 6–21 define `RatioBlueprintIngredient` and `RatioBlueprint`.
   - Lines 27–37 define `scaleBlueprint(blueprint, targetYield)`.
   - Lines 44–52 define `computeCost(scaled, priceMap)`.
   - Lines 59–70 define `fromTotalWeight(blueprint, totalDoughWeightGrams)`.
   - **Gaps**: None of the 14 interface contracts listed in `SCOPE.md` lines 33–46 (`scaleRecipeTree`, `flattenScaledTree`, `scaleByServings`, `calculateRatio`, `totalFormulaWeight`, `formatAmount`, `gramsToCups`, `cupsToGrams`, `computeRecipeCost`, `calculateCostVariance`, `summarizeWaste`, `calculateWastePercentage`, `generateShiftPrepPlan`, `projectBatchRequirement`) are currently present.
3. **Active Consumers of Legacy Exports**:
   - `mcp/src/recipe-server.ts:7, 105, 156`: Imports and uses `scaleBlueprint`.
   - `tests/empirical/step1_plated_inventory.test.ts:2, 43, 64`: Imports and uses `scaleBlueprint` and `RatioBlueprint`.
   - `tests/empirical/step3_mcp_servers.test.ts:2, 73`: Imports and uses `scaleBlueprint`.
   - `packages/ratio-engine/src/index.test.ts:2, 17–44`: Imports and tests `scaleBlueprint`, `computeCost`, and `fromTotalWeight`.
4. **Current Test Suite Execution (`packages/ratio-engine/src/index.test.ts:1–45`)**:
   - Executed via `node ./scripts/run-all-tests.cjs` using `scripts/bun-test-impl.js` harness.
   - All 4 existing tests pass:
     - `scaleBlueprint: scales to 12 loaves preserving ratios` (passed)
     - `scaleBlueprint: throws on zero yield` (passed)
     - `computeCost: computes cost correctly` (passed)
     - `fromTotalWeight: distributes total dough weight by ratio` (passed)
5. **Typecheck Execution**:
   - `pnpm run typecheck` (`turbo run typecheck`) compiles 15 workspace packages (including `@culinaryos/ratio-engine` via `tsc --noEmit`).

---

## 2. Logic Chain

```
[Observation 1 & 2: packages/ratio-engine currently has only 3 basic functions and lacks the 14 SCOPE.md contracts]
                         │
                         ▼
[Observation 3: Sibling and empirical tests rely on legacy scaleBlueprint, computeCost, and fromTotalWeight]
                         │
                         ▼
[Logic Step 1]: To satisfy Milestone 1 without breaking existing services or test harnesses,
                packages/ratio-engine/src/index.ts must be updated to export:
                (a) The 14 newly specified domain functions and types.
                (b) The 5 legacy exports (RatioBlueprint, RatioBlueprintIngredient, scaleBlueprint, computeCost, fromTotalWeight) as first-class or aliased exports.
                         │
                         ▼
[Observation 4 & 5: Tests run via scripts/bun-test-impl.js and turbo typecheck verifies zero TypeScript errors]
                         │
                         ▼
[Logic Step 2]: Extending packages/ratio-engine/src/index.test.ts with comprehensive unit tests
                for all 14 functions (covering standard calculations, edge cases, negative bounds, zero divisors, and recursive tree scaling)
                guarantees complete regression-free mathematical verification.
```

---

## 3. Caveats

1. **Measurement Units Consistency**:
   - The primary supported measurement units across domain models are `'g' | 'kg' | 'ml' | 'l' | 'oz' | 'lb' | 'tsp' | 'tbsp' | 'cup' | 'count'`. In `InventoryStockItem` and `ShiftPrepTask`, `unit` accepts `MeasurementUnit | string` to allow flexibility with third-party supplier package units.
2. **Density Conversion Scope**:
   - `gramsToCups` and `cupsToGrams` implement standard culinary densities for primary dry and liquid goods: `flour` (125g), `sugar` (200g), `brown sugar` (220g), `butter` (227g), `salt` (273g), `kosher salt` (218g), `rice` (185g), `oats` (90g), `water`/`milk` (240g), `oil` (218g), and `honey` (340g). Unrecognized ingredients return `null` safely.
3. **Zero-Dependency Constraint**:
   - `packages/ratio-engine` must remain 100% pure TypeScript with zero external npm dependencies.

---

## 4. Conclusion

`packages/ratio-engine` requires two concrete file updates:
1. `packages/ratio-engine/src/index.ts`: Implementation of all 14 interface contracts + retention of 5 legacy exports.
2. `packages/ratio-engine/src/index.test.ts`: Expansion to 16 comprehensive `describe` test suites covering all 14 functions and legacy behaviors.

### Proposed Code for `packages/ratio-engine/src/index.ts`

```typescript
// packages/ratio-engine/src/index.ts
// Pure TypeScript — zero dependencies.
// Mathematical engine for recipe scaling, sub-recipe trees, food costing, variance, waste, and prep planning.

export type MeasurementUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'oz'
  | 'lb'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'count';

// ---------------------------------------------------------------------------
// 1. Sub-Recipe Trees & Ratio Blueprints
// ---------------------------------------------------------------------------

export interface RecipeIngredientItem {
  id: string;
  name: string;
  /** Baker's percentage / ratio weight (base ingredient = 100 or standard proportion) */
  ratio: number;
  unit: MeasurementUnit;
  subRecipeId?: string;
  subRecipe?: RecipeBlueprint;
  /** Cost per unit in dollars/cents */
  costPerUnit?: number;
}

export interface RecipeBlueprint {
  id: string;
  name: string;
  baseIngredient?: string;
  /** Base yield amount for this recipe (e.g. 1 loaf, 10 portions, 500g) */
  baseYield: number;
  yieldUnit: string;
  ingredients: RecipeIngredientItem[];
  station?: string;
}

export interface ScaledIngredientResult {
  id: string;
  name: string;
  amount: number;
  unit: MeasurementUnit;
  unitCost: number;
  totalCost: number;
  subRecipeId?: string;
  subRecipeResult?: ScaledRecipeTreeResult;
}

export interface ScaledRecipeTreeResult {
  recipeId: string;
  recipeName: string;
  targetYield: number;
  yieldUnit: string;
  totalCost: number;
  ingredients: ScaledIngredientResult[];
}

export interface ScaledIngredientSummary {
  id: string;
  name: string;
  amount: number;
  unit: MeasurementUnit;
  totalCost: number;
}

/**
 * Recursively scales a recipe tree including nested sub-recipes.
 */
export function scaleRecipeTree(
  recipe: RecipeBlueprint,
  targetYield: number
): ScaledRecipeTreeResult {
  if (targetYield <= 0) {
    throw new Error('targetYield must be > 0');
  }
  if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    throw new Error('Invalid recipe blueprint');
  }
  if (recipe.baseYield <= 0) {
    throw new Error('recipe.baseYield must be > 0');
  }

  const scaleFactor = targetYield / recipe.baseYield;
  let totalCost = 0;

  const ingredients: ScaledIngredientResult[] = recipe.ingredients.map((ing) => {
    const amount = ing.ratio * scaleFactor;
    const unitCost = ing.costPerUnit ?? 0;

    let subRecipeResult: ScaledRecipeTreeResult | undefined;
    let itemTotalCost = 0;

    if (ing.subRecipe) {
      subRecipeResult = scaleRecipeTree(ing.subRecipe, amount);
      itemTotalCost = subRecipeResult.totalCost;
    } else {
      itemTotalCost = amount * unitCost;
    }

    totalCost += itemTotalCost;

    return {
      id: ing.id,
      name: ing.name,
      amount,
      unit: ing.unit,
      unitCost,
      totalCost: itemTotalCost,
      subRecipeId: ing.subRecipeId,
      subRecipeResult,
    };
  });

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    targetYield,
    yieldUnit: recipe.yieldUnit,
    totalCost,
    ingredients,
  };
}

/**
 * Flattens a scaled recipe tree into consolidated raw ingredients with summed quantities and costs.
 */
export function flattenScaledTree(
  tree: ScaledRecipeTreeResult
): Record<string, ScaledIngredientSummary> {
  const summary: Record<string, ScaledIngredientSummary> = {};

  function traverse(node: ScaledRecipeTreeResult) {
    for (const item of node.ingredients) {
      if (item.subRecipeResult) {
        traverse(item.subRecipeResult);
      } else {
        const key = item.id || item.name;
        if (summary[key]) {
          summary[key].amount += item.amount;
          summary[key].totalCost += item.totalCost;
        } else {
          summary[key] = {
            id: item.id,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            totalCost: item.totalCost,
          };
        }
      }
    }
  }

  traverse(tree);
  return summary;
}

/**
 * Scales an array of items with an `amount` property by serving ratio.
 */
export function scaleByServings<T extends { amount: number }>(
  items: T[],
  baseServings: number,
  targetServings: number
): T[] {
  if (baseServings <= 0) {
    throw new Error('baseServings must be > 0');
  }
  if (targetServings < 0) {
    throw new Error('targetServings cannot be negative');
  }
  if (targetServings === 0) {
    return items.map((item) => ({
      ...item,
      amount: 0,
    }));
  }

  const factor = targetServings / baseServings;
  return items.map((item) => ({
    ...item,
    amount: item.amount * factor,
  }));
}

/**
 * Calculates baker's percentage (base ingredient = 100%).
 */
export function calculateRatio(ingredientWeight: number, baseWeight: number): number {
  if (baseWeight <= 0) {
    throw new Error('baseWeight must be > 0');
  }
  if (ingredientWeight < 0) {
    throw new Error('ingredientWeight cannot be negative');
  }
  return (ingredientWeight / baseWeight) * 100;
}

/**
 * Calculates total formula dough weight given base ingredient weight.
 */
export function totalFormulaWeight(
  recipe: RecipeBlueprint,
  targetBaseWeight: number
): number {
  if (targetBaseWeight <= 0) {
    throw new Error('targetBaseWeight must be > 0');
  }
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return 0;
  }

  const baseIng = recipe.ingredients.find(
    (i) => i.id === recipe.baseIngredient || i.name === recipe.baseIngredient || i.ratio === 100
  );
  const baseRatio = baseIng ? baseIng.ratio : 100;
  if (baseRatio <= 0) {
    throw new Error('Base ingredient ratio must be > 0');
  }

  const ratioSum = recipe.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);
  const unitWeight = targetBaseWeight / baseRatio;
  return ratioSum * unitWeight;
}

/**
 * Formats a numeric portion quantity cleanly (integers -> whole, >=1 -> 1dp, <1 -> 2dp).
 */
export function formatAmount(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0';
  }
  if (value === 0) {
    return '0';
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  if (value >= 1) {
    const formatted = value.toFixed(1);
    return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted;
  }
  const formatted = value.toFixed(2);
  const trimmed = formatted.replace(/\.?0+$/, '');
  return trimmed === '' ? '0' : trimmed;
}

// ---------------------------------------------------------------------------
// 2. Density-Based Unit Conversions
// ---------------------------------------------------------------------------

const DENSITY_GRAMS_PER_CUP: Record<string, number> = {
  flour: 125,
  'all-purpose flour': 125,
  'bread flour': 125,
  sugar: 200,
  'white sugar': 200,
  'granulated sugar': 200,
  'brown sugar': 220,
  butter: 227,
  salt: 273,
  'table salt': 273,
  'kosher salt': 218,
  rice: 185,
  'white rice': 185,
  oats: 90,
  'rolled oats': 90,
  water: 240,
  milk: 240,
  oil: 218,
  'olive oil': 218,
  honey: 340,
};

function lookupDensity(ingredient: string): number | null {
  if (!ingredient || typeof ingredient !== 'string') return null;
  const normalized = ingredient.trim().toLowerCase();
  return DENSITY_GRAMS_PER_CUP[normalized] ?? null;
}

/**
 * Converts grams to cups based on ingredient density. Returns null if unknown.
 */
export function gramsToCups(grams: number, ingredient: string): number | null {
  if (grams < 0 || typeof grams !== 'number' || isNaN(grams)) return null;
  const density = lookupDensity(ingredient);
  if (!density || density <= 0) return null;
  return grams / density;
}

/**
 * Converts cups to grams based on ingredient density. Returns null if unknown.
 */
export function cupsToGrams(cups: number, ingredient: string): number | null {
  if (cups < 0 || typeof cups !== 'number' || isNaN(cups)) return null;
  const density = lookupDensity(ingredient);
  if (!density || density <= 0) return null;
  return cups * density;
}

// ---------------------------------------------------------------------------
// 3. Food Costing & Variance Analysis
// ---------------------------------------------------------------------------

export interface RecipeCostIngredient {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface RecipeCostLineItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface RecipeCostAnalysis {
  ingredientCosts: RecipeCostLineItem[];
  totalCost: number;
  costPerServing: number;
  foodCostPct: number;
}

export interface CostVarianceResult {
  theoreticalCost: number;
  actualCost: number;
  varianceDollars: number;
  variancePct: number;
  status: 'ok' | 'warn' | 'alert';
}

/**
 * Computes recipe food cost breakdown, cost per serving, and food cost percentage.
 */
export function computeRecipeCost(
  ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>,
  servings: number,
  menuPrice: number
): RecipeCostAnalysis {
  let totalCost = 0;
  const ingredientCosts: RecipeCostLineItem[] = (ingredients || []).map((ing) => {
    const itemTotal = (ing.quantity ?? 0) * (ing.unitCost ?? 0);
    totalCost += itemTotal;
    return {
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      unitCost: ing.unitCost,
      totalCost: itemTotal,
    };
  });

  const costPerServing = servings > 0 ? totalCost / servings : 0;
  const foodCostPct = menuPrice > 0 ? (costPerServing / menuPrice) * 100 : 0;

  return {
    ingredientCosts,
    totalCost,
    costPerServing,
    foodCostPct,
  };
}

/**
 * Calculates actual vs theoretical cost variance and status.
 */
export function calculateCostVariance(
  theoretical: number,
  actual: number
): CostVarianceResult {
  const varianceDollars = actual - theoretical;
  const variancePct = theoretical > 0 ? (varianceDollars / theoretical) * 100 : 0;

  const absPct = Math.abs(variancePct);
  let status: 'ok' | 'warn' | 'alert' = 'ok';
  if (absPct >= 5) {
    status = 'alert';
  } else if (absPct >= 2) {
    status = 'warn';
  } else {
    status = 'ok';
  }

  return {
    theoreticalCost: theoretical,
    actualCost: actual,
    varianceDollars,
    variancePct,
    status,
  };
}

// ---------------------------------------------------------------------------
// 4. Waste & Ops Summarization
// ---------------------------------------------------------------------------

export type WasteReason =
  | 'spoilage'
  | 'trim'
  | 'overcook'
  | 'drop'
  | 'expired'
  | 'other'
  | string;

export interface WasteLogEntry {
  ingredient: string;
  quantityGrams: number;
  costPerGram: number;
  reason: WasteReason;
  logDate?: string;
}

export interface WasteSummaryReport {
  totalGrams: number;
  totalCost: number;
  byReason: Record<string, { grams: number; cost: number }>;
  topWastedIngredients: Array<{ ingredient: string; grams: number; cost: number }>;
}

/**
 * Summarizes waste log entries into totals, reason breakdowns, and top financial loss items.
 */
export function summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport {
  let totalGrams = 0;
  let totalCost = 0;
  const byReason: Record<string, { grams: number; cost: number }> = {};
  const byIngredient: Record<string, { grams: number; cost: number }> = {};

  for (const entry of entries || []) {
    const cost = entry.quantityGrams * entry.costPerGram;
    totalGrams += entry.quantityGrams;
    totalCost += cost;

    const reason = entry.reason || 'other';
    if (!byReason[reason]) {
      byReason[reason] = { grams: 0, cost: 0 };
    }
    byReason[reason].grams += entry.quantityGrams;
    byReason[reason].cost += cost;

    const ing = entry.ingredient || 'unknown';
    if (!byIngredient[ing]) {
      byIngredient[ing] = { grams: 0, cost: 0 };
    }
    byIngredient[ing].grams += entry.quantityGrams;
    byIngredient[ing].cost += cost;
  }

  const topWastedIngredients = Object.entries(byIngredient)
    .map(([ingredient, data]) => ({
      ingredient,
      grams: data.grams,
      cost: data.cost,
    }))
    .sort((a, b) => b.cost - a.cost);

  return {
    totalGrams,
    totalCost,
    byReason,
    topWastedIngredients,
  };
}

/**
 * Calculates total waste as a percentage of total food cost.
 */
export function calculateWastePercentage(
  totalWasteCost: number,
  totalFoodCost: number
): number {
  if (totalFoodCost <= 0 || totalWasteCost <= 0) {
    return 0;
  }
  return (totalWasteCost / totalFoodCost) * 100;
}

// ---------------------------------------------------------------------------
// 5. Shift Prep Planning & Projections
// ---------------------------------------------------------------------------

export interface InventoryStockItem {
  id: string;
  ingredient: string;
  currentStock: number;
  parLevel: number;
  unit: MeasurementUnit | string;
  station?: string;
}

export interface ShiftPrepTask {
  ingredientId: string;
  ingredient: string;
  prepAmount: number;
  unit: MeasurementUnit | string;
  station?: string;
}

export interface ShiftPrepPlan {
  shift: 'morning' | 'evening' | 'prep';
  date: string;
  tasks: ShiftPrepTask[];
}

/**
 * Generates shift prep plan based on par level shortfalls.
 */
export function generateShiftPrepPlan(
  items: InventoryStockItem[],
  shift: 'morning' | 'evening' | 'prep',
  date: string
): ShiftPrepPlan {
  const tasks: ShiftPrepTask[] = [];

  for (const item of items || []) {
    const shortfall = item.parLevel - item.currentStock;
    if (shortfall > 0) {
      tasks.push({
        ingredientId: item.id,
        ingredient: item.ingredient,
        prepAmount: shortfall,
        unit: item.unit,
        ...(item.station ? { station: item.station } : {}),
      });
    }
  }

  return {
    shift,
    date,
    tasks,
  };
}

/**
 * Projects total batch requirement given portion weight, cover count, and waste buffer.
 */
export function projectBatchRequirement(
  portionWeight: number,
  covers: number,
  wasteFactor: number = 1.0
): number {
  if (portionWeight < 0 || covers < 0 || wasteFactor < 0) {
    throw new Error('Inputs cannot be negative');
  }
  return portionWeight * covers * wasteFactor;
}

// ---------------------------------------------------------------------------
// 6. Backward Compatibility Layer (Legacy Blueprint Functions)
// ---------------------------------------------------------------------------

export interface RatioBlueprintIngredient {
  id: string;
  name: string;
  /** Baker's percentage or ratio unit. Base ingredient = 100. */
  ratioWeight: number;
  unit: 'g' | 'ml' | 'oz' | 'count';
}

export interface RatioBlueprint {
  id: string;
  name: string;
  /** The yield this ratio describes at ratioWeight = 100. */
  baseYield: number;
  yieldUnit: string;
  ingredients: RatioBlueprintIngredient[];
}

export function scaleBlueprint(
  blueprint: RatioBlueprint,
  targetYield: number
): RatioBlueprintIngredient[] {
  if (targetYield <= 0) throw new Error('targetYield must be > 0');
  const scaleFactor = targetYield / blueprint.baseYield;
  return blueprint.ingredients.map((ing) => ({
    ...ing,
    ratioWeight: ing.ratioWeight * scaleFactor,
  }));
}

export function computeCost(
  scaled: RatioBlueprintIngredient[],
  priceMap: Record<string, number>
): number {
  return scaled.reduce((total, ing) => {
    const unitCost = priceMap[ing.id] ?? 0;
    return total + ing.ratioWeight * unitCost;
  }, 0);
}

export function fromTotalWeight(
  blueprint: RatioBlueprint,
  totalDoughWeightGrams: number
): RatioBlueprintIngredient[] {
  const ratioSum = blueprint.ingredients.reduce((s, i) => s + i.ratioWeight, 0);
  if (ratioSum === 0) throw new Error('Ratio sum cannot be zero');
  const factor = totalDoughWeightGrams / ratioSum;
  return blueprint.ingredients.map((ing) => ({
    ...ing,
    ratioWeight: ing.ratioWeight * factor,
  }));
}
```

---

## 5. Verification Method

### Test Execution Commands
1. Run Ratio Engine Unit Tests:
   ```bash
   npx -y tsx@4.7.1 -r ./scripts/test-hook.cjs packages/ratio-engine/src/index.test.ts
   ```
2. Run Monorepo Typecheck:
   ```bash
   pnpm run typecheck
   ```
3. Run Canonical Monorepo Test Runner:
   ```bash
   node ./scripts/run-all-tests.cjs
   ```

### Verification Criteria
- All 14 functions pass individual assertions in `packages/ratio-engine/src/index.test.ts`.
- All 4 legacy test assertions pass without regression.
- `turbo run typecheck` succeeds with 0 errors across all 15 packages.

### Invalidation Conditions
- Any removal of legacy `RatioBlueprint`, `scaleBlueprint`, `computeCost`, or `fromTotalWeight` which causes `step1_plated_inventory.test.ts` or `step3_mcp_servers.test.ts` to fail.
- Any change that introduces external dependencies into `packages/ratio-engine/package.json`.
