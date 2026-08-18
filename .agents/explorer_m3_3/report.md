# Milestone 3 UI Design Tokens & Cross-Surface Consistency Investigation

**Author**: Explorer 3 (Milestone 3)  
**Date**: 2026-08-16T01:25:30Z  
**Scope**: UI Design Tokens, Tailwind Configurations, and Styling Consistency across `@culinaryos/ui`, POS (:5172), KDS (:5173), Admin (:5174), and Web (:5176).

---

## Executive Summary

This investigation analyzed the design tokens, Tailwind CSS / PostCSS configurations, component primitives, and visual styling across all 4 frontend applications (`apps/pos`, `apps/kds`, `apps/admin`, `apps/web`) and the shared design system package (`packages/ui`).

**Key Takeaways**:
1. **`packages/ui`**: Contains a rich CSS variable specification in `culinary-theme.css` and 4 React primitives (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`), but **lacks an exported Tailwind preset**.
2. **`apps/admin`**: Has **no Tailwind or PostCSS configuration**, lacks `tailwindcss` devDependencies, and has fragmented pages (`Menu.tsx` and `Staff.tsx` have no `CulinaryHeader` and use raw inline styles, while `Pantry.tsx` uses legacy dark/purple styles).
3. **`apps/pos`**: Configured with Tailwind, but views rely heavily on **hardcoded arbitrary hex classes** (`bg-[#0f172a]`, `bg-[#f8f9fa]`, `text-[#1f2937]`, `border-[#e5e7eb]`, `text-[#6b7280]`) rather than shared semantic utility tokens.
4. **`apps/kds`**: Correctly implements a dark kitchen theme (`--bg: #0b1220`) with `corePlugins: { preflight: false }` to support `CulinaryHeader` without breaking dark mode.
5. **`apps/web`**: Lacks Tailwind setup while rendering `CulinaryHeader`, leading to unstyled Tailwind utility classes on the header.
6. **Typecheck & Build**: `turbo run typecheck` (18 packages) and `turbo run build` (12 packages) pass cleanly with 0 errors.

---

## 1. Design Token Audit (`packages/ui`)

### 1.1 CSS Variables in `packages/ui/src/culinary-theme.css`

The core design system is based on the "Corporate Modern" aesthetic (Deep Navy brand `#0f172a`, crisp borders, 4px grid, Inter + JetBrains Mono typography).

| Category | CSS Variable | Value | Purpose |
|---|---|---|---|
| **Brand** | `--cos-brand` | `#0f172a` | Primary brand color (Deep Navy / Slate 900) |
| | `--cos-brand-soft` | `rgba(15, 23, 42, 0.06)` | Brand tinted background for badges/tags |
| | `--cos-brand-border` | `rgba(15, 23, 42, 0.18)` | Brand tinted border |
| **Surfaces** | `--cos-bg` | `#f8f9fa` | Page canvas background |
| | `--cos-surface` | `#ffffff` | Primary container / card surface |
| | `--cos-surface-2` | `#f1f3f5` | Elevated / secondary surface |
| | `--cos-surface-hover` | `#f8f9fa` | Interactive hover surface |
| **Borders** | `--cos-border` | `#e5e7eb` | Default border (Gray 200) |
| | `--cos-border-strong` | `#d1d5db` | Emphasized border (Gray 300) |
| **Typography** | `--cos-text` | `#1f2937` | Primary body text (Gray 800) |
| | `--cos-text-muted` | `#6b7280` | Secondary / subtext (Gray 500) |
| | `--cos-text-dim` | `#9ca3af` | Tertiary / placeholder (Gray 400) |
| | `--cos-font-sans` | `'Inter', system-ui, -apple-system, sans-serif` | Primary UI typeface |
| | `--cos-font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | Numbers, ports, identifiers |
| **Status** | `--cos-green` | `#16a34a` | Success status (Green 600) |
| | `--cos-green-soft` | `rgba(22, 163, 74, 0.08)` | Success background |
| | `--cos-amber` | `#d97706` | Warning status (Amber 600) |
| | `--cos-amber-soft` | `rgba(217, 119, 6, 0.08)` | Warning background |
| | `--cos-red` | `#dc2626` | Danger / error status (Red 600) |
| | `--cos-red-soft` | `rgba(220, 38, 38, 0.08)` | Danger background |
| | `--cos-blue` | `#2563eb` | Info / active status (Blue 600) |
| | `--cos-blue-soft` | `rgba(37, 99, 235, 0.08)` | Info background |
| **Elevation** | `--cos-shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Micro elevation |
| | `--cos-shadow-sm` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` | Card resting elevation |
| | `--cos-shadow-md` | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)` | Dropdown / flyout elevation |
| | `--cos-shadow-lg` | `0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)` | Modal / dialog elevation |
| **Radius** | `--cos-radius-sm` | `4px` | Small pills / inputs |
| | `--cos-radius-md` | `6px` | Buttons / badges |
| | `--cos-radius-lg` | `8px` | Cards |
| | `--cos-radius-xl` | `12px` | Panels |
| | `--cos-radius-full` | `9999px` | Fully rounded pills / FABs |

### 1.2 Shared Primitives in `@culinaryos/ui`

1. **`CulinaryHeader`** (`CulinaryHeader.tsx`):
   - Props: `activeModule: 'pos' | 'kds' | 'web' | 'admin' | 'kitchenkit'`, `tenantName?`, `serverStatus?`
   - Features: Wordmark with skillet icon, cross-module navigation bar (`:5172`, `:5173`, `:5176`, `:5174`, `:5175`), LAN connected pulse dot, MCP status indicator.
2. **`CulinaryCard`** (`CulinaryCard.tsx`):
   - Props: `title?`, `subtitle?`, `headerAction?`, `children`, `className?`
   - Features: Standardized container with subtle border (`#e5e7eb`), rounded corners (`rounded-2xl`), and optional header action slot.
3. **`CulinaryButton`** (`CulinaryButton.tsx`):
   - Props: `variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'`, `size?: 'sm' | 'md' | 'lg'`, `className?`
   - Features: Standardized typography (`font-black uppercase tracking-wider`), active press state (`active:scale-98`), consistent padding and borders.
4. **`CulinaryBadge`** (`CulinaryBadge.tsx`):
   - Props: `variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'`, `children`, `className?`
   - Features: Compact uppercase badge pill with variant backgrounds and border highlights.

---

## 2. Frontend Surface Configuration & Styling Analysis

| App | Surface & Port | Tailwind Config | PostCSS Config | Uses `@culinaryos/ui` | Styling Strategy | Identified Gaps |
|---|---|---|---|---|---|---|
| **`apps/pos`** | POS Terminal (`:5172`) | ✅ Yes (`tailwind.config.js`) | ✅ Yes (`postcss.config.js`) | ✅ Partial (`CulinaryHeader`) | Tailwind + Arbitrary Hex | Minimal Tailwind theme (`brand`, `brandHover`). Hundreds of raw hex classes (`bg-[#f8f9fa]`, `text-[#1f2937]`). Body background mismatch (`#f8f9ff` vs `#f8f9fa`). |
| **`apps/kds`** | Kitchen Display (`:5173`) | ✅ Yes (`tailwind.config.js`, `preflight: false`) | ✅ Yes (`postcss.config.js`) | ✅ Partial (`CulinaryHeader`) | Dark CSS Custom Properties + Tailwind Utilities | Dark kitchen theme (`#0b1220`) is well-isolated. Uses inline styles for tickets and Tailwind for header. |
| **`apps/admin`** | Back Office Admin (`:5174`) | ❌ **Missing** | ❌ **Missing** | ❌ Fragmented | Mixed (Light inline styles in Menu/Staff, dark inline styles in Pantry) | Missing Tailwind build setup. `Menu.tsx` & `Staff.tsx` lack `CulinaryHeader` and use raw `nav`. `Pantry.tsx` uses legacy RecipeOS `#7c6aff` purple accents and `#1a1d27` dark cards. |
| **`apps/web`** | Online Store (`:5176`) | ❌ **Missing** | ❌ **Missing** | ✅ Partial (`CulinaryHeader`) | Custom CSS Variables | Renders `CulinaryHeader` without Tailwind processor. Brand color diverges (`--accent: #ff5f1f`). Missing fonts in `<head>`. |

---

## 3. Cross-Surface Token Misalignments & Gaps

### Gap 1: Missing Shared Tailwind Preset
- **Issue**: `packages/ui` does not export a Tailwind preset (`tailwind.preset.js`).
- **Consequence**: `apps/pos` and `apps/kds` redefine identical partial themes (`brand: '#0f172a'`), while `apps/admin` and `apps/web` have no Tailwind configuration.
- **Remedy**: Create and export `tailwind.preset.js` from `packages/ui` exposing all `--cos-*` color, font, radius, and shadow tokens.

### Gap 2: `apps/admin` Build & Layout Fragmentation
- **Issue**: `apps/admin` does not have `tailwindcss`, `postcss`, `autoprefixer` in `devDependencies`, lacks `tailwind.config.js`/`postcss.config.js`, and has no `index.css`.
- **Issue**: `Menu.tsx` and `Staff.tsx` mount custom inline `<nav>` bars and raw HTML controls rather than `CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, and `CulinaryBadge`.
- **Issue**: `Pantry.tsx` contains dark `#1a1d27` / `#2e3150` card borders and `#7c6aff` purple buttons leftover from legacy RecipeOS.
- **Remedy**: Add Tailwind devDependencies and config files to `apps/admin`, import `index.css`, and modernize `Menu.tsx`, `Staff.tsx`, and `Pantry.tsx` using `@culinaryos/ui` components.

### Gap 3: `apps/pos` Arbitrary Hex Overuse
- **Issue**: Over 100 instances of hardcoded arbitrary hex classes (`bg-[#0f172a]`, `bg-[#f8f9fa]`, `text-[#1f2937]`, `border-[#e5e7eb]`, `text-[#6b7280]`) in `apps/pos/src/views/*`.
- **Remedy**: Extend Tailwind theme via the shared preset so semantic classes (`bg-brand`, `bg-canvas`, `text-primary`, `border-border`) can be used cleanly.

### Gap 4: `apps/web` Header Styling & Color Inconsistency
- **Issue**: `apps/web` renders `CulinaryHeader` (which contains Tailwind utility classes) without a Tailwind compiler.
- **Issue**: `apps/web` uses `--accent: #ff5f1f` and purple FAB shadows (`rgba(124, 106, 255, 0.45)`).
- **Remedy**: Ensure `CulinaryHeader` styles are fully rendered and align theme variables with the `@culinaryos/ui` token palette.

---

## 4. Build & Static Analysis Verification

```bash
# Typecheck command verification
pnpm run typecheck
# Output:
# Tasks: 18 successful, 18 total
# Time: 228ms >>> FULL TURBO

# Monorepo build command verification
pnpm turbo run build
# Output:
# Tasks: 12 successful, 12 total
# Time: 1m35s
```

All 18 workspace packages compile with 0 TypeScript errors and all bundles build successfully.

---

## 5. Implementation Roadmap for Milestone 3

### Step 1: Export Shared Tailwind Preset from `packages/ui`
1. Create `packages/ui/tailwind.preset.js`:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     theme: {
       extend: {
         colors: {
           brand: {
             DEFAULT: '#0f172a',
             hover: '#1e293b',
             soft: 'rgba(15, 23, 42, 0.06)',
             border: 'rgba(15, 23, 42, 0.18)',
           },
           canvas: '#f8f9fa',
           surface: '#ffffff',
           'surface-2': '#f1f3f5',
           border: {
             DEFAULT: '#e5e7eb',
             strong: '#d1d5db',
           },
           content: {
             DEFAULT: '#1f2937',
             muted: '#6b7280',
             dim: '#9ca3af',
           },
           status: {
             green: '#16a34a',
             amber: '#d97706',
             red: '#dc2626',
             blue: '#2563eb',
           },
         },
         fontFamily: {
           sans: ['Inter', 'system-ui', 'sans-serif'],
           mono: ['JetBrains Mono', 'monospace'],
         },
         borderRadius: {
           sm: '4px',
           md: '6px',
           lg: '8px',
           xl: '12px',
         },
       },
     },
     plugins: [],
   };
   ```
2. Update `packages/ui/package.json` to export `./preset`.

### Step 2: Setup Tailwind & PostCSS in `apps/admin`
1. Add `tailwindcss`, `postcss`, `autoprefixer` to `apps/admin/package.json`.
2. Create `apps/admin/tailwind.config.js`:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     presets: [require('../../packages/ui/tailwind.preset.js')],
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
       "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
     ],
   }
   ```
3. Create `apps/admin/postcss.config.js`:
   ```javascript
   export default {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```
4. Create `apps/admin/src/index.css`:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
5. Import `./index.css` in `apps/admin/src/main.tsx`.

### Step 3: Modernize `apps/admin` Pages
1. **`apps/admin/src/main.tsx`**: Remove `PantryWithNav` and custom inline `<nav>`, letting each page mount `<CulinaryHeader activeModule="admin" />`.
2. **`apps/admin/src/pages/Menu.tsx`**:
   - Mount `<CulinaryHeader activeModule="admin" tenantName="CulinaryOS Back-Office Admin" />`.
   - Wrap menu table in `<CulinaryCard title="Menu Items" subtitle="Toggle availability (86) without SQL">`.
   - Replace raw toggle buttons with `<CulinaryButton variant={item.status === 'available' ? 'primary' : 'outline'} size="sm">`.
   - Replace raw text with `<CulinaryBadge variant={item.status === 'available' ? 'success' : 'danger'}>`.
3. **`apps/admin/src/pages/Staff.tsx`**:
   - Mount `<CulinaryHeader activeModule="admin" tenantName="CulinaryOS Back-Office Admin" />`.
   - Wrap staff roster in `<CulinaryCard title="Staff Members" subtitle="PIN-enabled staff roster">`.
   - Wrap add staff form in `<CulinaryCard title="Add New Staff" subtitle="Create server/chef/manager credentials">`.
   - Replace raw form submit button with `<CulinaryButton variant="primary">Create Staff</CulinaryButton>`.
4. **`apps/admin/src/pages/Pantry.tsx`**:
   - Modernize PO cards: replace `#1a1d27` / `#2e3150` with `<CulinaryCard>` light theme.
   - Replace `#7c6aff` with Corporate Modern `brand` / `primary` styling.

### Step 4: Verification
1. Run `pnpm run typecheck` to confirm 18/18 packages pass.
2. Run `pnpm turbo run build` to confirm all 12 package builds succeed.
3. Validate visual layout across all 4 ports (`:5172`, `:5173`, `:5174`, `:5176`).
