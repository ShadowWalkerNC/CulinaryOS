# CulinaryOS — Sync Protocol Specification

> ⚠️ **PARTIALLY SUPERSEDED** — The SQLDelight/Kotlin sections describe the original KMP implementation.
> The offline-first **concept** (write locally → sync to server) still applies to the TypeScript implementation.
> In the TypeScript monorepo, the offline queue is `packages/shared/src/offline-sync.ts` (localStorage) and the sync path is `PATCH /v1/orders/:id/send`.
> See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/integration-spine.md`](integration-spine.md) for the current implementation.
>
> v1.0 — June 19, 2026

---

## Why This Document Exists

CulinaryOS operational clients (POS, KDS) write events locally first so the system works offline.
This document defines exactly how those local events are structured, queued, transmitted to the server,
and reconciled. Every developer and AI agent working on Phase 2+ must read this before touching sync code.

---

## Core Principle

**Local-first, server-authoritative.**

- Clients write events locally and apply them optimistically (UI updates immediately).
- Events are queued and synced to the server when connectivity resumes.
- The server is the authoritative source of truth for ordering, sequencing, and conflict resolution.
- The server never loses an event. The client never loses an event.

---

## Event Structure

Every event — whether written locally or received from the server — follows this structure:

```kotlin
data class CulinaryEvent(
    val eventId: String,          // Client-generated UUID v4 — globally unique
    val restaurantId: String,     // Tenant scope — ALWAYS present
    val deviceId: String,         // Identifies which POS/KDS terminal generated the event
    val clientSequence: Long,     // Monotonic integer per device, increments by 1 per event
                                  // Never resets. Survives app restart (persisted in SQLDelight).
    val clientTimestamp: Long,    // Unix epoch milliseconds — when event was created on device
    val type: String,             // e.g. ORDER_CREATED, ORDER_LINE_ADDED, TICKET_FIRED
    val aggregateId: String,      // The ID of the entity this event applies to (orderId, ticketId)
    val payload: String,          // JSON — event-type-specific data
    val syncedAt: Long?           // Null until confirmed by server. Set on server ack.
)
```

---

## Local Queue

The local queue is a **SQLDelight table** — not an in-memory list.
This guarantees events survive app crashes, device reboots, and OS kills.

```sql
CREATE TABLE local_event_queue (
    event_id       TEXT NOT NULL PRIMARY KEY,
    restaurant_id  TEXT NOT NULL,
    device_id      TEXT NOT NULL,
    client_seq     INTEGER NOT NULL,
    client_ts      INTEGER NOT NULL,
    type           TEXT NOT NULL,
    aggregate_id   TEXT NOT NULL,
    payload        TEXT NOT NULL,
    synced_at      INTEGER        -- NULL = pending sync
);
```

**Queue rules:**
- Events are written to the queue BEFORE any UI state update.
- Events are never deleted from the queue — `synced_at` is set when server confirms receipt.
- The queue is drained in `clientSequence` order per device.
- On startup, any event with `synced_at IS NULL` is immediately re-queued for transmission.

---

## Sync Engine

The sync engine is a background coroutine that runs continuously on all operational clients.

```
Loop:
  1. Check connectivity
  2. If offline → wait 5 seconds → retry
  3. If online  → query local_event_queue WHERE synced_at IS NULL ORDER BY client_seq ASC LIMIT 50
  4. POST /sync/events with batch of up to 50 events
  5. On HTTP 200 → mark all batched events synced_at = now()
  6. On HTTP 4xx → log error, do NOT retry (client bug — alert developer)
  7. On HTTP 5xx or timeout → exponential backoff: 1s, 2s, 4s, 8s, 16s, cap 60s
  8. Repeat
```

**Connectivity detection:**
- Android: `ConnectivityManager.NetworkCallback`
- Desktop (JVM): periodic HTTP HEAD to `/health` endpoint with 2-second timeout

---

## Server Sync Endpoint

```
POST /sync/events
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "deviceId": "pos-terminal-01",
  "events": [ ...array of CulinaryEvent... ]
}
```

**Server processing steps (atomic per batch):**
1. Validate JWT → extract `restaurantId`
2. Verify all events in batch have matching `restaurantId` → reject batch if mismatch (400)
3. Deduplicate by `eventId` — if event already exists in server log, skip silently (idempotent)
4. Assign `serverSequence` (global monotonic integer per restaurant) to each new event
5. Write all events to `server_event_log` table
6. Trigger domain handlers for each event type (order updates, KDS pushes, inventory depletion)
7. Return 200 with list of confirmed `eventId`s

```json
// Response
{
  "confirmed": ["uuid-1", "uuid-2", "uuid-3"],
  "serverSequence": 10042
}
```

---

## Server Event Log

```sql
CREATE TABLE server_event_log (
    event_id        TEXT NOT NULL PRIMARY KEY,
    restaurant_id   TEXT NOT NULL,
    device_id       TEXT NOT NULL,
    client_seq      INTEGER NOT NULL,
    server_seq      INTEGER NOT NULL,  -- server-assigned, globally ordered per restaurant
    client_ts       INTEGER NOT NULL,
    server_ts       INTEGER NOT NULL,  -- when server received and processed the event
    type            TEXT NOT NULL,
    aggregate_id    TEXT NOT NULL,
    payload         TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_server_event_device_seq
    ON server_event_log (restaurant_id, device_id, client_seq);
```

---

## Conflict Resolution Rules

| Event Domain | Conflict Rule |
|---|---|
| Order status changes | Last-server-received-wins |
| OrderLine add/remove | Last-server-received-wins |
| Ticket FIRED | Idempotent — duplicate FIRED for same ticket is silently ignored |
| Ticket BUMPED | Last-server-received-wins |
| **Financial events** (Void, Comp, Discount, Payment) | **Server blocks + alerts** — two devices cannot apply conflicting financial events to the same order; second attempt returns HTTP 409 with conflict detail |
| **Inventory depletion** | Server-authoritative reconciliation only — client never resolves stock conflicts |

---

## Reconnect Recovery (Client)

When a client reconnects after being offline:

1. Drain local queue (send all `synced_at IS NULL` events to server)
2. Request server catch-up: `GET /sync/catch-up?since=<lastKnownServerSeq>&restaurantId=<id>`
3. Server returns all events since that sequence number (other devices' events the client missed)
4. Client applies catch-up events to local state
5. Normal WebSocket subscription resumes

---

## WebSocket Push Outbox

For real-time KDS delivery, the server maintains a `pending_push` outbox.
This guarantees zero missed KDS tickets even if a display is briefly disconnected.

```sql
CREATE TABLE pending_push (
    id            BIGSERIAL PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    station_id    TEXT,               -- NULL = broadcast to all displays
    event_type    TEXT NOT NULL,
    payload       TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    delivered_at  TIMESTAMP           -- NULL = pending delivery
);
```

**Delivery flow:**
1. Event processed by server → row inserted into `pending_push`
2. WebSocket push sent to subscribed clients
3. Client acknowledges → `delivered_at` set
4. On reconnect → client sends last acknowledged `pending_push.id` → server replays all undelivered rows since that ID

---

## Event Type Registry

All valid event types. Expand this list as new phases add new domains.

| Event Type | Domain | Aggregate | Phase |
|---|---|---|---|
| `ORDER_CREATED` | POS | orderId | 2 |
| `ORDER_LINE_ADDED` | POS | orderId | 2 |
| `ORDER_LINE_REMOVED` | POS | orderId | 2 |
| `ORDER_DISCOUNT_APPLIED` | POS | orderId | 2 |
| `ORDER_VOIDED` | POS | orderId | 2 |
| `ORDER_COMPED` | POS | orderId | 2 |
| `TICKET_FIRED` | KDS | ticketId | 3 |
| `TICKET_BUMPED` | KDS | ticketId | 3 |
| `TICKET_RECALLED` | KDS | ticketId | 3 |
| `TICKET_COMPLETED` | KDS | ticketId | 3 |
| `COURSE_FIRED` | KDS | courseGroupId | 3 |
| `CUSTOMER_ORDER_PLACED` | Online | customerOrderId | 4 |
| `ORDER_STATUS_CHANGED` | Online | customerOrderId | 4 |
| `INVENTORY_DEPLETED` | Inventory | inventoryItemId | 5 |
| `INVENTORY_ADJUSTED` | Inventory | inventoryItemId | 5 |
| `PURCHASE_ORDER_RECEIVED` | Inventory | purchaseOrderId | 5 |
| `PAYMENT_RECORDED` | Payments | orderId | 7 |
