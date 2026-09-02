# CulinaryOS: Architectural Blueprint & AI Agent Onboarding Dossier (v1.2.0)

> **Audience:** AI Coding Assistants (Claude, GPT, Gemini, Cursor, Copilot, Antigravity) & Lead Engineers.  
> **Purpose:** Comprehensive, high-density reference explaining the codebase layout, architectural layers, business logic engines, API routing, state stores, and development guidelines.

---

## 1. Monorepo Identity & Tech Stack

```
Language:             TypeScript 5.x (Strict mode, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
Package Management:   pnpm workspaces (33 workspace projects)
Build Orchestration:  Turborepo (turbo.json)
Backend Framework:    Hono on Node.js 20+ (REST API at :3000)
Frontend Surfaces:    React 18 + Vite (Tailwind CSS, Radix UI primitives, Three.js 3D WebGL)
Marketing Portal:     Next.js 14 App Router (:3001)
Recipe Vault:         Next.js 15 App Router (:5178)
Mobile Companion:     React Native + Expo (mobile/)
AI Layer:             9 Model Context Protocol (MCP) TypeScript servers (mcp/)
Database:             Supabase PostgreSQL with strict Row Level Security (RLS) across V1–V17 migrations
Offline Strategy:     Cryptographically signed transaction delta queues (UUIDv4) + Workbox PWA Service Workers
```

---

## 2. Directory Structure & Surface Map

```
CulinaryOS/
├── apps/
│   ├── server/             # Unified Hono API (:3000) — Auth, Orders, KDS, Pantry, Billing, Ops, Commissary
│   ├── pos/                # POS Terminal (:5172) — 2D/3D Floor Map, Ticket Menu, Hardware Printers, PWA, CFD
│   ├── kds/                # Kitchen Display (:5173) — Station routing, ticket aging, course hold/fire, 140% TV mode
│   ├── admin/              # Back-Office (:5174) — Menu catalog, staff PINs, custom role builder, auto-PO, themes
│   ├── kitchenkit/         # Prep Planner (:5175) — Recipe formulas, yield, batch sizing, adhesive FIFO QR labels
│   ├── web/                # Storefront (:5176) — Online ordering, FDA Top 9 dietary filtering, tableside QR pay
│   ├── ops/                # CulinaryOps (:5177) — Food cost variance (actual vs theo), scrap waste, labor %
│   ├── marketing/          # Marketing Site (:3001) — Next.js 14 SaaS portal (culinaryos.io), pricing, blog, signup
│   ├── desktop/            # Workstation Hub (:5180) — Split-screen workstation manager with F1–F7 hotkeys
│   └── recipeos/           # RecipeOS (:5178) — MIT-licensed free recipe vault, ratio scaling, pantry sync
│
├── packages/               # Isolated Pure Functional Packages (Zero DOM, 100% Unit Tested)
│   ├── accounting-engine/  # Double-entry General Ledger (Debits=Credits), QuickBooks IIF & Xero CSV, P&L
│   ├── commissary-engine/  # Multi-unit replenishment, central batch aggregation, lot codes, franchise royalties
│   ├── forecast-engine/    # Historical demand smoothing, rush bottleneck detection, adaptive safety-stock pars
│   ├── loyalty-engine/     # Points calculation, punch cards, gift card generation/redemption, referrals
│   ├── labor-engine/       # Shift labor hours, role-weighted tip pooling with zero-cent remainder rounding
│   ├── food-cost-engine/   # Actual vs theoretical food cost variance calculations
│   ├── waste-engine/       # Kitchen waste scrap/trim dollar loss calculations
│   ├── ratio-engine/       # Baker's percentages, yield formulas, and batch recipe scaling
│   ├── prep-engine/        # Station prep requirements and scheduling
│   ├── pdf-tools/          # jsPDF generators for Z-Reports, menu printouts, and table QR codes
│   ├── sdk/                # Official @culinaryos/sdk TypeScript client library for third-party consumers
│   ├── shared/             # Canonical schemas, FDA Top 9 dietary engine, offline sync queue, tax calculator
│   ├── ui/                 # Centralized shadcn/ui components, Three.js 3D floorplan canvas, theme presets
│   ├── db/                 # Supabase TypeScript database schemas (V1–V17)
│   ├── auth/               # PIN login, JWT validation, and session management
│   ├── event-bus/          # Typed cross-service pub/sub event contracts
│   └── config/             # Workspace TypeScript base configurations
│
├── mcp/                    # 9 Model Context Protocol servers for Claude/AI agent integration
├── cli/                    # Universal CLI (`culinary`) to operate POS, KDS, Ops, Prep, and System doctor
├── supabase/               # PostgreSQL schema migrations (V1 through V17) + seed data
├── scripts/                # Test runners, Windows tray manager, firewall tools, appliance builders
└── docs/                   # OpenAPI 3.1 spec (openapi.yaml), Mintlify config (mint.json), design guides
```

---

## 3. Pure Functional Business Logic Packages (`packages/*`)

All packages under `packages/` are **pure functional TypeScript modules**. They have no browser DOM or framework dependencies and can run in any environment (Node, browser, Deno, Bun, Cloudflare Workers).

### 1. `@culinaryos/accounting-engine`
- `generateZReportJournalEntry(zReport)`: Converts an end-of-day Z-Report into balanced double-entry accounting debits and credits:
  - **Debits:** Cash on Hand (1010) + CC Clearing (1020) + Comps & Promos (4090) + Cash Shortage (6080).
  - **Credits:** Food Sales (4010) + Alcohol Sales (4020) + Sales Tax Payable (2020) + Cash Overage (4080).
  - *Invariant:* `sum(Debits) === sum(Credits)` to the exact penny.
- `exportToQuickBooksCsv(entries)`: Formats entries into QuickBooks Online IIF CSV.
- `exportToXeroCsv(entries)`: Formats entries into Xero manual journal CSV with tax exemptions.
- `calculateRestaurantPL(input)`: Generates Restaurant P&L metrics (Gross Revenue, COGS, Gross Profit, Labor Cost %, Waste Loss %, Operating Profit Margin %).

### 2. `@culinaryos/commissary-engine`
- `calculateStoreReplenishmentOrder(storeId, storeName, items)`: Computes replenishment orders based on par deficits and case reorder multiples.
- `aggregateCommissaryProduction(requests)`: Consolidates multiple store requests into single master commissary prep batch quotas.
- `generateCommissaryLotCode(productName, date)`: Produces ISO lot codes (e.g. `LOT-20260902-TRUF-4A8F`).
- `calculateFranchiseRoyaltyLedger(input)`: Computes franchise royalty fees (% gross sales) across multi-unit locations.

### 3. `@culinaryos/forecast-engine`
- `forecastDaypartDemand(history, dayOfWeek, daypart, weatherMultiplier)`: Predicts customer order count, projected revenue, and required cook line staffing with confidence scoring.
- `evaluateKitchenBottlenecks(stations)`: Calculates load factors (`active / nominalCapacity`) and emits advisory rush alerts (`normal`, `moderate_delay`, `heavy_rush_throttle`) with suggested prep time padding (+10m to +20m).
- `calculateAdaptiveParLevels(items)`: Generates dynamic safety stock par recommendations based on cooking velocity and supplier lead days.

### 4. `@culinaryos/loyalty-engine`
- `calculatePointsEarned(subtotalCents, rate)`: Calculates points earned per dollar spent.
- `redeemPoints(currentBalance, pointsToRedeem, minThreshold)`: Validates point balances and returns discount cents.
- `recordPunch(currentPunches, targetPunches)`: Advances punch card progress and awards free item credits.
- `generateGiftCardCode()`: Generates standard 16-character alphanumeric gift card tokens.
- `applyGiftCardBalance(balanceCents, chargeCents)`: Calculates partial and full gift card debits.
- `calculateReferralRewards(orderTotalCents)`: Issues dual-sided credits for referral activations.

### 5. `@culinaryos/labor-engine`
- `calculateShiftLabor(punches, hourlyRates)`: Calculates regular and overtime hours.
- `calculateWeightedTipPool(staffHours, totalTipsCents)`: Allocates gratuities based on role weight points (Server = 1.0, Busser = 0.5, Runner = 0.4, Bartender = 0.8) with zero-cent remainder rounding.

### 6. `@culinaryos/shared`
- `ALLERGEN_REGISTRY`: Defines all FDA FASTER Act Top 9 allergens (`milk`, `eggs`, `fish`, `shellfish`, `tree_nuts`, `peanuts`, `wheat`, `soybeans`, `sesame`) with cross-contact risk detection and substitutions.
- `calculateCategorizedTax(items, config)`: Computes item-level taxes for food (8.25%), alcohol (10.0%), and tax-exempt items.
- `OfflineSyncQueue`: Queues local order transactions with UUIDv4 cryptographic IDs and replays them atomically upon reconnection.

---

## 4. Unified API Endpoints (`apps/server`)

The backend is built with **Hono** and mounted in `apps/server/src/index.ts`. All endpoints require the `X-Tenant-Id` header (unless marked Public). In production, Supabase Auth JWTs are verified; in local demo mode, the API operates seamlessly offline.

| Path Prefix | Route File | Primary Endpoints & Operations |
|---|---|---|
| `/v1/auth` | `auth.ts`, `signup.ts` | `POST /pin-login`, `POST /signup` (public onboarding & 14-day trial) |
| `/v1/orders` | `orders.ts` | `POST /`, `GET /`, `GET /:id`, `PATCH /:id/send` (triggers KDS fire) |
| `/v1/kds` | `kds.ts` | `GET /tickets`, `PATCH /tickets/:id/bump`, `POST /tickets/:id/hold-fire` |
| `/v1/billing` | `billing.ts` | `POST /checkout` (Stripe subscription), `POST /webhook`, `POST /portal` |
| `/v1/reservations` | `reservations.ts` | `POST /`, `GET /availability`, `PATCH /:id/status` (seat emit) |
| `/v1/commissary` | `commissary.ts` | `POST /transfers/request`, `PATCH /transfers/:id/fulfill`, `GET /royalty-ledger` |
| `/v1/autopilot` | `autopilot.ts` | `GET /forecast`, `GET /bottleneck-advisory`, `GET /par-suggestions` |
| `/v1/marketplace` | `marketplace.ts` | `GET /extensions`, `POST /extensions/submit`, `GET /extensions/:id/verification` |
| `/v1/reports` | `reports.ts` | `GET /z-report`, `GET /z-report/pdf` (binary stream), `GET /export/csv` |
| `/v1/admin` | `admin.ts` | `GET/POST /roles/custom` (permission builder), `DELETE /account/gdpr-purge` |
| `/v1/tables` | `tables.ts` | `POST /merge`, `POST /split`, `POST /transfer` (PIN-gated), `POST /:id/assistance` |
| `/v1/dayparts` | `dayparts.ts` | `GET /active`, `POST /rules` (scheduled pricing overrides) |
| `/v1/pos` | `pos-sync.ts` | `POST /sync-deltas` (offline transaction batch replay) |
| `/v1/ops` | `ops.ts` | `POST /waste`, `GET /food-cost`, `GET /labor` |
| `/v1/pantry` | `pantry.ts` | `GET /stock`, `POST /deduct`, `POST /purchase-orders` |

---

## 5. Front-of-House UI & State Management (`apps/pos`)

- **Zustand Global State Store (`apps/pos/src/lib/store.ts`):**
  - Manages `view`: `'dashboard' | 'tables' | 'menu' | 'checkout' | 'tabs' | 'staff' | 'recall' | 'settings' | 'reports' | 'cfd'`.
  - Manages `activeOrderId`, `employee` (PIN authenticated session), and `drawerBalance`.
- **Order & Ticket Store (`apps/pos/src/lib/useOrderStore.ts`):**
  - LocalStorage-backed reactive store managing tickets, seats, modifiers, and subtotals.
- **3D Spatial Dining Room Canvas (`FloorMap3D.tsx`):**
  - Three.js WebGL canvas rendering table geometries (`square`, `round`, `rectangle`, `booth`, `bar`, `oval`).
  - Halos indicate live status: Green = Available, Orange = Occupied, Purple = Reserved, Red = Dirty.
- **Universal Customer-Facing Display (`CFDView.tsx`):**
  - Dual-screen / guest tablet mode. Real-time cart reflection, tip calculation (15/18/20/25%), and Stripe Terminal payment reader animations.

---

## 6. Database & RLS Architecture (`supabase/migrations/`)

Every table in Supabase PostgreSQL uses Row Level Security (RLS) to enforce strict multi-tenant isolation. Queries without tenant context fail closed.

- `V1`–`V6`: Core tables (`restaurants`, `menu_categories`, `menu_items`, `pos_orders`, `order_line_items`, `kitchen_tickets`, `inventory_items`).
- `V11`: Station routing and printer device mappings.
- `V14`: `SECURITY DEFINER` auth helper functions (`my_tenant_id()`, `my_role()`), `staff_pins`, `waste_events`, `plate_economics`.
- `V16`: `subscriptions` (Stripe SaaS tier, trialing status, period ends) and `reservations` (guest booking, party size, table assignment).
- `V17`: `organizations` (franchise brand parent), `commissary_orders`, and `commissary_order_items` (lot codes, quantities shipped/received).

---

## 7. Universal CLI Tool (`cli/`)

CulinaryOS includes a compiled operator CLI (`culinary`) that interfaces directly with the system:

```bash
# POS Operations
culinary pos list                              # View active orders
culinary pos seat <tableId> --covers <n>       # Seat guests
culinary pos fire <tableId> [items...]         # Fire order to kitchen
culinary pos merge <target> <sources...>       # Merge tables
culinary pos void <orderId> <itemId> <pin>     # Void item with manager PIN
culinary pos pay <orderId> --method <card|tap> # Settle payment

# Kitchen Operations
culinary kds list                              # View tickets & aging timers
culinary kds bump <ticketId> --station <expo>  # Bump ticket
culinary kds fire-course <orderId> <courseNo>  # Fire held course
culinary kds 86 <itemId> [count]               # Set 86 countdown

# Operations & Prep
culinary ops waste <itemId> <qty> <reason>     # Log kitchen scrap/waste
culinary ops food-cost                         # Query actual vs theo food cost
culinary prep scale <recipe> --factor <n>      # Scale batch recipe
culinary prep label <dish> --shelfLife <hrs>   # Print adhesive FIFO QR label

# System Diagnostics
culinary system doctor                         # Port scan & health diagnostics
culinary system heal                           # Port self-healing
```

---

## 8. Development & Coding Rules for AI Assistants

When modifying this repository, any assisting LLM must adhere to these rules:

1. **Monorepo Discipline:** Place code in the appropriate package. Never create arbitrary files at the root level.
2. **Pure Business Logic:** Computational algorithms (costing, margins, accounting, taxes, loyalty, forecasting) belong in `packages/*` as pure functions with 100% unit test coverage.
3. **Tenant Scoping:** All database queries must be scoped to `tenant_id` or `my_tenant_id()`. Unscoped queries are critical security violations.
4. **Offline Resilience:** POS and KDS must boot and operate with zero database or network connectivity (degraded demo mode).
5. **Exact Optional Properties:** The codebase enforces `exactOptionalPropertyTypes: true`. Optional properties cannot accept `undefined` unless explicitly declared as `key?: type | undefined;`.
6. **Strict Verification Commands:**
   - Typecheck verification: `pnpm run typecheck` (all 46 tasks must pass).
   - Test suite verification: `node ./scripts/run-all-tests.cjs` (all 102+ test files must pass).
