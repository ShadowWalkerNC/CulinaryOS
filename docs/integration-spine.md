# POS → KDS → Pantry Integration Spine

> Canonical path as of the `apps/*` consolidation. Prefer this over older WebSocket/KMP docs.

## Happy path (Supabase configured)

```
POS useFireOrder()
  → PATCH /v1/orders/:id/send
  → handleIncomingEvent(pos:order:created)   # in-process
  → kitchen_tickets + ticket_items insert
  → KDS Supabase Realtime (kitchen_tickets)
```

## Demo path (no Supabase)

```
POS useFireOrder()  (localStorage order + snapshot body)
  → PATCH /v1/orders/:id/send  { order: { items… } }
  → apps/server mock kitchen store
  → KDS polls GET /v1/kds/tickets every 2s
```

## Rules

1. Never update `pos_orders.status = sent` from a client without calling `/send`.
2. Event payloads must include `lineItemId` on every item.
3. Pantry deduct goes to `CULINARYOS_URL/v1/pantry/deduct` (unified API).
4. `AUTH_RELAXED=true` (or placeholder Supabase URL) enables local header-only tenant auth.
