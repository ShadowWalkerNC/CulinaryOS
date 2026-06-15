# CulinaryOS — Architecture

> v1.0 — Frozen June 15, 2026

---

## Stack Defaults

| Layer | Technology | Notes |
|---|---|---|
| Shared business logic | Kotlin Multiplatform (KMP) | Shared across Android, iOS, Desktop, Backend |
| Operational clients | Compose Multiplatform | POS terminal, KDS display, admin panel |
| Customer ordering frontend | React / Next.js | Public-facing; separate deployment |
| Backend | Ktor (Kotlin) | REST + WebSocket server |
| Database | PostgreSQL | Primary persistent store |
| Realtime | WebSockets | Order routing, KDS ticket updates, status push |
| Auth | JWT + RBAC | Short-lived tokens, refresh rotation, tenant-scoped roles |
| Data model | Event-sourced, local-first | See Local-First section below |

---

## Local-First Event-Sourced Model

CulinaryOS is local-first. All operational clients (POS, KDS) write events to a local queue before syncing to the server. This guarantees the system remains fully functional during network interruption.

### What "local-first" means in practice

- An order can be created, modified, routed to kitchen stations, and marked complete with zero network connectivity.
- Events are immutable append-only records: `OrderPlaced`, `OrderLineAdded`, `TicketFired`, `TicketBumped`, `TicketCompleted`.
- The local event log is the source of truth for the client. The server log is the source of truth for the system.
- On reconnection, the client syncs its local queue to the server. The server processes and acknowledges each event.

### Conflict resolution

| Domain | Strategy |
|---|---|
| Order flow (non-financial) | Last-write-wins; local state applied immediately |
| Financial events (payment intents) | Server-authoritative; blocked until server confirms |
| Inventory reconciliation | Server-authoritative; local depletion is optimistic, reconciled on sync |
| Report finalization | Server-authoritative; reports generated server-side only |

---

## Server Authority — Protected Domains

These domains require a confirmed server round-trip before state is committed:

1. **Payment intents** — no payment record is final without server acknowledgment
2. **Inventory reconciliation** — stock levels are reconciled server-side on sync
3. **Report finalization** — all reports are generated from the server event log, not the client cache

All other domains use optimistic local-first writes.

---

## Auth & RBAC

- JWT issued at login, short-lived (15 min), with refresh token rotation
- All tokens are tenant-scoped — a user's token is valid only within their Organization
- Permissions are enforced at the API layer; client UI adjusts by role but never replaces server validation

### Roles

| Role | Access |
|---|---|
| `owner` | Full access including billing and org settings |
| `manager` | Ops, reporting, user management |
| `server` | POS, table management |
| `cook` | KDS only |
| `cashier` | POS, limited void |

---

## Deployment Topology (MVP)

```
[ Compose Multiplatform Client ]
  POS Terminal / KDS / Admin
         │ WebSocket + REST
         ▼
  [ Ktor Backend ]
         │
         ▼
  [ PostgreSQL ]

[ React / Next.js ]
  Customer Online Ordering
         │ REST
         ▼
  [ Ktor Backend ]
```

Single backend serves both operational clients and the customer ordering frontend. WebSocket connections are maintained by operational clients for realtime KDS routing and order status updates.
