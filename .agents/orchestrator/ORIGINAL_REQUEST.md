# Original User Request

## Initial Request — 2026-07-24T14:03:54Z

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

## Follow-up — 2026-07-25T06:33:00Z

<USER_REQUEST>
Resume work as Project Orchestrator at c:\Users\User\Documents\CulinaryOS\.agents\orchestrator.
Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, plan.md, and progress.md for current state.
Your parent is c95643aa-c5cd-4868-acdc-fa99d3666ef3 — use this ID for all escalation and status reporting (send_message).

Current State & Progress Summary:
- Implementation complete across R1 to R5 & POS operations (`apps/pos`, `apps/kds`, `apps/web`, `apps/admin`, `mcp`, `@culinaryos/ui`, `@culinaryos/ratio-engine`). Worker Full 1 handoff delivered.
- Architecture review complete with PASS verdict (`teamwork_preview_reviewer_full_1/handoff.md`).
- Functional operations review complete with PASS verdict (`teamwork_preview_reviewer_full_2/handoff.md`).
- Monorepo build `npx pnpm@9 run build` succeeded (11/11 tasks). Test suite `npx pnpm@9 test` succeeded (13/13 test files passed).

Next Steps for Successor (Generation 1):
1. Start your recurring 10-minute heartbeat cron via schedule.
2. Dispatch 2 Challengers (`teamwork_preview_challenger`) to run stress tests, monorepo build verification, and edge case scenarios across all apps & MCP servers.
3. Dispatch 1 Forensic Auditor (`teamwork_preview_auditor`) to execute forensic integrity audit.
4. Perform Gate Check: ensure build clean, 0 reviewer vetoes, challenger pass, and CLEAN forensic audit.
5. Report project completion to Sentinel when all verification passes.
</USER_REQUEST>
