## 2026-07-25T10:45:13Z
You are Worker 1 (Primary Implementer & Verification Worker).
Your working directory is `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_1`.
Identity: archetype teamwork_preview_worker.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. **R1: Central Hub & Master Design System**:
   - Update `packages/ui/src/CulinaryHeader.tsx` to include `KitchenKit` (port `:5175`) in active module highlights and port indicators.
   - Mount `CulinaryHeader` at the root of `KitchenKit` at `c:\Users\User\Documents\KitchenKit\apps\web\src\components\layout\Layout.tsx` (or root layout).
   - Ensure `CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge` (Culinary Orange `#ff5f1f`, Slate Surface `#f8f9fa`) are cleanly mounted across POS, KDS, Admin, Web, and KitchenKit.

2. **R2: Binary Event Protocol & Offline Sync Engine**:
   - Add/verify unit tests for binary packet protocol in `tests/event-bus/binary-protocol.test.ts` testing `encodeBinaryEvent` and `decodeBinaryEvent` and confirming ~60% payload size reduction compared to JSON strings.
   - Add/verify unit tests for offline transaction delta sync engine in `tests/shared/offline-sync.test.ts` testing `enqueueOfflineDelta` and `flushOfflineQueue` with cryptographic UUIDv4 transaction deltas in LocalStorage/IndexedDB.

3. **R3: HTMX Kiosk HTML Streaming**:
   - Verify `GET /v1/kds/htmx-cards` in `apps/server/src/routes/kds.ts` returns micro-HTML card fragments with 200 OK. Create unit/integration test `tests/server/htmx-kds.test.ts` verifying this endpoint.

4. **R4: KitchenKit KDS & Recipe Blueprint Integration**:
   - Verify multi-station kitchen ticket display in `apps/kds` & `KitchenKit`: station tab filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations, Expo Pass), 1s timer counters, Green/Yellow/Red age alert indicators (<5m green, 5-10m amber, 10m+ red), course hold/fire groupings, Expediter pass view.
   - Ensure `@culinaryos/ratio-engine`, `prep-engine`, `recipe-mcp`, and `prep-mcp` are functioning.

5. **R5: Plated Automatic Inventory Deduction & Post-Pilot Loyalty**:
   - Verify POS checkout order triggers recipe ratio scaling ingredient stock deduction in Plated (`mcp/src/inventory-server.ts`) and triggers low-stock par level alerts on Admin dashboard (`apps/admin/src/pages/Pantry.tsx`).
   - Verify automated postcard coupon dispatches (`SAVE15`/`SAVE20`) on guest loyalty milestones in Post-Pilot (`mcp/src/post-pilot-server.ts`).

6. **Monorepo Build & Test Verification**:
   - Run `npx pnpm@9 run build` across all workspace packages (FULL TURBO) to verify zero TypeScript errors.
   - Run `node ./scripts/run-all-tests.cjs` or `pnpm test` to verify all unit/integration tests pass.

Deliverables:
- Write `changes.md` and `handoff.md` in `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_1\`.
- Send a message to parent with build/test outputs and summary when done.
