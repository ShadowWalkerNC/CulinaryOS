# Quality & Adversarial Review Report: Requirements R4 & R5

## Executive Summary

**Verdict**: **REQUEST_CHANGES**

- **Full Monorepo Build**: `npx pnpm@9 run build` — **PASSED** (12 packages built successfully, 0 errors).
- **Full Test Suite**: `node ./scripts/run-all-tests.cjs` — **PASSED** (16 test files executed, 16 passed, 0 failed).
- **Integrity Assessment**: **NO INTEGRITY VIOLATIONS DETECTED**. No hardcoded test shortcuts, facade engines, or fabricated verification artifacts were found. All core engines (`ratio-engine`, course firing state machine, KDS continuous timers, MCP tool handlers) contain genuine operational logic.
- **Reason for REQUEST_CHANGES**: A **Major Defect** was identified in Requirement R5 — the backend REST endpoints for Purchase Orders (`/v1/pantry/purchase-orders`) are missing from `apps/server/src/routes/pantry.ts`, causing the Admin Dashboard Auto-PO feature (`Pantry.tsx`) to fail with HTTP 404 errors when called against the backend API server.

---

## Detailed Findings

### [Major] Finding 1: Missing Backend REST Endpoints for Admin Auto-PO Generation

- **What**: The backend API server (`apps/server/src/routes/pantry.ts`) does not implement HTTP route handlers for `/v1/pantry/purchase-orders`.
- **Where**: `apps/server/src/routes/pantry.ts` vs `apps/admin/src/pages/Pantry.tsx` (lines 72, 83, 94, 99, 104).
- **Why**: 
  - The Admin UI (`Pantry.tsx`) has full frontend support for viewing POs, auto-generating POs (`POST /v1/pantry/purchase-orders`), approving POs (`PATCH /v1/pantry/purchase-orders/:id/approve`), sending POs (`PATCH /v1/pantry/purchase-orders/:id/send`), and cancelling POs (`DELETE /v1/pantry/purchase-orders/:id`).
  - The database layer includes migration `V9__restock_purchase_orders.sql` with tables `restock_purchase_orders` and `po_line_items`.
  - However, `apps/server/src/routes/pantry.ts` only implements `/`, `/:id`, and `/deduct`. When `Pantry.tsx` makes requests to `${API}/v1/pantry/purchase-orders`, Hono routes it to `GET /v1/pantry/:id` with `id = "purchase-orders"`, returning `404 Pantry item purchase-orders not found`.
- **Suggestion**: Add the `/purchase-orders` sub-router or route handlers to `apps/server/src/routes/pantry.ts` before the generic `/:id` route, implementing `GET /`, `POST /` (auto-PO creation), `PATCH /:id/approve`, `PATCH /:id/send`, and `DELETE /:id`.

---

### [Minor] Finding 2: Lack of Input Guard for Negative Quantities in `/v1/pantry/deduct`

- **What**: `POST /v1/pantry/deduct` does not reject negative quantity values.
- **Where**: `apps/server/src/routes/pantry.ts` (lines 161–181).
- **Why**: Sending `{ itemId: 'i1', quantity: -5.0 }` causes `stock_quantity = Math.max(0, current - (-5))`, which increases inventory stock instead of deducting or throwing a `400 BAD_REQUEST`.
- **Suggestion**: Add validation: `if (typeof body.quantity !== 'number' || body.quantity <= 0) return err(c, 'INVALID_INPUT', 'Quantity must be greater than 0', 400);`.

---

### [Minor] Finding 3: Unescaped HTML String Interpolation in Zero-JS HTMX KDS Cards Endpoint

- **What**: The `/v1/kds/htmx-cards` endpoint constructs HTML using unescaped string interpolation.
- **Where**: `apps/server/src/routes/kds.ts` (lines 153–172).
- **Why**: `item.name` is interpolated directly into `<div>${i.name}</div>`. If menu item names contain user-controlled special characters (`<`, `>`, `"`), it presents an XSS/HTML injection vulnerability on HTMX kiosk displays.
- **Suggestion**: Sanitize/escape HTML entities in `i.name` before string template interpolation.

---

## Verification of Requirements R4 & R5

### Requirement R4: KitchenKit KDS & Recipe Blueprint Integration

| Component | Sub-requirement | Claim / Implementation | Verification Method | Result |
|---|---|---|---|---|
| **KDS Station Filters** | Multi-station & Expo routing | `Station.tsx` & `useRealtimeTickets.ts` filter by station `1..4`, `all`, and `expo`. Expo view shows all active tickets across stations. | Inspected `Station.tsx` and ran `tests/kds/station.test.ts` & `tests/empirical/r3_r4_r5_stress.test.ts`. | **PASS** |
| **KDS 1s Timers** | Continuous timer tick | `useRealtimeTickets.ts` maintains `setInterval(tick, 1000)` updating `elapsedSeconds` continuously. | Inspected `useRealtimeTickets.ts` line 222. | **PASS** |
| **Age Alert Thresholds** | Color coding (<5m, 5-10m, 10m+) | `< 300s` green (`NORMAL`), `300s..599s` amber (`AMBER ALERT`), `>= 600s` red (`RED ALERT`). | Verified boundary transitions (299s/300s, 599s/600s) in `TicketCard.tsx` & `r3_r4_r5_stress.test.ts`. | **PASS** |
| **Course Hold/Fire** | State machine & UI buttons | Course 1 starts `firing`; Course 2+ starts `held`. `🔥 Fire Course N` fires held course. `PATCH /v1/kds/tickets/:id/fire` updates status. | Verified `kds/server/lib/course-engine.ts`, `tests/course-firing/engine.test.ts`, and `TicketCard.tsx`. | **PASS** |
| **Expo Pass View** | Head Chef aggregated view | Displays station summary counters (`hotGrill`, `coldPrep`, `fryer`, `bar`, `held`, `total`) and all tickets across stations. | Inspected `Station.tsx` lines 87-95, 177-208. | **PASS** |
| **`@culinaryos/ratio-engine`** | Baker's percentage scaling | Pure TS package in `packages/ratio-engine`. Implements `scaleBlueprint`, `computeCost`, `fromTotalWeight`. | Built package & executed `packages/ratio-engine/src/index.test.ts`. | **PASS** |
| **`recipe-mcp` Server** | MCP tools for recipe blueprints | `mcp/src/recipe-server.ts` exposes `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`. | Inspected code & verified `tests/empirical/step3_mcp_servers.test.ts`. | **PASS** |
| **`prep-mcp` Server** | MCP tools for prep execution | `mcp/src/prep-server.ts` exposes `build_shift_prep` and `get_mise_en_place`. | Inspected code & verified `tests/empirical/step3_mcp_servers.test.ts`. | **PASS** |

### Requirement R5: Plated Automatic Inventory Deduction & Post-Pilot Loyalty

| Component | Sub-requirement | Claim / Implementation | Verification Method | Result |
|---|---|---|---|---|
| **Plated Inventory Deduction** | POS order completion stock decrement | Recipe blueprints scaled via `scaleBlueprint()`, deducting ingredient stock via `POST /v1/pantry/deduct`. | Verified `step1_plated_inventory.test.ts` & `apps/server/src/routes/pantry.ts`. | **PASS** |
| **Low-Stock Par Level Alerts** | Restock warning alerts | `current_qty <= reorder_at` triggers `low_stock` status and Admin warning banner (`⚠️ N items need restocking`). | Verified `Pantry.tsx` line 118 & `step1_plated_inventory.test.ts`. | **PASS** |
| **Auto-PO Generation** | Admin PO creation & lifecycle | Frontend `Pantry.tsx` calls `POST /v1/pantry/purchase-orders`. Database migration `V9` defines tables. | Checked `apps/server/src/routes/pantry.ts`. Route handler missing! | **FAIL** (Major Finding 1) |
| **Post-Pilot Loyalty Postcards** | `SAVE15` & `SAVE20` coupon dispatches | `mcp/src/post-pilot-server.ts` handles `send_marketing_postcard`. `visitCount >= 5` -> `SAVE15`; `totalSpendDollars >= $250.00` -> `SAVE20`. | Verified `step2_post_pilot_marketing.test.ts` & `r3_r4_r5_stress.test.ts`. | **PASS** |

---

## Adversarial Stress Test & Edge Case Analysis

1. **Timer Threshold Boundaries**:
   - `299s`: Green (`NORMAL`, `04:59`).
   - `300s`: Amber (`AMBER ALERT`, `05:00`).
   - `599s`: Amber (`AMBER ALERT`, `09:59`).
   - `600s`: Red (`RED ALERT`, `10:00`).
   - Both unit tests and stress tests accurately assert these boundaries.

2. **Loyalty Milestone Precedence**:
   - Guest with 5 visits AND $250.00 spend: Spend milestone (`SAVE20`, 20% discount) takes precedence over visit milestone (`SAVE15`, 15% discount).
   - Guest with < 5 visits AND < $250.00 spend (e.g., 4 visits, $249.99 spend): Returns `null` (no postcard coupon dispatched).

3. **Ratio Engine Edge Cases**:
   - `scaleBlueprint` with `targetYield <= 0` throws an explicit error (`targetYield must be > 0`).
   - `fromTotalWeight` with `ratioSum === 0` throws an explicit error (`Ratio sum cannot be zero`).

---

## Coverage & Unverified Items

- **Coverage Gaps**: None. All R4 and R5 modules, packages, MCP servers, components, and tests were examined and verified.
- **Unverified Items**: None. Full build and test suite were run synchronously and recorded in this report.
