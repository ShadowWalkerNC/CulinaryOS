# CulinaryOS Consolidation Delivery Plan

> Updated: 2026-09-10. This turns the assessed backlog into safe, reviewable
> slices. It does not authorize deletion of a surface until its behavior and
> unique content have been migrated and verified.

## Product boundary decision

`apps/web` becomes the public CulinaryOS site and guest-commerce application.
`apps/marketing` is transitional: its unique pricing, signup, feature, blog,
and RecipeOS content must move into Web before it is archived. The old
Marketing entry must not be exposed from operational launchers meanwhile.

## Delivery slices

| Slice | Scope | Primary files | Verification | Rollback | Estimate |
| --- | --- | --- | --- | --- | --- |
| 1 — navigation foundation | Shared app registry, launcher, compact page navigation; migrate POS, KDS, Admin, Desktop | `packages/ui/src/navigation.ts`, `packages/ui/src/components/*Navigation*.tsx`, four app shells | unit contract; 375/768/1440 visual smoke; typecheck | Revert imports; each app retains its own routing/state | 35k tokens |
| 2 — public-web consolidation | Move unique Marketing routes/content into Web, replace internal links, remove launcher/profile references; retain `apps/marketing` as a read-only fallback during verification | `apps/web`, `apps/marketing`, `scripts/quickstart.ts`, docs | route/content inventory, build both apps, link smoke | Restore existing app and redirects | 45k tokens |
| 3 — restaurant floor and reservations | Diagram-based 2-D map, availability contract, verified table assignment; no client-side authority | POS map, reservation route, shared types | tenant/RLS tests, reservation concurrency tests, table-flow E2E | feature flag / retain existing map | 50k tokens |
| 4 — KDS order integrity | Atomic send, correct Expo routing, item completion and abbreviations, staff notification contract, station health | KDS, order/KDS API routes, event contracts | send/idempotency/realtime tests and KDS visual smoke | retain stable event contract and old display path | 50k tokens |
| 5 — back-office and settings | Editable staff/ATS flow, consistent settings primitives, KitchenKit render repair | Admin, KitchenKit, Ops, shared UI | role/tenant tests, responsive UI smoke | route-level revert; no data migration without backup | 45k tokens |
| 6 — onboarding and parity | Guided setup with RLS/Stripe/hardware safeguards plus CLI parity | CLI, setup script, server | dry-run installer, no-secret scan, health checks | dry-run by default; explicit cleanup only | 45k tokens |
| 7 — release gate | Custom regression harness across pages, devices, demo/live boundaries | `tests/`, docs, CI | full typecheck, unit/API/E2E/accessibility matrix | tests only add coverage; no production rollback needed | 40k tokens |

## Slice 1 status — implemented; release verification incomplete

- POS, KDS, Admin, and Desktop now consume one shared application registry and
  compact navigation primitive. Their previous scrollable top rails and copied
  app-switcher modal implementations were removed.
- The compact sheet exposes every contextual section; POS preserves disabled
  Ticket and Pay states until a ticket exists. Local interactive smoke checks
  confirmed POS, Admin, KDS, Desktop, and KitchenKit loading/routing behavior.
- The prior baseline passed all 47 Turbo typecheck tasks and 114 test files.
  After the latest navigation fixes, all eight navigation tests pass, and
  shared UI, POS, KDS, and Desktop typechecks pass. The full baseline has not
  been rerun for these latest edits.
- Follow-up fixes include Desktop scanning shared UI styles, an accessible
  launcher name on phones, dialog focus restoration, LAN/IPv6 app links, and
  preserving the current workspace when opening another application.
- Interactive smoke checks above are not a substitute for the pending
  375/768/1440 screenshot and overflow matrix. Deployed relative app URLs also
  require verification against actual hosting routes.
- Prior Admin and Desktop production builds passed. POS and KDS production
  builds remain blocked by esbuild's temporary-file removal error on Windows
  (`Access is denied`). A standalone large esbuild transform reproduces the
  failure without Vite or PWA plugins, under both Node 26 and bundled Node 24.
  An isolated Temp directory did not resolve it. Root cause is not established;
  this is not evidence of a PWA-specific defect or a successful production build.

## Non-negotiable sequencing

1. Navigation and public-web ownership come before visual restyling of every
   page, so duplicate shells do not keep multiplying.
2. Reservation, payment, KDS, and staff changes remain server-authoritative;
   new tenant-scoped data requires RLS and cross-tenant tests.
3. Marketing is archived only after content, routes, search metadata, and
   local quickstart behavior have a verified Web replacement.
4. Each slice stays separately reviewable and reversible. No bulk deletion,
   schema fork, or production payment action is part of this plan.
