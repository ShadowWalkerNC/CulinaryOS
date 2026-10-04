# R1 authentication containment verification

Date: 2026-09-30. Base HEAD: `64e56ab`; evidence applies to the local uncommitted
working tree, including preserved earlier payment/UI changes. No deployment,
production database, reader, or real tenant-RLS certification was performed.

## Changes

- Production boot rejects missing/placeholder current backend credentials,
  demo flags, unsafe backend URLs, and a VITEST production marker before
  starting the listener or realtime bridge. Config shape does not prove credentials
  are accepted by a live backend.
- Direct PIN route mounting does not bypass the demo predicate. Missing credentials
  no longer grant local demo access outside isolated tests. Local demos require an
  explicit flag and no usable backend/database configuration.
- Legacy device/internal keys on tenant routes require server-owned tenant UUID
  bindings outside demo. Missing, invalid, foreign, and ambiguous key scopes deny.
- API keys do not satisfy the manager gate, including caller-supplied manager roles.
  Verified JWT owner/manager behavior remains. Existing internal requireApiKey
  endpoints retain their behavior; their event-envelope/least-privilege audit is pending.
- Environment example documents the compatibility changes and leaves DATABASE_URL
  empty for local demo rather than implying an implemented PostgreSQL backend.

## Executed checks

| Check | Result | Practical limit |
| --- | --- | --- |
| `node scripts/run-all-tests.cjs` | PASS: 128 suites, 0 failed | Existing Node/tsx test-hook runner; test suites are not browser/DB/hardware certification |
| `node node_modules/typescript/bin/tsc -p apps/server/tsconfig.json --noEmit` | PASS | Server static types only |
| Production-auth boundary | PASS: 21 tests, including real child-process entrypoint refusal | Invalid configuration boot; no live credentials or real DB |
| Auth middleware / key boundary / tenant isolation | PASS: 13 / 11 / 14 tests | Mocked membership and scoped-key containment; real RLS remains untested |
| Existing PIN login / demo-payment / offline-card containment / terminal-intent / settlement quarantine / offline-sync | PASS: 3 / 1 / 15 / 22 / 6 / 7 tests | Mocked/provider-intercepted/local storage fixtures |
| `git diff --check` | PASS | Whitespace check across the working tree |

## Coordination and tooling observations

Muse CLI implemented the assigned key/middleware/RBAC files. Codex found and
corrected redacted fictional bearer literals and made the manager-denial fixture
explicitly exercise the non-demo path. A fake-auth client prevents accidental
network requests in the middleware suite. Windows Muse session messaging was
unavailable; only this turn's uniquely matched delegated process was stopped
before Codex took file ownership for corrections.

The initial broad run passed all 128 maintained suites but failed Muse's temporary
`zz-debug-probe.test.ts`. That debug artifact was preserved outside the repository,
then the final clean run passed all 128 suites. Initial/final raw output and the
task-generated pnpm cache were preserved in the operator's temporary directory
`culinaryos-resilience-r1-20260930`; no Muse research was discarded.

The sandbox prevented Node/tsx user-profile access, so regression tests ran with
approval outside it. The pnpm launcher attempted dependency reconciliation and
aborted a modules-replacement prompt; no install was forced. The existing
TypeScript compiler was used directly. No manifests or lockfile were changed.

## Remaining release gates

R1 is containment, not completion of P2b. A revocable per-device registry,
capabilities and human identity require R2/P3-S1; proof requires real disposable
PostgreSQL two-tenant tests and connection-pool/RLS negative controls. Durable
outbox, offline replay conflict handling, financial reconciliation, exact-device
certification, restore/rollback evidence and production readiness remain open.

See [the resilience plan](../ARCHITECTURE_RESILIENCE_PLAN.md) for dependencies,
PR boundaries, estimates, acceptance evidence and rollback controls.
