# Original User Request

## 2026-07-25T10:43:54Z

You are the Project Orchestrator for CulinaryOS.
Your working directory is `c:\Users\User\Documents\CulinaryOS\.agents\orchestrator`.
The user's latest request and full requirements are in `c:\Users\User\Documents\CulinaryOS\.agents\ORIGINAL_REQUEST.md`.

Requirements to fulfill:
R1. Central Hub & Master Design System (`CulinaryOps` & `packages/ui`) - CulinaryHeader, CulinaryCard, CulinaryButton, CulinaryBadge, Culinary Orange `#ff5f1f`, Slate Surface `#f8f9fa` across all apps (`apps/pos`, `apps/kds`, `apps/admin`, `apps/web`, `KitchenKit` at `c:\Users\User\Documents\KitchenKit`).
R2. High-Speed Binary Event Protocol & Offline Delta Sync Engine (`packages/event-bus` & `packages/shared`) - Fast Binary Packet Encoding (`encodeBinaryEvent`/`decodeBinaryEvent`) reducing KDS/POS WebSocket event message size by ~60% for fast Wi-Fi transmission. Offline-First Transaction Delta Sync Engine (`enqueueOfflineDelta`/`flushOfflineQueue`) storing cryptographic UUIDv4 transaction deltas in LocalStorage/IndexedDB for 0ms offline checkout response latency and zero-collision reconnection replay.
R3. HTMX Server-Driven HTML Streaming (`apps/server/src/routes/kds.ts`) - Zero-JS Kiosk Endpoint (`GET /v1/kds/htmx-cards`) streaming micro-HTML card fragments directly for low-power handheld ordering devices and kitchen displays.
R4. KitchenKit KDS & Recipe Blueprint Integration (`apps/kds` & `KitchenKit`) - Multi-station kitchen ticket display system with real-time station tab filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations, Expo Pass), 1-second timer counters, age alert indicators (Green/Yellow/Red), course hold/fire groupings, and an Expediter pass view. Powered by `@culinaryos/ratio-engine` and `prep-engine`. Exposes `recipe-mcp` and `prep-mcp`.
R5. Plated Automatic Inventory Deduction Engine & Post-Pilot Loyalty (`mcp/src/`) - POS checkout orders trigger RecipeOS recipe ratio scaling, automatically decrementing raw ingredient stock in Plated and triggering low-stock par level alerts on Admin dashboard. Automated postcard coupon dispatches (`SAVE15`/`SAVE20`) on guest loyalty milestones. Standalone MCP tool servers (`Plated` and `Post-Pilot`).

Acceptance Criteria:
- CulinaryOS Hub (`CulinaryHeader`) is mounted at the root of every app (`POS`, `KDS`, `Web`, `Admin`), rendering active module highlights and port indicators.
- Monorepo build passes cleanly via `npx pnpm@9 run build` with zero TypeScript errors across all 15 workspace packages (`FULL TURBO`).
- Binary packet encoding unit tests pass cleanly with ~60% payload size reduction.
- HTMX kiosk route returns HTML cards with 200 OK.
- Offline sync queue enqueues and flushes transaction deltas reliably.

Please create plan.md and progress.md, spawn required worker/reviewer/explorer subagents, verify all builds and tests, and send a message back to parent when victory is claimed.
