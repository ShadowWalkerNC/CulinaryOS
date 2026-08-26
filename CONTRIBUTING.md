# Contributing to CulinaryOS

> Read [`PROJECT.md`](PROJECT.md) and [`docs/integration-spine.md`](docs/integration-spine.md) before changing POS ↔ KDS ↔ pantry flows.
> Read [`docs/sync-protocol.md`](docs/sync-protocol.md) before touching offline queues or outbox code.
> Tenant isolation is non-negotiable — every query must be scoped by `tenant_id` / RLS.

---

## Project Structure

```
CulinaryOS/
├── apps/
│   ├── server/       ← Unified Hono API (Node.js 20)
│   ├── pos/          ← Vite + React POS terminal (:5172)
│   ├── kds/          ← Vite + React Kitchen Display (:5173)
│   ├── admin/        ← Vite + React admin portal (:5174)
│   └── web/          ← Vite + React online ordering (:5176)
├── packages/         ← Shared contracts (shared, auth, db, event-bus, ui, ratio-engine, config)
├── mcp/              ← 9 domain MCP servers
├── extensions/       ← Extension manifests
├── extension_template/ ← Public contract for third-party extensions
├── supabase/         ← Migrations (V1–V14), RLS policies, seeds
├── mobile/           ← Expo companion (early stub)
├── cli/              ← Operator CLI
└── tests/            ← Integration tests (tsx runner + bun)
```

---

## Prerequisites

- **Node.js 20+** — `node --version`
- **pnpm 9+** — `npm install -g pnpm` then `pnpm --version`
- **Docker** — for `docker compose` and/or local Supabase
- **Supabase CLI** (optional) — for the shared local data plane

---

## Tenant Isolation — Non-Negotiable

Every database query **must** be scoped by `tenant_id`.
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

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

Types:  feat | fix | chore | docs | test | refactor | perf
Scope:  server | pos | kds | admin | web | shared | ci | supabase | mcp | packages

Examples:
  feat(pos): fire orders through PATCH /v1/orders/:id/send
  fix(kds): correct aging timer reset on bump
  docs(readme): update MCP tool listing
  test(server): cover POS → KDS mock fire path
```

---

## Running Locally

### Quick demo (mock kitchen, no DB)

```bash
cp .env.example .env
# Leave placeholder SUPABASE_* values; AUTH_RELAXED=true is fine
pnpm install
pnpm --filter @culinaryos/server dev   # API on :3000
# In separate terminals:
pnpm --filter @culinaryos/app-pos dev  # POS on :5172
pnpm --filter @culinaryos/app-kds dev  # KDS on :5173
```

Or launch everything at once with the turnkey launcher:

```bash
pnpm quickstart
```

### Service URLs (demo mode)

| Service | URL | Notes |
|---|---|---|
| API | http://localhost:3000 (`/health`) | Hono server |
| POS | http://localhost:5172 | PIN: `1234` / `5678` |
| KDS | http://localhost:5173 | No login |
| Admin | http://localhost:5174 | No login |
| Web | http://localhost:5176 | No login |

With placeholder Supabase credentials the API uses the in-memory mock kitchen store so POS → API still works for a single-tenant demo. POS and KDS do **not** share live order state in demo mode.

### Shared local data plane (Supabase CLI)

```bash
# Requires Docker + supabase CLI
pnpm local:supabase   # supabase start → print keys → apply migrations → seed
```

Then put the printed URL/keys into `.env` (`SUPABASE_*`, `DATABASE_URL`, `VITE_*`) and restart the API / frontends. See [`docs/integration-spine.md`](docs/integration-spine.md).

### Tests / typecheck / build

```bash
# TypeScript static check (18 tasks, 0 errors — the primary quality gate)
pnpm typecheck

# Build all packages and apps
pnpm build

# Server integration tests (CI gate — requires bun):
bun test tests/server/

# Full suite (tsx runner — broader but some legacy files may still be red):
node ./scripts/run-all-tests.cjs
```

> **Note:** `pnpm run lint` is non-functional (eslint configs pending). Use `pnpm typecheck`.
> **Note:** `pnpm test` has a known Turborepo recursive-invocation issue. Use the commands above directly.

---

## MCP Development

To work on or add a new MCP server:

1. Create `mcp/src/my-server.ts` following the patterns in existing servers (e.g., `recipe-server.ts`).
2. Export a server using `@modelcontextprotocol/sdk`.
3. Register it in `mcp/package.json` scripts.
4. Document its tools in [`mcp/README.md`](mcp/README.md).

To connect to Claude Desktop for local testing:

```json
{
  "mcpServers": {
    "culinaryos": {
      "command": "node",
      "args": ["/path/to/CulinaryOS/mcp/dist/culinaryops-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:3000",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    }
  }
}
```

---

## Extension Development

The [`extension_template/`](extension_template/) directory is the **public contract** for third-party extensions. Breaking changes to this contract require:

1. ARCHITECT review
2. Semantic version bump in `CHANGELOG.md`
3. A deprecation notice in `extension_template/README.md`

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `pnpm typecheck` and `pnpm build` pass locally
- [ ] `bun test tests/server/` passes (or `node ./scripts/run-all-tests.cjs` for full suite)
- [ ] No unscoped database queries (missing `tenant_id` / RLS)
- [ ] No secrets, API keys, or credentials in the diff
- [ ] Commit messages follow conventional commit format
- [ ] `.env.example` updated if new environment variables were added
- [ ] If touching POS/KDS/fire path — `docs/integration-spine.md` is still accurate
- [ ] If touching offline/sync — `docs/sync-protocol.md` is still accurate
- [ ] If adding an API route — document it in `docs/api_documentation.md`
- [ ] If modifying `extension_template/` — version bump + deprecation notice

---

## Milestone Status

All v1.0.0 milestones are **complete**. Active work is on post-v1.0.0 hardening and the extension marketplace:

| Milestone | Scope | Status |
|---|---|---|
| M1 | Ratio Engine & DB Types | ✅ COMPLETE |
| M2 | Closed-Loop Event Spine & Ops | ✅ COMPLETE |
| M3 | UI Design Tokens & Admin Portal | ✅ COMPLETE |
| M4 | MCP Servers, Licensing & Build | ✅ COMPLETE |
| M5 | E2E Pass & Hardening | ✅ COMPLETE |
| M6 | Production Readiness & Deployment | ✅ COMPLETE |
| M7 | Modern UI & Three.js 3D Floor Plan | ✅ COMPLETE |
| M8 | Operations Consultant & Dietary Engine | ✅ COMPLETE |
| M9 | Turnkey Quickstart & Square Integration | ✅ COMPLETE |
| Next | Multi-tenant hardening + Extension marketplace | 🔄 IN PROGRESS |
