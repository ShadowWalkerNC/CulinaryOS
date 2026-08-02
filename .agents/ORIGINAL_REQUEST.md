# Original User Request

## 2026-08-02T12:13:06Z

<USER_REQUEST>
Full re-architecture and execution plan for CulinaryOS, focusing on stabilizing POS and KDS core real-time operations, WebSocket message contracts, multi-tenant security, Turborepo pipelines, and integrating external satellite repositories as MCP extensions.

Working directory: c:\Users\white\OneDrive\Documents\GitHub\CulinaryOS
Connected Repositories:
- c:\Users\white\OneDrive\Documents\GitHub\CulinaryOps
- c:\Users\white\OneDrive\Documents\GitHub\KitchenKit
- c:\Users\white\OneDrive\Documents\GitHub\Plated
- c:\Users\white\OneDrive\Documents\GitHub\Post-Pilot
- c:\Users\white\OneDrive\Documents\GitHub\RecipeOS

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

### R4. External Repositories & MCP Extension Platform
- Port or bridge connected repositories (CulinaryOps, KitchenKit, Plated, Post-Pilot, RecipeOS) into CulinaryOS's mcp/ and extensions/ system.
- Follow extension_template/ contracts for third-party/external module integration ensuring AI agent tool accessibility without tight coupling to core POS/KDS functionality.

### R5. Turborepo & Dev Environment Stability
- Validate and update turbo.json pipelines and pnpm-workspace.yaml configurations to guarantee deterministic builds, linting, and testing across all packages.

## Acceptance Criteria

### Real-Time & State Integrity
- WebSocket contracts for POS and KDS are fully documented, typed, and resilient to disconnection/reconnection events.
- POS offline queue correctly processes and syncs pending transactions upon reconnection.

### MCP & Satellite Integrations
- Integration strategies and MCP bridge tools established for CulinaryOps, KitchenKit, Plated, Post-Pilot, and RecipeOS.
- Extension boundaries in extensions/ adhere to extension_template/ specifications.

### Codebase & Security
- pnpm build and pnpm test pass across all workspace packages via Turborepo without errors.
- All database queries in the backend and services strictly include tenant filtering context, passing security audits.
- Zero unhandled promise rejections or memory leaks during WebSocket client lifecycle tests.
</USER_REQUEST>
