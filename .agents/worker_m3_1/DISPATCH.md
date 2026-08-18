## 2026-08-15T21:26:15Z
You are the Worker for Milestone 3 (UI Design Tokens & Admin Portal Modernization).
Working Directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m3_1
Scope document: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m3\SCOPE.md
Project plan: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\PROJECT.md
Original Request: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\ORIGINAL_REQUEST.md

Explorer Reports:
- Explorer 1 Report: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m3_1\report.md (Handoff: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m3_1\handoff.md)
- Explorer 2 Report: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m3_2\report.md (Handoff: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m3_2\handoff.md)
- Explorer 3 Report: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m3_3\report.md (Handoff: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\explorer_m3_3\handoff.md)

Write Boundaries:
- Exclusively owns: `apps/admin/*`, `packages/ui/*`, and styling files in `apps/pos/src/*`.
- Do NOT touch `apps/server/*`, `supabase/*`, or other backend packages.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission Tasks:
1. In `packages/ui`:
   - Optionally add and export a shared Tailwind preset (`tailwind.preset.js`) so downstream apps (admin, pos, etc.) can consistently consume design tokens (`--cos-*`, brand colors, shadow-xs, etc.) alongside `culinary-theme.css`.
2. In `apps/admin`:
   - Add `tailwindcss`, `postcss`, and `autoprefixer` to `apps/admin/package.json` devDependencies.
   - Create `apps/admin/postcss.config.js` with `tailwindcss` and `autoprefixer`.
   - Create `apps/admin/tailwind.config.js` referencing `../../packages/ui/src/**/*.{js,ts,jsx,tsx}` and the design tokens/preset.
   - Create `apps/admin/src/index.css` with `@tailwind base; @tailwind components; @tailwind utilities;` and import it in `main.tsx`.
   - Modernize `apps/admin/src/pages/Menu.tsx` and `Staff.tsx`:
     - Remove all raw inline styling and raw unstyled `<nav>`.
     - Mount `CulinaryHeader activeModule="admin"`.
     - Group content with `CulinaryCard`.
     - Use `CulinaryBadge` for item availability / status / roles.
     - Use `CulinaryButton` for actions (toggle 86 item, add staff, etc.).
     - Provide clean sub-navigation between `/menu`, `/staff`, and `/pantry`.
   - Clean up `apps/admin/src/main.tsx` (remove redundant `PantryWithNav` wrapper or align with master layout).
3. In `apps/pos`:
   - Ensure `apps/pos/tailwind.config.js` remains aligned with shared tokens.
4. Verification & Testing:
   - Run `pnpm run typecheck` across the entire workspace (all 18 packages).
   - Run `pnpm turbo run build` across workspace apps and packages.
   - Verify zero errors.
5. Deliverables:
   - Record implementation details in `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m3_1\changes.md`.
   - Write full 5-component handoff report to `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\worker_m3_1\handoff.md`.
   - Send completion message to parent orchestrator.
