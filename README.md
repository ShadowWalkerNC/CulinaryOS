# CulinaryOS

> **Restaurant operations platform** — POS · KDS · Inventory · AI-assisted prep  
> TypeScript · React · Hono · Supabase · Turborepo · pnpm

![Phase](https://img.shields.io/badge/phase-3%20KDS%20Core-blue)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%2F%20React%20%2F%20Supabase-informational)
![License](https://img.shields.io/badge/license-MIT-green)
![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/ci.yml/badge.svg)

---

## What It Is

CulinaryOS is a multi-tenant restaurant OS. One platform covers the full service cycle: a tablet POS for servers, a real-time kitchen display system (KDS) for cooks, an inventory/pantry tracker, an admin dashboard, an Android companion app (RecipeOS), and an AI-native MCP extension layer for Claude and other agents.

It is built as a TypeScript pnpm monorepo with Turborepo orchestration. All tenant data lives in Supabase (PostgreSQL + Realtime + Auth + RLS). The backend is a single Hono API gateway. The KDS, POS, and admin panels are separate React (Vite) apps that share component and utility packages.

---

## What's Shipped

| Feature | Status | Details |
|---|---|---|
| Supabase schema V1–V8 | ✅ Shipped | Tenants, auth, POS, KDS, menu, event ledger, pantry, course firing |
| Event bus | ✅ Shipped | 6 handlers, broker, Realtime bridge |
| POS Core | ✅ Shipped | Orders, line items, send-to-kitchen |
| KDS ticket fire & bump | ✅ Shipped | `POST /v1/tickets/fire`, `PATCH /v1/tickets/:id/bump` |
| Course firing engine | ✅ Shipped | `initialHoldStatus()`, `checkAndAdvanceCourse()`, `manualFireCourse()` |
| `fire-course` endpoint | ✅ Shipped | `POST /v1/orders/:id/fire-course` — server manual override |
| Admin dashboard | ✅ Shipped | Overview, pantry alerts, event log |
| Beta program tables | ✅ Shipped | `beta_applications`, `beta_feedback`, `founding_customers` |
| MCP tools | ✅ Shipped | `fire_course`, `get_course_status`, `create_order`, `bump_ticket` |
| KDS course hold UI | 🔄 Phase 3 | `CourseHoldBanner`, held-ticket visual suppression |
| KDS analytics | 🔄 Phase 3 | Avg ticket time, bump rate per station |
| Restock POs | 🔄 Phase 3 | Pantry → par alert → purchase order workflow |
| EOD revenue report | 📋 Phase 6 | `/v1/reports/eod` |
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

# 3. Run migrations (Supabase CLI)
supabase db reset

# 4. Start everything
pnpm dev          # Turborepo fans out: API + all Vite apps in parallel

# 5. Open apps
# POS     → http://localhost:5173
# KDS     → http://localhost:5174
# Admin   → http://localhost:5175
# API     → http://localhost:3000/health
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
│  apps/          apps/kds    apps/admin    apps/web      │
│    pos ──────────────────────────────────────────┐      │
│                                                  │      │
│         services/api (Hono)  ◄──── MCP servers  │      │
│              │                                   │      │
│     @culinaryos/event-bus  @culinaryos/db        │      │
│     @culinaryos/auth       @culinaryos/ui  ◄─────┘      │
│     @culinaryos/config                                  │
│                                                         │
│              │                                          │
│        Supabase (PostgreSQL + Realtime + Auth)          │
└─────────────────────────────────────────────────────────┘

mobile/recipeos  →  Android (Kotlin / Jetpack Compose / Room)
```

| Layer | Technology |
|---|---|
| Monorepo orchestration | Turborepo + pnpm workspaces |
| API server | Hono (Node 20) |
| Frontend apps | React 18 + Vite |
| Shared packages | `@culinaryos/db`, `event-bus`, `ui`, `auth`, `config` |
| Database | Supabase PostgreSQL (V1–V8 migrations, RLS, Realtime) |
| Android | Kotlin + Jetpack Compose + Room + Supabase-kt |
| AI extension | MCP stdio/SSE servers |
| CI/CD | GitHub Actions |

---

## Workspace Layout

```
CulinaryOS/
├── apps/           ← pos, kds, admin, web (Vite + React)
├── services/       ← api (Hono), realtime-bridge
├── packages/       ← db, event-bus, ui, auth, config
├── kds/            ← course engine, station routing (server logic)
├── pos/            ← POS server routes
├── mcp/            ← MCP stdio server scripts
├── mobile/         ← RecipeOS Android app
├── extensions/     ← Tenant-installed extensions
├── extension_template/
├── cli/            ← Dev tooling (migrate, seed, gen-types)
├── tests/          ← Integration tests (Bun)
├── supabase/       ← migrations/, config.toml
└── docs/           ← Architecture, specs, sync protocol
```

Full annotated scaffolding: see [`docs/architecture.md`](./docs/architecture.md)

---

## Database Migrations

| Migration | What It Creates |
|---|---|
| V1 | `tenants`, `my_tenant_id()`, RLS baseline |
| V2 | `kitchen_tickets`, `ticket_items`, Realtime pub |
| V3 | `pos_orders`, `pos_order_line_items` |
| V4 | `menu_categories`, `menu_items`, `modifier_groups` |
| V5 | `jwt_sessions`, `tenant_users`, RBAC columns |
| V6 | `domain_events` audit ledger |
| V7 | `pantry_items`, par levels, auto-depletion hooks |
| V8 | `course_hold_status`, `course_fire_log`, `order_course_status` view |

**Migration rules:** never edit an existing migration — always add a new `V{N}__description.sql`. Every table requires RLS + a `tenant_id` column.

---

## Event Bus

| Event | From | Handled By |
|---|---|---|
| `pos:order:created` | POS | `handleOrderCreated` → fires KDS tickets |
| `kds:ticket:bumped` | KDS | `handleTicketBumped` → updates order status |
| `pos:order:cancelled` | POS | `handleOrderCancelled` → voids held tickets |
| `pos:menu:item-sold` | POS | `handleMenuItemSold` → deducts pantry stock |
| `kds:course:fired` | KDS / POS | `handleCourseFired` → advances order |
| `recipeos:pantry:low-stock` | RecipeOS | `handlePantryLowStock` → creates alert |

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
pnpm build            # Production build (all packages → services → apps)
pnpm test             # Run all test suites
pnpm lint             # ESLint across all packages
pnpm typecheck        # tsc --noEmit across all packages
pnpm run gen-types    # Regenerate Supabase TypeScript types
pnpm run seed         # Seed dev data
```

---

## Phase Roadmap

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation & CI | ✅ |
| 1 | Auth & Tenant Shell | ✅ |
| 2 | POS Core | ✅ |
| 3 | KDS Course Firing & Analytics | 🔄 In Progress |
| 4 | Online Ordering | 📋 |
| 5 | Inventory & Restock POs | 📋 |
| 6 | Reporting | 📋 |
| 7 | Payments (Stripe) | 📋 |
| 8 | OSS Release | 📋 |
| 9 | SaaS Launch | 📋 |
| 10 | AI + Multi-Location | 📋 |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Run `pnpm lint && pnpm typecheck && pnpm test` before opening a PR.

---

## AI Agent Directive

> **Phase:** 3 — KDS Core  
> **Active build targets:** KDS course hold UI (`CourseHoldBanner`), KDS analytics endpoint, restock PO workflow  
> **Never:** duplicate `checkAndAdvanceCourse()` — it lives only in `kds/server/lib/course-engine.ts`  
> **Never:** reference Gradle, Kotlin/JVM, or Flyway — those are legacy and fully removed  
> **Always:** new DB tables require `tenant_id` column + RLS policies  
> **Always:** new event types registered in `@culinaryos/event-bus/src/broker.ts` before use

---

*MIT License · © 2026 ShadowWalkerNC*
