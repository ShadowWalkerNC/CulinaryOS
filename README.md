# CulinaryOS

> **Web-based SaaS restaurant OS** — POS · KDS · Inventory · Reporting · Payments · Online Ordering  
> TypeScript · React 18 · Hono · Supabase · Turborepo · pnpm · MIT License

![Phase](https://img.shields.io/badge/phase-0%20Foundation%20%E2%80%94%20Migration-orange)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## What It Is

CulinaryOS is a **web-based SaaS restaurant OS built in the Toast model** — React apps run on any tablet or browser, no native install required. One platform covers the full service cycle: tablet POS for servers, real-time KDS for kitchen staff, inventory and pantry tracking with automated purchase orders, end-of-day reporting, Stripe-powered payments, a customer-facing online ordering storefront, an owner/manager admin back-office, an Android companion app (RecipeOS), and a domain-split MCP server layer for AI agent access.

The product differentiator is the **Ratio Blueprint Engine** (`packages/ratio-engine`) — a pure TypeScript library that models recipes as ratio relationships, not fixed quantities. Every other POS stores a number. CulinaryOS understands that bread flour : water : salt : yeast is a *relationship* — enabling true prep scaling, food cost projection, and AI menu assistance that no other platform offers.

**V1 target users:** Alley Katz and Half Baked Café — dogfood first, open source second.

---

## ⚠️ Repo State — Two Generations of Code Exist

This repo is mid-migration. A legacy flat layout and the canonical Turborepo monorepo layout **both exist at root simultaneously**. The legacy directories must be removed manually before `pnpm install` will work cleanly. See [Manual Migration Steps](#manual-migration-steps) below.

### Canonical layout (keep)

```
apps/           → React 18 + Vite apps (pos, kds, admin, web)
services/       → Hono API gateway (services/api)
packages/       → Shared TS packages (@culinaryos/*)
mcp/            → MCP stdio/SSE servers
supabase/       → Migrations + Edge Functions
mobile/         → Android companion (Phase 12+)
.github/        → CI workflows
docs/           → Project documentation
tests/          → Integration + E2E tests
```

### Legacy directories (must be removed)

| Directory | What It Is | Action |
|---|---|---|
| `backend/` | Old Hono server + `build.gradle.kts` skeleton — superseded by `services/api` | **Delete** |
| `pos/` | Old POS app root — superseded by `apps/pos` | **Delete** |
| `kds/` | Old KDS app root — superseded by `apps/kds` | **Delete** |
| `web/` | Old web app root — superseded by `apps/web` | **Delete** |
| `pos-client/` | Old POS client — superseded by `apps/pos` | **Delete** |
| `kds-client/` | Old KDS client — superseded by `apps/kds` | **Delete** |
| `admin-client/` | Old admin client — superseded by `apps/admin` | **Delete** |
| `shared/` | Old shared code — superseded by `packages/` | **Delete** |
| `android/` | Old Android skeleton — superseded by `mobile/recipeos` | **Delete** |
| `recipeos/` | Duplicate RecipeOS root — superseded by `mobile/recipeos` | **Delete** |
| `gradle/` | Gradle wrapper — violates Ground Rule #1 | **Delete** |
| `cli/` | Unspecified CLI tool — assess before deleting | **Assess** |
| `extension_template/` | Extension scaffolding — assess relevance | **Assess** |
| `extensions/` | Extension code — assess relevance | **Assess** |

### Root files to assess

| File | Status |
|---|---|
| `docker-compose.yml` | ✅ Keep — self-host / local dev (document in Quick Start) |
| `run-mcp-servers.bat` | ✅ Keep — Windows dev helper, document below |
| `run-web.bat` | ✅ Keep — Windows dev helper, document below |
| `AGENTS.md` | ✅ Keep — AI agent conventions |
| `CHANGELOG.md` | ✅ Keep — maintain going forward |
| `CONTRIBUTING.md` | ✅ Keep |
| `.env.example` | ✅ Keep — ensure all vars documented |

---

## Manual Migration Steps

These steps must be run **locally** — they cannot be automated via GitHub API because they involve `git rm` on directories with real file content.

### Step 1 — Remove legacy directories

```bash
# From repo root
git rm -r backend/
git rm -r pos/ kds/ web/
git rm -r pos-client/ kds-client/ admin-client/
git rm -r shared/
git rm -r android/ recipeos/
git rm -r gradle/

# Assess these before deleting — open them and check if anything is worth keeping:
# cli/  extension_template/  extensions/
# If nothing is worth keeping:
git rm -r cli/ extension_template/ extensions/

git add -A
git commit -m "chore: remove legacy flat-layout directories (migration to Turborepo monorepo)"
```

### Step 2 — Install dependencies

```bash
pnpm install
```

This will fail until each workspace has a valid `package.json`. The following workspaces currently have one:
- `packages/ratio-engine` ✅
- `packages/auth` ✅  
- `packages/config` ✅
- `backend/` ⚠️ — has `package.json` but is being deleted

Workspaces that still need a stub `package.json` before `pnpm install` works:
- `apps/pos`, `apps/kds`, `apps/admin`, `apps/web`
- `services/api`
- `packages/db`, `packages/ui`, `packages/event-bus`
- `mcp/`

Add a minimal stub to each:
```bash
# Example — repeat for each workspace, adjusting name and description
cat > apps/pos/package.json << 'EOF'
{
  "name": "@culinaryos/pos",
  "version": "0.1.0",
  "private": true,
  "scripts": { "dev": "vite", "build": "vite build", "typecheck": "tsc --noEmit" }
}
EOF
```

### Step 3 — Scaffold apps with Vite

```bash
# React 18 + TypeScript + Vite for each frontend app
cd apps/pos   && pnpm create vite . --template react-ts
cd apps/kds   && pnpm create vite . --template react-ts
cd apps/admin && pnpm create vite . --template react-ts
cd apps/web   && pnpm create vite . --template react-ts
```

### Step 4 — Scaffold API service

```bash
cd services/api
pnpm init
pnpm add hono @hono/node-server
pnpm add -D typescript @types/node tsx
```

### Step 5 — Migrate backend/src → services/api/src

`backend/src/` contains real route code (Hono routes, middleware, event-bus). Before deleting `backend/`, copy anything worth keeping:

```bash
# Review backend/src/ and backend/middleware/ first
# Then copy routes into services/api/src/routes/
cp -r backend/src/routes/* services/api/src/routes/
cp -r backend/middleware/*  services/api/src/middleware/
# Verify imports still resolve, then:
git rm -r backend/
git add -A && git commit -m "chore: migrate backend/src to services/api/src"
```

### Step 6 — Verify turbo builds

```bash
pnpm build        # should run all workspace builds via Turborepo
pnpm typecheck    # tsc --noEmit across all workspaces
pnpm lint
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                   pnpm Monorepo (Turborepo)                      │
│                                                                  │
│  apps/pos       apps/kds      apps/admin      apps/web           │
│  POS tablet     KDS display   Back office     Public store       │
│  :5173          :5174         :5175           :5176              │
│       └─────────────┴──────────────┴──────────────┘             │
│                             │                                    │
│              services/api  (Hono · Node 20 · :3000)             │
│                             │                                    │
│  packages/                                                       │
│    @culinaryos/db           Supabase client + generated types    │
│    @culinaryos/event-bus    Typed in-process event emitter       │
│    @culinaryos/ui           Shared React components              │
│    @culinaryos/auth         Auth context + session helpers       │
│    @culinaryos/ratio-engine Ratio Blueprint Engine ← THE thing   │
│    @culinaryos/config       Env schema, constants, feature flags │
│                             │                                    │
│         Supabase  (PostgreSQL · Realtime · Auth · RLS)           │
└──────────────────────────────────────────────────────────────────┘

mcp/              → Domain MCP servers  (TypeScript · @modelcontextprotocol/sdk)
mobile/recipeos   → Android companion   (Kotlin · Jetpack Compose · Phase 12+)
supabase/         → Migrations V1–V12 + Edge Functions (Deno · Resend)
```

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API gateway | Hono (Node 20) — `services/api/src/index.ts` · port 3000 |
| Frontend apps | React 18 + Vite — tablet or browser · ports 5173–5176 |
| Shared packages | `@culinaryos/db`, `event-bus`, `ui`, `auth`, `ratio-engine`, `config` |
| Database | Supabase PostgreSQL — V1–V12 migrations, RLS, Realtime |
| Online payments | Stripe Elements + PaymentIntents |
| In-venue payments | Stripe Terminal — built-in offline mode |
| Email | Resend via `supabase/functions/send-receipt` (Deno Edge Function) |
| AI | Anthropic API (claude-sonnet) — cloud-only, no on-device model |
| Android companion | Kotlin + Jetpack Compose + Room + Supabase-kt (Phase 12+) |
| MCP layer | TypeScript stdio/SSE servers (`@modelcontextprotocol/sdk`) |
| CI/CD | GitHub Actions |
| Local dev / self-host | Docker Compose (`docker-compose.yml`) |

---

## What's Actually Built

Three states: ✅ **Done** — code exists and runs · 🔨 **In progress** — actively being built · 📋 **Planned** — not started

### Phase 0 — Foundation
| Item | Status |
|---|---|
| `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore` | ✅ Done |
| `packages/ratio-engine` — full implementation + Bun tests | ✅ Done |
| `packages/auth` — stub + `Session` type | ✅ Done |
| `packages/config` — KDS thresholds, constants | ✅ Done |
| `packages/db`, `packages/ui`, `packages/event-bus` — stubs exist, no `package.json` yet | 🔨 In progress |
| `apps/pos`, `apps/kds`, `apps/admin`, `apps/web` — dirs exist, Vite not scaffolded | 🔨 In progress |
| `services/api` — exists in `backend/`, migration to `services/api/src` pending | 🔨 In progress |
| Remove legacy root directories (`backend/`, `pos/`, `kds/`, etc.) | 🔨 In progress — **manual** |
| `package.json` stubs in every workspace so `pnpm install` succeeds | 📋 Planned |
| GitHub Actions CI (lint + typecheck + test) | 📋 Planned |
| `.env.example` — verify all vars present | 📋 Planned |

### Phase 1 — Database Foundation
| Item | Status |
|---|---|
| Supabase V1–V12 migrations | ✅ Done |
| `packages/db` — Supabase client singleton + generated types | 📋 Planned |
| `packages/auth` — full Supabase session management | 📋 Planned |

### Phase 2 — API Gateway
| Item | Status |
|---|---|
| Hono server + CORS + auth middleware + `/health` | ✅ Done (`backend/server.ts` → migrate to `services/api`) |
| `GET /v1/kds/stations/:id/analytics` | ✅ Done |
| `GET|POST|PATCH|DELETE /v1/pantry/**` | ✅ Done |
| `GET /v1/reports/eod`, `GET /v1/reports/range` | ✅ Done |
| `POST|GET /v1/payments/**` — file exists, **not mounted** | 🔨 In progress |
| `GET /v1/menu/**` — file exists, **not mounted** | 🔨 In progress |
| `POST|GET|PATCH /v1/online-orders/**` — stubs, **not mounted** | 📋 Planned |
| `POST|GET|PATCH /v1/pos/orders/**` — not yet written | 📋 Planned |

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
| Mount in `index.ts` + integration test | 📋 Planned |
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

### Phases 10–13
| Phase | Name | Status |
|---|---|---|
| 10 | Staff management + PIN login | 📋 Planned |
| 11 | Loyalty program | 📋 Planned |
| 12 | Stripe Terminal (card-present) | 📋 Planned |
| 13 | RecipeOS Android (`mobile/recipeos/`) | 📋 Planned |
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
# POS    → http://localhost:5173
# KDS    → http://localhost:5174
# Admin  → http://localhost:5175
# Web    → http://localhost:5176/menu/:slug
```

### Option B — Docker Compose (self-host / isolated)

```bash
cp .env.example .env    # fill in required vars
docker compose up       # builds all services, starts Supabase local, API, and apps
```

See `docker-compose.yml` at root for service definitions.

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
AI Agent  →  mcp/<domain>-server.ts  →  Zod validation  →  services/api  →  Supabase
              stdio / SSE                                   HTTP · Bearer token
```

**Every MCP server — no exceptions:**
- Validate all inputs with Zod before any API call
- Always send `Authorization: Bearer $CULINARYOS_API_KEY`
- Throw with context on non-2xx responses
- Never access the database directly — always through `services/api`
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
> 3. **Manual:** Review `backend/src/` for any routes/middleware worth migrating to `services/api/src/` before deleting  
> 4. Add stub `package.json` to every workspace missing one so `pnpm install` succeeds  
> 5. Scaffold `apps/pos`, `apps/kds`, `apps/admin`, `apps/web` with `pnpm create vite . --template react-ts`  
> 6. Scaffold `services/api` with Hono + Node 20  
> 7. Mount `paymentsRoutes` + `menuRoutes` in `services/api/src/index.ts`  
> 8. Implement tenant registration flow (pre-Phase 3 blocker)  
> **Never:** Flutter · Gradle · Flyway · Gemini API · on-device AI · raw card data · direct DB from MCP  
> **Always:** `tenant_id` + RLS · `domain_events` audit · Zod on MCP inputs · PaymentIntents · update README on every commit  
> **Stack:** TypeScript · Hono · React 18 · Vite · Supabase · Stripe · Resend · pnpm · Turborepo

---

*MIT License · © 2026 ShadowWalkerNC*
