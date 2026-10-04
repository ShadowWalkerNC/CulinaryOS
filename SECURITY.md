# CulinaryOS Security Policy & Access Control Standards

> **Document Version:** 2.0.0
> **Status:** Mandatory Enforcement Baseline
> **Classification:** Security Invariants & Compliance Rules

---

## 1. Core Security Invariants

### 1.1 Strict Multi-Tenant Row Level Security (RLS)
- Every table residing in the public PostgreSQL schema that contains tenant-scoped data **MUST enable and enforce Row Level Security (RLS)**.
- Policies must evaluate `app.tenant_id` or `auth.uid()` claims. Bypassing RLS with arbitrary client parameters is strictly forbidden.
- The PostgreSQL `service_role` key must **NEVER** leave the secure server environment (`apps/server`) and must never be bundled into client-side code (`VITE_*` env vars).

### 1.2 Integer Cents & Financial Accuracy
- All currency transactions, tips, discounts, tax calculations, and cash drawers are stored and calculated strictly as **integer cents** (e.g. `$10.50` = `1050`).
- Floating-point arithmetic for monetary calculations is an immediate build failure.
- Every payment modification requires an immutable `idempotency_key`. A double-charged customer or duplicate ledger entry is a critical security failure.

### 1.3 Out-of-Scope Cardholder Data (PCI SAQ-A Outsourcing)
- CulinaryOS servers **NEVER store, process, or transmit Primary Account Numbers (PAN), CVVs, or card magnetic stripe data**.
- All card-present processing is fully delegated to the **Stripe Terminal SDK** (using encrypted hardware readers like WisePOS E and S700).
- Online guest checkout uses Stripe Elements hosted iframes. This outsources PCI scope to the highest degree, qualifying merchants for the lightest SAQ-A compliance questionnaire.

### 1.4 Offline Payment Containment & Replay Protection
- When internet connectivity is lost, card-present transactions collected via Stripe Terminal offline mode must be quarantined in encrypted, tamper-evident local storage.
- The POS terminal **must never treat an unacknowledged offline card transaction as paid** until cryptographic acknowledgment is received from the server upon reconnection.
- Cash settlements and management comps during offline mode require explicit manager PIN validation.

### 1.5 Role-Based Access Control (RBAC) & PIN Gates
- Administrative, back-office, and reporting screens are gated behind cryptographic session checks and 4-digit manager/owner PIN verification.
- Roles are strictly defined:
  - `owner` / `manager`: Full administrative privileges, financial reports, employee wage changes, menu editing, and audit exports.
  - `server` / `cashier`: Front-of-House order entry, table seating, bill splitting, and card tender collection.
  - `cook` / `expo`: Back-of-House KDS ticket bumping and course pacing.
- Front-of-House cashiers cannot access management or financial endpoints even if URL routes are manually typed.

---

## 2. External Integration & Healthcare Boundaries

### 2.1 ShorelineOps HIPAA Boundary
- **ShorelineOps** is a separate vertical product serving assisted-living and healthcare facilities subject to **HIPAA** regulations.
- CulinaryOS does not store Protected Health Information (PHI). CulinaryOS and ShorelineOps interact exclusively through authenticated, audited REST API endpoints, SDK calls, and domain events.
- Never directly couple ShorelineOps to CulinaryOS database internals.

---

## 3. Secret Management & Vulnerability Reporting

- Never commit real credentials, API tokens, or `.env` files to Git.
- Report security vulnerabilities privately to Nathaniel (ShadowWalkerNC) via encrypted owner channels.
- Do not disclose security vulnerabilities publicly until a patch has been released.
