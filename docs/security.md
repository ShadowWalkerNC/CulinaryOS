# CulinaryOS — Security Blueprint

> **Note:** Older references to Ktor plugins, SQLDelight, or BCrypt describe a prior Kotlin-based architecture. This document reflects the current TypeScript/Supabase implementation.

---

## 1. Multi-Tenant Isolation

CulinaryOS is a multi-tenant platform. Each restaurant is a **tenant** — their data must never be visible to another tenant under any circumstances.

### 1.1 Supabase Row Level Security (RLS)

Every PostgreSQL table containing tenant data has a `tenant_id` column (UUID). Row Level Security policies are enabled on every table and enforce:

```sql
-- Example RLS policy (pos_orders table)
CREATE POLICY "tenant_isolation" ON pos_orders
  USING (tenant_id = my_tenant_id());
```

The `my_tenant_id()` function (created in migration V14) is a `SECURITY DEFINER` function that reads the tenant context from the current Supabase session. This means RLS is enforced even for service-role queries that bypass normal auth.

### 1.2 Hono `requireTenant` Middleware

The `apps/server` API uses a `requireTenant` middleware that:

1. Reads `X-Tenant-Id` from the request header (demo mode) or extracts it from the JWT claim (live mode).
2. Injects `tenantId` into the Hono context object.
3. Rejects requests missing tenant context with `403 Forbidden`.

Every authenticated route uses this middleware — no route can accidentally omit tenant scoping.

### 1.3 Demo Mode vs. Live Mode

| Mode | Condition | Auth Behavior |
|---|---|---|
| **Demo mode** | `AUTH_RELAXED=true` or placeholder `SUPABASE_URL` | `X-Tenant-Id` header is accepted without JWT validation |
| **Live mode** | Real `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | JWT required; tenant extracted from Supabase Auth session |

Demo mode is enabled by default (`cp .env.example .env`). It is **never appropriate for production**.

---

## 2. Authentication & Session Strategy

### 2.1 Staff PIN Authentication

Terminal staff (servers, cooks, managers) authenticate via **4-digit PINs** — designed for fast swapping on shared POS/KDS terminals.

**Live mode flow:**
1. Staff enters PIN on POS lock screen.
2. `POST /v1/auth/pin-login` receives `{ pin, tenantId }`.
3. Server looks up the `staff_pins` table row for the tenant.
4. PIN is validated using **scrypt** (Node.js built-in `crypto.scrypt`) — a memory-hard function resistant to GPU brute-force.
5. On success: a short-lived JWT session is issued, scoped to the tenant and the staff member's role.

**Demo mode flow:**
- PIN `1234` → Server role session.
- PIN `5678` → Manager role session.
- No database lookup; no `SUPABASE_SERVICE_ROLE_KEY` required.

### 2.2 Supabase Auth (Live Mode)

In live mode, Supabase Auth manages the full authentication lifecycle:

| Token Type | Lifespan | Storage |
|---|---|---|
| Access Token (JWT) | 15 minutes | Memory / Secure cookie |
| Refresh Token | 7 days (single-use rotation) | HttpOnly cookie |

Refresh tokens are stored as SHA-256 hashes in Supabase — the raw token is never persisted.

### 2.3 Service Role Key Protection

The `SUPABASE_SERVICE_ROLE_KEY` is:
- **Never exposed to browser clients.** It lives only in `apps/server` environment variables.
- Validated at startup by `apps/server/src/lib/secrets.ts` — if the value is a placeholder string, the server treats it as unset and stays in demo mode.
- Never included in any Vite build bundle (it is not prefixed with `VITE_`).

---

## 3. Role-Based Access Control (RBAC)

### 3.1 Roles

| Role | Permitted Operations |
|---|---|
| `owner` | Billing, tenant settings, all manager operations |
| `manager` | Comps, voids, staff PIN management, inventory updates, sales reports |
| `server` | Table assignment, order placement, ticket firing |
| `cashier` | POS sales, checkouts, limited order modifications |
| `cook` | KDS ticket view and bump only |

### 3.2 `managerGate` Enforcement

Manager-level actions on the Hono API use the `managerGate()` utility from `packages/auth`:

```typescript
import { managerGate } from '@culinaryos/auth';

app.post('/v1/pantry/purchase-orders/:id/approve', async (c) => {
  managerGate(c); // throws 403 if role < manager
  // ...
});
```

Role is extracted from the JWT claim. Demo mode sessions have a hardcoded role matching the demo PIN used.

---

## 4. API Security

### 4.1 Input Validation

All route handlers validate inputs using Zod schemas before any database interaction. Invalid inputs return `422 Unprocessable Entity` with structured error details.

### 4.2 Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `UNAUTHORIZED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Valid auth, wrong tenant/role |
| `VALIDATION_ERROR` | 422 | Bad input shape |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

### 4.3 Required Headers

Every authenticated request to the API must include:

```
X-Tenant-Id: <tenantId>       # Tenant context (always required)
Authorization: Bearer <jwt>   # JWT session (live mode only)
X-Request-Id: <uuid>          # For distributed tracing (recommended)
```

---

## 5. Data Security

### 5.1 No Card Data Storage

CulinaryOS does not store card numbers, CVVs, or full PANs at any layer. Payment processing delegates entirely to:
- **Stripe Elements** (client-side tokenization)
- **Stripe Terminal SDK** (hardware reader)

Only Stripe payment intents and charge IDs are stored.

### 5.2 Secret Management

All secrets are environment variables, never committed to source control:

| Variable | Exposure |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never in browser |
| `STRIPE_SECRET_KEY` | Server only |
| `ANTHROPIC_API_KEY` | Server only — AI layer optional |
| `SUPABASE_ANON_KEY` | Browser-safe (Supabase RLS protects data) |

`.env.example` provides all required variable names with placeholder values. `.env` is in `.gitignore`.

### 5.3 Migrations Are Immutable

Migration files in `supabase/migrations/` are numbered and immutable. Once committed, a migration is never edited — schema changes require a new migration file. This prevents silent database divergence between environments.

---

## 6. OWASP Top 10 Mitigations

| Threat | CulinaryOS Mitigation |
|---|---|
| **A01 Broken Access Control** | Supabase RLS + `requireTenant` middleware + `managerGate` RBAC on every route |
| **A02 Cryptographic Failures** | TLS on all external endpoints; scrypt for PIN hashing; SHA-256 for refresh tokens; no raw secrets in DB |
| **A03 Injection** | Supabase JS client uses parameterized queries; Zod input validation on all routes |
| **A04 Insecure Design** | Tenant isolation enforced at DB layer (RLS), not just application layer |
| **A07 Auth Failures** | Short-lived JWTs (15m) + single-use refresh rotation; demo mode clearly gated by env vars |
| **A09 Logging Failures** | `domain_events` table provides full audit log of all tenant operations |
