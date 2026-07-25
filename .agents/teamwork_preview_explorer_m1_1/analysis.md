# M1 Design System & Central Hub Analysis Report

## Executive Summary
This report presents a read-only investigation of Requirement R1 (Master Design System & Central Hub Integration) for CulinaryOS and KitchenKit. The codebase features a shared UI package `@culinaryos/ui` (`packages/ui`) that implements the core design system components, styled with the primary brand identity palette (Culinary Orange `#ff5f1f` and Slate Surface `#f8f9fa`).

`CulinaryHeader` acts as the cross-application navigation hub, rendering active module highlights and port indicators across POS, KDS, Back-Office Admin, and Web Store. Across CulinaryOS apps (`apps/pos`, `apps/kds`, `apps/admin`, `apps/web`), `CulinaryHeader` is already mounted at root view entry points. For KitchenKit (`c:\Users\User\Documents\KitchenKit`), root mounting in `Layout.tsx` is required to complete cross-application hub coverage.

---

## 1. Master Design System (`packages/ui`) & Styling

The design system is centered in `packages/ui` (`@culinaryos/ui`), exporting primitives from `src/index.ts`.

### Primary Color Tokens & Usage
- **Culinary Orange (`#ff5f1f`)**:
  - **Header Logo**: `bg-[#ff5f1f]` in `CulinaryHeader.tsx:25`
  - **Hub Badge**: `bg-[#ff5f1f15] text-[#ff5f1f] border-[#ff5f1f30]` in `CulinaryHeader.tsx:31`
  - **Active Tab Highlight**: `text-[#ff5f1f]` in `CulinaryHeader.tsx:49`
  - **Active Tab Port Indicator**: `bg-[#ff5f1f15] text-[#ff5f1f]` in `CulinaryHeader.tsx:54`
  - **MCP Status Indicator**: `text-[#ff5f1f]` in `CulinaryHeader.tsx:68`
  - **Button Primary Variant**: `bg-[#ff5f1f] hover:bg-[#e04f1a] text-white border-[#ff5f1f]` in `CulinaryButton.tsx:18`
  - **Badge Brand Variant**: `bg-[#ff5f1f15] text-[#ff5f1f] border-[#ff5f1f30]` in `CulinaryBadge.tsx:15`
- **Slate Surface (`#f8f9fa`)**:
  - **Header Navigation Bar Container**: `bg-[#f8f9fa] border border-[#e5e7eb]` in `CulinaryHeader.tsx:40`
  - **Header System Status Box**: `bg-[#f8f9fa]` in `CulinaryHeader.tsx:64`
  - **Button Outline Hover State**: `hover:bg-[#f8f9fa]` in `CulinaryButton.tsx:20`
  - **Root App Backgrounds**: `bg-[#f8f9fa]` in `apps/pos/src/App.tsx:22,32` and `background: '#f8f9fa'` in `apps/admin/src/pages/Pantry.tsx:111`

### Component Inventory (`packages/ui/src`)

| Component | Source File | Key Props | Styling Highlights |
|---|---|---|---|
| `CulinaryHeader` | `packages/ui/src/CulinaryHeader.tsx` | `activeModule`, `tenantName`, `serverStatus` | `#ff5f1f` logo/highlights, `#f8f9fa` surface container, cross-app module links with port indicators (`:5172`, `:5173`, `:5176`, `:5174`) |
| `CulinaryCard` | `packages/ui/src/CulinaryCard.tsx` | `children`, `className`, `title`, `subtitle`, `headerAction` | White card background, `border-[#e5e7eb]`, `rounded-2xl`, `shadow-xs`, styled header with uppercase title |
| `CulinaryButton` | `packages/ui/src/CulinaryButton.tsx` | `variant` (`primary`, `secondary`, `outline`, `danger`, `ghost`), `size` (`sm`, `md`, `lg`) | Uppercase tracking-wider text, active scale effect (`active:scale-98`), `rounded-xl` |
| `CulinaryBadge` | `packages/ui/src/CulinaryBadge.tsx` | `variant` (`brand`, `success`, `warning`, `danger`, `neutral`), `className` | Inline-flex badge, uppercase bold font, subtle background opacity matching border color |

---

## 2. Root Mounting & Hub Integration Matrix

| Target Application | Path | Mounted Component | Active Module Prop | Status |
|---|---|---|---|---|
| **POS Terminal** | `apps/pos/src/App.tsx` | `<CulinaryHeader activeModule="pos" tenantName="CulinaryOps POS Terminal" />` | `"pos"` | ✅ Mounted at root (both Lock screen & Main layout) |
| **KDS Kitchen** | `apps/kds/src/pages/Station.tsx` | `<CulinaryHeader activeModule="kds" tenantName={`KitchenKit — ${activeStationLabel}`} />` | `"kds"` | ✅ Mounted at root station layout |
| **Back Office Admin**| `apps/admin/src/pages/Pantry.tsx` | `<CulinaryHeader activeModule="admin" tenantName="CulinaryOS Back-Office Admin" />` | `"admin"` | ✅ Mounted at root Pantry view |
| **Web Store** | `apps/web/src/pages/MenuPage.tsx` & `OrderStatusPage.tsx` | `<CulinaryHeader activeModule="web" tenantName={...} />` | `"web"` | ✅ Mounted across main customer routes |
| **KitchenKit** | `c:\Users\User\Documents\KitchenKit` | Unmounted (needs mounting in `apps/web/src/components/layout/Layout.tsx`) | `"kitchenkit"` (or `"kds"`) | ⚠️ Missing root mounting in KitchenKit layout |

---

## 3. Active Module Highlights & Port Indicators Verification

### Highlight Logic in `CulinaryHeader.tsx` (Lines 41-59)
```tsx
const modules = [
  { id: 'pos',   label: 'POS Terminal', port: '5172', url: 'http://localhost:5172' },
  { id: 'kds',   label: 'KDS Kitchen',  port: '5173', url: 'http://localhost:5173' },
  { id: 'web',   label: 'Web Store',    port: '5176', url: 'http://localhost:5176' },
  { id: 'admin', label: 'Back Office',  port: '5174', url: 'http://localhost:5174' },
] as const;

{modules.map((m) => {
  const isActive = activeModule === m.id;
  return (
    <a
      key={m.id}
      href={m.url}
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
        isActive
          ? 'bg-white text-[#ff5f1f] shadow-xs border border-[#e5e7eb]'
          : 'text-[#6b7280] hover:text-[#1f2937] hover:bg-[#e5e7eb50]'
      }`}
    >
      <span>{m.label}</span>
      <span className={`text-[8px] px-1 py-0.5 rounded font-mono ${isActive ? 'bg-[#ff5f1f15] text-[#ff5f1f]' : 'bg-[#e5e7eb] text-[#6b7280]'}`}>
        :{m.port}
      </span>
    </a>
  );
})}
```

### Verification Findings:
1. **Active Module Highlight**: When `activeModule` matches `m.id`, the tab changes background to white with Culinary Orange (`#ff5f1f`) text and subtle border.
2. **Port Indicators**: Each navigation pill explicitly displays the module's localhost port (`:5172`, `:5173`, `:5176`, `:5174`) in a monospaced badge.
3. **Active Port Badge**: Active tab port badge uses `#ff5f1f15` background and `#ff5f1f` text. Inactive tabs use `#e5e7eb` background and `#6b7280` text.

---

## 4. Gap Analysis & Proposed Enhancements

### Gap 1: KitchenKit Root Mounting
- **Current State**: KitchenKit at `c:\Users\User\Documents\KitchenKit\apps\web` uses an internal `Topbar.tsx` without `CulinaryHeader`.
- **Recommendation**:
  1. Extend `CulinaryHeaderProps` to support `kitchenkit` module (`port: '5175'`, `url: 'http://localhost:5175'`).
  2. Mount `CulinaryHeader` at the top of `KitchenKit/apps/web/src/components/layout/Layout.tsx`.

### Gap 2: Design Token Exporting
- **Current State**: Colors `#ff5f1f` and `#f8f9fa` are hardcoded in Tailwind arbitrary values (`[#ff5f1f]`).
- **Recommendation**: Export a centralized design token object from `@culinaryos/ui`:
```typescript
// packages/ui/src/tokens.ts
export const CULINARY_THEME = {
  colors: {
    brandOrange: '#ff5f1f',
    slateSurface: '#f8f9fa',
    darkText: '#1f2937',
    mutedText: '#6b7280',
    border: '#e5e7eb',
    success: '#22c55e',
  }
} as const;
```

---

## Proposed Diff Snippet for `CulinaryHeader.tsx` (KitchenKit Module Support)

```tsx
export interface CulinaryHeaderProps {
  activeModule: 'pos' | 'kds' | 'web' | 'admin' | 'kitchenkit';
  tenantName?: string;
  serverStatus?: 'connected' | 'offline';
}

const modules = [
  { id: 'pos',        label: 'POS Terminal',   port: '5172', url: 'http://localhost:5172' },
  { id: 'kds',        label: 'KDS Kitchen',    port: '5173', url: 'http://localhost:5173' },
  { id: 'web',        label: 'Web Store',      port: '5176', url: 'http://localhost:5176' },
  { id: 'admin',      label: 'Back Office',    port: '5174', url: 'http://localhost:5174' },
  { id: 'kitchenkit', label: 'KitchenKit Prep', port: '5175', url: 'http://localhost:5175' },
] as const;
```

---

## Proposed Diff Snippet for KitchenKit `Layout.tsx`

```tsx
// c:\Users\User\Documents\KitchenKit\apps\web\src\components\layout\Layout.tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { CulinaryHeader } from '@culinaryos/ui';

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface">
      <CulinaryHeader activeModule="kitchenkit" tenantName="KitchenKit Prep Hub" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
```
