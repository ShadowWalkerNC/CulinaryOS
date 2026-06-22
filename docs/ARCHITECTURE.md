# CulinaryOS — System Architecture

## Overview

CulinaryOS is the **orchestration layer** — it provides auth, tenant management, inter-service routing, and the unified GUI/CLI/MCP surface. It does not own domain logic.

Domain logic lives in services:

```
CulinaryOS (port 3000)  — orchestrator, event bus, tenant shell
├── RecipeOS  (port 3001)  — recipes, scaling, pantry, prep lists
├── KDS       (port 3002)  — kitchen display, tickets, station routing
└── POS       (port 3003)  — orders, payments, tabs, menus
```

---

## Interface Layer (per service)

Every service exposes three interfaces:

| Interface | Tool | Entry point |
|---|---|---|
| GUI | React / React Native | `web/`, `mobile/` |
| CLI | Commander.js | `cli/src/index.ts` |
| MCP | MCP SDK | `mcp/*-server.ts` |

CulinaryOS CLI (`culinary` command) aggregates all service CLIs. CulinaryOS MCP server aggregates all service MCP tools.

---

## Inter-Service Communication

### Request/Response

Services call each other using `ServiceClient` from `shared/service-client/`.

```
POS → RecipeOS: GET /v1/recipes/{id}  (when rendering menu item detail)
POS → KDS:      POST /v1/tickets      (when order is fired)
KDS → POS:      PATCH /v1/orders/{id} (when ticket is bumped)
```

### Event Bus

Fire-and-forget domain events for non-critical cross-service notifications:

```
POS emits  → pos:order:created    → KDS receives  → creates tickets per station
KDS emits  → kds:ticket:bumped    → POS receives  → updates order status
POS emits  → pos:menu:item-sold   → RecipeOS      → decrements pantry stock
RecipeOS   → recipeos:pantry:low-stock → CulinaryOS → sends alert to owner
```

### Critical Flow: Order → Kitchen

```
1. Server takes order in POS
2. POS emits pos:order:created with items + station routing
3. KDS receives event, creates one KitchenTicket per station
4. KDS displays tickets on station screens
5. Chef bumps ticket when complete
6. KDS emits kds:ticket:bumped back to POS
7. POS updates order status
8. All tickets bumped → order status → 'ready'
```

---

## Tenant Isolation

- Every request carries `X-Tenant-Id` header
- Every DB query is scoped by `tenant_id` column
- Services **reject** requests missing tenant context
- RLS policies in Supabase provide a second layer of enforcement

---

## Shared Package

`shared/` is a local TypeScript package imported by all services:

```
shared/
├── types/
│   ├── service.ts     — ServiceRequest, ServiceResponse, TenantContext
│   ├── events.ts      — DomainEvent, EventType, all payload shapes
│   ├── order.ts       — Order, KitchenTicket, OrderLineItem
│   └── menu.ts        — Menu, MenuItem, ModifierGroup
├── service-client/
│   ├── index.ts       — ServiceClient class
│   └── registry.ts    — EnvServiceRegistry (URL resolution from env)
└── api-conventions.md — headers, envelope, error codes, event bus rules
```

To import in any service:
```typescript
import type { Order, KitchenTicket } from '../../shared/types';
import { ServiceClient } from '../../shared/service-client';
```

---

## Environment Variables

```bash
# CulinaryOS knows where all services live
CULINARYOS_URL=http://localhost:3000
RECIPEOS_URL=http://localhost:3001
KDS_URL=http://localhost:3002
POS_URL=http://localhost:3003

# Service-to-service auth
INTERNAL_API_KEY=your-shared-secret
```

---

## Service Status

| Service | Scaffold | Schema | Live Screens | CLI | MCP |
|---|---|---|---|---|---|
| CulinaryOS | ✅ | ✅ | ✅ | ✅ | ✅ |
| RecipeOS | ✅ | ✅ | ✅ | ✅ | ✅ |
| KDS | ❌ | ❌ | ❌ | ❌ | ❌ |
| POS | ❌ | ❌ | ❌ | ❌ | ❌ |
