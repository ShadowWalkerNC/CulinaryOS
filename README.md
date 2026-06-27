# CulinaryOS

> **Web-based SaaS restaurant OS** — POS · KDS · Inventory · Reporting · Payments · Online Ordering  
> TypeScript · React · Hono · Supabase · Turborepo · pnpm

![Phase](https://img.shields.io/badge/phase-4b%20Online%20Ordering-blue)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## What It Is

CulinaryOS is a **web-based SaaS restaurant OS built in the Toast model** — React apps run on any tablet or browser, no native install required. One platform covers the full service cycle: tablet POS for servers, real-time KDS for kitchen staff, inventory and pantry tracking with automated purchase orders, end-of-day reporting, Stripe-powered payments with email receipts, a customer-facing online ordering storefront, an owner/manager admin back-office, an Android inventory companion app (RecipeOS), and a domain-split MCP server layer for AI agent access.

Built as a TypeScript pnpm monorepo orchestrated by Turborepo. All tenant data lives in Supabase (PostgreSQL + Realtime + Auth + Row-Level Security). The backend is a single Hono API gateway at `services/api`. All four frontend apps are React 18 + Vite and run in any modern browser — iPad, Android tablet, or desktop.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  pnpm Monorepo (Turborepo)                   │
│                                                             │
│  apps/pos      apps/kds     apps/admin    apps/web          │
│  POS tablet    KDS display  Back office   Public store      │
│  :5173         :5174        :5175         :5176             │
│      └──────────────┴────────────┴────────────┘             │
│                             │                               │
│              services/api  (Hono · Node 20 · :3000)         │
│         /v1/kds  /v1/pantry  /v1/reports  [+ below]        │
│                             │                               │
│       packages/@culinaryos/db · event-bus · ui · auth       │
│                             │                               │
│        Supabase  PostgreSQL · Realtime · Auth · RLS         │
└─────────────────────────────────────────────────────────────┘

mcp/                 →  Domain MCP servers  (TypeScript · @modelcontextprotocol/sdk)
mobile/recipeos      →  Android companion   (Kotlin · Jetpack Compose · Room · Supabase-kt)
supabase/functions/  →  Edge Functions      (Deno · Resend)
```

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| API gateway | Hono (Node 20) — `services/api/src/index.ts` |
| Frontend apps | React 18 + Vite — any browser / tablet (ports 5173–5176) |
| Shared packages | `@culinaryos/db`, `event-bus`, `ui`, `auth`, `config` |
| Database | Supabase PostgreSQL — V1–V12 migrations, RLS, Realtime |
| Online payments | Stripe Elements + PaymentIntents (card-not-present) |
| In-venue payments | Stripe Terminal — built-in offline mode covers network drops |
| Email | Resend via `supabase/functions/send-receipt` (Deno Edge Function) |
| AI | Anthropic API (claude-sonnet) — Custom Prompt Library, cloud-only, no on-device model |
| Android companion | Kotlin + Jetpack Compose + Room + Supabase-kt |
| MCP layer | TypeScript stdio/SSE servers (`@modelcontextprotocol/sdk`) |
| CI/CD | GitHub Actions |

---

## Current Build State

### ✅ Fully Shipped

| Area | What's Working |
|---|---|
| **Supabase schema V1–V12** | Tenants, POS orders, KDS tickets, menu, event ledger, pantry, POs, Stripe columns, public RLS, online_orders table |
| **API gateway** | Hono app with CORS, auth middleware, logger — `services/api/src/index.ts` |
| **KDS analytics route** | `GET /v1/kds/stations/:id/analytics` — avg ticket time, bump rate, queue depth, held count |
| **Pantry routes** | `GET /v1/pantry`, `/alerts`, `PATCH /:id/adjust`, full PO CRUD (draft → approve → send → receive → cancel) |
| **Reports routes** | `GET /v1/reports/eod`, `GET /v1/reports/range` |
| **KDS React app** | `apps/kds` — StationPage, CourseHoldBanner, TicketCard, BumpButton, AnalyticsBar |
| **KDS course engine** | `initialHoldStatus()`, `checkAndAdvanceCourse()`, `manualFireCourse()` — lives in `packages/kds-server/lib/course-engine.ts` only |
| **Admin dashboard** | `apps/admin` — overview, pantry alerts, event log, PO panel |
| **POS core** | `apps/pos` — orders, line items, send-to-kitchen, CheckoutDrawer (Stripe Elements) |
| **Public menu page** | `apps/web` — `/menu/:slug`, sticky scroll-spy nav, allergen badges, modifier picker, cart FAB, cart drawer |
| **MCP unified server** | `mcp/culinary-os-server.ts` — `fire_course`, `get_course_status`, `create_order`, `bump_ticket`, `get_pantry_levels`, `deduct_pantry_item` |

### ⚠️ Route Files Exist — Not Yet Mounted in `index.ts`

These route files are written and complete but have not been added to `services/api/src/index.ts` yet. They will be mounted as part of Phase 4b.

| File | Routes Inside |
|---|---|
| `services/api/src/routes/payments.ts` | `POST /v1/payments/checkout`, `POST /v1/payments/capture`, `POST /v1/payments/refund`, `GET /v1/payments/:orderId` |
| `services/api/src/routes/menu.ts` | `GET /v1/menu/:tenantSlug`, `GET /v1/menu/:tenantSlug/item/:itemId` |
| `services/api/src/routes/online-orders.ts` | `POST /v1/online-orders`, `GET /v1/online-orders`, `PATCH /v1/online-orders/:id/confirm`, `/ready`, `/complete`, `/cancel` — all Phase 4b stubs returning 501 |

### 📋 Upcoming

| Phase | Feature |
|---|---|
| **4b** | Mount unmounted routes · implement `GuestInfoForm` · `POST /v1/online-orders` logic · wire `CartDrawer` → `CheckoutDrawer` (Stripe) |
| **5** | Menu builder admin UI — create/edit menus, sections, items, modifiers |
| **6** | Staff management — PIN login per terminal, roles, clock in/out |
| **7** | Loyalty program — phone-hash lookup, points, win-back campaigns |
| **8** | Stripe Terminal — card-present in-venue payments |
| **9** | AI Custom Prompt Library — Anthropic-powered operator tools |
| **10** | OSS release — full seed data, docs, Northern Fixins demo instance |

---

## API Routes

Routes marked ⚠️ exist in route files but are **not yet mounted** in `index.ts`.

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
| `DELETE` | `/v1/pantry/purchase-orders/:id` | ✅ Live | Cancel draft or approved PO |
| `GET` | `/v1/reports/eod` | ✅ Live | EOD revenue summary |
| `GET` | `/v1/reports/range` | ✅ Live | Day-by-day revenue across date range |
| `POST` | `/v1/payments/checkout` | ⚠️ Not mounted | Create Stripe PaymentIntent |
| `POST` | `/v1/payments/capture` | ⚠️ Not mounted | Capture payment, close order, send receipt |
| `POST` | `/v1/payments/refund` | ⚠️ Not mounted | Full or partial refund |
| `GET` | `/v1/payments/:orderId` | ⚠️ Not mounted | Payments for an order |
| `GET` | `/v1/menu/:tenantSlug` | ⚠️ Not mounted | Public active menu (anon, cached 60s) |
| `GET` | `/v1/menu/:tenantSlug/item/:itemId` | ⚠️ Not mounted | Single item + modifier groups |
| `POST` | `/v1/online-orders` | ⚠️ Not mounted + stub | Guest places order — Phase 4b |
| `GET` | `/v1/online-orders` | ⚠️ Not mounted + stub | Tenant lists incoming orders — Phase 4b |
| `PATCH` | `/v1/online-orders/:id/confirm` | ⚠️ Not mounted + stub | Confirm + create POS order — Phase 4b |
| `PATCH` | `/v1/online-orders/:id/ready` | ⚠️ Not mounted + stub | Mark ready for pickup — Phase 4b |
| `PATCH` | `/v1/online-orders/:id/complete` | ⚠️ Not mounted + stub | Mark completed — Phase 4b |
| `PATCH` | `/v1/online-orders/:id/cancel` | ⚠️ Not mounted + stub | Cancel with reason — Phase 4b |

---

## Database Migrations

| Migration | What It Creates |
|---|---|
| V1 | `tenants`, `my_tenant_id()`, RLS baseline |
| V2 | `kitchen_tickets`, `ticket_items`, Realtime publication |
| V3 | `menus`, `menu_sections`, `menu_items`, `modifier_groups`, `modifiers`, `pos_orders`, `pos_order_line_items`, `tabs`, `payments` |
| V4 | RLS policies across all tables |
| V5 | `domain_events` append-only audit ledger |
| V6 | Realtime enabled for key tables |
| V7 | `ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status` view |
| V8 | `course_hold_status`, `course_fire_log`, `order_course_status` view |
| V9 | `restock_purchase_orders`, `po_line_items`, `next_po_number()` RPC |
| V10 | Stripe columns on `payments` + `tenants`; `closed_at` trigger on `pos_orders`; Realtime on `payments` |
| V11 | Public anon read RLS on `menus`, `menu_sections`, `menu_items`, `modifier_groups`, `modifiers` |
| V12 | `online_orders` — guest name/email/phone, items JSONB, status machine, anon insert policy, Realtime |

---

## MCP Server Architecture

CulinaryOS exposes its full operation layer as domain-split MCP servers. Any MCP-compatible AI agent — Claude Desktop, Cursor, Copilot, custom — can connect and operate the platform.

### Connection Model

```
AI Agent  (Claude Desktop / Cursor / custom)
    │
    │  stdio transport  (or SSE for admin-server)
    ▼
mcp/<domain>-server.ts
    │  Zod-validates input → fetch() to services/api → returns structured JSON
    │
    │  HTTP  Authorization: Bearer $CULINARYOS_API_KEY
    ▼
services/api  (Hono · :3000)
    │
    ▼
Supabase  (PostgreSQL + Realtime)
```

**Shared conventions — every server, no exceptions:**

```typescript
// 1. Validate input with Zod before any API call
const input = InputSchema.parse(request.params.arguments);

// 2. Always send auth header
const res = await fetch(`${API_URL}/v1/...`, {
  headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
});

// 3. Throw with context on non-2xx
if (!res.ok) {
  const err = await res.json().catch(() => ({ error: res.statusText }));
  throw new Error(`[culinaryos] API ${res.status}: ${err.error}`);
}

// 4. Return format
return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };

// 5. No `any`. No implicit returns. No silent failures.
```

---

### ✅ `mcp/culinary-os-server.ts` — Unified server (shipped)

Current single-file server. Will be refactored into domain servers below as each phase ships.

| Tool | Description |
|---|---|
| `create_order` | Open a new POS order with line items |
| `fire_course` | Manually fire the next course to KDS |
| `get_course_status` | Return hold/fired state per course |
| `bump_ticket` | Bump a completed kitchen ticket |
| `get_pantry_levels` | Return current pantry par status |
| `deduct_pantry_item` | Decrement an ingredient by quantity |

---

### 📋 `mcp/pos-server.ts` — POS Domain
**Transport:** stdio | **Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input Schema | API Call | Description |
|---|---|---|---|
| `create_order` | `{ table?, order_type: 'dine_in'\|'takeout'\|'delivery', items: [{menu_item_id, qty, modifiers?}] }` | `POST /v1/pos/orders` | Open a new order with line items |
| `add_item` | `{ order_id, menu_item_id, qty, modifiers? }` | `POST /v1/pos/orders/:id/items` | Add item to an open order |
| `void_item` | `{ order_id, line_item_id, reason }` | `DELETE /v1/pos/orders/:id/items/:itemId` | Void a line item — writes to `domain_events` with reason |
| `fire_course` | `{ order_id, course_number }` | `POST /v1/tickets/fire` | Fire a course to KDS — emits `kds:course:fired` via event bus |
| `get_order` | `{ order_id }` | `GET /v1/pos/orders/:id` | Full order with items and status |
| `close_order` | `{ order_id }` | `PATCH /v1/pos/orders/:id/close` | Mark order paid and closed |
| `get_open_orders` | `{ limit? }` | `GET /v1/pos/orders?status=open` | All open orders for the tenant |

> `void_item` and `close_order` must verify `order.status === 'open'` before executing. `fire_course` must emit through the event bus — never write directly to `kitchen_tickets`.

---

### 📋 `mcp/kds-server.ts` — Kitchen Display Domain
**Transport:** stdio | **Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input Schema | API Call | Description |
|---|---|---|---|
| `get_tickets` | `{ station_id?, status?: 'open'\|'in_progress'\|'ready' }` | `GET /v1/kds/tickets` | List tickets for a station |
| `bump_ticket` | `{ ticket_id }` | `PATCH /v1/tickets/:id/bump` | Bump ticket — emits `kds:ticket:bumped` via event bus |
| `get_course_status` | `{ order_id }` | `GET /v1/kds/orders/:id/courses` | Hold/fired state per course |
| `get_station_analytics` | `{ station_id, period?: 'shift'\|'day' }` | `GET /v1/kds/stations/:id/analytics` | Returns `avg_time_seconds`, `bump_rate`, `queue_depth`, `held_count` |
| `remake_ticket` | `{ ticket_id, reason }` | `POST /v1/kds/tickets/:id/remake` | Log a remake — writes waste event to `domain_events` |

> `bump_ticket` must emit `kds:ticket:bumped` through the event bus. Do not write directly to `kitchen_tickets`. Ticket age thresholds are config values, not hardcoded numbers.

---

### 📋 `mcp/inventory-server.ts` — Inventory & Pantry Domain
**Transport:** stdio | **Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input Schema | API Call | Description |
|---|---|---|---|
| `get_pantry_levels` | `{ category? }` | `GET /v1/pantry` | All ingredients with stock level and par status |
| `get_low_stock_alerts` | `{}` | `GET /v1/pantry/alerts` | Items at or below reorder point |
| `deduct_pantry_item` | `{ ingredient_id, qty, reason: 'sale'\|'waste'\|'adjustment' }` | `PATCH /v1/pantry/:id/adjust` | Write a negative delta with reason code |
| `receive_delivery` | `{ items: [{ingredient_id, qty, unit_cost?}] }` | `POST /v1/pantry/receive` | Write positive delta for received stock |
| `create_purchase_order` | `{ auto?: boolean, items?: [{ingredient_id, qty}] }` | `POST /v1/pantry/purchase-orders` | Draft PO — `auto:true` generates from current alerts |
| `get_purchase_orders` | `{ status?: 'draft'\|'approved'\|'sent'\|'received' }` | `GET /v1/pantry/purchase-orders` | List POs by status |
| `approve_purchase_order` | `{ po_id }` | `PATCH /v1/pantry/purchase-orders/:id/approve` | Advance PO from draft to approved |

> Stock is never stored as a single mutable field. Every mutation writes a delta row to `pantry_ledger`. Running totals are computed as `SUM(delta)` over the ledger. `reason: 'waste'` writes a full `domain_events` record.

---

### 📋 `mcp/admin-server.ts` — Admin & Reporting Domain
**Transport:** stdio + SSE | **Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`

| Tool | Input Schema | API Call | Description |
|---|---|---|---|
| `get_eod_report` | `{ date? }` | `GET /v1/reports/eod` | EOD summary — revenue, voids, covers, hourly, top items |
| `get_range_report` | `{ from, to }` | `GET /v1/reports/range` | Day-by-day totals across a date range |
| `get_menu` | `{ include_unavailable? }` | `GET /v1/menu/:slug` | Full active menu with sections, items, modifiers |
| `set_item_availability` | `{ menu_item_id, available: boolean }` | `PATCH /v1/menu/items/:id` | 86 an item or restore it |
| `get_online_orders` | `{ status?, limit? }` | `GET /v1/online-orders` | Incoming online orders for the tenant |
| `confirm_online_order` | `{ online_order_id }` | `PATCH /v1/online-orders/:id/confirm` | Confirm order + auto-create POS ticket |

> `set_item_availability` propagates immediately to `apps/pos` and `apps/kds` via Supabase Realtime. Report tools must return a plain-English summary alongside raw data. SSE transport requires `Authorization` header validation before streaming.

---

### 📋 `mcp/payments-server.ts` — Payments Domain
**Transport:** stdio | **Env:** `CULINARYOS_API_URL`, `CULINARYOS_API_KEY`, `CULINARYOS_TENANT_ID`, `STRIPE_SECRET_KEY`

| Tool | Input Schema | API Call | Description |
|---|---|---|---|
| `create_checkout` | `{ order_id, tip_percent? }` | `POST /v1/payments/checkout` | Create Stripe PaymentIntent — returns `client_secret` |
| `capture_payment` | `{ order_id, payment_intent_id }` | `POST /v1/payments/capture` | Verify `status === 'succeeded'`, close order, fire receipt |
| `refund_payment` | `{ order_id, amount_cents?, reason }` | `POST /v1/payments/refund` | Full or partial Stripe refund |
| `get_payment_status` | `{ order_id }` | `GET /v1/payments/:orderId` | All payments and current status for an order |

> Raw card data **never** passes through any MCP tool — PaymentIntents only. `capture_payment` must confirm `payment_intent.status === 'succeeded'` before closing the order. Every payment mutation writes to `domain_events` with amount, method, and employee ID.

---

### Running MCP Servers

```bash
pnpm --filter mcp build          # compile all servers

node mcp/dist/pos-server.js      # stdio — POS domain
node mcp/dist/kds-server.js      # stdio — KDS domain
node mcp/dist/inventory-server.js
node mcp/dist/admin-server.js    # stdio + SSE
node mcp/dist/payments-server.js

run-mcp-servers.bat              # Windows: compile + launch all
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "culinaryos-pos": {
      "command": "node",
      "args": ["path/to/CulinaryOS/mcp/dist/pos-server.js"],
      "env": {
        "CULINARYOS_API_URL": "http://localhost:3000",
        "CULINARYOS_API_KEY": "your-service-role-key",
        "CULINARYOS_TENANT_ID": "your-tenant-uuid"
      }
    },
    "culinaryos-kds":       { "command": "node", "args": ["mcp/dist/kds-server.js"],       "env": { "CULINARYOS_API_URL": "...", "CULINARYOS_API_KEY": "..." } },
    "culinaryos-inventory": { "command": "node", "args": ["mcp/dist/inventory-server.js"], "env": { "CULINARYOS_API_URL": "...", "CULINARYOS_API_KEY": "..." } },
    "culinaryos-admin":     { "command": "node", "args": ["mcp/dist/admin-server.js"],     "env": { "CULINARYOS_API_URL": "...", "CULINARYOS_API_KEY": "..." } },
    "culinaryos-payments":  { "command": "node", "args": ["mcp/dist/payments-server.js"],  "env": { "CULINARYOS_API_URL": "...", "CULINARYOS_API_KEY": "...", "STRIPE_SECRET_KEY": "..." } }
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
# Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Required: STRIPE_SECRET_KEY, VITE_STRIPE_PUBLISHABLE_KEY
# Required: RESEND_API_KEY

supabase db reset    # applies V1–V12 migrations + seed.sql
pnpm dev             # Turborepo: API + all four Vite apps in parallel

# API         → http://localhost:3000/health
# POS         → http://localhost:5173
# KDS         → http://localhost:5174
# Admin       → http://localhost:5175
# Web (menu)  → http://localhost:5176/menu/:slug
```

---

## Development Scripts

```bash
pnpm dev          # all apps + API in watch mode
pnpm build        # production build
pnpm test         # Bun test suites
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm run gen-types  # supabase gen types typescript
pnpm run seed       # seed dev data
```

---

## Phase Roadmap

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation & CI | ✅ |
| 1 | Auth & Tenant Shell | ✅ |
| 2 | POS Core | ✅ |
| 3 | KDS Course Firing & Analytics | ✅ |
| 4a | Public Menu Page + Cart | ✅ |
| **4b** | **Online Ordering Checkout** | **📋 Next** |
| 5 | Menu Builder (Admin UI) | 📋 |
| 6 | Staff Management + PIN Login | 📋 |
| 7 | Loyalty Program | 📋 |
| 8 | Stripe Terminal (Card-Present) | 📋 |
| 9 | AI Custom Prompt Library | 📋 |
| 10 | OSS Release + Northern Fixins Demo | 📋 |

---

## Ground Rules

1. **No Flutter, no Gradle, no Flyway** — ever
2. **No on-device AI** — Anthropic API only, gracefully absent offline
3. **Offline payments** = Stripe Terminal offline mode — not a custom sync engine
4. **Every new DB table** requires `tenant_id uuid not null` + RLS policies
5. **Every state mutation** writes to `domain_events` with `employee_id` + UTC timestamp
6. **Payments** use Stripe PaymentIntents — raw card data never touches this server
7. **No TODO comment** without a phase reference: `// TODO(phase-X): description`
8. **MCP tools** validate all inputs with Zod before any API call
9. Build the failure case first, then the happy path
10. Every commit updates this README

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

---

## AI Agent Directive

> **Current phase:** 4b — Online Ordering Checkout  
> **Immediate targets:**  
> — Mount `paymentsRoutes`, `menuRoutes`, `onlineOrdersRoutes` in `services/api/src/index.ts`  
> — Implement `POST /v1/online-orders` logic (validate → insert → create PaymentIntent → return `client_secret`)  
> — Implement `GuestInfoForm.tsx` with validation  
> — Wire `CartDrawer` → `CheckoutPage` → Stripe `CheckoutDrawer` → confirmation  
> **MCP servers to build:** `pos-server.ts`, `kds-server.ts`, `inventory-server.ts`, `admin-server.ts`, `payments-server.ts` — full specs in MCP section above  
> **Never:** Gradle · Kotlin/JVM · Flyway · on-device AI · raw card data on server · direct DB writes from MCP tools (always go through `services/api`)  
> **Always:** `tenant_id` + RLS · `domain_events` audit trail · Zod on MCP inputs · PaymentIntents only · update README on every commit  
> **Stack:** TypeScript · Hono · React 18 · Vite · Supabase · Stripe · Resend · pnpm · Turborepo · GitHub Actions

---

*MIT License · © 2026 ShadowWalkerNC*
