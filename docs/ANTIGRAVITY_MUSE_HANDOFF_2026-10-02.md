# CulinaryOS — Antigravity and Muse handoff

Prepared 2026-10-02. Workspace: `C:\Users\white\Documents\GitHub\CulinaryOS`. Git baseline: `64e56ab` with substantial uncommitted shared work.

**Objective:** Finish the authorized architecture resilience implementation for the full-service pilot with split checks and coursing. Implementation is incomplete; production release remains gated. Resume existing work rather than restarting the architecture assessment.

## Read first and establish ownership

1. Read repository AGENTS.md and `docs/AI_SHARED_LEDGER.md`.
2. Read `docs/ARCHITECTURE_RESILIENCE_PLAN.md` for R1–R8 scope and `docs/POS_PILOT_CORRECTNESS_SPEC.md` for pilot invariants and A01–A16 scenarios.
3. Read `packages/db/README.md`, `docs/POSTGRES_TRANSITION_DESIGN.md`, `docs/audits/postgres-server-integration.md`, and `docs/RESILIENCE_OPERATIONS.md` only as needed for the assigned slice.
4. Save current Git status/diff and inventory existing artifacts. Check exact CulinaryOS Muse processes before dispatch. The most recent inspection found no matching delegated process, but database follow-up and native-service claims lack explicit final release records. Reconcile those claims in the ledger before editing. Preserve unrelated Muse sessions.
5. Claim precise files and acceptance criteria in the ledger. Never give the same files to parallel agents. Record commands, results, limitations and ownership release after each slice.

Preserve existing POS/KDS/public UI work, payment containment, skills metadata, research, prompts and logs. A modified `packages/db/tsconfig.tsbuildinfo` is a compiler-cache artifact requiring review before commit. Do not use blanket reset/checkout/clean to obtain a clean tree.

## Locked decisions

- Retain TypeScript/Hono and the modular monorepo. No Rust application rewrite. The later user-requested Pi appliance/Rust hardware bridge plan is [HARDWARE_SOFTWARE_INTEGRATION_PLAN.md](HARDWARE_SOFTWARE_INTEGRATION_PLAN.md); it extends local/cloud topology and R8 device scope without replacing H0–H6. Compute workers still require measured benefit.
- Target a fresh Railway PostgreSQL database; no legacy Supabase data import. Existing apps still use Supabase contracts, so changing DATABASE_URL alone is insufficient.
- Native PostgreSQL stays off by default until identity, route compatibility and integration gates pass. Pilot POS/KDS migrate first; other apps require explicit staged compatibility decisions.
- Tenant identity derives from verified session/device tokens. Caller-controlled `app.tenant_id`, headers or role labels are not authority.
- Money uses integer cents; server owns prices/taxes; payment writes are idempotent. Verify Stripe signatures and connected-account context. No queued card settlement, PAN/CVV storage, or device credentials satisfying human manager approval.
- Preserve `PATCH /v1/orders/:id/send` and `pos:order:created` → `kitchen_tickets`. Extend durable transactions/outbox instead of introducing another service without evidence.
- One feature per reviewable PR-sized slice. No push, production migration, hosting change or release without operator review of exact commits and evidence.

## What already exists and what the evidence means

These are recorded results from earlier stages, not a claim that the current combined working tree is green.

| Slice | Existing deliverable | Verification and limit |
| --- | --- | --- |
| R1 authentication containment | Production demo denial; PIN guard; tenant-bound legacy keys; keys cannot pass manager gate | Codex: 113 targeted assertions, server typecheck, full runner 128 suites passed at R1 completion. No deployed authentication certification. |
| R2 database foundation | Lazy pg pool, verified-token transaction adapter, checksummed migration runner, migrations 001–007, owner provisioning ceremony | Codex: 46 tests including real disposable PostgreSQL restricted-login tenancy, token forgery denial, revocation, pooled isolation and policy negative control. Not production proof. |
| R2 follow-up | Migration 008 membership serialization; runtime-role guard and tests | Files exist, but acceptance/release is unrecorded. Revalidate concurrency and privileges; wire guard before listener. Do not rewrite immutable 001–007. |
| Native service layer | `apps/server/src/postgres/*`: identity, orders, kitchen, payments, drawers, receipts and split arithmetic | Muse reports 17 unit + 17 live tests and typecheck. Report targets schema through 007. Codex independently verified earlier 13 unit tests and 3 later denial tests. Factory is not integrated into the existing server; current `/v1/native/*` is not client contract parity. |
| R4 durable queue | IndexedDB/localStorage backends, tenant/device partitioning, persistence-before-local-success, evidence retention, filtered acknowledgements, card denial | Codex: 49 injected-backend tests. Real-browser eviction/quota/cross-tab/private-mode behavior is unverified. |
| Offline create/discount helper | Network-only fallback, durable enqueue, validation; new order IDs corrected to canonical UUID | Codex: 29 tests. Stable online/replay operation identity remains incomplete; lost response can still create a second order. |
| Operator diagnostics/CLI | Honest security doctor; database migration plan/apply/status with separate migration credentials | Codex: 3 diagnostics + 3 database CLI tests; CLI/DB typechecks. Frozen-lock install not verified; UI doctor still has unverified claims. |
| R7/R8 harness | Bounded loopback capacity tool; isolated backup/restore rehearsal; redirect refusal | Codex: 35 operations tests. Muse synthetic 60-request smoke is not dinner-rush capacity evidence. |
| Local restore | Disposable PostgreSQL dump/restore | Codex: 27/27 table row counts matched, about 6.96 seconds, scratch DB removed. Evidence retained at `C:\Users\white\AppData\Local\Temp\culinaryos-rehearsal-16364`. Before 008; no row-content/grant/RLS/production-PITR certification. |

A subsequent full-runner result was 135 passed / 1 failed while peers were changing the native schema contract. Do not use that run or earlier green counts as current combined acceptance. PostgreSQL suites may print NOT RUN and exit zero when TEST_DATABASE_URL is absent; retain and inspect output.

## Remaining issues, severity and proposed solution

| Priority | Issue / impact | Required solution and acceptance |
| --- | --- | --- |
| BLOCKER — critical | Native runtime is not mounted and least-privilege startup is not enforced; unsafe credentials could bypass isolation | Accept 008, inspect inherited owner/privileged role membership as well as direct ownership, run actual restricted-login tests, fail startup before listener on unsafe/unverifiable roles, and separate liveness/readiness. |
| BLOCKER — critical | Provider signature/capture/refund wiring and reconciliation are unfinished | Durable verified webhook inbox before acknowledgement; validate account, currency, amount and stored payment-to-order binding; provider-authoritative capture/refund states, dedupe/reordering and timeout recovery. Disabled/denied webhook access is containment, not completion. Obtain Stripe test-account traces before release. |
| BLOCKER — high | Lost HTTP response can enqueue a fresh order after the online create already committed | Allocate stable operation and order UUIDs before first request. Use the same identity online and offline, serialize receipt claims before side effects, reject same ID/different fingerprint and return prior accepted result. Test commit-then-response-loss and simultaneous competing requests. |
| BLOCKER — high | Native replay is incomplete; legacy replay trusts client financial fields and lacks atomic effects | Server-price all commands, enforce version/precondition and role/capability gates in one transaction, persist receipt/conflict outcomes, acknowledge only committed operation IDs. Implement create/add/void/discount/cash/course replay. Preserve legacy prefixed IDs with explicit mapping/reconciliation, never silently rewrite evidence. |
| BLOCKER — high | Stable client routes/SSE/outbox and authorization are not fully integrated | Preserve existing API paths/methods; audit human viewer/write permissions as well as device capabilities; remove caller-owned tax authority; validate JSON and sanitize unexpected DB errors. Prove crash recovery, multi-worker dedupe and durable KDS reconnect/cursor behavior. |
| BLOCKER — high | Split arithmetic exists without persistent allocation/mixed-tender settlement and full-service close | Persistent split ledger, deterministic rounding, refund allocation, split-during-production, course dedupe and business-day/drawer lifecycle. Pass pilot A15/A16 and remaining applicable A01–A16 scenarios with CLI parity. |
| RELEASE GATE — high | Capacity, recovery, browser persistence and physical delivery are not representative yet | Measure rush + reports + reconnect with two instances; pool wait/event lag/queue age and tenant fairness. Restore final schema plus permissions and applicable media/config. Verify actual browser and exact printer/drawer/reader model/firmware. Record unavailable tests as NOT RUN. |
| RISK — medium | Documentation and test contracts drift | Update transition-design §3.2 from mutable tenant settings to token-derived RLS; native tests/report from 007 to latest migrations; operations live-restore status with its limited evidence. Remove fabricated diagnostics claims. |

## Ownership and implementation sequence

Antigravity is integration lead and acceptance reviewer. Muse handles bounded implementation jobs through its CLI. Antigravity independently validates Muse artifacts; a task report alone is not acceptance.

| Task | Owner / file scope | Dependency and exit gate | Planning estimate / rollback |
| --- | --- | --- | --- |
| H0: stabilize database foundation | Muse: existing new 008, runtime-role helper, related `tests/db/*`, DB README append | Reconcile old ownership; preserve 001–007. Real concurrent last-owner removals leave a manager; schema tests cover latest chain; actual restricted-login tests reject unsafe/inherited privileges. | 10–20k tokens. Keep native exposure disabled; applied migrations fixed forward. |
| H1: native startup and identity | Antigravity: server entrypoint/config/middleware, native route adapter, CLI identity/device parity, env/pipeline docs. Muse identity helper changes only under separate released claim. | H0 accepted. Restricted pool guard before listener; readiness; owner provisioning/PIN login/rotation/revoke/device lifecycle; stable pilot contracts, feature-off compatibility, deny viewer/device escalation. | 15–30k. Flag stays off; retain compatible deployment. |
| H2a: atomic authoritative replay | Muse: native orders/receipts/replay services, necessary new migration, corresponding server/DB tests | H1 contract agreed. Server pricing/tax, operation fingerprint, receipt serialization before effects, atomic replay and explicit conflicts; no offline card settlement. | 20–35k. Stop unsafe replay; retain pending commands and receipts. |
| H2b: client operation continuity | Antigravity: shared offline command helpers/exports, POS queries/queue feedback, related shared/client tests | H2a contract frozen and foreign claims released. Same IDs before online send and after network loss, canonical UUIDs, persistence failures explicit; legacy recovery path. | 10–20k. Preserve/export queue; disable acceptance on integrity faults. |
| H3: kitchen delivery and catch-up | Muse: native kitchen/outbox/worker/SSE services and tests. Antigravity then owns POS/KDS/CLI consumers | H2 accepted. Transactional send, course fire-once, worker leases/dedupe, crash boundaries and reconnect proof; existing send contract retained. | 20–35k per server/client slice. Pause sends; retain committed orders/outbox. |
| H4: provider payment ledger | Muse: native payment/inbox/reconciliation services and tests. Antigravity: provider route integration, POS/CLI contract and independent review, sequential ownership | H2 accepted. Signed raw-body webhook, durable inbox, account/order binding, caps, duplicate/reordered events and ambiguous-outcome recovery; Stripe test traces before release. | 25–45k per slice. Disable collection; reconcile in-flight intents, append corrections. |
| H5: full-service pilot integrity | Muse: persistent split/course/drawer services, migrations and tests. Antigravity then owns POS/KDS/CLI integration | H3/H4 accepted. A15/A16, mixed tender, cents conservation, refund/split-during-production, course semantics, close/reopen; CLI parity. | 20–40k per feature. Disable affected new operations; preserve ledger/history. |
| H6: operational acceptance | Muse: capacity/recovery harness enhancements and measured reports. Antigravity: browser/device acceptance, diagnostics, final docs/release packet | Earlier slices accepted. Representative load, two-instance worker proof, final-schema restore/RLS/grants, client compatibility, browser persistence and exact-device evidence. | 15–30k per rehearsal. Suspend pilot on failed gates; approved fallback and evidence retention. |

Estimates are planning ranges, not granted token budgets. Split oversized tasks by feature. Ask the operator before materially expanding scope. Parallel work is allowed only for independent files: for example H0 database proof alongside Antigravity's documentation/contract preparation. Do not run the full suite while peers edit its tests.

## Validation and local tooling

Use installed tools first; avoid dependency churn. Focused Node test pattern in PowerShell:

```powershell
$env:NODE_ENV = 'test'
node -r ./scripts/test-hook.cjs --import tsx tests/db/runtime-role.test.ts
node -r ./scripts/test-hook.cjs --import tsx tests/db/postgres-membership-concurrency.test.ts
node ./node_modules/typescript/bin/tsc --noEmit -p packages/db/tsconfig.json
node ./node_modules/typescript/bin/tsc --noEmit -p apps/server/tsconfig.json
```

Live tests require explicit disposable TEST_DATABASE_URL; never print it. The previous ephemeral cluster used PostgreSQL 17.11 on loopback port 57670, DB `culinaryos_verification`; verify current state rather than assuming it remains running. Binaries and credential state were under `%TEMP%\culinaryos-postgres-verification-20260930`. `scripts/start-postgres-verification.ps1` supports local verification; inspect containment before use. Do not reset existing databases. Test the authenticating restricted login, not merely SET ROLE under a superuser connection.

After peer edits stop: run relevant live tests, package typechecks, applicable build/lint tasks and `node ./scripts/run-all-tests.cjs`; inspect NOT RUN output, then `git diff --check`. Verify lockfile consistency using the project's frozen-lock workflow in a controlled environment. Declare any new package pipeline tasks in turbo.json. Capture exact commands, exits and evidence; distinguish assertions from suite counts. These commands are instructions, not newly performed checks.

## Muse dispatch recipe

Installed CLI was Muse 1.4.1. Use prompt files with explicit ownership, dependencies and acceptance; retain private JSON logs. Windows sandbox startup previously failed with CreateProcessWithLogonW error 87, so the authorized local invocation was:

```powershell
& 'C:\Users\white\AppData\Local\Programs\muse\muse.cmd' exec `
  --trust-workspace --approval-mode never --disable-sandbox --json `
  --prompt-file '<absolute task prompt file>' |
  Out-File -FilePath '<absolute private event log>' -Encoding utf8
```

Do not dump event streams into the chat. Never include secrets in prompts/logs. Muse redacted literal fake Bearer fixtures into source once; construct synthetic bearer values dynamically and inspect generated tests. Do not claim local execution implies zero cloud use or zero tokens. Preserve existing Muse research and artifacts.

### Copy-ready Antigravity instruction

> Resume CulinaryOS in C:\Users\white\Documents\GitHub\CulinaryOS using docs/ANTIGRAVITY_MUSE_HANDOFF_2026-10-02.md. Read AGENTS.md and the shared ledger first; inventory the dirty working tree and reconcile stale claims without discarding artifacts. Act as integration lead and independent acceptance reviewer. Delegate bounded tasks to Muse CLI with prompt files and precise nonoverlapping ownership. Begin with H0 acceptance while preparing H1 contracts/docs in separate files; then follow dependencies through H6. Keep TypeScript/Hono, fresh PostgreSQL, token-derived RLS, money/payment containment, stable send contracts, full-service split/coursing gates and CLI parity. Preserve existing work. Record actual evidence and NOT RUN limitations. Do not deploy, push or operate on production. Finish with a reviewable release packet and exact proposed commits for operator approval.

### Copy-ready first Muse task

> Implement and verify H0 only in C:\Users\white\Documents\GitHub\CulinaryOS. Read AGENTS.md, docs/AI_SHARED_LEDGER.md, the handoff and packages/db/README.md. Reconcile/reclaim the existing database follow-up scope after checking active processes. Preserve existing partial 008/runtime-role/tests; do not rewrite immutable 001–007. Own only 008_membership_serialization.sql, runtime-role.ts, related tests/db files and README append; record claim/release. Prove concurrent last-manager removals cannot leave zero managers. Audit runtime login and inherited privilege/owner-role risks, with actual restricted-login and unsafe-login negative tests. Update schema-chain test expectations meaningfully for 008 without weakening checks. Use only disposable loopback PostgreSQL; never print credentials. Run focused tests and DB typecheck, report exact commands/results and remaining gaps. No server/shared/POS/KDS edits, installs, commits, pushes, production operations or new infrastructure. Stop after this bounded slice and release ownership for Antigravity review.

## Completion and release packet

Completion requires accepted H0–H6 evidence, preserved unrelated work, updated ledger/docs, and no unexplained skips or stale ownership. Include per-feature diffs/commits, test results, unresolved gate list, runtime/migration credential separation, compatibility/rollback plan and operator support procedure. Do not equate source tests with production or hardware certification. External access or devices needed for final acceptance remain explicit dependencies; do not manufacture passing results.
