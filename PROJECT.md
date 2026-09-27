# Project: CulinaryOS High-End Industrial Hospitality Operating System (Frontend Elevation)

## Architecture
CulinaryOS is an AI-native, multi-tenant restaurant operating system monorepo orchestrated via pnpm workspaces and Turborepo. This project elevates the frontend UI/UX and micro-interactions into a high-end, modern industrial hospitality operating system (Linear meets Toast aesthetic) characterized by deep charcoal zinc surfaces (`#090d16` / `#121824`), warm stone light mode (`#f8f9fa` / `#ffffff`), warm amber (`#f59e0b`) and culinary ember (`#ff6b35`) accents, tactile spring physics (`active:scale-[0.97]`), 48px touch target safety, and thumb-zone ergonomics across POS, KDS, Admin, and Operations.

```
                    ┌──────────────────────────────────────────────┐
                    │               CulinaryOS API                 │
                    │         (apps/server - Hono HTTP/WS)         │
                    └──────┬───────────────┬────────────────┬──────┘
                           │               │                │
             ┌─────────────┴──┐    ┌───────┴──────┐   ┌─────┴───────────────┐
             │ FOH Interfaces │    │ BOH Systems  │   │ Ops, Sec & Ledger   │
             │  • apps/pos    │    │  • apps/kds  │   │  • apps/ops         │
             │  • apps/web    │    │  • kitchenkit│   │  • apps/admin       │
             └────────────────┘    └──────────────┘   └─────────────────────┘
                           │               │                │
  ┌────────────────────────┴───────────────┴────────────────┴───────────────────────┐
  │ Shared Core UI & Design System (packages/ui)                                    │
  │ • Deep Charcoal Zinc (#090d16 / #121824) & Warm Stone (#f8f9fa / #ffffff)       │
  │ • OKLCH Contrast Tokens (>=5:1 in kitchen glare, >=4.5:1 WCAG AA)               │
  │ • Deterministic 6-State Interactive Engine (Idle, Hover, Focus, Active, Load)   │
  │ • Mathematical Nested Radius Standard (R_inner = R_outer - padding)             │
  │ • Lucide SVG Icon Standard (Zero Emoji / Material Symbols in Core UI)           │
  │ • 48x48px Physical Touch Target Safety Boundary                                 │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1.1 | Theme & Color Architecture | Deep charcoal zinc (`#090d16`/`#121824`), warm stone (`#f8f9fa`/`#ffffff`), warm amber (`#f59e0b`), culinary ember (`#ff6b35`), emerald (`#10b981`), crimson (`#ef4444`) with valid CSS variable bindings | M1 | ORIGINAL_REQUEST §R1 |
| F1.2 | Mathematical Nested Radius & Borders | 1px subtle borders (`border-white/10` in dark, `border-slate-200` in light), `backdrop-blur-md`, nested radius standard ($R_{\text{inner}} = R_{\text{outer}} - \text{padding}$), standardizing cards on `rounded-2xl` | M1 | ORIGINAL_REQUEST §R1 |
| F1.3 | OKLCH Contrast Compliance | OKLCH color token definition guaranteeing $\ge 5:1$ contrast against stainless steel reflections and $\ge 4.5:1$ WCAG AA | M1 | ORIGINAL_REQUEST §R1, §R3 |
| F2.1 | 6-State Interactive Engine | Implementation of Idle, Hover, Focus-Visible (2px solid ring, 2px offset), Active (`active:scale-[0.97] duration-75`), Loading (fixed bounds, centered spinner), Disabled (50% opacity) across Button, Input, Chip | M1 | ORIGINAL_REQUEST §R5 |
| F2.2 | Lucide SVG Icon Standardization | Total elimination of emojis and Material Symbols webfont from shared UI, replacing with semantic Lucide SVG line icons | M1 | ORIGINAL_REQUEST §R5 |
| F2.3 | 48px Physical Touch Target Safety | Guaranteed 48×48px physical tap target safety wrapper/primitive on all interactive components | M1 | ORIGINAL_REQUEST §R5, Rule 13 |
| F3.1 | POS Tactile Spring Feedback | Micro-spring feedback (`active:scale-[0.97] transition-transform duration-75 ease-out`) on menu item cards, seat chips, and payment tiles | M2 | ORIGINAL_REQUEST §R2 |
| F3.2 | POS Sticky Bottom Thumb-Zone Cart | Sticky bottom thumb-zone cart & checkout summary drawer on viewports <1024px, preventing unreachable top-screen interactions | M2 | ORIGINAL_REQUEST §R2 |
| F3.3 | POS Dual-Pricing Segmented Toggle | Interactive segmented toggle (`[ Cash Discount | Card Tender ]`) with immediate visual total reconciliation | M2 | ORIGINAL_REQUEST §R2 |
| F3.4 | POS Split-Check & Tip Numeric Keypad | Split-check and tip-entry modal interactions with 48px tactile numeric keypad buttons and percentage chips | M2 | ORIGINAL_REQUEST §R2 |
| F3.5 | POS Touch Target & Dark Mode Elevation | Elevate all sub-48px buttons (void, notes, headers) and activate dark charcoal zinc mode in `apps/pos` | M2 | ORIGINAL_REQUEST §R2, §R1 |
| F4.1 | KDS Glare-Resistant Dark Theme | Integration of `culinary-theme.css` with dark zinc background (`#090d16`), high-contrast OKLCH status tokens ($\ge 5:1$) | M3 | ORIGINAL_REQUEST §R3 |
| F4.2 | KDS Oversized Bump & Fire Triggers | Oversized tactile bump triggers (64px - 80px height) and oversized Fire Course triggers engineered for gloved/greasy hands | M3 | ORIGINAL_REQUEST §R3 |
| F4.3 | KDS Visual Aging Indicators | Color-shifting border pulses on TicketCard: green (<10m), amber (10-20m), flashing crimson (>20m) | M3 | ORIGINAL_REQUEST §R3 |
| F4.4 | KDS Course Pacing Alert Bar | Persistent course pacing bar with prominent 64px fire actions and live ticking wait-time counters | M3 | ORIGINAL_REQUEST §R3 |
| F4.5 | KDS Icon & Touch Standardization | Elimination of emojis (`⚡`) and check glyphs (`✓`), replacing with Lucide SVGs, ensuring $\ge 48\text{px}$ touch safety | M3 | ORIGINAL_REQUEST §R3, §R5 |
| F5.1 | Admin & Ops Dense Data Tables | Dense data tables with sticky headers (`sticky top-0 z-10 backdrop-blur-md bg-card/95`), alternating zebra hover layers, and keyboard shortcut focus (`j`/`k`, arrows, Enter) | M4 | ORIGINAL_REQUEST §R4 |
| F5.2 | Admin App Shell & Navigation Test Fix | Restore `CompactNavigation` in `apps/admin/src/App.tsx`, resolving `tests/ui/navigation.test.ts` line 71 regression | M4 | ORIGINAL_REQUEST Acceptance |
| F5.3 | Interactive 3D Floor Map Elevation | Integrate `FloorMap3D` in Admin/Ops, add mobile/tablet touch & pinch camera orbit controls, and right-hand table property drawer (`<Sheet side="right">`) | M4 | ORIGINAL_REQUEST §R4 |
| F5.4 | Mobile Floor Manager Bottom Sheet | Implement native swipe-down bottom sheets (`vaul`) with drag handles and quick operational triggers (86 toggle, manager alert, drawer kick) | M4 | ORIGINAL_REQUEST §R4 |
| F5.5 | Admin & Ops Touch & Icon Elevation | Elevate all sub-48px touch targets and replace Material Symbols in `Purchasing.tsx` with Lucide SVGs | M4 | ORIGINAL_REQUEST §R4, §R5 |
| F6.1 | E2E Requirement-Driven Test Suite | Opaque-box test suite verifying Tiers 1-4: 48px touch targets, thumb-zone anchoring, 6-state engine, OKLCH contrast, aging pulses, dual-pricing, 3D map, data tables | M5 / Test Track | ORIGINAL_REQUEST Acceptance |
| F6.2 | Monorepo Typecheck & Test Gate | 100% pass on `pnpm run typecheck` (47/47 tasks) and `node ./scripts/run-all-tests.cjs` across all 123 test suites | M5 | ORIGINAL_REQUEST Acceptance |
| F6.3 | Adversarial Coverage Hardening | Tier 5 white-box stress testing: rapid multi-click, extreme screen resize, glove-touch emulation, color contrast verification | M5 | System Prompt |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System Core & 6-State Interactive Engine | F1.1, F1.2, F1.3, F2.1, F2.2, F2.3 (`packages/ui`) | None | PLANNED |
| M2 | POS Terminal & Handheld Ergonomics | F3.1, F3.2, F3.3, F3.4, F3.5 (`apps/pos`) | M1 | PLANNED |
| M3 | KDS Kitchen Rail & Pacing Visual Engine | F4.1, F4.2, F4.3, F4.4, F4.5 (`apps/kds`) | M1 | PLANNED |
| M4 | Admin Back-Office & Floor Management Workspaces | F5.1, F5.2, F5.3, F5.4, F5.5 (`apps/admin`, `apps/ops`) | M1 | PLANNED |
| M5 | Full E2E Verification & Adversarial Coverage Hardening | F6.1, F6.2, F6.3 (`tests/`, workspace-wide) | M2, M3, M4 | PLANNED |

## Interface Contracts

### 1. 6-State Button Engine (`packages/ui/src/components/Button.tsx`)
```typescript
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'ember' | 'amber';
  size?: 'sm' | 'md' | 'lg' | 'touch' | 'bump'; // touch >= 48px, bump >= 64px
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
// States: Idle, Hover, Focus-Visible (ring-2 ring-primary ring-offset-2), Active (active:scale-[0.97] duration-75), Loading (fixed bounds, centered Spinner), Disabled (opacity-50 pointer-events-none)
```

### 2. Dense Data Table Component (`packages/ui/src/components/Table.tsx`)
```typescript
export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  dense?: boolean;
}
export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean; // Adds sticky top-0 z-10 backdrop-blur-md bg-card/95
}
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  zebra?: boolean; // Adds even:bg-muted/30
  interactive?: boolean; // Adds cursor-pointer hover:bg-muted/50 focus-visible:ring-2
}
```

### 3. Dual Pricing Reconciliation Contract (`packages/shared/src/pricing.ts` & `apps/pos`)
```typescript
export interface DualPricingResult {
  cashAmountCents: number;
  cardAmountCents: number;
  cashDiscountPercentage: number;
  discountCents: number;
  activeTenderMode: 'cash' | 'card';
}
```

### 4. KDS Ticket Aging & Pacing Engine (`apps/kds/src/types/pacing.ts`)
```typescript
export type TicketAgingTier = 'fresh' | 'warning' | 'critical'; // fresh < 10m, warning 10-20m, critical > 20m
export interface TicketAgingState {
  elapsedSeconds: number;
  tier: TicketAgingTier;
  borderPulseClass: string; // border-emerald-500, border-amber-500, border-crimson-500 animate-pulse
  waitFormatted: string; // e.g. "08:14"
}
```

### 5. Mobile Floor Manager Quick Action Sheet (`apps/admin` & `packages/ui`)
```typescript
export interface MobileQuickActionPayload {
  action: 'toggle_86' | 'manager_alert' | 'kick_drawer' | 'log_waste';
  payload?: Record<string, unknown>;
  managerPin?: string;
}
```

## Code Layout
```
packages/
  ui/
    src/
      culinary-theme.css     # OKLCH tokens, dark/light theme definitions, border/radius standards
      tailwind.preset.js     # Color bindings without invalid hsl wrappers
      components/
        Button.tsx           # 6-state button engine (48px touch target safety)
        Card.tsx             # rounded-2xl cards with 1px subtle borders
        Table.tsx            # Sticky header, zebra striping, dense table primitives
        FloorMap3D.tsx       # 3D floor map with touch/pinch camera orbit controls
        KeypadModal.tsx      # 48px tactile numeric keypad for tips and split check
        BumpButton.tsx       # 64-80px tactile kitchen bump button
        Spinner.tsx          # Centered fixed-layout loading spinner
apps/
  pos/src/
    views/
      MenuView.tsx           # Tactile micro-springs on item cards & seat chips
      OrderView.tsx          # 48px touch target compliance on all triggers
      CheckoutView.tsx       # Interactive Dual-Pricing toggle & Keypad modals
    components/
      StickyCartDrawer.tsx   # Sticky bottom thumb-zone cart & drawer (<1024px)
  kds/src/
    components/
      TicketCard.tsx         # OKLCH >=5:1 contrast, aging border pulses (<10m/<20m/>20m)
      PacingAlertBar.tsx     # 64px prominent fire triggers & live ticking wait counters
  admin/src/
    App.tsx                  # CompactNavigation restoration for navigation.test.ts
    pages/
      Staff.tsx              # Sticky header, zebra hover, keyboard focus table
      FloorPlanPage.tsx      # 3D FloorMap integration with right property drawer
    components/
      MobileQuickActionsSheet.tsx # Native swipe-down bottom sheet (vaul)
  ops/src/
    pages/
      FoodCostPage.tsx       # Dense sticky zebra data table
      WastePage.tsx          # 48px touch targets on waste logs
tests/
  e2e/
    ui-ergonomics.test.ts    # 4-tier opaque-box test suite for UI/UX & ergonomics
```
