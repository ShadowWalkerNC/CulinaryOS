# Comprehensive Analysis Report: Plated Inventory Engine, Post-Pilot Marketing MCP, and Web Online Ordering App

**Target Directory**: `c:\Users\User\Documents\CulinaryOS`
**Author**: Explorer Agent (`teamwork_preview_explorer_inventory_marketing_web_3`)
**Date**: 2026-07-24

---

## 1. Executive Summary

This investigation analyzed three major domain subsystems of **CulinaryOS**:
1. **Plated Inventory Engine & Admin Dashboard**: Examined inventory stock decrementing flow triggered by POS checkouts via RecipeOS ratio scaling, low-stock par level warning banners and automated purchase order generation on the Admin dashboard (`apps/admin/src/pages/Pantry.tsx`), and MCP tools `get_inventory_levels` and `log_audit_count` in `mcp/src/inventory-server.ts`.
2. **Post-Pilot Marketing MCP**: Examined `mcp/src/post-pilot-server.ts` exposing `send_marketing_postcard` tool, alongside the customer visit/spending milestone event architecture.
3. **Web Online Ordering App**: Examined `apps/web`, including item modifier customization (`ItemCard.tsx`), cart state management (`MenuPage.tsx`), cart drawer drawer component (`CartDrawer.tsx`), public menu fetching (`useMenu.ts`), and identified gaps in Checkout (Pickup vs. Delivery toggle, tip selector, order submit) and Live Order Progress Tracking.

---

## 2. Detailed Findings by Task

### Task 1: Plated Inventory Engine & Admin Dashboard

#### 1. POS Checkout → RecipeOS Ratio Scaling & Stock Decrementing Flow
- **Event Emission**: Upon item sale or checkout payment completion, POS triggers `pos:menu:item-sold` domain events.
- **Event Bus Handler**: `packages/event-bus/src/handlers/pos-menu-item-sold.ts` (lines 16-40) intercepts `pos:menu:item-sold`. If `recipeId` exists on the sold item, it issues a `POST ${RECIPEOS_URL}/v1/pantry/deduct` request containing `{ recipeId, quantity, soldAt }`.
- **Backend Deduct Route**: `apps/server/src/routes/pantry.ts` (lines 160-181) exposes `POST /v1/pantry/deduct`. It executes Supabase stored procedure `decrement_pantry_stock(item_id, qty)` or updates local mock stock.
- **Recipe Ratio Scaling**: Defined in database schema `supabase/migrations/V7__recipeos_pantry.sql`. `recipe_ingredients` links menu item recipes to raw inventory items (`pantry_items`) with specified portion ratios. When a menu item is sold, quantity ordered scales ingredient ratios, automatically decrementing `stock_quantity` in `pantry_items` and creating negative delta entries in `pantry_ledger`.

#### 2. Admin Dashboard Low-Stock Alerts & Auto PO Generation
- **Location**: `apps/admin/src/pages/Pantry.tsx`.
- **Low-Stock Alert Detection**: Lines 107-120 filter inventory items where `stock_status !== 'ok'` (`alerts = items.filter((i) => i.stock_status !== 'ok')`). Displays a warning banner: `⚠️ N items need restocking`.
- **Status Thresholds**: `PantryItem` (lines 8-18) tracks `stock_status` (`ok`, `low_stock`, `out_of_stock`). Items reaching or dropping below `reorder_at` highlight in yellow (`#f59e0b`) or red (`#ef4444`).
- **Automated Purchase Order Generation**: Lines 80-90 trigger `POST ${API}/v1/pantry/purchase-orders` with payload `{ auto: true }`. Automatically converts all low-stock / out-of-stock items into draft Purchase Orders (`pos` state array), with status workflow transitions: `draft` → `approved` → `sent` → `received` → `cancelled`.

#### 3. Plated Inventory MCP Server
- **Location**: `mcp/src/inventory-server.ts`.
- **Server Name**: `Plated` (v1.0.0) running over StdioServerTransport.
- **MCP Tool `get_inventory_levels`**:
  - Description: Fetches current stock levels, par points, and unit details for pantry items (lines 25-31).
  - Handler: Calls `GET ${API_URL}/v1/pantry` with header `X-Tenant-Id: TENANT_ID` (lines 56-75).
- **MCP Tool `log_audit_count`**:
  - Description: Logs physical inventory count audit, reporting calculated variance and loss values (lines 33-43).
  - Handler: Takes `{ itemId, physicalQty }`. Fetches item details from `GET ${API_URL}/v1/pantry/${itemId}`, computes variance `physicalQty - stock_quantity`, calculates total loss `Math.abs(variance * cost_per_unit)` formatted as `(loss / 100).toFixed(2)`, and issues `PATCH ${API_URL}/v1/pantry/${itemId}` with `{ stockQuantity: physicalQty }` (lines 76-119).

---

### Task 2: Post-Pilot Marketing MCP

#### 1. Post-Pilot MCP Server & Tools
- **Location**: `mcp/src/post-pilot-server.ts`.
- **Server Name**: `Post-Pilot` (v1.0.0) running over StdioServerTransport.
- **MCP Tool `send_marketing_postcard`**:
  - Description: Dispatches physical marketing postcard coupon to customer address (lines 25-39).
  - Input Parameters: `customerName` (string), `address` (string), `discountPercent` (number), `couponMessage` (string, default: `"Thanks for dining!"`).
  - Handler Execution: Logs dispatch action and returns formatted text response:
    `Success: Post-Pilot postcard queued for dispatch to ${customerName}. Code: SAVE${discountPercent}. Message: "${couponMessage}".` (lines 47-64).

#### 2. Milestone Trigger Conditions & Event Architecture
- **Trigger Concept**: Designed to evaluate customer loyalty metrics upon checkout / order completion (`pos:order:paid` or `online_order:completed`).
- **Milestone Evaluation**:
  - Visit count threshold (e.g. 5th, 10th visit).
  - Cumulative lifetime spend threshold (e.g. $100, $500 total spend).
- **Current Integration Gap**: `packages/event-bus/src/types.ts` defines event types (`pos:order:created`, `pos:order:cancelled`, `pos:menu:item-sold`, `kds:ticket:bumped`, `kds:course:fired`, `recipeos:pantry:low-stock`), but lacks an automated subscriber for `customer:milestone:reached` that automatically calls `send_marketing_postcard` on the Post-Pilot MCP server.

---

### Task 3: Web Online Ordering App

#### 1. Item Modifier Customizer
- **Location**: `apps/web/src/components/ItemCard.tsx` (lines 11-209).
- **Functionality**:
  - Renders menu item name, price, description, allergen tags (`AllergenBadge.tsx`).
  - Expanding an item with modifier groups (`item.modifier_groups.length > 0`) displays inline option groups.
  - Multi-selection and single-selection behavior controlled by `toggleMod(groupId, modId, maxSel)` (lines 18-28).
  - Enforces required groups (`group.required`) before allowing item addition in `handleAdd()` (lines 30-46).
  - Computes real-time item price including modifier price adjustments (`displayPrice = item.price + modTotal`, line 52).
  - Provides special instructions textarea for custom preparation notes (lines 169-187).

#### 2. Cart Drawer
- **Location**: `apps/web/src/components/CartDrawer.tsx` (lines 16-78).
- **Functionality**:
  - Displays cart items, selected modifier lists, special notes, unit prices, and overall cart total.
  - Interactive quantity steppers (`-` / `+`) updating `CartState` in `MenuPage.tsx` via `onUpdateQty`.
  - Cart Floating Action Button (FAB) in `MenuPage.tsx` (lines 140-150) displays total count and dollar amount.
  - **Stub Notice**: Line 12 notes `CartDrawer — Phase 4a stub. Checkout flow (Phase 4b) wires in guest info collection + POST /v1/online-orders + Stripe CheckoutDrawer.` Line 69 alerts `Checkout coming in Phase 4b!`.

#### 3. Checkout & Live Order Status Progress Tracker Gaps
- **Checkout Component (Missing)**:
  - Needs Pickup vs. Delivery fulfillment toggle.
  - Needs tip selector (presets: 0%, 15%, 18%, 20%, custom input).
  - Needs guest contact form (name, email, phone, delivery address if delivery).
  - Needs order submission endpoint (`POST /v1/online-orders`).
- **Live Order Status Progress Tracker (Missing)**:
  - Needs a dedicated tracking page (`/order-status/:orderId` or modal).
  - Visual status progress bar: `Received` → `In Kitchen` → `Ready for Pickup / Out for Delivery` → `Completed`.
  - WebSocket / SSE or polling mechanism to update order status in real time as KDS bumps tickets.

---

## 3. Gap Analysis Matrix

| Domain / Subsystem | Feature / Tool | Current Code Status | Gap Description |
|---|---|---|---|
| **Plated Inventory Engine** | POS Checkout Auto-Deduct | Implemented in `packages/event-bus/src/handlers/pos-menu-item-sold.ts` & `apps/server/src/routes/pantry.ts` | Fully implemented for items with `recipeId`. Requires full DB seeding for all menu items. |
| **Admin Dashboard** | Pantry Alerts & Auto PO | Implemented in `apps/admin/src/pages/Pantry.tsx` | UI fully operational. Connects to `/v1/pantry` and `/v1/pantry/purchase-orders`. |
| **Plated MCP Server** | `get_inventory_levels` | Implemented in `mcp/src/inventory-server.ts` | Operational via HTTP fetch to `/v1/pantry`. |
| **Plated MCP Server** | `log_audit_count` | Implemented in `mcp/src/inventory-server.ts` | Operational via HTTP PATCH to `/v1/pantry/:id`. Calculates variance & loss. |
| **Post-Pilot MCP Server** | `send_marketing_postcard` | Implemented in `mcp/src/post-pilot-server.ts` | MCP tool operational. |
| **Post-Pilot Marketing** | Guest Milestone Trigger | Planned / Conceptual | Event bus missing subscriber binding `pos:order:paid` → customer loyalty milestone check → Post-Pilot dispatch. |
| **Web Online Ordering** | Modifier Customizer | Implemented in `apps/web/src/components/ItemCard.tsx` | Operational with required validation, modifier price math, special notes. |
| **Web Online Ordering** | Cart Drawer | Implemented in `apps/web/src/components/CartDrawer.tsx` | Renders cart items & quantity steppers. Proceed button is currently a Phase 4b stub. |
| **Web Online Ordering** | Checkout View | Missing | Needs Pickup/Delivery toggle, tip selector, guest info input, and `POST /v1/online-orders`. |
| **Web Online Ordering** | Live Status Tracker | Missing | Needs `/order-status/:orderId` page with progress pipeline and real-time status updates. |

---

## 4. Recommended Implementation Plan

### Phase 1: Complete Web Online Ordering Checkout & Order Tracker
1. **Checkout Modal / Page (`apps/web/src/components/CheckoutModal.tsx`)**:
   - Add Pickup / Delivery toggle with delivery address fields.
   - Add tip selector (0%, 15%, 18%, 20%, Custom).
   - Add guest contact form (name, email, phone).
   - Connect submit button to `POST /v1/online-orders`.
2. **Live Order Status Tracker (`apps/web/src/pages/OrderStatusPage.tsx`)**:
   - Create route `/order-status/:orderId`.
   - Render 4-step progress tracker: `Received` → `Preparing` → `Ready` → `Completed`.
   - Subscribe to order status updates via Supabase Realtime or polling.

### Phase 2: Wire Post-Pilot Automated Marketing Event Handler
1. Add `customer:milestone:reached` domain event to `packages/event-bus/src/types.ts`.
2. Implement event handler `packages/event-bus/src/handlers/customer-milestone.ts` that calculates visit count / total spend upon order payment, and calls `send_marketing_postcard` tool on `mcp/src/post-pilot-server.ts`.

### Phase 3: Plated Inventory Engine E2E Validation
1. Verify live DB triggers for `decrement_pantry_stock` across all POS menu item sales.
2. Ensure low-stock warnings dynamically stream to `apps/admin/src/pages/Pantry.tsx`.

---
