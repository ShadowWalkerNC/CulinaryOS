# Comprehensive E2E Specification Survey & Test Blueprints

**Track**: CulinaryOS E2E Testing Track — Tier 1 Feature Coverage  
**Agent**: `e2e_spec_miner_1` (SPECIFICATION MINER)  
**Date**: 2026-08-16  
**Workspace Root**: `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS`  
**Target File**: `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\e2e_spec_miner_1\survey_report.md`  

---

## 1. Executive Summary & Specification Scope

This survey establishes the authoritative opaque-box and white-box test specifications for CulinaryOS across four core operational domains:
1. **Pure Ratio Engine** (`packages/ratio-engine/src/index.ts`): 14 mathematical, portion scaling, unit conversion, food costing, waste analysis, and prep projection functions.
2. **POS Order Firing & Station Routing** (`apps/server/src/routes/orders.ts`, `apps/server/src/routes/kds.ts`, `packages/shared/src/stations.ts`, `packages/shared/src/course-engine.ts`, `apps/kds`): Order lifecycle, line item assembly, multi-station kitchen routing, course holding/firing, ticket bump workflows, and real-time aging alerts.
3. **Terminal PIN Authentication** (`apps/server/src/routes/auth.ts`, `packages/auth/src/index.ts`, `apps/server/src/lib/pin.ts`): 4–8 digit PIN validation, demo mode bypass (1234/5678), live salted scrypt password verification against Supabase Auth, and client session storage.
4. **Offline LocalStorage Sync Queue** (`packages/shared/src/offline-sync.ts`): Offline POS transaction delta queueing, cryptographic UUID generation, immutable sync marking, confirmed-ID API replay, and in-flight mutex concurrency control.

Every feature documented below includes exact TypeScript interface signatures, data contracts, observable behavior, error handling specifications, and a minimum of **5 category-partition / boundary value test blueprints**.

---

## 2. Domain 1: Pure Ratio Engine (`@culinaryos/ratio-engine`)

The Ratio Engine is a zero-dependency, pure TypeScript mathematical library powering recipe scaling, unit conversions, food costing, waste metrics, and shift prep across the monorepo.

### 2.1 Shared Data Types & Interfaces
```typescript
export type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'oz' | 'lb' | 'tsp' | 'tbsp' | 'cup' | 'count';

export interface RecipeIngredientItem {
  id: string;
  name: string;
  ratio: number; // Baker's percentage (1.0 = 100% base flour/protein)
  unit: MeasurementUnit;
  subRecipeId?: string;
  subRecipe?: RecipeBlueprint;
  costPerUnit?: number; // monetary cost per unit (e.g. cents or dollars)
}

export interface RecipeBlueprint {
  id: string;
  name: string;
  baseIngredient: string;
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
```

---

### 2.2 Feature Specifications & Test Blueprints

#### Feature 1.1: `scaleRecipeTree`
- **Signature**: `scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult`
- **Description**: Recursively scales a recipe blueprint and all nested `subRecipe` trees to match `targetYield`.
- **Inputs**: `recipe: RecipeBlueprint`, `targetYield: number` (must be > 0).
- **Outputs**: `ScaledRecipeTreeResult` with scaled ingredient amounts, individual costs, and aggregated `totalCost`.
- **Error Behavior**: Throws `Error('targetYield must be > 0')` if `targetYield <= 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_1_1 (Basic Scaling)`: Scale single-level recipe from base yield 1 to target yield 5. Verify all ingredients scale by factor 5.0.
  2. `TC_RATIO_1_1_2 (Nested Sub-Recipe)`: Scale composite recipe (e.g. Pepperoni Pizza) with sub-recipe (Pizza Dough). Verify dough ingredients scale proportionally to the parent recipe's required dough amount.
  3. `TC_RATIO_1_1_3 (Deep Recursive Hierarchy)`: Scale 3-tier recipe (Tier 1 Dish -> Tier 2 Sauce -> Tier 3 Stock Base). Verify mathematical precision down all levels.
  4. `TC_RATIO_1_1_4 (Zero and Negative Target Yield)`: Passing `targetYield = 0` or `targetYield = -2.5` throws Error.
  5. `TC_RATIO_1_1_5 (Fractional Portion Scaling)`: Scale recipe with base yield 4 to target yield 1.5. Verify accurate floating point calculations.
  6. `TC_RATIO_1_1_6 (Cost Rollup)`: Ensure `totalCost` on parent equals the sum of top-level ingredients and nested sub-recipe costs.

#### Feature 1.2: `flattenScaledTree`
- **Signature**: `flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, ScaledIngredientSummary>`
- **Description**: Flattens a hierarchical scaled tree into a single consolidated dictionary of raw ingredients, summing amounts and costs for ingredients shared across sub-recipes.
- **Inputs**: `tree: ScaledRecipeTreeResult`.
- **Outputs**: `Record<string, ScaledIngredientSummary>` keyed by ingredient `id`.
- **Error Behavior**: Returns empty record `{}` for an empty recipe tree.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_2_1 (Unique Ingredients)`: Flatten single-level tree; verify output matches ingredient array mapped by ID.
  2. `TC_RATIO_1_2_2 (Cross-Subrecipe Aggregation)`: Recipe uses Salt in crust (10g) and Salt in sauce (5g). Verify flattened output contains single `'salt'` key with amount = 15g.
  3. `TC_RATIO_1_2_3 (Cost Aggregation)`: Verify `totalCost` for aggregated ingredients is summed accurately.
  4. `TC_RATIO_1_2_4 (Multi-Level Sub-Recipe Flattening)`: Verify ingredients at depth 3 are brought to top-level dictionary.
  5. `TC_RATIO_1_2_5 (Empty Tree)`: Tree with 0 ingredients produces `{}` without runtime errors.

#### Feature 1.3: `scaleByServings`
- **Signature**: `scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[]`
- **Description**: Linearly scales arbitrary objects containing an `amount: number` property by `(targetServings / baseServings)`.
- **Inputs**: `items: T[]`, `baseServings: number` (> 0), `targetServings: number` (>= 0).
- **Outputs**: New array of objects of type `T` with scaled `amount`.
- **Error Behavior**: Throws Error if `baseServings <= 0` or `targetServings < 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_3_1 (Doubling Servings)`: Scale 4 servings to 8 servings. Verify 2x multiplier across all items.
  2. `TC_RATIO_1_3_2 (Fractional Reduction)`: Scale 10 servings to 1 serving. Verify 0.1x multiplier.
  3. `TC_RATIO_1_3_3 (Preservation of Non-Amount Properties)`: Verify metadata fields (e.g. `id`, `name`, `unit`, `notes`) are preserved untouched.
  4. `TC_RATIO_1_3_4 (Zero Base Servings Error)`: Calling with `baseServings = 0` throws Error.
  5. `TC_RATIO_1_3_5 (Zero Target Servings)`: Calling with `targetServings = 0` sets all `amount` values to 0.

#### Feature 1.4: `calculateRatio`
- **Signature**: `calculateRatio(ingredientWeight: number, baseWeight: number): number`
- **Description**: Computes baker's percentage / ratio of an ingredient relative to base weight (base = 1.0 or 100%).
- **Inputs**: `ingredientWeight: number`, `baseWeight: number` (> 0).
- **Outputs**: `number` ratio (e.g. 0.75 for 75% hydration).
- **Error Behavior**: Throws Error if `baseWeight <= 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_4_1 (Water Hydration)`: 750g water / 1000g flour -> returns 0.75.
  2. `TC_RATIO_1_4_2 (Base Ingredient Identity)`: 1000g flour / 1000g flour -> returns 1.0.
  3. `TC_RATIO_1_4_3 (Micro Ingredient Ratio)`: 20g salt / 1000g flour -> returns 0.02.
  4. `TC_RATIO_1_4_4 (Zero Ingredient Weight)`: 0g ingredient / 1000g flour -> returns 0.0.
  5. `TC_RATIO_1_4_5 (Zero / Negative Base Weight)`: `baseWeight = 0` or `baseWeight = -500` throws Error.

#### Feature 1.5: `totalFormulaWeight`
- **Signature**: `totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number`
- **Description**: Calculates the total batch weight in grams when the base ingredient weight is scaled to `targetBaseWeight`.
- **Inputs**: `recipe: RecipeBlueprint`, `targetBaseWeight: number` (> 0).
- **Outputs**: `number` total formula weight in grams.
- **Error Behavior**: Throws Error if `targetBaseWeight <= 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_5_1 (Standard Sourdough Formula)`: Flour (1.0) + Water (0.75) + Starter (0.20) + Salt (0.02) = 1.97 ratio sum. For 1000g flour, total formula weight = 1970g.
  2. `TC_RATIO_1_5_2 (Brioche Formula)`: High fat ratio (Flour 1.0, Butter 0.5, Eggs 0.4, Sugar 0.1, Salt 0.02, Yeast 0.01 = 2.03). For 500g flour, total = 1015g.
  3. `TC_RATIO_1_5_3 (Single Ingredient Formula)`: Recipe with only base ingredient returns `targetBaseWeight`.
  4. `TC_RATIO_1_5_4 (Zero / Negative Target Base Weight)`: Throws Error on `targetBaseWeight <= 0`.
  5. `TC_RATIO_1_5_5 (Fractional Base Weight)`: `targetBaseWeight = 333.33g` calculates with floating point precision.

#### Feature 1.6: `formatAmount`
- **Signature**: `formatAmount(value: number): string`
- **Description**: Smart decimal portion formatter: whole integers -> no decimals, >= 1 -> up to 1 decimal place, < 1 -> up to 2 decimal places.
- **Inputs**: `value: number`.
- **Outputs**: Formatted `string`.
- **Error Behavior**: Handles 0 -> "0", negative numbers, NaN -> "0".
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_6_1 (Whole Numbers)`: `1` -> `"1"`, `12` -> `"12"`, `0` -> `"0"`.
  2. `TC_RATIO_1_6_2 (Numbers >= 1)`: `1.5` -> `"1.5"`, `2.333` -> `"2.3"`, `4.0` -> `"4"`.
  3. `TC_RATIO_1_6_3 (Numbers < 1)`: `0.25` -> `"0.25"`, `0.125` -> `"0.13"`, `0.5` -> `"0.5"`.
  4. `TC_RATIO_1_6_4 (Trailing Decimal Stripping)`: `2.00` -> `"2"`, `3.10` -> `"3.1"`.
  5. `TC_RATIO_1_6_5 (Very Small Decimals)`: `0.004` -> `"0"` or `"0.00"`.

#### Feature 1.7: `gramsToCups`
- **Signature**: `gramsToCups(grams: number, ingredient: string): number | null`
- **Description**: Converts grams to cups using authoritative culinary density constants:
  - Flour: 125 g/cup
  - Sugar: 200 g/cup
  - Butter: 227 g/cup
  - Salt: 273 g/cup
  - Rice: 185 g/cup
  - Oats: 90 g/cup
- **Inputs**: `grams: number`, `ingredient: string` (case-insensitive substring match).
- **Outputs**: `number | null` (cups amount or `null` if density unknown).
- **Error Behavior**: Returns `null` on unknown ingredient; returns 0 for 0 grams.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_7_1 (Flour Conversion)`: 250g flour -> returns 2.0 cups.
  2. `TC_RATIO_1_7_2 (Sugar Conversion)`: 400g sugar -> returns 2.0 cups.
  3. `TC_RATIO_1_7_3 (Butter Conversion)`: 227g butter -> returns 1.0 cup.
  4. `TC_RATIO_1_7_4 (Case-Insensitive Match)`: `"Bread Flour"`, `"All-Purpose FLOUR"` match flour (125g/cup).
  5. `TC_RATIO_1_7_5 (Unknown Ingredient)`: `"truffle oil"` returns `null`.
  6. `TC_RATIO_1_7_6 (Zero Grams)`: 0g flour returns 0.

#### Feature 1.8: `cupsToGrams`
- **Signature**: `cupsToGrams(cups: number, ingredient: string): number | null`
- **Description**: Converts cups to grams using culinary density constants.
- **Inputs**: `cups: number`, `ingredient: string`.
- **Outputs**: `number | null` (grams amount or `null` if density unknown).
- **Error Behavior**: Returns `null` on unknown ingredient; returns 0 for 0 cups.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_8_1 (Flour Conversion)`: 2 cups flour -> returns 250g.
  2. `TC_RATIO_1_8_2 (Oats Conversion)`: 3 cups oats -> returns 270g (90g/cup).
  3. `TC_RATIO_1_8_3 (Salt Conversion)`: 0.5 cups salt -> returns 136.5g (273g/cup).
  4. `TC_RATIO_1_8_4 (Unknown Ingredient)`: `"saffron"` returns `null`.
  5. `TC_RATIO_1_8_5 (Zero Cups)`: 0 cups sugar returns 0.

#### Feature 1.9: `computeRecipeCost`
- **Signature**: `computeRecipeCost(ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>, servings: number, menuPrice: number): RecipeCostAnalysis`
- **Description**: Computes total plate cost, individual component totals, cost per serving, and food cost percentage relative to menu selling price.
- **Inputs**: `ingredients: Array<{ id, name, quantity, unitCost }>`, `servings: number`, `menuPrice: number`.
- **Outputs**: `RecipeCostAnalysis` `{ ingredientCosts, totalCost, costPerServing, foodCostPct }`.
- **Error Behavior**: If `servings <= 0` or `menuPrice <= 0`, foodCostPct is 0 or safe fallback.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_9_1 (Standard Food Cost)`: $5.00 total cost, 1 serving, $20.00 menu price -> costPerServing = $5.00, foodCostPct = 25.0%.
  2. `TC_RATIO_1_9_2 (Multi-Serving Batch)`: $40.00 total cost, 8 servings, $15.00 menu price per serving -> costPerServing = $5.00, foodCostPct = 33.33%.
  3. `TC_RATIO_1_9_3 (Zero Cost Ingredients)`: Component with `unitCost = 0` (e.g. water) contributes $0 without error.
  4. `TC_RATIO_1_9_4 (Zero Menu Price)`: `menuPrice = 0` produces `foodCostPct = 0` without divide-by-zero crash.
  5. `TC_RATIO_1_9_5 (Empty Ingredients)`: 0 ingredients produces `totalCost = 0`, `costPerServing = 0`, `foodCostPct = 0`.

#### Feature 1.10: `calculateCostVariance`
- **Signature**: `calculateCostVariance(theoretical: number, actual: number): CostVarianceResult`
- **Description**: Evaluates dollar and percentage cost variance between theoretical recipe cost and actual stock depletion, returning threshold status: `ok` (<2%), `warn` (2% to 5%), `alert` (>=5%).
- **Inputs**: `theoretical: number`, `actual: number`.
- **Outputs**: `CostVarianceResult` `{ theoreticalCost, actualCost, varianceDollars, variancePct, status: 'ok' | 'warn' | 'alert' }`.
- **Error Behavior**: Handles `theoretical = 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_10_1 (Zero Variance - OK)`: Theoretical $100, Actual $100 -> variancePct = 0%, status = `'ok'`.
  2. `TC_RATIO_1_10_2 (Low Variance - OK)`: Theoretical $100, Actual $101.50 -> variancePct = 1.5%, status = `'ok'`.
  3. `TC_RATIO_1_10_3 (Moderate Variance - WARN)`: Theoretical $100, Actual $103.50 -> variancePct = 3.5%, status = `'warn'`.
  4. `TC_RATIO_1_10_4 (High Variance - ALERT)`: Theoretical $100, Actual $108.00 -> variancePct = 8.0%, status = `'alert'`.
  5. `TC_RATIO_1_10_5 (Negative Variance / Favorable)`: Theoretical $100, Actual $95.00 -> variancePct = -5.0%, status verified.

#### Feature 1.11: `summarizeWaste`
- **Signature**: `summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport`
- **Description**: Aggregates food waste log entries, computing total grams wasted, total dollar loss, breakdown by waste reason (`spoilage`, `trim`, `overcook`, `drop`, `expired`, `other`), and top wasted ingredients sorted by cost descending.
- **Inputs**: `entries: WasteLogEntry[]` `{ ingredient, quantityGrams, costPerGram, reason, logDate }`.
- **Outputs**: `WasteSummaryReport` `{ totalGrams, totalCost, byReason, topWastedIngredients }`.
- **Error Behavior**: Returns zeroed summary for empty array `[]`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_11_1 (Multi-Reason Aggregation)`: Multiple logs across `spoilage`, `trim`, `drop` aggregated into correct reason buckets.
  2. `TC_RATIO_1_11_2 (Top Offender Ranking)`: Ingredient A ($50 loss) sorted ahead of Ingredient B ($20 loss) in `topWastedIngredients`.
  3. `TC_RATIO_1_11_3 (Duplicate Ingredient Consolidation)`: Multiple waste events for "Ribeye" summed into a single top wasted item.
  4. `TC_RATIO_1_11_4 (Empty Log Summary)`: `entries = []` returns `totalGrams = 0`, `totalCost = 0`, `topWastedIngredients = []`.
  5. `TC_RATIO_1_11_5 (Single Entry Evaluation)`: Single entry of 200g @ $0.05/g -> totalGrams = 200, totalCost = $10.00.

#### Feature 1.12: `calculateWastePercentage`
- **Signature**: `calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number`
- **Description**: Calculates percentage of food budget lost to waste `(totalWasteCost / totalFoodCost) * 100`.
- **Inputs**: `totalWasteCost: number`, `totalFoodCost: number`.
- **Outputs**: `number` percentage (e.g. 4.5 for 4.5%).
- **Error Behavior**: Returns 0 if `totalFoodCost === 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_12_1 (Standard Waste Ratio)`: $45.00 waste / $1000.00 food cost -> returns 4.5.
  2. `TC_RATIO_1_12_2 (Zero Waste)`: $0 waste / $500.00 food cost -> returns 0.
  3. `TC_RATIO_1_12_3 (Zero Food Cost Protection)`: $50.00 waste / $0 food cost -> returns 0 (no NaN / Infinity).
  4. `TC_RATIO_1_12_4 (100% Catastrophic Loss)`: $250.00 waste / $250.00 food cost -> returns 100.
  5. `TC_RATIO_1_12_5 (High Precision Floats)`: $12.34 waste / $567.89 food cost -> returns ~2.17.

#### Feature 1.13: `generateShiftPrepPlan`
- **Signature**: `generateShiftPrepPlan(items: InventoryStockItem[], shift: 'morning' | 'evening' | 'prep', date: string): ShiftPrepPlan`
- **Description**: Compares current stock on hand (`currentStock`) against shift par levels (`parLevel`) and generates prep tasks for shortfall amounts `Math.max(0, parLevel - currentStock)`.
- **Inputs**: `items: InventoryStockItem[]` `{ id, ingredient, currentStock, parLevel, unit }`, `shift`, `date`.
- **Outputs**: `ShiftPrepPlan` `{ shift, date, tasks: Array<{ ingredientId, ingredient, prepAmount, unit }> }`.
- **Error Behavior**: Returns empty task list if all stock levels meet or exceed par.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_13_1 (Stock Shortfall Tasks)`: Item with stock 2kg and par 10kg yields prep task of 8kg.
  2. `TC_RATIO_1_13_2 (Adequate Stock Excluded)`: Item with stock 15kg and par 10kg yields 0 prep amount (excluded or 0).
  3. `TC_RATIO_1_13_3 (Zero Stock on Hand)`: Item with stock 0 and par 5 units yields prep task of 5 units.
  4. `TC_RATIO_1_13_4 (Shift and Date Pass-Through)`: Verify metadata fields `shift: 'morning'`, `date: '2026-08-16'` match input.
  5. `TC_RATIO_1_13_5 (Mixed Measurement Units)`: Tasks preserve item units (`'g'`, `'kg'`, `'count'`, `'ml'`).

#### Feature 1.14: `projectBatchRequirement`
- **Signature**: `projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number`
- **Description**: Calculates raw batch weight in grams needed to satisfy expected guest cover count with an optional waste buffer factor (default 1.0 or 1.1).
- **Inputs**: `portionWeight: number` (> 0), `covers: number` (>= 0), `wasteFactor?: number` (default 1.0).
- **Outputs**: `number` total grams required.
- **Error Behavior**: Returns 0 if `covers === 0`; throws Error if `portionWeight <= 0`.
- **Test Blueprints (Tier 1 >= 5)**:
  1. `TC_RATIO_1_14_1 (Baseline Projection)`: 150g portion * 100 covers * 1.0 buffer = 15,000g.
  2. `TC_RATIO_1_14_2 (10% Buffer Factor)`: 150g portion * 100 covers * 1.10 buffer = 16,500g.
  3. `TC_RATIO_1_14_3 (Banquet Scale)`: 250g portion * 500 covers * 1.15 buffer = 143,750g.
  4. `TC_RATIO_1_14_4 (Zero Covers)`: 200g portion * 0 covers = 0.
  5. `TC_RATIO_1_14_5 (Zero / Negative Portion Weight Error)`: `portionWeight <= 0` throws Error.

---

## 3. Domain 2: POS Order Firing & Station Routing

### 3.1 Architecture & Endpoints
- **Orders Spine**: `apps/server/src/routes/orders.ts`
  - `POST /v1/orders`: Create POS order (`tableNumber` or `takeaway: true`).
  - `POST /v1/orders/:id/items`: Add line items (`menuItemId`, `quantity`, `unitPrice`, `station`, `courseNumber`, `modifiers`, `notes`).
  - `PATCH /v1/orders/:id/send`: Fire order to kitchen. Creates kitchen tickets grouped by `station::course`. Course 1 tickets marked `status: 'fired'`; Course 2+ tickets marked `status: 'queued'` and `course_hold_status: 'held'`.
  - `POST /v1/orders/:id/fire-course`: Manually fire a held course (`courseNumber >= 2`).
  - `PATCH /v1/orders/:id/void`: Void order and un-bumped tickets.
  - `PATCH /v1/orders/:id/items/:itemId/void`: Void single line item.
- **KDS Board API**: `apps/server/src/routes/kds.ts`
  - `GET /v1/kds/tickets`: Filter active tickets by station and status.
  - `PATCH /v1/kds/tickets/:id/bump`: Bump ticket to `status: 'bumped'`.
  - `PATCH /v1/kds/tickets/:id/fire`: Directly fire held ticket.
  - `GET /v1/kds/stations/:id/analytics`: Station performance counters (`queueDepth`, `heldCount`, `bumpRate`, `avgTicketSeconds`).
- **Station Matrix**: `packages/shared/src/stations.ts`
  - Tab `'1'` -> `['grill', 'hot']` (Hot Grill)
  - Tab `'2'` -> `['cold']` (Cold Prep)
  - Tab `'3'` -> `['fry']` (Fryer)
  - Tab `'4'` -> `['bar']` (Bar)
  - Tab `'pastry'`, `'sauce'`, `'pass'`
  - Tab `'expo'`, `'all'` -> All stations
  - Active Statuses: `['queued', 'fired', 'cooking']` (excludes `'ready'`, `'bumped'`, `'voided'`).
- **Course Engine**: `packages/shared/src/course-engine.ts`
  - `initialHoldStatus(courseNumber: number)`: Course 1 -> `'firing'`, Course 2+ -> `'held'`.
- **Aging Alert Thresholds** (`apps/kds/src/components/TicketCard.tsx`):
  - `< 300s` (< 5 min) -> **Normal / Green** (`rgba(16, 185, 129, 0.2)`)
  - `300s – 599s` (5–10 min) -> **Amber Alert** (`rgba(245, 158, 11, 0.2)`)
  - `>= 600s` (>= 10 min) -> **Red Alert** (`rgba(239, 68, 68, 0.2)`)

---

### 3.2 Test Blueprints (Tier 1 >= 5 per feature)

#### Feature 2.1: Order Creation & Line Item Management
1. `TC_POS_2_1_1 (Dine-In Order Creation)`: `POST /v1/orders` with `{ tableNumber: '12', coverCount: 4 }` returns 201 with `status: 'open'`, `subtotal: 0`, `total: 0`.
2. `TC_POS_2_1_2 (Takeaway Order Creation)`: `POST /v1/orders` with `{ takeaway: true }` returns 201 with `table_number: null`.
3. `TC_POS_2_1_3 (Validation Rejection)`: `POST /v1/orders` with `{}` (no tableNumber, no takeaway) returns 422 VALIDATION_ERROR.
4. `TC_POS_2_1_4 (Line Item Totals Recalculation)`: Add 2 items ($15.00 * 2 = $30.00 and $10.00 * 1 = $10.00). Verify order `subtotal = 40`, `tax = 4` (10%), `total = 44`.
5. `TC_POS_2_1_5 (Void Single Line Item)`: `PATCH /v1/orders/:id/items/:itemId/void` marks line item `is_voided: true` and records `void_reason`.
6. `TC_POS_2_1_6 (Void Entire Order)`: `PATCH /v1/orders/:id/void` sets order `status: 'voided'` and cancels active kitchen tickets.

#### Feature 2.2: POS Order Firing & Station Routing
1. `TC_POS_2_2_1 (Multi-Station Ticket Splitting)`: Order with items on `grill`, `cold`, and `fry` splits into 3 separate kitchen tickets.
2. `TC_POS_2_2_2 (Multi-Course Holding)`: Order with Course 1 (Salad, cold) and Course 2 (Steak, grill). Upon fire, Course 1 ticket has `status: 'fired'`, `course_hold_status: 'fired'`; Course 2 ticket has `status: 'queued'`, `course_hold_status: 'held'`.
3. `TC_POS_2_2_3 (Send Idempotency)`: Firing an order twice returns `alreadySent: true`, `ticketCount: 0`, and does not create duplicate tickets.
4. `TC_POS_2_2_4 (Conflict on Invalid Status)`: Attempting to fire a `voided` or `paid` order returns 409 CONFLICT.
5. `TC_POS_2_2_5 (Client Snapshot Replay)`: In offline demo mode, passing `order: { tableNumber, items }` snapshot creates tickets directly in mock kitchen store.
6. `TC_POS_2_2_6 (Allergy Priority Flag)`: Line item modifier containing "allergy" (e.g. "Nut Allergy") marks ticket with `priority: 'allergy'`.

#### Feature 2.3: KDS Station Filtering & Views
1. `TC_KDS_2_3_1 (Numeric UI Tab Filtering)`: `GET /v1/kds/tickets?station=1` returns tickets for both `'grill'` and `'hot'`.
2. `TC_KDS_2_3_2 (Named Station Filtering)`: `GET /v1/kds/tickets?station=cold` returns only cold station tickets.
3. `TC_KDS_2_3_3 (Expo / All Pass View)`: `GET /v1/kds/tickets?station=expo` or `?station=all` returns all active tickets.
4. `TC_KDS_2_3_4 (Active Status Constraint)`: Default query includes `queued`, `fired`, `cooking`; excludes `bumped` and `voided`.
5. `TC_KDS_2_3_5 (Station Analytics Counters)`: `GET /v1/kds/stations/grill/analytics` returns accurate `queueDepth`, `heldCount`, and `bumpRate`.

#### Feature 2.4: Course Firing & Progression
1. `TC_KDS_2_4_1 (Initial Hold State Verification)`: `initialHoldStatus(1)` returns `'firing'`; `initialHoldStatus(2)` and `initialHoldStatus(3)` return `'held'`.
2. `TC_KDS_2_4_2 (Manual Order Course Fire)`: `POST /v1/orders/:id/fire-course` with `{ courseNumber: 2 }` transitions Course 2 tickets to `status: 'queued'/'fired'`, `course_hold_status: 'fired'`.
3. `TC_KDS_2_4_3 (Direct KDS Ticket Fire)`: `PATCH /v1/kds/tickets/:id/fire` fires individual held ticket.
4. `TC_KDS_2_4_4 (Course Fire Validation)`: `courseNumber < 2` or missing `courseNumber` returns 422 VALIDATION_ERROR.
5. `TC_KDS_2_4_5 (Fire Non-Existent Held Course)`: Firing a course with no held tickets returns 404 NOT_FOUND.

#### Feature 2.5: Ticket Bumping & Aging Alerts
1. `TC_KDS_2_5_1 (Ticket Bump Execution)`: `PATCH /v1/kds/tickets/:id/bump` transitions status to `'bumped'` and sets `bumped_at`.
2. `TC_KDS_2_5_2 (Board Removal on Bump)`: Bumped ticket no longer appears in default `GET /v1/kds/tickets`.
3. `TC_KDS_2_5_3 (Aging Green Threshold)`: Ticket with elapsed time < 300s evaluated as Normal/Green.
4. `TC_KDS_2_5_4 (Aging Amber Alert)`: Ticket with elapsed time between 300s and 599s triggers Amber Alert.
5. `TC_KDS_2_5_5 (Aging Red Alert)`: Ticket with elapsed time >= 600s triggers Red Alert.
6. `TC_KDS_2_5_6 (HTMX Kiosk Cards)`: `GET /v1/kds/htmx-cards` returns server-rendered HTML cards with `hx-patch` bump buttons.

---

## 4. Domain 3: Terminal PIN Authentication

### 4.1 Architecture & Public Contracts
- **Server Routes**: `apps/server/src/routes/auth.ts`
  - `POST /v1/auth/pin-login`:
    - In: `{ pin: string, tenant_id?: string }`
    - PIN validation: Must match `/^\d{4,8}$/`. Returns 422 VALIDATION_ERROR if non-digit or length < 4 or > 8.
    - Demo Fallback Path:
      - PIN `1234` -> `{ mode: 'demo', tenantId, userId: 'demo-server', displayName: 'John Doe', role: 'server', accessToken: deviceKey }`
      - PIN `5678` -> `{ mode: 'demo', tenantId, userId: 'demo-manager', displayName: 'Jane Smith', role: 'manager', accessToken: deviceKey }`
      - Any other PIN -> 401 UNAUTHORIZED ("Invalid PIN. Demo PINs: 1234 (server), 5678 (manager)").
    - Live Supabase Path:
      - Queries `staff_pins` table by `tenant_id` and `active: true`.
      - Verifies PIN against `pin_hash` using `verifyPin(pin, stored)`.
      - Signs into Supabase Auth via `anon.auth.signInWithPassword`.
      - Retrieves role from `tenant_users` table.
      - Returns `{ mode: 'supabase', tenantId, userId, displayName, role, accessToken, refreshToken, expiresAt }`.
  - `GET /v1/auth/me`: Retrieves current tenant, user ID, role, and authMode for authenticated caller.
  - `POST /v1/auth/hash-pin`: Dev utility to generate scrypt `${salt}:${hash}`.
- **PIN Hashing**: `apps/server/src/lib/pin.ts`
  - `hashPin(pin: string, saltHex?: string): string`: Uses `randomBytes(16)` and `scryptSync(pin, salt, 32)`.
  - `verifyPin(pin: string, stored: string): boolean`: Uses `timingSafeEqual` for constant-time cryptographic verification.
- **Auth Client Package**: `packages/auth/src/index.ts`
  - `pinLogin({ pin, tenantId, apiBase? }): Promise<PinLoginResult>`: Calls server endpoint and stores session in LocalStorage on success.
  - `getSession(): Session | null`: Reads `'culinaryos_session'` from LocalStorage.
  - `setSession(session: Session | null)`: Writes/removes session in LocalStorage.
  - `authHeaders(tenantId, opts)`: Generates `Content-Type`, `X-Tenant-Id`, and `Authorization: Bearer <token>`.

---

### 4.2 Test Blueprints (Tier 1 >= 5 per feature)

#### Feature 3.1: PIN Format Validation
1. `TC_AUTH_3_1_1 (Valid 4-Digit PIN)`: PIN `"1234"` passes format validation regex.
2. `TC_AUTH_3_1_2 (Valid 6-Digit & 8-Digit PIN)`: PINs `"123456"` and `"87654321"` pass format validation regex.
3. `TC_AUTH_3_1_3 (Short PIN Rejection)`: PIN `"123"` returns 422 VALIDATION_ERROR ("PIN must be 4–8 digits").
4. `TC_AUTH_3_1_4 (Long PIN Rejection)`: PIN `"123456789"` returns 422 VALIDATION_ERROR.
5. `TC_AUTH_3_1_5 (Non-Numeric Characters)`: PINs `"12a4"`, `"abcd"`, `"12-34"` return 422 VALIDATION_ERROR.
6. `TC_AUTH_3_1_6 (Empty / Whitespace PIN)`: PIN `""` or `"   "` returns 422 VALIDATION_ERROR.

#### Feature 3.2: Demo Mode Terminal Authentication
1. `TC_AUTH_3_2_1 (Server Login)`: POST `/v1/auth/pin-login` with PIN `"1234"` returns 200 with role `'server'`, displayName `'John Doe'`, and mode `'demo'`.
2. `TC_AUTH_3_2_2 (Manager Login)`: POST `/v1/auth/pin-login` with PIN `"5678"` returns 200 with role `'manager'`, displayName `'Jane Smith'`, and mode `'demo'`.
3. `TC_AUTH_3_2_3 (Invalid Demo PIN)`: POST `/v1/auth/pin-login` with PIN `"9999"` returns 401 UNAUTHORIZED.
4. `TC_AUTH_3_2_4 (Tenant Fallback)`: Omitting `tenant_id` defaults to demo tenant `00000000-0000-0000-0000-000000000001`.
5. `TC_AUTH_3_2_5 (Custom Tenant Pass-Through)`: Supplying custom `tenant_id: 'custom-tenant-id'` returns matching tenantId in session.

#### Feature 3.3: Salted Scrypt Cryptographic Verification
1. `TC_AUTH_3_3_1 (Scrypt Hash Generation)`: `hashPin("1234")` produces string matching `^[0-9a-f]{32}:[0-9a-f]{64}$`.
2. `TC_AUTH_3_3_2 (Deterministic Salt Hashing)`: Passing explicit salt produces matching hash.
3. `TC_AUTH_3_3_3 (Positive Verification)`: `verifyPin("1234", hash)` returns `true`.
4. `TC_AUTH_3_3_4 (Negative Verification)`: `verifyPin("5678", hashOf1234)` returns `false`.
5. `TC_AUTH_3_3_5 (Malformed Hash String)`: `verifyPin("1234", "invalid-hash")` returns `false` without throwing exception.
6. `TC_AUTH_3_3_6 (Constant-Time Verification)`: Timing-safe buffer comparison executed via `timingSafeEqual`.

#### Feature 3.4: Client Session & Auth Header Management
1. `TC_AUTH_3_4_1 (Client pinLogin Success)`: Calling `pinLogin` with valid PIN updates LocalStorage with Session object.
2. `TC_AUTH_3_4_2 (Client pinLogin Failure)`: Calling `pinLogin` with invalid PIN does not set LocalStorage session and returns `{ ok: false, error }`.
3. `TC_AUTH_3_4_3 (Session Retrieval & Clearing)`: `getSession()` retrieves stored session; `setSession(null)` clears LocalStorage.
4. `TC_AUTH_3_4_4 (authHeaders Generation)`: `authHeaders("tenant-1")` returns `{ 'Content-Type': 'application/json', 'X-Tenant-Id': 'tenant-1', 'Authorization': 'Bearer <token>' }`.
5. `TC_AUTH_3_4_5 (Device Key Override)`: `authHeaders("tenant-1", { deviceKey: "custom-key" })` overrides session token in Authorization header.

---

## 5. Domain 4: Offline LocalStorage Sync Queue

### 5.1 Architecture & Public Contracts
- **Module**: `packages/shared/src/offline-sync.ts`
- **Data Model**:
  ```typescript
  export interface OfflineTransactionDelta {
    id: string; // "delta-<UUIDv4>"
    tenant_id: string;
    order_id: string;
    action: 'create_order' | 'add_line_item' | 'apply_discount' | 'finalize_payment' | 'void_order';
    payload: Record<string, any>;
    timestamp: string; // ISO 8601
    synced: boolean;
  }
  ```
- **Storage Protocol**:
  - Storage Key: `'culinaryos_offline_transaction_queue'` in LocalStorage.
  - **Zero Deletion Policy**: Synced deltas are marked `synced: true` and NEVER deleted from LocalStorage, preserving a client-side immutable audit log.
- **Functions**:
  - `enqueueOfflineDelta(delta)`: Creates full delta with cryptographic UUID and `synced: false`, writes to LocalStorage.
  - `getOfflineQueue()`: Reads all deltas (synced + unsynced).
  - `getPendingOfflineQueue()`: Reads unsynced deltas only (`!d.synced`).
  - `markDeltasSynced(syncedIds)`: Marks matching deltas as `synced: true`.
  - `flushOfflineQueue(syncApiUrl, headers)`: Posts pending deltas to `/v1/pos/sync-deltas`.
  - **Confirmed-ID Protocol**: Only marks deltas whose IDs are in `response.data.confirmedIds` or `response.confirmedIds`. Bare 200 without IDs marks 0 deltas.
  - **In-Flight Mutex**: `flushInFlight` promise prevents concurrent duplicate network requests.

---

### 5.2 Test Blueprints (Tier 1 >= 5 per feature)

#### Feature 4.1: Delta Enqueuing & ID Generation
1. `TC_SYNC_4_1_1 (Create Order Delta)`: Enqueue `create_order` delta generates `id` matching `^delta-[0-9a-f-]{36}$`, ISO timestamp, and `synced: false`.
2. `TC_SYNC_4_1_2 (Add Line Item Delta)`: Enqueue `add_line_item` delta with item quantity, price, and modifiers payload.
3. `TC_SYNC_4_1_3 (Apply Discount Delta)`: Enqueue `apply_discount` delta with discount code and amount.
4. `TC_SYNC_4_1_4 (Finalize Payment Delta)`: Enqueue `finalize_payment` delta with payment method, tender amount, and tip.
5. `TC_SYNC_4_1_5 (Void Order Delta)`: Enqueue `void_order` delta with cancellation reason.
6. `TC_SYNC_4_1_6 (LocalStorage Error Resilience)`: Gracefully logs warning without unhandled exception if LocalStorage is inaccessible.

#### Feature 4.2: Queue Inspection & Pending Filtering
1. `TC_SYNC_4_2_1 (Full Queue Inspection)`: `getOfflineQueue()` returns all deltas in chronological insertion order.
2. `TC_SYNC_4_2_2 (Pending Queue Filtering)`: `getPendingOfflineQueue()` returns only deltas with `synced === false`.
3. `TC_SYNC_4_2_3 (Empty Storage Handling)`: Empty LocalStorage returns `[]`.
4. `TC_SYNC_4_2_4 (Corrupted JSON Resilience)`: Invalid JSON string in LocalStorage returns `[]` without crashing.
5. `TC_SYNC_4_2_5 (Multiple Mixed Deltas)`: Verify pending list filters out previously synced entries accurately.

#### Feature 4.3: Immutable Delta Sync Marking
1. `TC_SYNC_4_3_1 (Single Delta Mark)`: `markDeltasSynced([id1])` updates `id1` to `synced: true`.
2. `TC_SYNC_4_3_2 (Queue Length Invariance)`: Verify `getOfflineQueue().length` remains unchanged after marking synced (immutable audit log).
3. `TC_SYNC_4_3_3 (Batch Delta Marking)`: `markDeltasSynced([id1, id2, id3])` marks all specified IDs as synced in a single transaction.
4. `TC_SYNC_4_3_4 (Non-Existent ID Safety)`: Passing unknown ID to `markDeltasSynced` does not modify existing records.
5. `TC_SYNC_4_3_5 (Idempotent Marking)`: Marking an already synced delta remains `synced: true` with no side-effects.

#### Feature 4.4: Confirmed-ID Replay & Flush Protocol
1. `TC_SYNC_4_4_1 (Standard API Flush)`: Flush against API returning `data.confirmedIds = [id1, id2]` marks both deltas synced and returns 2.
2. `TC_SYNC_4_4_2 (Root Level confirmedIds)`: Flush against API returning top-level `confirmedIds = [id1]` correctly marks delta and returns 1.
3. `TC_SYNC_4_4_3 (Partial Confirmation)`: When 3 deltas are sent and server confirms 2, exactly 2 are marked synced, and 1 remains in pending queue.
4. `TC_SYNC_4_4_4 (Bare 200 Protection)`: Server returns HTTP 200 `{ status: "success" }` without `confirmedIds`. Zero deltas are marked synced and pending queue remains full.
5. `TC_SYNC_4_4_5 (Server Error Retention)`: Server returns HTTP 500 or HTTP 400. All deltas remain pending and flush returns 0.

#### Feature 4.5: Network Offline & In-Flight Concurrency
1. `TC_SYNC_4_5_1 (Network Offline Catch)`: When `fetch` throws network error (offline), flush returns 0 and pending queue is preserved for retry.
2. `TC_SYNC_4_5_2 (In-Flight Concurrency Mutex)`: Triggering 3 simultaneous `flushOfflineQueue` calls joins the single active in-flight promise (only 1 HTTP POST dispatched).
3. `TC_SYNC_4_5_3 (Mutex Reset After Completion)`: After flush promise settles, subsequent flush calls dispatch new HTTP requests.
4. `TC_SYNC_4_5_4 (Custom Header Forwarding)`: Headers passed to `flushOfflineQueue` (e.g. `X-Tenant-Id`, `Authorization`) are forwarded in fetch options.
5. `TC_SYNC_4_5_5 (Empty Queue Short-Circuit)`: When pending queue is empty, flush immediately returns 0 without network call.

---

## 6. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Ratio Engine | `scaleRecipeTree` | Recursive blueprint & sub-recipe scaling | `(recipe, targetYield)` | `ScaledRecipeTreeResult` | Throws if targetYield <= 0 | `packages/ratio-engine/src/index.ts` |
| 2 | Ratio Engine | `flattenScaledTree` | Flattens tree & sums shared raw ingredients | `(tree)` | `Record<string, ScaledIngredientSummary>` | Returns `{}` on empty tree | `packages/ratio-engine/src/index.ts` |
| 3 | Ratio Engine | `scaleByServings` | Portion-based ingredient scaling | `(items, baseServings, targetServings)` | `T[]` | Throws if baseServings <= 0 | `packages/ratio-engine/src/index.ts` |
| 4 | Ratio Engine | `calculateRatio` | Baker's percentage / ratio calculation | `(ingredientWeight, baseWeight)` | `number` | Throws if baseWeight <= 0 | `packages/ratio-engine/src/index.ts` |
| 5 | Ratio Engine | `totalFormulaWeight` | Total formula weight from target base | `(recipe, targetBaseWeight)` | `number` | Throws if baseWeight <= 0 | `packages/ratio-engine/src/index.ts` |
| 6 | Ratio Engine | `formatAmount` | Smart decimal portion formatter | `(value)` | `string` | Formats 0 -> "0", NaN safe | `packages/ratio-engine/src/index.ts` |
| 7 | Ratio Engine | `gramsToCups` | Density grams to cups conversion | `(grams, ingredient)` | `number \| null` | Returns null if unknown | `packages/ratio-engine/src/index.ts` |
| 8 | Ratio Engine | `cupsToGrams` | Density cups to grams conversion | `(cups, ingredient)` | `number \| null` | Returns null if unknown | `packages/ratio-engine/src/index.ts` |
| 9 | Ratio Engine | `computeRecipeCost` | Plate cost, cost/serving & food cost % | `(ingredients, servings, menuPrice)` | `RecipeCostAnalysis` | foodCostPct = 0 if price = 0 | `packages/ratio-engine/src/index.ts` |
| 10 | Ratio Engine | `calculateCostVariance` | Cost variance & status (ok/warn/alert) | `(theoretical, actual)` | `CostVarianceResult` | Handles theoretical = 0 | `packages/ratio-engine/src/index.ts` |
| 11 | Ratio Engine | `summarizeWaste` | Waste metrics & top offender aggregation | `(entries)` | `WasteSummaryReport` | Returns zeroes on empty | `packages/ratio-engine/src/index.ts` |
| 12 | Ratio Engine | `calculateWastePercentage` | Waste cost % of total food cost | `(totalWasteCost, totalFoodCost)` | `number` | Returns 0 if food cost = 0 | `packages/ratio-engine/src/index.ts` |
| 13 | Ratio Engine | `generateShiftPrepPlan` | Shortfall prep tasks from stock vs par | `(items, shift, date)` | `ShiftPrepPlan` | Empty tasks if stock >= par | `packages/ratio-engine/src/index.ts` |
| 14 | Ratio Engine | `projectBatchRequirement` | Batch size projection with waste factor | `(portionWeight, covers, wasteFactor?)` | `number` | Returns 0 if covers = 0 | `packages/ratio-engine/src/index.ts` |
| 15 | POS / Routing | Order Creation | Create POS orders (table/takeaway) | `POST /v1/orders` `{ tableNumber, takeaway }` | `201 Created` Order object | 422 if neither table nor takeaway | `apps/server/src/routes/orders.ts` |
| 16 | POS / Routing | Add Line Item | Add line items with station & course | `POST /v1/orders/:id/items` | `201 Created` Line item object | 404 if order not found | `apps/server/src/routes/orders.ts` |
| 17 | POS / Routing | Send to Kitchen | Send order to kitchen & create tickets | `PATCH /v1/orders/:id/send` | `200 OK` `{ orderId, status, ticketCount }` | 409 if order not open; 404 not found | `apps/server/src/routes/orders.ts` |
| 18 | POS / Routing | Manual Course Fire | Fire held course on active order | `POST /v1/orders/:id/fire-course` | `200 OK` `{ orderId, courseNumber, firedTickets }` | 422 if course < 2; 404 if no held | `apps/server/src/routes/orders.ts` |
| 19 | POS / Routing | Station Tab Mapping | Canonical UI tab to DB stations | `resolveDbStations(stationId)` | `string[]` (e.g. '1' -> ['grill', 'hot']) | Returns `[stationId]` fallback | `packages/shared/src/stations.ts` |
| 20 | POS / Routing | Initial Hold Status | Course 1 firing, Course 2+ held | `initialHoldStatus(courseNumber)` | `'firing' \| 'held'` | Deterministic evaluation | `packages/shared/src/course-engine.ts` |
| 21 | POS / Routing | Active KDS Statuses | KDS board active ticket statuses | `KDS_ACTIVE_STATUSES` | `['queued', 'fired', 'cooking']` | Excludes 'ready', 'bumped' | `packages/shared/src/stations.ts` |
| 22 | POS / Routing | Ticket Bump | Mark ticket bumped | `PATCH /v1/kds/tickets/:id/bump` | `200 OK` `{ ticketId, status: 'bumped' }` | 404 if ticket not found | `apps/server/src/routes/kds.ts` |
| 23 | POS / Routing | Direct Ticket Fire | Directly fire held kitchen ticket | `PATCH /v1/kds/tickets/:id/fire` | `200 OK` `{ ticketId, status: 'fired' }` | 404 if ticket not found | `apps/server/src/routes/kds.ts` |
| 24 | POS / Routing | Station Analytics | Aggregate station queue & bump counters | `GET /v1/kds/stations/:id/analytics` | `200 OK` Analytics object | 500 DB error on live failure | `apps/server/src/routes/kds.ts` |
| 25 | POS / Routing | Aging Alert Timers | Green (<5m), Amber (5-10m), Red (10m+) | `timerColor(elapsedSeconds)` | `{ color, label }` | Formats MM:SS | `apps/kds/src/components/TicketCard.tsx` |
| 26 | Authentication | Terminal PIN Login | 4–8 digit PIN authentication | `POST /v1/auth/pin-login` | `200 OK` Session token + user info | 422 format error; 401 invalid PIN | `apps/server/src/routes/auth.ts` |
| 27 | Authentication | Demo PIN Fallback | Demo bypass (1234 server, 5678 manager) | PIN `1234` / `5678` | Demo session with device key | 401 for other PINs | `apps/server/src/routes/auth.ts` |
| 28 | Authentication | Scrypt PIN Hash | Cryptographic salted scrypt hashing | `hashPin(pin, saltHex?)` | `${salt}:${hash}` | 16-byte salt, 32-byte hash | `apps/server/src/lib/pin.ts` |
| 29 | Authentication | Constant-Time Verify | Timing-safe PIN verification | `verifyPin(pin, stored)` | `boolean` | False on malformed stored string | `apps/server/src/lib/pin.ts` |
| 30 | Authentication | Client Session Store | LocalStorage session persistence | `getSession()` / `setSession()` | `Session \| null` | Fails safe if localStorage undefined | `packages/auth/src/index.ts` |
| 31 | Authentication | Auth Headers Helper | Generates API headers with JWT / key | `authHeaders(tenantId, opts)` | `Record<string, string>` | Injects X-Tenant-Id & Bearer | `packages/auth/src/index.ts` |
| 32 | Offline Sync | Enqueue Delta | Enqueue transaction delta to LocalStorage | `enqueueOfflineDelta(delta)` | `OfflineTransactionDelta` | UUIDv4 id, synced: false | `packages/shared/src/offline-sync.ts` |
| 33 | Offline Sync | Inspect Queues | Get full and pending transaction queues | `getOfflineQueue()`, `getPendingOfflineQueue()`| `OfflineTransactionDelta[]` | Empty array on parse failure | `packages/shared/src/offline-sync.ts` |
| 34 | Offline Sync | Mark Synced | Immutable delta sync marking | `markDeltasSynced(syncedIds)` | `void` (mutates synced: true) | Zero deletion policy | `packages/shared/src/offline-sync.ts` |
| 35 | Offline Sync | Flush Replay | Replay deltas to /v1/pos/sync-deltas | `flushOfflineQueue(apiUrl, headers)` | `Promise<number>` (synced count) | Replay requires confirmedIds | `packages/shared/src/offline-sync.ts` |
| 36 | Offline Sync | In-Flight Mutex | Concurrency control preventing duplicates | `flushInFlight` promise | Shared active Promise | Resets mutex in finally block | `packages/shared/src/offline-sync.ts` |

---

## 7. Edge Cases & Boundary Conditions

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `scaleRecipeTree` | `targetYield = 0` or `-5` | Throws `Error('targetYield must be > 0')` |
| 2 | `flattenScaledTree` | Empty recipe tree ingredients `[]` | Returns empty object `{}` without error |
| 3 | `flattenScaledTree` | Ingredient with $0 cost (water) | Sums amount, totalCost remains 0.00 |
| 4 | `scaleByServings` | `baseServings = 0` | Throws Error preventing division by zero |
| 5 | `scaleByServings` | `targetServings = 0` | Returns items with `amount = 0` |
| 6 | `calculateRatio` | `baseWeight = 0` or negative | Throws Error preventing division by zero |
| 7 | `calculateRatio` | `ingredientWeight = 0` | Returns `0` |
| 8 | `totalFormulaWeight` | `targetBaseWeight = 0` or negative | Throws Error |
| 9 | `formatAmount` | `value = 2.000` | Returns `"2"` (strips redundant decimals) |
| 10 | `formatAmount` | `value = 0.3333` | Returns `"0.33"` (2 decimal places for < 1) |
| 11 | `formatAmount` | `value = 1.49` | Returns `"1.5"` (1 decimal place for >= 1) |
| 12 | `gramsToCups` | Unknown ingredient `"caviar"` | Returns `null` |
| 13 | `gramsToCups` | Mixed case `"All-Purpose FLOUR"` | Matches flour density (125g/cup) -> returns correct cup count |
| 14 | `cupsToGrams` | `cups = 0` | Returns `0` |
| 15 | `computeRecipeCost` | `menuPrice = 0` | Sets `foodCostPct = 0` without division by zero crash |
| 16 | `calculateCostVariance` | `theoretical = 100, actual = 101.99` | Variance is 1.99% -> Status is `'ok'` |
| 17 | `calculateCostVariance` | `theoretical = 100, actual = 102.00` | Variance is 2.00% -> Status is `'warn'` |
| 18 | `calculateCostVariance` | `theoretical = 100, actual = 105.00` | Variance is 5.00% -> Status is `'alert'` |
| 19 | `summarizeWaste` | Empty waste log `[]` | Returns totalGrams: 0, totalCost: 0, empty objects |
| 20 | `calculateWastePercentage`| `totalFoodCost = 0` | Returns `0` without NaN or Infinity |
| 21 | `generateShiftPrepPlan` | `currentStock > parLevel` (surplus) | Produces 0 prep task amount |
| 22 | `projectBatchRequirement`| `covers = 0` | Returns `0` |
| 23 | `projectBatchRequirement`| `portionWeight <= 0` | Throws Error |
| 24 | POS Order Create | Missing both `tableNumber` & `takeaway` | Returns 422 VALIDATION_ERROR |
| 25 | POS Order Send | Repeated send on already sent order | Returns 200 OK with `alreadySent: true`, `ticketCount: 0` |
| 26 | POS Order Send | Send on `voided` or `paid` order | Returns 409 CONFLICT |
| 27 | POS Fire Course | `courseNumber = 1` | Returns 422 VALIDATION_ERROR (must be 2 or greater) |
| 28 | POS Fire Course | `courseNumber = 'invalid'` | Returns 422 VALIDATION_ERROR |
| 29 | POS Fire Course | Firing course with no held tickets | Returns 404 NOT_FOUND |
| 30 | Station Routing | UI tab `'expo'` or `'all'` | Resolves to empty array `[]` (matches all active tickets) |
| 31 | Terminal PIN Login | PIN length < 4 (e.g. `"12"`) | Returns 422 VALIDATION_ERROR |
| 32 | Terminal PIN Login | PIN length > 8 (e.g. `"123456789"`) | Returns 422 VALIDATION_ERROR |
| 33 | Terminal PIN Login | Non-numeric characters (e.g. `"12a4"`) | Returns 422 VALIDATION_ERROR |
| 34 | Terminal PIN Login | Unrecognized demo PIN (e.g. `"9999"`) | Returns 401 UNAUTHORIZED |
| 35 | Scrypt PIN Verify | Malformed stored hash string `"corrupt"` | Returns `false` without throwing exception |
| 36 | Offline Sync Flush | Bare HTTP 200 without `confirmedIds` | Zero deltas marked synced, queue untouched |
| 37 | Offline Sync Flush | Network throws offline fetch error | Returns 0, pending queue retained for retry |
| 38 | Offline Sync Flush | Multiple concurrent flush calls | Joined into single in-flight Promise |
| 39 | Offline Sync Mark | Mark synced IDs on non-existent IDs | Silent no-op, existing queue untouched |
| 40 | Offline Sync Storage | Corrupted JSON in LocalStorage | Recovers safely, returning `[]` |

---

## 8. Test Infrastructure & Execution Blueprint

### 8.1 Runner & Assertion Framework
- **Test Runner Command**: `node ./scripts/run-all-tests.cjs`
- **Hook & Shim**: `scripts/test-hook.cjs` routes imports of `'bun:test'` to `scripts/bun-test-impl.js` and resolves monorepo packages.
- **Matchers Supported**:
  - `toBe(expected)`: Strict equality (`assert.strictEqual`).
  - `toEqual(expected)`: Deep equality (`assert.deepStrictEqual`).
  - `toBeCloseTo(expected, precision = 2)`: Floating point proximity.
  - `toHaveLength(expected)`: Array / string length verification.
  - `toThrow(expected)`: Exception assertion.
  - `toContain(expected)`: Array or string inclusion.
  - `toBeGreaterThan`, `toBeLessThan`, `toBeGreaterThanOrEqual`, `toBeLessThanOrEqual`.
  - `toBeTruthy()`, `toBeFalsy()`, `toBeDefined()`, `toBeUndefined()`, `toBeNull()`, `toBeNaN()`.
  - `not.*`: Inverted assertions.
- **Lifecycle Hooks**: `beforeAll`, `beforeEach`, `afterEach`, `afterAll`, `describe`, `it`, `test`, `mock()`.

### 8.2 Execution Plan for Tier 1 E2E Suites
1. `tests/e2e/tier1-ratio-engine.test.ts`: Pure Ratio Engine suite covering all 14 functions (>= 70 test assertions).
2. `tests/e2e/tier1-pos-kds-order.test.ts`: POS order creation, line item assembly, multi-station ticket routing, course holding/firing, bump workflows, aging timers (>= 30 test assertions).
3. `tests/e2e/tier1-auth-pin.test.ts` (or integrated auth tests): Terminal PIN validation, demo bypass, scrypt hashing, and LocalStorage session management (>= 20 test assertions).
4. `tests/e2e/tier1-offline-sync.test.ts`: Offline transaction queueing, confirmed-ID flush protocol, and concurrency mutex protection (>= 25 test assertions).

All test cases are deterministic, zero-flakiness, and pass without requiring external live Supabase or Stripe credentials.
