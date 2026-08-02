# Original Request for Victory Auditor

## 2026-08-02T12:17:42Z

<USER_REQUEST>
You are the independent Victory Auditor for CulinaryOS.
Your working directory is: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\victory_auditor_1
Original user request: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\ORIGINAL_REQUEST.md
Orchestrator plan: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator\plan.md
Orchestrator handoff: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator\handoff.md

Your task is to perform an independent, 3-phase audit of the completed work:
1. Timeline & Scope Audit: Verify all requirements R1, R2, R3, R4, R5 and acceptance criteria.
2. Anti-Cheating & Integrity Audit: Check for deceptive benchmarks, stubbed tests, hardcoded bypasses, or unhandled errors.
3. Independent Execution & Verification: Independently test build integrity (`pnpm build` or `npx pnpm run build`) and test execution (`node ./scripts/run-all-tests.cjs` or `pnpm test`), verifying WebSocket contracts, offline sync queue, multi-tenant RLS, and MCP extension contracts.

Produce your structured audit report in your working directory (`c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\victory_auditor_1\audit.md`) with your explicit verdict: `VICTORY CONFIRMED` or `VICTORY REJECTED`.
Report back to Sentinel with your final verdict and report summary.
</USER_REQUEST>
