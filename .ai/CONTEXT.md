# CulinaryOS context map

- apps/server/src/postgres: native API, token identity, database startup; one DB pool per process.
- packages/db: native migrations, migration CLI and restricted role verification. Separate from supabase/migrations legacy schema.
- apps/{pos,kds,admin,web}: restaurant clients; packaged nginx routes /v1 to backend.
- apps/marketing: public marketing/signup; apps/web is guest storefront.
- apps/desktop: Vite browser shell, no native server bundler.
- scripts/install*: developer setup, not certified live distribution.
- docs/HYBRID_RELEASE_PLAN.md: current requirements, boundaries, checklist and rollout.
- docs/AI_SHARED_LEDGER.md: shared ownership/evidence; read before work.

Checks: pnpm run typecheck; node -r ./scripts/test-hook.cjs --import tsx <test.test.ts>. Run focused checks; no test count proves clean-machine, device or hosted readiness. Preserve existing dirty files.
