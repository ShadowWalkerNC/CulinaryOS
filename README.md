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

## 🛠️ Startup & Running (Local Demo & MCP Microservices)

We have scaffolded and built **Track A (Android App - RecipeOS)**, **Track B (Web ERP - KitchenFlow)**, and **Modular MCP Microservices** to run faster and smoother. To make it extremely easy to run these local components, use the following pre-configured scripts:

*   **`run-web.bat`**: Instantly launches the KitchenFlow Web ERP React development server (uses local-first mock state and MCP Client coordination) at [http://localhost:3000/](http://localhost:3000/).
*   **`run-mcp-servers.bat`**: Compiles the typescript sources and spawns the POS, KDS, and Inventory MCP servers in separate terminal windows.

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

## 🔌 MCP Extensions & Microservices

CulinaryOS runs POS, KDS, and Inventory as modular MCP servers to run faster, smoother, and local-first:

| Extension/Server | Role | Transport | Tools |
|---|---|---|---|
| **pos-server** | Checkout, loyalty, and order generation | STDIO / SSE | `create_order`, `apply_loyalty_points` |
| **kds-server** | Kitchen display ticket queues | STDIO / SSE | `fetch_kds_tickets`, `bump_kds_ticket` |
| **inventory-server** | Pantry levels and physical ledger audits | STDIO / SSE | `get_inventory_levels`, `log_audit_count` |
| **RecipeOS** | Recipe databases and scaling engine | KMP Local / Room | 10 tools — recipes, pantry, prep, scaling |

---

## 📁 Repository Documentation Hub

Explore the detailed blueprints for CulinaryOS modules and specifications:

### 🔌 [MCP Microservices Spec](docs/mcp_architecture_spec.md)
*Detailed JSON-RPC schemas and tool specifications for local-first KDS, POS, and inventory Model Context Protocol servers.*

### 📐 [Track A — UI/UX Design Specs](docs/track_a_ui_ux_specs.md)
*Jetpack Compose styling tokens, user flows, and wireframe outlines for the Ratio Blueprint recipe engine, mobile prep list batched workflow, and responsive pantry level indicators.*

### 🗄️ [Track A — Room Database Schema](docs/track_a_room_schema.md)
*Room SQLite database entities, relations, indices, sync metadata design, and Kotlin implementation details for offline-first operation.*

### 🤖 [AI Features Spec (Both Tracks)](docs/ai_features_spec.md)
*System prompts, fallback strategies, and Claude/Anthropic API structures for the Mobile AI Chef Assistant, AI-driven KDS prioritization, and smart 86 ingredient depletion detection.*

### 🌐 [Track B — Base44 Entity Reference](docs/track_b_base44_entity_reference.md)
*Database model definitions for POS, KDS queues, physical inventories, scheduling systems, and multi-tenant separation using PostgreSQL Row-Level Security (RLS).*

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
├── run-web.bat                      ← helper script to start React ERP web client
├── run-mcp-servers.bat              ← helper script to compile & run MCP servers
├── android/                         ← Track A Android Codebase (Kotlin/Compose/Room)
├── backend/                         ← Ktor server (Kotlin/JVM)
├── shared/                          ← KMP shared module (Android + JVM)
├── pos-client/                      ← Compose Multiplatform — Android + Desktop (Phase 2)
├── kds-client/                      ← Compose Multiplatform — Android + Desktop (Phase 3)
├── admin-client/                    ← Compose Desktop (Phase 1 login shell)
├── mcp/                             ← POS, KDS, and Inventory MCP server scripts
├── docs/                            ← Architectural and UI specifications
└── web/                             ← KitchenFlow Web ERP React Client
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

*Last updated: June 25, 2026 — v3.1*
