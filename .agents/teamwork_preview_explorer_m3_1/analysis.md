# CulinaryOS & KitchenKit Deep-Dive Analysis (R3, R4, R5)

## Overview
This report documents the architectural structure, file locations, code mechanisms, and implementation details for Requirements R3, R4, and R5 across CulinaryOS (`c:\Users\User\Documents\CulinaryOS`) and KitchenKit (`c:\Users\User\Documents\KitchenKit`).

---

## Section 1: Requirement R3 — HTMX Server-Driven Streaming Kiosk Endpoint

### 1.1 Endpoint & File Location
- **File**: `apps/server/src/routes/kds.ts` (lines 153–172)
- **Mount Point**: `apps/server/src/index.ts` (line 77: `app.route('/v1/kds', kdsRoutes)`)
- **Full Path & Method**: `GET /v1/kds/htmx-cards`

### 1.2 Implementation Analysis
The HTMX endpoint provides a Zero-JS HTML streaming kiosk interface:
```typescript
// GET /v1/kds/htmx-cards (Zero-JS HTMX Kiosk Endpoint)
kdsRoutes.get('/htmx-cards', async (c) => {
  const list = mockTickets;
  const html = list.map(t => `
    <div class="kds-card border border-gray-300 rounded-xl p-4 bg-white shadow-sm mb-3 font-mono">
      <div class="flex justify-between font-bold border-b pb-2">
        <span>TICKET #${t.id} (T-${t.table_number})</span>
        <span class="text-green-600 uppercase">${t.status}</span>
      </div>
      <div class="py-2 space-y-1 text-xs">
        ${t.items.map((i: any) => `<div>${i.quantity}x ${i.name} [${i.station}]</div>`).join('')}
      </div>
      <button hx-patch="/v1/kds/tickets/${t.id}/bump" hx-target="closest .kds-card" hx-swap="outerHTML"
        class="w-full bg-green-500 text-white py-2 rounded font-bold text-xs uppercase mt-2">
        BUMP TICKET
      </button>
    </div>
  `).join('');

  return c.html(html);
});
```

### 1.3 Key Technical Features & Target Use Cases
1. **Server-Side HTML Rendering (`c.html`)**: Returns HTML fragments directly using Hono's `c.html(...)` rather than JSON API payloads.
2. **HTMX Bump Attributes**:
   - `hx-patch="/v1/kds/tickets/${t.id}/bump"` triggers an async PATCH request to bump the ticket.
   - `hx-target="closest .kds-card"` targets the card container element.
   - `hx-swap="outerHTML"` replaces or removes the card in-place upon completion.
3. **Use Case**: Enables lightweight kiosks, low-power thermal display controllers, or embedded legacy hardware to render and update ticket cards without heavy client-side JavaScript single-page applications.

---

## Section 2: Requirement R4 — KitchenKit KDS & MCP / Engine Layer

### 2.1 KDS Front-of-House Station UI (`apps/kds`)
- **Station View**: `apps/kds/src/pages/Station.tsx`
- **Ticket Card Component**: `apps/kds/src/components/TicketCard.tsx`
- **Real-Time Hook**: `apps/kds/src/hooks/useRealtimeTickets.ts`
- **Course Notification Hook**: `apps/kds/src/hooks/useCourseFiredNotices.ts`
- **Course Hold Banner**: `apps/kds/src/components/CourseHoldBanner.tsx`

#### Station Tab Filters
`Station.tsx` defines the `STATIONS` tab configuration (lines 13–20):
```typescript
const STATIONS = [
  { id: 'expo', label: 'Expo Pass' },
  { id: '1', label: 'Hot Grill' },
  { id: '2', label: 'Cold Prep' },
  { id: '3', label: 'Fryer' },
  { id: '4', label: 'Bar' },
  { id: 'all', label: 'All Stations' },
];
```
Filtering logic in `useRealtimeTickets.ts` (lines 208–218, 237–242):
- `expo`: Returns all tickets across all stations, including `held` and `fired` statuses.
- `all`: Returns all `fired` tickets across all stations.
- `1` / `2` / `3` / `4`: Returns `fired` tickets filtered by `station_id`. `held` tickets are excluded from line station displays to avoid kitchen line clutter.

#### 1-Second Timer Counter & Age Alerts
`useRealtimeTickets.ts` runs a 1-second interval (`setInterval(tick, 1000)`) calculating `elapsedSeconds = Math.floor((Date.now() - new Date(firedAt ?? createdAt).getTime()) / 1000)`.

In `TicketCard.tsx` and `tests/kds/station.test.ts`, age alert threshold logic is defined as:
- **Green / Normal**: `< 300s` (0 to 4:59). Header border green (`var(--green)`), badge text `NORMAL`.
- **Yellow / Amber Alert**: `300s <= secs < 600s` (5:00 to 9:59). Header border amber (`var(--amber)`), badge text `AMBER ALERT`.
- **Red Alert**: `>= 600s` (10:00+). Header border red (`var(--red)`), badge text `RED ALERT`.

#### Course Hold / Fire Groupings & Expediter Pass View
- **Course Hold Engine**: `kds/server/lib/course-engine.ts` defines `initialHoldStatus(courseNumber)` where Course 1 defaults to `'firing'` and Course 2+ defaults to `'held'`.
- **Manual & Automatic Firing**: `PATCH /v1/kds/tickets/:id/fire` updates `course_hold_status` to `'fired'` and `status` to `'cooking'`. Cards held render a "🔥 Fire Course N" button (`TicketCard.tsx` line 205).
- **Expediter (Expo Pass) View**: When `stationId === 'expo'`, `Station.tsx` displays the **Real-Time Station Overview Bar** (lines 177–208) summarizing ticket counts for 🔥 Hot Grill, 🥗 Cold Prep, 🍟 Fryer, 🍸 Bar, and ⏸ Held Courses.

### 2.2 Engines & MCP Tool Servers
1. **Ratio Engine**:
   - CulinaryOS: `packages/ratio-engine/src/index.ts` (`@culinaryos/ratio-engine`). Exports `scaleBlueprint(blueprint, targetYield)`, `computeCost(scaled, priceMap)`, `fromTotalWeight(blueprint, totalWeight)`.
   - KitchenKit: `c:\Users\User\Documents\KitchenKit\packages\ratio-engine/src/index.ts` (`@kitchenkit/ratio-engine`). Exports `scaleRecipe()`, `calculateRatio()`, `totalFormulaWeight()`.
2. **Prep Engine**:
   - KitchenKit: `c:\Users\User\Documents\KitchenKit\packages\prep-engine/src/index.ts` (`@kitchenkit/prep-engine`). Exports `buildShiftPrep()`, `getMiseEnPlace()`, `projectBatchSize()`. Calculates prep shortfall as `parLevel - currentStock`.
3. **Recipe MCP**:
   - KitchenKit: `c:\Users\User\Documents\KitchenKit\mcp\recipe-mcp/src/index.ts`. Exposes MCP tools: `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`.
   - CulinaryOS: `mcp/src/recipe-server.ts`.
4. **Prep MCP**:
   - KitchenKit: `c:\Users\User\Documents\KitchenKit\mcp\prep-mcp/src/index.ts`. Exposes MCP tools: `build_shift_prep`, `save_prep_plan`, `complete_prep_item`, `get_mise_en_place`, `project_batch_size`, `update_stock`.
   - CulinaryOS: `mcp/src/prep-server.ts`.

---

## Section 3: Requirement R5 — Plated Inventory Deduction Engine & Post-Pilot Loyalty

### 3.1 Plated Inventory MCP Server & Deduction Engine
- **File**: `mcp/src/inventory-server.ts`
- **Server Name**: `Plated` (v1.0.0)
- **Tools Implemented**:
  1. `get_inventory_levels`: GET `/v1/pantry` with `X-Tenant-Id`.
  2. `log_audit_count`: Fetches item via `/v1/pantry/:itemId`, calculates variance (`physicalQty - currentStock`), calculates total monetary loss (`|variance * cost_per_unit|`), and updates stock quantity via PATCH `/v1/pantry/:itemId`.

#### Automatic Inventory Deduction Workflow
- **Database Schema**: `supabase/migrations/V7__recipeos_pantry.sql` creates `ingredients`, `recipe_ingredients`, `pantry_ledger`, and `pantry_status` view.
- **REST Deduction Endpoint**: `apps/server/src/routes/pantry.ts` handles `POST /v1/pantry/deduct`, calling Supabase RPC `decrement_pantry_stock`.
- **Deduction Engine Logic**: Validated in `tests/empirical/step1_plated_inventory.test.ts`. When a POS order completes, recipe ingredients are scaled via `scaleBlueprint` (from `@culinaryos/ratio-engine`). Kilograms/grams are converted and decremented from raw inventory stock in `pantry_items`/`ingredients`.

#### Admin Dashboard Low-Stock Par Level Alerts & Purchase Orders
- **File**: `apps/admin/src/pages/Pantry.tsx`
- **View Logic**: Items evaluate `stock_status`:
  - `ok`: `current_qty > reorder_at`
  - `low_stock`: `0 < current_qty <= reorder_at`
  - `out_of_stock`: `current_qty <= 0`
- **Admin UI Warning**: `Pantry.tsx` renders a warning header (`⚠️ N items need restocking`) whenever `alerts.length > 0` and enables `⊕ Auto-Generate PO`.
- **Restock PO Schema**: `supabase/migrations/V9__restock_purchase_orders.sql` manages `restock_purchase_orders` (`draft` -> `approved` -> `sent` -> `received`) and `po_line_items`.

### 3.2 Post-Pilot Loyalty MCP Server
- **File**: `mcp/src/post-pilot-server.ts`
- **Server Name**: `Post-Pilot` (v1.0.0)
- **Tool Implemented**: `send_marketing_postcard`
- **Tool Arguments**: `customerName`, `address`, `discountPercent`, `couponMessage`.
- **Coupon Dispatch & Milestone Logic**: Validated in `tests/empirical/step2_post_pilot_marketing.test.ts`:
  - **Visit Milestone (>= 5 visits)**: Triggers 15% discount coupon code `SAVE15`.
  - **Spend Milestone (>= $250.00 spend)**: Triggers 20% discount coupon code `SAVE20`.
- **Dispatch Response Output**:
  `"Success: Post-Pilot postcard queued for dispatch to <customerName>. Code: SAVE<discountPercent>. Message: \"<couponMessage>\"."`

---

## Summary Matrix

| Requirement | Module / Path | Key Files / Functions | Responsibilities |
|---|---|---|---|
| **R3** | `apps/server/src/routes/kds.ts` | `GET /v1/kds/htmx-cards` | HTMX server-driven HTML streaming kiosk endpoint returning card fragments with `hx-patch` bump attributes. |
| **R4** | `apps/kds`, `KitchenKit` | `Station.tsx`, `TicketCard.tsx`, `useRealtimeTickets.ts`, `ratio-engine`, `prep-engine`, `recipe-mcp`, `prep-mcp` | KDS station tabs, 1s tick timer, green/amber/red age alerts (<5m, 5-10m, >10m), course hold/fire, Expo pass, ratio & prep engines, recipe & prep MCPs. |
| **R5** | `mcp/src/`, `apps/server`, `apps/admin` | `inventory-server.ts`, `post-pilot-server.ts`, `Pantry.tsx`, `step1_plated_inventory.test.ts`, `step2_post_pilot_marketing.test.ts` | Plated Inventory MCP server, POS recipe ratio scaling inventory deduction, low-stock alerts & auto-PO in Admin dashboard, Post-Pilot loyalty postcard coupon dispatches (`SAVE15`/`SAVE20`). |
