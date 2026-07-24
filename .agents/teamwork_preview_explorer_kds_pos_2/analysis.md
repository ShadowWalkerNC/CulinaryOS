# CulinaryOS & KitchenKit Investigation Analysis

**Author**: Explorer Agent  
**Date**: 2026-07-24  
**Target Directory**: `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_explorer_kds_pos_2`  
**Scope**: KDS (`apps/kds`), Recipe & Prep Engines/MCPs (`@culinaryos/ratio-engine`, `prep-engine`, `recipe-mcp`, `prep-mcp`), POS (`apps/pos`), and cross-repo comparison with `KitchenKit` (`c:\Users\User\Documents\KitchenKit`).

---

## Executive Summary

1. **Kitchen Display System (KDS)**: Implemented in `apps/kds` with real-time station tab filters (`Hot Grill`, `Cold Prep`, `Fryer`, `Bar`, `All Stations`), 1-second aging timers, green/yellow/red age alert indicators (<5m green, 5–10m yellow, ≥10m red), and course hold/fire banner notifications. **Missing Feature**: An Expediter (Expo / Pass) view for head chefs to oversee all stations and manually fire held courses across all stations.
2. **Recipe & Prep Engines / MCP Tools**:
   - `@culinaryos/ratio-engine` exists at `c:\Users\User\Documents\CulinaryOS\packages\ratio-engine` (exports `scaleBlueprint`, `computeCost`, `fromTotalWeight`).
   - `prep-engine` exists at `c:\Users\User\Documents\KitchenKit\packages\prep-engine` (exports `buildShiftPrep`, `getMiseEnPlace`, `projectBatchSize`).
   - `recipe-mcp` exists at `c:\Users\User\Documents\KitchenKit\mcp\recipe-mcp` (tools: `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`).
   - `prep-mcp` exists at `c:\Users\User\Documents\KitchenKit\mcp\prep-mcp` (tools: `build_shift_prep`, `save_prep_plan`, `complete_prep_item`, `get_mise_en_place`, `project_batch_size`, `update_stock`).
3. **Point of Sale (POS)**: Implemented in `apps/pos`. Features PIN lockscreen (`StaffView.tsx`), Quick Orders (`DashboardView.tsx`), Seat Assignments Seat 1-4 (`MenuView.tsx`, `OrderView.tsx`), Coupon Discounts (`OrderView.tsx`), and Split Check Wizard even split + split by seat (`CheckoutView.tsx`). **Missing Feature**: Graphical dining room table map (floor plan with visual room layout/shapes/vacancy status). `TablesView.tsx` currently only displays a plain grid of active order text cards.

---

## 1. Kitchen Display System (KDS) Investigation

### File Locations & Structure
- **CulinaryOS Location**: `apps/kds` (`c:\Users\User\Documents\CulinaryOS\apps\kds`).
- **KitchenKit Comparison**: KitchenKit (`c:\Users\User\Documents\KitchenKit`) contains `apps/web` (Recipe & Prep Planner web interface), while CulinaryOS contains `apps/kds` (dedicated KDS station terminal). Note: Standalone root folders `kds/` and `kds-client/` do not exist; all KDS code is consolidated in `apps/kds`.

### Key Component & Feature Verification

| Feature | Implementation Location | Current Status | Details / Observations |
|---|---|---|---|
| **Station Filtering Tabs** | `apps/kds/src/pages/Station.tsx:12-18, 95-116` | **Implemented** | Tabs for `Hot Grill` (ID 1), `Cold Prep` (ID 2), `Fryer` (ID 3), `Bar` (ID 4), `All Stations` (ID `all`). Clicking a tab navigates to `/station/:stationId`. Filter logic works in local demo mode (`useRealtimeTickets.ts:159-167`) and Supabase query mode (`.eq('station_id', stationId)`). |
| **1-Second Aging Timer Counters** | `apps/kds/src/hooks/useRealtimeTickets.ts:145-149, 171, 225` | **Implemented** | `setInterval(tick, 1000)` ticks every second, re-deriving `elapsedSeconds` from `firedAt` or `createdAt`. Renders formatted `MM:SS` in `TicketCard.tsx:17-21`. |
| **Age Alert Indicators** | `apps/kds/src/components/TicketCard.tsx:11-15, 50, 139` | **Implemented** | Green (`< 300s` / <5 min), Amber (`300s - 599s` / 5–10 min), Red (`≥ 600s` / ≥10 min). Top card border and elapsed timer text adapt color dynamically. Unit tested in `tests/kds/station.test.ts:78-91`. |
| **Course Hold/Fire Groupings** | `apps/kds/src/types.ts:4, 20` & `CourseHoldBanner.tsx` & `useCourseFiredNotices.ts` | **Implemented** | Course status supports `'held' \| 'firing' \| 'fired'`. DB query filters `.eq('course_hold_status', 'fired')` so held tickets are withheld from station line cooks until fired. Banner flashes green notification on course fire event. |
| **Expo Pass View** | N/A | ❌ **MISSING** | **Not implemented**. There is no `Expo` tab in `STATIONS` array, no route `/expo` or `/pass`, and no view allowing an expediter / head chef to see held & fired courses across all stations with manual course fire triggers. |

---

## 2. Recipe Engine, Prep Engine & MCP Tools Investigation

### Module Matrix & File Locations

| Module Name | Repository Location | Exports / Tools | Status | Test Coverage |
|---|---|---|---|---|
| `@culinaryos/ratio-engine` | `c:\Users\User\Documents\CulinaryOS\packages\ratio-engine` | `RatioBlueprint`, `RatioBlueprintIngredient`, `scaleBlueprint()`, `computeCost()`, `fromTotalWeight()` | Complete | Covered in `packages/ratio-engine/src/index.test.ts` (Bun test runner) |
| `@kitchenkit/ratio-engine` | `c:\Users\User\Documents\KitchenKit\packages\ratio-engine` | `Recipe`, `Ingredient`, `scaleRecipe()`, `calculateRatio()`, `totalFormulaWeight()` | Complete | Defined in KitchenKit |
| `prep-engine` | `c:\Users\User\Documents\KitchenKit\packages\prep-engine` | `PrepItem`, `ShiftPrepPlan`, `buildShiftPrep()`, `getMiseEnPlace()`, `projectBatchSize()` | Complete | ❌ Missing unit test file (`src/index.test.ts` absent) |
| `recipe-mcp` | `c:\Users\User\Documents\KitchenKit\mcp\recipe-mcp` | MCP Tools: `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list` | Complete | MCP server (`@modelcontextprotocol/sdk`), relies on Supabase RPC `scale_recipe` |
| `prep-mcp` | `c:\Users\User\Documents\KitchenKit\mcp\prep-mcp` | MCP Tools: `build_shift_prep`, `save_prep_plan`, `complete_prep_item`, `get_mise_en_place`, `project_batch_size`, `update_stock` | Complete | MCP server (`@modelcontextprotocol/sdk`), relies on Supabase RPC `build_shift_prep` & tables `prep_plans`, `prep_plan_items`, `par_levels` |

### Detailed Findings for Recipe/Prep Tools
1. **Ratio Engine Duality**:
   - `CulinaryOS` has `@culinaryos/ratio-engine` using `RatioBlueprint` (Baker's percentage model where base ingredient = 100).
   - `KitchenKit` has `@kitchenkit/ratio-engine` using `Recipe` (Base ingredient ratio where base = 1.0).
2. **MCP Tool Functionality**:
   - `recipe-mcp` tools (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`) are implemented in `c:\Users\User\Documents\KitchenKit\mcp\recipe-mcp\src\index.ts`.
   - `prep-mcp` tools (`build_shift_prep`, `get_mise_en_place`, `save_prep_plan`, `complete_prep_item`, `project_batch_size`, `update_stock`) are implemented in `c:\Users\User\Documents\KitchenKit\mcp\prep-mcp\src\index.ts`.
   - Both MCP servers connect via STDIO using `@modelcontextprotocol/sdk` and require environment variables `KITCHENKIT_SUPABASE_URL` and `KITCHENKIT_SUPABASE_SERVICE_KEY`.

---

## 3. Point of Sale (POS) Investigation

### File Locations & Structure
- **CulinaryOS Location**: `apps/pos` (`c:\Users\User\Documents\CulinaryOS\apps\pos`).
- Note: Standalone root folders `pos/` and `pos-client/` do not exist; all POS terminal views and components live in `apps/pos/src`.

### Feature Verification Breakdown

| Feature | File Location | Implementation Status | Details & Observations |
|---|---|---|---|
| **PIN Lockscreen** | `apps/pos/src/views/StaffView.tsx` & `App.tsx:18-20` | **Implemented** | 4-digit keypad interface (`1-9`, `0`, `Clear`, `OK`) with dot indicators. Forced as root view in `App.tsx` when `employee === null`. Lock button in header resets session. **Limitation**: Uses hardcoded PIN array (`1234` for Server, `5678` for Manager) instead of Supabase Auth / PIN table lookup. |
| **Dining Room Table Map** | `apps/pos/src/views/TablesView.tsx` | ❌ **PARTIAL / MISSING MAP** | Displays open order cards in a responsive grid (`auto-fill, minmax(180px, 1fr)`). Shows table number (e.g., `T4` or `T/A`), server, status color, item count, and total. **Missing**: Visual graphical floor plan / interactive dining room layout grid with room zones (Main Dining, Patio, Bar), table geometry (round, square), visual vacant/occupied status indicators, or visual table layout builder. |
| **Quick Orders** | `apps/pos/src/views/DashboardView.tsx:17-22` | **Implemented** | `startQuickOrder()` button creates a takeaway order (`table_number: undefined`, `cover_count: 1`) and routes straight to the menu screen (`MenuView.tsx`). |
| **Seat Assignments (Seat 1-4)** | `apps/pos/src/views/MenuView.tsx:148-158` & `OrderView.tsx:80` | **Implemented** | Seat selector bar (`Seat 1, 2, 3, 4`) in `MenuView.tsx`. Items tagged with `seat_number`. Rendered in receipt panel (`OrderView.tsx`) with `S1`, `S2`, `S3`, `S4` badges. Grouped by seat for checkout in `CheckoutView.tsx`. |
| **Coupon Discounts** | `apps/pos/src/views/OrderView.tsx:21-27, 29-49` | **Implemented** | `Promo` button triggers prompt supporting 10% Senior Discount (`discount_percent = 10`) and $5.00 Off Coupon (`discount_flat = 500`). Calculates `taxableSubtotal = Math.max(0, subtotal - discountAmount)` before applying 10% tax. |
| **Split Check Wizard** | `apps/pos/src/views/CheckoutView.tsx:249-252, 371-425` | **Implemented** | `Split Check Wizard` modal supports: <br/>1. **Even Split**: Displays 2-way, 3-way, 4-way per-person split totals `${((total / num) / 100).toFixed(2)} / ea`. <br/>2. **Split By Seat**: Groups line items by `seat_number`, computes seat-specific subtotal + tax, and filters `CheckoutView` via `setSelectedSeatFilter(seatNum)` to allow individual seat payment. |

---

## 4. Implementation Recommendations & Action Plan

### 1. KDS Improvements
- **Add Expo Pass View (`ExpoView.tsx`)**:
  - Add an `'expo'` option to the `STATIONS` array in `Station.tsx` or create a dedicated route `/expo`.
  - Display all orders regardless of station, grouping items by course (Course 1, Course 2, Course 3).
  - Add "FIRE COURSE" button per table/ticket for expediters to release held courses directly to line stations (`UPDATE kitchen_tickets SET course_hold_status = 'fired' WHERE order_id = X AND course_number = Y`).

### 2. Recipe & Prep Engine Improvements
- **Add Unit Tests for `prep-engine`**:
  - Create `c:\Users\User\Documents\KitchenKit\packages\prep-engine\src\index.test.ts` to test `buildShiftPrep()`, `getMiseEnPlace()`, and `projectBatchSize()`.
- **Harmonize Ratio Engine Types**:
  - Reconcile `@culinaryos/ratio-engine` (`RatioBlueprint`) and `@kitchenkit/ratio-engine` (`Recipe`) under a shared contract or adapter if both packages are merged into CulinaryOS.

### 3. POS Improvements
- **Build Graphical Dining Room Floor Map (`FloorMap.tsx`)**:
  - Replace or enhance `TablesView.tsx` with a canvas/SVG visual floor map.
  - Implement visual room sections (Main Dining, Patio, Bar), table shapes (round, rectangle), seating capacities, and color-coded table states (Green = Vacant, Orange = Occupied, Blue = Ready for Check, Gray = Dirty).
- **Connect PIN Authentication to Supabase**:
  - Replace hardcoded `EMPLOYEES` array in `StaffView.tsx` with Supabase query to `staff_members` table with hashed PIN check and role RBAC enforcement.
