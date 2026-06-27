# CulinaryOS

> **Restaurant operations platform** — POS · KDS · Inventory · Reporting · Payments · Online Ordering  
> TypeScript · React · Hono · Supabase · Turborepo · pnpm

![Phase](https://img.shields.io/badge/phase-4b%20Online%20Ordering-blue)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## What It Is

CulinaryOS is a **web-based SaaS restaurant OS** — the Toast model. React web apps run on any tablet or browser. One platform covers the full service cycle: tablet POS for servers, real-time KDS for cooks, inventory/pantry tracker with automated purchase orders, EOD reporting, Stripe-powered payments, a customer-facing online ordering storefront, an admin back-office, an Android companion app (RecipeOS), and a full MCP server layer for AI agent access.

Built as a TypeScript pnpm monorepo with Turborepo. All tenant data lives in Supabase (PostgreSQL + Realtime + Auth + RLS). The backend is a Hono API gateway. All frontend apps are React + Vite and run in any browser — on iPad, Android tablet, or desktop.

---

## Confirmed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  pnpm Monorepo (Turborepo)                   │
│                                                             │
│  apps/pos   apps/kds   apps/admin   apps/web                │
│  (5173)     (5174)     (5175)       (5176)                  │
│      └──────────┴──────────┴────────────┘                   │
│                           │                                 │
│            services/api (Hono · Node 20 · port 3000)        │
│   /v1/pos  /v1/kds  /v1/pantry  /v1/reports                │
│   /v1/payments  /v1/menu  /v1/online-orders                 │
│                           │                                 │
│     @culinaryos/event-bus  @culinaryos/db                   │
│     @culinaryos/auth       @culinaryos/ui                   │
│     @culinaryos/config                                      │
│                           │                                 │
│      Supabase (PostgreSQL · Realtime · Auth · RLS)          │
└─────────────────────────────────────────────────────────────┘

mcp/                →  MCP stdio servers (TypeScript · @modelcontextprotocol/sdk)
mobile/recipeos     →  Android companion (Kotlin · Jetpack Compose · Room)
supabase/functions/ →  Edge Functions (Deno · Resend)
```

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API server | Hono (Node 20) — `services/api/src/index.ts` |
| Frontend apps | React 18 + Vite (ports 5173–5176) — runs on any browser/tablet |
| Shared packages | `@culinaryos/db`, `event-bus`, `ui`, `auth`, `config` |
| Database | Supabase PostgreSQL (V1–V12 migrations, RLS, Realtime) |
| Payments (online) | Stripe Elements + PaymentIntents |
| Payments (in-venue) | Stripe Terminal — offline mode handles network drops |
| Email | Resend (Edge Function `supabase/functions/send-receipt`) |
| Android | Kotlin + Jetpack Compose + Room + Supabase-kt |
| MCP | TypeScript stdio/SSE servers (`@modelcontextprotocol/sdk`) |
| CI/CD | GitHub Actions |

---

## What's Shipped

| Feature | Status | Details |
|---|---|---|
| Supabase schema V1–V12 | ✅ | Tenants, POS, KDS, menu, events, pantry, POs, Stripe, public RLS, online orders |
| Hono API gateway | ✅ | All routes mounted, CORS, auth middleware |
| POS Core | ✅ | Orders, line items, send-to-kitchen |
| KDS — tickets, course firing, bump | ✅ | Fire, bump, analytics, course engine |
| KDS React app | ✅ | Station page, CourseHoldBanner, TicketCard, BumpButton, AnalyticsBar |
| Admin dashboard | ✅ | Overview, pantry alerts, event log, PO panel |
| Pantry & inventory | ✅ | Stock tracking, low-stock alerts, adjust |
| Restock PO workflow | ✅ | Draft → Approve → Send → Receive |
| EOD + range reports | ✅ | Revenue, voids, covers, hourly, top items, depletion |
| Stripe payments | ✅ | Checkout, capture, refund, tip selector, Resend receipt |
| POS CheckoutDrawer | ✅ | Stripe Elements, tip presets, Apple/Google Pay |
| Public menu page | ✅ | `apps/web` — scroll-spy nav, allergen badges, modifier picker, cart FAB |
| MCP servers (initial) | ✅ | `fire_course`, `get_course_status`, `create_order`, `bump_ticket`, `get_pantry_levels`, `deduct_pantry_item` |
| Online ordering checkout | 📋 Phase 4b | GuestInfoForm, POST /v1/online-orders, V12 migration, Stripe wire-up |
| Menu builder (admin UI) | 📋 Phase 5 | |
| Staff management + PIN login | 📋 Phase 6 | |
| Loyalty program | 📋 Phase 7 | |
| Stripe Terminal (card-present) | 📋 Phase 8 | |
| AI Custom Prompt Library | 📋 Phase 9 | |
| OSS release | 📋 Phase 10 | |

---

## MCP Server Architecture

CulinaryOS exposes its entire operation layer as MCP (Model Context Protocol) servers. Each server wraps a domain of the API and can be connected to any MCP-compatible AI agent — Claude Desktop, Cursor, Copilot, custom agents.

### How MCP Servers Connect

```
AI Agent (Claude / Cursor / custom)
         │
         │  stdio or SSE transport
         ▼
  mcp/<server-name>.ts
  ┌─────────────────────────────────────┐
  │  @modelcontextprotocol/sdk Server   │
  │  - Registers tools with schemas     │
  │  - Validates input via Zod          │
  │  - Calls services/api via fetch()   │
  │  - Returns structured responses     │
  └─────────────────────────────────────┘
         │
         │  HTTP  (CULINARYOS_API_URL + CULINARYOS_API_KEY)
         ▼
  services/api (Hono)
         │
         ▼
  Supabase (PostgreSQL + Realtime)
```

Each MCP server:
- Uses `@modelcontextprotocol/sdk` (`Server` class, `StdioServerTransport` or `SSEServerTransport`)
- Authenticates to `services/api` with `CULINARYOS_API_KEY` (tenant service-role token, env var)
- Validates all tool inputs with **Zod schemas before any API call**
- Returns structured JSON — never raw DB rows
- Handles errors explicitly — never lets a failed API call silently return `undefined`
- Is fully typed — no `any`, no implicit returns

### MCP Servers — Build Plan

#### ✅ `mcp/culinary-os-server.ts` — Unified server (shipped)
Current single-file server. Will be split into domain servers as each is built.

---

#### 📋 `mcp/pos-server.ts` — POS Domain
**Transport:** stdio  
**Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input | API Call | Description |
|---|---|---|---|
| `create_order` | `{ table?: string, order_type: 'dine_in'\|'takeout'\|'delivery', items: [{menu_item_id, qty, modifiers?}] }` | `POST /v1/pos/orders` | Open a new order with line items |
| `add_item` | `{ order_id, menu_item_id, qty, modifiers? }` | `POST /v1/pos/orders/:id/items` | Add item to existing open order |
| `void_item` | `{ order_id, line_item_id, reason }` | `DELETE /v1/pos/orders/:id/items/:itemId` | Void a line item with audit reason |
| `fire_course` | `{ order_id, course_number }` | `POST /v1/tickets/fire` | Manually fire a course to KDS |
| `get_order` | `{ order_id }` | `GET /v1/pos/orders/:id` | Get full order with items and status |
| `close_order` | `{ order_id }` | `PATCH /v1/pos/orders/:id/close` | Mark order paid and closed |
| `get_open_orders` | `{ limit?: number }` | `GET /v1/pos/orders?status=open` | List all open orders |

**Build rules:**
- Every tool must check order status before mutation (`open` orders only for add/void)
- `void_item` writes to `domain_events` with `employee_id` and `reason` — never a silent delete
- `fire_course` emits `kds:course:fired` event through the event bus

---

#### 📋 `mcp/kds-server.ts` — Kitchen Display Domain
**Transport:** stdio  
**Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input | API Call | Description |
|---|---|---|---|
| `get_tickets` | `{ station_id?, status?: 'open'\|'in_progress'\|'ready' }` | `GET /v1/kds/tickets` | List kitchen tickets for a station |
| `bump_ticket` | `{ ticket_id }` | `PATCH /v1/tickets/:id/bump` | Bump a completed ticket |
| `get_course_status` | `{ order_id }` | `GET /v1/kds/orders/:id/courses` | Return hold/fired state per course |
| `get_station_analytics` | `{ station_id, period?: 'shift'\|'day' }` | `GET /v1/kds/stations/:id/analytics` | Avg ticket time, bump rate, queue depth |
| `remake_ticket` | `{ ticket_id, reason }` | `POST /v1/kds/tickets/:id/remake` | Log a remake with reason for waste tracking |

**Build rules:**
- `bump_ticket` emits `kds:ticket:bumped` event — do not call Supabase directly
- `get_station_analytics` response must include `avg_time_seconds`, `bump_rate`, `queue_depth`, `held_count`
- Ticket age coloring thresholds are config values, not hardcoded

---

#### 📋 `mcp/inventory-server.ts` — Inventory & Pantry Domain
**Transport:** stdio  
**Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input | API Call | Description |
|---|---|---|---|
| `get_pantry_levels` | `{ category?: string }` | `GET /v1/pantry` | All ingredients with current stock and par status |
| `get_low_stock_alerts` | `{}` | `GET /v1/pantry/alerts` | Items below reorder point |
| `deduct_pantry_item` | `{ ingredient_id, qty, reason: 'sale'\|'waste'\|'adjustment' }` | `PATCH /v1/pantry/:id/adjust` | Decrement stock with reason code |
| `receive_delivery` | `{ items: [{ingredient_id, qty, unit_cost?}] }` | `POST /v1/pantry/receive` | Log positive delta for received goods |
| `create_purchase_order` | `{ auto?: boolean, items?: [{ingredient_id, qty}] }` | `POST /v1/pantry/purchase-orders` | Draft a PO — auto=true generates from alerts |
| `get_purchase_orders` | `{ status?: 'draft'\|'approved'\|'sent'\|'received' }` | `GET /v1/pantry/purchase-orders` | List POs by status |
| `approve_purchase_order` | `{ po_id }` | `PATCH /v1/pantry/purchase-orders/:id/approve` | Advance PO from draft to approved |

**Build rules:**
- All stock mutations write a delta row — never UPDATE a running total directly
- `deduct_pantry_item` with `reason: 'waste'` logs to `domain_events` with full detail
- `receive_delivery` triggers low-stock alert resolution for affected items

---

#### 📋 `mcp/admin-server.ts` — Admin & Reporting Domain
**Transport:** SSE (for dashboard use) + stdio (for agent use)  
**Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input | API Call | Description |
|---|---|---|---|
| `get_eod_report` | `{ date?: string }` | `GET /v1/reports/eod` | EOD summary — revenue, voids, covers, hourly, top items |
| `get_range_report` | `{ from: string, to: string }` | `GET /v1/reports/range` | Day-by-day revenue across a date range |
| `get_menu` | `{ include_unavailable?: boolean }` | `GET /v1/menu/:slug` | Full active menu with sections and items |
| `set_item_availability` | `{ menu_item_id, available: boolean }` | `PATCH /v1/menu/items/:id` | 86 an item or restore it |
| `get_online_orders` | `{ status?: string, limit?: number }` | `GET /v1/online-orders` | List incoming online orders |
| `confirm_online_order` | `{ online_order_id }` | `PATCH /v1/online-orders/:id/confirm` | Confirm order + create POS ticket |

**Build rules:**
- `set_item_availability` (86ing) must propagate immediately via Supabase Realtime to `apps/pos` and `apps/kds`
- Report tools return plain-English summaries in addition to raw data — agents should be able to read the output directly
- SSE transport requires auth header check before streaming

---

#### 📋 `mcp/payments-server.ts` — Payments Domain
**Transport:** stdio  
**Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`, `STRIPE_SECRET_KEY`

| Tool | Input | API Call | Description |
|---|---|---|---|
| `create_checkout` | `{ order_id, tip_percent?: number }` | `POST /v1/payments/checkout` | Create Stripe PaymentIntent, return `client_secret` |
| `capture_payment` | `{ order_id, payment_intent_id }` | `POST /v1/payments/capture` | Verify succeeded, close order, fire receipt |
| `refund_payment` | `{ order_id, amount_cents?, reason }` | `POST /v1/payments/refund` | Full or partial Stripe refund |
| `get_payment_status` | `{ order_id }` | `GET /v1/payments/:orderId` | List all payments and current status for an order |

**Build rules:**
- Raw card data **never** passes through any MCP tool — PaymentIntent only
- `capture_payment` must verify `payment_intent.status === 'succeeded'` before closing order
- All payment mutations write to `domain_events` with amount, method, and employee ID

---

### MCP Shared Conventions

All MCP servers follow these rules without exception:

```typescript
// 1. Every tool input validated with Zod before any API call
const input = MySchema.parse(request.params.arguments);

// 2. API calls always include auth header
const res = await fetch(`${API_URL}/v1/...`, {
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
});

// 3. Non-2xx responses always throw with context
if (!res.ok) {
  const err = await res.json().catch(() => ({ error: res.statusText }));
  throw new Error(`API error ${res.status}: ${err.error}`);
}

// 4. Every tool returns { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
// 5. No any types. No implicit returns. No silent failures.
```

### Running MCP Servers

```bash
# Compile all MCP servers
pnpm --filter mcp build

# Run individual servers (stdio)
node mcp/dist/pos-server.js
node mcp/dist/kds-server.js
node mcp/dist/inventory-server.js
node mcp/dist/admin-server.js
node mcp/dist/payments-server.js

# Windows shortcut
run-mcp-servers.bat
```

**Claude Desktop config** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "culinaryos-pos": {
      "command": "node",
      "args": ["path/to/CulinaryOS/mcp/dist/pos-server.js"],
      "env": {
        "CULINARYOS_API_URL": "http://localhost:3000",
        "CULINARYOS_API_KEY": "your-service-role-key",
        "CULINARYOS_TENANT_ID": "your-tenant-id"
      }
    },
    "culinaryos-kds": {
      "command": "node",
      "args": ["path/to/CulinaryOS/mcp/dist/kds-server.js"],
      "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "..." }
    },
    "culinaryos-inventory": {
      "command": "node",
      "args": ["path/to/CulinaryOS/mcp/dist/inventory-server.js"],
      "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "..." }
    },
    "culinaryos-admin": {
      "command": "node",
      "args": ["path/to/CulinaryOS/mcp/dist/admin-server.js"],
      "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "..." }
    },
    "culinaryos-payments": {
      "command": "node",
      "args": ["path/to/CulinaryOS/mcp/dist/payments-server.js"],
      "env": { "CULINARYOS_API_URL": "http://localhost:3000", "CULINARYOS_API_KEY": "...", "STRIPE_SECRET_KEY": "..." }
    }
  }
}
```

---

## Quick Start

**Prerequisites:** Node 20+, pnpm 9+, Supabase CLI

```bash
# 1. Clone & install
git clone https://github.com/ShadowWalkerNC/CulinaryOS
cd CulinaryOS
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#          STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY

# 3. Run migrations
supabase db reset

# 4. Start everything
pnpm dev

# 5. Open apps
# API         → http://localhost:3000/health
# POS         → http://localhost:5173
# KDS         → http://localhost:5174
# Admin       → http://localhost:5175
# Web (menu)  → http://localhost:5176/menu/:slug
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health + version |
| `GET` | `/v1/pantry` | All ingredients + stock status |
| `GET` | `/v1/pantry/alerts` | Low-stock + out-of-stock only |
| `PATCH` | `/v1/pantry/:id/adjust` | Adjust qty + write ledger entry |
| `GET` | `/v1/pantry/purchase-orders` | All POs with line items |
| `POST` | `/v1/pantry/purchase-orders` | Create draft PO |
| `PATCH` | `/v1/pantry/purchase-orders/:id/approve` | Draft → Approved |
| `PATCH` | `/v1/pantry/purchase-orders/:id/send` | Approved → Sent |
| `PATCH` | `/v1/pantry/purchase-orders/:id/receive` | Sent → Received + restock |
| `DELETE` | `/v1/pantry/purchase-orders/:id` | Cancel PO |
| `GET` | `/v1/kds/stations/:id/analytics` | Avg ticket time, bump rate, queue depth |
| `GET` | `/v1/reports/eod` | EOD summary |
| `GET` | `/v1/reports/range` | Day-by-day revenue across date range |
| `POST` | `/v1/payments/checkout` | Create Stripe PaymentIntent |
| `POST` | `/v1/payments/capture` | Capture payment, close order, send receipt |
| `POST` | `/v1/payments/refund` | Full or partial refund |
| `GET` | `/v1/payments/:orderId` | Payments for an order |
| `GET` | `/v1/menu/:tenantSlug` | Public active menu (anon, cached 60s) |
| `GET` | `/v1/menu/:tenantSlug/item/:itemId` | Single item detail |
| `POST` | `/v1/online-orders` | Guest places order (stub — Phase 4b) |
| `GET` | `/v1/online-orders` | Tenant lists incoming orders (stub — Phase 4b) |
| `PATCH` | `/v1/online-orders/:id/confirm` | Confirm + create POS order (stub — Phase 4b) |

---

## Database Migrations

| Migration | What It Creates |
|---|---|
| V1 | `tenants`, `my_tenant_id()`, RLS baseline |
| V2 | `kitchen_tickets`, `ticket_items`, Realtime |
| V3 | `menus`, `menu_sections`, `menu_items`, `modifiers`, `pos_orders`, `pos_order_line_items`, `tabs`, `payments` |
| V4 | RLS policies across all tables |
| V5 | `domain_events` audit ledger |
| V6 | Realtime enable for key tables |
| V7 | `ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status` view |
| V8 | `course_hold_status`, `course_fire_log`, `order_course_status` view |
| V9 | `restock_purchase_orders`, `po_line_items`, `next_po_number()` RPC |
| V10 | Stripe columns on `payments` + `tenants`, `closed_at` trigger, Realtime on `payments` |
| V11 | Public anon read RLS on menu tables |
| V12 | `online_orders` — guest checkout, anon insert policy, Realtime |

---

## Phase Roadmap

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation & CI | ✅ |
| 1 | Auth & Tenant Shell | ✅ |
| 2 | POS Core | ✅ |
| 3 | KDS Course Firing & Analytics | ✅ |
| 4a | Public Menu Page + Cart | ✅ |
| 4b | Online Ordering Checkout | 📋 Next |
| 5 | Menu Builder (Admin UI) | 📋 |
| 6 | Staff Management + PIN Login | 📋 |
| 7 | Loyalty Program | 📋 |
| 8 | Stripe Terminal (Card-Present) | 📋 |
| 9 | AI Custom Prompt Library | 📋 |
| 10 | OSS Release | 📋 |

---

## Development Scripts

```bash
pnpm dev              # Start all apps + API in watch mode
pnpm build            # Production build
pnpm test             # Run all test suites (Bun)
pnpm lint             # ESLint across all packages
pnpm typecheck        # tsc --noEmit across all packages
pnpm run gen-types    # supabase gen types typescript
pnpm run seed         # Seed dev data
```

---

## Ground Rules

1. **No Flutter, no Gradle, no Flyway** — ever
2. **No on-device AI** — Anthropic API only, cloud-dependent
3. **Offline payments** = Stripe Terminal offline mode — not a custom sync engine
4. **Every DB table** gets `tenant_id` + RLS
5. **Every mutation** gets a timestamp + employee ID in `domain_events`
6. **Payments** use Stripe PaymentIntents — raw card data never touches the server
7. **No TODO comment** without a phase reference: `// TODO(phase-X): ...`
8. **MCP tools** validate inputs with Zod before any API call
9. Build the failure case first, then the happy path
10. Every commit updates the README

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

---

## AI Agent Directive

> **Phase:** 4b — Online Ordering Checkout  
> **Active build targets:** `GuestInfoForm`, `POST /v1/online-orders`, wire `CartDrawer` → `CheckoutDrawer` (Stripe)  
> **MCP servers to build:** `pos-server.ts`, `kds-server.ts`, `inventory-server.ts`, `admin-server.ts`, `payments-server.ts` — see MCP section above for full tool specs  
> **Never:** Gradle · Kotlin/JVM · Flyway · on-device AI models · raw card data on server  
> **Always:** `tenant_id` + RLS on new tables · `domain_events` audit on mutations · Zod on MCP tool inputs · PaymentIntents only  
> **Stack:** TypeScript · Hono · React · Vite · Supabase · Stripe · Resend · pnpm · Turborepo · GitHub Actions

---

*MIT License · © 2026 ShadowWalkerNC*
