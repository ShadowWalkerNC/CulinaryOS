# CulinaryOS — Build Order v2.0

> **Version:** 2.0
> **Updated:** June 18, 2026
> **Status:** 🟡 Phase 0 — In Progress
> **License:** AGPL v3

---

## ⚡ AI AGENT QUICK CONTEXT

> Read this block first if you are resuming work on this project.

**What CulinaryOS is:**
A Kotlin-first, multi-platform, multi-tenant restaurant operations SaaS. One platform replacing POS + KDS + Online Ordering + Inventory + Reporting. Available as a managed cloud product and a self-hostable open-source install.

**Core stack:**
- Shared logic → Kotlin Multiplatform (KMP)
- Operational clients (POS, KDS, Admin) → Compose Multiplatform (Android 10+ / Desktop)
- Customer + Manager web → React / Next.js
- Backend → Ktor (Kotlin)
- Database → PostgreSQL
- Local storage → SQLDelight (offline event queue)
- Auth → JWT (15-min) + RBAC + refresh rotation
- Realtime → WebSockets
- Migrations → Flyway
- Self-host runtime → Docker Compose

**Current phase:** Phase 0 — Foundation
**Next action:** Initialize KMP Gradle project scaffold

**Do not:**
- Skip phase exit gates
- Start a new phase before the current one is complete
- Add AI features — no AI in this platform
- Add delivery UI — pickup only at MVP
- Store card data — PCI scope must remain zero through Phase 7

---

## 🗂️ GOVERNING PRINCIPLES

1. **Docs first. Scaffold second. Code third.** No module starts until its domain model, API contract, and acceptance criteria are written.
2. **One phase at a time.** No phase begins until the previous one passes its exit gate.
3. **Every phase ships a screen recording.** No exceptions. If you can't demo it, it's not done.
4. **Tests are not optional.** Integration tests must pass before a phase is marked complete.
5. **The event system is the backbone.** Every feature that touches order state must go through the event queue — no direct mutations.
6. **Tenant isolation is non-negotiable.** Every database query must be scoped by `restaurantId`. Enforced at Ktor plugin layer, not per-route.

---

## 📊 PHASE STATUS OVERVIEW

| Phase | Name | Target | Status |
|---|---|---|---|
| 0 | Foundation | Jul 6, 2026 | 🟡 In Progress |
| 1 | Auth & Tenant Shell | Jul 27, 2026 | ⬜ Not Started |
| 2 | POS Core | Sep 7, 2026 | ⬜ Not Started |
| 3 | KDS | Oct 5, 2026 | ⬜ Not Started |
| 4 | Online Ordering | Nov 2, 2026 | ⬜ Not Started |
| 5 | Inventory | Nov 30, 2026 | ⬜ Not Started |
| 6 | Reporting | Dec 21, 2026 | ⬜ Not Started |
| 7 | Payments Prototype | Jan 11, 2027 | ⬜ Not Started |
| 8 | OSS & Self-Host Release | Feb 2, 2027 | ⬜ Not Started |
| 9 | SaaS Cloud Launch | Mar 2, 2027 | ⬜ Not Started |
| 10 | Full Platform Expansion | May 31, 2027 | ⬜ Not Started |

---

## ✅ DEFINITION OF DONE (Every Phase)

A phase is **complete** when ALL of the following are true:

1. Every checklist item in the phase is checked `[x]`
2. Integration tests pass for all new API endpoints
3. `docs/domain-model.md` and relevant `docs/api/*.yaml` updated for any schema changes
4. A screen recording exists showing the feature working end-to-end
5. A `CHANGELOG.md` entry is written for the phase
6. CI pipeline is green on `main`

---

## 🔴 PHASE 0 — Foundation
**Target:** July 6, 2026
**Status:** 🟡 In Progress
**Goal:** Full tech stack compiling and running. Zero features. Zero bugs. Zero debt. Two developers can clone and run in under 15 minutes.

### Context for AI agents
> This phase is about **structure only** — no business logic, no UI screens beyond a blank shell, no database tables beyond a baseline migration. The goal is a green CI pipeline and a running health check endpoint. Everything else waits for Phase 1.

### Docs (complete these before touching code)
- [x] Freeze Platform Blueprint v2.0
- [x] Write `README.md`
- [x] Write `docs/architecture.md`
- [x] Write `docs/domain-model.md`
- [x] Write `docs/build-order.md`
- [x] Write `docs/sync-protocol.md` — **REQUIRED before any local queue code**
- [x] Write `docs/security.md` — auth flow, RBAC matrix, OWASP checklist stub
- [x] Write `docs/api/auth-v1.yaml` — OpenAPI spec for Phase 1 endpoints

### Scaffold
- [x] Initialize KMP Gradle project — modules: `:shared`, `:backend`, `:pos-client`, `:kds-client`, `:admin-client`
- [x] Create `web/ordering/` — Next.js project stub (no pages yet)
- [x] Create `web/dashboard/` — Next.js project stub (no pages yet)

### Backend
- [x] Ktor backend in `:backend` — single `GET /health` endpoint returning `{ "status": "ok", "version": "0.1.0" }`
- [x] Flyway setup — `db/migrations/` directory, one baseline migration `V1__baseline.sql` (empty schema)
- [x] SQLDelight in `:shared` — `LocalEvent` table schema only (no logic yet)

### Infrastructure
- [x] `docker-compose.yml` — starts PostgreSQL + Ktor backend locally with one command
- [x] `docker-compose.prod.yml` — Ktor + PostgreSQL + Nginx + SSL (Let's Encrypt) for self-host
- [x] `.env.example` — every required environment variable documented with type and example value
- [x] `DATABASE_URL` env var support — accept external PostgreSQL connection string; bundled DB is default

### CI/CD
- [x] GitHub Actions `build.yml` — runs `./gradlew build` + lint on every push to `main` and every PR
- [x] PR branch protection — branch blocked if CI fails

### Exit Gate
> `docker compose up` → backend responds to `GET /health` with 200.
> `./gradlew build` → green.
> A second developer clones the repo cold and runs the stack in under 15 minutes.

---

## 🟠 PHASE 1 — Auth & Tenant Shell
**Target:** July 27, 2026
**Status:** ⬜ Not Started
**Goal:** Airtight multi-tenant identity system. Nothing else is trustworthy until this is locked, tested, and confirmed.

### Context for AI agents
> This phase builds the security foundation. Every other module depends on it. The most important deliverable is the **Ktor tenant-scoping plugin** — it must inject `restaurantId` into every request context automatically so no future route can bypass tenant isolation. The cross-tenant integration test must pass before this phase is considered done.

### Database
- [x] Migration: `organizations` table — `id`, `name`, `billingEmail`, `createdAt`
- [x] Migration: `restaurants` table — `id`, `organizationId`, `name`, `address`, `phone`, `timezone`, `settings (jsonb)`, `createdAt`
- [x] Migration: `users` table — `id`, `restaurantId`, `name`, `email`, `passwordHash`, `role`, `pin (nullable)`, `createdAt`
- [x] Migration: `refresh_tokens` table — `id`, `userId`, `token (hashed)`, `expiresAt`, `revokedAt (nullable)`

### API Endpoints
- [x] `POST /auth/register` — create Organization + Restaurant + Owner user
- [x] `POST /auth/login` — validate credentials, return `{ accessToken, refreshToken }`
- [x] `POST /auth/refresh` — rotate refresh token, return new `{ accessToken, refreshToken }`
- [x] `POST /auth/logout` — revoke refresh token
- [x] `POST /auth/pin-login` — validate 4-digit PIN for POS staff switchover

### Middleware & Plugins
- [x] Ktor `TenantScopePlugin` — extracts `restaurantId` from JWT, injects into request context; all protected routes automatically scoped
- [x] Ktor `RBACPlugin` — reads role from JWT, enforces per-route role requirements
- [x] JWT validation on every protected route — rejects expired, tampered, or wrong-tenant tokens

### Admin UI Shell
- [x] Compose Multiplatform desktop: login screen with email + password
- [x] Successful login → empty dashboard shell showing user name and role
- [x] Role badge visible in UI

### Tests
- [x] Token from Tenant A attempting to read Tenant B data → `403 Forbidden`
- [x] Expired access token → `401 Unauthorized`
- [x] Refresh token rotation — old refresh token invalidated after use
- [x] PIN login — correct PIN returns valid access token; wrong PIN returns `401`
- [x] Registration creates org, restaurant, and owner user atomically

### Exit Gate
> Two tenant accounts exist in a running instance.
> Automated test confirms: Tenant A token cannot access Tenant B data.
> All five endpoint integration tests pass.

---

## 🟡 PHASE 2 — POS Core
**Target:** September 7, 2026
**Status:** ⬜ Not Started
**Goal:** A server takes a complete order end-to-end. Orders survive network interruption with zero data loss.

### Context for AI agents
> The local event queue is the most critical technical deliverable in this phase. Do NOT use an in-memory list — it must be a SQLDelight table so events survive app crashes and device reboots. The sync engine runs as a background coroutine and must handle exponential backoff, duplicate prevention, and `lastAckedGlobalSequence` tracking. Read `docs/sync-protocol.md` before writing any queue code.

### Database Migrations
- [x] `menu_categories`, `menu_items`, `modifier_groups`, `modifiers`
- [x] `sections`, `tables`
- [x] `orders`, `order_lines`, `applied_modifiers`
- [x] `discounts`, `void_records`, `comp_records`

### API Endpoints
- [x] `GET/POST/PUT/DELETE /menu/categories`
- [x] `GET/POST/PUT/DELETE /menu/items`
- [x] `GET/POST/PUT/DELETE /menu/items/{id}/modifiers`
- [x] `PUT /menu/items/{id}/availability` — 86 toggle
- [x] `GET/POST/PUT/DELETE /tables`
- [x] `GET/POST/PUT/DELETE /sections`
- [x] `POST /orders` — create order + order lines
- [x] `POST /orders/{id}/lines` — add line to existing order
- [x] `POST /orders/{id}/discount`
- [x] `POST /orders/{id}/void`
- [x] `POST /orders/{id}/comp`
- [x] `POST /events/sync` — client event queue drain endpoint

### Local Event Queue (`:shared` module)
- [x] `LocalEvent` SQLDelight schema: `id UUID, type TEXT, payload TEXT, clientSequence INT, deviceId TEXT, clientTimestamp TEXT, globalSequence INT nullable, synced INT (0/1)`
- [x] Event writer — appends to local table; applies optimistic UI state immediately
- [x] Sync coroutine — drains unsynced events to `POST /events/sync`; marks `synced = 1` on server ack
- [x] Exponential backoff — 1s, 2s, 4s, 8s, max 30s retry interval
- [x] `lastAckedGlobalSequence` stored locally — sent on every sync request
- [x] Offline banner trigger — exposed as `StateFlow<Boolean>` for UI to observe

### POS UI (Compose Multiplatform)
- [x] Configurable layout — `GRID` (large tiles) or `LIST` (searchable) set per restaurant in settings
- [x] Table grid screen — shows all tables with occupancy status
- [x] Menu browser — category tabs, item tiles/list, 86'd items grayed out
- [x] Item detail bottom sheet — modifier group selection, quantity, notes field
- [x] Order summary panel — persistent, shows running total, line items, discount
- [x] Send to kitchen button — fires order event to local queue
- [x] Void/Comp flow — manager PIN confirmation required
- [x] Offline indicator — visible persistent banner when queue is not synced
- [x] Quick PIN staff switchover — tap avatar → PIN entry → role switch without full logout

### Tests
- [x] Order placed with network off → reconnect → server receives all events in sequence → no duplicates
- [x] 86 toggle → item immediately grayed in POS UI → unavailable for new orders
- [x] Void requires `authorizedBy` and `reason` — rejected without both
- [x] `receiptNumber` auto-increments correctly per restaurant per calendar day

### Exit Gate
> Place a complete order with network disabled.
> Reconnect.
> Server receives the order with all lines, modifiers, and sequence intact.
> Zero data loss. Confirmed by automated integration test.

---

## 🟡 PHASE 3 — KDS
**Target:** October 5, 2026
**Status:** ⬜ Not Started
**Goal:** Kitchen receives, tracks, and completes tickets reliably across multiple stations. Zero missed tickets guaranteed.

### Context for AI agents
> The `PendingPush` outbox is the key reliability mechanism. Every `TicketFired` event MUST be written to the `pending_push` table BEFORE the WebSocket push attempt. On reconnect, clients request all events where `deliveredAt IS NULL` since their `lastAckedSequence`. Do not skip the outbox — without it, a KDS that drops connection will miss tickets silently.

### Database Migrations
- [ ] `stations` — `id`, `restaurantId`, `name`, `type (GRILL|FRY|SAUTE|EXPO|CUSTOM)`
- [ ] `ticket_events` — `id`, `orderId`, `stationId`, `eventType`, `occurredAt` (append-only, never update/delete)
- [ ] `course_groups` — `id`, `orderId`, `courseNumber`, `firedAt nullable`
- [ ] `pending_push` — `id`, `eventType`, `payload jsonb`, `targetRestaurantId`, `createdAt`, `deliveredAt nullable`

### API Endpoints
- [ ] `GET/POST/PUT/DELETE /stations`
- [ ] `POST /tickets/{orderId}/fire` — fires ticket to station(s); writes `PendingPush` + WebSocket push
- [ ] `POST /tickets/{orderId}/bump`
- [ ] `POST /tickets/{orderId}/recall`
- [ ] `POST /tickets/{orderId}/complete`
- [ ] `GET /tickets/pending?since={globalSequence}` — reconnect recovery endpoint

### WebSocket
- [ ] Station WebSocket channel — clients subscribe by `stationId`
- [ ] On `FIRED`: push to subscribed station clients
- [ ] On `BUMPED/RECALLED/COMPLETED`: push to all clients subscribed to that `orderId`
- [ ] Ack mechanism — client sends ack with `lastReceivedSequence` after each event
- [ ] Reconnect replay — server replays all `pending_push` where `deliveredAt IS NULL` for client's restaurant

### KDS UI (Compose Multiplatform)
- [ ] Compact ticket card: item name + quantity + seat (readable at 4 feet)
- [ ] Tap-to-expand modal: full ticket — modifiers, notes, course number, table name, server name, time since fired
- [ ] Bump button — large, single tap; confirm not required (speed critical in kitchen)
- [ ] Recall button — restores bumped ticket
- [ ] Age color indicator — configurable thresholds; green (fresh) → yellow (aging) → red (late)
- [ ] Station-scoped view — cook sees only tickets routed to their station
- [ ] Expo view — cross-station aggregated view (manager/expo role only)
- [ ] Course firing — fire individual courses independently

### Tests
- [ ] Bump ticket → `BUMPED` event recorded in `ticket_events` → all subscribed clients receive push
- [ ] KDS client disconnects mid-service → reconnects → receives all missed `FIRED` events
- [ ] Ticket displayed within 500ms of `POST /tickets/{orderId}/fire` on local network

### Exit Gate
> Order fires from POS.
> KDS displays ticket within 500ms on local network.
> Cook bumps ticket.
> POS reflects order complete.
> KDS reconnect test: disconnect → miss 3 tickets → reconnect → all 3 appear immediately.

---

## 🟡 PHASE 4 — Online Ordering
**Target:** November 2, 2026
**Status:** ⬜ Not Started
**Goal:** Customer on any device orders pickup and tracks order status live without calling the restaurant.

### Context for AI agents
> Fulfillment type is **PICKUP only** at MVP. `DELIVERY` type exists in the domain model but the UI, address form, and delivery radius logic are deferred. Customer login is required — **no guest checkout**. Login uses email or phone with OTP email verification. The customer ordering frontend is React/Next.js with SSR for SEO. It is a **separate deployment** from the manager dashboard.

### Database Migrations
- [ ] `customer_accounts` — `id`, `restaurantId`, `name`, `email nullable`, `phone nullable`, `passwordHash`, `emailVerified bool`, `createdAt`
- [ ] `customer_orders` — `id`, `restaurantId`, `customerId`, `fulfillmentType (PICKUP)`, `status`, `createdAt`
- [ ] `customer_order_status_history` — `id`, `orderId`, `status`, `occurredAt`
- [ ] `menu_snapshots` — `id`, `restaurantId`, `version int`, `publishedAt`, `items jsonb`

### API Endpoints
- [ ] `POST /customer/auth/register` — email or phone + OTP email verification
- [ ] `POST /customer/auth/login`
- [ ] `POST /customer/auth/verify-otp`
- [ ] `GET /menu/snapshot` — returns active `MenuSnapshot` for restaurant
- [ ] `POST /menu/snapshot/publish` — manager publishes new versioned snapshot (admin only)
- [ ] `POST /customer/orders` — create `CustomerOrder`
- [ ] `GET /customer/orders/{id}/status` — poll fallback
- [ ] `WS /customer/orders/{id}/status` — live status WebSocket

### Customer Ordering Frontend (web/ordering — Next.js SSR)
- [ ] Restaurant menu page — SSR for SEO; category tabs, item cards, photos
- [ ] Item detail modal — modifier selection, quantity, notes
- [ ] Cart sidebar/drawer — running total, line items
- [ ] Checkout page — login gate (email/phone OTP), fulfillment type (PICKUP), order review
- [ ] Order confirmation page — receipt number, estimated ready time
- [ ] Order tracking page — live WebSocket status display; no polling
- [ ] Mobile-first responsive design throughout

### POS/Admin Integration
- [ ] Online orders auto-injected into POS order queue (`source: ONLINE`)
- [ ] Online order alert — badge + notification in POS and admin UI for incoming orders
- [ ] Manager can update order status from admin UI → pushes to customer tracking page

### Tests
- [ ] Customer order created → appears in POS queue within 2 seconds
- [ ] Status update from manager → reaches customer tracking page via WebSocket
- [ ] `MenuSnapshot` version mismatch on in-flight order → item re-validation triggered
- [ ] Unverified email account cannot place order

### Exit Gate
> Customer places pickup order on web app.
> Order appears in POS within 2 seconds.
> Manager marks order READY.
> Customer tracking page updates live via WebSocket.

---

## 🟡 PHASE 5 — Inventory
**Target:** November 30, 2026
**Status:** ⬜ Not Started
**Goal:** Stock depletes automatically as orders are placed. Managers are alerted before running out, not after.

### Context for AI agents
> Inventory reconciliation is server-authoritative. Local depletion (on the POS client) is optimistic — it updates local stock numbers immediately for display purposes — but the authoritative stock level is always reconciled server-side on sync. The `MenuItemIngredient` table is the recipe link: it defines how much of each inventory item is consumed per menu item ordered. `yieldPercent` accounts for trim and waste (e.g., a chicken breast loses 15% to trim → yieldPercent = 0.85).

### Database Migrations
- [ ] `storage_locations` — `id`, `restaurantId`, `name`, `type (DRY|COLD|FROZEN)`
- [ ] `inventory_items` — `id`, `restaurantId`, `name`, `unit`, `currentStock`, `parLevel`, `storageLocationId`
- [ ] `menu_item_ingredients` — `menuItemId`, `inventoryItemId`, `quantityUsed`, `yieldPercent`
- [ ] `depletion_events` — `id`, `inventoryItemId`, `quantity`, `orderId nullable`, `source (SALE|WASTE|ADJUSTMENT)`, `occurredAt` (append-only)
- [ ] `reorder_rules` — `id`, `inventoryItemId`, `triggerLevel`, `reorderQuantity`, `preferredVendorId nullable`
- [ ] `purchase_orders` — `id`, `restaurantId`, `vendorId nullable`, `status (DRAFT|SUBMITTED|RECEIVED)`, `createdAt`
- [ ] `purchase_order_lines` — `id`, `purchaseOrderId`, `inventoryItemId`, `quantity`, `unitCost`

### API Endpoints
- [ ] `GET/POST/PUT/DELETE /inventory/items`
- [ ] `GET/POST/PUT/DELETE /inventory/locations`
- [ ] `POST /inventory/items/{id}/deplete` — manual depletion (WASTE or ADJUSTMENT)
- [ ] `GET/POST/PUT /inventory/reorder-rules`
- [ ] `GET/POST/PUT /inventory/purchase-orders`
- [ ] `POST /inventory/purchase-orders/{id}/receive` — marks RECEIVED, increments stock

### Automated Depletion
- [ ] On `OrderLine` commit → look up `MenuItemIngredient` → write `DepletionEvent (source: SALE)`
- [ ] `currentStock` decremented on depletion event write
- [ ] Par level check after every depletion — if `currentStock ≤ parLevel` → fire alert

### Alerts & Automation
- [ ] In-app badge + dashboard alert when par is breached
- [ ] `ReorderRule` engine — on par breach, auto-creates `PurchaseOrder (status: DRAFT)` for manager review

### Inventory UI (Admin Panel — Compose Multiplatform)
- [ ] Stock list — name, unit, current stock, par level, status color (green/yellow/red)
- [ ] Item detail — edit stock, par level, storage location, recipe links
- [ ] Manual depletion form — quantity + source (WASTE/ADJUSTMENT) + reason
- [ ] Purchase order list — view DRAFT/SUBMITTED/RECEIVED orders
- [ ] Receive PO screen — confirm quantities received → stock increments

### Tests
- [ ] Place N orders → `DepletionEvent` sum matches `quantityUsed × N` for linked ingredient
- [ ] Par breach → `PurchaseOrder (DRAFT)` auto-created → badge appears in admin UI
- [ ] Receive PO → `currentStock` increments by received quantity

### Exit Gate
> Order placed → inventory decrements correctly.
> Stock reaches par level → alert fires → draft PO created automatically.
> Manager receives draft PO → marks received → stock increments.

---

## 🟡 PHASE 6 — Reporting
**Target:** December 21, 2026
**Status:** ⬜ Not Started
**Goal:** Any operator understands yesterday's full service in under 2 minutes from a web browser.

### Context for AI agents
> All reports are generated **server-side from the event log**. Never read from client cache or local state for reporting purposes. Reports are read-only — no mutations. The reporting UI is React/Next.js (manager dashboard web app) — not Compose Multiplatform. This is because managers access reports from any browser, not just the installed admin client.

### API Endpoints
- [ ] `GET /reports/sales?from=&to=&groupBy=DAY|SHIFT|STATION`
- [ ] `GET /reports/depletion?from=&to=`
- [ ] `GET /reports/voids-and-comps?from=&to=`
- [ ] `GET /reports/metrics?from=&to=` — throughput, ticket times, top items
- [ ] `GET /reports/sales/export?from=&to=&format=csv`
- [ ] `GET /reports/depletion/export?from=&to=&format=csv`
- [ ] `GET /reports/voids-and-comps/export?from=&to=&format=csv`

### Report Logic
- [ ] `SalesReport` — gross sales, net sales (gross - voids - comps + tips), order count, avg ticket; grouped by DAY, SHIFT, or STATION; bucketed in restaurant `timezone`
- [ ] `DepletionReport` — total `DepletionEvent.quantity` summed per `inventoryItemId` for period
- [ ] `VoidAndCompReport` — every `void_record` and `comp_record` with amount, reason, authorizedBy, occurredAt
- [ ] `OperationalMetrics` — `ordersPerHour` by station; avg `CourseGroup.firedAt → TicketEvent(COMPLETED).occurredAt`; top N items by `OrderLine` quantity

### Manager Dashboard Web (web/dashboard — Next.js)
- [ ] Sales report page — date range picker, shift selector, station filter, summary cards, line chart
- [ ] Depletion report page — table view, period selector
- [ ] Void & comp report page — table view with all fields
- [ ] Metrics dashboard — throughput cards, ticket time cards, top items list
- [ ] CSV export button on all report pages

### Tests
- [ ] `SalesReport.grossSales` = sum of all `OrderLine.unitPrice × quantity` for period
- [ ] `SalesReport.netSales` = grossSales minus void amounts minus comp amounts plus tips
- [ ] Report bucketed by restaurant timezone (not UTC) for `groupBy: DAY`

### Exit Gate
> Manager opens web dashboard.
> Selects any date range.
> Sees accurate sales total, void log, depletion summary, and top 5 items.
> CSV export downloads with correct data.

---

## 🟡 PHASE 7 — Payments Prototype
**Target:** January 11, 2027
**Status:** ⬜ Not Started
**Goal:** Complete the order lifecycle. Every order has a recorded payment and a printed receipt. Sales reporting reflects real payment data.

### Context for AI agents
> **No card data is stored at any point in this phase.** The `method: CARD` option records only that a card was used — no PAN, no CVV, no token. PCI scope must remain zero. Live card processing is deferred to Phase 10 (Stripe Terminal). The `tenderAmount` field is for cash change calculation only — `tenderAmount - total = change due`. Do not conflate `amount` (order total before tip) with `total` (amount + tip).

### Database Migrations
- [ ] `payment_intents` — `id`, `orderId`, `receiptNumber`, `method (CASH|CARD|OTHER)`, `amount`, `tenderAmount`, `tip`, `total`, `status (PENDING|COMPLETED)`, `createdAt`

### API Endpoints
- [ ] `POST /payments/record` — records `PaymentIntent`, sets `Order.status = CLOSED`
- [ ] `GET /payments/{orderId}` — retrieve payment record for receipt
- [ ] `GET /receipts/{receiptNumber}` — retrieve receipt data for reprint

### POS UI Updates
- [ ] Payment screen — method selector (CASH / CARD / OTHER)
- [ ] Cash flow: tender amount entry → change due display (`tenderAmount - total`)
- [ ] Card flow: amount + tip entry → record only (no terminal interaction at MVP)
- [ ] Tip entry — percent buttons (15% / 18% / 20%) + custom amount
- [ ] Receipt preview — shows all line items, discounts, tip, total, receipt number

### Receipt Generation
- [ ] HTML/PDF receipt — restaurant name + address, order lines, discounts, subtotal, tip, total, receipt number, receipt footer from settings
- [ ] ESC/POS print command — Star Micronics + Epson compatible
- [ ] Print triggered from POS payment complete screen
- [ ] Reprint from order history

### SalesReport Integration
- [ ] `netSales = grossSales - voidAmounts - compAmounts + tips` — pulled from `payment_intents.tip`

### Tests
- [ ] Cash payment recorded → `Order.status = CLOSED` → receipt generated
- [ ] Change calculation: tender $20, total $14.75 → change $5.25
- [ ] `SalesReport.netSales` reflects correct tip inclusion

### Exit Gate
> Full service cycle end-to-end:
> Seat guest → place order → kitchen receives ticket → cook completes → cashier records cash payment → receipt prints → sales report shows correct totals.

---

## 🟡 PHASE 8 — Open-Source & Self-Host Release
**Target:** February 2, 2027
**Status:** ⬜ Not Started
**Goal:** Any developer or operator runs a complete CulinaryOS instance on a fresh server in under 15 minutes.

### Context for AI agents
> This phase is about packaging, documentation, and security — not new features. The output is a public GitHub release with compiled binaries and a Docker image. The OWASP security audit must be completed and documented before the release tag is pushed. The Docusaurus docs site must be live before the Discord announcement.

### Infrastructure
- [ ] `docker-compose.prod.yml` — Ktor + PostgreSQL + Nginx + Let's Encrypt SSL
- [ ] `DATABASE_URL` env var — accepts external PostgreSQL; bundled is default
- [ ] Flyway auto-migration on startup — zero manual SQL steps ever
- [ ] Self-host first-run wizard — web UI for org/restaurant setup on blank install

### Documentation
- [ ] `CONTRIBUTING.md` — code style, module conventions, how to run tests, PR checklist
- [ ] `CHANGELOG.md` — complete history from Phase 0
- [ ] `docs/security.md` — auth flow diagram, RBAC matrix, OWASP Top 10 checklist (completed)
- [ ] Docusaurus docs site deployed — Getting Started, Architecture, API Reference, Self-Host Guide
- [ ] Role-based quick-start cards — printable PDF for Server, Cook, Cashier, Manager

### Security Audit
- [ ] OWASP Top 10 checklist — document pass/fail per item
- [ ] Confirm no secrets in repo (git history scan)
- [ ] Confirm no card data exposure path exists
- [ ] JWT validation edge cases — expired, tampered, wrong tenant all return correct errors
- [ ] Cross-tenant test suite passes on final build

### Release
- [ ] GitHub release tag `v1.0.0-beta`
- [ ] Release assets: POS APK (Android 10+), KDS APK, Desktop binaries (Win/Mac/Linux), Docker image on GHCR
- [ ] Discord server live — channels: `#announcements`, `#self-host-help`, `#bug-reports`, `#feature-requests`

### Exit Gate
> Fresh Linux VM + Docker installed.
> `docker compose -f docker-compose.prod.yml up`
> Working login screen with no manual steps.
> One external developer validates the setup guide independently.

---

## 🟡 PHASE 9 — SaaS Cloud Launch
**Target:** March 2, 2027
**Status:** ⬜ Not Started
**Goal:** First paying restaurant live on CulinaryOS Cloud. Zero critical bugs during a real service.

### Context for AI agents
> The pilot restaurant (operator's own location) must run a **complete real service** on CulinaryOS Cloud before any public announcement or marketing. This is non-negotiable. A bug found during your own service costs nothing. A bug found by a paying customer costs trust.

### Cloud Infrastructure
- [ ] Managed PostgreSQL — Supabase or AWS RDS
- [ ] Ktor backend deployed on Fly.io (auto-scaling, multi-region ready)
- [ ] Cloudflare — CDN, DDoS protection, SSL termination
- [ ] Environment-based config — `production` vs `development` profiles

### Billing
- [ ] Stripe Billing — Starter ($79), Operator ($129), Pro ($199) subscription products
- [ ] Annual billing option — 2 months free (effectively 17% discount)
- [ ] Webhook handling — `customer.subscription.updated`, `invoice.payment_failed`
- [ ] Billing portal link in Owner settings

### Provisioning
- [ ] Signup flow — email → verify → create org + restaurant → welcome email
- [ ] Tenant auto-provisioning — new signup automatically creates isolated schema/tenant
- [ ] In-app onboarding wizard — 5 steps: menu → tables → stations → staff accounts → test order
- [ ] Early adopter rate lock — first 20 restaurants: rate grandfathered permanently

### Operations
- [ ] Public status page — real-time uptime (BetterUptime or statuspage.io)
- [ ] Internal SaaS admin console — view all tenants, subscription status, usage
- [ ] Support — Discord `#cloud-support` channel + email ticketing

### Exit Gate
> Operator's own restaurant runs a full service (open to close) on CulinaryOS Cloud.
> At least one order placed → kitchen receives ticket → payment recorded → receipt printed → report correct.
> Stripe subscription billed correctly.
> Zero Severity-1 bugs during service.

---

## 🟡 PHASE 10 — Full Platform Expansion
**Target:** May 31, 2027
**Status:** ⬜ Not Started
**Goal:** No legitimate feature gap vs. Toast or Square. CulinaryOS is the complete platform.

### Full Payment Processing
- [ ] Stripe Terminal SDK — Stripe Reader M2 / S700 card reader support
- [ ] Live card authorization + decline handling
- [ ] Split payments — by item, by seat, custom split amount
- [ ] Gift cards — issue, redeem, balance tracking
- [ ] Tip adjustment post-swipe (pre-batch)
- [ ] End-of-day batch settlement + Stripe payout report

### Multi-Location Management
- [ ] Organization dashboard — compare sales/voids/top items across all locations
- [ ] Centralized menu management — push updates to all or select locations
- [ ] Cross-location consolidated reporting
- [ ] Location-level permission isolation

### Labor & Scheduling
- [ ] Staff profiles — hourly rate, employment type, contact info
- [ ] Shift templates + weekly schedule builder (drag-and-drop)
- [ ] Clock-in/out tied to POS login; timestamps per shift
- [ ] Labor cost report — hours × rate per employee per period
- [ ] Overtime alerts — flag when staff crosses 40hrs/week

### Menu Engineering
- [ ] Food cost % per item — `(ingredientCost / menuPrice) × 100`
- [ ] Profitability matrix — Stars / Plowhorses / Puzzles / Dogs (popularity vs. margin)
- [ ] Theoretical vs. actual food cost variance
- [ ] Modifier cost tracking — modifier price delta flows into food cost calc

### Vendor Management
- [ ] Vendor profiles — contact, payment terms, lead time
- [ ] Vendor catalog — unit cost + pack size per inventory item
- [ ] PO email delivery — auto-generate and email PO to vendor from CulinaryOS
- [ ] Invoice matching — receive PO, enter invoice amounts, flag discrepancies
- [ ] Vendor performance — on-time rate, price variance history

### Customer & Loyalty
- [ ] Customer profiles — order history, loyalty points
- [ ] Points-based loyalty — earn per dollar, redeem for discounts
- [ ] Loyalty tiers — Bronze/Silver/Gold, configurable earn rates
- [ ] Promo codes — single/multi-use, percent/flat, expiry date
- [ ] GDPR-compliant customer data export

### Advanced Floor & Table Management
- [ ] Floor plan editor — drag-and-drop sections (indoor, outdoor, bar)
- [ ] Seat-level ordering — assign items to seats for split checks
- [ ] Basic reservation slots tied to table availability
- [ ] Waitlist management — queue parties, notify when table is ready

### Catering & Events
- [ ] Event bookings — date, headcount, deposit, balance due
- [ ] Catering menu catalog — separate from regular menu
- [ ] Event invoice generation
- [ ] Event-linked inventory depletion

---

## 📁 REPO STRUCTURE (Target After Phase 0)

```
CulinaryOS/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE                        ← AGPL v3
├── docker-compose.yml             ← local dev (Postgres + Ktor)
├── docker-compose.prod.yml        ← self-host production (+ Nginx + SSL)
├── .env.example                   ← all vars documented
├── docs/
│   ├── architecture.md
│   ├── domain-model.md
│   ├── build-order.md             ← this file
│   ├── sync-protocol.md           ← NEW (required before Phase 2)
│   ├── security.md                ← NEW (required before Phase 8)
│   └── api/
│       ├── auth-v1.yaml           ← NEW (required before Phase 1)
│       ├── pos-v1.yaml            ← required before Phase 2
│       ├── kds-v1.yaml            ← required before Phase 3
│       ├── ordering-v1.yaml       ← required before Phase 4
│       ├── inventory-v1.yaml      ← required before Phase 5
│       ├── reporting-v1.yaml      ← required before Phase 6
│       └── payments-v1.yaml       ← required before Phase 7
├── backend/                       ← Ktor server module
│   └── src/
│       ├── main/kotlin/
│       │   ├── plugins/           ← TenantScopePlugin, RBACPlugin, Auth
│       │   ├── routes/            ← one file per domain
│       │   ├── services/          ← business logic
│       │   └── db/                ← repositories + Flyway migrations
│       └── test/kotlin/           ← integration tests
├── shared/                        ← KMP shared module
│   ├── commonMain/                ← domain models, validation, event queue logic
│   ├── androidMain/               ← Android SQLDelight driver
│   └── desktopMain/               ← JVM SQLDelight driver
├── pos-client/                    ← Compose Multiplatform POS app
├── kds-client/                    ← Compose Multiplatform KDS app
├── admin-client/                  ← Compose Multiplatform Admin Panel
└── web/
    ├── ordering/                  ← Next.js customer ordering (SSR)
    └── dashboard/                 ← Next.js manager dashboard
```

---

## 🔒 NON-NEGOTIABLES (All Phases)

These rules apply to every line of code in every phase. They are never relaxed.

| Rule | Detail |
|---|---|
| Tenant isolation | Every DB query filtered by `restaurantId` via Ktor plugin — no exceptions |
| No card data | No PAN, CVV, or card token stored until Phase 10 Stripe Terminal |
| Tests required | No phase complete without passing integration tests |
| Docs before code | No module starts without domain model + API spec written |
| CI must be green | No code merges to `main` with a failing build |
| AGPL compliance | All network-served modifications must be open-sourced |

---

## ⚡ PERFORMANCE TARGETS

| Metric | Target |
|---|---|
| POS order → KDS ticket display | ≤ 500ms on local network |
| API p95 response time (reads) | ≤ 200ms |
| MenuSnapshot load (client cache) | ≤ 100ms |
| Self-host setup time | ≤ 15 minutes on fresh server |

---

*CulinaryOS — Build Order v2.0 — Frozen June 18, 2026*
