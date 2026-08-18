# Scope: Milestone 3 (UI Design Tokens & Admin Portal Modernization)

## Architecture
- `packages/ui`: Shared UI library exporting design tokens, buttons, cards, badges, headers, and navigation primitives.
- `apps/admin`: React + Vite admin dashboard for menu management, staff management, and system settings.
- `apps/pos`: React + Vite POS terminal utilizing matching design tokens and styles.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Admin Tailwind & PostCSS Setup | Add tailwind.config.js & postcss.config.js to apps/admin referencing packages/ui preset | M3 | Dispatch |
| 2 | Admin Page Modernization | Update Menu.tsx and Staff.tsx in apps/admin to mount CulinaryHeader and use @culinaryos/ui components (CulinaryButton, CulinaryCard, CulinaryBadge) | M3 | Dispatch |
| 3 | Token Consistency Across Surfaces | Ensure uniform color palette, typography, and spacing tokens between POS, KDS, Admin, and Web | M3 | Dispatch |
| 4 | Clean Compilation & Typecheck | Ensure all packages compile cleanly with zero TypeScript or bundling errors | M3 | Dispatch |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 3 | UI Design Tokens & Admin Modernization | apps/admin, packages/ui, apps/pos styling | none | IN_PROGRESS |

## Write Boundaries
- Exclusively owns: `apps/admin/*`, `packages/ui/*`, and styling files in `apps/pos/src/*`.
- Prohibited from modifying: `apps/server/*`, `supabase/*`, backend packages outside scope.
