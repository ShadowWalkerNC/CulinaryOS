# PostgreSQL transition design (Supabase replacement)

Date: 2026-09-30. Source baseline: `64e56ab`. Status: proposed design; not authorization to implement, migrate data, or change deployment.

Requirement: this is the P1 backend-transition design required by [POS_PILOT_CORRECTNESS_SPEC.md](POS_PILOT_CORRECTNESS_SPEC.md) §7 (P1 row) and the [shared ledger](AI_SHARED_LEDGER.md) Codex entry of 2026-09-30. Scope: source-grounded Supabase dependency inventory, target auth/tenant-safe PostgreSQL/realtime contracts, fresh-database vertical slice, and PR boundaries. Documentation only: no application, SQL, configuration, or test edits were made. All file:line references were inspected read-only at the baseline above.

Non-goals: legacy Supabase data migration (decision: fresh database, no import), pilot business-scope freeze (P0, operator decision), implementation sequencing beyond P3 slice boundaries, and non-pilot surfaces (RecipeOS, KitchenKit, Ops, Mobile) except for their inventory entries and retirement strategy.

## 1. Inherited decisions and constraints

- Fresh Railway PostgreSQL replaces Supabase; no existing data to migrate ([deployment runbook](DEPLOYMENT.md) §5, “Database transition status”).
- `DATABASE_URL` alone is insufficient: current code depends on Supabase Auth, PostgREST query builder, `auth.*` SQL helpers, the `supabase_realtime` publication, and Deno edge functions. Note `.env.example:13` points `DATABASE_URL` at Supabase's own Postgres (`:54322`), so a URL swap without the adapter work below just reconnects to Supabase or breaks every consumer.
- Preserved rules: RLS on every tenant-scoped table, service-role-equivalent credentials never leave the server, money in integer cents, no PAN/CVV, stable `pos:order:created` → `kitchen_tickets` event contract, CLI parity, AI behind flags and off by default ([project rules](../AGENTS.md) §1).
- Pilot correctness contract is authoritative for acceptance: 12 invariants (I01–I12), transition contracts, and scenarios A01–A14 in [POS_PILOT_CORRECTNESS_SPEC.md](POS_PILOT_CORRECTNESS_SPEC.md). This design must satisfy I01 (identity), I07 (kitchen delivery), I09 (audit), I11 (isolation) structurally; it must not weaken E01–E03 containment (P2a/P2b share the P1 identity contract).

## 2. Supabase dependency inventory

### 2.1 Server data plane (Hono API)

| Consumer | Supabase use | Evidence |
|---|---|---|
| `withSupabase` / `adminSupabase` | Service-role singleton injected into every request context; `null` when unconfigured (demo mode) | [middleware/supabase.ts](../apps/server/src/middleware/supabase.ts:15) |
| Hono `Env` type | `supabase: SupabaseClient` context variable; every route reads `c.get('supabase')` | [types.ts](../apps/server/src/types.ts:1) |
| All route files (24 in `routes/` + 2 integrations) | PostgREST query-builder calls: `.from/.select/.insert/.update/.upsert/.eq/.in/.single/.maybeSingle` with manual `.eq('tenant_id', …)` scoping | e.g. [orders.ts](../apps/server/src/routes/orders.ts:132), [pos-sync.ts](../apps/server/src/routes/pos-sync.ts:75), [kds.ts](../apps/server/src/routes/kds.ts:464) |
| `stripe-webhook.ts` | `adminSupabase()` for tenant-scoped payment/order updates | [stripe-webhook.ts](../apps/server/src/routes/stripe-webhook.ts:47) |
| `lib/audit.ts` | `adminSupabase()` for manager-PIN verification and audit reads | [audit.ts](../apps/server/src/lib/audit.ts:5) |
| `isLiveSupabaseConfigured` | Live/demo mode predicate gating auth posture, demo PINs, relaxed auth | [lib/secrets.ts](../apps/server/src/lib/secrets.ts:9) |
| `/health` | Process-only check; reports nothing about DB/auth readiness | [index.ts](../apps/server/src/index.ts:154) |

Implication: the query-builder surface is large but stylized. A server-side adapter that preserves the tenant-scoped call pattern while executing parameterized SQL over `pg` (already a root dependency, `pg@^8.11.5`) is the lowest-risk port. Rewriting every call site by hand in one PR is explicitly rejected (blast radius).

### 2.2 Server identity plane (Supabase Auth)

| Consumer | Supabase use | Evidence |
|---|---|---|
| `requireTenant` JWT path | `supabase.auth.getUser(token)` + `tenant_users` membership lookup | [middleware/auth.ts](../apps/server/src/middleware/auth.ts:102) |
| `requireTenant` device path | `INTERNAL_API_KEY`/`DEVICE_API_KEY` + header tenant, no membership check (spec E03) | [middleware/auth.ts](../apps/server/src/middleware/auth.ts:82) |
| PIN login (live) | `staff_pins` scan + `admin.auth.admin.getUserById` + anon `signInWithPassword(email, PIN-as-password)` returning Supabase session tokens | [routes/auth.ts](../apps/server/src/routes/auth.ts:73) |
| Signup | `admin.auth.admin.createUser` / `deleteUser` (compensating delete on partial failure) | [routes/signup.ts](../apps/server/src/routes/signup.ts:63) |
| `tenant_users.user_id` | Foreign key to `auth.users(id)` — Supabase Auth schema | [V1 migration](../supabase/migrations/V1__tenants.sql:17) |
| Manager gate | `managerGate('api_key', …)` returns `ok` — device keys pass manager checks | [tenant-isolation.test.ts](../tests/server/tenant-isolation.test.ts:11) |

Implication: identity is the deepest coupling. The target must replace session issuance/verification, PIN→session exchange, user provisioning, and the `auth.users` FK before any route can run against fresh PostgreSQL. P2b and P3 must share one identity contract (spec §7 already requires this).

### 2.3 Event bus and realtime

| Consumer | Supabase use | Evidence |
|---|---|---|
| `broker.ts` | Service-role client; inserts into `domain_events`, dispatches to 6 handlers, marks `processed`/error | [broker.ts](../packages/event-bus/src/broker.ts:52) |
| `realtime-bridge.ts` | `postgres_changes` on `kitchen_tickets` + `pos_orders` → broadcast `kds:{tenant}` / `pos:{tenant}` | [realtime-bridge.ts](../packages/event-bus/src/realtime-bridge.ts:39) |
| Handlers | Receive the Supabase client; write tickets/items/outbox, economics, pantry | [pos-order-created.ts](../packages/event-bus/src/handlers/pos-order-created.ts:25) |
| `supabase_realtime` publication | `kitchen_tickets`, `pos_orders`, `domain_events`, `course_fire_log`, `payments`, `restock_purchase_orders`, `po_line_items` | V6/V8/V9/V10 migrations |
| Clients | Direct `postgres_changes` subscriptions + bridge broadcast channels (`kds:{tenant}`, `pos:{tenant}`, `kds:tickets:{tenant}`, `pos:orders:{tenant}`, `presence:{tenant}`) | [shared realtime](../packages/shared/src/realtime/index.ts:15), [KDS hook](../apps/kds/src/hooks/useRealtimeTickets.ts:434), legacy duplicate [shared/realtime](../shared/realtime/index.ts:11) |
| KDS catch-up | Server `pending_push` outbox with `GET /v1/kds/pending-push` + `POST …/ack` already implemented | [kds.ts](../apps/server/src/routes/kds.ts:454) |

Implication: keep the domain event names and the pending-push catch-up protocol; replace only the transport (Supabase Realtime → server-owned push). The catch-up endpoints are the reliability backbone and already exist.

### 2.4 SQL migrations

22 files under `supabase/migrations/` (V1–V17 plus five `20260620_*` files). Supabase-coupled constructs that cannot run on plain PostgreSQL:

- `auth.uid()` / `auth.jwt()` in policies, helpers, and RPC guards (V1, V4, V12, V13, V14, V15, V16, V17, dated files).
- `auth.users` FK (V1).
- `supabase_realtime` publication membership (V6, V8, V9, V10).
- `TO anon` / `service_role_*` policies (V11 public menu, V16, V17).
- Extensions: `uuid-ossp` (`uuid_generate_v4()` in V1/V5/…), `pg_trgm` (V1), `pgtap` (test-only, [rls_isolation.sql](../supabase/tests/rls_isolation.sql:15)).
- V15 KitchenKit policies contain `OR auth.uid() IS NULL` permissive fallbacks — anonymous access when no JWT is present. These must be treated as a semantics defect to fix in the port, not a behavior to preserve.

Non-coupled and portable as-is: table shapes, indexes, check constraints, `domain_events`/`pending_push` outbox design, `staff_pins`/`tenant_users` membership model.

### 2.5 Edge functions (Deno, Supabase-hosted)

| Function | Behavior | Evidence |
|---|---|---|
| `send-receipt` | Service-role client verifies payment↔order↔tenant, then sends receipt via Resend; keyed by service role or `INTERNAL_API_KEY` | [send-receipt](../supabase/functions/send-receipt/index.ts:27) |
| `ai` | Verifies user JWT via anon client, resolves tenant via service role, calls Anthropic with prompt-library template | [ai](../supabase/functions/ai/index.ts:15) |
| `_shared/prompt_library.ts` | Prompt templates consumed by `ai` | referenced by `ai/index.ts:4` |

Implication: both become Hono routes on `apps/server` (receipt sender; AI gateway behind the existing off-by-default flag). The AI route must add the enablement/role/budget gate and real usage accounting the prior audit found missing (F12).

### 2.6 Clients with direct Supabase access

| Client | Direct use | Pilot relevance |
|---|---|---|
| POS | Anon client; `useRealtimeOrders` subscription; `ConnectionStatus` channel; `CheckoutView` branches online/offline on `supabase` presence | In pilot — must migrate |
| KDS | Direct `postgres_changes` + fallback direct table query + API poll + pending-push catch-up | In pilot — must migrate |
| Ops | Anon client; direct table queries in `useDashboard/useFoodCost/useLabor/useVendor/useWaste`; OTP login (`signInWithOtp`, `onAuthStateChange`) | Out of pilot scope — retire or migrate later |
| KitchenKit | Anon client; direct queries in recipe/prep/par/vendor hooks; OTP auth context; `seed_recipes.js` | Out of pilot scope — retire or migrate later |
| RecipeOS (Next) | `@supabase/ssr` cookie sessions; server/client/middleware helpers; direct queries in route handlers and `lib/queries/` | Out of pilot scope — retire or migrate later |
| Mobile (Expo stub) | Anon client with persisted session | Stub per ownership map — do not expand |
| Admin / Web / Desktop | No direct Supabase imports (API-only); only `vite-env.d.ts` mentions and Docker build args | In pilot, no data-plane change needed |

OTP (magic-link) auth in Ops/KitchenKit has no counterpart in the target identity contract (§3.1); those apps cannot be “ported” without also porting email delivery and session cookies. Recommendation: exclude them from the pilot and from P3; decide retire-vs-migrate per app after the pilot.

### 2.7 MCP, CLI, scripts, infra

| Consumer | Supabase use | Evidence |
|---|---|---|
| `mcp/src/kds-server.ts` | Direct service-role client for prep plans/recipes (`prep_plans`, `recipes`, `rpc('build_shift_prep')`); KDS ticket tools correctly use the API | [kds-server.ts](../mcp/src/kds-server.ts:36) |
| `mcp/culinary-os-server.ts`, `mcp/src/unified-server.ts` | `SUPABASE_SERVICE_ROLE_KEY` as fallback API bearer credential | [unified-server.ts](../mcp/src/unified-server.ts:13) |
| `mcp/src/api-headers.ts` | Correct pattern: `DEVICE_API_KEY`/`INTERNAL_API_KEY` | [api-headers.ts](../mcp/src/api-headers.ts:9) |
| `cli/src/commands/system.ts` | Doctor checks `service_role` key isolation | [system.ts](../cli/src/commands/system.ts:83) |
| `scripts/doctor.ts`, `health-check.ts` | Detect “live Supabase” via URL substring | [doctor.ts](../scripts/doctor.ts:218) |
| `scripts/seed.ts` | Dual path: `pg` + `DATABASE_URL` applying `supabase/seeds/*.sql`, or service-role REST upserts | [seed.ts](../scripts/seed.ts:39) |
| `scripts/local-supabase.sh`, `supabase/config.toml` | Local Supabase via CLI + Docker (API :54321, DB :54322, Studio, auth redirects) | [local-supabase.sh](../scripts/local-supabase.sh:1) |
| `docker-compose.yml` | No Postgres bundled; passes `VITE_SUPABASE_*` build args; API falls back to mock store | [docker-compose.yml](../docker-compose.yml:11) |
| `render.yaml` | `SUPABASE_*` env keys | [render.yaml](../render.yaml:21) |
| `mcp/package.json` | `@supabase/supabase-js: "*"` — unpinned | [mcp/package.json](../mcp/package.json:30) |

`@supabase/supabase-js` is declared in: root, `apps/server`, `apps/pos`, `apps/kds`, `apps/ops`, `apps/kitchenkit`, `apps/recipeos` (plus `@supabase/ssr`), `mcp`, `mobile`, `packages/auth`, `packages/db`, `packages/event-bus`, `packages/shared`. Removal must be per-package as each consumer migrates; no flag-day dependency purge.

### 2.8 Tests

- Server/route tests mock the Supabase client (`setAdminSupabaseForTesting`, hand-built query chains): [live-pin-login.test.ts](../tests/server/live-pin-login.test.ts:16), [auth-middleware.test.ts](../tests/server/auth-middleware.test.ts:26).
- `rls-policy-proof.test.ts` statically audits migration files for RLS keywords — passes without any database.
- `supabase/tests/rls_isolation.sql` is a real pgTAP suite (10 assertions) but requires a live database with the `pgtap` extension; Railway PostgreSQL support for `pgtap` is unverified.
- Nothing at baseline exercises cross-tenant reads/writes against a real database. The target test contract (§3.7) must close this.

## 3. Target contracts

### 3.1 Identity and sessions (replaces Supabase Auth)

Requirements from I01/I09/I11: tenant context from authenticated membership or registered revocable device capability; attributable actor/device; CLI/MCP under the same boundary; no header-granted privilege.

Proposed contract:

- **Users table (new, owned):** `app_users(id uuid pk, email citext unique null, display_name, created_at, …)`. Replaces `auth.users`; `tenant_users.user_id` FK retargets to `app_users(id)`. Emails nullable because PIN-first staff may have no email.
- **Sessions (new, owned):** server-minted opaque tokens (256-bit, SHA-256 hash stored) in `auth_sessions(token_hash pk, user_id, tenant_id, role, device_id null, expires_at, revoked_at null, created_at)`. Verification is one indexed lookup plus expiry/revocation check — no JWT library, no key rotation ceremony, instant revocation (A01 needs revoked-device rejection).
- **PIN login:** keep the `staff_pins(pin_hash, user_id, tenant_id, active)` model; on valid PIN, mint an `auth_sessions` row bound to `(user_id, tenant_id, role from tenant_users)` and return the opaque token. Eliminate the PIN-as-Supabase-password exchange. Rate limiting stays (`pinRateLimit`).
- **Device/service keys:** replace the two global shared secrets with a `device_keys(key_hash pk, tenant_id not null, label, capabilities jsonb, expires_at null, revoked_at null)` registry. Capabilities are an allowlist (e.g. `orders:write`, `kds:read`, `sync:replay`); manager-only capabilities require a staff session elevation, never a device key (closes the `managerGate('api_key') → ok` passthrough). Registration/rotation/revocation are manager-authenticated API operations with audit rows.
- **Signup:** replace `admin.auth.admin.createUser` with an `app_users` + `tenant_users(owner)` insert in one transaction; welcome/verify email (if any) via the receipt-mail provider, not Supabase Auth emails.
- **Out of pilot:** OTP magic links (Ops/KitchenKit), RecipeOS cookie sessions. No target behavior specified; those apps stay on Supabase or ship disabled until a separate decision.

Env/secrets: `INTERNAL_API_KEY`/`DEVICE_API_KEY` single values are retired by the registry; bootstrap requires one `CULINARYOS_BOOTSTRAP_KEY` usable exactly once to register the first manager device (documented, then revoked). `AUTH_RELAXED` semantics stay (local demo only, never with a live database) but its predicate switches from “live Supabase configured” to “live PostgreSQL configured”.

### 3.2 Tenant-safe data access (replaces PostgREST + `auth.*` RLS)

Requirements from I01/I04/I08/I09/I11 and Rule 1 (RLS on every tenant-scoped table).

Proposed contract:

- **Driver:** `pg` connection pool over `DATABASE_URL`, server-side only. `pg` is already a root dependency and `seed.ts` already uses it — no new driver to evaluate.
- **Defense in depth, two layers:**
  1. **Postgres RLS preserved.** Every tenant-scoped table keeps `ENABLE ROW LEVEL SECURITY`. Policies switch from `auth.uid()`/`auth.jwt()` to a transaction-scoped setting: `current_setting('app.tenant_id', true)::uuid`. The adapter runs `SET LOCAL app.tenant_id = '<verified tenant>'` (and `app.role`, `app.device_id`) on every pooled checkout before the business statements. Roles: one least-privilege `culinaryos_app` role owns nothing and is granted only the DML it needs; migrations run as a separate owner role. No `anon`/`service_role` equivalents exist on the fresh database.
  2. **Application tenant scoping preserved.** Every query keeps its explicit `tenant_id = $1` predicate (today’s `.eq('tenant_id', …)` pattern). RLS is the backstop, not the only check — this keeps today’s code shape and makes the port mechanical.
- **V11 public-menu replacement:** no anonymous DB role exists, so public menu reads become an unauthenticated `GET /v1/menu/public?…` API route executing a fixed allowlisted query (active menus/items only). The `TO anon` policies are dropped, not ported.
- **V15 `OR auth.uid() IS NULL` fallbacks:** dropped, not ported. KitchenKit tables get standard tenant policies when/if that app migrates.
- **Adapter shape:** one `packages/db-pg` (name TBD in implementation PR) module exposing a minimal tenant-bound query surface (`query`, `tx`, row helpers) over `pg`, used by a thin compatibility shim that mirrors the currently-used query-builder subset so route diffs stay small and reviewable. New code uses the native surface directly. `Env.supabase` in `apps/server/src/types.ts` is replaced by the tenant-bound handle; `adminSupabase()` and `withSupabase` are deleted at the end of P3, not before every consumer migrates.
- **Extensions:** `pgcrypto` (`gen_random_uuid()`) instead of `uuid-ossp`; keep `pg_trgm` if search uses it (verify call sites in P3); `citext` for emails if the target schema adopts it. No `pgtap` dependency in production migrations.

### 3.3 Realtime (replaces Supabase Realtime + bridge)

Requirements from I07 and Rule 15 (stable `pos:order:created` → `kitchen_tickets` contract; clients never bypass `PATCH /v1/orders/:id/send`).

Proposed contract:

- **Transport:** server-owned push from `apps/server` — Server-Sent Events (`GET /v1/stream/kds`, `GET /v1/stream/pos`, tenant + auth from the same middleware) with the existing `pending_push` outbox as the catch-up/replay source (`GET /v1/kds/pending-push?since=` + ack already implemented). SSE is sufficient for the pilot’s server→client direction; every mutation already has an HTTP route, so no client→server socket protocol is needed.
- **Event names preserved:** `ticket_update` / `order_update` payloads keep their current shapes; channel names (`kds:{tenant}`, `pos:{tenant}`) become stream query parameters, not Supabase channels.
- **Delivery semantics:** at-least-once push + idempotent client apply (clients already key by ticket/order id) + acked catch-up on reconnect (already implemented client-side in `useRealtimeTickets`). The broker’s `domain_events` log remains the audit source; redelivery dedupe by `event_id` (unique constraint already exists in V5) must be added — see the companion review.
- **Presence/health:** replace the `presence:{tenant}` channel with SSE heartbeat + the existing 2–4s API poll fallback already in the KDS hook. `ConnectionStatus` switches to stream state.
- **Deleted:** `realtime-bridge.ts` Supabase subscription, all `postgres_changes` client subscriptions, the legacy `shared/realtime` duplicate. The `supabase_realtime` publication adds are dropped from the ported migrations.

### 3.4 Migration chain and seeds (replaces `supabase/` workflow)

- **New chain:** ordered, forward-only SQL under a new owned directory (e.g. `db/migrations/`), applied with a checked-in runner over `DATABASE_URL` (transactional per file, version table). Port V1–V17 table shapes/indexes/constraints; rewrite the Supabase-coupled constructs per §2.4/§3.2. Dated `20260620_*` files are ported only for tables the pilot needs (`ai_prompt_log` for the AI flag-off accounting; beta/extension/founding tables deferred with their features).
- **Runner:** new pipeline tasks (e.g. `db:migrate`, `db:seed`) declared in `turbo.json` (Rule 14; current `turbo.json` has only build/dev/test/lint/typecheck).
- **Seeds:** extend the existing `pg` path in `scripts/seed.ts` (SQL files under the new seeds dir); delete the service-role REST path at the end of P3. Tenant IDs stay stable (`000…001` etc.) so client defaults keep working.
- **Local dev:** replace `pnpm local:supabase` with a plain-Postgres equivalent (Railway-provided or containerized Postgres + `db:migrate` + `db:seed`). `supabase/config.toml`, `local-supabase.sh`, and the Docker `VITE_SUPABASE_*` build args retire with the Supabase consumers.

### 3.5 Edge-function replacements

- `send-receipt` → `POST /v1/payments/receipt` (internal/device-authenticated, idempotent on `payment_id`), same verify-then-send logic, same Resend provider. Out of the P3 slices; needed before pilot receipts go live (P5/P6 dependency, record explicitly).
- `ai` → `POST /v1/marketplace/ai/*` gateway (already the documented direction in `.env.example:52`), with the missing tenant/role/flag/budget gate, real token accounting into `ai_prompt_log`, and log-failure visibility. Out of pilot scope (AI deferred); do not build it in P3.

### 3.6 Clients, MCP, CLI

- **POS/KDS (pilot):** remove `@supabase/supabase-js`; all reads/writes through the API; realtime via §3.3 streams; offline queue unchanged in shape (P4a owns its durability semantics). `CheckoutView`’s `supabase`-presence online check becomes a connectivity/API-reachability check.
- **Admin/Web/Desktop:** no data-plane change (already API-only); remove `VITE_SUPABASE_*` build args and `vite-env.d.ts` declarations when the vars retire.
- **Ops/KitchenKit/RecipeOS/Mobile:** no P3 work. Options per app after pilot: migrate to API + target identity, or remove. Do not leave them pointed at a Supabase project the team stops paying attention to — an unmaintained live backend holding credentials is worse than a removed one.
- **MCP:** `kds-server.ts` prep/recipe tools move to API routes (new routes or existing pantry/recipe routes) with device-key auth; delete the direct service-role client. Remove the `SUPABASE_SERVICE_ROLE_KEY` fallback bearer in `culinary-os-server.ts`/`unified-server.ts` (fail closed on missing `CULINARY_API_KEY`/`INTERNAL_API_KEY`). Pin the `mcp` dependency versions.
- **CLI:** keep device-key auth via `api-headers.ts` pattern; extend doctor checks to the new backend (DB readiness probe, migration-version check, stream health) with honest NOT RUN/BLOCKED states — no unconditional PASS (prior audit F09).

### 3.7 Test contract (new executable evidence)

- **Real two-tenant DB tests (new, required for P3 exit):** disposable PostgreSQL (CI service), migrations applied, then: tenant A/B row allow/deny across `pos_orders`, `payments`, `kitchen_tickets`, `ticket_items`, `tabs`; RLS backstop proof by executing the same statements as `culinaryos_app` with a forged/missing `app.tenant_id` (must fail); policy-drop negative control (dropping a policy turns the suite red — the Stage 1 exit criterion).
- **pgTAP decision:** port `rls_isolation.sql` to the new chain if the disposable DB can install `pgtap`; otherwise reimplement its 10 assertions as `pg`-driven node/bun tests. Either is acceptable; “static keyword audit only” is not.
- **Adapter tests:** transaction scoping (`SET LOCAL` applied per checkout, no tenant leakage across pooled checkouts under concurrency), parameterized-query discipline (no string-interpolated SQL), error mapping.
- **Identity tests:** PIN→session happy path, revoked/expired token rejection, device-key capability allow/deny matrix, manager-elevation separation, foreign-tenant rejection (feeds A01).
- **Realtime tests:** SSE delivery, reconnect catch-up via pending-push, ack idempotency (feeds A05/A11).
- Existing mocked tests are kept and repointed at the new adapter’s seam (the `setAdminSupabaseForTesting` seam dies with the Supabase middleware).

## 4. Fresh-database vertical slice plan (P3 decomposition)

Each slice is one PR against a disposable database; each extends the migrated surface and its tests. Slice order follows dependency order; stop/extend rules from the spec (§7 P3 row) apply.

| Slice | Tables/routes in scope | Exit proof |
|---|---|---|
| S1 Identity + tenancy | `app_users`, `tenant_users` (retargeted FK), `auth_sessions`, `device_keys`; `requireTenant`, `POST /v1/auth/pin-login`, `GET /v1/auth/me`, signup; migration runner + RLS harness | Real two-tenant auth matrix incl. revocation and manager-elevation separation; policy-drop negative control green→red→green |
| S2 Menu + orders (read/create) | `tenants`, `menus`, `menu_sections`, `menu_items`, `modifier_groups`, `modifiers`, `pos_orders`, `pos_order_line_items`; order create/add-item/discount/list/detail with server-side price authority | Price-injection fixtures (unknown modifier, mismatched unitPrice) rejected; tenant scoping proof |
| S3 Send-to-kitchen | `PATCH /v1/orders/:id/send`, broker `pos:order:created` handler, `kitchen_tickets`, `ticket_items`, `domain_events`, `pending_push`; eventId redelivery dedupe | Kill-at-every-write-boundary recovery (A05 subset): one ticket set, one stock effect, visible faults |
| S4 KDS + realtime | KDS ticket/bump/recall/course-fire routes, SSE streams, pending-push catch-up/ack; POS/KDS client cutover off supabase-js | Stream + reconnect + ack-idempotency proof; 2s API poll fallback retained |
| S5 Sync-deltas replay (no cards) | `POST /v1/pos/sync-deltas` for create/add/discount/void/transfer/fire; card finalize hard-rejected until P5 | A03 idempotency matrix (duplicate op ID, altered payload conflict); forged-card-flag rejection |
| S6 Settlement + close | `payments` capture/refund, webhook handler, receipt route, drawer/business-day tables | A06/A08/A12 against Stripe test mode; cumulative-refund cap; provisional-close behavior |

Slices S1–S2 unblock P2b completion; S3–S4 unblock P4b; S5 unblocks P4a; S6 unblocks P5/P6. SSE transport may land in S4 or as its own slice if S4 exceeds one PR. Exact file lists and ownership are recorded before each slice PR per spec §7.

Rollback per slice: switch only a tested compatible environment back to the previous slice tag; never reset a database holding accepted financial work; retain `domain_events`/audit rows across rollback. No legacy Supabase import at any point.

## 5. Cutover and retirement checklist

1. All pilot routes pass S1–S6 exit proofs on the fresh database; `/health` gains a DB-readiness companion (process health and DB readiness stay distinct signals).
2. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*` removed from Railway/pilot envs and Dockerfiles; `DATABASE_URL` points at Railway PostgreSQL; `CULINARYOS_BOOTSTRAP_KEY` used once and revoked.
3. `adminSupabase`, `withSupabase`, `setAdminSupabaseForTesting`, `realtime-bridge.ts` Supabase transport, edge functions, `local-supabase.sh`, `supabase/config.toml` deleted or archived; per-package `supabase-js` deps removed as consumers migrate.
4. Non-pilot apps decision recorded (migrate/remove/disable) with no orphaned live Supabase project.
5. Ledger + runbook updated by the release owner with deployment IDs, migration versions, and evidence locations (Codex ownership; not done in this document).

## 6. Open questions for the operator (P0/P1 freeze)

1. Confirm PIN-first staff identity has no email requirement (drives `app_users.email` nullability and the no-OTP decision).
2. Confirm Ops/KitchenKit/RecipeOS are out of the pilot and their disposition (disabled vs. separately migrated).
3. Confirm SSE is acceptable for KDS/POS push, or require WebSockets (matters only if a future client→server realtime need appears; none exists today).
4. Confirm the bootstrap-key ceremony owner and the device registration UX (who registers the pilot POS/KDS devices, on what screen).
5. Confirm `pgtap` availability on the target (else node-driven RLS assertions per §3.7).

DONE: source-grounded Supabase inventory (§2), target identity/data/realtime/migration/test contracts (§3), six-slice P3 plan (§4), cutover checklist (§5), freeze questions (§6).

VERIFIED: targeted read-only source inspection at `64e56ab` only. No tests run, no database touched, no deployment changed. Relative links use repo paths; Codex owns ledger/runbook updates.

DECISIONS PROPOSED (not locked): opaque server sessions + device-key registry (§3.1); `pg` adapter with RLS-backstop + app scoping (§3.2); SSE + pending-push catch-up (§3.3); new owned migration chain + `db:*` turbo tasks (§3.4); non-pilot apps excluded from P3 (§3.6).

NEXT: P0 scope freeze by operator, then slice S1 implementation under separate explicit authorization.
