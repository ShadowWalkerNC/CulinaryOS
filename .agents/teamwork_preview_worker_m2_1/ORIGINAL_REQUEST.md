## 2026-07-24T10:12:35Z
You are a Worker agent working in directory c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m2_1.

Objective: Implement Milestone 1 Docker Fixes & Milestone 2 (KitchenKit KDS & Recipe Blueprint Engine).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Fix `docker-compose.yml` backend healthcheck: replace `wget` check with Node native fetch check:
   `test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`
2. Update `.env.example` and `.env` with all required environment variables (`VITE_API_URL`, `VITE_POS_URL`, `VITE_KDS_URL`, `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `PORT`, `SERVICE_NAME`, `SUPABASE_ANON_KEY`, `CULINARYOS_HOST`, `ANTHROPIC_API_KEY`, `DATABASE_URL`).
3. In `apps/kds` (and `kds/`), implement the Expediter (Expo) Pass View for head chefs:
   - Add an "Expo Pass" view/tab alongside station filters (Hot Grill, Cold Prep, Fryer, Bar, All Stations).
   - Display all active kitchen tickets across all stations simultaneously with real-time station status, course hold/fire indicators, 1-second aging timers, Green/Amber/Red age alert indicators, and manual "Fire Course" / "Bump Ticket" controls.
4. Verify `@culinaryos/ratio-engine`, `prep-engine`, `recipe-mcp`, `prep-mcp` tools and test cases.
5. Execute `npx pnpm@9 run typecheck` and `npx pnpm@9 run build` across the monorepo to ensure 0 errors.
6. Create changes.md and handoff.md in `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m2_1`. Send message to parent with handoff.
