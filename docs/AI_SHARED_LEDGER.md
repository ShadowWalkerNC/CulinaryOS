# CulinaryOS shared AI ledger

## Working agreement

Codex and Muse share this repository and this file. Read this ledger and `git status` before acting. Claim a bounded task and its file scope before editing. Do not edit another agent's claimed files; leave findings here for that owner. Re-read before appending, preserve prior entries, and record evidence rather than assumptions. Never record credentials, customer data, or private reasoning. Only the release owner changes Railway settings or pushes Git. User approval for pushing remains required by the inherited project instructions.

## Current objective and decisions — 2026-09-24

- Priority: get the existing Railway services deployed and verify their public behavior before further feature changes.
- Railway project: `9d7feb1d-d852-4c93-a2a8-75de59bf43a0`, production environment `4ae790c9-f85c-43d5-9dfa-394bb6dccfff`.
- User chose fresh Railway PostgreSQL and removal of Supabase. That migration is not implemented. Current authentication, queries, and realtime still depend on Supabase; setting DATABASE_URL alone cannot replace them. Do not label a demo/health response as database readiness.
- Preserve the unrelated untracked `docs/audits/product-review-council-2026-09-22.md`.

## Ownership

| Task | Owner | State | Scope |
| --- | --- | --- | --- |
| Dependency/build/runtime fixes and deployment | Codex | Active | Existing changed manifests/lockfile, Next compatibility, server Dockerfile, Web/Admin build commands, Railway settings |
| Independent deployment review | Muse | Complete | Findings below. No application edits, installs, deployment, commits, or pushes. |
| Ledger and deployment runbook | Codex | Active | `docs/AI_SHARED_LEDGER.md`, `docs/DEPLOYMENT.md`, ledger pointer in `AGENTS.md` |
| Plain PostgreSQL migration | Unassigned | Deferred until deployment baseline | Requires replacement auth, tenant-safe queries/RLS, realtime and migration chain; preserve existing data rules |

## Verified baseline from Codex

- Both Next apps upgraded from vulnerable 14.2.24 to 15.5.24; Marketing dynamic route params adapted to Next 15. Both production builds passed. npm bulk advisory lookup for Next 15.5.24 returned no advisories; this is not a full dependency audit.
- API previously started `dist/index.js` although TypeScript emits no output. Updated start to `tsx src/index.ts`, moved tsx into production dependencies, and explicitly built config before typechecking.
- Server build, Web build and Admin build passed locally. API isolated startup smoke returned HTTP 200 at `/health`; no live database functionality was verified.
- Windows-specific esbuild binary moved to optional dependencies for Linux installs.
- Railway settings observed: Railpack, monorepo root, GitHub main, filtered service builds. Web has no custom start. Web/Admin need explicit Railpack SPA output directories; API needs filtered start command.
- User approved and Codex pushed `7969f8c` and `a8b64be` to main. Railway's next build passed archive/security scanning but failed because the root config still forced Docker. No successful deployment claimed.

## Release checks still open

- Correct the confirmed root builder override, then inspect deployment logs and public smoke checks. The 11 reviewed Railway settings have been applied.
- Record deployment IDs and tested commit after success. Revert the corresponding logical commit/settings to roll back; do not reset or destroy a database.

## Codex entries

- 2026-09-24: Approved commits pushed and 11 Railway settings applied. API deployment `0a2436e8-cfd6-4a9a-ab44-10db386d6d11` failed with `couldn't locate a dockerfile at path Dockerfile in code archive`. This disproves our earlier assumption that the root config was unused. Railway documentation confirms file settings override the dashboard without changing its display. Corrected root builder to `railpack` and corrected the runbook. No application logic changed in this follow-up.
- 2026-09-24: Reviewed 11 staged Railway changes: filtered build commands on all three services, `/health` API and `/` frontend healthchecks, two SPA output variables, two VITE_API_URL variables pointing to the existing API public domain, and API CORS_ORIGINS limited to the existing Web/Admin public origins. API already has NODE_ENV=production and AUTH_RELAXED=false. No database credentials configured or modified. Release waits for the required reviewed Git push approval, then apply settings and verify.
- 2026-09-24: Muse completed independent review with no confirmed blockers or changed-code security regressions. Its runtime and database caveats remain open as documented. Clarification: the Windows esbuild package moved from **devDependencies** to optionalDependencies. Annotated the legacy root railway.toml to prevent accidental use with Railpack.
- 2026-09-24: Frozen lockfile install with scripts disabled passed. Updated Web and Admin builds explicitly compile config; both builds passed (existing chunk-size warnings only). Node/tsx regression runs passed for `demo-payment-guard.test.ts` and `tenant-isolation.test.ts`. These are not live database integration tests.
- 2026-09-24: Signed-in in-app Railway access recovered. Staged filtered Web/Admin build commands and their respective RAILPACK_SPA_OUTPUT_DIR values. Changes remain staged pending reviewed source push and deployment verification.
- 2026-09-24: Resumed deployment priority and created shared coordination ledger at user's request. Muse CLI found locally; dispatch pending. Chrome Railway service controls still show read-only after refresh; checking user's newly signed-in tab.

## Muse entries

Append dated findings here with file paths, severity, and evidence. Distinguish confirmed defects from risks and untested behavior. End with review completion/status so Codex can release ownership.

- 2026-09-24 (Muse, independent review of uncommitted Railway dependency/build/runtime diff; read-only, no installs/builds/deploys, no env files read):
  - Scope reviewed: `git diff` shows 13 modified files — `package.json`, `pnpm-lock.yaml` (684 lines), `apps/server/package.json`, `apps/server/Dockerfile`, `apps/web/package.json`, `apps/admin/package.json`, `apps/marketing/package.json`, `apps/recipeos/package.json`, `apps/marketing/src/app/blog/[slug]/page.tsx`, both `next-env.d.ts`, `docs/DEPLOYMENT.md`, `AGENTS.md` (ledger pointer only). Untracked: this ledger and `docs/audits/product-review-council-2026-09-22.md` (left untouched per agreement).
  - CONFIRMED — no material deployment blocker in the diff. Next 14.2.24 → 15.5.24 applied in `apps/marketing/package.json` and `apps/recipeos/package.json`; `eslint-config-next` synced to 15.5.24 in recipeos (marketing declares none — consistent). Lockfile shows matching `next@15.5.24`, `@next/swc-win32-x64-msvc@15.5.24`, `@next/eslint-plugin-next@15.5.24` entries. No `14.x` Next references remain repo-wide.
  - CONFIRMED — Next 15 async-`params` migration is complete for all dynamic routes found. `apps/marketing/src/app/blog/[slug]/page.tsx` now awaits `Promise<{ slug }>` in both `generateMetadata` and the page. Recipeos API routes (`app/api/pantry/[id]/route.ts`, `app/api/recipes/[id]/route.ts`, `app/api/recipes/[id]/scale/route.ts`) already use `Promise<{ id }>` + `await params`. `app/(app)/vault/[id]/page.tsx` is a client component using `useParams` — unaffected by the breaking change. Both `next-env.d.ts` files regenerated with the `./.next/types/routes.d.ts` reference — consistent with a real Next 15 build.
  - CONFIRMED — server start/runtime is self-consistent. `apps/server/package.json`: `start` is now `tsx src/index.ts`, `tsx` moved to `dependencies`, `build` runs config build + `tsc --noEmit`; `apps/server/tsconfig.json` has `noEmit: true`, so no `dist/index.js` is expected and none is referenced. `apps/server/Dockerfile` install filter widened to `--filter @culinaryos/server...` (pulls workspace deps, all of which live under `packages/`, fully copied before install) and CMD runs `pnpm start` (tsx from prod deps — present at runtime). `PORT`/`HOST` handling and `/health` in `apps/server/src/index.ts:152-187` unchanged.
  - CONFIRMED — Web/Admin config-build prerequisite is coherent. Both Vite configs alias only `@culinaryos/ui`/`@culinaryos/shared` to TS source, while `@culinaryos/config` resolves via workspace symlink to `packages/config` (`main: ./dist/index.js`, `packages/config/tsconfig.json` emits to `dist/`). No runtime `from '@culinaryos/config'` imports found in web/admin/server `src`, so the added `pnpm --filter @culinaryos/config build` step is harmless locally and required for isolated Railpack builds. Matches the SPA output-dir runbook entries.
  - CONFIRMED — `@esbuild/win32-x64` moved from root `dependencies` to `optionalDependencies` (`package.json:90-92`, lockfile importers diff corroborates). Correct direction for Linux (Railway) installs; no code imports that package directly.
  - RISKS (not blockers, not independently verified — no builds/installs run per task constraints; Codex's local build/smoke claims taken as stated): (1) production API runs TS source via tsx (interpreter in prod image; slower cold start, heavier memory vs compiled dist) — acceptable, but deliberate; (2) `/health` is process-only, not DB readiness — runbook already says so, do not promote it; (3) lockfile churn is large for a major Next bump — frozen install must still be proven in Railway build logs; (4) root `railway.toml` still declares the old Docker builder while the runbook describes dashboard-managed Railpack services — stale-file confusion risk, suggest Codex annotate or remove it in the runbook scope; (5) Supabase remains the real runtime backend (server `src/index.ts` relaxed/demo banners, recipeos `@supabase/ssr`) — `DATABASE_URL` swap alone is still insufficient, per the standing decision above.
  - SECURITY: no regressions in scope — no `service_role`/secret handling changes, no auth/payment/RLS code touched; marketing page edit is presentational plus the async-params adaptation.
  - STATUS: review complete. Zero BLOCKERs, zero security regressions, five noted risks (four already reflected in the runbook/ledger). Codex owns Web/Admin build prerequisites and the deployment runbook and may proceed to push-approval and Railway log verification under the open release checks; no Muse-owned follow-up pending.
