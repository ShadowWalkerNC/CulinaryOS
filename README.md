# CulinaryOS

> **Web-based SaaS restaurant OS** — POS · KDS · Inventory · Reporting · Payments · Online Ordering  
> TypeScript · React 18 · Hono · Supabase · Turborepo · pnpm · MIT License

![Phase](https://img.shields.io/badge/phase-0%20Foundation-orange)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## What It Is

CulinaryOS is a **web-based SaaS restaurant OS built in the Toast model** — React apps run on any tablet or browser, no native install required. One platform covers the full service cycle: tablet POS for servers, real-time KDS for kitchen staff, inventory and pantry tracking with automated purchase orders, end-of-day reporting, Stripe-powered payments, a customer-facing online ordering storefront, an owner/manager admin back-office, an Android inventory companion (RecipeOS), and a domain-split MCP server layer for AI agent access.

The product differentiator is the **Ratio Blueprint Engine** (`packages/ratio-engine`) — a pure TypeScript library that models recipes as ratio relationships, not fixed quantities. Every other POS stores a number. CulinaryOS understands that bread flour : water : salt : yeast is a *relationship* — enabling true prep scaling, food cost projection, and AI menu assistance that no other platform offers.

Built as a TypeScript pnpm monorepo orchestrated by Turborepo. All tenant data lives in Supabase (PostgreSQL + Realtime + Auth + RLS). The backend is a single Hono API gateway. All four frontend apps are React 18 + Vite and run in any modern browser — iPad, Android tablet, or desktop.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    pnpm Monorepo (Turborepo)                      │
│                                                                  │
│  apps/pos       apps/kds      apps/admin      apps/web           │
│  POS tablet     KDS display   Back office     Public store       │
│  :5173          :5174         :5175           :5176              │
│      └─────────────┴──────────────┴──────────────┘              │
│                              │                                   │
│               services/api  (Hono · Node 20 · :3000)            │
│                              │                                   │
│  packages/                                                       │
│    @culinaryos/db          Supabase client + generated types     │
│    @culinaryos/event-bus   Typed in-process event emitter        │
│    @culinaryos/ui          Shared React components (shadcn base) │
│    @culinaryos/auth        Auth context + session helpers        │
│    @culinaryos/ratio-engine  Ratio Blueprint Engine ← THE thing  │
│    @culinaryos/config      Env schema, constants, feature flags  │
│                              │                                   │
│           Supabase  (PostgreSQL · Realtime · Auth · RLS)         │
└──────────────────────────────────────────────────────────────────┘

mcp/                 →  Domain MCP servers  (TypeScript · @modelcontextprotocol/sdk)
mobile/recipeos      →  Android companion   (Kotlin · Jetpack Compose · Room)
supabase/            →  Migrations + Edge Functions (Deno · Resend)
```

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API gateway | Hono (Node 20) — `services/api/src/index.ts` |
| Frontend apps | React 18 + Vite — any browser / tablet (ports 5173–5176) |
| Shared packages | `@culinaryos/db`, `event-bus`, `ui`, `auth`, `ratio-engine`, `config` |
| Database | Supabase PostgreSQL — V1–V12 migrations, RLS, Realtime |
| Online payments | Stripe Elements + PaymentIntents |
| In-venue payments | Stripe Terminal — built-in offline mode covers network drops |
| Email | Resend via `supabase/functions/send-receipt` (Deno Edge Function) |
| AI | Anthropic API (claude-sonnet) — cloud-only, no on-device model |
| Android companion | Kotlin + Jetpack Compose + Room + Supabase-kt |
| MCP layer | TypeScript stdio/SSE servers (`@modelcontextprotocol/sdk`) |
| CI/CD | GitHub Actions |

---

## What's Actually Built

Three states: ✅ **Done** — code exists and runs · 🔨 **In progress** — actively being built · 📋 **Planned** — not started

### Phase 0 — Repo Foundation
| Item | Status |
|---|---|
| Turborepo + pnpm workspace | 🔨 In progress |
| `apps/pos`, `apps/kds`, `apps/admin`, `apps/web` scaffolded | 🔨 In progress |
| `services/api` Hono gateway scaffolded | 🔨 In progress |
| `packages/db`, `event-bus`, `ui` scaffolded | 🔨 In progress |
| `packages/auth`, `config`, `ratio-engine` scaffolded | 🔨 In progress |
| `tsconfig.base.json`, `turbo.json`, `.gitignore` | ✅ Done |
| GitHub Actions CI | 📋 Planned |
| `.env.example` fully documented | 📋 Planned |

### Phase 1 — Database Foundation
| Item | Status |
|---|---|
| Supabase V1–V12 migrations | 🔨 In progress |
| `packages/db` — client singleton + generated types | 📋 Planned |
| `packages/auth` — auth context + session helpers | 📋 Planned |

### Phase 2 — API Gateway
| Item | Status |
|---|---|
| Hono server + auth middleware + `/health` | ✅ Done |
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
| `apps/pos` — order creation, line items, send-to-kitchen | 🔨 In progress |
| CheckoutDrawer (Stripe Elements) | 🔨 In progress |
| Course hold UI | 📋 Planned |

### Phase 4 — KDS
| Item | Status |
|---|---|
| `apps/kds` — StationPage, TicketCard, BumpButton | ✅ Done |
| CourseHoldBanner, AnalyticsBar | ✅ Done |
| Course engine (`initialHoldStatus`, `checkAndAdvanceCourse`, `manualFireCourse`) | ✅ Done |
| Supabase Realtime subscription | ✅ Done |

### Phase 5 — Payments
| Item | Status |
|---|---|
| `payments.ts` route file — checkout, capture, refund | 🔨 In progress (not mounted) |
| Mount in `index.ts` + full test | 📋 Planned |
| Resend receipt Edge Function | 📋 Planned |

### Phase 6 — Inventory & Pantry
| Item | Status |
|---|---|
| V7–V9 migrations (ingredients, pantry_ledger, POs) | ✅ Done |
| Pantry API routes | ✅ Done |
| `apps/admin` — PO panel, pantry alerts | ✅ Done |
| `packages/ratio-engine` — Ratio Blueprint Engine | 🔨 Scaffolded |

### Phase 7 — Admin & Reporting
| Item | Status |
|---|---|
| `apps/admin` — overview, event log | ✅ Done |
| Reports API — EOD + range | ✅ Done |
| Menu builder UI | 📋 Planned |
| 86 item toggle + Realtime propagation | 📋 Planned |

### Phase 8 — Public Menu + Online Ordering
| Item | Status |
|---|---|
| `apps/web` — public menu page, cart FAB, cart drawer | ✅ Done |
| Guest checkout → Stripe → `online_orders` | 📋 Planned |
| Admin confirms order → POS ticket | 📋 Planned |

### Phase 9 — MCP Servers
| Item | Status |
|---|---|
| `mcp/culinary-os-server.ts` — unified server (6 tools) | ✅ Done |
| `mcp/pos-server.ts` | 📋 Planned |
| `mcp/kds-server.ts` | 📋 Planned |
| `mcp/inventory-server.ts` | 📋 Planned |
| `mcp/admin-server.ts` | 📋 Planned |
| `mcp/payments-server.ts` | 📋 Planned |

### Phase 10 — Staff & Loyalty
📋 Staff management + PIN login per terminal · Loyalty program (points, redemption)

### Phase 11 — Stripe Terminal
📋 Card-present in-venue payments · Offline mode queue + sync

### Phase 12 — RecipeOS Android
📋 `mobile/recipeos/` · Recipe scaling UI · Prep list generation · Ratio Blueprint Engine consumed from API

### Phase 13 — OSS Release
📋 CONTRIBUTING.md · Self-host Docker Compose guide · Demo tenant seed (Alley Katz + Half Baked Café) · Public launch

---

## The Ratio Blueprint Engine

`packages/ratio-engine` — pure TypeScript, zero dependencies.

Toast stores `bread_flour: 500g`. CulinaryOS stores `bread_flour: 100%` (baker's percentage). The engine understands the relationship and scales to any yield correctly — not just multiplies.

```typescript
import { scaleBlueprint, computeCost } from '@culinaryos/ratio-engine';

const sourdough: RatioBlueprint = {
  id: 'sourdough-boule',
  name: 'Sourdough Boule',
  baseYield: 1,
  yieldUnit: 'loaf',
  ingredients: [
    { id: 'bread-flour', name: 'Bread Flour', ratioWeight: 100, unit: 'g' },
    { id: 'water',       name: 'Water',       ratioWeight: 75,  unit: 'ml' },
    { id: 'starter',     name: 'Starter',     ratioWeight: 20,  unit: 'g' },
    { id: 'salt',        name: 'Salt',        ratioWeight: 2,   unit: 'g' },
  ],
};

// Scale to 12 loaves for Saturday prep
const scaled = scaleBlueprint(sourdough, 12);

// Compute food cost against current ingredient prices
const cost = computeCost(scaled, { 'bread-flour': 0.002, water: 0, starter: 0.01, salt: 0.001 });
```

---

## API Routes

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/health` | ✅ Live | Service health + version |
| `GET` | `/v1/kds/stations/:id/analytics` | ✅ Live | Avg ticket time, bump rate, queue depth |
| `GET` | `/v1/pantry` | ✅ Live | All ingredients + stock status |
| `GET` | `/v1/pantry/alerts` | ✅ Live | Low-stock + out-of-stock only |
| `PATCH` | `/v1/pantry/:id/adjust` | ✅ Live | Adjust qty + write ledger entry |
| `GET` | `/v1/pantry/purchase-orders` | ✅ Live | All POs with line items |
| `POST` | `/v1/pantry/purchase-orders` | ✅ Live | Create draft PO (`auto:true` from alerts) |
| `PATCH` | `/v1/pantry/purchase-orders/:id/approve` | ✅ Live | Draft → Approved |
| `PATCH` | `/v1/pantry/purchase-orders/:id/send` | ✅ Live | Approved → Sent |
| `PATCH` | `/v1/pantry/purchase-orders/:id/receive` | ✅ Live | Sent → Received + restock |
| `DELETE` | `/v1/pantry/purchase-orders/:id` | ✅ Live | Cancel PO |
| `GET` | `/v1/reports/eod` | ✅ Live | EOD revenue summary |
| `GET` | `/v1/reports/range` | ✅ Live | Day-by-day revenue across date range |
| `POST` | `/v1/payments/checkout` | ⚠️ Not mounted | Create Stripe PaymentIntent |
| `POST` | `/v1/payments/capture` | ⚠️ Not mounted | Capture payment, close order, send receipt |
| `POST` | `/v1/payments/refund` | ⚠️ Not mounted | Full or partial refund |
| `GET` | `/v1/payments/:orderId` | ⚠️ Not mounted | Payments for an order |
| `GET` | `/v1/menu/:tenantSlug` | ⚠️ Not mounted | Public active menu (anon, cached 60s) |
| `GET` | `/v1/menu/:tenantSlug/item/:itemId` | ⚠️ Not mounted | Single item + modifier groups |
| `POST` | `/v1/online-orders` | ⚠️ Stub + not mounted | Guest places order — Phase 8 |
| `GET` | `/v1/online-orders` | ⚠️ Stub + not mounted | Tenant lists incoming orders — Phase 8 |
| `PATCH` | `/v1/online-orders/:id/confirm` | ⚠️ Stub + not mounted | Confirm + create POS ticket — Phase 8 |
| `PATCH` | `/v1/online-orders/:id/ready` | ⚠️ Stub + not mounted | Mark ready for pickup — Phase 8 |
| `PATCH` | `/v1/online-orders/:id/complete` | ⚠️ Stub + not mounted | Mark completed — Phase 8 |
| `PATCH` | `/v1/online-orders/:id/cancel` | ⚠️ Stub + not mounted | Cancel with reason — Phase 8 |

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

**POS offline (V1 decision — Option A):**  
Show a "Connection Lost" banner, disable send-to-kitchen, allow order editing locally, auto-sync on reconnect via a localStorage queue → Supabase on reconnect. Full offline-first (IndexedDB + service worker + conflict resolution) is deferred to a future phase.

**KDS hardware:**  
Any 10" Android tablet in Chrome kiosk mode running `apps/kds`. A waterproof case and Power over Ethernet for kitchen environments. No proprietary hardware required.

**Card-present hardware (Phase 11):**  
Stripe Terminal Reader S700 (touchscreen) or BBPOS WisePOS E. Stripe's built-in offline mode queues transactions when connectivity is lost and syncs on reconnect.

**Tenant onboarding (pre-Phase 3 requirement):**  
A registration flow (name, slug, timezone, currency) must exist before POS can be used without hardcoded `tenant_id`. Planned as the first task of Phase 3.

---

## MCP Server Architecture

CulinaryOS exposes its full operation layer as domain-split MCP servers. Any MCP-compatible AI agent — Claude Desktop, Cursor, Copilot, custom — can connect and drive the platform.

### Connection Model

```
AI Agent  (Claude Desktop / Cursor / custom)
    │
    │  stdio  (or SSE for admin-server)
    ▼
mcp/<domain>-server.ts
    │  Zod input validation → fetch() → services/api → structured JSON
    │
    │  HTTP  Authorization: Bearer $CULINARYOS_API_KEY
    ▼
services/api  (Hono · :3000)
    │
    ▼
Supabase  (PostgreSQL + Realtime)
```

**Every MCP server — no exceptions:**
```typescript
const input = InputSchema.parse(request.params.arguments);       // Zod first
const res = await fetch(`${API_URL}/v1/...`, {
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
});
if (!res.ok) {
  const err = await res.json().catch(() => ({ error: res.statusText }));
  throw new Error(`[culinaryos] API ${res.status}: ${err.error}`);
}
return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
// No `any`. No implicit returns. No direct DB access — always through services/api.
```

### ✅ `mcp/culinary-os-server.ts` — Unified (shipped)
`create_order` · `fire_course` · `get_course_status` · `bump_ticket` · `get_pantry_levels` · `deduct_pantry_item`

Will be split into domain servers as each phase ships.

### 📋 Domain Servers (Phase 9)

**`mcp/pos-server.ts`** — stdio  
`create_order` · `add_item` · `void_item` · `fire_course` · `get_order` · `close_order` · `get_open_orders`

**`mcp/kds-server.ts`** — stdio  
`get_tickets` · `bump_ticket` · `get_course_status` · `get_station_analytics` · `remake_ticket`

**`mcp/inventory-server.ts`** — stdio  
`get_pantry_levels` · `get_low_stock_alerts` · `deduct_pantry_item` · `receive_delivery` · `create_purchase_order` · `get_purchase_orders` · `approve_purchase_order`

**`mcp/admin-server.ts`** — stdio + SSE  
`get_eod_report` · `get_range_report` · `get_menu` · `set_item_availability` · `get_online_orders` · `confirm_online_order`

**`mcp/payments-server.ts`** — stdio  
`create_checkout` · `capture_payment` · `refund_payment` · `get_payment_status`

Full tool specs (input schemas, API calls, build rules) in [`mcp/README.md`](./mcp/README.md).

### Running MCP Servers
```bash
pnpm --filter mcp build
node mcp/dist/pos-server.js
node mcp/dist/kds-server.js
node mcp/dist/inventory-server.js
node mcp/dist/admin-server.js
node mcp/dist/payments-server.js
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

## Quick Start

**Prerequisites:** Node 20+, pnpm 9+, Supabase CLI

```bash
git clone https://github.com/ShadowWalkerNC/CulinaryOS
cd CulinaryOS
pnpm install

cp .env.example .env
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY

supabase db reset    # V1–V12 + seed.sql
pnpm dev             # all four apps + API in parallel

# API    → http://localhost:3000/health
# POS    → http://localhost:5173
# KDS    → http://localhost:5174
# Admin  → http://localhost:5175
# Web    → http://localhost:5176/menu/:slug
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
pnpm db:reset         # supabase db reset
pnpm seed             # seed dev data
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
10. Version numbers reflect reality — stay at `0.x` until something actually ships end-to-end
11. The **What's Actually Built** table contains only code that exists in the repo
12. The Ratio Blueprint Engine is non-negotiable — it's what makes this not Toast
13. Every commit updates this README's AI Agent Directive phase marker

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

**V1 target users:** Alley Katz and Half Baked Café — dogfood first, open source second.

---

## AI Agent Directive

> **Current phase:** 0 — Foundation  
> **Active targets (in order):**  
> 1. Scaffold stub `package.json` in every workspace (`apps/*`, `services/api`, `packages/*`, `mcp`)  
> 2. Implement `packages/ratio-engine/src/index.ts` — `RatioBlueprint`, `scaleBlueprint()`, `computeCost()`  
> 3. Mount `paymentsRoutes` + `menuRoutes` in `services/api/src/index.ts`  
> 4. Implement tenant registration flow before any POS work  
> 5. Implement `POST /v1/online-orders` full logic + `GuestInfoForm.tsx`  
> **MCP servers:** Full specs in MCP section above + `mcp/README.md`  
> **Never:** Flutter · Gradle · Flyway · Gemini API · on-device AI · raw card data · direct DB from MCP  
> **Always:** `tenant_id` + RLS · `domain_events` audit · Zod on MCP inputs · PaymentIntents · update README on every commit  
> **Stack:** TypeScript · Hono · React 18 · Vite · Supabase · Stripe · Resend · pnpm · Turborepo · GitHub Actions

---

*MIT License · © 2026 ShadowWalkerNC*
