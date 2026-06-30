# CulinaryOS Security Blueprint & Specifications

This document outlines the multi-tenant isolation, authentication policies, role-based access controls, and security practices implemented in the CulinaryOS platform.

---

## 🔒 1. Multi-Tenant Scoping & Isolation

CulinaryOS is designed to isolate multiple restaurant tenants completely. Data leaks between tenants are prevented at both the application and database layers.

### 1.1 Database Row-Level Security (RLS)
*   **Enforcement:** Every PostgreSQL table containing tenant data (e.g., `menu_items`, `dining_tables`, `orders`, `inventory_items`) contains a `restaurant_id` column.
*   **Postgres Policies:** Every query is restricted by Row-Level Security (RLS) policies matching the tenant ID extracted from the authenticated user context.
*   **Unscoped Query Block:** Direct queries without a tenant filter are treated as high-severity security defects.

### 1.2 Ktor Backend `TenantScopePlugin`
*   **Context Injection:** The Ktor backend intercepts incoming HTTP requests via a custom `TenantScopePlugin`.
*   **JWT Resolution:** It extracts the `restaurantId` claim from the validated JWT token and binds it to the request scope (`call.restaurantId()`).
*   **Security Gate:** Any route requiring authentication automatically rejects requests that fail to provide a valid, matching tenant identifier.

---

## 🔑 2. Authentication & Session Strategy

CulinaryOS uses a token-based, stateless authentication model designed for offline reliability and API security.

### 2.1 Password Hashing
*   **Algorithm:** BCrypt with a work factor cost of `12`.
*   **Storage:** Stored in the `users.passwordHash` column. Plaintext passwords are never logged, cached, or persisted.

### 2.2 Token Management & Lifecycle
*   **Access Tokens (JWT):**
    *   **Lifespan:** 15 minutes.
    *   **Payload Claims:** `userId`, `restaurantId`, `role`, `exp`, `iat`.
    *   **Signature:** Signed using a secure HS256/RS256 secret key.
*   **Refresh Tokens:**
    *   **Lifespan:** 7 days.
    *   **Rotation:** Single-use rotation is enforced (Sender Constrained). Whenever a refresh token is consumed to issue a new access token, the old refresh token is immediately revoked, and a new one is issued.
    *   **Database Hardening:** Stored in the database as SHA-256 hashes. Even if the database is leaked, an attacker cannot construct or reuse the plaintext token values.

### 2.3 Terminal PIN Switchover
*   **Access Mechanism:** Cashiers and servers use a 4-digit numeric PIN to swap user contexts on shared POS terminals.
*   **Authentication:** `POST /auth/pin-login` validates the PIN code against the active tenant context and returns a new temporary JWT session.

---

## 👥 3. Role-Based Access Control (RBAC)

The system enforces strict functional permissions based on roles. Permissions are validated on the server for every request.

| Role | Access Hierarchy | Permitted Operations |
| :--- | :--- | :--- |
| **`owner`** | Level 5 (Highest) | Billing, tenant settings, employee registrations, full configuration. |
| **`manager`** | Level 4 | Shift scheduling, inventory updates, comps, voids, sales reports. |
| **`cashier`** | Level 3 | POS sales, checkouts, limited order modifications. |
| **`server`** | Level 2 | Table assignment, order placement, ticket firing. |
| **`cook`** | Level 1 | KDS queue display, ticket preparation status updates. |

### 3.1 Ktor `RBACPlugin`
*   **Enforcement:** Routes are decorated with role requirements (e.g., `withRole(Role.MANAGER)`).
*   **Validation:** The plugin compares the user's token role claim against the route's threshold. Any role containing lower hierarchy access receives a `403 Forbidden` response.

---

## 🛡️ 4. OWASP Security Checklist & Protections

CulinaryOS implements standard mitigations for the OWASP Top 10:

*   **A01:2021-Broken Access Control:** Scoped by tenant context and validated via role hierarchies on every API call.
*   **A02:2021-Cryptographic Failures:** BCrypt for credentials and TLS/SSL enforcement for all external endpoints (configured via docker-compose reverse proxy).
*   **A03:2021-Injection:** SQL parameter binding enforced via SQLDelight and Flyway migrations.
*   **A07:2021-Identification and Authentication Failures:** High-security JWT token lifespan coupled with single-use refresh token rotation.
