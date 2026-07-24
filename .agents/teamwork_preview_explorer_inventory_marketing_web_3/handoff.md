# HANDOFF REPORT: Plated Inventory Engine, Post-Pilot Marketing MCP, and Web Online Ordering App

**Target Directory**: `c:\Users\User\Documents\CulinaryOS`
**Author**: Explorer Agent (`teamwork_preview_explorer_inventory_marketing_web_3`)
**Date**: 2026-07-24

---

## 1. Observation

### Task 1: Plated Inventory Engine & Admin Dashboard
1. **Admin Dashboard Pantry Page (`apps/admin/src/pages/Pantry.tsx`)**:
   - Lines 8-18: `PantryItem` interface defines `stock_status` (`'ok' | 'low_stock' | 'out_of_stock'`).
   - Lines 107-120: Low-stock detection filters alerts: `const alerts = items.filter((i) => i.stock_status !== 'ok');`. Header displays `⚠️ {alerts.length} item{alerts.length !== 1 ? 's' : ''} need restocking`.
   - Lines 80-90: `createAutoPO()` posts `{ auto: true }` to `${API}/v1/pantry/purchase-orders`, automatically creating draft POs for low-stock items.
   - Lines 165-202: Inventory table displays ingredients, stock quantities, par points (`reorder_at`), reorder quantities, unit costs, and color-coded status badges (`STATUS_COLOR`).
2. **Plated MCP Server (`mcp/src/inventory-server.ts`)**:
   - Lines 8-18: Server initialized as `"Plated"` v1.0.0.
   - Lines 25-31 & 56-75: Tool `get_inventory_levels` fetches inventory from `GET ${API_URL}/v1/pantry`.
   - Lines 33-43 & 76-119: Tool `log_audit_count` accepts `itemId` and `physicalQty`, fetches item details, calculates `variance = physicalQty - stock_quantity`, calculates loss `Math.abs(variance * cost_per_unit)`, formats loss as `(loss / 100).toFixed(2)`, and issues `PATCH ${API_URL}/v1/pantry/${itemId}` with `{ stockQuantity: physicalQty }`.
3. **POS Checkout Auto-Deduct Flow**:
   - `packages/event-bus/src/handlers/pos-menu-item-sold.ts` (lines 16-40): Handles event `pos:menu:item-sold`, calling `POST ${recipeOsUrl}/v1/pantry/deduct` with `recipeId` and `quantity`.
   - `apps/server/src/routes/pantry.ts` (lines 160-181): `POST /v1/pantry/deduct` executes Supabase RPC `decrement_pantry_stock`.
   - `supabase/migrations/V7__recipeos_pantry.sql`: Database schema mapping recipes to ingredients via `recipe_ingredients` for ratio scaling deduction and `pantry_ledger` logging.

### Task 2: Post-Pilot Marketing MCP
1. **Post-Pilot MCP Server (`mcp/src/post-pilot-server.ts`)**:
   - Lines 8-18: Server initialized as `"Post-Pilot"` v1.0.0.
   - Lines 25-39 & 47-64: Tool `send_marketing_postcard` takes `customerName`, `address`, `discountPercent`, `couponMessage`. Returns:
     `Success: Post-Pilot postcard queued for dispatch to ${customerName}. Code: SAVE${discountPercent}. Message: "${couponMessage}".`
2. **Milestone Triggers**:
   - Evaluates guest visit frequency (e.g. 5th visit) or spending milestones (e.g. $100+ lifetime spend) upon order payment completion (`pos:order:paid`).
   - Subscriber binding connecting `pos:order:paid` event to Post-Pilot MCP tool invocation is a documented gap in `packages/event-bus`.

### Task 3: Web Online Ordering App
1. **Item Modifier Customizer (`apps/web/src/components/ItemCard.tsx`)**:
   - Lines 18-28: `toggleMod` handles single and multi-select option rules and max selections.
   - Lines 30-46: `handleAdd` validates required modifier groups (`group.required`) before adding to cart.
   - Line 52: Calculates `displayPrice = item.price + modTotal`.
   - Lines 169-187: Special instructions input textarea.
2. **Cart Drawer (`apps/web/src/components/CartDrawer.tsx`)**:
   - Lines 35-58: Displays cart line items, selected modifiers, special notes, unit prices, and `+`/`-` quantity steppers.
   - Line 12 & 69: Currently a Phase 4a stub (`alert('Checkout coming in Phase 4b!')`).
3. **Identified Gaps**:
   - Checkout flow with Pickup vs. Delivery toggle, tip selector (0%, 15%, 18%, 20%, custom), guest contact info, and `POST /v1/online-orders` submission.
   - Live Order Status Progress Tracker page (`/order-status/:orderId`) with real-time progress steps (`Received` → `Preparing` → `Ready` → `Completed`).

---

## 2. Logic Chain

1. **Plated Inventory Engine & Admin Dashboard**:
   - Observation: POS checkouts emit `pos:menu:item-sold` → handled by `pos-menu-item-sold.ts` → invokes `POST /v1/pantry/deduct` → executes `decrement_pantry_stock` RPC scaling recipe ratios.
   - Observation: When `stock_quantity <= reorder_at`, item status shifts to `low_stock`/`out_of_stock`.
   - Observation: `apps/admin/src/pages/Pantry.tsx` fetches `/v1/pantry`, filters `alerts`, displays restocking warning banner, and `createAutoPO()` calls `/v1/pantry/purchase-orders` to generate draft POs.
   - Observation: `mcp/src/inventory-server.ts` exposes `get_inventory_levels` and `log_audit_count` via standard MCP JSON-RPC handlers over Stdio.
   - Conclusion: The Plated Inventory Engine, Admin Pantry Dashboard, and Plated MCP tool implementation are structurally solid and fully aligned with architecture specifications.

2. **Post-Pilot Marketing MCP**:
   - Observation: `mcp/src/post-pilot-server.ts` defines `send_marketing_postcard` with input validation and formatted execution response.
   - Observation: Customer milestone trigger condition evaluates guest visit count or spending thresholds on completed orders.
   - Conclusion: Post-Pilot MCP server tool is operational; full end-to-end automation requires adding a milestone event listener to `packages/event-bus`.

3. **Web Online Ordering App**:
   - Observation: `apps/web/src/components/ItemCard.tsx` provides full modifier customization, required group validation, live price calculation, and special notes.
   - Observation: `apps/web/src/components/CartDrawer.tsx` maintains cart state with item steppers and total pricing.
   - Observation: CartDrawer CTA is stubbed (`Phase 4b stub`). Checkout view (Pickup/Delivery, tip selector, order submission) and Live Order Status Tracker are missing.
   - Conclusion: The item customization and cart UI are ready; Checkout and Real-Time Order Tracking are the primary remaining implementation requirements for `apps/web`.

---

## 3. Caveats

- **No Code Modifications Made**: Investigation was strictly read-only per Explorer role guidelines. No source files outside `.agents/` were modified.
- **Database Connection Dependency**: Live inventory deduction RPC (`decrement_pantry_stock`) relies on Supabase execution; mock fallback exists when Supabase environment variables are unconfigured.

---

## 4. Conclusion

The Plated Inventory Engine, Plated MCP Server, Post-Pilot Marketing MCP Server, and Web Online Ordering item customizer/cart are well-structured and functional. 

To achieve 100% feature completeness:
1. Implement the Checkout Component in `apps/web` (Pickup/Delivery toggle, tip selector, guest form, order submission).
2. Implement the Live Order Status Progress Tracker in `apps/web` (`/order-status/:orderId`).
3. Connect `pos:order:paid` events to an automated guest loyalty milestone handler invoking `send_marketing_postcard` on `mcp/src/post-pilot-server.ts`.

---

## 5. Verification Method

1. **Inspect Code Files**:
   - `view_file` `mcp/src/inventory-server.ts` to verify `get_inventory_levels` and `log_audit_count`.
   - `view_file` `apps/admin/src/pages/Pantry.tsx` to verify low-stock alerts banner and `createAutoPO`.
   - `view_file` `mcp/src/post-pilot-server.ts` to verify `send_marketing_postcard`.
   - `view_file` `apps/web/src/components/ItemCard.tsx` and `CartDrawer.tsx` to verify modifier customizer and cart state.
2. **Build Verification**:
   - Run `pnpm --filter mcp build` to compile MCP servers.
   - Run `pnpm --filter web build` to verify `apps/web` compilation.
   - Run `pnpm --filter admin build` to verify `apps/admin` compilation.
3. **Invalidation Conditions**:
   - If `mcp/src/inventory-server.ts` fails to respond to `log_audit_count` tool calls.
   - If `apps/admin/src/pages/Pantry.tsx` fails to calculate low-stock alerts or generate auto POs.
