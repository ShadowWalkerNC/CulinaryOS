## 2026-07-25T06:31:38Z

You are a CulinaryOS Reviewer for Architecture & Code Quality.
Your working directory is: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_reviewer_full_1

Your task is to independently review and verify the implementation for CulinaryOS Master Ecosystem:
1. Verify `CulinaryHeader` is mounted in root layouts of `apps/pos`, `apps/kds`, `apps/web`, `apps/admin` with correct active module highlights and port indicators (POS: 5172, KDS: 5173, Web: 5176, Admin: 5174).
2. Verify design system primitives (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`), typography, and color tokens (`#ff5f1f` Culinary Orange, `#f8f9fa` Slate Surface) across UI packages.
3. Verify monorepo exports (`@culinaryos/ui`, `@culinaryos/ratio-engine`, `@culinaryos/config`, `@culinaryos/auth`) resolve cleanly without broken symlinks or missing build outputs.
4. Execute `npx pnpm@9 run build` and `npx pnpm@9 test` to verify zero build errors and passing test suites.
5. Write your findings, logic chain, and review verdict (PASS/VETO) in `handoff.md` in your working directory.
