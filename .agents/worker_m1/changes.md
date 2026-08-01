# Changes Made — Milestone 1: Monorepo Alignment & Package Contracts (Requirement R2)

## 1. Consolidated `@culinaryos/shared` Package
- **Moved & Exported Core Domain Types**:
  - `packages/shared/src/types/service.ts`: `ServiceName`, `TenantContext`, `ServiceRequest`, `ServiceResponse`, `ServiceError`, `ServiceHealth`, `ServiceRegistration`, `ServiceCapability`.
  - `packages/shared/src/types/events.ts`: `DomainEvent`, `EventType` (including `kds:course:fired`), `OrderCreatedPayload`, `OrderCancelledPayload`, `OrderItem`, `KitchenStation` (reconciled superset including `'expo'`, `'pass'`, `'hot'`, `'cold'`, `'grill'`, `'pastry'`, `'fry'`, `'sauce'`, `'bar'`), `TicketFiredPayload`, `TicketBumpedPayload`, `KdsCourseFiredPayload`, `LowStockPayload`, `MenuItemSoldPayload`.
  - `packages/shared/src/types/order.ts`: `OrderStatus`, `TicketStatus` (reconciled superset: `'queued' | 'fired' | 'cooking' | 'ready' | 'bumped' | 'recalled' | 'voided'`), `CourseHoldStatus` (`'held' | 'firing' | 'fired'`), `Order`, `OrderLineItem`, `LineItemModifier`, `KitchenTicket`, `TicketItem`, `CourseFireEvent`, `AnalyticsSummary`.
  - `packages/shared/src/types/menu.ts`: `Menu`, `MenuSection`, `MenuItem`, `ModifierGroup`, `Modifier`, `Allergen`, `MenuStatus`, `MenuItemStatus`.
  - `packages/shared/src/types/index.ts`: Barrel re-export for all types.

- **Moved & Exported Realtime Hooks & Service Clients**:
  - `packages/shared/src/realtime/index.ts`: `useRealtimeTickets`, `useRealtimeOrders`, `useRealtimeStatus` with automated DB row camelCase conversion.
  - `packages/shared/src/service-client/index.ts`: `ServiceClient`, `ServiceClientConfig`, `ServiceRegistry`.
  - `packages/shared/src/service-client/registry.ts`: `EnvServiceRegistry`, `defaultRegistry`.
  - `packages/shared/src/offline-sync.ts`: `enqueueOfflineDelta`, `getOfflineQueue`, `markDeltasSynced`, `flushOfflineQueue`.
  - `packages/shared/src/course-engine.ts`: `initialHoldStatus` course logic.
  - `packages/shared/src/mappers.ts`: `mapTicketRowToKitchenTicket`, `mapKitchenTicketToRow`, `mapOrderRowToOrder`, `mapOrderToRow`, `snakeToCamelKeys`, `camelToSnakeKeys`.

- **Barrel Export (`packages/shared/src/index.ts`)**:
  - Re-exports all domain types, realtime hooks, service clients, course-engine, and mappers.

- **Package Configuration (`packages/shared/package.json`)**:
  - Configured exports for `.`, `./types`, `./realtime`, `./service-client`, `./offline-sync`, `./course-engine`, `./mappers`.
  - Added dependencies `@supabase/supabase-js`, `uuid` and devDependencies `@types/uuid`, `@types/react`, `typescript`.

## 2. Reconciled Domain Contracts & Types
- **Canonical Superset Types**: `KitchenTicket`, `TicketStatus`, `KitchenStation`, `EventType`, `CourseHoldStatus` reconciled in `@culinaryos/shared`.
- **Snake_case <-> CamelCase DB Row Mappers**: Implemented in `packages/shared/src/mappers.ts` and integrated directly into `useRealtimeTickets` and `useRealtimeOrders` to eliminate runtime `undefined` property access on Supabase realtime payloads.
- **Contract Re-exports**:
  - `apps/kds/src/types.ts`: Re-exports canonical types from `@culinaryos/shared`.
  - `apps/kds/src/lib/course-engine.ts`: Re-exports `initialHoldStatus` from `@culinaryos/shared`.
  - `packages/event-bus/src/types.ts`: Re-exports canonical domain event shapes from `@culinaryos/shared`.

## 3. Fixed Monorepo Imports & Relative Path Escapes
- **Eliminated Relative Escapes**:
  - `apps/pos/src/lib/useOrderStore.ts`: Updated imports from `../../../../shared/realtime` and `../../../../shared/types` to `@culinaryos/shared`.
  - `tests/api/pantry.test.ts`: Updated import from `../../apps/server/src/routes/pantry` to `@culinaryos/server/routes/pantry`.
  - `tests/course-firing/engine.test.ts`: Updated import from `../../kds/server/lib/course-engine` to `@culinaryos/shared`.
  - `tests/empirical/r1_r2_stress.test.ts`: Updated imports from `../../packages/event-bus/src/*` and `../../packages/shared/src/*` to `@culinaryos/event-bus` and `@culinaryos/shared`.
  - `tests/empirical/r3_r4_r5_stress.test.ts`: Updated imports to `@culinaryos/server/routes/kds`, `@culinaryos/server/routes/pantry`, and `@culinaryos/shared`.
  - `tests/empirical/step1_plated_inventory.test.ts`: Updated import to `@culinaryos/ratio-engine`.
  - `tests/empirical/step3_mcp_servers.test.ts`: Updated import to `@culinaryos/ratio-engine`.
  - `tests/event-bus/binary-protocol.test.ts`: Updated imports to `@culinaryos/event-bus` and `@culinaryos/shared`.
  - `tests/event-bus/broker.test.ts`: Updated import to `@culinaryos/event-bus`.
  - `tests/kds/station.test.ts`: Updated import to `@culinaryos/shared`.
  - `tests/server/htmx-kds.test.ts`: Updated import to `@culinaryos/server/routes/kds`.
  - `tests/shared/offline-sync.test.ts`: Updated import to `@culinaryos/shared`.

## 4. Workspace Dependencies & Package Exports
- **Root `package.json`**:
  - Added `@culinaryos/shared`, `@culinaryos/server`, `@culinaryos/event-bus`, `@culinaryos/ratio-engine`, `@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth` workspace dependencies to root `devDependencies`.
- **`apps/server/package.json`**:
  - Added workspace dependencies `@culinaryos/shared`, `@culinaryos/event-bus`, `@culinaryos/config`, `@culinaryos/db`, `@culinaryos/auth`.
  - Added `"exports"` for `.`, `./routes/pantry`, `./routes/kds`.
- **`apps/kds/package.json`**, **`apps/pos/package.json`**, **`apps/web/package.json`**, **`packages/event-bus/package.json`**, **`packages/ratio-engine/package.json`**:
  - Added workspace dependency `"@culinaryos/shared": "workspace:*"` and configured clean entrypoint exports (`./src/index.ts`).

## 5. Fixed TSConfig Configurations
- **`apps/server/tsconfig.json`**: Set `"rootDir": "src"`, removed path overrides pointing to `../../packages/*/src`, cleaned `include` array.
- **`mcp/tsconfig.json`**: Extended `"../tsconfig.base.json"`, removed path overrides pointing to `../packages/ratio-engine/dist/index.d.ts`.
- **Inheritance Compliance**:
  - `apps/admin/tsconfig.json` extends `"../../tsconfig.base.json"`.
  - `apps/kds/tsconfig.json` extends `"../../tsconfig.base.json"`.
  - `apps/pos/tsconfig.json` extends `"../../tsconfig.base.json"`.
  - `apps/web/tsconfig.json` extends `"../../tsconfig.base.json"`.
  - `cli/tsconfig.json` extends `"../tsconfig.base.json"`.
  - Created `mobile/tsconfig.json` extending `"../tsconfig.base.json"`.
