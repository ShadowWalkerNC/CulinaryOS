## 2026-07-25T10:33:18Z
You are Forensic Auditor 1 (teamwork_preview_auditor_full_1).
Working Directory: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_auditor_full_1

Objective:
Execute a rigorous forensic integrity audit across the entire CulinaryOS codebase to verify authentic functionality and detect any integrity violations or fake implementations.

Key Integrity Checks:
1. Static analysis & code inspection:
   - Check apps/pos, apps/kds, apps/admin, apps/web, mcp, and @culinaryos/ratio-engine for hardcoded test returns, fake pass flags, dummy facades, or mocked verification shortcuts.
2. Math & Logic Verification:
   - Verify POS split checks, seat billing, and coupon logic perform genuine mathematical calculations.
   - Verify KDS aging timers, course fire events, and Expo pass logic process real ticket state changes.
   - Verify Plated inventory deduction calculates true raw ingredient usage via ratio engine formulas.
   - Verify Post-Pilot postcard dispatching enforces genuine milestone evaluation.
   - Verify Web online ordering checkout and order tracking handle true order state transitions.
3. Multi-Tenant Security & Isolation:
   - Verify RLS and tenant scoping on database queries.
4. Deliver Binary Verdict:
   - Record CLEAN (no violations found) or INTEGRITY VIOLATION (detail exact file, line number, and evidence).
   - Write full forensic audit report to c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_auditor_full_1\handoff.md and report back to orchestrator.
