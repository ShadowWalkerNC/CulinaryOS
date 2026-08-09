# Changelog

All notable changes to CulinaryOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Fixed
- **POS → KDS integration spine:** `useFireOrder` now calls `PATCH /v1/orders/:id/send` instead of mutating `pos_orders` directly, so kitchen tickets are created.
- **Demo mode bridge:** Shared in-memory mock kitchen store + KDS API polling so POS fires appear on KDS without Supabase.
- **Event payload:** `pos:order:created` includes `lineItemId` / `createdAt`; order send uses in-process event broker.
- **Pantry deduct:** `pos:menu:item-sold` targets unified `CULINARYOS_URL/v1/pantry/deduct` (RecipeOS process removed).
- **CI / Docker / Render:** Workflows and deploy configs retargeted to `apps/*` (legacy root Dockerfiles deprecated).

### Added
- `apps/server/src/lib/mock-kitchen.ts`, `docs/integration-spine.md`, `supabase/config.toml`, `supabase/seeds/base_tenant.sql`, `scripts/seed.ts`, POS→KDS fire tests.

---

## [0.3.0] — Phase 3: Monorepo Integration & Complete Ecosystem — 2026-07-24

### Added
- **CulinaryOps POS Terminal (`apps/pos`):**
  - Square/Toast light-mode UI theme refactor.
  - PIN lockscreen (`StaffView.tsx`) with employee shift tracking (`1234` Server / `5678` Manager).
  - Interactive Toast-style Home Dashboard (`DashboardView.tsx`) with Quick Order, Table Service, Bar Tabs, and Recall history.
  - Bar Tabs manager (`TabsView.tsx`) with Visa card pre-authorizations.
  - Check Recall History (`RecallView.tsx`) with itemized ticket details, guest check reprints, and refund manager.
  - Terminal Settings (`SettingsView.tsx`) for Stripe reader pairing and KDS item routing.
  - Promo & Discount Engine (`OrderView.tsx`) supporting 10% Senior Discounts and $5.00 Off coupons.
  - Global Menu Search Bar (`MenuView.tsx`) for multi-category searches.
  - Seat Assignment Selector (`MenuView.tsx` & `OrderView.tsx`) tagging items to Seat 1-4.
  - Split Checks Wizard (`CheckoutView.tsx`) supporting 2-way, 3-way, 4-way even splits and seat-by-seat checks.
  - Stripe Terminal simulator overlay (Success, Decline, Timeout states) and virtual thermal receipt tape roll with browser print.
  - Cash Drawer Audit & Declaration modal for bill counts ($1, $5, $10, $20) and discrepancy reconciliation.
  - Business Sales Reports (`ReportsView.tsx`) showing PM Mix product sales and net revenue.

- **KitchenKit KDS Terminal (`apps/kds`):**
  - Station navigation tabs (Hot Grill, Cold Prep, Fryer, Bar, All Stations).
  - 1-second continuous timer resolution with color-coded aging alert badges (Green <5m, Yellow 5-10m, Red >10m).
  - Offline interactive demo ticket queue.

- **Admin Back-Office (`apps/admin`):**
  - Live Operations Dashboard, Menu Builder & Price Manager, Staff Roster & PIN Manager, Pantry Audits.

- **Customer Online Ordering (`apps/web`):**
  - Item Customizer modal, Cart drawer, Checkout page (Pickup vs. Delivery toggle, tip selector), and live order status tracker.

- **Unified CulinaryOS UI/UX (`packages/ui`):**
  - Standardized `CulinaryHeader` component across all 4 applications.
  - Mounted `CulinaryHeader` on POS PIN Lockscreen (`StaffView.tsx`).
  - Configured default port mappings: POS (`:5172`), KDS (`:5173`), Admin (`:5174`), Web (`:5176`).
  - Linked `@culinaryos/ratio-engine` workspace package to `mcp/package.json` with compiled `.d.ts` path definitions in `mcp/tsconfig.json`.

---

## [Unreleased] — Phase 2: POS Core

### Planned
- `V3__pos_core.sql` — menu items, modifiers, tables, orders, order lines
- Offline sync engine — background coroutine draining local event queue
- POS UI — Compose Multiplatform table grid, menu browser, order send
- Receipt number generation (`RCP-YYYY-NNNN`)

---

## [0.2.0] — Phase 1: Auth & Tenant Shell — 2026-06-19

### Added
- `V2__auth_tenant.sql` — organizations, restaurants (with `timezone`), users (RBAC check constraint), refresh_tokens (single-use, hash-only)
- `AuthService` — BCrypt password hashing (cost 12), JWT issue (15-min), SHA-256 hashed refresh token rotation (7-day, single-use)
- `AuthRepository` — full CRUD for all auth tables, single-use token consume
- `AuthRoutes` — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `Auth.kt` Ktor plugin — JWT validation + `call.restaurantId()` tenant isolation extension
- `Role` enum with `canAccess()` hierarchy — owner > manager > server/cook/cashier
- `AuthTest` — 6 integration tests covering register, duplicate email (409), login, wrong password (403), /me with token, /me without token (401)

---

## [0.1.0] — Phase 0: Foundation — 2026-06-19

### Added
- KMP Gradle project — 5 modules: `:shared`, `:backend`, `:pos-client`, `:kds-client`, `:admin-client`
- Ktor backend — `/health` endpoint returning `{status:"ok",version:"0.1.0"}`
- PostgreSQL + Flyway — `V1__baseline.sql` no-op baseline
- SQLDelight `LocalEventQueue.sq` — offline event queue schema with typed queries
- `CulinaryEvent.kt` — universal event envelope + all `EventType` constants
- `docker-compose.yml` — one-command local dev environment
- `.env.example` — all env vars documented
- `CONTRIBUTING.md` — branch strategy, commit format, PR checklist, phase gate rule
- `.github/workflows/build.yml` — CI: build + test on every push/PR to main
- `docs/sync-protocol.md` — full event sync specification
- `docs/api/auth-v1.yaml` — OpenAPI spec for Phase 1 endpoints
- `docs/domain-model.md` v1.1 — added timezone, receiptNumber, firedAt, tenderAmount
