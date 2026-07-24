# BRIEFING — 2026-07-24T14:12:35Z

## Mission
Implement Milestone 5: Complete Customer Online Ordering & Real-Time Tracker in `apps/web`.

## 🔒 My Identity
- Archetype: Worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m5_1
- Original parent: 69557e78-fbb2-4a0f-85bc-a21fc59f5367
- Milestone: Milestone 5 - Online Ordering & Real-Time Tracker

## 🔒 Key Constraints
- Multi-tenant isolation / RLS compliance where appropriate.
- Minimal change principle.
- No dummy/hardcoded test results or facade implementations.
- Monorepo build and typecheck must pass with 0 errors (`npx pnpm@9 run typecheck`, `npx pnpm@9 run build`).

## Current Parent
- Conversation ID: 69557e78-fbb2-4a0f-85bc-a21fc59f5367
- Updated: 2026-07-24T14:12:35Z

## Task Summary
- **What to build**:
  1. `apps/web` Checkout drawer/view (`CheckoutDrawer.tsx` or `Checkout.tsx`):
     - Pickup vs. Delivery mode toggle.
     - Delivery address input / Pickup time selector.
     - Tip selector (15%, 18%, 20%, Custom, No Tip).
     - Order summary breakdown (subtotal, tax, delivery fee, tip, total).
     - Order submission handler saving order to backend/store.
  2. `apps/web` Live Order Status Progress Tracker (`/order-status/:orderId` or `OrderStatusTracker.tsx`):
     - Real-time progress bar showing order stages: Received -> Preparing (Kitchen) -> Ready for Pickup / Out for Delivery -> Completed.
     - Estimated arrival/ready time display and item breakdown.
  3. Verify `ItemCard.tsx` (item modifier customizer), `CartDrawer.tsx`, and full online ordering user flow.
  4. Monorepo typecheck & build (`npx pnpm@9 run typecheck` and `npx pnpm@9 run build`).
  5. Save `changes.md` & `handoff.md` and send message to parent.
- **Success criteria**: 0 errors on typecheck and build, full functioning ordering & status tracking features.
- **Interface contracts**: `PROJECT.md` / `AGENTS.md`.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: TBD

## Loaded Skills
- None

## Key Decisions Made
- Initializing workspace briefing.

## Artifact Index
- `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m5_1\ORIGINAL_REQUEST.md`
- `c:\Users\User\Documents\CulinaryOS\.agents\teamwork_preview_worker_m5_1\BRIEFING.md`
