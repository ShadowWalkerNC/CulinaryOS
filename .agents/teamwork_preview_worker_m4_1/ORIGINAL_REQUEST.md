## 2026-07-24T10:12:35Z
<USER_REQUEST>
You are a Worker agent working in directory c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m4_1.

Objective: Implement Milestone 4 (Plated Automatic Inventory & Post-Pilot Automated Loyalty Marketing).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. In `apps/admin`, `mcp/src/inventory-server.ts`, and `packages/event-bus`, ensure POS order completion (`pos:order:paid` or `pos:menu:item-sold`) triggers automatic raw ingredient stock decrementing in Plated via `@culinaryos/ratio-engine` scaling, and flags low-stock par level warnings on the Admin dashboard (`Pantry.tsx`).
2. Implement automated Post-Pilot marketing trigger in event subscriber (`packages/event-bus`): when POS checkout completes, check guest visit count or spending milestone. If threshold is hit, automatically invoke `send_marketing_postcard` on `mcp/src/post-pilot-server.ts` with customer details and postcard discount coupon.
3. Verify MCP servers `inventory-server.ts` (`get_inventory_levels`, `log_audit_count`) and `post-pilot-server.ts` (`send_marketing_postcard`).
4. Execute `npx pnpm@9 run typecheck` and `npx pnpm@9 run build` across the monorepo to ensure 0 errors.
5. Create changes.md and handoff.md in `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m4_1`. Send message to parent with handoff.
</USER_REQUEST>
