# Original User Request

## 2026-07-24T14:03:54Z

CulinaryOS Ecosystem — an open-source, self-hosted, modular restaurant operating system competing with ToastPOS and Square POS. Features a central orchestrator hub (CulinaryOps) connected to modular micro-apps and MCP extension platforms (KitchenKit KDS, Plated Inventory, RecipeOS Engine, and Post-Pilot Marketing), supporting self-hosted Docker deployments, web-based online ordering, management dashboards, and Electron desktop terminals.

Working directory: c:\Users\User\Documents\CulinaryOS
Integrity mode: benchmark

## Requirements

### R1. Central Orchestrator & Multi-Surface Clients (`CulinaryOps` & `apps/`)
- Maintain a hybrid monorepo + MCP extension architecture where `apps/pos` (CulinaryOps POS), `apps/kds` (KitchenKit KDS), `apps/admin` (Admin Back-Office), and `apps/web` (Online Ordering) operate seamlessly on local LAN via Hono API gateway and Docker Compose (`docker-compose.yml`).
- Electron desktop configuration for standalone terminal hardware deployment, web-based management portals, and native mobile targets.

### R2. KitchenKit KDS & Recipe Blueprint Engine (`apps/kds` & `c:\Users\User\Documents\KitchenKit`)
- Multi-station kitchen ticket display system with real-time station tab filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations), 1-second timer counters, age alert indicators (Green/Yellow/Red), course hold/fire groupings, and an Expediter (Expo) pass view for head chefs.
- Powered by `@culinaryos/ratio-engine` baker's percentage scaling and `prep-engine`.
- Exposes `recipe-mcp` (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`) and `prep-mcp` (`build_shift_prep`, `get_mise_en_place`).

### R3. Plated Automatic Inventory Deduction Engine (`apps/admin` & `mcp/src/inventory-server.ts`)
- Automatic raw ingredient deduction: POS checkout orders trigger RecipeOS recipe ratio scaling, automatically decrementing raw ingredient stock in Plated and triggering low-stock par level alerts on the Admin dashboard.
- Standalone MCP tool server (`Plated`) exposing `get_inventory_levels` and `log_audit_count`.

### R4. Post-Pilot Automated Loyalty Marketing (`mcp/src/post-pilot-server.ts`)
- Automated postcard coupon dispatching triggered when guests hit visit or spending milestones.
- Standalone MCP tool server (`Post-Pilot`) exposing `send_marketing_postcard`.

### R5. Complete Customer Online Ordering & Real-Time Tracker (`apps/web`)
- Full online ordering web application featuring item modifier customizer, cart drawer, checkout (Pickup vs. Delivery toggle, tip selector, order submission), and live order status progress tracker.

## Acceptance Criteria

### Workspace Integrity & Self-Hosting
- [ ] Monorepo package workspace builds cleanly via `npx pnpm@9 run build` with zero TypeScript errors across all packages.
- [ ] Docker Compose stack (`docker-compose.yml`) boots local PostgreSQL/Supabase and Hono API gateway on LAN without port conflicts.

### KDS & POS Operations
- [ ] POS terminal (`apps/pos`) supports PIN lockscreen, dining room table map, quick orders, seat assignments (Seat 1-4), coupon discounts, and Split Check Wizard (even split & split by seat).
- [ ] KDS kitchen board (`apps/kds`) supports station filtering tabs, 1s aging timers, course fire notices, and Expo pass view.

### Automated Inventory & Marketing Integration
- [ ] POS checkout completion automatically decrements ingredient levels in Plated via RecipeOS ratio engine and flags low-stock par warnings.
- [ ] Post-Pilot dispatches postcard marketing coupons upon customer loyalty triggers.

## Follow-up — 2026-07-24T14:09:01Z

User Directive Update: All repos (CulinaryOps, KitchenKit, Plated, RecipeOS, Post-Pilot, ShorelineOps) are installed locally on this device. Proceed with coding and working on these repos in parallel. Ensure all repos are worked on in unison, finalized, ready to deploy, and audited for security risks, logic errors, and UI/UX issues.

