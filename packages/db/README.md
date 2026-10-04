# @culinaryos/db — plain PostgreSQL foundation (pg-foundation)

Fresh-database PostgreSQL adapter + owned migrations. No Supabase import, no
legacy data migration. Implements the R2 pg-foundation slice of
`docs/ARCHITECTURE_RESILIENCE_PLAN.md` and the contracts in
`docs/POSTGRES_TRANSITION_DESIGN.md` §3.1/§3.2/§3.4. No server flows live here.

## Modules

- `src/postgres.ts` — lazy bounded `pg` pool, `SqlExecutor`,
  `withVerifiedTenantTransaction` (token-bound, the only tenant path),
  `withAppTransaction` (auth-plane, no tenant). There is deliberately no
  raw-context transaction: bootstrap inserts run as the migration owner.
- `src/migrate.ts` — `applyMigrations(pool)` runner.
- `migrations/001–007` — ordered SQL chain (see below).
- `src/index.ts` — legacy Supabase client, untouched by this slice.

## Authorization model (read this before integrating)

Tenant authorization is bound to a **database-verified opaque token hash**.
`withVerifiedTenantTransaction` resolves the SHA-256 hash through
`public.resolve_identity` inside the transaction (after `SET LOCAL ROLE
culinaryos_app`) and then sets ONLY `app.token_hash`. Every RLS policy
re-derives the tenant from that credential
(`app.token_hash` → `resolve_identity` → `app_verified_tenant_id()`), so no
caller-supplied tenant/user/role setting exists to forge: writing
`app.tenant_id` after resolution is meaningless because no policy reads it,
and the old `app_tenant_id()`/`app_user_id()` helpers are dropped. Unknown,
revoked, expired, or membership/device-invalid credentials fail closed
before the callback runs.

- `withAppTransaction`: restricted role, no token setting. Pre-auth
  identity operations only (`resolve_identity`, `find_staff_pin`,
  `mint_session` with proof). Tenant tables deny reads here by RLS.
- Bootstrap (first tenant/user/membership/PIN) is **migration-owner only**:
  the owner login inserts those rows directly (ceremony below). The first
  session is then minted with PIN proof like any other. The runtime role
  has no bootstrap path by design.

## Roles and credential separation

| Role | Login | Purpose |
|---|---|---|
| owner login (vault-held) | yes | Runs migrations, owns schema, performs owner-only bootstrap inserts. Membership in both app and identity roles for `SET ROLE`/ownership transfer. Never used for request traffic. |
| `culinaryos_app` | no | Restricted runtime role: owns nothing, `NOBYPASSRLS`. Request transactions `SET LOCAL ROLE` to it. Narrow table grants + `EXECUTE` on the lifecycle functions only. |
| `culinaryos_identity` | no | Owns every `SECURITY DEFINER` identity function; narrow grants + explicit `TO culinaryos_identity` RLS policies so lookups work under `FORCE RLS` without superuser. |
| runtime login (vault-held) | yes | Least-privilege pool credential, member of `culinaryos_app` only. Provisioned out-of-band (never in migrations); integration tests create an equivalent ephemeral login. |

`DATABASE_URL` in production is the **runtime-login** URL. Migration URLs live
in the deploy pipeline only. Tests use explicit `TEST_DATABASE_URL` (owner)
and derive the restricted runtime URL at setup — no committed credentials.

## Identity function contracts (server integration)

All `SECURITY DEFINER`, owner `culinaryos_identity`, `SET search_path =
public`, `REVOKE ... FROM PUBLIC`, `GRANT EXECUTE ... TO culinaryos_app`
(unless noted). Hashes are 64 lowercase hex chars; the server hashes opaque
tokens with SHA-256 and never stores or logs raw tokens.

Lookups:

- `resolve_identity(p_token_hash)` → ≤1 row of `(kind, user_id, tenant_id,
  role, device_id, capabilities)`. `kind='session'`: live, non-revoked,
  non-expired session + live `tenant_users` membership (role from the
  membership row, authoritative) + live bound device when set. Else
  `kind='device'`: live `device_keys` row with capabilities. Else no rows.
- `find_staff_pin(p_tenant_id, p_lookup_hash)` → ≤1 row of `(user_id,
  pin_hash, display_name)` for the active PIN. The server verifies `pin_hash`
  off-DB (slow hash) and mints via `mint_session` with the lookup HMAC as
  proof; the HMAC key never leaves the server.
- `identity_session(p_token_hash)` → internal live-session resolver for the
  privileged functions. NOT granted to the runtime role.

Lifecycle (each re-verifies live database state; roles come from membership
rows, never from arguments):

- `mint_session(token_hash, user_id, tenant_id, device_id, expires_at,
  pin_lookup_hash, prior_token_hash) → role`: requires live membership
  (role returned from it), live same-tenant device when bound, expiry
  within `(now, now + 30 days]`, and **exactly one** proof: (a) an active
  PIN lookup HMAC for this user+tenant, or (b) a live prior session for
  the same user+tenant (rotation). Membership IDs alone mint nothing.
- `revoke_session(caller_hash, target_hash) → boolean`: self-revoke, or a
  live owner/manager session revoking within its own tenant. False (no
  error) for unknown/cross-tenant attempts.
- `register_device_key(manager_hash, key_hash, tenant_id, label,
  capabilities, expires_at) → uuid`: requires live owner/manager session in
  the tenant; capabilities must be a non-empty JSON array ⊆
  `orders:read|orders:write|tickets:read|tickets:write|kds:read|sync:replay|menu:read`.
  Device keys can never carry manager power.
- `revoke_device_key(manager_hash, device_id) → boolean`: same-tenant
  owner/manager only. Bound sessions stop resolving immediately.
- `add_tenant_member(manager_hash, tenant_id, user_id, role)`: requires a
  live owner/manager session in the tenant. NULL manager tokens are
  rejected: bootstrap is migration-owner only (below).
- `remove_tenant_member(manager_hash, tenant_id, user_id) → boolean`:
  owner/manager session in the tenant; refuses to remove the last owner.
- `set_staff_pin(manager_hash, tenant_id, user_id, pin_hash, lookup_hash,
  display_name, active)`: owner/manager session in the tenant; PIN owner
  must be a tenant member. Upserts on `(tenant_id, user_id)`.

Raw runtime access to `auth_sessions`, `device_keys`, and `staff_pins` is
fully revoked (no bulk hash reads, no out-of-band minting); `tenant_users`
keeps `SELECT` only (staff listing, tenant-scoped, no secrets). `app_users`
keeps `SELECT, INSERT` and `organizations`/`tenants` keep their grants for
operator-driven provisioning; privilege flows exclusively through the
functions above.

Server sequences: PIN login = `withAppTransaction` → `find_staff_pin` →
off-DB slow-hash verify → `mint_session` **with the lookup HMAC** → return
opaque token. Session rotation = `mint_session` with the live prior token,
then revoke the prior. Authenticated request =
`withVerifiedTenantTransaction({ tokenHash })` → enforce `identity.role`
(owner/manager gates) or `identity.capabilities` (device allowlist checks;
device `role` is always null).

Owner bootstrap ceremony (run as the migration-owner login, exactly once
per tenant; adapt IDs/labels):

```sql
INSERT INTO public.tenants(id, slug, name) VALUES ('<tenant>', 'alley-katz', 'Alley Katz');
INSERT INTO public.app_users(id, display_name) VALUES ('<user>', 'Owner');
INSERT INTO public.tenant_users(tenant_id, user_id, role) VALUES ('<tenant>', '<user>', 'owner');
INSERT INTO public.staff_pins(tenant_id, user_id, pin_hash, pin_lookup_hash, display_name, active)
VALUES ('<tenant>', '<user>', '<slow-hash>', '<hmac-hex>', 'Owner', true);
-- then, as the runtime role: mint_session('<token-hash>', '<user>', '<tenant>',
--   NULL, now() + interval '8 hours', '<hmac-hex>', NULL)
```

## Adapter contract

- `getPostgresPool(options?)`: lazy singleton. Reads `process.env.DATABASE_URL`
  only on first call; throws when unset. No dotenv loading. Bounds/timeouts:
  `max 10`, `connectionTimeoutMillis 5000`, `idleTimeoutMillis 30000`,
  `statement_timeout 15000` (overridable via options).
- `closePostgresPool()`: ends the singleton; no-op when never created.
- `withVerifiedTenantTransaction(pool, { tokenHash }, callback)`:
  - Validates 64-hex hash before checkout; `BEGIN` → `SET LOCAL ROLE
    culinaryos_app` (fixed constant, never input) → `resolve_identity($1)`
    → fail closed on zero rows → parameterized
    `set_config('app.token_hash', $1, true)` → `callback({ tx, identity })`
    → `COMMIT`. No other setting is written on this path.
  - Any failure → best-effort `ROLLBACK`, rethrow, always `release()`.
- `withAppTransaction(pool, callback)`: `BEGIN` → `SET LOCAL ROLE` →
  callback → `COMMIT`, same rollback/release discipline.
- `QueryResult<T> = { rows: T[]; rowCount: number }`.

## Migration runner contract

- `applyMigrations(pool, { dir? })`: default dir is `packages/db/migrations`.
- Files `NNN_name.sql`, applied in sort order, each in its own transaction.
- `schema_migrations(version, name, checksum, applied_by, applied_at)` ledger;
  SHA-256 checksum per file; re-apply skipped, checksum drift is a hard error.
- One session-level `pg_advisory_lock(bigint)` for the whole run; unlock +
  client release in `finally`. Migrations are immutable — fix forward.

## Schema (001–007)

001–005 per the original chain (foundation/roles/helpers, identity/tenancy,
menus/orders, kitchen/events, payments/closeout). 006 adds the dedicated
identity role, narrow lifecycle functions, runtime grant revocation, and the
composite `ON DELETE SET NULL` repair (single-column links + same-tenant
triggers). 007, fix-forward:

- `app_verified_tenant_id()` / `app_verified_user_id()` helpers deriving
  the tenant/user from `app.token_hash` via `resolve_identity`; every
  tenant policy rewritten to them; the mutable-setting
  `app_tenant_id()`/`app_user_id()` helpers dropped.
- `mint_session` requires exactly one proof (active PIN lookup HMAC or
  live same-user/same-tenant prior session); `add_tenant_member` rejects
  NULL manager tokens (bootstrap is migration-owner only).

RLS: **enabled + forced on every public table**. Tenant policies compare
against `app_verified_tenant_id()`; `app_users` selects own row via
`app_verified_user_id()`; `organizations` via tenant membership. Same-tenant
linkage uses composite `(tenant_id, id)` FKs except the two nullable
repaired links, which use triggers. Money is integer cents; no card data
anywhere. The owner login that runs migrations holds membership in both
NOLOGIN roles so pooled sessions can `SET LOCAL ROLE` and migrations can
act as the identity role for function surgery — without superuser.

## Migration authoring rules (later slices)

- Every new table: `ENABLE` + `FORCE ROW LEVEL SECURITY`, tenant policies
  on `app_verified_tenant_id()` (never a raw setting), explicit `GRANT`s to
  `culinaryos_app` (least privilege; no default-privileges backdoor),
  composite same-tenant FKs where a parent exists. Never a multi-column FK
  with `ON DELETE SET NULL` — use a single-column nullable link plus a
  same-tenant trigger. Never `auth.*`, `anon`, `service_role`, or realtime
  publication membership. Never weaken a policy to make a test pass.
- New `SECURITY DEFINER` functions: owner `culinaryos_identity` (via `SET
  LOCAL ROLE culinaryos_identity` + `ALTER ... OWNER TO` in the same
  migration; later signature changes need `SET LOCAL ROLE` first — the
  identity role holds schema `CREATE` solely for that surgery — and must
  re-apply `REVOKE`/`GRANT` on the new object), `SET search_path = public`,
  `REVOKE ... FROM PUBLIC`, narrow `GRANT EXECUTE`, and explicit
  `TO culinaryos_identity` policies for every table touched (FORCE RLS
  constrains owners too).
- Lifecycle functions must re-verify authority from database state (live
  session/PIN proofs, membership rows); caller-supplied IDs alone authorize
  nothing.
- Migrations are immutable: 001–007 must not be edited; fix forward.

## Tests

`tests/db/postgres-adapter.test.ts`: unit suites (validation, transaction
discipline on a fake pool, runner pure functions) plus a static SQL audit
(RLS pairing, banned Supabase constructs, no composite `SET NULL`,
definer hygiene, 007 policy-rewrite coverage) need no services. The
integration suite runs only when `TEST_DATABASE_URL` is explicitly set
(disposable database, operator-owned): real two-tenant allow/deny,
forged-setting denial (legacy `app.tenant_id` writes ignored, tenant
follows the live token only), revoked/expired/device-bound rejection,
mint-proof enforcement, owner-only bootstrap, raw-mint denial as a
restricted `NOBYPASSRLS` login, pooled-checkout isolation, policy negative
control, `SET NULL` repair behavior, and manager rules.

## Limits / non-goals of this slice

No server routes/services/CLI, no views, no seeds, no realtime transport, no
non-pilot tables (reservations, subscriptions, commissary, pantry, KitchenKit).
Tenant self-signup does not exist (operator provisions tenants); readiness-
vs-liveness endpoints, member listing beyond `tenant_users SELECT`, and
session/device enumeration UIs are server scope. Two-tenant live-DB proof
runs only when `TEST_DATABASE_URL` is explicitly set.

## 008 — membership serialization + identity CREATE revoke (R2 follow-up)

`add_tenant_member`/`remove_tenant_member` each read membership state and then
write, so two concurrent removers could both observe another surviving owner
and both delete, leaving zero owners. Both functions now take the SAME
per-tenant transaction-scoped advisory lock as their first statement —
`pg_advisory_xact_lock(hashtext('tenant_membership:' ||
COALESCE(p_tenant_id::text, 'null')))` — BEFORE any `identity_session` role
check or owner count. Same-tenant add/remove work serializes; the loser
blocks until the winner commits, then re-reads settled state and hits the
unchanged last-owner guard. Manager/user provenance (live owner/manager
session in the tenant, roles from membership rows, NULL bootstrap still
rejected) is unchanged; only the lock is added. The lock scope is the
calling transaction (released at `COMMIT`/`ROLLBACK`).

008 also retires the surgery grant: 007 gave `CREATE ON SCHEMA public` to
`culinaryos_identity` solely so migration surgery could replace the functions
it owns. The 008 `REPLACE` runs under `SET LOCAL ROLE culinaryos_identity`
while that grant still exists; `CREATE` is revoked at the end. The identity
role keeps `USAGE`, function ownership, narrow grants, and its `TO`-role
policies, so runtime lookups are unaffected. Future function surgery must
re-grant `CREATE` for that migration only and revoke it again at the end.

Migrations remain immutable: 001–008 must not be edited; fix forward.

## Runtime database role guard (`src/runtime-role.ts`)

`assertRuntimeDatabaseRole(pool)` is a startup check for server boot: on one
fresh checkout it reads the authenticating login's attributes from
`session_user` (never from pool configuration) and resolves with safe
diagnostics (`login`, `effectiveRole`, flags, owned-table count) only when
the login is a `LOGIN` role and a member of `culinaryos_app` alone. It
throws — and releases the checkout — when the login is a superuser, has
`BYPASSRLS`, owns any public table (`pg_class` `relkind` `r`/`p`), belongs
to `culinaryos_identity`, cannot log in, is outside the app role, answers
with an active role switch (`current_user <> session_user`), or returns any
unverifiable attribute (fail closed, including empty results). Rejection
messages name the login role and the violated guard only; connection
strings, passwords, and tokens never appear in diagnostics. Wiring it into
server startup is native/Codex scope; this slice delivers the helper plus
its unit and live proof.

## Tests (008 follow-up)

- `tests/db/runtime-role.test.ts`: 10 fake-pool unit tests (accept,
  superuser/`BYPASSRLS`/identity-member/table-owner/non-login/non-member/
  role-switch rejections, fail-closed nulls/empty, checkout release, no
  pool-config leakage via a sentinel) plus live proof on the disposable
  cluster (restricted login accepted; owner, identity-member, superuser,
  `BYPASSRLS`, and table-owner logins rejected; privileged fixtures skip
  with a logged note when the disposable owner lacks the grant).
- `tests/db/postgres-membership-concurrency.test.ts`: static chain audit
  (001–008 order, identical lock line in both functions placed before every
  membership check, provenance/guard preservation, definer hygiene,
  `SET ROLE` → surgery → `RESET` → revoke ordering, no new tables/policies/
  Supabase constructs) plus live proof with real restricted runtime
  sessions (concurrent removals leave exactly one owner — never zero;
  survivor stays live and the removed session fails closed; non-manager,
  cross-tenant, and unknown-caller provenance; concurrent adds without
  deadlock; `CREATE` revoked with ownership/`EXECUTE`/lookups retained and
  the 008 ledger checksum matched).

Run focused (no full runner while peers edit tests): unit/static need no
services; live suites need `TEST_DATABASE_URL` loaded from the private temp
`cluster/test-env.json` into the test child environment without printing it.

## Follow-ups for chain owners (not this slice)

- `tests/db/postgres-adapter.test.ts` hardcodes the 001–007 chain (ordered
  file list, 7-file count, live ledger versions): its owner must extend
  those lists to 008.
- `tests/server/postgres-native-pg.test.ts` pins `NATIVE_CONTRACT_VERSION =
  '007'` and asserts the shared disposable cluster max version: the native
  peer must advance the pin once 008 lands on that cluster (its file-copy
  contract dir is unaffected).
