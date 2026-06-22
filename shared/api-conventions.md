# CulinaryOS — Inter-Service API Conventions

All services **must** follow these conventions. No exceptions.

---

## Base URL Pattern

```
{SERVICE_NAME}.culinaryos.internal/{version}/{resource}
```

In development, services run on localhost:

| Service | Port |
|---|---|
| CulinaryOS (orchestrator) | 3000 |
| RecipeOS | 3001 |
| KDS | 3002 |
| POS | 3003 |

---

## Required HTTP Headers

Every inter-service request **must** include:

```
X-Tenant-Id: <tenantId>          # required — scopes all data
X-Caller-Service: <serviceName>  # for tracing (recipeos, kds, pos, culinaryos)
X-Request-Id: <uuid>             # for distributed tracing
Authorization: Bearer <apiKey>   # service-to-service API key
```

---

## Response Envelope

All responses wrap data in the standard envelope:

```json
{
  "ok": true,
  "requestId": "uuid",
  "timestamp": "2026-06-21T20:00:00Z",
  "service": "recipeos",
  "data": { ... }
}
```

Errors:
```json
{
  "ok": false,
  "requestId": "uuid",
  "timestamp": "2026-06-21T20:00:00Z",
  "service": "kds",
  "error": {
    "code": "NOT_FOUND",
    "message": "Ticket not found",
    "details": { "ticketId": "abc123" }
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `UNAUTHORIZED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Valid auth, wrong tenant/role |
| `VALIDATION_ERROR` | 422 | Bad input |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## Tenant Isolation

- **Every** database query, cache key, and file path **must** be scoped by `tenantId`
- Services **must** reject any request missing `X-Tenant-Id`
- No service may read another tenant's data under any circumstances

---

## Event Bus

Cross-service communication beyond request/response uses **domain events**.

### Emit an event
```
POST /internal/events
```

Body: `DomainEvent<T>` from `shared/types/events.ts`

### Event naming: `{source}:{entity}:{action}`
- `pos:order:created`
- `kds:ticket:bumped`
- `recipeos:pantry:low-stock`

### Delivery guarantee
- Events are **fire-and-forget** in development
- Production will use Supabase Realtime or a queue (TBD)
- Services **must not** depend on event delivery for critical operations

---

## Health Endpoint

Every service **must** expose:

```
GET /health
```

Response:
```json
{
  "service": "kds",
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checkedAt": "2026-06-21T20:00:00Z"
}
```

---

## Service Registration

On startup, each service **must** call:
```
POST /internal/registry/register
```
Body: `ServiceRegistration` from `shared/types/service.ts`

This lets CulinaryOS maintain a live service map and surface health in the admin dashboard.

---

## Versioning

- All routes are prefixed `/v1/`
- Breaking changes require a new version prefix
- Old versions are supported for one major release cycle
