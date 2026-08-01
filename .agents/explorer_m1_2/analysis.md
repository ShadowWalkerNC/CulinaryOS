# Milestone 1 Requirement R2: Shared TypeScript Packages & Contracts Audit

## Executive Summary
This audit evaluates the shared TypeScript packages (`packages/`, `shared/`) and interface/contract sharing across CulinaryOS applications (`apps/server` [backend], `apps/pos` [POS], `apps/kds` [KDS], `apps/web` [Web], `apps/admin` [Admin], and `mcp`).

Our analysis uncovered significant architectural fragmentation:
1. **Dual Shared Locations**: A standalone, non-package `shared/` directory exists at root alongside `@culinaryos/shared` inside `packages/shared/`.
2. **Duplicated & Conflicting Domain Models**: Critical models (`KitchenTicket`, `TicketStatus`, `Order`, `MenuItem`, `KitchenStation`, `TenantRole`, `DomainEvent`) are defined independently in multiple locations with conflicting enum values, field names, and casing (snake_case vs. camelCase).
3. **Inconsistent Imports**: Client applications use fragile relative paths (`../../../../shared/types`) instead of referencing `@culinaryos/shared` via pnpm workspace contracts.
4. **WebSocket & Realtime Type Unsafety**: Supabase realtime channels cast raw PostgreSQL database rows (snake_case) directly into frontend TypeScript types (camelCase) without transformation helpers, leading to silent runtime bugs.

---

## 1. Inventory of Shared Code & Package Definitions

| Location | Package Name / Role | Main Exports / Contents | Current Usage |
|---|---|---|---|
| `shared/` (root) | None (non-package directory) | `types/` (`order.ts`, `menu.ts`, `events.ts`, `service.ts`), `realtime/`, `service-client/` | Imported via relative paths (`../../../../shared/*`) in `apps/pos` |
| `packages/shared/` | `@culinaryos/shared` | `src/offline-sync.ts` | pnpm workspace package, but exports ONLY `offline-sync.ts` |
| `packages/db/` | `@culinaryos/db` | `src/index.ts`, `src/types.ts` (Database row types) | Imported in `apps/server`, `apps/kds` |
| `packages/event-bus/` | `@culinaryos/event-bus` | `src/types.ts`, `src/binary-protocol.ts`, `src/realtime-bridge.ts`, `src/broker.ts` | Contains domain events, binary protocol, and realtime bridge |
| `packages/auth/` | `@culinaryos/auth` | `src/index.ts` (`AuthRole`, `Session`) | Imported in `apps/kds` |
| `apps/kds/src/types.ts` | Local application types | Local `KitchenTicket`, `TicketStatus`, `TicketItem`, `CourseFireEvent`, `AnalyticsSummary` | Local KDS UI state |
| `apps/web/src/types.ts` | Local application types | Local `MenuItem`, `MenuSection`, `CartItem`, `OnlineOrder`, `CustomerInfo` | Local Web ordering UI state |
| `apps/server/src/types.ts` | Local application types | Hono Env variables (`supabase`, `tenantId`, `callerService`, `requestId`) | API Gateway middleware |

---

## 2. Catalog of Discrepancies & Duplications

### 2.1 Kitchen Ticket & Ticket Status Conflicts
* **Location 1 (`shared/types/order.ts`)**:
  - `TicketStatus`: `'queued' | 'fired' | 'cooking' | 'bumped' | 'recalled'`
  - `KitchenTicket`: `id`, `tenantId`, `orderId`, `orderNumber` (number), `station` (`KitchenStation`), `status`, `items`, `tableNumber` (string), `coverCount`, `courseNumber`, `priority`, `notes`, `firedAt`, `bumpedAt`, `cookTimeSeconds`, `createdAt`.
* **Location 2 (`apps/kds/src/types.ts`)**:
  - `TicketStatus`: `'queued' | 'cooking' | 'ready' | 'bumped' | 'voided'` (**Missing `'fired'`, `'recalled'`; Added `'ready'`, `'voided'`**)
  - `CourseHoldStatus`: `'held' | 'firing' | 'fired'` (**Missing in `shared/types/order.ts`**)
  - `KitchenTicket`: `id`, `orderId` (missing `tenantId`), `tableLabel` (string, replaces `orderNumber`/`tableNumber`), `seatNumber`, `courseNumber`, `courseHoldStatus`, `status`, `stationId` (optional string), `stationName` (optional string), `items`, `createdAt`, `firedAt`, `bumpedAt`, `elapsedSeconds` (number, client derived).
* **Location 3 (`packages/event-bus/src/types.ts`)**:
  - `TicketFiredPayload`: `ticketId`, `orderId`, `station` (`KitchenStation`), `courseNumber`.
  - `TicketBumpedPayload`: `ticketId`, `orderId`, `bumpedBy`, `bumpedAt` (**Missing `station` and `cookTimeSeconds` present in `shared/types/events.ts`**).

### 2.2 KitchenStation Enum Discrepancy
* **`shared/types/events.ts`**:
  `export type KitchenStation = 'hot' | 'cold' | 'pastry' | 'grill' | 'fry' | 'sauce' | 'pass' | 'bar';`
* **`packages/event-bus/src/types.ts`**:
  `export type KitchenStation = 'hot' | 'cold' | 'grill' | 'pastry' | 'expo' | 'bar' | string;`
  - **Conflict**: `'pass'` (in `shared/types`) vs `'expo'` (in `event-bus`), missing `'fry'` & `'sauce'` in `event-bus`, open string fallback in `event-bus` vs strict union in `shared`.

### 2.3 Order & Line Item Model Discrepancy
* **`shared/types/order.ts`**:
  - `OrderStatus`: `'open' | 'sent' | 'in-progress' | 'ready' | 'served' | 'paid' | 'voided'`
  - Uses camelCase: `tenantId`, `orderNumber`, `tableNumber`, `coverCount`, `serverName`, `createdAt`, `updatedAt`, `firedAt`, `paidAt`.
* **`apps/web/src/types.ts`**:
  - `OnlineOrderStatus`: `'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed'`
  - Uses mixed snake_case / camelCase: `tenantSlug`, `orderNumber`, `CartItem` (`menu_item_id`, `unit_price`, `price_adjustment`).
* **`packages/shared/src/offline-sync.ts`**:
  - `OfflineTransactionDelta`: Uses snake_case (`tenant_id`, `order_id`).

### 2.4 Menu & Item Model Casing Conflict
* **`shared/types/menu.ts`**:
  - CamelCase: `sectionId`, `sortOrder`, `recipeId`, `modifierGroups`, `priceAdjustment`, `isDefault`, `minSelections`, `maxSelections`.
* **`apps/web/src/types.ts`**:
  - Snake_case: `image_url`, `sort_order`, `modifier_groups`, `price_adjustment`, `is_default`, `min_selections`, `max_selections`.

### 2.5 Auth & Tenant Roles Mismatch
* **`shared/types/service.ts`**: `TenantRole = 'owner' | 'manager' | 'chef' | 'server' | 'viewer';`
* **`packages/auth/src/index.ts`**: `AuthRole = 'owner' | 'manager' | 'staff';`
* **`packages/db/src/types.ts`**: Raw string in `users` table row interface.

### 2.6 Domain Events & Event Types Split
* **`shared/types/events.ts`**: Defines 13 event types (`pos:order:created`, `pos:order:updated`, `pos:order:cancelled`, `pos:order:paid`, `kds:ticket:fired`, `kds:ticket:bumped`, `kds:ticket:recalled`, `pos:menu:item-sold`, `recipeos:pantry:low-stock`, `recipeos:recipe:created`, `recipeos:recipe:updated`, `culinaryos:tenant:created`, `culinaryos:tenant:suspended`, `culinaryos:service:registered`, `culinaryos:service:deregistered`).
* **`packages/event-bus/src/types.ts`**: Defines 6 event types (`pos:order:created`, `pos:order:cancelled`, `pos:menu:item-sold`, `kds:ticket:bumped`, `kds:course:fired`, `recipeos:pantry:low-stock`).
  - **Conflict**: `kds:course:fired` is present in `packages/event-bus/src/types.ts` and triggered in `apps/server/src/routes/orders.ts:333`, but MISSING in `shared/types/events.ts`.

---

## 3. WebSocket & Realtime Transport Inconsistencies

1. **Dual Transport Layers**:
   - `packages/event-bus/src/binary-protocol.ts`: Highly-optimized custom LEB128 varint / dictionary tag / DEFLATE binary protocol for low-latency sockets.
   - `shared/realtime/index.ts` & `packages/event-bus/src/realtime-bridge.ts`: Supabase Realtime broadcast channels sending JSON objects.
   - Frontend apps (`apps/pos`, `apps/kds`) currently use Supabase Realtime JSON channels directly and bypass the binary protocol.
2. **Direct Row-Casting Bug in Realtime Hooks**:
   - In `shared/realtime/index.ts`:
     ```ts
     (payload) => onInsert(payload.new as KitchenTicket)
     ```
     This directly casts the raw Supabase PostgreSQL row object (with snake_case keys like `tenant_id`, `order_id`, `table_number`, `course_number`) to `KitchenTicket` (which expects camelCase `tenantId`, `orderId`, `orderNumber`).
     Result: Properties like `ticket.tenantId` evaluate to `undefined` at runtime in the UI.

---

## 4. Recommendations & Standardization Action Plan

### Plan Overview: Single Source of Truth in `@culinaryos/shared`

#### Step 1: Consolidate All Shared Contracts into `packages/shared/`
- Migrate all definitions from root `shared/` (`types/`, `realtime/`, `service-client/`) into `packages/shared/src/`.
- Deprecate root `shared/` directory to avoid duplicate sources of truth.
- Update `packages/shared/src/index.ts` to export all modules:
  ```ts
  export * from './types';
  export * from './realtime';
  export * from './service-client';
  export * from './offline-sync';
  export * from './mappers';
  ```

#### Step 2: Unify Canonical Domain Interfaces (`packages/shared/src/types/`)
- **Unify `KitchenTicket`**:
  ```ts
  export type TicketStatus = 'queued' | 'fired' | 'cooking' | 'ready' | 'bumped' | 'recalled' | 'voided';
  export type CourseHoldStatus = 'held' | 'firing' | 'fired';
  export type KitchenStation = 'hot' | 'cold' | 'grill' | 'pastry' | 'fry' | 'sauce' | 'expo' | 'pass' | 'bar';

  export interface KitchenTicket {
    id: string;
    tenantId: string;
    orderId: string;
    orderNumber: number;
    tableNumber?: string;
    tableLabel?: string;
    seatNumber?: number;
    courseNumber: number;
    courseHoldStatus: CourseHoldStatus;
    status: TicketStatus;
    station: KitchenStation;
    stationId?: string;
    stationName?: string;
    items: TicketItem[];
    priority?: 'normal' | 'rush' | 'allergy';
    notes?: string;
    firedAt?: string;
    bumpedAt?: string;
    cookTimeSeconds?: number;
    elapsedSeconds?: number;
    createdAt: string;
  }
  ```
- **Add DB Mappers (`packages/shared/src/mappers/`)**:
  - Implement `transformDbTicketToKitchenTicket(row: any): KitchenTicket` and `transformDbOrderToOrder(row: any): Order` to safely handle PostgreSQL snake_case -> camelCase runtime conversion.
- **Unify Event Types**:
  - Merge event type definitions into `@culinaryos/shared/src/types/events.ts` including `kds:course:fired`.
- **Unify Roles**:
  - Update `TenantRole` in `@culinaryos/shared` to `'owner' | 'manager' | 'chef' | 'server' | 'staff' | 'viewer'`.

#### Step 3: Align Workspace Package Dependencies & TSConfig Paths
- Update `package.json` in all apps (`apps/server`, `apps/kds`, `apps/pos`, `apps/web`, `apps/admin`, `mcp`) to depend on `"@culinaryos/shared": "workspace:*"`.
- Update `tsconfig.base.json` paths mapping:
  ```json
  "@culinaryos/shared": ["packages/shared/src/index.ts"]
  ```
- Replace relative imports (e.g. `../../../../shared/types`) across apps with clean imports:
  ```ts
  import type { Order, KitchenTicket } from '@culinaryos/shared';
  ```
