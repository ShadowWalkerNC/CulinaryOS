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

Install an extension for the current tenant session.

---

### `GET /v1/marketplace/ai/status`

Check whether the AI layer is available.

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "available": true,
    "model": "claude-opus-4-5",
    "note": "AI is additive — all core operations function without this layer."
  }
}
```

---

### `POST /v1/marketplace/ai/ops-insight`

Generate an AI shift performance analysis. Requires `ANTHROPIC_API_KEY`. Falls back to plain metric summary if unavailable.

### `POST /v1/marketplace/ai/prep-plan`

Generate an AI morning prep checklist. Falls back to cover count + low stock list if unavailable.

### `POST /v1/marketplace/ai/loyalty-message`

Generate AI loyalty postcard copy. Falls back to template message if unavailable.

---

## Health

### `GET /health`

```json
{
  "service": "culinaryos-server",
  "status": "healthy",
  "version": "1.0.0",
  "supabase": "connected",
  "uptime": 3600,
  "checkedAt": "2026-08-26T12:00:00Z"
}
```
