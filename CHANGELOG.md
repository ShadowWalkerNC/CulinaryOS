# Changelog

All notable changes to CulinaryOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-09-02: Enterprise Multi-Unit Commissary, AI Autopilot, Developer Marketplace & Universal CFD

### Added
- **Enterprise Multi-Unit & Commissary Hub (`@culinaryos/commissary-engine`):**
  - Two-tier organization hierarchy migration (`V17__multi_unit_commissary.sql`) supporting enterprise brands, parent commissary facilities, and branch stores.
  - Inter-store stock transfer requisition math, central commissary batch quota aggregation, structured ISO lot tracking codes, and consolidated franchise royalty ledgers.
  - Endpoints: `POST /v1/commissary/transfers/request`, `PATCH /v1/commissary/transfers/:id/fulfill`, `PATCH /v1/commissary/transfers/:id/receive`, and `GET /v1/commissary/royalty-ledger`.
- **AI Kitchen Autopilot & Predictive Operations (`@culinaryos/forecast-engine`):**
  - Historical daypart demand smoothing with weather/surge multipliers and cook staffing recommendations.
  - Real-time kitchen station queue depth evaluation emitting advisory bottleneck alerts and prep padding estimates (+10m/+20m).
  - Adaptive safety-stock par level recommendations balancing usage velocity against supplier lead times.
  - Endpoints: `GET /v1/autopilot/forecast`, `GET /v1/autopilot/bottleneck-advisory`, and `GET /v1/autopilot/par-suggestions`.
- **Zero-Fee Developer Marketplace & Paid Verification (`apps/server/src/routes/marketplace.ts`):**
  - 100% developer revenue share model for 3rd-party extensions.
  - Developer registration endpoint (`POST /v1/marketplace/extensions/submit`) and verified security badge status inspection (`GET /v1/marketplace/extensions/:id/verification`).
- **Universal Customer-Facing Display (CFD) (`apps/pos/src/views/CFDView.tsx`):**
  - Responsive guest checkout screen operable on secondary monitors (HDMI/USB) or standalone Wi-Fi tablets.
  - Real-time cart synchronization, interactive tip selection (15%, 18%, 20%, 25%, Custom), and Stripe Terminal contactless payment reader prompt.
- **Turnkey Linux POS & KDS Appliance Builder (`scripts/build-appliance-image.sh`):**
  - Shell installer generating high-availability Debian/Raspberry Pi appliance images with systemd auto-restart, Openbox kiosk auto-start, and mDNS discovery.

---

## [1.1.0] — 2026-09-02: Cloud SaaS Foundation, Developer Platform & Universal Ledger

### Added
- **CulinaryOS.io Next.js 14 Marketing Portal (`apps/marketing`):**
  - High-conversion landing page, pricing tiers (Starter, Pro, Enterprise), interactive features matrix, blog, RecipeOS spotlight, and self-service trial onboarding.
- **SaaS Stripe Billing & Customer Portal (`apps/server/src/routes/billing.ts`):**
  - Self-service subscription checkout sessions, webhook handlers with signature validation, customer portal, and tenant-scoped trial provisioning.
- **In-House Table Reservations Engine (`apps/server/src/routes/reservations.ts`):**
  - Time-slot availability calculations, capacity limits, and table seating dispatch.
- **Official TypeScript Client SDK (`packages/sdk`):**
  - Published `@culinaryos/sdk` package with typed methods for orders, KDS, reservations, billing, and reports.
- **Full Accounting & General Ledger Engine (`packages/accounting-engine`):**
  - Double-entry Journal Entry generator for daily Z-Reports, QuickBooks Online IIF export, Xero CSV export, and restaurant P&L economic margin metrics.
- **Customer Loyalty Engine (`packages/loyalty-engine`):**
  - Points calculation, punch cards, gift card code generation and balance redemption, dual-sided referral credits, and VIP tiers.
- **Print-Ready Z-Report PDF & CSV Ledger Stream (`packages/pdf-tools` & `apps/server`):**
  - `GET /v1/reports/z-report/pdf` and `GET /v1/reports/export/csv`.
- **Custom Staff Role Builder & GDPR Compliance (`apps/server/src/routes/admin.ts`):**
  - Matrix permission configuration with 8 granular toggles and tenant-scoped right-to-erasure account data purge.
- **OpenAPI 3.1.0 Spec & Mintlify Docs Configuration:**
  - Added [`docs/openapi.yaml`](docs/openapi.yaml) and [`mint.json`](mint.json) for `docs.culinaryos.io`.
- **Tablet & Handheld PWA Offline Precaching:**
  - Converted POS and KDS apps to installable PWAs with Workbox service workers and web manifests.

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
