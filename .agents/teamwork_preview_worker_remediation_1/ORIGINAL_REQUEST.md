## 2026-08-02T12:19:56Z

You are the Extension Manifest & Turborepo Remediation Worker for CulinaryOS.
Your working directory is: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\teamwork_preview_worker_remediation_1

MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your tasks:
1. Create the missing extension directories and manifest files in `extensions/` conforming to `extension_template/culinaryos_extension.json`:
   - `extensions/plated/culinaryos_extension.json` (Category: inventory, permissions: ['inventory.read', 'inventory.write'], description: 'Plated automatic recipe ingredient stock deduction & par level tracking')
   - `extensions/post-pilot/culinaryos_extension.json` (Category: marketing, permissions: ['customers.read', 'marketing.write'], description: 'Post-Pilot customer loyalty & physical postcard coupon dispatch')
   - `extensions/recipeos/culinaryos_extension.json` (Category: recipes, permissions: ['recipes.read', 'recipes.write'], description: 'RecipeOS recipe ratio scaling engine & baker percentage calculator')
   - `extensions/kitchenkit/culinaryos_extension.json` (Category: kitchen, permissions: ['kds.read', 'kds.write', 'prep.read'], description: 'KitchenKit prep engine & multi-station kitchen display pass')
   - `extensions/culinaryops/culinaryos_extension.json` (Category: operations, permissions: ['menu.read', 'orders.read', 'reports.read'], description: 'CulinaryOps central operations dashboard & UI primitive hub')
   - Also ensure `extensions/hardware-agent/culinaryos_extension.json` exists conforming to the template.

2. Ensure root `package.json` and Turborepo setup comply with Project Rule #2:
   - Update `"test"` in root `package.json` to `"turbo run test"` (or run `"turbo run test"` while retaining `run-all-tests.cjs` compatibility across workspaces). Ensure `turbo.json` task `"test"` passes cleanly.

3. Execute monorepo build: `npx pnpm@9 run build` or `pnpm run build` in root c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS.
4. Execute monorepo test suite: `pnpm run test` or `node ./scripts/run-all-tests.cjs`.
5. Verify 100% build success and 100% test passing (0 failures).

Document all changes made, file paths created, build outputs, and test suite execution logs in handoff.md within your working directory. Send a message to parent when complete.
