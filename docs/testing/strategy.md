# Testing strategy

Use unit -> integration -> contract -> end-to-end checks appropriate to changed behavior. Passing structural tests does not certify live auth, payments, database, deployment, hardware or migration parity.

## Foundation checks

Run `node scripts/run-foundation-tests.mjs`. It discovers all tests/architecture/*.test.mjs, uses the installed TypeScript parser or an explicit FOUNDATION_TYPESCRIPT module path, and fails if unavailable. It does not install dependencies. Existing root run-all-tests.cjs discovers only .test.ts, so these foundation tests are not yet covered by the normal root test pipeline. This integration gap is explicit; a later isolated pipeline change must preserve existing dirty test-hook/runner work.

Run `node scripts/validate-foundation-layout.mjs` for target directories/references. For source-aware metadata and dependency checks, run `node scripts/validate-portfolio-foundation.mjs --typescript <existing-parser-module>` and `node scripts/check-portfolio-dependencies.mjs --typescript <existing-parser-module>`. These commands check bounded source/metadata, not runtime permissions.

Foundation tests cover source-backed event names/ownership, malformed and cross-tenant payload rejection, literal version discrimination, source-derived route/outbox fixture parity, unsafe layout references, owner conflicts, overclaim rejection and packages-to-app imports. Strict compile fixtures event-contract-types.ts and legacy-outbox-types.ts additionally require TypeScript --noEmit/--strict/--allowImportingTsExtensions under the existing configuration/toolchain. A complete runtime suite cannot be inferred from their counts.

## Migration acceptance

Each P06 source must have an inventory of features/routes, tables, packages, API/MCP tools, authentication, environment names, deployments and existing tests. Freeze baseline fixtures and source refs. Contract tests exercise owning service/API requests, responses, errors, tenant authorization and event versions. Add negative cross-module/clinical/financial permission cases where relevant. Independently compare feature parity, integration behavior, test/build/typecheck/lint and documentation before deprecation. Preserve source and establish rollback trigger, procedure, data/deployment restoration and window before read-only/archive actions.

Real database and payment tests need approved isolated fixtures and actual runtime evidence. Never use production reset/migration commands as validation. Offline uncertain payment outcomes stay pending reconciliation; no non-cash offline settlement. Clinical workflows require their own deterministic safety and authorized human gates. E2E acceptance must cover the deployed/browser/device boundary actually claimed.

Existing turbo tasks build/test/lint/typecheck and root package scripts remain authoritative for broader checks. Mock empirical MCP tests are useful calculation fixtures but do not prove hosted tools, permissions or database behavior. Each handoff records exact command/toolchain/scope/result and marks unavailable checks NOT RUN rather than manufacturing success.
