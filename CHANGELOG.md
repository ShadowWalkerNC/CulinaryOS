# Changelog

All notable changes to CulinaryOS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — Phase 2: POS Core

### Planned
- `V3__pos_core.sql` — menu items, modifiers, tables, orders, order lines
- Offline sync engine — background coroutine draining local event queue
- POS UI — Compose Multiplatform table grid, menu browser, order send
- Receipt number generation (`RCP-YYYY-NNNN`)

---

## [0.2.0] — Phase 1: Auth & Tenant Shell — 2026-06-19

### Added
- `V2__auth_tenant.sql` — organizations, restaurants (with `timezone`), users (RBAC check constraint), refresh_tokens (single-use, hash-only)
- `AuthService` — BCrypt password hashing (cost 12), JWT issue (15-min), SHA-256 hashed refresh token rotation (7-day, single-use)
- `AuthRepository` — full CRUD for all auth tables, single-use token consume
- `AuthRoutes` — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`
- `Auth.kt` Ktor plugin — JWT validation + `call.restaurantId()` tenant isolation extension
- `Role` enum with `canAccess()` hierarchy — owner > manager > server/cook/cashier
- `AuthTest` — 6 integration tests covering register, duplicate email (409), login, wrong password (403), /me with token, /me without token (401)

---

## [0.1.0] — Phase 0: Foundation — 2026-06-19

### Added
- KMP Gradle project — 5 modules: `:shared`, `:backend`, `:pos-client`, `:kds-client`, `:admin-client`
- Ktor backend — `/health` endpoint returning `{status:"ok",version:"0.1.0"}`
- PostgreSQL + Flyway — `V1__baseline.sql` no-op baseline
- SQLDelight `LocalEventQueue.sq` — offline event queue schema with typed queries
- `CulinaryEvent.kt` — universal event envelope + all `EventType` constants
- `docker-compose.yml` — one-command local dev environment
- `.env.example` — all env vars documented
- `CONTRIBUTING.md` — branch strategy, commit format, PR checklist, phase gate rule
- `.github/workflows/build.yml` — CI: build + test on every push/PR to main
- `docs/sync-protocol.md` — full event sync specification
- `docs/api/auth-v1.yaml` — OpenAPI spec for Phase 1 endpoints
- `docs/domain-model.md` v1.1 — added timezone, receiptNumber, firedAt, tenderAmount
