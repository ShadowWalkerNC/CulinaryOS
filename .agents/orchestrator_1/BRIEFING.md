# BRIEFING — 2026-08-15T21:19:55-04:00

## Mission
Consolidate adjacent restaurant tech repositories into CulinaryOS monorepo as a unified, modular, forkable restaurant OS with complete POS, KDS, inventory, recipe scaling, operational analytics, automated loyalty marketing, and AI tools under MIT license.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator_1
- Original parent: parent
- Original parent conversation ID: 778d24ca-0a99-4f22-bf7c-063a9ebe6a03

## 🔒 My Workflow
- **Pattern**: Project Pattern (Dual Track: Implementation + E2E Testing)
- **Scope document**: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
1. **Decompose**: Survey full scope via 3 parallel explorers, synthesize Feature Inventory in PROJECT.md, decompose into milestone tracks.
2. **Dispatch & Execute**:
   - **Implementation Track**: Sub-orchestrators for milestones (M1: ratio-engine & db types, M2: closed-loop recipe deduction & ops, M3: UI design tokens & admin, M4: MCP tools & licensing).
   - **E2E Testing Track**: E2E Testing Orchestrator constructing 4-tier opaque-box test suite publishing TEST_READY.md.
   - **Final Milestone**: Pass 100% E2E tests (Phase 1) + Adversarial hardening (Phase 2).
3. **On failure**:
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
4. **Succession**: Self-succeed at 16 spawns after active workers complete.
- **Work items**:
  1. Survey & Feature Inventory [done]
  2. E2E Testing Track (e2e_orch) [in-progress]
  3. Milestone 1: Ratio Engine & DB Types (sub_orch_m1) [in-progress]
  4. Milestone 3: UI Tokens & Admin Portal (sub_orch_m3) [in-progress]
  5. Milestone 2: Closed-Loop Event Spine & Ops [pending M1 completion]
  6. Milestone 4: MCP Tools & Open-Source Packaging [pending M1/M2 completion]
  7. Milestone 5: 100% E2E Pass & Adversarial Hardening [pending]
- **Current phase**: 2A (Dual Track Execution)
- **Current focus**: Parallel execution of E2E Track, M1, and M3

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- NEVER investigate or explore the problem at the code level — dispatch Explorers for technical investigation.
- Always include path to ORIGINAL_REQUEST.md in every subagent dispatch.
- Audit verdict is binary veto — INTEGRITY VIOLATION fails milestone unconditionally.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 778d24ca-0a99-4f22-bf7c-063a9ebe6a03
- Updated: 2026-08-15T21:14:32-04:00

## Key Decisions Made
- Completed Survey phase with 3 parallel explorers; synthesized 35 features and comprehensive interface contracts in PROJECT.md.
- Dispatched E2E Testing Orchestrator, Sub-Orch M1, and Sub-Orch M3 concurrently.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_1 | teamwork_preview_explorer | Ratio Engine & Pantry Survey | completed | 4be33530-0da3-454c-b57e-b17244ca72ed |
| explorer_2 | teamwork_preview_spec_miner | KDS, POS, Demo Mode & UI Tokens Survey | completed | 5394e3b0-55e1-4886-9ad2-96367170b97e |
| explorer_3 | teamwork_preview_spec_miner | Ops, Loyalty, MCP, Build & Tests Survey | completed | 8053d16f-eafc-4ab3-94e5-514653ccd5dc |
| e2e_orch | self | E2E Testing Track (4-tier suite & TEST_READY.md) | in-progress | 56e0dcab-68b0-432d-ab06-9fcc8aec7ee8 |
| sub_orch_m1 | self | M1: Ratio Engine & DB Types | in-progress | 705b84d9-7a42-4572-8e92-12b71ffd5583 |
| sub_orch_m3 | self | M3: UI Tokens & Admin Modernization | in-progress | 08684e4e-f6b9-47ef-a543-8f435ce4fd4f |

## Succession Status
- Succession required: no
- Spawn count: 6 / 16
- Pending subagents: 56e0dcab-68b0-432d-ab06-9fcc8aec7ee8, 705b84d9-7a42-4572-8e92-12b71ffd5583, 08684e4e-f6b9-47ef-a543-8f435ce4fd4f
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 8cf24e85-bd62-42a6-8a3c-218e4d2928b6/task-13
- Safety timer: none

## Artifact Index
- C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md — Verbatim user requirements
- C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md — Master project architecture, milestones, feature inventory
