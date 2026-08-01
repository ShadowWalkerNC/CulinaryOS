# Handoff Report — Shared TypeScript Packages & Contracts Audit (Milestone 1 R2)

## 1. Observation
Direct, verbatim observations across the codebase:

1. **Dual Shared Locations**:
   - Root directory `shared/` contains `types/` (`events.ts`, `menu.ts`, `order.ts`, `service.ts`), `realtime/index.ts`, `service-client/`.
   - `packages/shared/` contains `package.json` (`"@culinaryos/shared"`), but `packages/shared/src/index.ts` line 1 exports ONLY `./offline-sync`.
2. **Conflicting KitchenTicket Definitions**:
   - `shared/types/order.ts` (lines 8-22):
     `export type TicketStatus = 'queued' | 'fired' | 'cooking' | 'bumped' | 'recalled';`
     `export interface KitchenTicket` uses `station: KitchenStation`, `orderNumber: number`, `tableNumber?: string`.
   - `apps/kds/src/types.ts` (lines 3-29):
     `export type TicketStatus = 'queued' | 'cooking' | 'ready' | 'bumped' | 'voided';`
     `export type CourseHoldStatus = 'held' | 'firing' | 'fired';`
     `export interface KitchenTicket` uses `tableLabel: string`, `courseHoldStatus`, `stationId?: string`, `elapsedSeconds: number`, missing `tenantId`.
3. **KitchenStation Enum Discrepancy**:
   - `shared/types/events.ts` (lines 62-70):
     `export type KitchenStation = 'hot' | 'cold' | 'pastry' | 'grill' | 'fry' | 'sauce' | 'pass' | 'bar';`
   - `packages/event-bus/src/types.ts` (line 7):
     `export type KitchenStation = 'hot' | 'cold' | 'grill' | 'pastry' | 'expo' | 'bar' | string;`
     (`pass` vs `expo`, missing `fry`/`sauce`, string wildcard in event-bus).
4. **Missing Event Type in `shared/types/events.ts`**:
   - `apps/server/src/routes/orders.ts` (line 333) emits `eventType: 'kds:course:fired'`.
   - `packages/event-bus/src/types.ts` (line 14) includes `'kds:course:fired'`.
   - `shared/types/events.ts` (lines 19-39) does NOT list `'kds:course:fired'`.
5. **Casing Discrepancies (camelCase vs snake_case)**:
   - `shared/types/menu.ts`: `sectionId`, `sortOrder`, `recipeId`, `modifierGroups`, `priceAdjustment`, `isDefault`.
   - `apps/web/src/types.ts`: `image_url`, `sort_order`, `modifier_groups`, `price_adjustment`, `is_default`, `min_selections`, `max_selections`.
   - `packages/shared/src/offline-sync.ts`: `tenant_id`, `order_id`.
6. **Relative Imports to Unpackaged Directory**:
   - `apps/pos/src/lib/useOrderStore.ts` (lines 9-10):
     `import { useRealtimeOrders } from '../../../../shared/realtime';`
     `import type { Order } from '../../../../shared/types';`
7. **Unsafe Realtime Type Casting**:
   - `shared/realtime/index.ts` (line 35): `(payload) => onInsert(payload.new as KitchenTicket)` directly casts raw PostgreSQL snake_case DB rows (`tenant_id`, `order_id`) to camelCase `KitchenTicket` interface (`tenantId`, `orderId`), resulting in runtime `undefined` fields.

---

## 2. Logic Chain
1. **Observation 1 & 6** show that shared code is split between an unpackaged root `shared/` directory and an incomplete `@culinaryos/shared` package in `packages/shared/`. Because `@culinaryos/shared` only exports `offline-sync`, apps resort to relative imports (`../../../../shared/*`), violating Rule 1 of AGENTS.md ("All shared types go in packages/ or shared/ ... No package may import directly from another package's src").
2. **Observations 2, 3 & 4** demonstrate that duplicating `KitchenTicket`, `TicketStatus`, `KitchenStation`, and `EventType` in multiple places has caused drift: `apps/kds` added course holding and ready/voided statuses, `packages/event-bus` added `kds:course:fired` and `expo` station, while `shared/types` retained outdated definitions.
3. **Observation 5** shows a systemic casing conflict: frontend REST API types in `apps/web` use database column naming (snake_case), whereas shared TypeScript domain models use standard TypeScript naming (camelCase). Without mapping layers, components mix conventions.
4. **Observation 7** proves that casting raw Supabase realtime payload objects directly to TypeScript interface types creates false type-safety compile-time guarantees while failing at runtime.
5. Therefore, consolidating all shared domain types, realtime utilities, and data mappers into `@culinaryos/shared` (`packages/shared`), unifying domain models, and wiring workspace dependencies across all applications is required for Monorepo Alignment (Requirement R2).

---

## 3. Caveats
- **Read-Only Inspection**: Code changes were not applied to `packages/` or `apps/` during this turn as Explorer 2 is restricted to read-only exploration.
- **RecipeOS External API**: RecipeOS bridge types were examined in `shared/types/events.ts` and `shared/types/menu.ts`; full verification of RecipeOS MCP runtime payload matching requires live RecipeOS server execution.
- **Binary Protocol vs JSON Broadcast**: `packages/event-bus/src/binary-protocol.ts` provides a high-performance binary codec, but current frontend clients interact exclusively via Supabase Realtime JSON channels. Decision on whether to migrate all real-time traffic to binary or keep JSON as default rests with ARCHITECT agent.

---

## 4. Conclusion
Standardizing shared interfaces requires consolidating root `shared/` into `@culinaryos/shared` (`packages/shared/`), updating `@culinaryos/shared` package exports, reconciling `KitchenTicket`, `KitchenStation`, `OrderStatus`, and `EventType` models into single canonical interfaces, creating snake_case <-> camelCase database row mappers, and updating `package.json` workspace dependencies and import paths across `apps/server`, `apps/kds`, `apps/pos`, `apps/web`, `apps/admin`, and `mcp`.

---

## 5. Verification Method
1. **File Inspection**:
   - Inspect `packages/shared/package.json` and `packages/shared/src/index.ts` to ensure `@culinaryos/shared` re-exports all domain types, realtime hooks, service clients, and mappers.
   - Inspect `apps/pos/src/lib/useOrderStore.ts`, `apps/kds/src/hooks/useRealtimeTickets.ts`, `apps/server/src/routes/orders.ts` to confirm relative imports (`../../../../shared/*`) are replaced with `@culinaryos/shared`.
2. **Typecheck Execution**:
   - Run `pnpm typecheck` (or `turbo run typecheck`) across the monorepo to verify zero TypeScript compilation errors across all workspace packages and apps.
3. **Invalidation Conditions**:
   - Any remaining relative import referencing root `shared/`.
   - Any application declaring its own local `KitchenTicket` or `TicketStatus` interface.
   - Unhandled runtime property access (`undefined` values) due to raw DB snake_case row casting.
