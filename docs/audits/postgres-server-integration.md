# Native PostgreSQL server integration — audit and handoff

Date: 2026-10-01. Owner: Muse (native server task). Status: slice complete locally, pending Codex review for entrypoint wiring.
Scope: new `apps/server/src/postgres/*` (except existing `domain.ts`), new
`tests/server/postgres-native-*.test.ts` (except existing `postgres-domain.test.ts`),
this document. No edits to `packages/db/*`, `packages/shared/src/offline-*`,
POS offline callers, or the existing server entrypoint/routes. No peer file
was modified at any point; evolving contracts were tracked read-only.

## What was built

Feature-gated native Hono factory and services over the peer-owned
pg-foundation contracts (migrations 001–007, `resolve_identity`,
`find_staff_pin`, `mint_session`, lifecycle functions). Gate:
`CULINARYOS_NATIVE_PG=true`, off by default; the factory throws when disabled.

| File | Responsibility |
|---|---|
| `config.ts` | Feature gate, test/prod URL resolution (no logging), pilot tax default, PIN lookup secret presence |
| `executor.ts` | Local `NativeExecutor`/`TenantRunner`/`AuthRunner` shapes (no cross-project import; the server tsconfig cannot see `packages/db`) |
| `transactions.ts` | Token-bound tenant runner (resolves the credential in-transaction, fails closed, pins `app.token_hash` + verified tenant settings) and auth-plane runner |
| `identity.ts` | Opaque session/device verification via `resolve_identity`; PIN login via `find_staff_pin` + scrypt + 007 `mint_session` with PIN proof; human-only manager gate; device capability checks |
| `receipts.ts` | Durable operation fingerprints over `operation_receipts`: same key + same hash replays, same key + altered payload is 409 |
| `orders.ts` | Server-priced menu/order path: menu + modifier DB authority, client `unitPrice` must match, exact half-up tax, pre-send edits only |
| `kitchen.ts` | Transactional send: `pos:order:created` + tickets + items + `pending_push` + order status in one transaction; receipt check precedes the status gate so retries replay; held-course fire-once; pending-push list/ack |
| `payments.ts` | Cash/comp recording with exact-total match; card methods rejected before any DB write; durable webhook inbox with event-ID dedupe; manager-only refunds with cumulative cap |
| `drawers.ts` | Manager-only drawer open (one-open enforced), cash movements, close with expected/variance math |
| `splits.ts` | Pure exact-cent check allocation (math only; persistent split storage awaits its schema slice) |
| `app.ts` | `createNativePostgresApp({ pool, runTenant, runAuth })` with `/v1/native/*` routes; middleware verifies identity fail-fast (401/403 on forgery) and every transaction re-resolves the credential |

Preserved contracts: `pos:order:created → kitchen_tickets` payload shape,
money in integer cents, manager human-only (device keys never satisfy),
no offline card settlement (cards rejected in replay and cash/comp paths).

## Verification (all observed this session)

- `node ./node_modules/typescript/bin/tsc --noEmit --project apps/server/tsconfig.json`: PASS.
- `tests/server/postgres-native-unit.test.ts` (17 tests, fake/scripted executors): PASS.
  Input guards, manager boundary, receipt conflict semantics, allocation math,
  runner commit/rollback/release discipline. Never RLS/delivery/payment proof.
- `tests/server/postgres-native-pg.test.ts` (17 tests): PASS against the
  ephemeral verification cluster (`TEST_DATABASE_URL` from the temp state
  file, URL never printed). Two-tenant identity matrix, PIN mint via
  `mint_session`, token-bound scoping, token-derived RLS proof (foreign/
  missing/revoked credentials see nothing; forged legacy settings are
  meaningless), server pricing, send idempotency + conflict, course fire-once,
  cash/refund caps, webhook dedupe, drawer variance, check allocation.
  Without `TEST_DATABASE_URL` the file prints `NOT RUN` and exits 0.
- `tests/server/postgres-domain.test.ts` (existing, untouched): PASS (re-run for regression).
- `git diff --check`: PASS.

## Bugs found and fixed in this slice

1. Send replay blocked by status gate: the original `sendOrderToKitchen`
   checked `status === 'open'` before the operation receipt, so a retry of a
   successful send returned 409 instead of replaying. Fixed by checking the
   receipt first; new sends on non-open orders still 409.
2. Peer 007 initially failed to apply (`permission denied for schema public`:
   `CREATE FUNCTION` as `culinaryos_identity` without schema CREATE). The
   peer fixed it (`GRANT CREATE ON SCHEMA public TO culinaryos_identity`)
   while this slice adapted; no workaround was applied and no peer file edited.
3. Peer adapter rewrite mid-session (`withTenantTransaction` deleted in favor
   of `withVerifiedTenantTransaction`/`withAppTransaction`) and 006 grant
   revocations (direct `auth_sessions` writes denied) were absorbed by the
   native token-bound runner and the `mint_session` call path. One transient
   mid-edit load artifact was observed and resolved by rerun.

## Implementable integration entrypoints (Codex review required)

1. Pool: restricted runtime-login `DATABASE_URL` via peer `getPostgresPool()`
   (server-owned, never client-exposed; owner URL only for migrations).
2. Runners: `createTenantRunner(pool)` + `createAuthRunner(pool)` from
   `./transactions.ts`.
3. Mount (NOT applied here): `if (isNativePostgresEnabled()) app.route('/', createNativePostgresApp({ pool, runTenant, runAuth })))`
   in `apps/server/src/index.ts`, plus `/health` vs readiness separation.
4. Secrets: `CULINARYOS_PIN_LOOKUP_SECRET` (≥32 chars) for PIN HMAC;
   `CULINARYOS_TAX_RATE_BPS` pilot default; one-time `CULINARYOS_BOOTSTRAP_KEY`
   ceremony for the first manager device (unfinished — needs UX owner).

## Dependencies and unfinished stages

- Target is migrations 001–007. The PG suite fails fast with a contract-drift
  message if the cluster moves past 007; re-cut the slice then.
- Device registration/revocation routes (006 `register_device_key` /
  `revoke_device_key`) are not exposed; needs the bootstrap ceremony owner.
- Stripe test-mode capture/refund traces, provider signature wiring, and
  receipt sending are NOT run; webhook code persists the inbox and reconciles
  matched ledger rows only.
- Persistent split-check storage, mixed-tender settlement, business-day close,
  SSE transport, policy-drop negative control, and non-pilot app migration are
  out of this slice.
- This proof covers the native service layer on an ephemeral cluster only;
  deployed security, reader behavior, and physical delivery remain uncertified.
