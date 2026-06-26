# CulinaryOS

> **Restaurant operations platform** — POS · KDS · Inventory · Reporting · AI-assisted prep  
> TypeScript · React · Hono · Supabase · Turborepo · pnpm

![Phase](https://img.shields.io/badge/phase-6%20Reporting-blue)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## What It Is

CulinaryOS is a multi-tenant restaurant OS. One platform covers the full service cycle: a tablet POS for servers, a real-time kitchen display system (KDS) for cooks, an inventory/pantry tracker with automated purchase orders, an end-of-day reporting suite, an admin dashboard, an Android companion app (RecipeOS), and an AI-native MCP extension layer for Claude and other agents.

It is built as a TypeScript pnpm monorepo with Turborepo orchestration. All tenant data lives in Supabase (PostgreSQL + Realtime + Auth + RLS). The backend is a single Hono API gateway (`services/api`). The KDS, POS, and admin panels are separate React (Vite) apps that share component and utility packages.

---

## What’s Shipped

| Feature | Status | Details |
|---|---|---|
| Supabase schema V1–V9 | ✅ Shipped | Tenants, auth, POS, KDS, menu, event ledger, pantry, course firing, restock POs |
| Event bus | ✅ Shipped | 6 handlers, broker, Realtime bridge |
| Hono API gateway | ✅ Shipped | `services/api/src/index.ts` — all routes mounted, CORS, auth middleware |
| POS Core | ✅ Shipped | Orders, line items, send-to-kitchen |
| KDS ticket fire & bump | ✅ Shipped | `POST /v1/tickets/fire`, `PATCH /v1/tickets/:id/bump` |
| Course firing engine | ✅ Shipped | `initialHoldStatus()`, `checkAndAdvanceCourse()`, `manualFireCourse()` |
| KDS React app | ✅ Shipped | `apps/kds` — Station page, CourseHoldBanner, TicketCard, BumpButton, AnalyticsBar |
| KDS analytics endpoint | ✅ Shipped | `GET /v1/kds/stations/:id/analytics` — avg time, bump rate, queue depth, held count |
| Admin dashboard | ✅ Shipped | Overview, pantry alerts, event log |
| Pantry & inventory | ✅ Shipped | `GET /v1/pantry`, `/alerts`, `PATCH /adjust` |
| Restock PO workflow | ✅ Shipped | Draft → Approve → Send → Receive; auto-generate from low-stock alerts |
| Admin PO panel | ✅ Shipped | `apps/admin/src/pages/Pantry.tsx` — inventory table + PO cards with actions |
| EOD revenue report | ✅ Shipped | `GET /v1/reports/eod` — gross, net, voids, covers, hourly, top items, depletion |
| Range report | ✅ Shipped | `GET /v1/reports/range` — day-by-day totals across any date range |
| Beta program tables | ✅ Shipped | `beta_applications`, `beta_feedback`, `founding_customers` |
| MCP tools | ✅ Shipped | `fire_course`, `get_course_status`, `create_order`, `bump_ticket` |
| Online ordering | 📋 Phase 4 | Customer-facing React app, SSR, guest checkout |
| Stripe payments | 📋 Phase 7 | Checkout, receipts, captured payment on order close |

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
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Run migrations
supabase db reset

# 4. Start everything
pnpm dev          # Turborepo: API + all Vite apps in parallel

# 5. Open apps
# API     → http://localhost:3000/health
# POS     → http://localhost:5173
# KDS     → http://localhost:5174  (route /station/1)
# Admin   → http://localhost:5175
```

**Windows shortcuts:**
```bat
run-web.bat         # Start apps/web dev server
run-mcp-servers.bat # Compile & spawn MCP stdio servers
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    pnpm Monorepo (Turborepo)             │
│                                                         │
│  apps/pos   apps/kds   apps/admin   apps/web            │
│      │           │          │                          │
│      └───────────┴─────────┘                          │
│                  │                                      │
│       services/api (Hono · Node 20)                     │
│   /v1/pantry  /v1/reports  /v1/kds  /v1/tickets         │
│                  │                                      │
│     @culinaryos/event-bus  @culinaryos/db                │
│     @culinaryos/auth       @culinaryos/ui                │
│     @culinaryos/config                                   │
│                  │                                      │
│    Supabase (PostgreSQL · Realtime · Auth · RLS)        │
└─────────────────────────────────────────────────────────┘

mobile/recipeos  →  Android (Kotlin / Jetpack Compose / Room)
MCP servers      →  mcp/pos-server.ts, kds-server.ts, inventory-server.ts
```

| Layer | Technology |
|---|---|
| Monorepo orchestration | Turborepo + pnpm workspaces |
| API server | Hono (Node 20) — `services/api/src/index.ts` |
| Frontend apps | React 18 + Vite (ports 5173–5175) |
| Shared packages | `@culinaryos/db`, `event-bus`, `ui`, `auth`, `config` |
| Database | Supabase PostgreSQL (V1–V9 migrations, RLS, Realtime) |
| Android | Kotlin + Jetpack Compose + Room + Supabase-kt |
| AI extension | MCP stdio/SSE servers |
| CI/CD | GitHub Actions |

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health + version |
| `GET` | `/v1/pantry` | All ingredients + stock status |
| `GET` | `/v1/pantry/alerts` | Low-stock + out-of-stock only |
| `PATCH` | `/v1/pantry/:id/adjust` | Adjust qty + write ledger entry |
| `GET` | `/v1/pantry/purchase-orders` | All POs with line items |
| `POST` | `/v1/pantry/purchase-orders` | Create draft PO (`auto:true` from alerts) |
| `PATCH` | `/v1/pantry/purchase-orders/:id/approve` | Draft → Approved |
| `PATCH` | `/v1/pantry/purchase-orders/:id/send` | Approved → Sent |
| `PATCH` | `/v1/pantry/purchase-orders/:id/receive` | Sent → Received + restock |
| `DELETE` | `/v1/pantry/purchase-orders/:id` | Cancel draft or approved PO |
| `GET` | `/v1/kds/stations/:id/analytics` | Avg ticket time, bump rate, queue depth |
| `GET` | `/v1/reports/eod` | EOD summary — revenue, voids, covers, hourly, top items, depletion |
| `GET` | `/v1/reports/range` | Day-by-day revenue across any date range |

---

## Database Migrations

| Migration | What It Creates |
|---|---|
| V1 | `tenants`, `my_tenant_id()`, RLS baseline |
| V2 | `kitchen_tickets`, `ticket_items`, Realtime pub |
| V3 | `pos_orders`, `pos_order_line_items` |
| V4 | RLS policies across all tables |
| V5 | `domain_events` audit ledger |
| V6 | Realtime enable for key tables |
| V7 | `ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status` view |
| V8 | `course_hold_status`, `course_fire_log`, `order_course_status` view |
| V9 | `restock_purchase_orders`, `po_line_items`, `next_po_number()` RPC |

---

## Event Bus

| Event | From | Handled By |
|---|---|---|
| `pos:order:created` | POS | `handleOrderCreated` → fires KDS tickets |
| `kds:ticket:bumped` | KDS | `handleTicketBumped` → updates order status |
| `pos:order:cancelled` | POS | `handleOrderCancelled` → voids held tickets |
| `pos:menu:item-sold` | POS | `handleMenuItemSold` → deducts pantry stock |
| `kds:course:fired` | KDS / POS | `handleCourseFired` → advances order |
| `recipeos:pantry:low-stock` | RecipeOS | `handlePantryLowStock` → creates draft PO automatically |

---

## MCP Tools

| Tool | Server | Description |
|---|---|---|
| `create_order` | pos-server | Open a new POS order with line items |
| `fire_course` | pos-server | Manually fire the next course |
| `get_course_status` | kds-server | Return hold/fired state per course |
| `bump_ticket` | kds-server | Bump a completed kitchen ticket |
| `get_pantry_levels` | inventory-server | Return current pantry par status |
| `deduct_pantry_item` | inventory-server | Decrement an ingredient by quantity |

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

## Phase Roadmap

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation & CI | ✅ |
| 1 | Auth & Tenant Shell | ✅ |
| 2 | POS Core | ✅ |
| 3 | KDS Course Firing & Analytics | ✅ |
| 4 | Online Ordering | 📋 |
| 5 | Inventory & Restock POs | ✅ |
| 6 | Reporting | ✅ |
| 7 | Payments (Stripe) | 📋 Next |
| 8 | OSS Release | 📋 |
| 9 | SaaS Launch | 📋 |
| 10 | AI + Multi-Location | 📋 |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

---

## AI Agent Directive

> **Phase:** 7 — Stripe Payments  
> **Active build targets:** Stripe Elements checkout, `POST /v1/payments/capture`, receipt emails, order close on payment success  
> **Never:** duplicate `checkAndAdvanceCourse()` — lives only in `kds/server/lib/course-engine.ts`  
> **Never:** reference Gradle, Kotlin/JVM, or Flyway  
> **Always:** new DB tables require `tenant_id` column + RLS policies  
> **Always:** new event types registered in `@culinaryos/event-bus/src/broker.ts` before use  
> **Stack:** TypeScript · Hono · React · Vite · Supabase · pnpm · Turborepo · GitHub Actions

---

*MIT License · © 2026 ShadowWalkerNC*
