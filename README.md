# CulinaryOS

> **Freeze status:** Strategy frozen at v1.0. No strategic expansion until repo, README, architecture docs, and MVP scaffold are complete.

CulinaryOS is a **Kotlin-first, true multi-platform, multi-tenant restaurant operations SaaS**. It runs the full operational loop of a restaurant — from customer ordering to kitchen fulfillment to operator reporting — on a single unified platform.

This is not a tool suite. Every module shares the same tenant data model, the same auth layer, and the same event bus.

---

## MVP Scope (Locked)

| Domain | Description |
|---|---|
| **POS** | Table-side and counter point of sale |
| **KDS** | Kitchen display system, station-routed |
| **Online Ordering** | Customer-facing web ordering (React/Next.js) |
| **Inventory** | Item tracking, depletion, and reorder |
| **Reporting** | Operational metrics dashboard |

**Deferred post-MVP:** multi-location management, labor scheduling, full payment processing, advanced menu engineering.

---

## Architecture

| Layer | Technology |
|---|---|
| Shared business logic | Kotlin Multiplatform (KMP) |
| Operational clients (POS, KDS, admin) | Compose Multiplatform |
| Customer ordering frontend | React / Next.js |
| Backend | Ktor (Kotlin) |
| Database | PostgreSQL |
| Realtime | WebSockets |
| Auth | JWT + RBAC |
| Data model | Event-sourced, local-first |

---

## Local-First with Server Authority

All operational clients write events to a local queue first — orders can be placed, routed, and completed without network connectivity. Server authority is enforced only on protected domains: payment intents, inventory reconciliation, and report finalization.

**Offline continuity is guaranteed for order flow. Server authority is guaranteed for money and stock.**

---

## Tenant Hierarchy

```
Organization
  └── Restaurant
        └── Users
```

Multi-location is modeled correctly from day one but the management UI is deferred post-MVP.

---

## Docs

- [`/docs/architecture.md`](docs/architecture.md) — Stack defaults, local-first model, server authority rules
- [`/docs/domain-model.md`](docs/domain-model.md) — All five MVP domain models
- [`/docs/build-order.md`](docs/build-order.md) — Build sequence and scaffold plan

---

## Agent Directive

> Freeze CulinaryOS strategy at v1.0. CulinaryOS is a Kotlin-first, true multi-platform, multi-tenant restaurant operations SaaS. MVP scope is locked to POS, KDS, online ordering, inventory, and reporting. Multi-location is deferred. Payments are prototype-only. Architecture defaults are Kotlin Multiplatform, Compose Multiplatform for operational clients, React/Next.js for customer ordering, Ktor backend, PostgreSQL, WebSockets, JWT auth, RBAC, and a local-first event-sourced model with server-authoritative reconciliation for protected domains. No further strategic expansion should occur until the repo, README, architecture docs, and MVP scaffold are created.

---

*Frozen: June 15, 2026 — v1.0*
