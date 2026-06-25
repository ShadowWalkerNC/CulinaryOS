# CulinaryOS — Architecture

> v3.0 — Updated June 22, 2026

---

## Governing Constraint

Restaurant software runs in hostile conditions: poor WiFi, rushed staff, mid-service emergencies, zero tolerance for downtime. Every architectural decision must survive that environment.

**The hardest requirement:** A cook must be able to receive and complete kitchen tickets even when the server is unreachable.

---

## Client Surface Map

| Client | Platform | Tech | Users | Connectivity |
|---|---|---|---|---|
| POS Terminal | Android tablet / JVM desktop | Compose Multiplatform (KMP) | Server, Cashier | Must work offline |
| KDS Display | Android tablet / JVM desktop | Compose Multiplatform (KMP) | Cook | Must work offline |
| Admin Panel | JVM desktop | Compose Desktop (KMP) | Manager, Owner | Online preferred |
| Customer Ordering | Web (iOS, Android, Desktop browser) | React / Next.js | Guest customer | Online required |
| Manager Dashboard | Web (iOS, Android, Desktop browser) | React / Next.js | Manager, Owner | Online preferred |
| RecipeOS Mobile | iOS + Android | React Native + Expo (TypeScript) | Chefs, food entrepreneurs | Offline-first |
| RecipeOS MCP | Node.js server | TypeScript | CulinaryOS AI agent | Online required |

Operational clients (POS, KDS, Admin) are **Compose Multiplatform** — full platform support on Android and JVM desktop.
Customer-facing and manager-facing web are **React / Next.js** — runs on all browsers (iOS, Android, Desktop).
RecipeOS is a **TypeScript / React Native** external module that integrates via MCP.

This split is intentional:
- Operational clients need offline capability, native device APIs (printer, scanner), and native-feel UI.
- Web clients need SEO, browser accessibility, and zero-install delivery across all platforms.
- RecipeOS operates independently but plugs into CulinaryOS as a registered MCP extension.

---

## Stack Decisions

### Kotlin Multiplatform (KMP) — `:shared` module

All business logic lives in `:shared` and compiles to Android + JVM.
This includes:
- `CulinaryEvent` — universal event envelope
- `LocalEventQueue` SQLDelight schema — the offline queue
- Domain value objects and validation rules

The backend (`:backend`) and all Compose clients import `:shared`.
This means a bug fixed in shared logic is fixed everywhere simultaneously.

### Ktor Backend — `:backend` module

Ktor is coroutine-native and shares Kotlin types directly with `:shared`.
No DTO translation layer needed between the backend and shared models.

Key Ktor plugins used:
- `Authentication` — JWT validation on every protected route
- `ContentNegotiation` — kotlinx.serialization JSON
- `StatusPages` — global exception → clean JSON error responses
- `WebSockets` — real-time KDS push (Phase 3)

### PostgreSQL + Exposed + Flyway

- **PostgreSQL** — ACID, UUID primary keys (`gen_random_uuid()`), append-only event tables
- **Exposed** — type-safe Kotlin DSL over JDBC; all queries are Kotlin, no raw SQL in application code
- **Flyway** — numbered, immutable migrations; runs automatically on startup; never edit a committed migration

Migration naming convention:
```
V1__baseline.sql          ← empty baseline
V2__auth_tenant.sql       ← Phase 1
V3__pos_core.sql          ← Phase 2
V4__kds.sql               ← Phase 3
V5__online_ordering.sql   ← Phase 4
V6__inventory.sql         ← Phase 5
V7__reporting.sql         ← Phase 6
V8__payments.sql          ← Phase 7
```

### SQLDelight — Local Event Queue

SQLDelight generates type-safe Kotlin from `.sq` files.
The local event queue (`LocalEventQueue.sq`) is a SQLite table that:
- Persists events across app crashes and device reboots
- Never deletes events — sets `synced_at` when server confirms
- Generates `insertEvent`, `selectPending`, `markSynced` as type-safe Kotlin functions

### React / Next.js — Web Clients

Customer ordering and manager dashboard are **React / Next.js** — SSR for SEO, runs on all browsers (iOS Safari, Android Chrome, Desktop).
No native app install required for customer-facing surfaces.

---

## Local-First Architecture

### The Rule

```
Write locally first → apply to UI immediately → sync to server in background
```

No user action in POS or KDS waits for a server round-trip.

### Event Flow

```
User action (e.g. place order)
  ↓
CulinaryEvent created with:
  - eventId: UUID v4 (client-generated)
  - restaurantId: from JWT
  - deviceId: terminal identifier
  - clientSequence: monotonic integer (never resets)
  - clientTimestamp: Unix epoch ms
  - type: ORDER_CREATED
  - payload: JSON
  ↓
Inserted into local_event_queue (SQLDelight)
  ↓
UI state updated optimistically
  ↓
Sync engine (background coroutine) picks it up
  ↓
POST /sync/events → server processes → assigns serverSequence
  ↓
local_event_queue.synced_at = now()
```

### Connectivity States

| State | POS Behavior | KDS Behavior |
|---|---|---|
| Online | Events sync in real time | Tickets delivered via WebSocket |
| Offline | Events queue locally, UI works normally | Last-known state shown; bumps queue locally |
| Reconnecting | Queue drains automatically, catch-up from server | Pulls all missed events since last ack |

### Server Authority Domains

Not everything is optimistic. These domains require a confirmed server round-trip:

| Domain | Rule |
|---|---|
| Financial events (Void, Comp, Discount, Payment) | Server blocks conflicting concurrent events (HTTP 409) |
| Inventory reconciliation | Server-authoritative only; client never resolves stock conflicts |
| Report generation | Always generated server-side from event log; never from client cache |

See [`docs/sync-protocol.md`](sync-protocol.md) for the complete conflict resolution specification.

---

## MCP Extensions

CulinaryOS supports external MCP servers that register tools for use by the AI agent layer.

### RecipeOS MCP Server

[RecipeOS](https://github.com/ShadowWalkerNC/RecipeOS) is the first registered MCP extension. It is a separate TypeScript application that exposes 10 tools to the CulinaryOS agent:

| Tool Category | Tools |
|---|---|
| Recipe | `list_recipes`, `get_recipe`, `create_recipe`, `scale_recipe` |
| Pantry | `list_pantry`, `check_ingredient`, `update_pantry_item` |
| Prep | `generate_prep_list`, `get_prep_list` |
| Scale | `scale_by_ratio` |

Phase 4 integration enables:
- Recipe → CulinaryOS MenuItem sync
- PantryItem → CulinaryOS purchasing module
- PrepList → CulinaryOS labor/shift planning
- Recipe steps → KDS display via WebSocket
- Joint auth: CulinaryOS JWT accepted by RecipeOS Supabase Edge Function

---

## Tenant Isolation

Every row in every table has a `restaurant_id` foreign key.
Every query in the application must filter by `restaurant_id`.

This is enforced architecturally via the `call.restaurantId()` Ktor extension:

```kotlin
// In plugins/Auth.kt — available on every authenticated call
fun ApplicationCall.restaurantId(): String =
    principal<JWTPrincipal>()
        ?.payload?.getClaim("restaurantId")?.asString()
        ?: throw SecurityException("restaurantId missing from token")
```

A PR that introduces a query without `restaurantId` scoping is a critical bug and will be rejected.

---

## WebSocket Outbox (Phase 3+)

To guarantee zero missed KDS tickets, the server uses a `pending_push` outbox table:

```
Event processed → row inserted in pending_push → WebSocket push sent
  → client acks → delivered_at set
  → on reconnect: client sends last ack ID → server replays all undelivered rows
```

This means a KDS display that was offline for 30 seconds will receive every ticket that fired during that window the moment it reconnects.

---

## Performance Targets

| Metric | Target |
|---|---|
| POS order → KDS ticket display | ≤ 500ms on local network |
| API p95 response (read endpoints) | ≤ 200ms |
| MenuSnapshot load (client in-memory cache) | ≤ 100ms |
| Offline POS order operations | Zero degradation |

---

## Security Defaults

- JWT: 15-minute access tokens, 7-day single-use refresh tokens (SHA-256 hashed in DB, never raw)
- BCrypt cost factor 12 for password hashing
- No card data stored at any phase before Phase 10
- All Flyway migrations are immutable — editing a committed migration causes a startup failure
- `restaurantId` scoping enforced at plugin layer — not per-developer
