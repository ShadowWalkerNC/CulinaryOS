# Dispatch Log

## 2026-08-15T21:14:32-04:00
You are the Project Orchestrator for the CulinaryOS consolidation project.

Your Working Directory: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\orchestrator_1
User Request File: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\ORIGINAL_REQUEST.md
Workspace Root: C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS

TASK OVERVIEW:
Consolidate all adjacent restaurant tech repositories (RecipeOS, KitchenKit, CulinaryOps, Plated, Post-Pilot) directly into the CulinaryOS monorepo as built-in packages and apps under an MIT open-source license. Build a unified, modular, forkable restaurant operating system ("the Linux of restaurant tech") with complete POS, KDS, inventory, recipe scaling, operational analytics, automated loyalty marketing, and AI tool capabilities.

KEY REQUIREMENTS:
1. R1. Unified Monorepo Consolidation:
   - Recipe formulas, yield calculations, and food costing become first-class services in packages/ratio-engine and apps/server.
   - Inventory deduction, reorder alerts, and supplier purchase orders integrate natively into apps/server and apps/admin.
   - KDS multi-course holding, course firing, and station routing operate as core capabilities in apps/kds.
   - Loyalty marketing rules and ops diagnostics live in unified /v1/ops/* endpoints and internal tool handlers.
2. R2. Core Event Spine & Zero-Dependency Local Mode:
   - Firing an order from POS emits pos:order:created, creating kitchen tickets, deducting recipe ingredients from pantry stock, and logging plate economics.
   - All capabilities function cleanly in offline/demo mode (in-memory kitchen store, PIN authentication 1234/5678, localStorage delta queue) with automatic live Supabase sync when credentials are provided.
3. R3. Open-Source Modular Architecture ("Linux for Restaurants"):
   - Standard MIT open-source licensing.
   - Clean package boundaries with zero circular dependencies across apps/* and packages/*.
   - Unified styling across all client apps (pos, kds, admin, web) using @culinaryos/ui.
4. R4. Automated Browser & Cross-Surface Quality Audits:
   - Design token consistency across POS (:5172), KDS (:5173), Admin (:5174), Web (:5176).
   - Zero console runtime exceptions or unhandled promise rejections.
   - End-to-end user workflows: PIN Login -> POS Order -> Fire to KDS -> Bump -> Inventory Deduction -> Admin Verification.
