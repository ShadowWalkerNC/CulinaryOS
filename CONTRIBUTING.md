# Contributing to CulinaryOS

**CulinaryOS is free and open source (MIT).** Anyone can use, modify, and run this restaurant POS platform without license fees. Contributions that make it clearer, safer, and more useful for operators are welcome — including docs aimed at people evaluating CulinaryOS as a free Toast/Square alternative.

> Read `PROJECT.md` and `docs/integration-spine.md` before changing POS ↔ KDS ↔ pantry flows.
> Read `docs/sync-protocol.md` before touching offline queues or outbox code.
> Tenant isolation is non-negotiable — every query must be scoped by `tenant_id` / RLS.

---

## Project Structure

```
CulinaryOS/
├── apps/
│   ├── server/       ← Unified Hono API (Node 20)
│   ├── pos/          ← Vite + React POS terminal
│   ├── kds/          ← Vite + React Kitchen Display
│   ├── admin/        ← Vite + React admin
│   └── web/          ← Vite + React online ordering
├── packages/         ← Shared contracts (shared, auth, db, event-bus, ui, …)
├── mcp/              ← Domain MCP servers
├── extensions/       ← Extension manifests + public contract
├── supabase/         ← Migrations, RLS, seeds (config.toml for local CLI)
├── mobile/           ← Expo companion (early stub)
├── cli/              ← Operator CLI
└── tests/            ← Integration tests (Bun + tsx runners)
```

---

## Tenant Isolation — Non-Negotiable

Every database query MUST be scoped by `tenant_id`.
RLS enforces this in Supabase; the Hono `requireTenant` middleware injects tenant context on every authenticated route.
A PR that introduces an unscoped query will be rejected.

---

## Branch Strategy

```
main              ← always deployable; protected branch
feature/*         ← new features
fix/*             ← bug fixes
chore/*           ← tooling, deps, CI changes
cursor/*          ← cloud-agent branches
docs/*            ← documentation only
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
Scope:  server | pos | kds | admin | web | shared | ci | supabase | mcp

Examples:
  feat(pos): fire orders through PATCH /v1/orders/:id/send
  fix(ci): let pnpm/action-setup read packageManager pin
  docs(contributing): align with apps/* monorepo
  test(server): cover POS → KDS mock fire path
```

---

## Running Locally

### Prerequisites
- Node.js 20+
- pnpm 9 (`packageManager` in root `package.json`)
- Docker (for `docker compose` and/or local Supabase)
- Supabase CLI (optional — for the shared local data plane)

### Quick demo (mock kitchen, no DB)

```bash
cp .env.example .env
# leave placeholder SUPABASE_* values; AUTH_RELAXED=true is fine
pnpm install
pnpm --filter @culinaryos/server dev   # API on :3000
# in other terminals:
pnpm --filter @culinaryos/app-pos dev
pnpm --filter @culinaryos/app-kds dev
```

Or build everything and run via Compose:

```bash
docker compose up --build
```

- API: http://localhost:3000 (`/health`)
- POS: http://localhost:5172
- KDS: http://localhost:5173
- Admin: http://localhost:5174
- Web: http://localhost:5176

With placeholder Supabase credentials the API uses the in-memory mock kitchen store so POS → KDS still works for a single-tenant demo.

### Shared local data plane (Supabase CLI)

```bash
# requires Docker + supabase CLI
pnpm local:supabase   # supabase start → print keys → apply migrations hint → seed
```

Then put the printed URL/keys into `.env` (`SUPABASE_*`, `DATABASE_URL`, `VITE_*`) and restart the API / frontends. See `docs/integration-spine.md`.

### Tests / typecheck / build

```bash
pnpm typecheck
pnpm build
# server integration (CI gate):
bun test tests/server/
# broader suite (some legacy files may still be red):
node ./scripts/run-all-tests.cjs
```

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `pnpm typecheck` and `pnpm build` pass locally
- [ ] `bun test tests/server/` passes
- [ ] No unscoped database queries (missing `tenant_id` / RLS)
- [ ] No secrets, API keys, or credentials in the diff
- [ ] Commit messages follow conventional commit format
- [ ] If touching POS/KDS/fire path — `docs/integration-spine.md` is still accurate
- [ ] If touching offline/sync — `docs/sync-protocol.md` is still accurate
- [ ] If adding an API route — document it (README / OpenAPI under `docs/api/`)

---

## Milestone Gate

Work tracks `PROJECT.md` milestones (M1–M6). A milestone is not complete until:

1. Its scope checklist is done
2. CI is green on `main`
3. A short demo (screen recording or smoke script) proves the happy path
