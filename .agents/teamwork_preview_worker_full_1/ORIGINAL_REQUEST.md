## 2026-07-25T10:27:13Z
You are a CulinaryOS Implementation Worker.
Your working directory is: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_full_1

Your task is to implement and verify all required features for CulinaryOS Master Ecosystem across Requirements R1 to R5 and all Acceptance Criteria:

### Key Requirements to Implement & Verify:
1. **R1 - Central Hub & Design System (`CulinaryHeader` & `packages/ui`)**:
   - Ensure `CulinaryHeader` (rendering active module highlights and port indicators) is mounted at the root of `apps/pos`, `apps/kds`, `apps/web`, and `apps/admin`.
   - Ensure shared design system primitives (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`), typography, and color tokens (`#ff5f1f` Culinary Orange, `#f8f9fa` Slate Surface) are used consistently across all apps.
   - Verify `docker-compose.yml`, `.env`, and `.env.example` alignment across services.

2. **R2 - Monorepo Package Dependencies**:
   - Verify `@culinaryos/ui`, `@culinaryos/ratio-engine`, `@culinaryos/config`, `@culinaryos/auth` workspace exports resolve cleanly in `pnpm-workspace.yaml` and `package.json` files.

3. **R3 - KDS & Recipe Blueprint Integration (`apps/kds` & `KitchenKit`)**:
   - Verify and complete multi-station ticket display with real-time station tab filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations), 1-second timer counters, Green/Yellow/Red age alert indicators, course hold/fire groupings, and an Expediter (Expo) pass view for head chefs.
   - Ensure integration with `@culinaryos/ratio-engine` and `prep-engine`.
   - Ensure `recipe-mcp` tools (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`) and `prep-mcp` tools (`build_shift_prep`, `get_mise_en_place`) are present, tested, and operational.

4. **R4 - Plated Automatic Inventory Deduction (`apps/admin` & `mcp/src/inventory-server.ts`)**:
   - Ensure POS checkout orders trigger raw ingredient deduction via RecipeOS recipe ratio scaling, decrementing stock in Plated and raising low-stock par level warnings on the Admin dashboard.
   - Ensure Plated MCP tool server (`mcp/src/inventory-server.ts`) exposes `get_inventory_levels` and `log_audit_count`.

5. **R5 - Post-Pilot Loyalty Marketing (`mcp/src/post-pilot-server.ts`) & Web Online Ordering (`apps/web`)**:
   - Ensure Post-Pilot MCP server exposes `send_marketing_postcard` and dispatches postcard coupons on guest visit/spend milestones.
   - In `apps/web`, verify menu category browsing, modifier customizer modal, slide-out cart drawer, full checkout flow (Pickup/Delivery toggle, tip selector, order submission), and live order status tracker (`/order-status/:orderId`).

6. **Acceptance Operations**:
   - POS (`apps/pos`): PIN lockscreen, interactive visual dining room table map, quick orders, seat assignments (Seats 1-4), coupon discounts, Split Check Wizard (even split & split by seat).

### Execution Rules:
- Execute all necessary code edits in the repository.
- Run build commands (`npx pnpm@9 run build` or `pnpm build`) and unit/integration tests for affected packages.
- Document all changes and verification outputs in `changes.md` and `handoff.md` in your working directory `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_full_1`.
- Include build and test terminal outputs in your handoff report.
