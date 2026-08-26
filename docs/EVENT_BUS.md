# CulinaryOS — Event Bus

## Architecture

The event bus is **in-process, Supabase-persisted** in development. Every service that wants to emit an event calls:

```
POST /internal/events
Authorization: Bearer <INTERNAL_API_KEY>
X-Tenant-Id: <tenantId>
X-Caller-Service: pos

{ DomainEvent<T> }
```

The CulinaryOS backend receives it, persists it to `domain_events`, and fans out to registered handlers synchronously.

---

## Critical Flows

### 1. Order → Kitchen (POS → KDS)

```
POS fires order
  └→ emits pos:order:created
       └→ handleOrderCreated()
            ├→ groups items by (station, course)
            ├→ INSERT kitchen_tickets (one per group)
            ├→ INSERT ticket_items
            └→ UPDATE pos_orders.status = 'sent'
```

KDS web display picks up new tickets via:
- **Polling** (every 5s, current default)
- **Supabase Realtime** (upgrade path — call `subscribeToTicketUpdates()` from `realtime-bridge.ts`)

### 2. Ticket Bumped (KDS → POS)

```
Chef bumps ticket in KDS
  └→ KDS emits kds:ticket:bumped
       └→ handleTicketBumped()
            ├→ fetch all tickets for order
            ├→ if ALL bumped → UPDATE pos_orders.status = 'ready'
            └→ if SOME bumped → UPDATE pos_orders.status = 'in-progress'
```

POS server sees order status change; order card updates colour.

### 3. Item Sold (POS → RecipeOS)

```
POS marks order paid
  └→ emits pos:menu:item-sold (per line item with recipeId)
       └→ handleMenuItemSold()
            └→ POST RecipeOS /v1/pantry/deduct
                 (non-fatal if RecipeOS is down)
```

### 4. Low Stock (RecipeOS → CulinaryOS)

```
RecipeOS detects ingredient below reorder threshold
  └→ emits recipeos:pantry:low-stock
       └→ handleLowStock()
            └→ console.warn + future push notification
```

---

## Adding a New Handler

1. Create `packages/event-bus/src/handlers/my-handler.ts`
2. Export an `EventHandler<MyPayload>` function
3. Register it in `packages/event-bus/src/handlers/index.ts`
4. Add the `EventType` to `packages/shared/src/events.ts` if it's new

That's it. No infrastructure changes required in dev.

---

## Event Audit Log

Every event is stored in `public.domain_events`:

```sql
select event_type, source, processed, error, created_at
from domain_events
where tenant_id = 'your-tenant-id'
order by created_at desc
limit 50;
```

Use this for:
- Debugging missed events
- Replaying failed events (set `processed = false`, re-emit)
- Audit trail for support

---

## Upgrading to a Queue (Production)

Swap `dispatchToHandlers()` in `broker.ts` with a queue consumer:

| Option | Notes |
|---|---|
| **Supabase pg_cron** | Poll `domain_events WHERE processed = false` every N seconds |
| **BullMQ + Redis** | Full queue with retries, delays, dead-letter queue |
| **Supabase Edge Functions** | Trigger on `domain_events` INSERT via webhook |

The handler interface (`EventHandler<T>`) stays **identical** regardless of transport.
