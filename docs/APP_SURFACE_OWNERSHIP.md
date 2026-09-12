# CulinaryOS Application Surface Ownership

> Status: Stage 0 baseline — 2026-09-09. This document is the transition map
> for consolidation work; it does not delete or move any existing application.

## Canonical active surfaces

| Surface | Directory | Runtime | Owner / purpose | Connectivity | Status |
| --- | --- | --- | --- | --- | --- |
| API | `apps/server` | Hono / Node | Tenant-scoped API, events, payments, integrations | Required by connected flows | Canonical |
| POS | `apps/pos` | React / Vite | FOH order, payment and table terminal | Offline-first | Canonical |
| KDS | `apps/kds` | React / Vite | Kitchen tickets and station routing | Offline-capable | Canonical |
| Admin | `apps/admin` | React / Vite | Manager configuration and back office | Online preferred | Canonical |
| Public web and guest commerce | `apps/web` | React / Vite | Public product site, menu, online ordering, order status, tableside, jobs | Online required | Canonical; destination for Marketing migration |
| Operations | `apps/ops` | React / Vite | Food cost, labor, waste and vendors | Online preferred | Canonical; migrate to shared UI |
| KitchenKit | `apps/kitchenkit` | React / Vite | Recipes, prep, pars, vendors and shelf life | Online preferred | Canonical; migrate to shared UI |
| RecipeOS | `apps/recipeos` | Next.js | Standalone recipe vault and pantry application | Authenticated | Canonical; define shared-brand boundary |
| Marketing | `apps/marketing` | Next.js | Legacy public brand, pricing, signup and blog pages | Public | Transitional; migrate unique content into `apps/web`, then archive in a dedicated change |
| Desktop | `apps/desktop` | React / Vite | Local workstation shell and application switcher | Local network | Canonical shell; embeds active surfaces |
| Mobile | `mobile` | React Native / Expo | Future companion application | Future | Stub; do not expand before operational web parity |
| CLI | `cli` | Node | Terminal parity for server features | Local / connected | Canonical interface |
| MCP | `mcp` | Node | Optional AI-additive tools over the canonical API | Connected | Canonical interface; no independent domain state |

## Transitional artifacts

| Directory | Role | Rule |
| --- | --- | --- |
| `kds/` | Legacy Kotlin/KMP course-engine artifact | No new production logic. Extract any unique behavior into `packages/shared` before archival. |
| `shared/` | Legacy Kotlin/KMP types, sync and realtime artifact | No new production logic. `packages/shared` is the TypeScript domain authority. |
| `extensions/` | Extension manifests and one legacy Flutter entry point | Keep manifests; move runnable code behind versioned extension contracts. |
| `extension_template/` | Third-party extension contract | Keep as the only public template. |

## Non-negotiable boundaries

1. `apps/web` is the public CulinaryOS site and guest-commerce shell. Do not add new public functionality to `apps/marketing`; migrate its unique content into `apps/web` before archival.
2. No client surface talks directly to another client surface for business mutations. All POS/KDS/Admin/Web writes use `apps/server` routes and stable event contracts.
3. `packages/ui` is the design-token and primitive owner. Client applications may compose it but must not establish competing palettes or base component contracts.
4. `packages/shared` is the TypeScript domain-model and offline-sync owner. The root `shared/` directory is transitional only.
5. MCP servers are accessories: they call the API using constrained credentials and may not become a second backend or bypass tenant isolation.

## Consolidation exit checks

- Each active surface appears once in local health, deployment, architecture and UI test manifests.
- Every client consumes the shared design tokens and has no independent global palette.
- Demo mode proves POS -> API -> KDS and public menu fallback without Supabase or Stripe.
- Legacy paths have an explicit archive decision and zero imports from active production code.
- The application launcher exposes canonical operational and guest surfaces only; transitional applications do not appear as active destinations.
