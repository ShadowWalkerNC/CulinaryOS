# CulinaryOS — Build Order

> v1.0 — Frozen June 15, 2026

---

## Principle

Docs first. Scaffold second. Code third. No module is started until its domain model, API contract, and acceptance criteria are written. This document is the authoritative build sequence.

---

## Phase 0 — Foundation (Now)

- [x] Freeze Platform Blueprint v1.0
- [x] Write README
- [x] Write architecture.md
- [x] Write domain-model.md
- [x] Write build-order.md
- [ ] Initialize Kotlin Multiplatform project scaffold
- [ ] Set up Ktor backend skeleton (health check endpoint)
- [ ] Set up PostgreSQL schema migrations (Flyway or Liquibase)
- [ ] Set up JWT auth skeleton (issue + validate)
- [ ] Set up WebSocket connection handler skeleton
- [ ] CI pipeline (GitHub Actions — build + lint on push)

---

## Phase 1 — Auth + Tenant Shell

Goal: a working multi-tenant auth system. Nothing else matters until this is solid.

- [ ] Organization + Restaurant + User tables in PostgreSQL
- [ ] Registration and login endpoints
- [ ] JWT issue, refresh, and revoke
- [ ] RBAC middleware — role checked on every protected route
- [ ] Tenant isolation enforced at query layer (restaurantId scoping)
- [ ] Basic admin UI shell (Compose Multiplatform desktop)

---

## Phase 2 — POS Core

Goal: a server can take an order end-to-end.

- [ ] Menu item CRUD (admin)
- [ ] Table management CRUD (admin)
- [ ] Order + OrderLine creation
- [ ] Modifier support
- [ ] Discount, Void, Comp
- [ ] Local event queue (offline-first write)
- [ ] Sync on reconnect
- [ ] POS UI — Compose Multiplatform (table select → item select → send to kitchen)

---

## Phase 3 — KDS

Goal: kitchen receives and completes tickets in real time.

- [ ] Station configuration (admin)
- [ ] OrderLine → Station routing rules
- [ ] TicketEvent append-only log
- [ ] WebSocket push: FIRED event to station display
- [ ] KDS UI — Compose Multiplatform (ticket queue, bump, recall)
- [ ] CourseGroup support
- [ ] Expo station (conditional — only if modeled as display station)

---

## Phase 4 — Online Ordering

Goal: a customer can place a pickup or delivery order from the web.

- [ ] MenuSnapshot publish (versioned)
- [ ] React / Next.js customer ordering frontend
- [ ] CustomerOrder creation endpoint
- [ ] WebSocket push: OrderStatus to customer frontend
- [ ] Order injected into POS + KDS flow on receipt
- [ ] FulfillmentType: PICKUP | DELIVERY

---

## Phase 5 — Inventory

Goal: stock depletes automatically as orders are placed and alerts fire at par.

- [ ] InventoryItem + StorageLocation CRUD
- [ ] DepletionEvent on OrderLine commit
- [ ] ParLevel alerts
- [ ] ReorderRule engine
- [ ] Manual PurchaseOrder workflow
- [ ] Inventory reconciliation (server-authoritative)

---

## Phase 6 — Reporting

Goal: operator can review day's performance from the dashboard.

- [ ] SalesReport (by day / shift / station)
- [ ] DepletionReport
- [ ] VoidAndCompReport
- [ ] Operational Metrics dashboard (throughput, ticket times, top items)
- [ ] Report finalization server-side from event log

---

## Phase 7 — Payments (Prototype)

- [ ] PaymentIntent / Payment Record model
- [ ] CASH | CARD | OTHER method recording
- [ ] Receipt generation
- [ ] Amount + tip + total stored for reporting
- [ ] **No live card processing at MVP**

---

## Deferred (Post-MVP)

- Multi-location management UI
- Labor scheduling and labor analytics
- Full Stripe payment processing + terminal readers
- Advanced menu engineering and recipe costing integration
- RestRevive AI data bridge

---

## Definition of Done (per phase)

A phase is complete when:
1. All checklist items above are checked
2. Integration tests pass for all new endpoints
3. The domain is documented with any schema changes noted
4. A brief demo or screen recording exists showing the feature working end-to-end
