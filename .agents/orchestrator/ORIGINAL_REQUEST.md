# Original User Request

## Initial Request — 2026-08-01T13:58:55-04:00

<USER_REQUEST>
You are the Project Orchestrator for CulinaryOS.
Your working directory is `c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator`.

Your instructions:
1. Read the user requirements in `c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\ORIGINAL_REQUEST.md`.
2. Initialize your workspace directory (`c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator`), create `BRIEFING.md`, `plan.md`, and `progress.md`.
3. Decompose the requirements (R1: POS & KDS Real-Time Architecture & State Synchronization, R2: Monorepo Alignment & Package Contracts, R3: Multi-Tenant Security & Database Isolation, R4: Turborepo & Dev Environment Stability) into actionable milestones.
4. Execute the project by spawning specialized subagents (explorers, workers/implementers, reviewers, challengers) to inspect, implement, verify, and test each component.
5. Track progress in `progress.md` continuously.
6. When all requirements and acceptance criteria are fully met and verified, send a message to Sentinel claiming completion, including a summary of all work done and test/verification results, so Sentinel can spawn the Victory Auditor.

Begin by reading `ORIGINAL_REQUEST.md` and creating your initialization files.
</USER_REQUEST>

## Follow-up — 2026-08-01T18:07:41Z

<USER_REQUEST>
UPDATE ON SCOPE AND INTEGRATION TARGETS:

The user has clarified that several adjacent repositories under `c:\Users\white\OneDrive\Documents\GitHub\` are to be integrated, connected, or ported as MCP extensions into CulinaryOS:
1. CulinaryOps (`c:\Users\white\OneDrive\Documents\GitHub\CulinaryOps`)
2. KitchenKit (`c:\Users\white\OneDrive\Documents\GitHub\KitchenKit`)
3. Plated (`c:\Users\white\OneDrive\Documents\GitHub\Plated`)
4. Post-Pilot (`c:\Users\white\OneDrive\Documents\GitHub\Post-Pilot`)
(Note: RecipeOS is also present in the workspace directory).

Please incorporate these external repository integrations into the CulinaryOS master plan:
- Evaluate their architectures and existing schemas.
- Plan their migration/porting or MCP tool bridge integration into `mcp/` and `extensions/` under CulinaryOS following the extension template (`extension_template/`).
- Maintain clean package boundaries and multi-tenant security across all MCP integration points.
</USER_REQUEST>

## Current Execution Prompt — 2026-08-02T12:13:15Z

<USER_REQUEST>
You are the Project Orchestrator for CulinaryOS.
Your working directory is: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator
The original user request is located at: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\ORIGINAL_REQUEST.md

Your mission:
Lead the execution and re-architecture of CulinaryOS addressing all requirements:
1. R1: POS & KDS Real-Time Architecture & State Synchronization (WebSocket contracts, offline queue, ticket status, state management).
2. R2: Monorepo Alignment & Package Contracts (packages/, shared/, no circular dependencies, TypeScript interfaces across POS, KDS, backend, web).
3. R3: Multi-Tenant Security & Database Isolation (Supabase RLS enforcement, tenant-scoped queries, zero-data-loss forward-compatible migrations).
4. R4: External Repositories & MCP Extension Platform (Bridge/port CulinaryOps, KitchenKit, Plated, Post-Pilot, RecipeOS into mcp/ and extensions/ adhering to extension_template/ contracts).
5. R5: Turborepo & Dev Environment Stability (turbo.json pipelines, pnpm build and test across workspace packages).

Please create your briefing/plan in your working directory (`c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator\plan.md`), maintain `progress.md`, dispatch specialist subagents as needed, and report your progress regularly. When all requirements and acceptance criteria are met, deliver a formal completion report.
</USER_REQUEST>
