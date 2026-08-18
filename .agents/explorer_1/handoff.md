# CulinaryOS Consolidation Investigation Report (Ratio Engine, Pantry/Inventory, Packages & DB Schemas)

**Date**: 2026-08-16  
**Investigator**: Explorer 1  
**Working Directory**: `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_1`  
**Workspace Root**: `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS`  

---

## Executive Summary

This investigation analyzed the consolidation of adjacent restaurant technology repositories (**RecipeOS**, **KitchenKit**, **CulinaryOps**, **Plated**, and **Post-Pilot**) into the **CulinaryOS** monorepo under an MIT open-source license.

Key findings across the four investigation domains:
1. **`packages/ratio-engine`**: Currently contains minimal 71-line ratio math (`scaleBlueprint`, `computeCost`, `fromTotalWeight`). Sibling repos contain mature implementations for recursive sub-recipe tree scaling (`@kitchenkit/ratio-engine`), shift prep & par-level planning (`@kitchenkit/prep-engine`), serving scaling & cup/gram unit conversions (`RecipeOS`), recipe food costing & actual vs. theoretical variance (`@culinaryops/food-cost-engine`), waste analysis (`@culinaryops/waste-engine`), and labor summaries (`@culinaryops/labor-engine`). These must be consolidated into `@culinaryos/ratio-engine` as pure, zero-dependency modules.
2. **`apps/server` & Pantry/Inventory**: REST endpoints for pantry management, stock adjustment, automated purchase orders, and waste logging are implemented in `apps/server/src/routes/pantry.ts` and `routes/ops.ts`. However, a **critical deduction disconnect** exists in the POS-to-Pantry event pipeline: when `pos:order:created` fires, `handleMenuItemSold` passes the `menuItemId` to `/v1/pantry/deduct` rather than resolving the recipe ingredients and deducting constituent inventory items. Furthermore, demo/offline mode does not decrement `mockPantry` or log mock plate economics upon order fire.
3. **`packages/` Shared Boundaries**: Package structure is well-architected across `@culinaryos/shared`, `@culinaryos/event-bus`, `@culinaryos/auth`, `@culinaryos/config`, `@culinaryos/ui`, and `@culinaryos/ratio-engine`. However, `@culinaryos/db/src/types.ts` contains obsolete mock types (`organizations`, `restaurants`, `users`) that fail to reflect migrations V1–V14.
4. **Database Schema & Migrations**: Migrations V1 through V14 in `supabase/migrations/` provide schemas for multi-tenancy, POS/KDS ticketing, pantry inventory (`ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status`), restock purchase orders (`restock_purchase_orders`, `po_line_items`), waste logging (`waste_events`), plate economics (`plate_economics`), and menu recipe linkage (`menu_item_recipes`).

---

## 1. Observation

### 1.1 `packages/ratio-engine` Current Status & Sibling Inventory

#### A. Existing Implementation in CulinaryOS (`packages/ratio-engine/src/index.ts`)
Lines 1–71 define:
- `RatioBlueprintIngredient`: `{ id: string; name: string; ratioWeight: number; unit: 'g' | 'ml' | 'oz' | 'count' }`
- `RatioBlueprint`: `{ id: string; name: string; baseYield: number; yieldUnit: string; ingredients: RatioBlueprintIngredient[] }`
- `scaleBlueprint(blueprint, targetYield)`: Multiplies `ratioWeight` by `(targetYield / baseYield)`.
- `computeCost(scaled, priceMap)`: Computes dollar cost given `Record<string, number>`.
- `fromTotalWeight(blueprint, totalDoughWeightGrams)`: Scales ingredient grams proportionally to reach target dough weight.

#### B. Sibling Capabilities to Consolidate
1. **`RecipeOS` (`RecipeOS/shared/ratio-engine.ts` lines 1–84)**:
   - `scaleIngredients(ingredients, baseServings, targetServings)`: Portion-based scaling with string amount preservation.
   - `scaleFactor(base, target)`: Safe ratio multiplier.
   - `formatAmount(value)`: Smart decimal formatting (integers -> whole, >=1 -> 1dp, <1 -> 2dp).
   - `gramsToCups(grams, ingredient)` & `cupsToGrams(cups, ingredient)`: Ingredient-specific density lookups (flour: 125g/cup, sugar: 200g/cup, butter: 227g/cup, salt: 273g/cup, rice: 185g/cup, oats: 90g/cup).
2. **`KitchenKit` (`KitchenKit/packages/ratio-engine/src/index.ts` lines 1–143)**:
   - `scaleRecipeTree(recipe, targetBaseWeight)`: Recursive tree scaling supporting nested `subRecipe` (e.g. pizza dough -> pizza, mother sauce -> sauce).
   - `flattenScaledTree(tree)`: Flattens hierarchical scaled sub-recipe tree into consolidated raw ingredient totals.
   - `scaleRecipeByPortions(recipe, targetPortions, standardBaseWeight)`: Scales by portions relative to `baseYieldPortions`.
   - `calculateRatio(ingredientWeight, baseWeight)`: Derives baker's percentage (base = 1.0 / 100%).
   - `totalFormulaWeight(recipe, targetBaseWeight)`: Calculates total dough/batch weight.
3. **`KitchenKit` Prep Engine (`KitchenKit/packages/prep-engine/src/index.ts` lines 1–63)**:
   - `buildShiftPrep(prepItems, shift, date)`: Compares `currentStock` against `parLevel` and yields shortfall prep amounts.
   - `getMiseEnPlace(recipe, targetBaseWeight)`: Generates station-level mise en place checklists.
   - `projectBatchSize(portionWeight, covers, wasteFactor)`: Batch requirement projection with buffer (e.g. 1.1x).
4. **`CulinaryOps` Costing & Waste (`CulinaryOps/packages/` engines)**:
   - `food-cost-engine` (`index.ts` lines 1–57): `costRecipe(ingredients, servings, menuPrice)` -> `{ totalCost, costPerServing, foodCostPct }`, `calcVariance(theoretical, actual)` with `ok` (<2%), `warn` (2–5%), `alert` (>=5%).
   - `waste-engine` (`index.ts` lines 1–60): `summarizeWaste(entries)` -> `{ totalGrams, totalCost, byReason, topWastedIngredients }`, `wastePct(totalWasteCost, totalFoodCost)`.
   - `labor-engine` (`index.ts` lines 1–58): `shiftHours(shift)`, `shiftCost(shift)`, `summarizeLabor(shifts)`, `laborCostPct(totalLaborCost, revenue)`.

---

### 1.2 `apps/server` & Pantry/Inventory Implementation

#### A. Pantry Endpoints (`apps/server/src/routes/pantry.ts`)
- `GET /v1/pantry`: Queries `pantry_status` view or `ingredients` table (fallback to `mockPantry`).
- `GET /v1/pantry/alerts`: Returns low-stock and out-of-stock items (`stock_status !== 'ok'`).
- `PATCH /v1/pantry/:id/adjust`: Modifies stock; invokes `decrement_pantry_stock` RPC on negative delta and writes to `pantry_ledger`.
- `POST /v1/pantry/deduct`: Deducts single inventory item via `decrement_pantry_stock` RPC.
- `GET /v1/pantry/purchase-orders`: Returns purchase orders with `po_line_items`.
- `POST /v1/pantry/purchase-orders/auto-generate`: Finds low stock ingredients and generates draft POs using `next_po_number`.
- `PATCH /v1/pantry/purchase-orders/:id/approve`: Transitions PO from `draft` to `approved`.
- `PATCH /v1/pantry/purchase-orders/:id/send`: Transitions PO from `approved` to `sent`.
- `PATCH /v1/pantry/purchase-orders/:id/receive`: Receives items, updates line items, increments ingredient `current_qty`, logs restock in `pantry_ledger`, and sets status to `received`.

#### B. Ops & Waste Endpoints (`apps/server/src/routes/ops.ts`)
- `POST /v1/ops/waste`: Inserts into `waste_events`, updates `pantry_ledger` on matching ingredient name.
- `GET /v1/ops/waste/summary`: Date-filtered aggregation of waste cost, grams, and top 5 wasted ingredients.
- `GET /v1/ops/food-cost/:itemId`: Links `menu_items` -> `menu_item_recipes` -> `recipe_ingredients` -> `ingredients` to compute food cost percentage and breakdown.

#### C. POS Order Fire & Event Spine Disconnects
- `apps/server/src/routes/orders.ts (lines 269–356)`:
  - In Live Mode: `PATCH /v1/orders/:id/send` updates order status to `sent` and emits `pos:order:created`.
  - In Demo Mode: Calls `createMockTicketsFromOrder` in `mock-kitchen.ts`, but does NOT decrement `mockPantry` or record mock plate economics.
- `packages/event-bus/src/handlers/pos-order-created.ts (lines 99–173)`:
  - Attempts to deduct stock by calling `handleMenuItemSold` with `menuItemId`:
    ```ts
    const soldPayload = { menuItemId: item.menuItemId ?? item.recipeId ?? '', quantity: item.quantity, soldAt };
    await handleMenuItemSold({ ... }, supabase);
    ```
  - `handleMenuItemSold` (`packages/event-bus/src/handlers/pos-menu-item-sold.ts`) calls `POST /v1/pantry/deduct` with `itemId = menuItemId`.
  - **Bug / Disconnect**: In `pantry.ts`, `POST /v1/pantry/deduct` passes `body.itemId` to `decrement_pantry_stock(item_id, qty)`. `decrement_pantry_stock` queries `public.ingredients where id = item_id`. Because `menuItemId` is NOT an `ingredient.id`, the database lookup fails or finds nothing, meaning **constituent recipe ingredients are NEVER deducted from the pantry**.

---

### 1.3 `packages/` Boundaries & Workspace Configuration

1. `pnpm-workspace.yaml`:
   - `apps/*`: `admin`, `kds`, `pos`, `server`, `web`
   - `packages/*`: `auth`, `config`, `db`, `event-bus`, `ratio-engine`, `shared`, `ui`
   - `mcp`, `cli`, `mobile`
2. `turbo.json`:
   - Declares pipelines for `build`, `dev`, `test`, `//#test`, `lint`, `typecheck`.
3. `@culinaryos/db/src/types.ts`:
   - Contains obsolete schema interfaces (`organizations`, `restaurants`, `users`) that do not match the live Supabase tables (`tenants`, `pos_orders`, `kitchen_tickets`, `ingredients`, `recipe_ingredients`, `pantry_ledger`, `restock_purchase_orders`, `waste_events`, `plate_economics`, `menu_item_recipes`).

---

### 1.4 Database Migrations & Schemas (`supabase/migrations/`)

| Migration File | Primary Tables / Views / Functions | Purpose |
|---|---|---|
| `V1__tenants.sql` | `tenants`, `tenant_users`, `roles`, `my_tenant_id()` | Multi-tenant isolation and user roles |
| `V2__kds_schema.sql` | `stations`, `kitchen_tickets`, `ticket_items` | Kitchen ticketing and stations |
| `V3__pos_schema.sql` | `menus`, `menu_sections`, `menu_items`, `modifier_groups`, `modifiers`, `pos_orders`, `pos_order_line_items` | POS menus, orders, lines, modifiers |
| `V4__rls_policies.sql` | RLS policies on all V1–V3 tables | Row level security enforcement |
| `V5__event_bus.sql` | `domain_events` | Outbox audit log for event replay |
| `V6__realtime_enable.sql` | Supabase Realtime publication | Enables WebSocket CDC |
| `V7__recipeos_pantry.sql` | `ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status` view | Recipe ingredients and stock tracking |
| `V8__course_firing.sql` | `course_number`, `course_hold_status`, `pending_push` | Multi-course hold/fire mechanics |
| `V9__restock_purchase_orders.sql` | `restock_purchase_orders`, `po_line_items`, `next_po_number()` | Supplier PO generation and receiving |
| `V10__stripe_payments.sql` | Stripe webhook processing & payment ledger | Payment transaction records |
| `V11__public_menu_rls.sql` | RLS policy for unauthenticated storefront menu reads | Online ordering menu discovery |
| `V12__audit_security_hardening.sql` | Function search_path and grant hardening | Prevents search path hijacking |
| `V13__pantry_rpc_outbox_po_counter.sql` | `decrement_pantry_stock()`, `tenants.po_seq` | Atomic stock decrement + ledger logging |
| `V14__staff_pins_ops_economics.sql` | `staff_pins`, `waste_events`, `plate_economics`, `menu_item_recipes` | PIN auth, waste tracking, closed-loop COGS |

---

## 2. Logic Chain

```
[Observation: packages/ratio-engine only has 3 basic scaling functions]
         │
         ▼
[Observation: Sibling repos contain recursive sub-recipe trees, density conversions, variance analysis, prep projections]
         │
         ▼
[Logic Step 1]: Merging these pure functions into @culinaryos/ratio-engine enables full formula calculations,
                 sub-recipe tree resolution, and culinary math across POS, KDS, Server, and MCP tools without external dependencies.
         │
         ▼
[Observation: pos:order:created emits menuItemId to handleMenuItemSold -> POST /v1/pantry/deduct]
         │
         ▼
[Observation: /v1/pantry/deduct calls decrement_pantry_stock(item_id, qty) which targets ingredients table]
         │
         ▼
[Logic Step 2]: Because a menu_item_id is not an ingredient_id, the deduction fails.
                 To deduct accurately, pos:order:created (or /v1/pantry/deduct-order) must resolve the recipe via menu_item_recipes,
                 fetch all recipe_ingredients, scale their quantities by order quantity, and decrement each ingredient_id.
         │
         ▼
[Observation: In demo/offline mode, orders.ts sends orders without touching mockPantry in pantry.ts]
         │
         ▼
[Logic Step 3]: To satisfy Requirement R2 (Zero-Dependency Local Mode), order send in mock mode must deduct
                 ingredients from mockPantry in memory, allowing admin pantry alerts and auto-PO generation to work seamlessly offline.
         │
         ▼
[Observation: packages/db/src/types.ts is out of sync with V1–V14 schema]
         │
         ▼
[Logic Step 4]: Generating or handcrafting full TypeScript Database types for V1–V14 in packages/db
                 eliminates unsafe 'any' casts and ensures typecheck safety across the monorepo.
```

---

## 3. Proposed Consolidated Interface Contracts

### 3.1 Consolidated `@culinaryos/ratio-engine` Interface

The unified ratio engine should export:

```typescript
// @culinaryos/ratio-engine/src/index.ts

export type MeasurementUnit = 'g' | 'kg' | 'ml' | 'l' | 'oz' | 'lb' | 'tsp' | 'tbsp' | 'cup' | 'count';

// 1. Ratio Blueprints & Sub-Recipe Trees
export interface RecipeIngredientItem {
  id: string;
  name: string;
  ratio: number; // Baker's percentage (1.0 = 100% base)
  unit: MeasurementUnit;
  subRecipeId?: string;
  subRecipe?: RecipeBlueprint;
  costPerUnit?: number; // cents per unit
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

// Tree Scaling & Aggregation
export function scaleRecipeTree(recipe: RecipeBlueprint, targetYield: number): ScaledRecipeTreeResult;
export function flattenScaledTree(tree: ScaledRecipeTreeResult): Record<string, { id: string; name: string; amount: number; unit: MeasurementUnit; totalCost: number }>;
export function calculateRatio(ingredientWeight: number, baseWeight: number): number;
export function totalFormulaWeight(recipe: RecipeBlueprint, targetBaseWeight: number): number;

// 2. Serving & Unit Conversions
export function scaleByServings<T extends { amount: number }>(items: T[], baseServings: number, targetServings: number): T[];
export function formatAmount(value: number): string;
export function gramsToCups(grams: number, ingredient: string): number | null;
export function cupsToGrams(cups: number, ingredient: string): number | null;

// 3. Food Costing & Variance Analysis
export interface RecipeCostAnalysis {
  ingredientCosts: Array<{ id: string; name: string; quantity: number; unitCost: number; totalCost: number }>;
  totalCost: number;
  costPerServing: number;
  foodCostPct: number;
}

export function computeRecipeCost(ingredients: Array<{ id: string; name: string; quantity: number; unitCost: number }>, servings: number, menuPrice: number): RecipeCostAnalysis;

export interface CostVarianceResult {
  theoreticalCost: number;
  actualCost: number;
  varianceDollars: number;
  variancePct: number;
  status: 'ok' | 'warn' | 'alert';
}

export function calculateCostVariance(theoretical: number, actual: number): CostVarianceResult;

// 4. Waste & Ops Summarization
export interface WasteLogEntry {
  ingredient: string;
  quantityGrams: number;
  costPerGram: number;
  reason: 'spoilage' | 'trim' | 'overcook' | 'drop' | 'expired' | 'other';
  logDate: string;
}

export interface WasteSummaryReport {
  totalGrams: number;
  totalCost: number;
  byReason: Record<string, { grams: number; cost: number }>;
  topWastedIngredients: Array<{ ingredient: string; grams: number; cost: number }>;
}

export function summarizeWaste(entries: WasteLogEntry[]): WasteSummaryReport;
export function calculateWastePercentage(totalWasteCost: number, totalFoodCost: number): number;

// 5. Shift Prep Planning
export interface InventoryStockItem {
  id: string;
  ingredient: string;
  currentStock: number;
  parLevel: number;
  unit: MeasurementUnit;
}

export interface ShiftPrepPlan {
  shift: 'morning' | 'evening' | 'prep';
  date: string;
  tasks: Array<{ ingredientId: string; ingredient: string; prepAmount: number; unit: MeasurementUnit }>;
}

export function generateShiftPrepPlan(items: InventoryStockItem[], shift: 'morning' | 'evening' | 'prep', date: string): ShiftPrepPlan;
export function projectBatchRequirement(portionWeight: number, covers: number, wasteFactor?: number): number;
```

---

### 3.2 Closed-Loop POS Fire -> Recipe -> Pantry Deduction Contract

To resolve the deduction disconnect in `pos-order-created.ts` and `apps/server/src/routes/pantry.ts`:

1. **New Backend Route**: `POST /v1/pantry/deduct-order`
   - **Payload**:
     ```json
     {
       "orderId": "uuid",
       "items": [
         { "menuItemId": "uuid", "recipeId": "uuid", "quantity": 2 }
       ]
     }
     ```
   - **Execution Flow**:
     1. For each item, look up `menu_item_recipes` to resolve `recipe_id`.
     2. Query `recipe_ingredients` for `ingredient_id` and `quantity`.
     3. Calculate `deductQuantity = recipe_ingredient.quantity * item.quantity`.
     4. In Live Mode: Call `decrement_pantry_stock(ingredient_id, deductQuantity, tenantId, 'sale', orderId)`.
     5. In Demo Mode: Decrement corresponding item in `mockPantry` and append to mock audit log.
     6. Calculate and insert `plate_economics` record.

---

## 4. Caveats & Assumptions

1. **State Persistence in Demo Mode**:
   - `mockOrders`, `mockTickets`, `mockPantry`, and `mockPurchaseOrders` currently reside in process memory on `apps/server`. Restarting the Node server resets mock state.
2. **Sibling Python / Android Repos**:
   - `Post-Pilot` is a Python/Flask codebase and `RecipeOS` contains Android/Kotlin code. Consolidation involves translating their data contracts, algorithms, and MCP tools into TypeScript.
3. **Database Availability**:
   - All tests and verification must pass seamlessly without live Supabase credentials using the in-memory/demo paths.

---

## 5. Conclusion & Actionable Milestone Groupings

### Milestone 1 (M1): `@culinaryos/ratio-engine` Consolidation & `@culinaryos/db` Type Sync
- Consolidate all mathematical models into `packages/ratio-engine/src/index.ts` (sub-recipe trees, unit conversions, food costing, variance, waste summarization, prep projections).
- Update `packages/ratio-engine/src/index.test.ts` with test coverage for all new functions.
- Update `packages/db/src/types.ts` to reflect the full V1–V14 database schema.

### Milestone 2 (M2): Closed-Loop Inventory Deduction & Demo Par Alerts
- Implement `POST /v1/pantry/deduct-order` in `apps/server/src/routes/pantry.ts`.
- Update `packages/event-bus/src/handlers/pos-order-created.ts` to resolve recipe ingredients and deduct actual pantry items.
- Ensure demo mode order fire decrements `mockPantry` and logs mock plate economics.
- Ensure `GET /v1/pantry/alerts` triggers dynamically after orders are fired in both demo and live modes.

### Milestone 3 (M3): Back-Office Admin & MCP Tool Integration
- Expand `apps/admin` to include recipe viewing/scaling and waste analytics.
- Unify `mcp/src/recipe-server.ts`, `inventory-server.ts`, `prep-server.ts`, and `culinaryops-server.ts` to use the consolidated `@culinaryos/ratio-engine` and live `/v1/ops/*` endpoints.

### Milestone 4 (M4): Verification & Quality Audits
- Run canonical test suite `node ./scripts/run-all-tests.cjs` to confirm 100% test pass.
- Run `pnpm run typecheck` across all workspace packages.
- Verify end-to-end PIN login -> Order -> Fire -> Bump -> Inventory Deduction -> Auto PO workflow in demo mode.

---

## 6. Verification Method

### Test Commands
1. **Canonical Test Runner**:
   ```bash
   node ./scripts/run-all-tests.cjs
   ```
2. **Monorepo Typecheck**:
   ```bash
   pnpm run typecheck
   ```
3. **Ratio Engine Unit Tests**:
   ```bash
   npx tsx packages/ratio-engine/src/index.test.ts
   ```
4. **Server Integration Tests**:
   ```bash
   npx tsx tests/server/pos-kds-fire.test.ts
   ```

### Files to Inspect
- `packages/ratio-engine/src/index.ts` & `src/index.test.ts`
- `apps/server/src/routes/pantry.ts` & `routes/orders.ts`
- `packages/event-bus/src/handlers/pos-order-created.ts`
- `packages/db/src/types.ts`
- `supabase/migrations/V1__tenants.sql` through `V14__staff_pins_ops_economics.sql`
