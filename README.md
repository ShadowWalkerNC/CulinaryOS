# CulinaryOS

[![CI](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/build.yml/badge.svg)](https://github.com/ShadowWalkerNC/CulinaryOS/actions/workflows/build.yml)
![Phase](https://img.shields.io/badge/phase-2%20POS%20Core-blue)
![Stack](https://img.shields.io/badge/stack-Kotlin%20Multiplatform%20%7C%20React%20%7C%20TypeScript-purple)
![License](https://img.shields.io/badge/license-MIT-green)

**CulinaryOS** is a Kotlin-first, local-first, multi-tenant restaurant operations SaaS.
It runs the full operational loop of a restaurant — from customer ordering at the table, to kitchen fulfillment, to operator reporting — on a single unified platform.

This is not a tool suite. Every module shares the same tenant data model, the same auth layer, and the same event bus.

---

## ⚡ Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS

# 2. Configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET at minimum

# 3. Start database + backend
docker compose up

# 4. Verify backend is running
curl http://localhost:8080/health
# Expected: {"status":"ok","version":"0.1.0"}

# 5. Run all tests
./gradlew test
```

> **Prerequisites:** JDK 17+, Docker, Docker Compose

---

## 📊 Build Progress

| Phase | Name | Status | Target |
|---|---|---|---|
| 0 | Foundation | ✅ Complete | Jul 6, 2026 |
| 1 | Auth & Tenant Shell | ✅ Complete | Jul 27, 2026 |
| 2 | POS Core | 🔄 In Progress | Sep 7, 2026 |
| 3 | KDS | ⏳ Pending | Oct 5, 2026 |
| 4 | Online Ordering | ⏳ Pending | Nov 2, 2026 |
| 5 | Inventory | ⏳ Pending | Nov 30, 2026 |
| 6 | Reporting | ⏳ Pending | Dec 21, 2026 |
| 7 | Payments Prototype | ⏳ Pending | Jan 11, 2027 |
| 8 | Open-Source Release | ⏳ Pending | Feb 2, 2027 |
| 9 | SaaS Cloud Launch | ⏳ Pending | Mar 2, 2027 |
| 10 | AI + Multi-Location | ⏳ Pending | May 31, 2027 |

See [`docs/build-order.md`](docs/build-order.md) for full phase checklists, exit gates, and AI agent context.

---

## 🏗️ MVP Scope

| Domain | What It Does |
|---|---|
| **POS** | Table-side and counter point of sale, offline-first |
| **KDS** | Kitchen display system, station-routed, real-time WebSocket push |
| **Online Ordering** | Customer-facing web ordering — React/Next.js, SSR, all platforms |
| **Inventory** | Item tracking, auto-depletion on order, par alerts, PO workflow |
| **Reporting** | Sales, depletion, void/comp reports + operational metrics dashboard |

**Deferred post-MVP:** multi-location management, labor scheduling, full Stripe payment processing, AI demand forecasting.

---

## 🧩 Architecture

| Layer | Technology | Platform Coverage |
|---|---|---|
| Shared business logic | **Kotlin Multiplatform (KMP)** | Android + JVM desktop |
| Operational clients (POS, KDS) | **Compose Multiplatform** | Android tablet + JVM desktop |
| Customer ordering + dashboard | **React / Next.js** | All browsers — iOS, Android, Desktop |
| Backend | **Ktor (Kotlin)** | JVM server |
| Database | **PostgreSQL** | — |
| Realtime | **WebSockets + outbox** | Zero-missed-ticket guarantee |
| Auth | **JWT + RBAC** | 15-min access tokens, 7-day refresh rotation |
| Data model | **Local-first, event-sourced** | Works offline; server reconciles on reconnect |
| Migrations | **Flyway** | Numbered, immutable, runs on startup |
| Local queue | **SQLDelight** | SQLite-backed, survives crashes and reboots |

See [`docs/architecture.md`](docs/architecture.md) for full stack decisions, local-first model, and MCP extension spec.

### Local-First Rule

Operational clients (POS, KDS) write events to a local SQLDelight queue first.
Orders can be placed, routed, and completed with zero network connectivity.
The sync engine drains the queue to the server on reconnect with exponential backoff.

**Offline continuity is guaranteed for order flow.**
**Server authority is guaranteed for money and stock.**

See [`docs/sync-protocol.md`](docs/sync-protocol.md) for the full event sync specification.

---

## 🔌 MCP Extensions

CulinaryOS supports external MCP servers as registered extensions. Extensions expose tools callable by the CulinaryOS AI agent.

| Extension | Repo | Status | Tools |
|---|---|---|---|
| **RecipeOS** | [ShadowWalkerNC/RecipeOS](https://github.com/ShadowWalkerNC/RecipeOS) | Phase 4 (2027) | 10 tools — recipes, pantry, prep, scaling |

RecipeOS is a TypeScript / React Native application that operates independently and connects to CulinaryOS via its MCP server. See [`docs/architecture.md`](docs/architecture.md) for the full integration spec.

---

## 🏗️ Repository Structure

```
CulinaryOS/
├── README.md                        ← you are here
├── CONTRIBUTING.md                  ← branch strategy, commit format, PR checklist
├── CHANGELOG.md                     ← release notes
├── docker-compose.yml               ← local dev: postgres + ktor backend
├── .env.example                     ← all required env vars documented
├── settings.gradle.kts              ← declares all modules
├── build.gradle.kts                 ← root plugin declarations
├── gradle/
│   └── libs.versions.toml               ← version catalog
├── docs/
│   ├── architecture.md                ← stack decisions, local-first, MCP extensions
│   ├── domain-model.md                ← all MVP domain models
│   ├── build-order.md                 ← 10-phase plan with AI agent context
│   ├── sync-protocol.md               ← event sync spec
│   └── api/auth-v1.yaml               ← OpenAPI spec for Phase 1 auth
├── backend/                         ← Ktor server (Kotlin/JVM)
├── shared/                          ← KMP shared module (Android + JVM)
├── pos-client/                      ← Compose Multiplatform — Android + Desktop (Phase 2)
├── kds-client/                      ← Compose Multiplatform — Android + Desktop (Phase 3)
├── admin-client/                    ← Compose Desktop (Phase 1 login shell)
├── mcp/                             ← MCP extension registry + discovery
└── web/
    ├── ordering/                    ← React/Next.js customer ordering (Phase 4)
    └── dashboard/                   ← React/Next.js manager dashboard (Phase 6)
```

---

## 🔐 Tenant Isolation

Every database query is scoped by `restaurantId`. This is enforced at the Ktor plugin layer via `call.restaurantId()` — not per-route, not per-developer. A query without `restaurantId` is a critical bug. Cross-tenant data access is impossible by architecture.

---

## 👥 Roles

| Role | Access |
|---|---|
| `owner` | Full access including billing |
| `manager` | Ops, reporting, user management |
| `server` | POS, table management |
| `cook` | KDS only |
| `cashier` | POS, limited void |

Permissions evaluated server-side on every request. Client UI adjusts by role but server always re-validates.

---

## 📚 Documentation

| Doc | Purpose |
|---|---|
| [`docs/build-order.md`](docs/build-order.md) | **Start here** — 10-phase plan, AI agent context, exit gates |
| [`docs/sync-protocol.md`](docs/sync-protocol.md) | **Read before any queue/sync code** |
| [`docs/domain-model.md`](docs/domain-model.md) | All MVP domain models |
| [`docs/architecture.md`](docs/architecture.md) | Stack decisions, local-first, MCP extensions |
| [`docs/api/auth-v1.yaml`](docs/api/auth-v1.yaml) | OpenAPI spec — Phase 1 auth endpoints |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Branch strategy, commit format, PR checklist |

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for full instructions.

Short version:
1. Branch from `main` using `feature/*`, `fix/*`, or `chore/*`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(pos): ...`)
3. All tests must pass: `./gradlew test`
4. No unscoped DB queries — every query must include `restaurantId`
5. Open a PR — CI must be green before merge

---

## 🤖 AI Agent Directive

> **Current phase:** Phase 2 — POS Core
> **Current action:** Build V3__pos_core.sql migration + offline sync engine
> **Do NOT:** expand MVP scope · skip phase exit gates · store card data · write unscoped DB queries
> **Always:** read `docs/sync-protocol.md` before touching queue code · scope all queries by `restaurantId` · write tests before marking tasks complete
> **Stack:** KMP · Compose Multiplatform · Ktor · PostgreSQL · Flyway · SQLDelight · JWT + RBAC
> **MCP Extensions:** RecipeOS ([ShadowWalkerNC/RecipeOS](https://github.com/ShadowWalkerNC/RecipeOS))
> **GitHub:** https://github.com/ShadowWalkerNC/CulinaryOS

---

*Last updated: June 22, 2026 — v3.0*
