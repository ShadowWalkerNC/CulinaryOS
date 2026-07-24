# Project: CulinaryOS Ecosystem

## Architecture
- Central Orchestrator & API Gateway: Hono API gateway running in Docker (`docker-compose.yml`) connected to Supabase PostgreSQL database.
- Monorepo structure using `pnpm` workspaces + `turbo`.
- Modular Applications (`apps/`):
  - `apps/pos`: CulinaryOps POS terminal (PIN lock, table map, quick orders, seats 1-4, coupon discounts, Split Check Wizard).
  - `apps/kds`: KitchenKit KDS board (station filters: Hot Grill, Cold Prep, Fryer, Bar, All; 1s timers, Green/Yellow/Red age alerts, course fire/hold, Expo pass view).
  - `apps/admin`: Admin Back-Office (inventory par level alerts, stock management).
  - `apps/web`: Online Ordering (item modifier customizer, cart drawer, checkout, live status order tracker).
- MCP Tool Servers (`mcp/`):
  - `mcp/src/inventory-server.ts`: Plated Inventory MCP (`get_inventory_levels`, `log_audit_count`).
  - `mcp/src/post-pilot-server.ts`: Post-Pilot Marketing MCP (`send_marketing_postcard`).
  - `@culinaryos/ratio-engine` and `prep-engine`: Baker's percentage recipe scaling and shift prep.
  - `recipe-mcp` (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`).
  - `prep-mcp` (`build_shift_prep`, `get_mise_en_place`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Workspace Integrity & Core Infra | Monorepo setup, pnpm build clean, docker-compose configuration, shared types & packages | None | IN_PROGRESS |
| 2 | KitchenKit KDS & Recipe Blueprint Engine | apps/kds, KitchenKit integration, @culinaryos/ratio-engine, prep-engine, recipe-mcp, prep-mcp | M1 | PLANNED |
| 3 | POS Operations & Terminals | apps/pos, PIN lock, table map, quick orders, seat assignments, coupons, Split Check Wizard | M1 | PLANNED |
| 4 | Plated Inventory & Post-Pilot Marketing | apps/admin, automatic ingredient deduction on checkout, par warnings, Plated MCP server, Post-Pilot MCP server | M1, M2, M3 | PLANNED |
| 5 | Online Ordering & Real-Time Tracker | apps/web, item modifiers, cart drawer, checkout (Pickup/Delivery, tips, submission), live status tracker | M1 | PLANNED |
| 6 | E2E Integration & Verification Hardening | End-to-end flow from web/pos -> backend -> kds -> inventory -> marketing; adversarial tests & forensic audit | M1-M5 | PLANNED |

## Interface Contracts
### POS ↔ Backend / API Gateway
- `POST /api/pos/orders`: Submit new POS order with items, seat numbers (1-4), applied coupons, discount amounts.
- `POST /api/pos/checkout`: Complete POS checkout, process payment, emit `ORDER_COMPLETED` event.
- `POST /api/pos/split-check`: Handle split checks (even split or split by seat).

### POS ↔ KDS (WebSocket & Events)
- Event `ORDER_CREATED` / `ORDER_UPDATED`: Transmits order ticket details (items, course, station tags, table, seats) to KDS server.
- Event `TICKET_STATUS_CHANGE`: Fired when KDS marks item/ticket status (e.g. hold, fire, in-prep, completed, expod).

### POS ↔ Plated Inventory & Recipe Ratio Engine
- Event `ORDER_COMPLETED`: Triggers `@culinaryos/ratio-engine` scaling for each ordered item's recipe ingredients, decrementing inventory levels in Plated DB/store, triggering `PAR_LEVEL_ALERT` if level < par_threshold.

### POS ↔ Post-Pilot Marketing
- Event `ORDER_COMPLETED`: Evaluates customer total spend & visit count. If milestone threshold hit, calls `send_marketing_postcard` on Post-Pilot MCP server.

## Code Layout
- `apps/pos`: POS terminal client and components.
- `apps/kds`: Kitchen Display System client and components.
- `apps/admin`: Admin dashboard for management & inventory alerts.
- `apps/web`: Online ordering customer web app.
- `mcp/`: MCP tool servers (`inventory-server.ts`, `post-pilot-server.ts`, etc.).
- `packages/`: Shared libraries (`ratio-engine`, `prep-engine`, `shared-types`, UI primitives).
- `docker-compose.yml`: Services configuration for local LAN deployment.
