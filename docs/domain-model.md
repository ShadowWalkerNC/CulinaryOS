# CulinaryOS — Domain Model (MVP)

> v1.0 — Frozen June 15, 2026

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
  ├── id, restaurantId, tableId, status, createdAt, closedAt
  ├── OrderLine[]
  │     ├── id, menuItemId, quantity, unitPrice, modifiers[]
  │     ├── Modifier { id, name, priceDelta }
  │     └── stationTarget[] (routing tags)
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
  └── orderLines[]
```

---

## Online Ordering Domain

```
CustomerOrder
  ├── id, restaurantId, customerId (nullable for guest), status
  ├── fulfillmentType: PICKUP | DELIVERY
  ├── items: OrderLine[]
  └── statusHistory[]

MenuSnapshot
  ├── id, restaurantId, publishedAt, version
  └── items[] (point-in-time copy of live menu)

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
  └── status: DRAFT | SUBMITTED | RECEIVED  (manual workflow at MVP)
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
  ├── throughput: ordersPerHour by station
  ├── ticketTimes: avg fire-to-complete by station
  └── topItems: top N menu items by quantity sold
```

> Labor scheduling and deep labor analytics are later-phase. Operational Metrics covers throughput, ticket times, and item performance only at MVP.

---

## Payments — Prototype Only

```
PaymentIntent / Payment Record (Prototype)
  ├── id, orderId, method: CASH | CARD | OTHER
  ├── amount, tip, total
  └── status: PENDING | COMPLETED
```

Real payment processing (Stripe, terminal readers, reconciliation) is **deferred**. MVP records payment method and amount for receipt generation and sales reporting only. No live card processing at MVP.
