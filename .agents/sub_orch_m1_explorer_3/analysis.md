# Comprehensive Investigation: CulinaryOS Math, Cost, Prep & Waste Models

**Explorer**: Explorer 3 (Milestone 1 — M1)  
**Date**: 2026-08-16T01:20:16Z  
**Target Package**: `packages/ratio-engine`  
**Repository Scope**: `apps/server`, `apps/pos`, `apps/admin`, `apps/kds`, `mcp`, `packages/shared`, `packages/db`, `packages/event-bus`, `tests`

---

## 1. Executive Summary

A comprehensive survey of mathematical models, unit conversion logic, food costing, cost variance calculations, waste tracking, shift prep planning, and inventory par evaluation was conducted across the CulinaryOS monorepo.

Currently, culinary mathematical logic is fragmented across multiple layers:
1. **`packages/ratio-engine/src/index.ts`** currently contains an initial minimal 71-line implementation providing 3 functions: `scaleBlueprint`, `computeCost`, and `fromTotalWeight`.
2. **`apps/server/src/routes/ops.ts`** contains inline logic for waste cost computation (`qty * costPerGram`), waste aggregation by ingredient/reason, food cost percentage (`ingredientCost / salePrice`), and status classification (`good` <= 30%, `watch` <= 35%, `high` > 35%).
3. **`apps/server/src/routes/pantry.ts`** contains inline stock status evaluation (`ok` | `low_stock` | `out_of_stock`), par shortfall reorder calculations (`Math.max(reorder_qty, par_level - current_qty)`), and purchase order line total cost summation.
4. **`packages/event-bus/src/handlers/pos-order-created.ts`** contains inline plate economics calculation (`sale_price_cents` vs `theoretical_cost_cents`).
5. **`mcp/src/`** contains several mock/satellite servers (`recipe-server.ts`, `prep-server.ts`, `inventory-server.ts`, `culinaryops-server.ts`, `culinaryops-hub-live.ts`) that execute manual multiplier-based prep calculations, audit variance and monetary loss math (`physicalQty - stockQuantity`), and labor/waste summaries.
6. **`tests/empirical/`** and **`tests/inventory/`** contain empirical assertions validating `scaleBlueprint`, stock status derivation, and audit variance.

To satisfy Milestone 1 requirements without breaking any existing callers, `packages/ratio-engine` must export all 14 canonical functions specified in `SCOPE.md` and `PROJECT.md`, while maintaining strict backward-compatible aliases for legacy functions (`scaleBlueprint`, `computeCost`, `fromTotalWeight`) and legacy types (`RatioBlueprint`, `RatioBlueprintIngredient`).

---

## 2. Comprehensive Caller Map & Existing Implementations

The table below catalogs all existing mathematical call-sites, functions, files, line numbers, input/output data shapes, and their migration mapping to `@culinaryos/ratio-engine`.

| # | File Path | Line(s) | Current Implementation / Math | Input / Output Shapes | Target Ratio Engine Function / Strategy |
|---|-----------|---------|-------------------------------|-----------------------|-----------------------------------------|
| 1 | `packages/ratio-engine/src/index.ts` | 6–71 | `scaleBlueprint`, `computeCost`, `fromTotalWeight` | `RatioBlueprint`, `RatioBlueprintIngredient` | Retain as backward-compatible exports alongside new 14 pure functions. |
| 2 | `packages/ratio-engine/src/index.test.ts` | 1–45 | Unit tests for `scaleBlueprint`, `computeCost`, `fromTotalWeight` | Sourdough ratio blueprint | Retain existing test suite + expand to 100% coverage of all 14 functions. |
| 3 | `mcp/src/recipe-server.ts` | 7, 105, 131–136, 151–157 | `scaleBlueprint`, baker's ratio formatting, batch cover scaling (`Math.ceil(scaleFactor * baseYield)`) | In: `{ recipeId, targetYield }`, `{ targetCovers }` | Direct consumer of `scaleBlueprint`, `calculateRatio`, `scaleRecipeTree`, `projectBatchRequirement`. |
| 4 | `mcp/src/prep-server.ts` | 76–94, 99–114 | Manual multiplier prep scaling `(qty * expectedCovers / 100)` | In: `{ shift, expectedCovers }`, Out: `prepTasks` | Refactor in M4 to use `generateShiftPrepPlan` and `projectBatchRequirement`. |
| 5 | `mcp/src/inventory-server.ts` | 93–95, 116 | Physical audit variance: `physicalQty - currentQty`, loss: `\|variance * cost_per_unit\|` | In: `{ itemId, physicalQty }`, Out: audit string | Uses variance formula aligned with `calculateCostVariance`. |
| 6 | `mcp/src/culinaryops-server.ts` | 148–173, 184–195 | Mock food cost (`sale_price`, `ingredient_cost`, `food_cost_pct`), waste cost (`quantity_grams * cost_per_gram`), PO total cost | JSON payloads | Satellite mock; mirrors `computeRecipeCost`, `summarizeWaste`. |
| 7 | `mcp/src/culinaryops-hub-live.ts` | 173–241, 268–303 | Calls `/v1/ops/*` with fallback waste cost (`qty * cost_per_gram`) & PO line total summation | JSON payloads | Consumers of `/v1/ops/*` backed by ratio-engine. |
| 8 | `apps/server/src/routes/ops.ts` | 45 | Waste event cost: `Math.round(qty * costPerGram * 100) / 100` | In: `{ quantity_grams, cost_per_gram }`, Out: `waste_cost` | Matches `WasteLogEntry` cost calculation in `summarizeWaste`. |
| 9 | `apps/server/src/routes/ops.ts` | 135–155 | Waste summary aggregation: sums `total_cost`, `total_grams`, groups by ingredient, sorts top 5 | In: query params `from`, `to`; Out: `{ total_cost, total_grams, top_offenders }` | Exact implementation of `summarizeWaste`. |
| 10 | `apps/server/src/routes/ops.ts` | 192–233 | Food costing: resolves `recipe_ingredients`, sums `quantity * cost_per_unit`, computes `food_cost_pct`, status (`good`/`watch`/`high`) | In: `itemId`, Out: `{ sale_price, ingredient_cost, food_cost_pct, status }` | Implements logic encapsulated by `computeRecipeCost`. |
| 11 | `apps/server/src/routes/ops.ts` | 235–248 | Plate economics query | In: `order_id`, Out: `plate_economics` rows | Stores output of theoretical vs actual food cost. |
| 12 | `apps/server/src/routes/pantry.ts` | 24–27 | Stock status derivation: `<= 0` -> `out_of_stock`, `<= reorder_at` -> `low_stock`, else `ok` | In: `current_qty`, `reorder_at`, Out: status string | Canonical stock status logic. |
| 13 | `apps/server/src/routes/pantry.ts` | 103, 197 | Par shortfall reorder quantity: `Math.max(reorder_qty, par_level - current_qty)` | In: `reorder_at`, `current_qty`, Out: `ordered_qty` | Core inventory replenishment formula. |
| 14 | `apps/server/src/routes/pantry.ts` | 114, 282 | Purchase order total cost: `sum(ordered_qty * unit_cost)` | In: `line_items`, Out: `total_cost` | PO financial aggregation. |
| 15 | `apps/server/src/routes/pantry.ts` | 567, 744 | Stock deduction: `Math.max(0, current_qty - deductQty)` | In: `itemId`, `quantity`, Out: updated stock | Closed-loop inventory decrement. |
| 16 | `apps/server/src/routes/orders.ts` | 157, 174–176 | POS order line total: `price * quantity`, order tax: `round(subtotal * 0.1)`, total: `subtotal + tax` | In: `unitPrice`, `quantity`, Out: order totals | POS financial calculation spine. |
| 17 | `apps/server/src/routes/reports.ts` | 33–46, 67–81, 148–154 | Sales summary rollup, KDS average ticket time (`avgTimeMs = sum(bumped - fired) / count`), EOD totals | In: date range, Out: revenue, orders, avg time | Analytics & reporting aggregations. |
| 18 | `packages/event-bus/src/handlers/pos-order-created.ts` | 151–172 | Plate economics theoretical cost snapshot: `sum(quantity * cost_per_unit) * itemQuantity` | In: order items, Out: `plate_economics` insert | Integrates recipe ingredient costing at order fire. |
| 19 | `apps/pos/src/views/ReportsView.tsx` | 12–37 | Product Mix (PM Mix) and terminal gross sales aggregation | In: paid orders, Out: `pmMixList` | POS terminal client-side reporting. |
| 20 | `apps/admin/src/pages/Pantry.tsx` | 58–60, 110 | Cents formatting (`$${(c/100).toFixed(2)}`), alerts filter (`stock_status !== 'ok'`) | In: `items`, Out: UI table & alerts | Back-office admin UI presentation. |
| 21 | `tests/empirical/step1_plated_inventory.test.ts` | 2, 43, 64–82 | Tests `scaleBlueprint` with sourdough blueprint and calculates kg deduction | In: `RatioBlueprint`, 4 loaves; Out: scaled grams | Verifies compatibility of `scaleBlueprint` in ratio engine. |
| 22 | `tests/empirical/step3_culinaryops_mcp.test.ts` | 35–51 | Labor total hours/cost/avg hourly; Waste cost from `quantity_grams * cost_per_gram` | In: shift rates, grams, cost/gram | Verifies ops tool calculations. |
| 23 | `tests/empirical/step3_mcp_servers.test.ts` | 2, 73, 99–106, 115–127, 162–170 | Tests `scaleBlueprint`, cover prep batching, shift prep multipliers, audit variance & loss | In: `MOCK_RECIPES`, covers, count | Verifies MCP server mathematical correctness. |
| 24 | `tests/inventory/pantry.test.ts` | 5–16, 44–58 | Tests stock status derivation and PO total cost computation | In: `current`, `reorder_at`, lines | Verifies pantry status rules. |
| 25 | `tests/reports/eod.test.ts` | 8–22, 46–55, 73–82 | EOD revenue (gross, voids, net, avg check, rev/cover), hourly breakdown, void reason grouping | In: order arrays | Verifies EOD rollup algorithms. |

---

## 3. Mathematical Domain Analysis & Detailed Specifications

### Domain A: Recipe Blueprints & Sub-Recipe Tree Scaling
- **Current State**: `packages/ratio-engine` implements flat 1-level scaling via `scaleBlueprint(blueprint, targetYield)`. Sibling repos (`RecipeOS`, `KitchenKit`) model recipes with recursive sub-recipes (e.g. `Pizza` -> `Pizza Dough`, `Marinara Sauce`, `Mozzarella`; `Marinara Sauce` -> `Canned Tomatoes`, `Garlic`, `Olive Oil`, `Basil`).
- **Mathematical Model**:
  1. *Sub-Recipe Scaling*: For each ingredient in a `RecipeBlueprint`, calculate `amount = (ingredient.ratio / 100) * targetYield` or `ingredient.amount * (targetYield / baseYield)`. If an ingredient has a `subRecipe` (or `subRecipeId`), recursively scale the sub-recipe with `targetYield = parent_ingredient_amount`.
  2. *Tree Flattening*: Flatten the scaled tree into a single-level map `Record<string, ScaledIngredientSummary>` keyed by ingredient ID or name. Sum the `amount` and `totalCost` for identical raw leaf ingredients.
  3. *Baker's Percentage*: Base ingredient (typically flour) is defined as 100% (or ratio = 100). All other ingredients are expressed as a percentage of the base ingredient weight:
     $$\text{Baker's \%} = \left(\frac{\text{Ingredient Weight}}{\text{Base Weight}}\right) \times 100$$
  4. *Total Formula Weight*: Given target weight for base ingredient $W_{\text{base}}$:
     $$\text{Total Weight} = W_{\text{base}} \times \left(\frac{\sum \text{ratios}}{\text{baseRatio}}\right)$$

### Domain B: Volumetric/Gravimetric Conversions & Smart Formatting
- **Current State**: Density conversions were scattered in RecipeOS; no central conversion utility exists in CulinaryOS.
- **Density Lookup Table (grams per 1 US Cup)**:
  - `flour` (all-purpose, bread, whole wheat): $125\,\text{g/cup}$
  - `sugar` (granulated, white, cane): $200\,\text{g/cup}$
  - `butter` (unsalted, salted, clarified): $227\,\text{g/cup}$
  - `salt` (fine sea salt, kosher, table): $273\,\text{g/cup}$
  - `rice` (jasmine, basmati, white, brown): $185\,\text{g/cup}$
  - `oats` (rolled, quick, steel cut): $90\,\text{g/cup}$
- **Conversions**:
  - $\text{cups} = \frac{\text{grams}}{\text{density}}$
  - $\text{grams} = \text{cups} \times \text{density}$
  - Unknown ingredient or negative quantity returns `null`.
- **Smart Decimal Formatting (`formatAmount`)**:
  - Integers (e.g. $10$, $500$) $\to$ string with no decimal point (`"10"`, `"500"`).
  - Values $\ge 1$ with decimals (e.g. $1.5$, $3.85$, $12.333$) $\to$ rounded to 1 decimal place (`"1.5"`, `"3.9"`, `"12.3"`), trimming trailing `.0`.
  - Values $< 1$ (e.g. $0.25$, $0.75$, $0.05$) $\to$ rounded to 2 decimal places (`"0.25"`, `"0.75"`, `"0.05"`), trimming trailing zeros.

### Domain C: Food Costing, Plate Economics & Variance Analysis
- **Current State**: Implemented inline in `apps/server/src/routes/ops.ts` (lines 192–233) and `mcp/src/culinaryops-server.ts` (lines 148–155).
- **Mathematical Formulations**:
  1. *Total Recipe Cost*:
     $$\text{Total Cost} = \sum_{i} (\text{quantity}_i \times \text{unitCost}_i)$$
  2. *Cost per Serving*:
     $$\text{Cost Per Serving} = \frac{\text{Total Cost}}{\text{servings}}$$
  3. *Food Cost Percentage*:
     $$\text{Food Cost \%} = \left(\frac{\text{Cost Per Serving}}{\text{Menu Price}}\right) \times 100$$
  4. *Target Cost Status Classification*:
     - $\text{Food Cost \%} \le 30.0\% \implies \text{"good"}$
     - $30.0\% < \text{Food Cost \%} \le 35.0\% \implies \text{"watch"}$
     - $\text{Food Cost \%} > 35.0\% \implies \text{"high"}$
     - If $\text{Food Cost \%} = 0 \implies \text{"unknown"}$
  5. *Actual vs. Theoretical Cost Variance*:
     $$\text{Variance (\$) } = \text{Actual Cost} - \text{Theoretical Cost}$$
     $$\text{Variance (\%)} = \left(\frac{\text{Actual Cost} - \text{Theoretical Cost}}{\text{Theoretical Cost}}\right) \times 100$$
     Status:
     - $|\text{Variance \%}| < 2.0\% \implies \text{"ok"}$
     - $2.0\% \le |\text{Variance \%}| < 5.0\% \implies \text{"warn"}$
     - $|\text{Variance \%}| \ge 5.0\% \implies \text{"alert"}$

### Domain D: Waste Tracking & Ops Summarization
- **Current State**: Implemented inline in `apps/server/src/routes/ops.ts` (lines 45, 135–155).
- **Mathematical Formulations**:
  1. *Waste Event Dollar Loss*:
     $$\text{Waste Cost} = \text{round}(\text{quantity\_grams} \times \text{cost\_per\_gram} \times 100) / 100$$
  2. *Waste Summarization*:
     - $\text{Total Grams} = \sum \text{quantityGrams}$
     - $\text{Total Cost} = \sum (\text{quantityGrams} \times \text{costPerGram})$
     - $\text{byReason}[\text{reason}] = \{ \text{grams}: \sum \text{grams}, \text{cost}: \sum \text{cost} \}$
     - $\text{topOffenders}$: Group entries by `ingredient`, sum `grams` and `cost`, sort descending by `cost`.
  3. *Waste Percentage of Food Cost*:
     $$\text{Waste \%} = \left(\frac{\text{Total Waste Cost}}{\text{Total Food Cost}}\right) \times 100$$

### Domain E: Shift Prep, Mise en Place & Batch Projections
- **Current State**: Implemented as mock multiplier heuristics in `mcp/src/prep-server.ts` and `mcp/src/recipe-server.ts`.
- **Mathematical Formulations**:
  1. *Par Shortfall Calculation*:
     $$\text{Shortfall} = \max(0, \text{parLevel} - \text{currentStock})$$
  2. *Batch Requirement Projection*:
     $$\text{Total Batch Requirement} = \text{portionWeight} \times \text{covers} \times (1 + \text{wasteFactor})$$
     Where $\text{wasteFactor}$ defaults to $0$ if omitted (e.g. $0.05$ for $5\%$ prep waste buffer).

---

## 4. Complete Unified Interface Contracts for `packages/ratio-engine`

To satisfy all requirements and maintain 100% backward compatibility, `packages/ratio-engine/src/index.ts` should declare the following clean, typed interfaces and exports:

```typescript
// ============================================================
// @culinaryos/ratio-engine
// Pure TypeScript — zero dependencies.
// Mathematical engine for recipe scaling, baker's percentages,
// density unit conversions, food costing, variance, waste, and prep.
// ============================================================

export type MeasurementUnit =
  | 'g' | 'kg' | 'ml' | 'l' | 'oz' | 'lb' | 'tsp' | 'tbsp' | 'cup' | 'count' | 'pcs';

// ------------------------------------------------------------
// 1. Blueprint & Sub-Recipe Tree Scaling Types
// ------------------------------------------------------------

export interface RatioBlueprintIngredient {
  id: string;
  name: string;
  /** Baker's percentage or ratio unit. Base ingredient = 100. */
  ratioWeight: number;
  unit: 'g' | 'ml' | 'oz' | 'count' | MeasurementUnit;
}

export interface RatioBlueprint {
  id: string;
  name: string;
  /** The yield this ratio describes at ratioWeight = 100. */
  baseYield: number;
  yieldUnit: string;
  ingredients: RatioBlueprintIngredient[];
}

export interface RecipeIngredientItem {
  id: string;
  name: string;
  ratio?: number;           // Baker's percentage or ratio unit
  ratioWeight?: number;     // Backward compatibility alias for ratio
  amount?: number;          // Fixed base quantity
  unit: MeasurementUnit | string;
  subRecipeId?: string;
  subRecipe?: RecipeBlueprint;
  costPerUnit?: number;     // Cost per unit (in dollars or cents)
}

export interface ScaledIngredientResult {
  id: string;
  name: string;
  amount: number;
  unit: MeasurementUnit | string;
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
  unit: MeasurementUnit | string;
  totalCost: number;
}

// ------------------------------------------------------------
// 2. Food Costing & Cost Variance Types
// ------------------------------------------------------------

export interface RecipeCostIngredientInput {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface RecipeCostAnalysis {
  ingredientCosts: Array<{
    id: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalCost: number;
  costPerServing: number;
  foodCostPct: number;
  status: 'good' | 'watch' | 'high';
}

export interface CostVarianceResult {
  theoreticalCost: number;
  actualCost: number;
  varianceDollars: number;
  variancePct: number;
  status: 'ok' | 'warn' | 'alert';
}

// ------------------------------------------------------------
// 3. Waste & Ops Summarization Types
// ------------------------------------------------------------

export type WasteReason = 'spoilage' | 'trim' | 'overcook' | 'drop' | 'expired' | 'other' | 'sale';

export interface WasteLogEntry {
  ingredient: string;
  quantityGrams: number;
  costPerGram: number;
  reason: WasteReason | string;
  logDate?: string;
  notes?: string;
}

export interface WasteSummaryReport {
  totalGrams: number;
  totalCost: number;
  logCount: number;
  byReason: Record<string, { grams: number; cost: number }>;
  topOffenders: Array<{ ingredient: string; grams: number; cost: number }>;
}

// ------------------------------------------------------------
// 4. Shift Prep & Inventory Types
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// 5. Function Signatures (14 Canonical Contracts + 3 Legacy Aliases)
// ------------------------------------------------------------

// Canonical 14 functions:
export function scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult;
export function flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, ScaledIngredientSummary>;
export function scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[];
export function calculateRatio(ingredientWeight: number, baseWeight: number): number;
export function totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number;
export function formatAmount(value: number): string;
export function gramsToCups(grams: number, ingredient: string): number | null;
export function cupsToGrams(cups: number, ingredient: string): number | null;
export function computeRecipeCost(ingredients: RecipeCostIngredientInput[], servings: number, menuPrice: number): RecipeCostAnalysis;
export function calculateCostVariance(theoretical: number, actual: number): CostVarianceResult;
export function summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport;
export function calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number;
export function generateShiftPrepPlan(items: InventoryStockItem[], shift: 'morning' | 'evening' | 'prep', date: string): ShiftPrepPlan;
export function projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number;

// Legacy / Existing Backward-Compatible Exports:
export function scaleBlueprint(blueprint: RatioBlueprint, targetYield: number): RatioBlueprintIngredient[];
export function computeCost(scaled: RatioBlueprintIngredient[], priceMap: Record<string, number>): number;
export function fromTotalWeight(blueprint: RatioBlueprint, totalDoughWeightGrams: number): RatioBlueprintIngredient[];
```

---

## 5. Potential Breaking Changes & Mitigation Plan

1. **Legacy `scaleBlueprint` signature & return type**:
   - *Risk*: `tests/empirical/step1_plated_inventory.test.ts`, `tests/empirical/step3_mcp_servers.test.ts`, and `mcp/src/recipe-server.ts` call `scaleBlueprint(recipe, targetYield)` expecting `RatioBlueprintIngredient[]` with `ratioWeight`.
   - *Mitigation*: Retain `scaleBlueprint` as a dedicated top-level function that preserves the exact array of `{ id, name, ratioWeight, unit }` shape.
2. **`RatioBlueprint` vs `RecipeBlueprint` interface naming**:
   - *Risk*: `tests/empirical/step1_plated_inventory.test.ts` imports `RatioBlueprint`.
   - *Mitigation*: Export both `RatioBlueprint` and `RecipeBlueprint` (aliased or compatible) with optional fields.
3. **Unit Cost Representation (Cents vs. Dollars)**:
   - *Risk*: `apps/server/src/routes/ops.ts` stores ingredient cost in dollars (e.g. `0.05`/g or `$4.15`), while `ingredients.cost_per_unit` in database V7 is in cents (integer).
   - *Mitigation*: Document clearly in `computeRecipeCost` and `calculateCostVariance` that inputs should be in consistent currency units (dollars or cents) and output matches input scale.
4. **Fuzzy String Matching in Density Conversions**:
   - *Risk*: Ingredients named `"Bread Flour"`, `"Organic Cane Sugar"`, `"Fine Sea Salt"` may fail strict equality checks.
   - *Mitigation*: Implement case-insensitive `.toLowerCase().includes(...)` keyword matching against known density tokens (`flour`, `sugar`, `butter`, `salt`, `rice`, `oats`).

---

## 6. Future Milestone Integration Guide (M2 & M4)

- **Milestone 2 (Closed-Loop Event Spine & Ops Endpoints)**:
  - `POST /v1/pantry/deduct-order`: Call `scaleBlueprint` / `scaleRecipeTree` for each item in the order to calculate exact pantry ingredient quantities to decrement from `ingredients` table.
  - `GET /v1/ops/food-cost/:itemId`: Delegate directly to `computeRecipeCost`.
  - `POST /v1/ops/waste` & `GET /v1/ops/waste/summary`: Delegate directly to `summarizeWaste` and `calculateWastePercentage`.
- **Milestone 4 (MCP Tool Servers Consolidation)**:
  - `mcp/src/recipe-server.ts`: Utilize `scaleRecipeTree`, `flattenScaledTree`, `calculateRatio`, `gramsToCups`, and `cupsToGrams`.
  - `mcp/src/prep-server.ts`: Replace manual multiplier logic with `generateShiftPrepPlan` and `projectBatchRequirement`.
  - `mcp/src/inventory-server.ts`: Utilize `calculateCostVariance` for physical inventory audit reconciliation.
  - `mcp/src/culinaryops-hub-live.ts`: Wire directly to consolidated `/v1/ops/*` endpoints backed by ratio engine pure functions.
