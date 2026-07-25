# Original User Request

## Initial Request — 2026-07-25T06:26:45-04:00

<USER_REQUEST>
CulinaryOS Master Ecosystem — a unified open-source, self-hosted restaurant operating system platform (competing with ToastPOS and Square POS). CulinaryOS serves as the main UI/UX orchestrator hub pulling in all connected micro-apps, tools, and MCP servers (KitchenKit, Plated, RecipeOS, Post-Pilot, ShorelineOps) into a single cohesive design system and REST/WebSocket API layer across local repositories.

Working directory: c:\Users\User\Documents\CulinaryOS
Integrity mode: benchmark

## Requirements

### R1. Central Hub & Master Design System (`CulinaryOps` & `packages/ui`)
- CulinaryOS (`c:\Users\User\Documents\CulinaryOS`) serves as the primary master UI/UX hub.
- All connected applications (`apps/pos`, `apps/kds`, `apps/admin`, `apps/web`, and standalone `KitchenKit` at `c:\Users\User\Documents\KitchenKit`) share the exact same design system primitives (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`), typography, and color tokens (`#ff5f1f` Culinary Orange, `#f8f9fa` Slate Surface).

### R2. Parallel Workspace Synchronization & Local Storage
- Work on all local repositories in parallel without external desktop app dependencies.
- Ensure cross-repository imports and package links (`@culinaryos/ui`, `@culinaryos/ratio-engine`, `@culinaryos/config`, `@culinaryos/auth`) resolve cleanly in Turborepo workspaces.

### R3. KitchenKit KDS & Recipe Blueprint Integration (`apps/kds` & `KitchenKit`)
- Multi-station kitchen ticket display system with real-time station tab filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations), 1-second timer counters, age alert indicators (Green/Yellow/Red), course hold/fire groupings, and an Expediter (Expo) pass view for head chefs.
- Powered by `@culinaryos/ratio-engine` baker's percentage scaling and `prep-engine`.
- Exposes `recipe-mcp` (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`) and `prep-mcp` (`build_shift_prep`, `get_mise_en_place`).

### R4. Plated Automatic Inventory Deduction Engine (`apps/admin` & `mcp/src/inventory-server.ts`)
- Automatic raw ingredient deduction: POS checkout orders trigger RecipeOS recipe ratio scaling, automatically decrementing raw ingredient stock in Plated and triggering low-stock par level alerts on the Admin dashboard.
- Standalone MCP tool server (`Plated`) exposing `get_inventory_levels` and `log_audit_count`.

### R5. Post-Pilot Automated Loyalty Marketing (`mcp/src/post-pilot-server.ts`)
- Automated postcard coupon dispatching triggered when guests hit visit or spending milestones.
- Standalone MCP tool server (`Post-Pilot`) exposing `send_marketing_postcard`.

## Acceptance Criteria

### Master Hub Integrity & Design System
- [ ] CulinaryOS Hub (`CulinaryHeader`) is mounted at the root of every app (`POS`, `KDS`, `Web`, `Admin`), rendering active module highlights and port indicators.
- [ ] Monorepo build passes cleanly via `npx pnpm@9 run build` with zero TypeScript errors across all 14 workspace packages (`FULL TURBO`).

### Multi-App Operations
- [ ] POS terminal (`apps/pos`) supports PIN lockscreen, dining room table map, quick orders, seat assignments (Seat 1-4), coupon discounts, and Split Check Wizard (even split & split by seat).
- [ ] KDS kitchen board (`apps/kds`) supports station filtering tabs, 1s aging timers, course fire notices, and Expo pass view.
- [ ] Web online ordering (`apps/web`) supports menu category browsing, customizer modal, cart drawer, and checkout.
- [ ] Admin back-office (`apps/admin`) supports live sales dashboard, menu builder, staff roster, and pantry audits.
</USER_REQUEST>
