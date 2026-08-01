# Original User Request

## Initial Request — 2026-08-01T17:58:43Z

<USER_REQUEST>
Full re-architecture and execution plan for CulinaryOS, focusing on stabilizing POS and KDS core real-time operations, WebSocket message contracts, multi-tenant security, and MCP extension infrastructure.

Working directory: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS
Integrity mode: development

## Requirements

### R1. POS & KDS Real-Time Architecture & State Synchronization
- Re-architect and stabilize the WebSocket message contracts between POS/KDS servers (pos/, kds/) and client applications (pos-client/, kds-client/).
- Ensure robust state management, handling connection loss, offline transaction queuing for POS, and instant order ticket status updates on KDS without race conditions or memory leaks.

### R2. Monorepo Alignment & Package Contracts
- Clean up monorepo workspace boundaries (packages/, shared/) to ensure no circular dependencies or direct src/ cross-package imports exist.
- Standardize shared TypeScript interfaces across backend APIs, KDS, POS, and frontend web applications.

### R3. Multi-Tenant Security & Database Isolation
- Ensure all PostgreSQL/Supabase tables strictly enforce Row Level Security (RLS) and that all service queries are properly tenant-scoped.
- Verify schema migrations in supabase/ are forward-compatible and adhere to zero-data-loss standards.

### R4. Turborepo & Dev Environment Stability
- Validate and update turbo.json pipelines and pnpm-workspace.yaml configurations to guarantee deterministic builds, linting, and testing across all packages.

## Acceptance Criteria

### Real-Time & State Integrity
- WebSocket contracts for POS and KDS are fully documented, typed, and resilient to disconnection/reconnection events.
- POS offline queue correctly processes and syncs pending transactions upon reconnection.

### Codebase & Security
- pnpm build and pnpm test pass across all workspace packages via Turborepo without errors.
- All database queries in the backend and services strictly include tenant filtering context, passing security audits.
- Zero unhandled promise rejections or memory leaks during WebSocket client lifecycle tests.
</USER_REQUEST>

## Follow-up — 2026-08-01T18:07:35Z

UPDATE ON SCOPE AND INTEGRATION TARGETS:

The user has clarified that several adjacent repositories under `c:\Users\white\OneDrive\Documents\GitHub\` are to be integrated, connected, or ported as MCP extensions into CulinaryOS:
1. `CulinaryOps` (`c:\Users\white\OneDrive\Documents\GitHub\CulinaryOps`)
2. `KitchenKit` (`c:\Users\white\OneDrive\Documents\GitHub\KitchenKit`)
3. `Plated` (`c:\Users\white\OneDrive\Documents\GitHub\Plated`)
4. `Post-Pilot` (`c:\Users\white\OneDrive\Documents\GitHub\Post-Pilot`)
(Note: `RecipeOS` is also present in the workspace directory).

Please incorporate these external repository integrations into the CulinaryOS master plan:
- Evaluate their architectures and existing schemas.
- Plan their migration/porting or MCP tool bridge integration into `mcp/` and `extensions/` under CulinaryOS following the extension template (`extension_template/`).
- Maintain clean package boundaries and multi-tenant security across all MCP integration points.

