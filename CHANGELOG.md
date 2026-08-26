# Changelog

All notable changes to CulinaryOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Multi-tenant production hardening
- Extension marketplace public launch
- `pnpm lint` ESLint configuration across all packages
- Bun test suite unification

---

## [1.0.0] — 2026-08-25: Production-Ready "Linux for Restaurants" Release


### Added
- **Canonical shadcn/ui Component Suite (`@culinaryos/ui`):**
  - Integrated `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, and full Radix UI primitives.
  - Added official [`components.json`](packages/ui/components.json) configuration.
  - Created accessible primitives: `Button` (`asChild` Slot support), `Card`, `Badge` (live pulse glow), `Input`, `Label`, `Dialog`, `DropdownMenu`, `Tabs`, `Table`, `Select`, `Switch`, `Checkbox`, `Tooltip`, `Popover`, `Separator`, `Skeleton`.
  - Modernized HSL CSS design tokens in `culinary-theme.css` and `tailwind.preset.js`.

- **Interactive Three.js 3D Spatial Floor Map (`FloorMap3D.tsx`):**
  - WebGL 3D dining room canvas with custom table geometry (`square`, `round`, `rectangle`, `booth`, `bar`, `oval` VIP).
  - Real-time status glow halos: 🟢 Available, 🟠 Occupied (with live check amount), 🟣 Reserved, 🔴 Dirty / Bus.
  - Orbit camera navigation (drag rotate, zoom, perspective reset) and raycasted hover tooltips + click-to-open order actions.
  - Integrated seamlessly into POS terminal ([`TablesView.tsx`](apps/pos/src/views/TablesView.tsx)) with 2D/3D toggle.

- **FDA FASTER Act Top 9 Dietary & Allergen Safety Engine (`packages/shared/src/dietary.ts`):**
  - Complete definitions and normalization for `milk`, `eggs`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `wheat`, `soybeans`, `sesame`.
  - Automated dietary preference deduction (`isVegan`, `isVegetarian`, `isPescatarian`, `isGlutenFree`, `isDairyFree`, `isNutFree`).
  - Cross-contact risk matrix detecting shared deep fryers, shared griddles, and bread toasters.
  - Pre-mapped culinary substitution pathways (e.g. Oat Milk, Gluten-Free Buns, Tamari).

- **AI Restaurant Operations Manager & Consultant Framework:**
  - Registered `operations_consultant` subagent embodying a dual Executive Chef / Restaurant General Manager perspective.
  - Daily audit runner ([`scripts/daily-ops-consultant.ts`](scripts/daily-ops-consultant.ts) / `pnpm ops:audit`) evaluating speed-of-service, touchscreen ergonomics, KDS pacing, and dietary safety.
  - Operational handbook and daily inquiry repository ([`docs/OPERATIONS_CONSULTANT_FRAMEWORK.md`](docs/OPERATIONS_CONSULTANT_FRAMEWORK.md)) and report generator ([`docs/DAILY_OPERATIONS_REPORT.md`](docs/DAILY_OPERATIONS_REPORT.md)).
  - Standing daily recurring cron schedule (`0 9 * * *`).

- **Multi-Tender POS Checkout:**
  - Support for Card (Stripe Elements), Contactless Tap to Pay (📱 Apple / Google Pay / NFC), Scan to Pay (📷 QR Code), Cash with change math, and Comp.

- **Monorepo Quality Gates:**
  - 32/32 passing test suites (`node ./scripts/run-all-tests.cjs`).
  - 18/18 passing Turborepo typecheck tasks.
  - Preflight production readiness diagnostics tool (`pnpm doctor`).

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

## [0.2.0] — Phase 1: Auth & Tenant Shell — 2026-06-19

### Added
- `V2__auth_tenant.sql` — organizations, restaurants (with `timezone`), users (RBAC check constraint), refresh_tokens (single-use, hash-only)
- `AuthService` — BCrypt password hashing (cost 12), JWT issue (15-min), SHA-256 hashed refresh token rotation (7-day, single-use)
- `AuthRepository` — full CRUD for all auth tables, single-use token consume
- `AuthRoutes` — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`

---

## [0.1.0] — Phase 0: Foundation — 2026-06-19

### Added
- Monorepo foundation with Turborepo, pnpm workspaces, and PostgreSQL Supabase schema baseline.
- `CulinaryEvent` universal event envelope and offline transaction delta sync engine.
