# Context & Technical State Index — CulinaryOS

## Workspace Paths
- Repository Root: `c:\Users\User\Documents\CulinaryOS`
- KitchenKit External Reference: `c:\Users\User\Documents\KitchenKit`
- Orchestrator Directory: `c:\Users\User\Documents\CulinaryOS\.agents\orchestrator`

## Key Requirements & Acceptance Summary
- R1: Multi-surface monorepo (`apps/pos`, `apps/kds`, `apps/admin`, `apps/web`), Docker Compose LAN setup with Hono API gateway, Electron desktop config.
- R2: KitchenKit KDS (`apps/kds`, station tabs: Hot Grill, Cold Prep, Fryer, Bar, All; 1s timers, Red/Yellow/Green age alerts, course hold/fire, Expo pass view), `@culinaryos/ratio-engine`, `prep-engine`, `recipe-mcp`, `prep-mcp`.
- R3: Plated Inventory deduction engine (`apps/admin`, `mcp/src/inventory-server.ts`), low-stock par alerts on POS checkout.
- R4: Post-Pilot Automated Loyalty Marketing (`mcp/src/post-pilot-server.ts`), postcard coupons upon visit/spending milestones.
- R5: Online ordering web app (`apps/web`), item customizer, cart drawer, checkout (Pickup/Delivery, tips, submit), real-time order tracker.
- Build criterion: `npx pnpm@9 run build` clean with 0 TypeScript errors across all monorepo packages.

## Active Subagents
None currently active.
