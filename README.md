# CulinaryOS

[![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/build.yml/badge.svg)](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/build.yml)
![Phase](https://img.shields.io/badge/phase-3%20KDS%20Core-teal)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%7C%20React%20%7C%20Supabase-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**CulinaryOS** is a multi-tenant restaurant operations SaaS. It runs the full operational loop of a restaurant — table-side ordering, kitchen fulfillment, pantry management, and operator reporting — on a single unified platform.

Every module shares the same tenant data model, the same Supabase auth layer, and the same event bus. No tool suite — one system.

---

## ⚡ Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS

# 2. Install all workspace dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, INTERNAL_API_KEY

# 4. Run all apps in dev mode (Turborepo)
pnpm dev

# 5. Or run a single service
pnpm --filter kds-server dev
pnpm --filter pos-client dev
```

> **Prerequisites:** Node 20+, pnpm 9+

---

## 🛠️ Startup Scripts (Windows)

- **`run-web.bat`** — Launches the KitchenFlow Web ERP React client at [http://localhost:3000/](http://localhost:3000/)
- **`run-mcp-servers.bat`** — Compiles TypeScript sources and spawns the POS, KDS, and Inventory MCP servers

---

## 📊 Build Progress

| Phase | Name | Status | Target |
|---|---|---|---|
| 0 | Foundation | ✅ Complete | Jun 20, 2026 |
| 1 | Auth & Tenant Shell | ✅ Complete | Jun 20, 2026 |
| 2 | POS Core | ✅ Complete | Jun 22, 2026 |
| 3 | KDS | 🔄 In Progress | Jul 13, 2026 |
| 4 | Online Ordering | ⏳ Pending | Aug 10, 2026 |
| 5 | Inventory | ⏳ Pending | Sep 7, 2026 |
| 6 | Reporting | ⏳ Pending | Sep 28, 2026 |
| 7 | Payments Prototype | ⏳ Pending | Oct 19, 2026 |
| 8 | Open-Source Release | ⏳ Pending | Nov 9, 2026 |
| 9 | SaaS Cloud Launch | ⏳ Pending | Dec 7, 2026 |
| 10 | AI + Multi-Location | ⏳ Pending | Feb 1, 2027 |

See [`docs/build-order.md`](docs/build-order.md) for full phase checklists, exit gates, and AI agent context.

---

## ✅ What's Shipped (as of June 26, 2026)

### Database — V1–V8 Migrations (Supabase / PostgreSQL)

| Migration | What It Adds |
|---|---|
| V1 `tenants` | Multi-tenant core, RLS, `my_tenant_id()` helper |
| V2 `kds_schema` | `kitchen_tickets`, `ticket_items`, station routing |
| V3 `pos_schema` | `pos_orders`, `pos_order_line_items`, table tracking |
| V4 `menu` | `menu_categories`, `menu_items`, modifier groups |
| V5 `auth` | JWT sessions, `tenant_users`, RBAC roles |
| V6 `event_bus` | `domain_events` audit ledger |
| V7 `pantry` | `pantry_items`, par levels, auto-depletion on order |
| V8 `course_firing` | `course_hold_status`, `held_at/fired_at`, `course_fire_log`, `order_course_status` view |

### Backend — Event Bus & API Servers

- **Event broker** with 6 registered handlers: `pos:order:created`, `kds:ticket:bumped`, `pos:order:cancelled`, `pos:menu:item-sold`, `kds:course:fired`, `recipeos:pantry:low-stock`
- **KDS server** (`kds/server`) — Hono-based REST API: ticket fire, bump, void, course status, station filters
- **POS server** (`pos/server`) — order lifecycle, `POST /fire-course` for server-triggered course advance
- **Supabase Realtime** — `kitchen_tickets`, `pos_orders`, and `course_fire_log` all on real-time publication; `useRealtimeTickets` + `useRealtimeOrders` + `useCourseFiredNotices` hooks
- **RecipeOS bridge** — pantry deduct endpoint, `recipeos:pantry:low-stock` event on par breach

### KDS — Course Firing Engine

Full course-by-course hold/fire system:
- Course 1 fires immediately to kitchen on order send
- Course 2+ tickets are held (`status = held`) until all tickets in the previous course are bumped
- Last course-N bump auto-triggers release of course N+1 via `checkAndAdvanceCourse()`
- `POST /v1/orders/:id/fire-course` — server manual override at the table
- `course_fire_log` — append-only audit of every fire event
- `CourseHoldBanner` component — amber hold indicator + green fire flash on KDS screen
- 20 unit tests covering hold logic, course sequencing, manual fire validation

### KDS — Kitchen Display System

- Station-routed ticket cards (hot, cold, pastry, bar, expo)
- Priority queue, bump-to-clear, void, rush flagging
- Ticket age timer + cook time recording on bump
- Held tickets hidden from default cook view (`?show_held=true` to reveal)
- `GET /v1/tickets/order/:id/courses` — per-order course status summary

### POS — Point of Sale

- Order lifecycle: open → sent → in-progress → ready → paid / voided
- Course-number assignment per line item at order send
- Line-item void with reason tracking
- Server name passed through to course fire log

### Admin Dashboard

- Live order overview, pantry low-stock alerts, event log viewer
- Order history with status breakdowns
- Real-time alert feed powered by `domain_events` Realtime subscription

### Beta Program

- `beta_applications` table — public intake form submissions
- `beta_feedback` table — in-app feedback with tenant scoping
- `ai_prompt_log` table — AI feature usage audit
- `founding_customers` table — founding tier tracking
- `extension_registry` table — tenant-scoped extension install records

---

## 🏗️ Architecture

| Layer | Technology |
|---|---|
| Monorepo build | **Turborepo + pnpm workspaces** |
| API servers (POS, KDS) | **Hono** (TypeScript, Node 20) |
| Web clients | **React + Vite** |
| Database | **Supabase (PostgreSQL)** with Row Level Security |
| Realtime push | **Supabase Realtime** (postgres_changes) |
| Auth | **Supabase Auth** + JWT + RBAC roles |
| Migrations | **Supabase migrations** (numbered, immutable) |
| Event bus | **In-process broker** — 6 domain event handlers |
| MCP extensions | **Stdio/SSE MCP servers** for POS, KDS, Inventory |
| Android app | **RecipeOS** (Kotlin / Room / Jetpack Compose) |
| CI | **GitHub Actions** |

### Tenant Isolation

Every database table uses Supabase Row Level Security (RLS). The `my_tenant_id()` helper function is the enforcement point — every query is scoped automatically. A query that bypasses RLS is a critical bug and will be rejected in PR review.

---

## 🔌 MCP Extensions & Microservices

| Extension / Server | Role | Transport | Key Tools |
|---|---|---|---|
| **pos-server** | Checkout, order lifecycle, course fire | STDIO / SSE | `create_order`, `fire_course`, `apply_loyalty_points` |
| **kds-server** | Ticket queue, course hold/fire, bump | STDIO / SSE | `fetch_kds_tickets`, `bump_kds_ticket`, `get_course_status` |
| **inventory-server** | Pantry levels, par alerts, audit counts | STDIO / SSE | `get_inventory_levels`, `log_audit_count` |
| **RecipeOS** | Recipe DB, pantry deduct, low-stock events | KMP Local / Room | 10 tools — recipes, pantry, prep, scaling |

---

## 👥 Roles

| Role | Access |
|---|---|
| `owner` | Full access including billing and tenant config |
| `manager` | Ops, reporting, user management |
| `server` | POS, table management, manual course fire |
| `cook` | KDS only — ticket view, bump, void |
| `cashier` | POS, limited void |

Permissions enforced server-side on every request. Client UI adjusts by role but the server always re-validates.

---

## 🏗️ Repository Structure

```
CulinaryOS/
├── README.md                         ← you are here
├── CONTRIBUTING.md                   ← branch strategy, commit format, PR checklist
├── CHANGELOG.md                      ← release notes
├── turbo.json                        ← Turborepo pipeline config
├── pnpm-workspace.yaml               ← pnpm monorepo workspace
├── package.json                      ← root scripts
├── docker-compose.yml                ← local dev: postgres + services
├── .env.example                      ← all required env vars documented
├── run-web.bat                       ← launch React ERP web client
├── run-mcp-servers.bat               ← compile & run MCP servers
│
├── supabase/
│   └── migrations/                   ← V1–V8 SQL migrations
│
├── backend/
│   ├── event-bus/                    ← broker.ts + 6 handlers
│   └── middleware/                   ← auth, tenant context, response helpers
│
├── kds/
│   └── server/
│       ├── lib/course-engine.ts      ← course hold/fire state machine
│       └── routes/tickets.ts         ← KDS REST API
│
├── pos/
│   └── server/
│       └── routes/orders.ts          ← POS REST API incl. fire-course
│
├── kds-client/                       ← KDS React app (Vite)
│   └── src/
│       ├── components/CourseHoldBanner.tsx
│       └── lib/realtime.ts           ← Supabase Realtime hooks
│
├── pos-client/                       ← POS React app (Vite)
├── admin-client/                     ← Admin dashboard React app
│
├── mcp/                              ← POS, KDS, Inventory MCP stdio servers
│
├── tests/
│   └── course-firing/engine.test.ts  ← 20 course firing unit tests
│
├── docs/                             ← Architecture, UI/UX, DB, AI specs
└── web/                              ← KitchenFlow Web ERP landing page
```

---

## 📁 Documentation Hub

| Doc | What It Covers |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Full stack decisions, Supabase setup, event bus spec |
| [`docs/build-order.md`](docs/build-order.md) | Phase checklists, exit gates, AI agent context |
| [`docs/mcp_architecture_spec.md`](docs/mcp_architecture_spec.md) | JSON-RPC schemas and tool specs for MCP servers |
| [`docs/track_a_ui_ux_specs.md`](docs/track_a_ui_ux_specs.md) | RecipeOS mobile UI/UX — Compose tokens, flows, wireframes |
| [`docs/track_a_room_schema.md`](docs/track_a_room_schema.md) | RecipeOS Room SQLite schema and sync metadata |
| [`docs/ai_features_spec.md`](docs/ai_features_spec.md) | AI Chef Assistant, KDS prioritization, smart 86 detection |
| [`docs/track_b_base44_entity_reference.md`](docs/track_b_base44_entity_reference.md) | POS/KDS/Inventory PostgreSQL entity reference |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch strategy, commit format, PR checklist |

---

## 🤝 Contributing

1. Branch from `main` using `feature/*`, `fix/*`, or `chore/*`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(kds): ...`)
3. All tests must pass: `pnpm test`
4. No unscoped DB queries — every query must filter by `tenant_id` (enforced by RLS)
5. Open a PR — CI must be green before merge

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for full instructions.

---

## 🤖 AI Agent Directive

> **Current phase:** Phase 3 — KDS Core
> **Current action:** Course firing complete. Next: restock POs, KDS analytics, end-of-day revenue report
> **Do NOT:** expand MVP scope · skip phase exit gates · store card data · write unscoped DB queries · reference Gradle or Kotlin/JVM server (fully removed)
> **Always:** use Supabase RLS — every insert/select must be tenant-scoped · write tests before marking tasks complete · use `checkAndAdvanceCourse()` for all course advance logic — never duplicate it inline
> **Stack:** TypeScript · Hono · React · Vite · Supabase (PostgreSQL + Realtime + Auth) · pnpm · Turborepo · GitHub Actions
> **MCP Extensions:** RecipeOS ([ShadowWalkerNC/RecipeOS](https://github.com/ShadowWalkerNC/RecipeOS))
> **GitHub:** https://github.com/ShadowWalkerNC/CulinaryOS

---

*Last updated: June 26, 2026 — v4.0*
