# CulinaryOS — REST API Reference

> **Base URL:** `http://localhost:3000` (development) · `https://api.yourdomain.com` (production)
>
> All routes are prefixed `/v1/`. All responses use the standard envelope below.
>
> **Note:** Older docs referencing `/api/v1/recipes` or Android Track A/B sync describe a prior architecture. This document reflects the current Hono API.

---

## Authentication

### Demo Mode (no Supabase)

Send `X-Tenant-Id` header only. No `Authorization` header required.

```http
X-Tenant-Id: 00000000-0000-0000-0000-000000000001
```

### Live Mode (Supabase configured)

```http
Authorization: Bearer <jwt>
X-Tenant-Id: <tenantId>
```

---

## Response Envelope

All responses use a standard envelope:

```json
{
  "ok": true,
  "data": { ... }
}
```

Errors:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found",
    "details": { "orderId": "abc123" }
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Valid auth, insufficient role |
| `VALIDATION_ERROR` | 422 | Bad input shape |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## Auth Routes

### `POST /v1/auth/pin-login`

Validate a staff PIN and issue a JWT session.

**Request:**
```json
{
  "pin": "1234",
  "tenantId": "00000000-0000-0000-0000-000000000001"
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "token": "eyJ...",
    "role": "server",
    "staffId": "staff-uuid",
    "tenantId": "00000000-0000-0000-0000-000000000001"
  }
}
```

**Demo PINs:** `1234` → server role · `5678` → manager role

---

## Order Routes

### `POST /v1/orders`

Create a new POS order (draft state, not yet sent to kitchen).

**Request:**
```json
{
  "tableId": "table-uuid",
  "items": [
    {
      "menuItemId": "item-uuid",
      "name": "Wood-Fired Margherita Pizza",
      "quantity": 1,
      "price": 18.00,
      "course": 1,
      "seatNumber": 1,
      "modifiers": ["extra basil"]
    }
  ]
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "orderId": "order-uuid",
    "status": "open",
    "total": 18.00,
    "createdAt": "2026-08-26T12:00:00Z"
  }
}
```

---

### `PATCH /v1/orders/:id/send`

Fire an order to the kitchen. Creates `kitchen_tickets` grouped by station and course, and triggers pantry deduction.

**⚠️ Important:** This is the **only** correct way to fire an order. Direct `pos_orders.status` updates from clients bypass kitchen ticket creation.

**Request:**
```json
{
  "order": {
    "items": [
      {
        "lineItemId": "line-item-uuid",
        "menuItemId": "item-uuid",
        "name": "Prime Bistro Burger",
        "quantity": 1,
        "station": "grill",
        "course": 1
      }
    ]
  }
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ticketsCreated": 2,
    "pantryDeducted": true,
    "plateEconomicsLogged": true
  }
}
```

---

### `POST /v1/orders/:id/fire-course`

Fire a specific course number for a multi-course order.

**Request:**
```json
{ "course": 2 }
```

**Response (200):** Standard ok envelope.

---

## KDS Routes

### `GET /v1/kds/tickets`

Fetch all active (non-bumped) kitchen tickets for the tenant.

**Query params:** `?station=grill` (optional filter: `grill`, `cold`, `fry`, `bar`, `expo`)

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "ticketId": "ticket-uuid",
      "orderId": "order-uuid",
      "tableLabel": "Table 5",
      "station": "grill",
      "course": 1,
      "status": "open",
      "items": [
        { "name": "Prime Bistro Burger", "quantity": 1, "modifiers": ["medium rare"] }
      ],
      "createdAt": "2026-08-26T12:05:00Z",
      "ageSeconds": 187
    }
  ]
}
```

---

### `PATCH /v1/kds/tickets/:id/bump`

Mark a ticket as complete ("bumped"). Advances order status if all tickets are bumped.

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ticketId": "ticket-uuid",
    "status": "bumped",
    "orderStatus": "ready"
  }
}
```

---

### `PATCH /v1/kds/tickets/:id/fire`

Manually fire a held course ticket.

**Response (200):** Standard ok envelope.

---

### `GET /v1/kds/pacing`

Fetch multi-course pacing tracking, Course 1 elapsed times, and Course 2 held fire urgency alerts (`normal`, `warning` at 12m, `urgent` at 15m). Supports conditional `If-None-Match` caching returning `304 Not Modified`.

**Headers:** `If-None-Match: <etag>` (optional)

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "orderId": "o-101",
      "tableNumber": "4",
      "c1Status": "cooking",
      "c1ElapsedSeconds": 750,
      "c2Status": "held",
      "c2TicketId": "t-102",
      "targetC2FireSeconds": 720,
      "remainingToC2Seconds": 0,
      "pacingAlert": "warning"
    }
  ]
}
```

---

## Tables & Assistance Routes

### `POST /v1/tables/:id/assistance`

Submit a tableside guest buzzer request (water, server, bill, help). Automatically debounces and deduplicates requests within a 15-second window.

**Request Body:**
```json
{
  "tableNumber": "T4",
  "type": "water",
  "note": "Refill please"
}
```

**Response (201 or 200 if deduplicated):**
```json
{
  "ok": true,
  "data": {
    "notificationId": "ast-1788649695691-719",
    "tableId": "T4",
    "tableNumber": "T4",
    "type": "water",
    "status": "active"
  }
}
```

---

### `GET /v1/tables/assistance/active`

List all currently unresolved assistance buzzers for the tenant. Supports conditional `If-None-Match` returning `304 Not Modified` to prevent terminal polling overhead.

**Headers:** `If-None-Match: <etag>` (optional)

---

### `PATCH /v1/tables/assistance/:notificationId/dismiss`

Acknowledge and dismiss an active buzzer request from POS or runner screen.

---

## Pantry Routes

### `GET /v1/pantry`

List all pantry items for the tenant.

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "item-uuid",
      "name": "00 Flour",
      "unit": "kg",
      "quantityOnHand": 12.5,
      "parLevel": 10.0,
      "reorderQuantity": 25.0,
      "supplierId": "supplier-uuid",
      "unitCost": 2.40
    }
  ]
}
```

---

### `GET /v1/pantry/alerts`

Get low-stock and out-of-stock alerts.

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "lowStock": [
      { "id": "item-uuid", "name": "Mozzarella", "quantityOnHand": 1.2, "parLevel": 5.0 }
    ],
    "outOfStock": []
  }
}
```

---

### `POST /v1/pantry/deduct`

Manually deduct ingredients from pantry stock.

**Request:**
```json
{
  "items": [
    { "id": "item-uuid", "quantity": 0.25, "unit": "kg" }
  ],
  "reason": "recipe-deduction"
}
```

---

### `POST /v1/pantry/deduct-order`

Resolve a fired order's menu items to recipe ingredients and deduct from pantry automatically.

**Request:**
```json
{
  "orderId": "order-uuid",
  "items": [
    { "menuItemId": "item-uuid", "recipeId": "recipe-uuid", "quantity": 1 }
  ]
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "deductedIngredients": [
      { "id": "item-uuid", "name": "00 Flour", "quantity": 0.25, "unit": "kg" }
    ],
    "plateEconomicsLogged": true
  }
}
```

---

### `POST /v1/pantry/purchase-orders/auto-generate`

Generate a draft purchase order for all items below par level.

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "purchaseOrderId": "po-uuid",
    "lineItems": 7,
    "estimatedTotal": 482.50,
    "status": "draft"
  }
}
```

---

### `POST /v1/pantry/purchase-orders/:id/approve`

Approve a draft PO. Requires manager role.

### `POST /v1/pantry/purchase-orders/:id/send`

Dispatch an approved PO to the supplier.

### `POST /v1/pantry/purchase-orders/:id/receive`

Receive stock from a dispatched PO, incrementing pantry quantities.

**Request:**
```json
{
  "items": [
    { "lineItemId": "line-uuid", "quantityReceived": 24.0 }
  ]
}
```

---

## Operations Routes

### `POST /v1/ops/waste`

Log a food waste event.

**Request:**
```json
{
  "itemId": "pantry-item-uuid",
  "itemName": "Atlantic Salmon",
  "quantity": 0.8,
  "unit": "kg",
  "reason": "spoilage",
  "costPerUnit": 18.50
}
```

**Response (201):** Standard ok envelope with `wasteEventId`.

---

### `GET /v1/ops/waste/summary`

Get aggregated waste analytics.

**Query params:** `?from=2026-08-01&to=2026-08-26`

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "totalWasteCost": 247.80,
    "totalWasteWeight": 12.4,
    "wastePercentage": 3.2,
    "topOffenders": [
      { "name": "Atlantic Salmon", "totalCost": 74.00, "reason": "spoilage" }
    ]
  }
}
```

---

### `GET /v1/ops/plate-economics`

Retrieve theoretical vs actual food cost history.

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "menuItemId": "item-uuid",
      "name": "Prime Bistro Burger",
      "salePrice": 24.00,
      "theoreticalCost": 7.20,
      "foodCostPct": 30.0,
      "status": "good"
    }
  ]
}
```

---

### `POST /v1/ops/loyalty`

Adjust a loyalty point balance.

**Request:**
```json
{
  "customerId": "customer-uuid",
  "pointsToAdjust": 150,
  "reason": "purchase"
}
```

---

## Marketplace Routes

### `GET /v1/marketplace/extensions`

List all available extensions.

**Response (200):**
```json
{
  "ok": true,
  "data": [
    {
      "id": "com.culinaryos.ext.recipeos",
      "name": "RecipeOS Bridge",
      "category": "Recipes",
      "installed": false,
      "verified": true
    }
  ]
}
```

---

### `POST /v1/marketplace/extensions/:id/install`

Install an extension for the current tenant. Scoped per-tenant (`X-Tenant-Id`).

---

### `GET /v1/marketplace/ai/status`

Check whether the AI layer is available and enabled via Rule 6 feature flags (`ENABLE_AI_MARKETPLACE=true`).

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "llm_available": true,
    "feature_flag_enabled": true,
    "provider": "anthropic",
    "model": "claude-sonnet-4-5"
  }
}
```

---

### `POST /v1/marketplace/ai/ops-insight`

Generate an AI shift performance analysis. Gated behind Rule 6 feature flag (`ENABLE_AI_MARKETPLACE=true`) and requires `X-Tenant-Id`.

---

## Payments & Stripe Terminal Hub

All payment write operations enforce non-negotiable **Rule 3 payment idempotency** via `Idempotency-Key` or `X-Request-Id` headers (or deterministic fallback hashes) to prevent double-charging:

- `POST /v1/payments/checkout` — Online/tableside PaymentIntent creation with integer cents and idempotency key.
- `POST /v1/payments/terminal/connection-token` — Stripe Terminal smart reader connection token (WisePOS E / S700).
- `POST /v1/payments/terminal/create-intent` — Card-present in-person terminal intent with idempotency key.
- `POST /v1/payments/terminal/process` — Finalize terminal payment and record tender.
- `POST /v1/payments/refund` — Full or partial refund with integer cents and idempotency key.

---

## Multi-Unit Commissary & Stock Transfer Routes

- `GET /v1/commissary/transfers` — List incoming/outgoing location stock transfers.
- `POST /v1/commissary/transfers/request` — Place replenishment transfer order against central kitchen.
- `PATCH /v1/commissary/transfers/:id/fulfill` — Fulfill transfer and assign ISO batch lot codes (`LOT-YYYYMMDD-PROD-XXXX`).
- `PATCH /v1/commissary/transfers/:id/receive` — Accept transfer batch lots into active store pantry.
- `GET /v1/commissary/royalty-ledger` — Brand-wide multi-unit franchise royalty consolidation ledger.

---

## AI Kitchen Autopilot Routes (Rule 6 Compliant)

- `GET /v1/autopilot/status` — Inspect `ENABLE_AI_AUTOPILOT` flag status.
- `GET /v1/autopilot/token-dashboard` — Per-tenant token audit & cost monitoring from `ai_prompt_log`.
- `GET /v1/autopilot/forecast` — Predictive order demand smoothing and revenue projection.
- `GET /v1/autopilot/bottleneck-advisory` — Cook line queue load factor and prep padding suggestions.
- `GET /v1/autopilot/par-suggestions` — Dynamic lead-time and safety-stock par level recommendations.

---

## Health

### `GET /health`

```json
{
  "service": "culinaryos-api",
  "status": "healthy",
  "version": "1.2.1",
  "uptime": 3600,
  "checkedAt": "2026-09-05T22:00:00Z"
}
```
