# CulinaryOS portfolio foundation

P05 establishes the target ownership map without moving working features. The canonical machine-readable map is [culinary-foundation.json](culinary-foundation.json). Existing applications/packages remain in place; no empty target folders or competing contracts package are needed.

Core owns orders, payments, restaurant configuration and base inventory. Prep owns recipes/prep tasks; Ops owns labor/vendors/purchasing/waste; Marketing owns campaigns/publishing; Web owns content/themes; Intelligence owns recommendations. Clinical dining belongs to the separate ShorelineOps boundary. These are target responsibilities, not proof of current runtime enforcement.

Shared event types remain in `packages/shared/src/types/events.ts`, reexported by the event-bus package. The catalog preserves 21 observed wire names: 16 declared by EventType and five additional route/outbox identifiers. Numeric envelope version and generic payload typing do not prove version-specific validation. Legacy RecipeOS prefixes remain unchanged pending a versioned migration decision.

Reuse existing SDK and MCP API adapters. Their different authentication header conventions and the event bus's Supabase dependency require compatibility evidence before normalization. Preserve `pos:order:created` kitchen-ticket behavior and the authoritative order-send route.

Target dependency direction is Apps → Modules → Domain/Contracts → Infrastructure. Import enforcement, feature parity, database/provider acceptance and deployment independence are NOT RUN. This map does not certify them.

Use an existing TypeScript parser with no installation. In PowerShell set `$env:FOUNDATION_TYPESCRIPT` to the absolute path of its `lib/typescript.js`. Run `node scripts/validate-portfolio-foundation.mjs --typescript $env:FOUNDATION_TYPESCRIPT` and `node --test tests/architecture/portfolio-foundation.test.mjs tests/architecture/portfolio-dependencies.test.mjs`. Parser version is recorded with verification evidence; a missing parser is an explicit failure.

The validator checks ownership completeness, source containment, syntax-level event provenance and truthful evidence labels. It rejects circular documentation proofs and partial wire-name matches. It does not execute application/payment/clinical workflows. The five extra wire names are the P05 baseline, not an automatic new-event adoption mechanism.

Run `node scripts/check-portfolio-dependencies.mjs --typescript $env:FOUNDATION_TYPESCRIPT` for the bounded packages-to-apps rule. It parses imports/exports/literal require/dynamic import using TypeScript, resolves tsconfig aliases and workspace package names, and checks relative app paths. Nonliteral or unresolved internal imports make the result INCOMPLETE. Existing relative assets are checked separately; comments and ordinary strings are not imports. This is not full cross-domain dependency enforcement.

Local evidence on 2026-10-04: ten tests PASS; 145 package source files/338 imports inspected, no packages-to-apps violation or unresolved internal import. Application build, payment/database behavior and cross-module dependency checks remain NOT RUN.

Next: inventory source features and imports before choosing a P06 migration boundary; establish payload/version contract tests and rollback criteria first. No P06 migration is authorized by this foundation checkpoint.

P05 event contract extension: eleven additive V1 payload contracts now have source-backed shapes;32targeted tests/shared typecheck PASS. Source-derived route fixtures cover seven sites and preserve null/undefined cases. Nine declared-only event specifications and one separate held outbox remain; no live broker adoption or migration. See [event contracts](event-contracts.md).
