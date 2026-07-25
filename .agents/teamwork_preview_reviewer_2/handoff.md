# Handoff Report — Requirements R4 & R5 Review

## 1. Observation

- **Full Monorepo Build Command**: `npx pnpm@9 run build`
  - Output: `Tasks: 12 successful, 12 total. Cached: 7 cached, 12 total. Time: 9.727s`. All 12 build targets built without errors.
- **Full Test Suite Command**: `node ./scripts/run-all-tests.cjs`
  - Output: `Found 16 test files to run. TEST SUMMARY: 16 passed, 0 failed.`
- **KDS Station Filtering, Timers & Age Alert Thresholds**:
  - File: `apps/kds/src/pages/Station.tsx` (lines 13-20, 88-95)
  - File: `apps/kds/src/components/TicketCard.tsx` (lines 12-16, 182-192)
    ```typescript
    function timerColor(secs: number): { color: string; label: string } {
      if (secs < 300) return { color: 'var(--green)', label: formatTime(secs) };
      if (secs < 600) return { color: 'var(--amber)', label: formatTime(secs) };
      return { color: 'var(--red)', label: formatTime(secs) };
    }
    ```
  - File: `apps/kds/src/hooks/useRealtimeTickets.ts` (lines 194-226)
    ```typescript
    timerRef.current = setInterval(tick, 1000);
    ```
  - File: `kds/server/lib/course-engine.ts` (lines 1-3)
    ```typescript
    export function initialHoldStatus(courseNumber: number): 'firing' | 'held' {
      return courseNumber === 1 ? 'firing' : 'held';
    }
    ```
- **Ratio Engine & MCP Tool Servers**:
  - File: `packages/ratio-engine/src/index.ts` (lines 27-70) implements `scaleBlueprint`, `computeCost`, `fromTotalWeight`.
  - File: `mcp/src/recipe-server.ts` (lines 47-176) exposes `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`.
  - File: `mcp/src/prep-server.ts` (lines 41-124) exposes `build_shift_prep`, `get_mise_en_place`.
  - File: `mcp/src/post-pilot-server.ts` (lines 21-79) exposes `send_marketing_postcard`.
- **Plated Inventory Deduction & Loyalty**:
  - File: `tests/empirical/step1_plated_inventory.test.ts` (lines 41-118) verifies scaled recipe deduction & par level alerts.
  - File: `tests/empirical/step2_post_pilot_marketing.test.ts` (lines 52-127) verifies `SAVE15` (5 visits) and `SAVE20` ($250 spend).
- **Major Finding (Missing REST Route for Auto-PO)**:
  - File: `apps/admin/src/pages/Pantry.tsx` (lines 72, 83, 94, 99, 104) makes HTTP fetch requests:
    `fetch("${API}/v1/pantry/purchase-orders")`
  - File: `apps/server/src/routes/pantry.ts` (lines 1-184) defines routes `/`, `/:id`, and `/deduct`, but completely lacks `/purchase-orders` handlers.
  - When frontend calls `/v1/pantry/purchase-orders`, Hono matches `/:id` with `id = 'purchase-orders'` and returns `404 Pantry item purchase-orders not found`.

---

## 2. Logic Chain

1. **Observation 1**: Executing `npx pnpm@9 run build` succeeds across all 12 packages without compiler or bundler errors.
2. **Observation 2**: Executing `node ./scripts/run-all-tests.cjs` executes 16 test files covering ratio-engine, course firing, KDS station display, empirical steps 1-5, and R3-R5 stress tests, with 0 failures.
3. **Observation 3**: Inspecting `Station.tsx`, `TicketCard.tsx`, and `useRealtimeTickets.ts` confirms KDS station routing (`1..4`, `all`, `expo`), continuous 1-second timers, exact color alert thresholds (<5m green, 5-10m amber, 10m+ red), course hold/fire, and Expo Pass view.
4. **Observation 4**: Inspecting `packages/ratio-engine/src/index.ts` and `mcp/src/` confirms genuine implementation of ratio scaling math and MCP tool handlers (`recipe-mcp`, `prep-mcp`, `post-pilot`).
5. **Observation 5**: Comparing `apps/admin/src/pages/Pantry.tsx` against `apps/server/src/routes/pantry.ts` shows a discrepancy: the admin frontend attempts to fetch and create purchase orders via `/v1/pantry/purchase-orders`, but the backend route router has no `/purchase-orders` route handler registered. Requests fall through to `GET /v1/pantry/:id` and fail with HTTP 404.
6. **Conclusion**: Therefore, while build and tests pass and most of R4 and R5 features are well-implemented, the missing REST API route for purchase orders in `apps/server/src/routes/pantry.ts` blocks live end-to-end Auto-PO generation, requiring a verdict of **REQUEST_CHANGES**.

---

## 3. Caveats

- Database integration tests in `run-all-tests.cjs` rely on mock database fallbacks (`if (!supabase)`) when a live Supabase database connection is not active in local test environment.
- The MCP servers (`recipe-server.ts`, `prep-server.ts`, `post-pilot-server.ts`) run as stdio servers and were verified via unit/empirical test invocations rather than running persistent background daemon processes.

---

## 4. Conclusion

- **Verdict**: **REQUEST_CHANGES**
- Requirement R4 is fully verified and functional.
- Requirement R5 requires adding the missing `/purchase-orders` REST API route handlers to `apps/server/src/routes/pantry.ts` to connect the Admin UI `Pantry.tsx` and database schema `V9__restock_purchase_orders.sql`.

---

## 5. Verification Method

To independently verify these findings:

1. **Run Monorepo Build**:
   ```bash
   npx pnpm@9 run build
   ```
   Expect output: `12 successful, 12 total`.

2. **Run Monorepo Test Suite**:
   ```bash
   node ./scripts/run-all-tests.cjs
   ```
   Expect output: `16 passed, 0 failed`.

3. **Inspect Missing PO Route**:
   Inspect `apps/server/src/routes/pantry.ts` to confirm absence of `pantryRoutes.get('/purchase-orders')` or `pantryRoutes.post('/purchase-orders')`.
