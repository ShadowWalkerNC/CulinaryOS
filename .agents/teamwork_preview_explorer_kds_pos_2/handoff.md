# Handoff Report — KDS, POS, Recipe & Prep Engines Investigation

**Agent ID**: Explorer (`teamwork_preview_explorer_kds_pos_2`)  
**Parent Agent**: `69557e78-fbb2-4a0f-85bc-a21fc59f5367`  
**Date**: 2026-07-24  
**Working Directory**: `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_explorer_kds_pos_2`

---

## 1. Observation

### KDS Observations (`apps/kds`)
- `apps/kds/src/pages/Station.tsx`:
  - Lines 12–18: `STATIONS` array defines 5 tabs: `Hot Grill` (id `'1'`), `Cold Prep` (id `'2'`), `Fryer` (id `'3'`), `Bar` (id `'4'`), `All Stations` (id `'all'`). Navigates via `navigate('/station/${s.id}')`.
  - Missing: No tab or view for `Expo` / `Expediter` / `Pass`.
- `apps/kds/src/hooks/useRealtimeTickets.ts`:
  - Lines 145–149, 225: `timerRef.current = setInterval(tick, 1000)` updates ticket timers continuously every second.
  - Lines 180–186: DB query filters `.eq('course_hold_status', 'fired')`, hiding held tickets from prep stations.
- `apps/kds/src/components/TicketCard.tsx`:
  - Lines 11–15: `timerColor(secs)` returns Green (`<300s`), Amber (`300s-599s`), Red (`≥600s`).
  - Lines 50, 139: Card top border (`borderTop: 3px solid ${timer.color}`) and timer text use `timer.color`.
- `apps/kds/src/components/CourseHoldBanner.tsx`:
  - Lines 13–93: Subscribes to `course_fire_log` via `useCourseFiredNotices`, displaying a green animated flash banner when a course is released.
- `tests/kds/station.test.ts`:
  - Lines 1–92: Tests `initialHoldStatus`, `CourseHoldBanner` text formatting, analytics calculations, and timer color thresholds.

### Recipe & Prep Engine / MCP Observations
- `@culinaryos/ratio-engine` (`c:\Users\User\Documents\CulinaryOS\packages\ratio-engine`):
  - `src/index.ts:27-70`: Exports `scaleBlueprint()`, `computeCost()`, `fromTotalWeight()` using `RatioBlueprint` type.
  - `src/index.test.ts:1-45`: Unit tests for ratio scaling, cost computation, and total weight distribution.
- `prep-engine` (`c:\Users\User\Documents\KitchenKit\packages\prep-engine`):
  - `src/index.ts:27-62`: Exports `buildShiftPrep()`, `getMiseEnPlace()`, `projectBatchSize()` using `@kitchenkit/ratio-engine`.
  - Missing: No unit test file (`src/index.test.ts` is absent).
- `recipe-mcp` (`c:\Users\User\Documents\KitchenKit\mcp\recipe-mcp`):
  - `src/index.ts:38-192`: MCP tools `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list` using `@modelcontextprotocol/sdk` calling Supabase RPC `scale_recipe` and querying `recipes`/`ingredients` tables.
- `prep-mcp` (`c:\Users\User\Documents\KitchenKit\mcp\prep-mcp`):
  - `src/index.ts:36-303`: MCP tools `build_shift_prep`, `save_prep_plan`, `complete_prep_item`, `get_mise_en_place`, `project_batch_size`, `update_stock` calling Supabase RPC `build_shift_prep` & tables `prep_plans`, `prep_plan_items`, `par_levels`.

### POS Observations (`apps/pos`)
- `apps/pos/src/views/StaffView.tsx` & `App.tsx`:
  - `StaffView.tsx:4-7, 24-35`: Keypad login with hardcoded PINs (`1234` Server, `5678` Manager).
  - `App.tsx:18-20`: Forced PIN screen when `employee` is null.
- `apps/pos/src/views/TablesView.tsx`:
  - Lines 47–68: Renders open orders in a simple responsive grid (`auto-fill, minmax(180px, 1fr)`).
  - Missing: Graphical dining room table map (floor plan grid with room sections, visual table shapes, vacancy/occupancy colors).
- `apps/pos/src/views/DashboardView.tsx`:
  - Lines 17–22: `startQuickOrder()` opens tableless quick takeaway order.
- `apps/pos/src/views/MenuView.tsx`:
  - Lines 148–158: Seat selector (`Seat 1, 2, 3, 4`) tags line items with `seat_number`.
- `apps/pos/src/views/OrderView.tsx`:
  - Lines 29–49: `handleDiscountPrompt()` supports 10% Senior Discount and $5.00 Off Coupon. Calculates `taxableSubtotal` before 10% tax.
  - Lines 80: Displays seat tags (`S1`-`S4`) on ticket items.
- `apps/pos/src/views/CheckoutView.tsx`:
  - Lines 371–425: `Split Check Wizard` modal supporting 2-way, 3-way, 4-way even splits (`$XX.XX / ea`) and split by seat check filtering (`setSelectedSeatFilter(seatNum)`).

---

## 2. Logic Chain

1. **Task 1 (KDS)**:
   - *Observation*: `Station.tsx` has tabs for Hot Grill, Cold Prep, Fryer, Bar, and All Stations. `useRealtimeTickets.ts` runs a 1s `setInterval` to compute `elapsedSeconds`. `TicketCard.tsx` applies green (<5m), yellow (5-10m), and red (≥10m) colors based on `elapsedSeconds`. Held courses are excluded from line view until fired.
   - *Deduction*: Core station ticket workflow (filtering, aging, alerts, course banner) is fully functional.
   - *Gap*: Expediter (Expo / Pass) view is completely absent from `apps/kds`. A head chef cannot view held courses or trigger course fires across all stations from a single pass screen.

2. **Task 2 (Engines & MCPs)**:
   - *Observation*: `@culinaryos/ratio-engine` lives in CulinaryOS (`packages/ratio-engine`) with complete tests. `prep-engine`, `recipe-mcp`, and `prep-mcp` live in KitchenKit (`c:\Users\User\Documents\KitchenKit`).
   - *Deduction*: All 6 requested MCP tools (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`, `build_shift_prep`, `get_mise_en_place`) are fully implemented in KitchenKit MCP servers.
   - *Gap*: `prep-engine` in KitchenKit lacks unit test coverage (`src/index.test.ts` missing). `@culinaryos/ratio-engine` and `@kitchenkit/ratio-engine` use slightly different type contracts (`RatioBlueprint` vs `Recipe`).

3. **Task 3 (POS)**:
   - *Observation*: POS in `apps/pos` implements PIN lockscreen (`StaffView`), quick orders (`DashboardView`), seat assignments Seat 1-4 (`MenuView`, `OrderView`), coupon discounts (`OrderView`), and Split Check Wizard even split & by seat (`CheckoutView`).
   - *Deduction*: Order entry, seating, discounting, and split payment workflows are functional.
   - *Gap*: `TablesView.tsx` renders a plain grid of text cards for open orders, lacking a graphical dining room table floor map (room layout, visual table shapes, occupied/vacant color indicators).

---

## 3. Caveats

1. **Environment / DB Connection**:
   - POS and KDS rely on Supabase when configured, but fallback gracefully to in-memory demo mock data (`mockDb.ts`, `globalDemoTickets`) when offline.
2. **Repository Separation**:
   - `KitchenKit` (`c:\Users\User\Documents\KitchenKit`) is a separate monorepo containing the recipe web application (`apps/web`), `prep-engine`, `recipe-mcp`, and `prep-mcp`. `CulinaryOS` (`c:\Users\User\Documents\CulinaryOS`) contains `apps/kds`, `apps/pos`, and `@culinaryos/ratio-engine`.

---

## 4. Conclusion

- **KDS (`apps/kds`)**: 4/5 core features implemented (Station tabs, 1s aging timers, Green/Yellow/Red age alerts, Course hold/fire banner). **Missing**: Expo pass view for head chefs.
- **Recipe & Prep Engines / MCPs**: All requested tools implemented across CulinaryOS (`@culinaryos/ratio-engine`) and KitchenKit (`prep-engine`, `recipe-mcp`, `prep-mcp`). **Missing**: Unit tests for `prep-engine`.
- **POS (`apps/pos`)**: 5/6 core features implemented (PIN lockscreen, Quick orders, Seat 1-4 assignments, Coupon discounts, Split Check Wizard). **Missing**: Visual dining room floor map (currently simple card grid).

---

## 5. Verification Method

To independently verify all findings:

1. **Verify KDS Implementation**:
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\kds\src\pages\Station.tsx` (lines 12–18 for tabs).
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\kds\src\hooks\useRealtimeTickets.ts` (lines 145–149 for 1s interval).
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\kds\src\components\TicketCard.tsx` (lines 11–15 for green/amber/red thresholds).
   - Run Bun tests: `cd c:\Users\User\Documents\CulinaryOS && bun test tests/kds/station.test.ts`.

2. **Verify Recipe & Prep Engines / MCPs**:
   - Inspect `c:\Users\User\Documents\CulinaryOS\packages\ratio-engine\src\index.ts`.
   - Run ratio-engine tests: `cd c:\Users\User\Documents\CulinaryOS\packages\ratio-engine && bun test`.
   - Inspect `c:\Users\User\Documents\KitchenKit\packages\prep-engine\src\index.ts`.
   - Inspect `c:\Users\User\Documents\KitchenKit\mcp\recipe-mcp\src\index.ts` (lines 38, 74, 107, 152 for tools `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`).
   - Inspect `c:\Users\User\Documents\KitchenKit\mcp\prep-mcp\src\index.ts` (lines 36, 91, 153, 206, 242, 271 for tools `build_shift_prep`, `save_prep_plan`, `complete_prep_item`, `get_mise_en_place`, `project_batch_size`, `update_stock`).

3. **Verify POS Implementation**:
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\pos\src\views\StaffView.tsx` (PIN screen).
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\pos\src\views\TablesView.tsx` (open order list grid).
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\pos\src\views\MenuView.tsx` (lines 148–158 for Seat 1-4 selector).
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\pos\src\views\OrderView.tsx` (lines 29–49 for coupon discount prompt).
   - Inspect `c:\Users\User\Documents\CulinaryOS\apps\pos\src\views\CheckoutView.tsx` (lines 371–425 for Split Check Wizard modal).
