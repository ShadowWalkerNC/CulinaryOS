# Master Execution Plan — CulinaryOS

## Executive Summary
Orchestration plan to fulfill requirements R1-R5 and pass all acceptance criteria across CulinaryOS and KitchenKit.

## Milestones & Iteration Strategy

### Milestone 1: Master Design System & Central Hub (R1)
- Build `CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge` in `packages/ui`.
- Apply Culinary Orange `#ff5f1f` and Slate Surface `#f8f9fa`.
- Mount `CulinaryHeader` at root of `POS`, `KDS`, `Web`, `Admin`, and `KitchenKit`.
- Render active module highlights and port indicators.

### Milestone 2: Binary Event Protocol & Offline Delta Sync Engine (R2)
- Implement `encodeBinaryEvent` and `decodeBinaryEvent` in `packages/event-bus` / `packages/shared`.
- Achieve ~60% size reduction over JSON strings.
- Implement `enqueueOfflineDelta` and `flushOfflineQueue` using cryptographic UUIDv4 transaction deltas in LocalStorage/IndexedDB.
- Write unit tests verifying payload reduction and reliable queue operations.

### Milestone 3: HTMX Server-Driven HTML Streaming (R3)
- Implement `GET /v1/kds/htmx-cards` in `apps/server/src/routes/kds.ts`.
- Stream micro-HTML card fragments directly for low-power handhelds and displays.
- Return 200 OK with `text/html`.

### Milestone 4: KitchenKit KDS & Recipe Blueprint Integration (R4)
- Build station filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations, Expo Pass) in `apps/kds` and `KitchenKit`.
- Add 1-second timer counters, Green/Yellow/Red age alert indicators, course hold/fire groupings, Expediter pass view.
- Connect `@culinaryos/ratio-engine` and `prep-engine`. Expose `recipe-mcp` and `prep-mcp`.

### Milestone 5: Plated Automatic Inventory Deduction & Post-Pilot Loyalty (R5)
- Build `Plated` standalone MCP tool server for recipe ratio scaling ingredient stock deduction & par level alerts on Admin dashboard.
- Build `Post-Pilot` standalone MCP tool server for automated postcard coupon dispatches (`SAVE15`/`SAVE20`) on guest loyalty milestones.

### Milestone 6: Monorepo Build & E2E Test Verification
- Run `npx pnpm@9 run build` across all workspace packages (`FULL TURBO`).
- Verify all unit and integration tests pass cleanly.

## Workflow & Safety Protocols
1. Spawn Explorer subagents to investigate starting state of each package.
2. Spawn Worker subagents to execute code changes.
3. Spawn Reviewer & Challenger subagents to verify implementation.
4. Spawn Forensic Auditor subagent for integrity validation.
5. Heartbeat cron every 10 minutes to track progress.
6. Self-succeed at 16 subagent spawns.
