## 2026-07-25T10:31:38Z
You are a CulinaryOS Reviewer for Functional & Multi-App Operations.
Your working directory is: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_reviewer_full_2

Your task is to independently review and verify functional requirements R1 to R5 and POS Acceptance Operations:
1. POS (`apps/pos`): PIN lockscreen (`1234`/`5678`), interactive dining room table map (`TablesView.tsx`), quick orders, seat assignments (`Seats 1-4`), coupon discounts, Split Check Wizard (even split & split by seat).
2. KDS (`apps/kds`): Station tab filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations), 1s aging timers, Green/Yellow/Red age alert badges, course hold/fire controls, and Expo Pass view.
3. Plated Inventory & Post-Pilot Marketing (`apps/admin`, `mcp`): POS checkout order completion ingredient deduction via `@culinaryos/ratio-engine`, low-stock par level alerts on Admin dashboard, Plated MCP server (`get_inventory_levels`, `log_audit_count`), Post-Pilot MCP server (`send_marketing_postcard`).
4. Web Online Ordering (`apps/web`): Menu category browsing, modifier customizer modal, slide-out cart drawer, checkout flow (Pickup/Delivery, tip selector, submission), live order status tracker (`/order-status/:orderId`).
5. Execute `npx pnpm@9 run build` and `npx pnpm@9 test` to verify build and test clean execution.
6. Write your findings, logic chain, and review verdict (PASS/VETO) in `handoff.md` in your working directory.
