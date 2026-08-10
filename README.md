# CulinaryOS

> **AI-Native Multi-Tenant Restaurant OS** — POS · KDS · Inventory · Staff · MCP Extension Platform  
> TypeScript · React 18 · Node.js / Express · Supabase · Turborepo · pnpm · MIT License

![Phase](https://img.shields.io/badge/phase-v0.3.0%20%E2%80%94%20Monorepo%20Ecosystem-brightgreen)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## 🎯 What It Is & The Core Mission

CulinaryOS is an **AI-native SaaS restaurant operating system**. Built in a web-first monorepo model, React-based applications run seamlessly on any tablet, kitchen display monitor, or browser without native app installation.

### 🌟 The Core Differentiator: The Ratio Blueprint Engine
Every traditional POS models menu items as fixed numeric ingredients (e.g. 500g flour). **CulinaryOS stores mathematical ratio relationships** via the `@culinaryos/ratio-engine` package:
- Baker's percentages (`flour: 1.0`, `water: 0.68`, `salt: 0.02`, `yeast: 0.01`).
- Dynamic batch scaling based on expected cover counts.
- Exact monetary food cost projections and sub-recipe substitutions.
- Direct AI agent tool integration via MCP (`mcp/recipe-server.ts`).

---

## 🏛️ Repository Architecture

```
CulinaryOS/
├── apps/                         # Frontends & API Gateway
│   ├── admin/                    # Back-office admin portal (:5174)
│   ├── kds/                      # Kitchen Display System terminal (:5173)
│   ├── pos/                      # Point of Sale tablet terminal (:5172)
│   ├── server/                   # Core Node.js API Gateway & WebSocket Server (:3000)
│   └── web/                      # Customer online ordering storefront (:5176)
│
├── packages/                     # Shared Internal Workspace Packages
│   ├── auth/                     # Supabase Auth, RBAC middleware, JWT helpers
│   ├── config/                   # Global env schemas, constants, port mappings
│   ├── db/                       # Supabase client, query builders, RLS helpers
│   ├── event-bus/                # Binary event protocol & client/server event hub
│   ├── ratio-engine/             # Baker percentage & recipe scaling engine
│   ├── shared/                   # Cross-package TypeScript interfaces & types
│   └── ui/                       # Unified CulinaryOS design system (@culinaryos/ui)
│
├── mcp/                          # Domain-Split MCP Servers (AI Agent Layer)
│   ├── inventory-server.ts       # Plated inventory & pantry tool interface
│   ├── prep-server.ts            # KitchenKit prep engine & mise-en-place tools
│   ├── recipe-server.ts          # RecipeOS scaling & ratio blueprint tools
│   └── post-pilot-server.ts      # Customer loyalty & promotion tools
│
├── extensions/                   # First-Party MCP Extensions (extension_template/)
├── supabase/                     # 16 Sequential Migrations + RLS Security Policies
├── cli/                          # Operator CLI tool (`culinary-cli`)
└── mobile/                       # React Native / Expo companion app
```

---

## 🔌 Connected Satellite Ecosystem

CulinaryOS acts as the central hub bridging 5 specialized food service repositories via `mcp/` and `extensions/`:

1. **CulinaryOps** → Labor scheduling, food-cost %, vendor POs, waste logging (`culinaryops-mcp`). ([repo](https://github.com/ShadowWalkerNC/CulinaryOps))
2. **KitchenKit** → KDS station pass, ticket aging alerts, course hold/fire rules.
3. **Plated** → Pantry stock management, purchase order state machine, auto-POs.
4. **Post-Pilot** → Customer loyalty, $5 coupons, 10% senior discounts, promo engine.
5. **RecipeOS** → Recipe scaling bridge, ratio blueprints, yield conversion.


---

## ⚡ Quickstart — Installation & Local Setup

CulinaryOS is configured for standard monorepo installation using `pnpm` and `Turborepo`.

### Prerequisites
- **Node.js**: `v20.x` or later
- **pnpm**: `v9.x` or later (`npm i -g pnpm`)

### 1. Clone & Install
```bash
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Build & Test
```bash
# Compile all 12 monorepo packages & applications
pnpm run build

# Run all 23 automated test suites
node ./scripts/run-all-tests.cjs
```

### 4. Run Development Servers Locally
```bash
# Starts all 5 applications in hot-reloading dev mode
pnpm dev
```

### 🌐 Local Application Endpoints

| Service | Workspace | Port | Description |
|---|---|---|---|
| **POS Terminal** | `apps/pos` | **[http://localhost:5172](http://localhost:5172)** | Square/Toast POS interface (Bar tabs, split checks) |
| **KDS Kitchen** | `apps/kds` | **[http://localhost:5173](http://localhost:5173)** | Kitchen Display System (Station pass, aging timers) |
| **Admin Back-Office** | `apps/admin` | **[http://localhost:5174](http://localhost:5174)** | Pantry, menu price manager, staff roster |
| **Web Storefront** | `apps/web` | **[http://localhost:5176](http://localhost:5176)** | Online ordering, cart, checkout & order status |
| **Core API Backend** | `apps/server` | **[http://localhost:3000](http://localhost:3000)** | Express & WebSocket server |

---

## 🚀 Live Demo & Cloud Deployment (Vercel & Render)

CulinaryOS supports instant zero-config cloud deployments for evaluation and live demos.

### Option A: Vercel Deployment (Instant Web Demo)
The repository includes a root `vercel.json` configured for monorepo static builds and serverless API routing.

1. Import your CulinaryOS fork into your [Vercel Dashboard](https://vercel.com).
2. Set the **Framework Preset** to `Vite`.
3. Set **Build Command**: `pnpm run build`.
4. Deploy — Vercel will host the public storefront and frontends statically with serverless function routing for `/api`.

### Option B: One-Command Docker Compose (Self-Hosted)
To run the complete isolated stack (including local PostgreSQL & Redis) with Docker:
```bash
docker-compose up --build
```

---

## 🏛️ Architecture & Workspace Map

```
┌──────────────────────────────────────────────────────────────────┐
│                   pnpm Monorepo (Turborepo)                      │
│                                                                  │
│  apps/pos       apps/kds      apps/admin      apps/web           │
│  POS tablet     KDS display   Back office     Public store       │
│  :5172          :5173         :5174           :5176              │
│       └─────────────┴──────────────┴──────────────┘             │
│                             │                                    │
│              apps/server   (Node 20 · Express / WS · :3000)      │
│                             │                                    │
│  packages/                                                       │
│    @culinaryos/db           Supabase client + generated types    │
│    @culinaryos/event-bus    Binary buffer event protocol         │
│    @culinaryos/ui           Shared React design system           │
│    @culinaryos/shared       Shared types + utilities             │
│    @culinaryos/auth         Auth context + session helpers       │
│    @culinaryos/ratio-engine Ratio Blueprint Engine ← THE thing   │
│    @culinaryos/config       Env schema, constants, feature flags │
│                             │                                    │
│         Supabase  (PostgreSQL · Realtime · Auth · RLS)           │
└──────────────────────────────────────────────────────────────────┘

mcp/              → Domain MCP servers  (TypeScript · @modelcontextprotocol/sdk)
mobile/           → Android companion   (Kotlin · Jetpack Compose)
supabase/         → 16 Sequential Migrations + Edge Functions
```

---

## 📊 Feature Status & Test Coverage

- ✅ **Monorepo Compilation**: 12/12 successful build targets.
- ✅ **Test Verification**: 23/23 passing test suites (`node ./scripts/run-all-tests.cjs`).
- ✅ **Unified Design System**: Universal Toast/Square light design tokens across all 4 frontend applications.
- ✅ **MCP Extension Bridges**: Connected satellite integrations for `CulinaryOps`, `KitchenKit`, `Plated`, `Post-Pilot`, and `RecipeOS`.


### Phase 1 — Database Foundation
| Item | Status |
|---|---|
| Supabase V1–V12 migrations | ✅ Done |
| `packages/db` — Supabase client singleton + generated types | 📋 Planned |
| `packages/auth` — full Supabase session management | 📋 Planned |

### Phase 2 — API Gateway
| Item | Status |
|---|---|
| Hono server + CORS + auth middleware + `/health` | ✅ Done (`backend/` → migrate to `apps/server/`) |
| `GET /v1/kds/stations/:id/analytics` | ✅ Done |
| `GET\|POST\|PATCH\|DELETE /v1/pantry/**` | ✅ Done |
| `GET /v1/reports/eod`, `GET /v1/reports/range` | ✅ Done |
| `POST\|GET /v1/payments/**` — file exists, **not mounted** | 🔨 In progress |
| `GET /v1/menu/**` — file exists, **not mounted** | 🔨 In progress |
| `POST\|GET\|PATCH /v1/online-orders/**` — stubs, **not mounted** | 📋 Planned |
| `POST\|GET\|PATCH /v1/pos/orders/**` — not yet written | 📋 Planned |

### Phase 3 — POS Core
| Item | Status |
|---|---|
| `apps/pos` — order flow, line items, send-to-kitchen | 🔨 In progress |
| CheckoutDrawer (Stripe Elements) | 🔨 In progress |
| Tenant registration flow (prerequisite for POS) | 📋 Planned |
| Course hold UI | 📋 Planned |

### Phase 4 — KDS
| Item | Status |
|---|---|
| `apps/kds` — StationPage, TicketCard, BumpButton, CourseHoldBanner, AnalyticsBar | ✅ Done |
| Course engine — `initialHoldStatus`, `checkAndAdvanceCourse`, `manualFireCourse` | ✅ Done |
| Supabase Realtime subscription | ✅ Done |

### Phase 5 — Payments
| Item | Status |
|---|---|
| `payments.ts` route — checkout, capture, refund | 🔨 In progress (not mounted) |
| Mount in `apps/server/src/index.ts` + integration test | 📋 Planned |
| Resend receipt Edge Function | 📋 Planned |

### Phase 6 — Inventory & Pantry
| Item | Status |
|---|---|
| V7–V9 migrations (`ingredients`, `pantry_ledger`, POs) | ✅ Done |
| Pantry API routes (all PO lifecycle) | ✅ Done |
| `apps/admin` — PO panel, pantry alerts, event log | ✅ Done |
| `packages/ratio-engine` — Ratio Blueprint Engine | ✅ Done |

### Phase 7 — Admin & Reporting
| Item | Status |
|---|---|
| Reports API — EOD + range | ✅ Done |
| `apps/admin` — overview, reports | ✅ Done |
| Menu builder UI | 📋 Planned |
| 86 item toggle + Realtime propagation | 📋 Planned |

### Phase 8 — Public Menu + Online Ordering
| Item | Status |
|---|---|
| `apps/web` — public menu page, cart FAB, cart drawer | ✅ Done |
| `menu.ts` route — file exists, not mounted | 🔨 In progress |
| Guest checkout → Stripe → `online_orders` | 📋 Planned |
| Admin confirms order → POS ticket | 📋 Planned |

### Phase 9 — MCP Servers
| Item | Status |
|---|---|
| `mcp/culinary-os-server.ts` — unified server (6 tools) | ✅ Done |
| Domain servers (`pos`, `kds`, `inventory`, `admin`, `payments`) | 📋 Planned |

### Phases 10–14
| Phase | Name | Status |
|---|---|---|
| 10 | Staff management + PIN login | 📋 Planned |
| 11 | Loyalty program | 📋 Planned |
| 12 | Stripe Terminal (card-present) | 📋 Planned |
| 13 | RecipeOS Android (`mobile/`) | 📋 Planned |
| 14 | OSS release — Docker Compose docs, seed data, public launch | 📋 Planned |

---

## The Ratio Blueprint Engine

`packages/ratio-engine` — pure TypeScript, zero dependencies. Toast stores `500g`. CulinaryOS stores `100%` (baker's percentage) and understands the relationship.

```typescript
import { scaleBlueprint, computeCost } from '@culinaryos/ratio-engine';

const sourdough: RatioBlueprint = {
  id: 'sourdough-boule', name: 'Sourdough Boule',
  baseYield: 1, yieldUnit: 'loaf',
  ingredients: [
    { id: 'flour',   name: 'Bread Flour', ratioWeight: 100, unit: 'g' },
    { id: 'water',   name: 'Water',       ratioWeight: 75,  unit: 'ml' },
    { id: 'starter', name: 'Starter',     ratioWeight: 20,  unit: 'g' },
    { id: 'salt',    name: 'Salt',        ratioWeight: 2,   unit: 'g' },
  ],
};

const scaled = scaleBlueprint(sourdough, 12);  // 12 loaves — ratios preserved
const cost   = computeCost(scaled, { flour: 0.002, water: 0, starter: 0.01, salt: 0.001 });
```

---

## API Routes

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/health` | ✅ Live | Service health + version |
| `GET` | `/v1/kds/stations/:id/analytics` | ✅ Live | Avg time, bump rate, queue depth |
| `GET` | `/v1/pantry` | ✅ Live | All ingredients + stock status |
| `GET` | `/v1/pantry/alerts` | ✅ Live | Low-stock + out-of-stock |
| `PATCH` | `/v1/pantry/:id/adjust` | ✅ Live | Adjust qty + ledger entry |
| `GET` | `/v1/pantry/purchase-orders` | ✅ Live | All POs with line items |
| `POST` | `/v1/pantry/purchase-orders` | ✅ Live | Create draft PO |
| `PATCH` | `/v1/pantry/purchase-orders/:id/approve` | ✅ Live | Draft → Approved |
| `PATCH` | `/v1/pantry/purchase-orders/:id/send` | ✅ Live | Approved → Sent |
| `PATCH` | `/v1/pantry/purchase-orders/:id/receive` | ✅ Live | Sent → Received + restock |
| `DELETE` | `/v1/pantry/purchase-orders/:id` | ✅ Live | Cancel PO |
| `GET` | `/v1/reports/eod` | ✅ Live | EOD revenue summary |
| `GET` | `/v1/reports/range` | ✅ Live | Day-by-day revenue |
| `POST` | `/v1/payments/checkout` | ⚠️ Not mounted | Create Stripe PaymentIntent |
| `POST` | `/v1/payments/capture` | ⚠️ Not mounted | Capture + close order + send receipt |
| `POST` | `/v1/payments/refund` | ⚠️ Not mounted | Full or partial refund |
| `GET` | `/v1/payments/:orderId` | ⚠️ Not mounted | Payment status for an order |
| `GET` | `/v1/menu/:tenantSlug` | ⚠️ Not mounted | Public active menu |
| `GET` | `/v1/menu/:tenantSlug/item/:itemId` | ⚠️ Not mounted | Single item + modifiers |
| `POST` | `/v1/online-orders` | ⚠️ Stub + not mounted | Guest order — Phase 8 |
| `GET` | `/v1/online-orders` | ⚠️ Stub + not mounted | List incoming orders — Phase 8 |
| `PATCH` | `/v1/online-orders/:id/confirm` | ⚠️ Stub + not mounted | Confirm + create POS ticket |
| `PATCH` | `/v1/online-orders/:id/ready` | ⚠️ Stub + not mounted | Mark ready |
| `PATCH` | `/v1/online-orders/:id/complete` | ⚠️ Stub + not mounted | Mark complete |
| `PATCH` | `/v1/online-orders/:id/cancel` | ⚠️ Stub + not mounted | Cancel with reason |

---

## Database Migrations

| Migration | What It Creates |
|---|---|
| V1 | `tenants`, `my_tenant_id()`, RLS baseline |
| V2 | `kitchen_tickets`, `ticket_items`, Realtime |
| V3 | `menus`, `menu_sections`, `menu_items`, `modifier_groups`, `modifiers`, `pos_orders`, `pos_order_line_items`, `tabs`, `payments` |
| V4 | RLS policies across all tables |
| V5 | `domain_events` append-only audit ledger |
| V6 | Realtime enabled for key tables |
| V7 | `ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status` view |
| V8 | `course_hold_status`, `course_fire_log`, `order_course_status` view |
| V9 | `restock_purchase_orders`, `po_line_items`, `next_po_number()` RPC |
| V10 | Stripe columns on `payments` + `tenants`; `closed_at` trigger; Realtime on `payments` |
| V11 | Public anon read RLS on menu tables |
| V12 | `online_orders` — guest info, items JSONB, status machine, anon insert, Realtime |

---

## Offline & Hardware Decisions

**POS offline (V1 — Option A):** Show a "Connection Lost" banner, disable send-to-kitchen, allow local order editing, auto-sync via localStorage queue on reconnect. Full offline-first (IndexedDB + service worker) deferred.

**KDS hardware:** Any 10" Android tablet in Chrome kiosk mode. Waterproof case + PoE recommended for kitchen environments.

**Card-present (Phase 12):** Stripe Terminal Reader S700 or BBPOS WisePOS E. Stripe offline mode queues transactions and syncs on reconnect.

**Tenant onboarding:** A registration flow (name, slug, timezone, currency) must exist before POS work begins in Phase 3. Without it, `tenant_id` is hardcoded from `.env`.

---

## Local Development

### Option A — pnpm + Turborepo (primary)

```bash
git clone https://github.com/ShadowWalkerNC/CulinaryOS
cd CulinaryOS
pnpm install          # requires legacy dir cleanup first — see Manual Migration Steps

cp .env.example .env
# Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Required: STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY

supabase db reset     # applies V1–V12 migrations + seed.sql
pnpm dev              # all four apps + API in parallel

# API    → http://localhost:3000/health
# POS    → http://localhost:5172
# KDS    → http://localhost:5173
# Admin  → http://localhost:5174
# Web    → http://localhost:5176/menu/:slug
```

### Option B — Docker Compose (self-host / isolated)

```bash
cp .env.example .env    # fill in required vars
docker compose up       # builds all services, starts Supabase local, API, and apps
```

### Windows helpers

```bat
run-mcp-servers.bat     # compiles and launches all MCP stdio servers
run-web.bat             # starts apps/web in dev mode
```

---

## Development Scripts

```bash
pnpm dev              # all apps + API, watch mode
pnpm build            # production build
pnpm test             # Bun test suites
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm db:types         # supabase gen types → packages/db/src/types.ts
pnpm db:reset         # supabase db reset (re-runs all migrations)
pnpm seed             # seed dev data via scripts/seed.ts
```

---

## MCP Server Architecture

CulinaryOS exposes its full operation layer as domain-split MCP servers. Any MCP-compatible AI agent — Claude Desktop, Cursor, Copilot, custom — can connect and drive the platform.

```
AI Agent  →  mcp/<domain>-server.ts  →  Zod validation  →  apps/server  →  Supabase
              stdio / SSE                                   HTTP · Bearer token
```

**Every MCP server — no exceptions:**
- Validate all inputs with Zod before any API call
- Always send `Authorization: Bearer $CULINARYOS_API_KEY`
- Throw with context on non-2xx responses
- Never access the database directly — always through `apps/server`
- No `any`. No implicit returns. No silent failures.

### ✅ `mcp/culinary-os-server.ts` — Unified (shipped)
`create_order` · `fire_course` · `get_course_status` · `bump_ticket` · `get_pantry_levels` · `deduct_pantry_item`

### 📋 Domain servers (Phase 9)
**`mcp/pos-server.ts`** — `create_order` · `add_item` · `void_item` · `fire_course` · `get_order` · `close_order` · `get_open_orders`  
**`mcp/kds-server.ts`** — `get_tickets` · `bump_ticket` · `get_course_status` · `get_station_analytics` · `remake_ticket`  
**`mcp/inventory-server.ts`** — `get_pantry_levels` · `get_low_stock_alerts` · `deduct_pantry_item` · `receive_delivery` · `create_purchase_order` · `get_purchase_orders` · `approve_purchase_order`  
**`mcp/admin-server.ts`** — `get_eod_report` · `get_range_report` · `get_menu` · `set_item_availability` · `get_online_orders` · `confirm_online_order`  
**`mcp/payments-server.ts`** — `create_checkout` · `capture_payment` · `refund_payment` · `get_payment_status`

Full tool specs (input schemas, API calls, build rules) in [`AGENTS.md`](./AGENTS.md).

### Running MCP Servers

```bash
pnpm --filter mcp build
node mcp/dist/pos-server.js
node mcp/dist/kds-server.js
node mcp/dist/inventory-server.js
node mcp/dist/admin-server.js
node mcp/dist/payments-server.js

# Windows shortcut:
run-mcp-servers.bat
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "culinaryos-pos":       { "command": "node", "args": ["mcp/dist/pos-server.js"],       "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "...", "CULINARYOS_TENANT_ID": "..." } },
    "culinaryos-kds":       { "command": "node", "args": ["mcp/dist/kds-server.js"],       "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "..." } },
    "culinaryos-inventory": { "command": "node", "args": ["mcp/dist/inventory-server.js"], "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "..." } },
    "culinaryos-admin":     { "command": "node", "args": ["mcp/dist/admin-server.js"],     "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "..." } },
    "culinaryos-payments":  { "command": "node", "args": ["mcp/dist/payments-server.js"],  "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "...", "STRIPE_SECRET_KEY": "..." } }
  }
}
```

---

## Ground Rules

1. **No Flutter, no Gradle, no Flyway** — ever
2. **No on-device AI** — Anthropic API only, gracefully absent offline
3. **No raw card data on server** — Stripe PaymentIntents only
4. **Offline payments** = Stripe Terminal offline mode — not a custom sync engine
5. **Every DB table** requires `tenant_id uuid not null` + RLS policies — no exceptions
6. **Every mutation** writes to `domain_events` with `employee_id` + UTC timestamp
7. **Stock mutations** write ledger deltas — never UPDATE a running total directly
8. **MCP tools** validate all inputs with Zod before any API call — never call DB directly
9. Build the failure case first, then the happy path
10. Version numbers reflect reality — stay at `0.x` until something ships end-to-end
11. The **What's Actually Built** table contains only code that exists in the repo
12. The Ratio Blueprint Engine is non-negotiable — it's what makes this not Toast
13. Every commit updates this README's AI Agent Directive phase marker

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

---

## AI Agent Directive

> **Current phase:** 0 — Foundation / Migration  
> **Active targets (in order):**  
> 1. **Manual:** Run `git rm` to remove legacy root dirs — `backend/`, `pos/`, `kds/`, `web/`, `pos-client/`, `kds-client/`, `admin-client/`, `shared/`, `android/`, `recipeos/`, `gradle/` (see Manual Migration Steps above)  
> 2. **Manual:** Assess `cli/`, `extension_template/`, `extensions/` before deleting  
> 3. **Manual:** Review `backend/src/` for routes/middleware worth migrating to `apps/server/src/` before deleting  
> 4. Add stub `package.json` to every workspace missing one so `pnpm install` succeeds  
> 5. Scaffold `apps/pos`, `apps/kds`, `apps/admin`, `apps/web` with `pnpm create vite . --template react-ts` (if not yet done)  
> 6. Scaffold `apps/server` with Hono + Node 20 (if not yet done)  
> 7. Mount `paymentsRoutes` + `menuRoutes` + `onlineOrdersRoutes` in `apps/server/src/index.ts`  
> 8. Implement tenant registration flow (pre-Phase 3 blocker)  
> **Never:** Flutter · Gradle · Flyway · Gemini API · on-device AI · raw card data · direct DB from MCP  
> **Always:** `tenant_id` + RLS · `domain_events` audit · Zod on MCP inputs · PaymentIntents · update README on every commit  
> **Stack:** TypeScript · Hono · React 18 · Vite · Supabase · Stripe · Resend · pnpm · Turborepo  
> **Server location:** `apps/server/` (not `services/api/`)

---

*MIT License · © 2026 ShadowWalkerNC*
