# CulinaryOS — Domain Model (MVP)

> ⚠️ **HISTORICAL REFERENCE** — This document describes the conceptual domain model from the original KMP era.
> The authoritative TypeScript schema types are in `packages/db/src/types.ts` (generated from Supabase migrations V1–V14).
> See [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for the current data layer.
>
> v1.1 — Updated June 19, 2026

---

## Tenant Hierarchy

```
Organization
  └── Restaurant
        └── Users
```

- `Organization` — top-level billing and access entity
- `Restaurant` — a single location; scopes all operational data
- `Users` — tenant-scoped; roles assigned per Restaurant

Multi-location (multiple Restaurants per Organization) is modeled from day one but the management UI is deferred post-MVP.

---

## POS Domain

```
Order
  ├── id
  ├── restaurantId          ← tenant scope key — ALWAYS present in every query
  ├── tableId
  ├── status: OPEN | CLOSED | VOIDED
  ├── receiptNumber         ← human-readable, auto-incremented per restaurant per day
  │                           format: RCP-YYYY-NNNN (e.g. RCP-2026-0001)
  │                           used for cash drawer reconciliation + customer disputes
  ├── createdAt
  ├── closedAt
  ├── OrderLine[]
  │     ├── id, menuItemId, quantity, unitPrice, modifiers[]
  │     ├── Modifier { id, name, priceDelta }
  │     └── stationTarget[]   ← routing tags assigned at order creation
  ├── Discount { type: PERCENT | FLAT, value, reason }
  ├── Void { lineId, reason, authorizedBy }
  └── Comp { lineId, reason, authorizedBy }

Table
  ├── id, restaurantId, name, section, capacity
  └── currentOrderId (nullable)
```

---

## KDS Domain

```
Station
  ├── id, restaurantId, name, type
  └── type: GRILL | FRY | SAUTE | EXPO* | CUSTOM
      * Expo is a Station only if it has its own display and routing rules.
        If Expo is a role (person watching a shared screen), it is not a Station entity.

TicketEvent (append-only)
  ├── id, orderId, stationId, eventType, occurredAt
  └── eventType: FIRED | BUMPED | RECALLED | COMPLETED

CourseGroup
  ├── id, orderId, courseNumber
  ├── firedAt               ← timestamp when course was fired to kitchen
  │                           required for avgFireToComplete metric in Reporting
  └── orderLines[]
```

---

## Online Ordering Domain

```
CustomerOrder
  ├── id, restaurantId, customerId (nullable for guest), status
  ├── fulfillmentType: PICKUP | DELIVERY
  ├── source: TABLE | ONLINE   ← all orders share one pipeline; source differentiates origin
  ├── items: OrderLine[]
  └── statusHistory[]

MenuSnapshot
  ├── id, restaurantId, publishedAt, version
  └── items[]   ← point-in-time copy of live menu; version mismatch triggers re-validation

OrderStatus (WebSocket push)
  ├── orderId, status, estimatedReadyAt
  └── status: RECEIVED | PREPARING | READY | COMPLETED
```

---

## Inventory Domain

```
InventoryItem
  ├── id, restaurantId, name, unit, currentStock, parLevel
  └── storageLocation: { id, name, type: DRY | COLD | FROZEN }

DepletionEvent (append-only, linked to OrderLine)
  ├── id, inventoryItemId, quantity, orderId, occurredAt
  └── source: SALE | WASTE | ADJUSTMENT

ReorderRule
  ├── id, inventoryItemId, triggerLevel, reorderQuantity
  └── preferredVendorId (nullable at MVP)

PurchaseOrder
  ├── id, restaurantId, status, createdAt
  ├── items: [ { inventoryItemId, quantity, unitCost } ]
  └── status: DRAFT | SUBMITTED | RECEIVED   ← manual workflow at MVP
```

---

## Reporting Domain — Operational Metrics

```
SalesReport
  ├── restaurantId, period: { start, end }, groupBy: DAY | SHIFT | STATION
  └── lines: [ { label, grossSales, netSales, orderCount, avgTicket } ]

DepletionReport
  ├── restaurantId, period
  └── lines: [ { inventoryItemId, name, totalDepleted, unit } ]

VoidAndCompReport
  ├── restaurantId, period
  └── lines: [ { type: VOID | COMP, amount, reason, authorizedBy, occurredAt } ]

OperationalMetricsDashboard
  ├── throughput:   ordersPerHour by station
  ├── ticketTimes:  avg firedAt → COMPLETED by station   ← uses CourseGroup.firedAt
  └── topItems:     top N menu items by quantity sold
```

> Labor scheduling and deep labor analytics are later-phase. Operational Metrics covers throughput, ticket times, and item performance only at MVP.

---

## Payments — Prototype Only

```
PaymentIntent / Payment Record (Prototype)
  ├── id
  ├── orderId
  ├── receiptNumber         ← foreign reference to Order.receiptNumber
  ├── method: CASH | CARD | OTHER
  ├── amount                ← order total due
  ├── tenderAmount          ← what customer physically handed over (cash)
  │                           change = tenderAmount - amount
  ├── tip
  ├── total                 ← amount + tip
  └── status: PENDING | COMPLETED
```

> Real payment processing (Stripe, terminal readers, reconciliation) is **deferred to Phase 10**.
> MVP records payment method and amount for receipt generation and sales reporting only.
> **No live card processing. No card data stored. PCI scope = zero at MVP.**

---

## Tenant Isolation Rule

> Every single database query in the entire system MUST include `restaurantId` as a filter.
> This is enforced at the Ktor plugin layer — not per-route, not per-developer.
> A query without `restaurantId` scoping is a critical bug, not a style issue.
