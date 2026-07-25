# CulinaryOS — Project Specification & Architecture

## Architecture & Overview
CulinaryOS is an AI-native restaurant operating system monorepo built with pnpm workspaces and Turborepo.

## Code Layout
- `packages/ui/` - Master Design System (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`, Culinary Orange `#ff5f1f`, Slate Surface `#f8f9fa`).
- `packages/event-bus/` & `packages/shared/` - Fast Binary Packet Encoding (`encodeBinaryEvent`/`decodeBinaryEvent`) & Offline-First Transaction Delta Sync Engine (`enqueueOfflineDelta`/`flushOfflineQueue`).
- `apps/server/` - Express/Node API backend with HTMX Server-Driven HTML Streaming endpoint `GET /v1/kds/htmx-cards`.
- `apps/pos/` - POS terminal web app with root `CulinaryHeader` and offline delta sync integration.
- `apps/kds/` - Kitchen Display System with root `CulinaryHeader`, station filtering, timer counters, age alert indicators, course hold/fire, and Expediter pass.
- `apps/admin/` - Restaurant admin portal with root `CulinaryHeader` and low-stock par level alerts.
- `apps/web/` - Customer ordering web app with root `CulinaryHeader`.
- `KitchenKit/` (at `c:\Users\User\Documents\KitchenKit`) - KitchenKit KDS integration & recipe blueprints powered by ratio-engine & prep-engine.
- `mcp/` - Standalone MCP tool servers (`Plated` inventory deduction engine and `Post-Pilot` automated postcard coupon loyalty system).

## Milestones & Status
| # | Milestone Name | Scope | Status |
|---|----------------|-------|--------|
| 1 | M1: Design System & Central Hub | `packages/ui`, `apps/pos`, `apps/kds`, `apps/admin`, `apps/web`, `KitchenKit` | PLANNED |
| 2 | M2: Binary Event Protocol & Offline Sync | `packages/event-bus`, `packages/shared` | PLANNED |
| 3 | M3: HTMX KDS Streaming Endpoint | `apps/server/src/routes/kds.ts` | PLANNED |
| 4 | M4: KitchenKit KDS & Recipe Integration | `apps/kds`, `KitchenKit`, ratio-engine, prep-engine, `recipe-mcp`, `prep-mcp` | PLANNED |
| 5 | M5: Plated Inventory & Post-Pilot Loyalty | `mcp/src/` (Plated & Post-Pilot MCP servers) | PLANNED |
| 6 | M6: Full Monorepo Build & E2E Verification | Workspace-wide build (`npx pnpm@9 run build`) and test execution | PLANNED |

## Interface Contracts
- **Binary Event Protocol**: `encodeBinaryEvent(event: WebSocketEvent): Uint8Array` / `decodeBinaryEvent(buffer: Uint8Array): WebSocketEvent`.
- **Offline Delta Sync**: `enqueueOfflineDelta(delta: TransactionDelta): Promise<void>` / `flushOfflineQueue(): Promise<SyncResult>`.
- **HTMX KDS Cards**: `GET /v1/kds/htmx-cards` returns `text/html` fragment containing rendered micro-HTML ticket cards.
- **MCP Servers**: Plated (`deduct_inventory`, `check_par_levels`) and Post-Pilot (`dispatch_coupon`, `check_loyalty_milestone`).
