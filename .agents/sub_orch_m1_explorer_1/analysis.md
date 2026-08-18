# Analysis: Ratio Engine Consolidation & Contract Specification (Milestone 1)

**Working Directory**: `packages/ratio-engine/`  
**Date**: 2026-08-15  
**Author**: Sub-Orchestrator M1 Explorer 1  

---

## 1. Executive Summary

`packages/ratio-engine` is a pure TypeScript, zero-dependency package intended as the mathematical foundation for CulinaryOS ("the Linux of restaurant tech"). It powers recipe scaling, sub-recipe trees, density-based unit conversions, food costing, variance tracking, waste summarization, and shift prep planning.

Currently, `packages/ratio-engine/src/index.ts` contains only a minimal 71-line implementation with 3 functions (`scaleBlueprint`, `computeCost`, `fromTotalWeight`) and 2 interfaces (`RatioBlueprintIngredient`, `RatioBlueprint`).

To fulfill **Milestone 1 (M1)** as specified in `SCOPE.md` and `PROJECT.md`, `packages/ratio-engine` must be expanded to implement all **14 interface contracts** while preserving **100% backward compatibility** for existing consumers (`mcp/src/recipe-server.ts`, `tests/empirical/step1_plated_inventory.test.ts`, and `tests/empirical/step3_mcp_servers.test.ts`).

---

## 2. Current Implementation Audit

### 2.1 Package Manifest (`packages/ratio-engine/package.json`)
- **Package Name**: `@culinaryos/ratio-engine`
- **Version**: `0.1.0`
- **Type**: `module` (ESM)
- **Entrypoints**:
  ```json
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
  ```
- **Scripts**:
  - `build`: `tsc`
  - `dev`: `tsc --watch`
  - `typecheck`: `tsc --noEmit`
- **Dependencies**: Zero runtime dependencies. `typescript: ^5.4.0` in `devDependencies`.

### 2.2 Existing Source (`packages/ratio-engine/src/index.ts`)
Lines 1–71 export:
1. `RatioBlueprintIngredient` interface: `{ id: string; name: string; ratioWeight: number; unit: 'g' | 'ml' | 'oz' | 'count' }`
2. `RatioBlueprint` interface: `{ id: string; name: string; baseYield: number; yieldUnit: string; ingredients: RatioBlueprintIngredient[] }`
3. `scaleBlueprint(blueprint: RatioBlueprint, targetYield: number): RatioBlueprintIngredient[]`
4. `computeCost(scaled: RatioBlueprintIngredient[], priceMap: Record<string, number>): number`
5. `fromTotalWeight(blueprint: RatioBlueprint, totalDoughWeightGrams: number): RatioBlueprintIngredient[]`

### 2.3 Existing Tests (`packages/ratio-engine/src/index.test.ts`)
Lines 1–45 import from `../../../scripts/bun-test-impl.js` and test:
- `scaleBlueprint`: scaling sourdough formula to 12 loaves, throws on 0 yield.
- `computeCost`: calculating dollar cost from price map.
- `fromTotalWeight`: distributing target total dough weight by ratio sum.

---

## 3. Gap Analysis: 14 Interface Contracts vs Existing Code

| # | Contract Signature in `SCOPE.md` | Existing in `packages/ratio-engine`? | Status / Required Implementation |
|---|---|---|---|
| 1 | `scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult` | ❌ No | **New Function**. Recursively scales sub-recipe tree (doughs, sauces, fillings) down to leaf raw ingredients, computing scaled amounts and costs. |
| 2 | `flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, ScaledIngredientSummary>` | ❌ No | **New Function**. Traverses scaled tree, consolidates duplicate raw ingredients across sub-recipes, and sums amount and totalCost. |
| 3 | `scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[]` | ❌ No | **New Function**. Generic portion scaling multiplying `amount` by `targetServings / baseServings`. |
| 4 | `calculateRatio(ingredientWeight: number, baseWeight: number): number` | ❌ No | **New Function**. Derives baker's percentage (base = 100). E.g., `(ingredientWeight / baseWeight) * 100`. |
| 5 | `totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number` | ❌ No | **New Function**. Calculates total formula dough weight given base ingredient weight (e.g. flour weight). |
| 6 | `formatAmount(value: number): string` | ❌ No | **New Function**. Smart decimal portion formatting: whole integers -> integer string, >=1 -> 1dp, <1 -> 2dp without trailing zeros. |
| 7 | `gramsToCups(grams: number, ingredient: string): number | null` | ❌ No | **New Function**. Density-based grams to cups converter (flour: 125, sugar: 200, butter: 227, salt: 273, rice: 185, oats: 90). |
| 8 | `cupsToGrams(cups: number, ingredient: string): number | null` | ❌ No | **New Function**. Density-based cups to grams converter (cups * density). Returns `null` on unknown ingredient or negative input. |
| 9 | `computeRecipeCost(ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>, servings: number, menuPrice: number): RecipeCostAnalysis` | ❌ No | **New Function**. Computes line-item costs, total cost, cost per serving, and food cost % against menu price. |
| 10 | `calculateCostVariance(theoretical: number, actual: number): CostVarianceResult` | ❌ No | **New Function**. Computes dollar variance, percentage variance, and status flag (`ok` for <2%, `warn` for 2–5%, `alert` for >=5%). |
| 11 | `summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport` | ❌ No | **New Function**. Aggregates waste weight, dollar loss, reason breakdown, and top wasted ingredients sorted by cost loss. |
| 12 | `calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number` | ❌ No | **New Function**. Computes `(totalWasteCost / totalFoodCost) * 100` (returns 0 if totalFoodCost <= 0). |
| 13 | `generateShiftPrepPlan(items: InventoryStockItem[], shift: 'morning' | 'evening' | 'prep', date: string): ShiftPrepPlan` | ❌ No | **New Function**. Compares `currentStock` against `parLevel` and yields shortfall prep tasks for the shift. |
| 14 | `projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number` | ❌ No | **New Function**. Calculates `portionWeight * covers * (wasteFactor ?? 1.0)`. |
| * | `RatioBlueprint`, `RatioBlueprintIngredient`, `scaleBlueprint`, `computeCost`, `fromTotalWeight` | ✅ Yes | **Retain for 100% Backward Compatibility**. |

---

## 4. Complete TypeScript Type Definitions

```typescript
// packages/ratio-engine/src/index.ts

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

// ---------------------------------------------------------------------------
// 2. Food Costing & Variance Analysis
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

// ---------------------------------------------------------------------------
// 3. Waste & Ops Summarization
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

// ---------------------------------------------------------------------------
// 4. Shift Prep Planning & Projections
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

// ---------------------------------------------------------------------------
// 5. Legacy Types for Backward Compatibility
// ---------------------------------------------------------------------------

export interface RatioBlueprintIngredient {
  id: string;
  name: string;
  ratioWeight: number;
  unit: 'g' | 'ml' | 'oz' | 'count';
}

export interface RatioBlueprint {
  id: string;
  name: string;
  baseYield: number;
  yieldUnit: string;
  ingredients: RatioBlueprintIngredient[];
}
```

---

## 5. Implementation Algorithms & Mathematical Specifications

### 5.1 `scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult`
- **Validation**:
  - If `targetYield <= 0`, throw `Error('targetYield must be > 0')`.
  - If `recipe.baseYield <= 0`, throw `Error('recipe.baseYield must be > 0')`.
- **Scaling Factor**: `scaleFactor = targetYield / recipe.baseYield`.
- **Recursion**:
  - For each ingredient in `recipe.ingredients`:
    - `scaledAmount = ingredient.ratio * scaleFactor`
    - `unitCost = ingredient.costPerUnit ?? 0`
    - If `ingredient.subRecipe`:
      - `subResult = scaleRecipeTree(ingredient.subRecipe, scaledAmount)`
      - `itemCost = subResult.totalCost` (or `scaledAmount * unitCost` if subRecipe cost is 0)
    - Else:
      - `itemCost = scaledAmount * unitCost`
    - Accumulate into tree result `totalCost += itemCost`.
- **Returns**: `ScaledRecipeTreeResult`.

### 5.2 `flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, ScaledIngredientSummary>`
- Recursively walks `tree.ingredients`.
- If `ingredient.subRecipeResult`, recursively calls traversal on `ingredient.subRecipeResult`.
- If leaf ingredient:
  - Key = `ingredient.id || ingredient.name`
  - If exists in accumulator, add `amount` and `totalCost`.
  - Else initialize new `ScaledIngredientSummary`.
- Returns flat map of consolidated ingredients.

### 5.3 `scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[]`
- If `baseServings <= 0`, throw `Error('baseServings must be > 0')`.
- If `targetServings < 0`, throw `Error('targetServings cannot be negative')`.
- If `targetServings === 0`, map `amount: 0`.
- Factor = `targetServings / baseServings`.
- Returns shallow clone array with scaled `amount`.

### 5.4 `calculateRatio(ingredientWeight: number, baseWeight: number): number`
- If `baseWeight <= 0`, throw `Error('baseWeight must be > 0')`.
- If `ingredientWeight < 0`, throw `Error('ingredientWeight cannot be negative')`.
- Standard baker's percentage formula: `(ingredientWeight / baseWeight) * 100`.

### 5.5 `totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number`
- If `targetBaseWeight <= 0`, throw `Error('targetBaseWeight must be > 0')`.
- Sum ratios of all ingredients: `sumRatio = recipe.ingredients.reduce((s, i) => s + i.ratio, 0)`.
- Find base ingredient ratio (matches `recipe.baseIngredient` or ratio === 100, default 100).
- Total formula weight = `(sumRatio / baseRatio) * targetBaseWeight`.

### 5.6 `formatAmount(value: number): string`
- If `value === 0` or invalid -> `'0'`.
- If `Number.isInteger(value)` -> `value.toString()`.
- If `value >= 1` -> `value.toFixed(1)` (strip trailing `.0`).
- If `value < 1` -> `value.toFixed(2)` (strip trailing zeros).

### 5.7 & 5.8 Density Conversions (`gramsToCups` / `cupsToGrams`)
- Density Table (grams per 1 cup):
  - `flour` / `all-purpose flour` / `bread flour`: 125
  - `sugar` / `granulated sugar` / `white sugar`: 200
  - `brown sugar`: 220
  - `butter`: 227
  - `salt` / `table salt`: 273
  - `kosher salt`: 218
  - `rice` / `white rice`: 185
  - `oats` / `rolled oats`: 90
  - `water` / `milk`: 240
  - `oil` / `olive oil`: 218
  - `honey`: 340
- Lookup: normalize input `ingredient.trim().toLowerCase()`.
- If ingredient unknown or input quantity < 0, return `null`.
- `gramsToCups`: `grams / density`.
- `cupsToGrams`: `cups * density`.

### 5.9 `computeRecipeCost(ingredients, servings, menuPrice): RecipeCostAnalysis`
- `ingredientCosts = ingredients.map(i => ({ ...i, totalCost: i.quantity * i.unitCost }))`.
- `totalCost = sum(ingredientCosts.totalCost)`.
- `costPerServing = servings > 0 ? totalCost / servings : 0`.
- `foodCostPct = menuPrice > 0 ? (costPerServing / menuPrice) * 100 : 0`.

### 5.10 `calculateCostVariance(theoretical, actual): CostVarianceResult`
- `varianceDollars = actual - theoretical`.
- `variancePct = theoretical > 0 ? (varianceDollars / theoretical) * 100 : 0`.
- Status thresholds (by absolute percentage variance):
  - `< 2%`: `'ok'`
  - `2% <= pct < 5%`: `'warn'`
  - `>= 5%`: `'alert'`

### 5.11 `summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport`
- Iterates over `entries`:
  - `totalGrams += quantityGrams`
  - `totalCost += quantityGrams * costPerGram`
  - Groups by `reason` (aggregates grams and cost)
  - Groups by `ingredient` (aggregates grams and cost)
- Sorts `topWastedIngredients` descending by dollar cost.

### 5.12 `calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number`
- If `totalFoodCost <= 0` or `totalWasteCost <= 0`, return `0`.
- Return `(totalWasteCost / totalFoodCost) * 100`.

### 5.13 `generateShiftPrepPlan(items: InventoryStockItem[], shift, date): ShiftPrepPlan`
- For each item, `shortfall = item.parLevel - item.currentStock`.
- If `shortfall > 0`, adds task `{ ingredientId: item.id, ingredient: item.ingredient, prepAmount: shortfall, unit: item.unit, ...(item.station ? { station: item.station } : {}) }`.
- Returns `{ shift, date, tasks }`.

### 5.14 `projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number`
- If `portionWeight < 0` or `covers < 0`, throw `Error`.
- Returns `portionWeight * covers * (wasteFactor ?? 1.0)`.

---

## 6. Comprehensive Unit Test Specifications (`packages/ratio-engine/src/index.test.ts`)

The test suite must cover all 14 functions and the 3 legacy functions, verifying:
1. **Tree Scaling**: Single level scaling, multi-level recursive tree scaling (Pizza -> Dough -> Poolish), zero/negative yield exceptions.
2. **Tree Flattening**: Duplicate raw ingredient consolidation across sub-recipes (e.g. Flour in Dough + Flour in Sauce), single-level recipes, empty trees.
3. **Serving Scaling**: Generic array portion scaling, zero base servings exception, zero target servings (returns 0 amounts), negative servings rejection.
4. **Ratio Calculation**: Baker's percentage calculations, zero base weight exception, negative weight rejection, 100% base ratio identity.
5. **Formula Total Weight**: Sourdough formula calculation (197 ratio sum for 1000g flour -> 1970g total weight), zero/negative weight rejection.
6. **Smart Portion Formatting**: Whole numbers (`2` -> `"2"`), >=1 decimals (`1.5` -> `"1.5"`, `2.34` -> `"2.3"`, `2.0` -> `"2"`), <1 decimals (`0.25` -> `"0.25"`, `0.333` -> `"0.33"`), zero (`0` -> `"0"`).
7. **Density Unit Conversions**:
   - `gramsToCups`: Flour (250g -> 2 cups), Sugar (400g -> 2 cups), Butter (227g -> 1 cup), Salt (273g -> 1 cup), Rice (185g -> 1 cup), Oats (90g -> 1 cup).
   - `cupsToGrams`: Flour (2 cups -> 250g), Sugar (1.5 cups -> 300g), Butter (2 cups -> 454g), Salt (0.5 cup -> 136.5g).
   - Unknown ingredients -> returns `null`.
   - Negative values -> returns `null`.
8. **Food Costing**: Line items, total cost, cost per serving, food cost percentage against menu price, zero servings edge case, zero menu price edge case.
9. **Variance Analysis**:
   - `< 2%` variance -> `'ok'`
   - `2% - 4.99%` variance -> `'warn'`
   - `>= 5%` variance -> `'alert'`
   - Favorable vs unfavorable variance (negative actual vs positive actual).
10. **Waste Summarization & Percentage**:
    - Waste entries grouped by reason (`spoilage`, `trim`, `overcook`).
    - Top wasted ingredients sorted by dollar loss.
    - Waste percentage calculation with zero total food cost.
11. **Shift Prep Planning & Batch Projection**:
    - Generates tasks only for items where `currentStock < parLevel`.
    - Omits items with sufficient stock (`currentStock >= parLevel`).
    - Station routing preservation on tasks.
    - Batch requirement projection with buffer factors (`wasteFactor = 1.1`).
12. **Legacy Backward Compatibility**:
    - `scaleBlueprint`, `computeCost`, `fromTotalWeight` continue passing all existing test assertions.
