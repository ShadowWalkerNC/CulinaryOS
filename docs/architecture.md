# CulinaryOS — Architecture

> v2.0 — Updated August 2026 · Reflects the TypeScript monorepo consolidation (`apps/*`)
>
> **Note:** Older docs under `docs/` may reference Kotlin Multiplatform (KMP), Compose, Flyway, SQLDelight, or Ktor. Those describe a prior architecture. This document is authoritative.

---

## Governing Constraint

Restaurant software runs in hostile conditions: poor WiFi, rushed staff, mid-service emergencies, zero tolerance for downtime. Every architectural decision must survive that environment.

**The hardest requirement:** A cook must be able to receive and complete kitchen tickets even when the backend is unreachable. A server must be able to ring up and tender a check during a network outage.

---

## Stack Overview

| Layer | Technology |
|---|---|
| **Language** | TypeScript 5.x (all packages) |
| **Monorepo** | pnpm workspaces + Turborepo |
| **API** | Hono on Node.js 20 (`apps/server`) |
| **Web clients** | React + Vite + shadcn/ui + Tailwind CSS |
| **3D visualization** | Three.js (WebGL floor map in `packages/ui`) |
| **Database** | Supabase (PostgreSQL) — RLS enforced |
| **Auth** | Supabase Auth + PIN-based JWT sessions |
| **Realtime** | Supabase Realtime (Postgres changes) + API polling fallback |
| **Offline** | localStorage delta queue (`packages/shared/src/offline-sync.ts`) |
| **AI / Agents** | Anthropic Claude via MCP (strictly additive) |
| **Build** | Turborepo pipeline + Vite |
| **Container** | Docker + docker-compose |

---

## Client Surface Map

| Client | Platform | Tech | Users | Connectivity |
|---|---|---|---|---|
| POS Terminal | Web (tablet / desktop browser) | React + Vite + Three.js | Server, Cashier | **Offline-first** |
| KDS Display | Web (mounted display / tablet) | React + Vite | Cook | **Offline-capable** |
| Admin Panel | Web (desktop browser) | React + Vite | Manager, Owner | Online preferred |
| Online Ordering | Web (iOS, Android, Desktop) | React + Vite | Guest customer | Online required |
| Mobile Companion | iOS + Android | React Native + Expo | Staff | Stub — future |

All operational clients are **web-first React applications** built with Vite. No native app install is required for any operational surface. The mobile companion (`mobile/`) is an early stub.

---

## Monorepo Layout

```
CulinaryOS/
├── apps/
│   ├── server/          ← Hono API — the unified backend
│   ├── pos/             ← POS terminal (React + Vite + Three.js)
│   ├── kds/             ← Kitchen Display (React + Vite)
│   ├── admin/           ← Admin portal (React + Vite)
│   └── web/             ← Online ordering (React + Vite)
├── packages/
│   ├── shared/          ← Domain models, course-engine, dietary engine, offline-sync
│   ├── auth/            ← PIN auth, JWT helpers, managerGate RBAC
│   ├── db/              ← Supabase TypeScript types (V1–V14) + client factory
│   ├── event-bus/       ← Domain event broker, binary protocol, realtime bridge
│   ├── ratio-engine/    ← Pure culinary math (scaling, costing, waste, prep)
│   ├── ui/              ← Canonical shadcn/ui system + Three.js 3D floor map
│   └── config/          ← Shared environment constants
├── mcp/                 ← 9 MCP tool servers for AI agent operations
├── extensions/          ← First-party extension manifests
├── extension_template/  ← Public contract for third-party extensions
├── supabase/            ← Migrations (V1–V14) + seeds
└── tests/               ← Integration & E2E test suites
```

---

## API Layer — `apps/server` (Hono on Node.js 20)

The unified backend is a single **Hono** process exposing all REST routes. It handles:

- **Auth** — `POST /v1/auth/pin-login` · scrypt PIN validation · JWT session issuance
- **Orders** — `POST /v1/orders` · `PATCH /v1/orders/:id/send` (fires to kitchen)
- **KDS** — `GET /v1/kds/tickets` · `PATCH /v1/kds/tickets/:id/bump` · `POST /v1/orders/:id/fire-course`
- **Pantry** — `GET /v1/pantry` · `POST /v1/pantry/deduct` · `GET /v1/pantry/alerts` · `POST /v1/pantry/purchase-orders/auto-generate`
- **Ops** — `POST /v1/ops/waste` · `GET /v1/ops/waste/summary` · `GET /v1/ops/plate-economics` · `POST /v1/ops/loyalty`
- **Marketplace** — `GET /v1/marketplace/extensions` · `POST /v1/marketplace/extensions/:id/install`
- **AI (optional)** — `POST /v1/marketplace/ai/ops-insight` · `/prep-plan` · `/loyalty-message`

### Tenant Middleware

The Hono `requireTenant` middleware runs on every authenticated route. It:

1. Reads `X-Tenant-Id` header (or JWT claim in live mode).
2. Injects `tenantId` into the request context.
3. Rejects requests with `403` if tenant context is missing.

In **demo mode** (`AUTH_RELAXED=true` or placeholder Supabase URL), the middleware accepts any `X-Tenant-Id` header without JWT validation. This enables the full system to run without Supabase credentials.

---

## Database Layer — Supabase (PostgreSQL + RLS)

### Migrations

Numbered sequential migrations in `supabase/migrations/`:

| Migration | Scope |
|---|---|
| V1 | Baseline |
| V2 | Auth & tenant shell (organizations, restaurants, users) |
| V3 | POS core (menus, items, orders, tables) |
| V4 | KDS (kitchen_tickets, ticket_items) |
| V5 | Online ordering |
| V6 | Inventory / pantry |
| V11 | Event bus + domain_events table |
| V14 | `staff_pins`, `waste_events`, `plate_economics`; `my_tenant_id()` / `my_role()` SECURITY DEFINER |

Migrations are **forward-only**. Never edit a committed migration file — create a new one.

### Row Level Security (RLS)

Every table has RLS enabled. Policies use `my_tenant_id()` (a `SECURITY DEFINER` function set by V14) so RLS is enforced even when the service role bypasses normal auth flows.

An unscoped query that leaks cross-tenant data is the **highest-severity bug class** in CulinaryOS.

---

## Local-First Architecture

### The Rule

```
Write locally first → apply to UI immediately → sync to server in background
```

No user action in POS or KDS waits for a server round-trip in the critical path.

### POS Offline Queue

`packages/shared/src/offline-sync.ts` implements a **localStorage delta queue**:

1. User places order → stored locally as a `TransactionDelta`
2. UI updates immediately (optimistic)
3. Background sync engine drains the queue via `PATCH /v1/orders/:id/send`
4. On reconnect after outage: queue replays in insertion order with deduplication

### Connectivity States

| State | POS Behavior | KDS Behavior |
|---|---|---|
| Online | Orders sync to server in real-time | Tickets via Supabase Realtime |
| Offline | Orders queue locally, UI works normally | Last-known state shown; bumps queue locally |
| Reconnecting | Queue drains automatically | Pulls all missed tickets since last sync |

### Server Authority Domains

Some operations always require a confirmed server round-trip:

| Domain | Rule |
|---|---|
| Financial events (Void, Comp, Discount, Payment) | Server blocks conflicting concurrent events (HTTP 409) |
| Inventory reconciliation | Server-authoritative; client never resolves stock conflicts |
| Report generation | Always server-side from event log; never from client cache |

---

## Event Bus — `packages/event-bus`

The event bus is **in-process, Supabase-persisted** in production. Clients call `POST /v1/orders/:id/send` which the server handles synchronously — no separate message broker required in development.

### Critical Event Flows

#### 1. Order → Kitchen (POS → KDS)

```
POS useFireOrder()
  → PATCH /v1/orders/:id/send
  → handleOrderCreated(pos:order:created)
      ├─ groups items by (station, course)
      ├─ INSERT kitchen_tickets (one per station group)
      ├─ INSERT ticket_items
      └─ UPDATE pos_orders.status = 'sent'

KDS picks up new tickets via:
  • Supabase Realtime (kitchen_tickets table changes) — when Supabase is configured
  • GET /v1/kds/tickets polling every 2s — demo/offline fallback
```

#### 2. Ticket Bumped (KDS → POS)

```
Chef bumps ticket
  → PATCH /v1/kds/tickets/:id/bump
  → handleTicketBumped(kds:ticket:bumped)
      ├─ if ALL tickets bumped → pos_orders.status = 'ready'
      └─ if SOME bumped → pos_orders.status = 'in-progress'
```

#### 3. Item Sold → Pantry Deduct

```
POS marks order paid
  → emits pos:menu:item-sold (per line item with recipeId)
  → handleMenuItemSold()
  → POST /v1/pantry/deduct  (non-fatal if pantry is offline)
  → logs plate_economics row
```

### Adding a New Handler

1. Create `packages/event-bus/src/handlers/my-handler.ts`
2. Export an `EventHandler<MyPayload>` function
3. Register it in `packages/event-bus/src/handlers/index.ts`
4. Add the `EventType` to `packages/shared/src/events.ts` if it's new

---

## MCP Extension Layer — `mcp/`

CulinaryOS exposes live restaurant state to AI agents via **9 Model Context Protocol servers**:

| Server | File | Domain |
|---|---|---|
| `culinaryops-server` | `mcp/src/culinaryops-server.ts` | Operations, waste, food cost |
| `culinaryops-hub-live` | `mcp/src/culinaryops-hub-live.ts` | Live shift performance dashboard |
| `recipe-server` | `mcp/src/recipe-server.ts` | Recipes — list, get, scale, create |
| `inventory-server` | `mcp/src/inventory-server.ts` | Pantry stock levels, audit counts |
| `kds-server` | `mcp/src/kds-server.ts` | Kitchen tickets — fetch, bump, fire |
| `pos-server` | `mcp/src/pos-server.ts` | Orders — create, send, loyalty |
| `prep-server` | `mcp/src/prep-server.ts` | Shift prep plans, batch projections |
| `post-pilot-server` | `mcp/src/post-pilot-server.ts` | Loyalty balances, postcards, campaigns |

All MCP servers communicate with the unified API at `CULINARY_API_URL` (default: `http://localhost:3000`). They are AI-additive: the system runs fully without them.

---

## Multi-Tenant Architecture

CulinaryOS is designed from the ground up for multi-tenant operation. Each restaurant is a **tenant** with:

- Isolated PostgreSQL rows via `tenant_id` + RLS
- Isolated `my_tenant_id()` context in every Supabase function
- Isolated `X-Tenant-Id` header context in every Hono route

**Cross-tenant data exposure is the highest-severity bug class.** Any PR touching queries that span tenant boundaries requires DATABASE agent review.

---

## Performance Targets

| Metric | Target |
|---|---|
| POS order → KDS ticket display | ≤ 500ms on local network |
| API p95 response (read endpoints) | ≤ 200ms |
| MenuSnapshot load (client in-memory cache) | ≤ 100ms |
| Offline POS order operations | Zero degradation |

---

## Security Model

| Concern | Implementation |
|---|---|
| **Tenant isolation** | Supabase RLS + `my_tenant_id()` SECURITY DEFINER |
| **Terminal auth** | scrypt PIN hashing (`staff_pins` table) → JWT session |
| **API auth** | JWT (Supabase Auth) or `AUTH_RELAXED=true` in demo mode |
| **RBAC** | `managerGate()` in `packages/auth`; role claim in JWT |
| **Secrets** | `SUPABASE_SERVICE_ROLE_KEY` never exposed to browser; validated via `apps/server/src/lib/secrets.ts` |
| **Migrations** | Forward-only; immutable once committed |
| **Cross-tenant** | Any unscoped query is a critical security defect |

See [`docs/security.md`](security.md) for the full security specification.
