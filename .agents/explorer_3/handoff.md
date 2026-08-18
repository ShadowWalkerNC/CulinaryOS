# Specification Mining & Architecture Report: Ops, MCP Servers, Infrastructure & Licensing

**Author:** Spec Miner 3 (`.agents/explorer_3`)  
**Target:** Monorepo Orchestrator & Multi-Agent Consolidation Team  
**Date:** 2026-08-16T01:18:00Z  
**Workspace:** `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS`

---

## 1. Observation

Direct observations from source code, route definitions, MCP server implementations, workspace configuration, build setup, and test execution across the repository:

### 1.1 `apps/server /v1/ops/*` & Operational Domain Handlers
- **Food Waste Tracking (`apps/server/src/routes/ops.ts:24-107`)**:
  - `POST /v1/ops/waste`: Requires `tenant_id` via middleware. Validates `ingredient`, `quantity_grams`, `reason`. Reasons constrained to `WASTE_REASONS` (`spoilage`, `trim`, `overcook`, `drop`, `expired`, `other`, `sale`).
  - Computes `wasteCost = Math.round(quantity_grams * costPerGram * 100) / 100`.
  - In demo mode (`!supabase`), returns `201` with generated UUID and `demo: true`.
  - In live mode (`supabase` present), writes to `waste_events` (`tenant_id`, `ingredient`, `quantity_grams`, `cost_per_gram`, `waste_cost`, `reason`, `notes`, `log_date`, `created_by`), and queries `ingredients` to record an auto-deduct entry in `pantry_ledger` (`delta: -(quantity_grams / 1000)`, `reason: 'waste'`).
  - `GET /v1/ops/waste/summary` (`ops.ts:110-156`): Accepts `from`/`date_from` and `to`/`date_to` query params. In demo mode returns `{ demo: true, log_count: 0, total_cost: 0, total_grams: 0, top_offenders: [] }`. In live mode, aggregates `total_cost`, `total_grams`, and top 5 costliest ingredients into `top_offenders`.
- **Food Cost & Plate Economics (`ops.ts:158-249`)**:
  - `GET /v1/ops/food-cost/:itemId`: Resolves `menu_items` and `menu_item_recipes` → `recipe_ingredients` to compute `ingredientCost` from ingredient unit prices. Fallback: calculates average `theoretical_cost_cents` from recent `plate_economics` rows. Computes `food_cost_pct = (ingredientCost / salePrice) * 100`. Categorizes `status` into `good` (<= 30%), `watch` (<= 35%), `high` (> 35%), or `unknown` (0%). Demo returns 29.64% (`good`) for $14 sale price and $4.15 ingredient cost.
  - `GET /v1/ops/plate-economics`: Fetches up to 100 records from `plate_economics` table scoped by `tenant_id` and optional `order_id`.
- **Operational Analytics & Reporting (`apps/server/src/routes/reports.ts:1-167`)**:
  - `GET /v1/reports/sales-summary` (aliased to `/v1/reports/sales` and `/v1/reports/range`): Aggregates non-voided `pos_orders` by day for order count and `revenueCents`.
  - `GET /v1/reports/kds-summary`: Aggregates `kitchen_tickets` by station to calculate total tickets, bumped tickets, and average fulfillment time (`avgTimeMs = bumped_at - fired_at`).
  - `GET /v1/reports/pantry-usage`: Queries `pantry_status` view (with fallback to `ingredients` table) to return inventory stock with `stock_status` (`ok`, `low_stock`, `out_of_stock`).
  - `GET /v1/reports/eod`: End-of-day rollup of daily revenue and order counts.
- **Closed-Loop Event Handlers (`packages/event-bus/src/handlers/*`)**:
  - `pos-order-created.ts:99-173`: Upon order fire, emits `pos:menu:item-sold` to invoke `/v1/pantry/deduct` for each line item, looks up recipe ingredient costs, and records a `plate_economics` snapshot (`sale_price_cents`, `theoretical_cost_cents`, `item_name`, `quantity`).
  - `pos-menu-item-sold.ts:13-60`: Performs HTTP call to `/v1/pantry/deduct` with `itemId`, `quantity`, `reason: 'sale'`.

### 1.2 `mcp/` Tool Suite & Extension Architecture
- **Multi-Server Architecture**: Monorepo contains 8 discrete MCP servers under `mcp/` and `mcp/src/`:
  1. `mcp/culinary-os-server.ts`: Core OS tools (`get_recipe`, `scale_recipe`, `get_inventory`, `update_inventory`, `get_open_orders`, `fire_order`, `create_menu`, `get_sales_report`, `get_nutritional_info`, `log_prep`).
  2. `mcp/src/culinaryops-hub-live.ts`: Live bridge with dynamic fallback (`get_labor_summary`, `get_food_cost`, `log_waste`, `get_waste_summary`, `list_vendors`, `create_purchase_order`). Calls live `/v1/ops/*` and `/v1/pantry/*` endpoints; gracefully falls back to structured demo payloads on network/API failure.
  3. `mcp/src/culinaryops-server.ts`: In-hub satellite drop-in server byte-synced with external CulinaryOps satellite repo for CI drift checks.
  4. `mcp/src/recipe-server.ts`: RecipeOS scaling & prep tools (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`) utilizing `@culinaryos/ratio-engine`.
  5. `mcp/src/inventory-server.ts`: Plated inventory audit & stock tools (`get_inventory_levels`, `log_audit_count`).
  6. `mcp/src/kds-server.ts`: KitchenKit queue tools (`fetch_kds_tickets`, `bump_kds_ticket`).
  7. `mcp/src/pos-server.ts`: POS transaction & loyalty tools (`create_order`, `apply_loyalty_points`).
  8. `mcp/src/post-pilot-server.ts`: Post-Pilot marketing tools (`send_marketing_postcard`).
  9. `mcp/src/prep-server.ts`: PrepEngine station tools (`build_shift_prep`, `get_mise_en_place`).
- **Extensions Registry (`extensions/*`)**: Manifests matching `extension_template/culinaryos_extension.json` for `culinaryops`, `hardware-agent`, `kitchenkit`, `plated`, `post-pilot`, and `recipeos`.

### 1.3 Build, Typecheck, and Test Infrastructure
- **Turborepo & Workspace Configuration**:
  - `turbo.json`: Defines tasks `build` (`dependsOn: ["^build"]`, `outputs: ["dist/**"]`), `dev` (`cache: false`, `persistent: true`), `test` (`dependsOn: ["^build"]`), `//#test` (`dependsOn: ["^build"]`), `lint`, and `typecheck` (`dependsOn: ["^build"]`).
  - `pnpm-workspace.yaml`: Includes `apps/*`, `packages/*`, `mcp`, `cli`, `mobile`.
  - Root `package.json`: Engine requirements `node: ">=20.0.0"`, `pnpm: ">=9.0.0"`.
- **TypeScript Static Verification (`turbo run typecheck`)**:
  - `tsconfig.base.json` provides strict base config (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `composite: true`).
  - 18 packages/apps have active `typecheck` tasks passing cleanly without errors.
- **Canonical Test Runner (`scripts/run-all-tests.cjs`)**:
  - Harness discovers and executes 29 test files (1 in `packages/ratio-engine/src/index.test.ts` and 28 in `tests/**/*.test.ts`).
  - Uses `npx -y tsx@4.7.1 -r ./scripts/test-hook.cjs` + `scripts/bun-test-impl.js` to run tests seamlessly in pure Node.js without requiring a local Bun binary.
- **Licensing Compliance**:
  - Root `LICENSE` exists containing the standard MIT License, Copyright (c) 2026 ShadowWalkerNC.
  - Package-level `package.json` files currently omit the explicit `"license": "MIT"` property.
  - TypeScript source files lack standardized SPDX headers (`// SPDX-License-Identifier: MIT`).

---

## 2. Logic Chain

1. **Operations Consolidation Readiness**:
   - The unified API server (`apps/server`) has established `/v1/ops/*` for waste events, waste summaries, recipe food costing, and plate economics.
   - The event spine in `packages/event-bus` connects POS order creation directly to pantry stock deduction and plate economics logging.
   - However, loyalty marketing automation (milestone rule evaluation, postcard coupon generation, customer rewards tiers) currently resides across `mcp/src/pos-server.ts`, `mcp/src/post-pilot-server.ts`, and test harnesses (`step2_post_pilot_marketing.test.ts`), rather than dedicated `/v1/ops/loyalty` or `/v1/ops/promotions` REST routes.

2. **MCP Live vs. Offline Mock Resilience**:
   - The dual-mode architecture in `mcp/src/culinaryops-hub-live.ts` proves that MCP tools can operate against live HTTP endpoints (`/v1/ops/*`, `/v1/pantry/*`) while maintaining local fallbacks when the API server is unavailable.
   - All MCP servers support zero-dependency local operation by serving structured demo fixtures when `SUPABASE_URL` or API tokens are absent.

3. **Build & Test Harness Reliability**:
   - Turborepo builds all packages cleanly.
   - `scripts/run-all-tests.cjs` successfully shims Bun test semantics (`describe`, `it`, `expect`, `mock`) into Node.js via `tsx` and module resolution hooks, ensuring cross-platform CI verification.
   - Known issue: Root `package.json` `"test": "turbo run test"` triggers `turbo.json`'s `//#test` which recurses if invoked directly via `turbo run test`. The canonical test execution command is `node ./scripts/run-all-tests.cjs`.

4. **Licensing Uniformity**:
   - Monorepo consolidation under MIT requires all sub-packages (`packages/*`, `apps/*`, `mcp`, `cli`, `mobile`) to specify `"license": "MIT"` in their `package.json` and include license headers for third-party forkability.

---

## 3. Caveats

1. **Labor Engine APIs**: `get_labor_summary` in `culinaryops-hub-live.ts` currently returns structured demo data because labor scheduling and employee shift tracking have not yet been ported from the external CulinaryOps satellite repo into `apps/server`.
2. **Turborepo Test Loop**: `pnpm run test` should not be invoked directly until `turbo.json` or root `package.json` removes the circular `//#test` invocation. `node ./scripts/run-all-tests.cjs` is the authoritative test gate.
3. **Lint Script Absence**: ESLint dependencies and configurations are currently omitted from `package.json` and lockfile; `pnpm run lint` is non-functional and should be populated or disabled in `turbo.json`.

---

## 4. Conclusion

The monorepo contains a cohesive, local-first restaurant operating system core. The operational analytics, waste tracking, plate economics, ratio engine, and MCP tool bridge are functional across both live Supabase and offline mock modes. Consolidation can proceed with:
1. Formalizing `/v1/ops/loyalty` and `/v1/ops/promotions` endpoints in `apps/server`.
2. Bridging labor scheduling models into `/v1/ops/labor`.
3. Standardizing `"license": "MIT"` and SPDX headers across all workspace packages.
4. Adding integration tests specifically validating `/v1/ops/*` REST routes and admin endpoints.

---

## 5. Verification Method

To independently verify the findings in this report:

1. **Run Full Test Suite (29 Test Files)**:
   ```bash
   node ./scripts/run-all-tests.cjs
   ```
   *Expected output:* `TEST SUMMARY: 29 passed, 0 failed.`

2. **Verify TypeScript Typechecking Across Monorepo (18 Workspace Targets)**:
   ```bash
   pnpm run typecheck
   ```
   *Expected output:* All 18 typecheck tasks succeed with 0 errors.

3. **Verify MCP Hub Live Bridge**:
   ```bash
   node --import tsx mcp/src/culinaryops-hub-live.ts
   ```
   *Expected output:* `[culinaryops-mcp] hub-live ready — prefers CulinaryOS /v1/ops when API is up` on stderr.

4. **Inspect Route Definitions & License Files**:
   - `apps/server/src/routes/ops.ts`
   - `apps/server/src/routes/reports.ts`
   - `apps/server/src/routes/pantry.ts`
   - `LICENSE`

---

## 6. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Ops: Waste | `POST /v1/ops/waste` | Logs food waste event with cost and auto-records negative ledger entry | `{ ingredient, quantity_grams, cost_per_gram, reason, log_date?, notes? }` | `{ id, tenant_id, waste_cost, ... }` (201 Created) | 422 on missing fields / invalid reason; 500 on DB error | `apps/server/src/routes/ops.ts:24` |
| 2 | Ops: Waste | `GET /v1/ops/waste/summary` | Summarizes waste cost, total weight, and top 5 costliest ingredients | Query params: `from` / `date_from`, `to` / `date_to` | `{ date_from, date_to, log_count, total_cost, total_grams, top_offenders }` | 500 on DB query failure | `apps/server/src/routes/ops.ts:110` |
| 3 | Ops: Economics | `GET /v1/ops/food-cost/:itemId` | Computes recipe food cost % and target status (`good`, `watch`, `high`) | Param: `itemId` | `{ item_id, name, sale_price, ingredient_cost, food_cost_pct, status }` | 404 if item not found; fallback to historical plate economics | `apps/server/src/routes/ops.ts:158` |
| 4 | Ops: Economics | `GET /v1/ops/plate-economics` | Fetches historical order item sale prices vs. theoretical food costs | Query param: `order_id` (optional) | `{ rows: Array<PlateEconomicsRecord> }` | 500 on DB query error | `apps/server/src/routes/ops.ts:235` |
| 5 | Ops: Reports | `GET /v1/reports/sales-summary` | Aggregates daily orders and revenue (cents) for date range | Query params: `from`, `to`, `date` | `{ from, to, byDay, orders, revenueCents }` | 500 on DB error | `apps/server/src/routes/reports.ts:13` |
| 6 | Ops: Reports | `GET /v1/reports/kds-summary` | Station fulfillment metrics (total tickets, bumped count, avg fulfillment time) | Query params: `from`, `to` | `{ from, to, stations: { [station]: { total, bumped, avgTimeMs } } }` | 500 on DB error | `apps/server/src/routes/reports.ts:50` |
| 7 | Ops: Reports | `GET /v1/reports/pantry-usage` | Retrieves current inventory stock levels, reorder thresholds, and low stock items | None (tenant header) | `{ items, lowStockCount, lowStock }` | Fallback to `ingredients` table if view missing | `apps/server/src/routes/reports.ts:89` |
| 8 | Ops: Reports | `GET /v1/reports/eod` | End-of-day operational rollup | Query param: `date` | `{ date, orders, revenueCents, byDay }` | 500 on DB error | `apps/server/src/routes/reports.ts:129` |
| 9 | Ops: Admin | `GET/POST /v1/admin/menu/items` | Lists or creates menu items with station routing | Item payload (`section_id`, `name`, `price`, `station`, `description?`) | Created item (201) / item list | 403 if not manager/owner in live JWT mode; 422 validation | `apps/server/src/routes/admin.ts:22` |
| 10 | Ops: Admin | `GET/POST /v1/admin/staff` | Lists staff and provisions staff PINs with Supabase Auth | `{ email, display_name, role, pin }` | `{ user_id, email, role, display_name }` (201) | 403 on non-manager; 422 if PIN not 4-8 digits; 503 if demo | `apps/server/src/routes/admin.ts:116` |
| 11 | Ops: Pantry | `GET/POST /v1/pantry/purchase-orders` | Lists or creates vendor purchase orders with line items | PO payload or `{ auto: true }` | Created PO object with lines (201) | 500 on DB error | `apps/server/src/routes/pantry.ts:136` |
| 12 | Ops: Pantry | `POST /v1/pantry/purchase-orders/auto-generate` | Evaluates par levels and generates draft PO for all low stock items | None (tenant header) | Draft PO with calculated reorder quantities (201) | 500 on DB error | `apps/server/src/routes/pantry.ts:155` |
| 13 | Ops: Pantry | `PATCH /v1/pantry/purchase-orders/:id/approve` | Transitions PO status from draft to approved | Param: `id` | Updated PO object | 404 if PO not found | `apps/server/src/routes/pantry.ts:338` |
| 14 | Ops: Pantry | `PATCH /v1/pantry/purchase-orders/:id/send` | Transitions PO status from approved to sent | Param: `id` | Updated PO object | 404 if PO not found | `apps/server/src/routes/pantry.ts:367` |
| 15 | Ops: Pantry | `PATCH /v1/pantry/purchase-orders/:id/receive` | Receives PO items, increments inventory stock, logs `pantry_ledger` | Param: `id`, optional `{ received: { [lineId]: qty } }` | Updated PO object with received timestamp | 404 if PO not found | `apps/server/src/routes/pantry.ts:421` |
| 16 | MCP: CulinaryOps | `get_labor_summary` | Summarizes labor costs, hours, and average hourly rate | `{ date_from, date_to }` | `{ total_hours, total_cost, avg_hourly, shift_count, coverage_by_role }` | Returns demo payload when satellite labor engine unlinked | `mcp/src/culinaryops-hub-live.ts:29` |
| 17 | MCP: CulinaryOps | `get_food_cost` | Queries food cost % and ingredient breakdown for menu item | `{ item_id }` | Food cost breakdown object | Live API request; fallback demo object on network failure | `mcp/src/culinaryops-hub-live.ts:42` |
| 18 | MCP: CulinaryOps | `log_waste` | Dispatches waste event to `/v1/ops/waste` | `{ ingredient, quantity_grams, cost_per_gram, reason, notes? }` | Waste confirmation and calculated `waste_cost` | Live API request; fallback offline calculation on error | `mcp/src/culinaryops-hub-live.ts:53` |
| 19 | MCP: CulinaryOps | `get_waste_summary` | Queries waste summary from `/v1/ops/waste/summary` | `{ date_from, date_to }` | Waste summary with top offenders | Live API request; fallback zeroed summary on error | `mcp/src/culinaryops-hub-live.ts:72` |
| 20 | MCP: CulinaryOps | `list_vendors` | Lists active suppliers and open purchase order counts | `{}` | `{ vendor_count, purchase_orders }` | Live API request; fallback demo vendors on error | `mcp/src/culinaryops-hub-live.ts:84` |
| 21 | MCP: CulinaryOps | `create_purchase_order` | Creates draft PO via `/v1/pantry/purchase-orders` | `{ vendor_id, items: [{ name, quantity, unit, unit_cost? }] }` | Created PO object and total | Live API request; fallback demo draft PO on error | `mcp/src/culinaryops-hub-live.ts:89` |
| 22 | MCP: RecipeOS | `scale_recipe` | Scales recipe blueprint to target yield preserving ratio weights | `{ recipeId, targetYield }` | `{ recipeName, targetYield, unit, scaledIngredients }` | Error if recipe not found or targetYield <= 0 | `mcp/src/recipe-server.ts:51` |
| 23 | MCP: RecipeOS | `get_ratio` | Retrieves baker's percentage ratio breakdown for blueprint | `{ recipeId }` | `{ recipeId, name, bakersRatios }` | Error if recipe not found | `mcp/src/recipe-server.ts:63` |
| 24 | MCP: RecipeOS | `generate_prep_list` | Computes aggregated ingredient prep requirements for shift covers | `{ targetCovers }` | `{ targetCovers, prepItems }` | Scaled batch requirements across all blueprints | `mcp/src/recipe-server.ts:83` |
| 25 | MCP: Plated | `get_inventory_levels` | Queries current stock levels, par points, and unit details | `{}` | Array of pantry ingredient records | Error if API unreachable | `mcp/src/inventory-server.ts:25` |
| 26 | MCP: Plated | `log_audit_count` | Audits physical inventory count, calculates variance and financial loss | `{ itemId, physicalQty }` | Success message with calculated variance and total loss | Error if item not found | `mcp/src/inventory-server.ts:33` |
| 27 | MCP: KitchenKit | `fetch_kds_tickets` | Fetches active uncompleted tickets from kitchen display queue | `{}` | Array of active kitchen tickets | Error if API unreachable | `mcp/src/kds-server.ts:26` |
| 28 | MCP: KitchenKit | `bump_kds_ticket` | Bumps ticket from active kitchen display queue | `{ ticketId }` | Success confirmation | Error if ticket bump fails | `mcp/src/kds-server.ts:34` |
| 29 | MCP: POS | `create_order` | Creates order, posts line items, and fires to kitchen queue | `{ tableNumber?, items: [{ productName, quantity, price, station? }] }` | Success confirmation with Order ID | Error on validation or gateway rejection | `mcp/src/pos-server.ts:26` |
| 30 | MCP: POS | `apply_loyalty_points` | Adjusts customer loyalty account points | `{ customerId, pointsToAdjust }` | Success adjustment confirmation | Error if params invalid | `mcp/src/pos-server.ts:49` |
| 31 | MCP: Post-Pilot | `send_marketing_postcard` | Queues physical marketing postcard coupon dispatch | `{ customerName, address, discountPercent, couponMessage? }` | Confirmation with coupon code (e.g. `SAVE15`) | Error on missing fields or invalid percentage | `mcp/src/post-pilot-server.ts:25` |
| 32 | MCP: PrepEngine | `build_shift_prep` | Generates station prep execution tasks by cover count | `{ shift: "morning"|"evening", expectedCovers }` | Formatted prep task list grouped by station | Error on invalid shift enum | `mcp/src/prep-server.ts:45` |
| 33 | MCP: PrepEngine | `get_mise_en_place` | Retrieves station prep items status | `{ stationId: "hot"|"cold"|"fry"|"bar" }` | Active station mise en place list | Defaults to hot station if unknown | `mcp/src/prep-server.ts:57` |

---

## 7. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Waste Logging | `reason: 'dropped_on_floor'` (not in enum) | HTTP 422 Validation Error: `reason must be one of spoilage, trim, overcook, drop, expired, other, sale` |
| 2 | Waste Logging | `quantity_grams: 0`, `cost_per_gram: 0.05` | Calculates `waste_cost: 0`, successfully logged |
| 3 | Waste Summary | `from: '2026-09-01'`, `to: '2026-08-01'` (inverted dates) | Returns 0 matching records, `total_cost: 0`, empty `top_offenders` list |
| 4 | Food Cost Calculation | Menu item with 0 sale price ($0.00 promo/comp) | Returns `food_cost_pct: 0`, `status: 'unknown'` (avoids divide-by-zero exception) |
| 5 | Food Cost Calculation | Item has no direct `menu_item_recipes` link | Falls back to average `theoretical_cost_cents` from recent `plate_economics` rows |
| 6 | Course Firing | `POST /v1/orders/:id/fire-course` with `courseNumber: 1` | HTTP 422: `courseNumber must be 2 or greater` (Course 1 is fired automatically on send) |
| 7 | Course Firing | Firing course on order with status `voided` or `paid` | HTTP 409 Conflict: `Cannot fire course on a voided order` |
| 8 | Pantry Deduct | Deduct quantity exceeds current stock (`currentQty: 2, deductQty: 5`) | Floors at 0; inventory quantity becomes 0, never negative |
| 9 | Multi-Tenant RBAC | Server role submits JWT to mutate staff (`POST /v1/admin/staff`) | HTTP 403 Forbidden: `Manager or owner role required` (managerGate fail-closed) |
| 10 | Adversarial Tenant | Valid JWT for Tenant A with header `X-Tenant-Id: Tenant B` | HTTP 403 Forbidden: Cross-tenant access rejected |
| 11 | Binary Event Protocol | Truncated buffer (< 6 bytes) or corrupted JSON body | `decodeBinaryEvent()` returns `null` safely without unhandled exceptions |
| 12 | Offline Queue Sync | LocalStorage full (`QuotaExceededError`) during delta enqueue | Generates valid in-memory delta ID safely without crashing frontend |
| 13 | Marketing Postcard | `discountPercent: 150` (> 100%) or `-5` (< 0%) | Throws `Invalid discount percentage` validation error |
| 14 | Recipe Ratio Scaling | `targetYield: 0` or negative number | Throws `targetYield must be > 0` |
| 15 | Ratio Conversion | `fromTotalWeight()` with blueprint having ratio sum = 0 | Throws `Ratio sum cannot be zero` |

---

## 8. Feature Inventory Items & Recommended Milestone Groupings

### Milestone 1: Core Event Spine, Ratio Engine & Zero-Dependency Local Mode
- **Inventory Items**:
  - Event Broker & Binary Protocol (`packages/event-bus`)
  - Pure Ratio Scaling Engine (`packages/ratio-engine`)
  - Order Fire Pipeline: `PATCH /v1/orders/:id/send` → `pos:order:created` → Kitchen Tickets + Pantry Deduction + Plate Economics logging
  - Offline / Demo Mock Kitchen Store & LocalStorage Delta Sync Queue (`packages/shared/src/offline-sync.ts`)
  - Multi-Course Firing Engine (`packages/shared/src/course-engine.ts`)
  - Demo PIN Authentication (`1234` / `5678`) & Relaxed Mode Auth

### Milestone 2: Operations, Waste Tracking & Inventory Management
- **Inventory Items**:
  - Waste Event Logging (`POST /v1/ops/waste`) & Summary Analytics (`GET /v1/ops/waste/summary`)
  - Food Costing & Plate Economics APIs (`GET /v1/ops/food-cost/:itemId`, `GET /v1/ops/plate-economics`)
  - Purchase Orders Lifecycle (`/v1/pantry/purchase-orders/*` — auto-generation, approval, dispatch, stock receipt)
  - Par Level Alerts (`GET /v1/pantry/alerts`, `GET /v1/reports/pantry-usage`)
  - Operational Reports (`/v1/reports/sales-summary`, `/v1/reports/kds-summary`, `/v1/reports/eod`)

### Milestone 3: MCP Agent Extension Platform & Loyalty Marketing
- **Inventory Items**:
  - CulinaryOps MCP Live Bridge (`mcp/src/culinaryops-hub-live.ts`) & Satellite Sync (`culinaryops-server.ts`)
  - Plated Inventory MCP Server (`mcp/src/inventory-server.ts`)
  - KitchenKit KDS MCP Server (`mcp/src/kds-server.ts`)
  - RecipeOS MCP Server (`mcp/src/recipe-server.ts`)
  - Post-Pilot Loyalty Marketing MCP Server (`mcp/src/post-pilot-server.ts`) & Automated Postcard Dispatch
  - PrepEngine MCP Server (`mcp/src/prep-server.ts`)
  - First-Party Extension Manifests (`extensions/*`) and Extension Template (`extension_template/*`)

### Milestone 4: Cross-Surface UX, Admin Portal & Multi-Tenant Hardening
- **Inventory Items**:
  - Admin Portal Menu & Staff Management (`apps/admin`, `POST /v1/admin/menu/items`, `POST /v1/admin/staff`)
  - POS Terminal Interface (`apps/pos`) with Table and Takeout workflows
  - KDS Interface (`apps/kds`) with Station filtering, course hold/fire, and bump timers
  - Online Ordering Web Storefront (`apps/web`) with Cart and Checkout
  - Unified Theme Design Tokens (`@culinaryos/ui`)
  - Adversarial Multi-Tenant RLS & `managerGate` RBAC Enforcement

### Milestone 5: Open-Source Packaging, Infrastructure & Verification
- **Inventory Items**:
  - Monorepo Turborepo Pipeline Optimization & Root `test` Script Clean-up
  - MIT License Metadata (`"license": "MIT"`) in all `package.json` files & SPDX headers
  - Docker Compose Dev & Production Stacks (`docker-compose.yml`)
  - Comprehensive Test Suite Execution (29 test files passing in `scripts/run-all-tests.cjs`)
