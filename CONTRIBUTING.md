# Contributing to CulinaryOS

> Read `docs/build-order.md` before writing any code.
> Read `docs/sync-protocol.md` before touching anything in the local queue or sync engine.

---

## Project Structure

```
CulinaryOS/
├── backend/          ← Ktor server (Kotlin)
├── shared/           ← KMP shared business logic + SQLDelight schemas
├── pos-client/       ← Compose Multiplatform POS terminal app
├── kds-client/       ← Compose Multiplatform KDS display app
├── admin-client/     ← Compose Multiplatform admin panel
└── web/
    ├── ordering/     ← React/Next.js customer ordering frontend
    └── dashboard/    ← React/Next.js manager reporting dashboard
```

---

## Tenant Isolation — Non-Negotiable

Every database query MUST be scoped by `restaurantId`.
This is enforced at the Ktor plugin layer, but every developer must still be aware of it.
A PR that introduces an unscoped query will be rejected.

---

## Branch Strategy

```
main          ← always deployable; protected branch
feature/*     ← new features (e.g. feature/pos-offline-queue)
fix/*         ← bug fixes
chore/*       ← tooling, deps, CI changes
docs/*        ← documentation only
```

- Never commit directly to `main`
- All changes via Pull Request
- PRs require passing CI before merge

---

## Commit Message Format

Use conventional commits:

```
<type>(<scope>): <short description>

Types:  feat | fix | chore | docs | test | refactor | perf
Scope:  backend | shared | pos | kds | admin | web | ci | deps

Examples:
  feat(pos): add offline event queue with SQLDelight
  fix(backend): scope all order queries by restaurantId
  docs(sync): add conflict resolution rules
  test(backend): add cross-tenant isolation integration test
```

---

## Running Locally

### Prerequisites
- JDK 17+
- Docker + Docker Compose
- Android Studio (for mobile clients) or IntelliJ IDEA
- Node.js 20+ (for web clients)

### Start the backend

```bash
cp .env.example .env
# Edit .env with your values
docker compose up
```

Backend will be running at `http://localhost:8080`
Health check: `curl http://localhost:8080/health`

### Run all tests

```bash
./gradlew test
```

### Build everything

```bash
./gradlew build
```

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `./gradlew build` passes locally with zero warnings
- [ ] `./gradlew test` passes — all tests green
- [ ] New feature has unit tests in `:shared` or integration tests in `:backend`
- [ ] No unscoped database queries (missing `restaurantId` filter)
- [ ] No secrets, API keys, or credentials in the diff
- [ ] Commit messages follow conventional commit format
- [ ] If touching sync/offline code — `docs/sync-protocol.md` is still accurate
- [ ] If adding a new API endpoint — OpenAPI spec in `docs/api/` is updated

---

## Phase Gate Rule

A phase is not complete until:
1. All checklist items in `docs/build-order.md` for that phase are checked
2. The phase **Exit Gate** test passes
3. CI is green on `main`

Do not start the next phase until the current phase exit gate is verified.
