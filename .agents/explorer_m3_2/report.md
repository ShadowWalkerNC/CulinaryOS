# Milestone 3 Analysis Report: UI Design Tokens & Admin Portal Modernization

**Explorer**: Explorer 2 (`explorer_m3_2`)  
**Parent Orchestrator**: `08684e4e-f6b9-47ef-a543-8f435ce4fd4f`  
**Date**: 2026-08-16  
**Scope**: `apps/admin/src/pages/Menu.tsx`, `apps/admin/src/pages/Staff.tsx`, `apps/admin/src/App.tsx`, `apps/admin/src/main.tsx`, and `packages/ui` components (`CulinaryHeader`, `CulinaryButton`, `CulinaryCard`, `CulinaryBadge`, `culinary-theme.css`).

---

## Executive Summary

This investigation analyzed the UI implementation of `apps/admin` (Back-Office Admin portal) against the design system in `@culinaryos/ui` and the established patterns in `apps/pos` and `apps/kds`. 

### Key Findings
1. **Critical Design & Component Inconsistency in `apps/admin`**:
   - `Menu.tsx` and `Staff.tsx` rely entirely on raw inline styles (`style={{ ... }}`), unstyled HTML tables/lists, arbitrary hex colors (`#64748b`, `#0f172a`, `#cbd5e1`, `#f8fafc`), and raw text `<nav>` links.
   - Neither `Menu.tsx` nor `Staff.tsx` imports or uses `@culinaryos/ui` components (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`).
   - `Pantry.tsx` imports `CulinaryHeader`, but `main.tsx` wraps it with an additional raw `<nav>` (`PantryWithNav`), resulting in duplicate and conflicting navigation hierarchies.
2. **Missing Build Infrastructure for Tailwind CSS in `apps/admin`**:
   - `apps/admin` lacks `tailwind.config.js`, `postcss.config.js`, and `src/index.css`.
   - Because `@culinaryos/ui` components utilize Tailwind utility classes (`bg-white`, `border-[#e5e7eb]`, `rounded-2xl`, etc.), `apps/admin` requires Tailwind compilation to render `@culinaryos/ui` primitives correctly.
3. **Lack of a Unified Admin Shell (`App.tsx` / `AdminLayout`)**:
   - Unlike `apps/pos` (which uses a master `App.tsx` with `CulinaryHeader` and sub-navigation), `apps/admin` defines routes directly in `main.tsx` with fragmented per-page `<nav>` elements.

---

## 1. Existing Code Audit: `Menu.tsx`, `Staff.tsx`, and `main.tsx`

### A. `apps/admin/src/pages/Menu.tsx`
- **Root & Layout**:
  - Raw inline styles: `style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}` (line 54).
  - No master `CulinaryHeader` mounted.
- **Navigation**:
  - Raw `<nav>` element with inline flex styling (lines 55–59):
    ```tsx
    <nav style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14, fontWeight: 700 }}>
      <Link to="/menu">Menu</Link>
      <Link to="/staff">Staff</Link>
      <Link to="/pantry">Pantry</Link>
    </nav>
    ```
- **Typography & Headers**:
  - Unstyled `<h1>`: `style={{ fontSize: 28, marginBottom: 8 }}` (line 60).
  - Raw paragraph: `style={{ color: '#64748b', marginBottom: 16 }}` (lines 61–63).
- **Cards & Structure**:
  - No `CulinaryCard` container; the table sits uncontained on the page.
- **Table & Data Rows**:
  - Unstyled HTML table: `style={{ width: '100%', borderCollapse: 'collapse' }}` (line 68).
  - Raw borders and paddings: `style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}` (line 70).
  - Raw table cells with inline styles: `style={{ padding: 8 }}` (lines 71, 81), `style={{ fontSize: 12, color: '#64748b' }}` (line 84).
- **Status & Actions**:
  - Status is plain unstyled text: `<td>{item.status}</td>` (line 89) instead of `CulinaryBadge`.
  - Ad-hoc button with 8 lines of inline styles (lines 91–107):
    ```tsx
    <button
      type="button"
      onClick={() => void toggleStatus(item)}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        border: '1px solid #cbd5e1',
        background: item.status === 'available' ? '#0f172a' : '#f8fafc',
        color: item.status === 'available' ? '#fff' : '#0f172a',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {item.status === 'available' ? '86 item' : 'Make available'}
    </button>
    ```

### B. `apps/admin/src/pages/Staff.tsx`
- **Root & Layout**:
  - Raw inline styles: `style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}` (line 57).
  - No master `CulinaryHeader` mounted.
- **Navigation**:
  - Duplicate raw `<nav>` identical to `Menu.tsx` (lines 58–62).
- **Typography & Headers**:
  - `style={{ fontSize: 28, marginBottom: 8 }}` (line 63) and `style={{ fontSize: 18 }}` (line 94).
- **Cards & Staff Listing**:
  - Raw `<ul>` and `<li>` with inline styles:
    ```tsx
    <li
      key={s.user_id ?? i}
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <span><strong>{s.display_name}</strong> · {s.role}</span>
      <span style={{ color: '#64748b', fontSize: 13 }}>
        {s.has_pin === false ? 'no PIN' : s.active === false ? 'inactive' : 'active'}
      </span>
    </li>
    ```
  - Status is plain text string instead of `CulinaryBadge`.
  - No `CulinaryCard` grouping the directory.
- **Form & Input Controls**:
  - Raw `<form style={{ display: 'grid', gap: 12, maxWidth: 420 }}>` (line 95).
  - Raw `<input>` elements with `style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}` (lines 101, 108, 127).
  - Raw `<select>` element with `style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}` (line 113).
  - Raw submit button with inline styles (lines 129–142):
    ```tsx
    <button
      type="submit"
      style={{
        padding: 12,
        borderRadius: 8,
        border: 'none',
        background: '#0f172a',
        color: '#fff',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Create staff
    </button>
    ```

### C. `apps/admin/src/main.tsx`
- Contains `PantryWithNav` (lines 8–29) which injects an inline `<nav>` above `PantryPage()`.
- `PantryPage()` already renders `<CulinaryHeader activeModule="admin" ... />`, leading to double headers and broken visual hierarchy.
- No shared layout container or route shell.

---

## 2. `@culinaryos/ui` Component Definitions & Exports

The `@culinaryos/ui` package (`packages/ui/src/index.ts`) provides four primary components and a design token stylesheet (`culinary-theme.css`):

| Component | Props Interface | Key Variants & Sizes | Rendered Structure |
|---|---|---|---|
| **`CulinaryHeader`** | `activeModule: 'pos' \| 'kds' \| 'web' \| 'admin' \| 'kitchenkit'`<br/>`tenantName?: string`<br/>`serverStatus?: 'connected' \| 'offline'` | Master navigation bar | Deep Navy brand logo (`#0f172a`), 5 module tabs with port indicators (`:5172`, `:5173`, `:5176`, `:5174`, `:5175`), LAN Status & "MCP Ready" indicator pill. |
| **`CulinaryButton`** | `variant?: 'primary' \| 'secondary' \| 'outline' \| 'danger' \| 'ghost'`<br/>`size?: 'sm' \| 'md' \| 'lg'`<br/>`...ButtonHTMLAttributes` | `primary`: Deep Navy `#0f172a`<br/>`secondary`: Charcoal `#1f2937`<br/>`outline`: White/Border `#e5e7eb`<br/>`danger`: Red `#ef4444`<br/>`ghost`: Transparent | `font-black uppercase tracking-wider rounded-xl transition-all active:scale-98 disabled:opacity-50` |
| **`CulinaryCard`** | `title?: string`<br/>`subtitle?: string`<br/>`headerAction?: React.ReactNode`<br/>`className?: string`<br/>`children: React.ReactNode` | Standard card container | `bg-white border border-[#e5e7eb] rounded-2xl shadow-xs p-5` with optional divider header. |
| **`CulinaryBadge`** | `variant?: 'brand' \| 'success' \| 'warning' \| 'danger' \| 'neutral'`<br/>`className?: string`<br/>`children: React.ReactNode` | `brand`: Navy tint `#0f172a0d`<br/>`success`: Green `#22c55e15`<br/>`warning`: Amber `#f59e0b15`<br/>`danger`: Red `#fef2f2`<br/>`neutral`: Gray `#f3f4f6` | `inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border` |

---

## 3. Recommended Modern UI Architecture & Component Replacements

### A. Admin Layout Architecture (`App.tsx` & `main.tsx`)
Create a persistent layout shell (`apps/admin/src/App.tsx` or `AdminLayout`) that mounts:
1. `CulinaryHeader` with `activeModule="admin"` and `tenantName="CulinaryOS Back-Office Admin"`.
2. Admin Sub-Navigation bar with active tab indicators for:
   - **Menu Editor** (`/menu`)
   - **Staff & Access** (`/staff`)
   - **Pantry & Inventory** (`/pantry`)
3. A central page workspace with `bg-[#f8f9fa] min-h-[calc(100vh-120px)] p-6 md:p-8 font-sans`.

```tsx
// Proposed apps/admin/src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';
import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';
import { PantryPage } from './pages/Pantry';

export function App() {
  const adminNav = [
    { to: '/menu', label: 'Menu Editor', icon: 'restaurant_menu' },
    { to: '/staff', label: 'Staff & PINs', icon: 'badge' },
    { to: '/pantry', label: 'Pantry & Inventory', icon: 'inventory_2' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col antialiased">
      {/* Universal CulinaryOS Master Header */}
      <CulinaryHeader activeModule="admin" tenantName="CulinaryOS Back-Office Admin" />

      {/* Admin Sub-Navigation Bar */}
      <header className="bg-white border-b border-[#e5e7eb] px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#0f172a]">admin_panel_settings</span>
            <span className="font-black text-xs tracking-wider text-[#0b1c30] uppercase">Back-Office Admin</span>
          </div>
          <span className="text-[#e5e7eb]">|</span>
          <nav className="flex items-center gap-1 bg-[#f8f9fa] border border-[#e5e7eb] p-1 rounded-xl">
            {adminNav.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-[#0f172a] shadow-xs border border-[#e5e7eb]'
                      : 'text-[#6b7280] hover:text-[#0b1c30] hover:bg-[#e5e7eb50]'
                  }`
                }
              >
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Workspace Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <Routes>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </main>
    </div>
  );
}
```

---

### B. Modernized `apps/admin/src/pages/Menu.tsx`

#### Key Transformations:
1. **Remove** raw inline styled `<nav>` and raw inline container `<div>`.
2. **Mount** `CulinaryCard` to encapsulate the menu catalog.
3. **Use `CulinaryBadge`** for station routing (e.g. `GRILL`, `COLD`, `FRY`, `EXPO`) and item status (`AVAILABLE` in `success` variant, `86'D` in `danger` variant).
4. **Use `CulinaryButton`** (`size="sm"`) for status toggling (`variant="danger"` for 86ing, `variant="primary"` for making available).
5. **Modern Table Styling**: Use semantic Tailwind table styling with clear headers, hover rows, and formatted currency.

#### Proposed Code Structure:
```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { CulinaryCard, CulinaryButton, CulinaryBadge } from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  status: string;
  station: string;
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/admin/menu/items`, { headers: apiHeaders() });
      const body = await res.json();
      if (body.ok) setItems(body.data?.items ?? []);
    } catch {
      setMsg({ text: 'Failed to load menu items from API', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(item: MenuItem) {
    const next = item.status === 'available' ? '86' : 'available';
    try {
      const res = await fetch(`${API}/v1/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Update failed', type: 'error' });
        return;
      }
      setMsg({ text: `${item.name} status updated to ${next === '86' ? '86 (Unavailable)' : 'Available'}`, type: 'success' });
      void load();
    } catch {
      setMsg({ text: 'Network error updating item status', type: 'error' });
    }
  }

  const availableCount = items.filter(i => i.status === 'available').length;
  const eightySixCount = items.filter(i => i.status === '86').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0b1c30] uppercase tracking-wider">Menu Catalog & 86 Editor</h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Manage station routing, item pricing, and live 86 availability across POS and Web Store surfaces.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CulinaryBadge variant="success">{availableCount} Available</CulinaryBadge>
          {eightySixCount > 0 && <CulinaryBadge variant="danger">{eightySixCount} 86'd</CulinaryBadge>}
          <CulinaryButton variant="outline" size="sm" onClick={() => void load()}>
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh
          </CulinaryButton>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          msg.type === 'success' ? 'bg-[#22c55e10] border-[#22c55e30] text-[#16a34a]' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Menu Table Card */}
      <CulinaryCard
        title="Active Menu Items"
        subtitle={`Showing ${items.length} total catalog items`}
      >
        {loading ? (
          <div className="py-12 text-center text-xs text-[#6b7280] font-medium">
            Loading menu items…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                  <th className="pb-3 px-3">Item Details</th>
                  <th className="pb-3 px-3">Price</th>
                  <th className="pb-3 px-3">Station</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6] text-xs">
                {items.map((item) => {
                  const isAvailable = item.status === 'available';
                  return (
                    <tr key={item.id} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#0b1c30]">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#6b7280] mt-0.5 max-w-md">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-[#0f172a]">
                        {dollars(item.price)}
                      </td>
                      <td className="py-3.5 px-3">
                        <CulinaryBadge variant="brand">
                          {item.station || 'EXPO'}
                        </CulinaryBadge>
                      </td>
                      <td className="py-3.5 px-3">
                        <CulinaryBadge variant={isAvailable ? 'success' : 'danger'}>
                          {isAvailable ? 'AVAILABLE' : "86'D"}
                        </CulinaryBadge>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <CulinaryButton
                          type="button"
                          variant={isAvailable ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => void toggleStatus(item)}
                        >
                          {isAvailable ? '86 Item' : 'Make Available'}
                        </CulinaryButton>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[#6b7280]">
                      No menu items found. Run <code className="font-mono bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#0f172a]">pnpm seed</code> against Supabase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CulinaryCard>
    </div>
  );
}
```

---

### C. Modernized `apps/admin/src/pages/Staff.tsx`

#### Key Transformations:
1. **Remove** raw inline styled `<nav>`, raw styled form inputs, and uncontained lists.
2. **2-Column Responsive Layout**:
   - **Left Column (2/3 width)**: `CulinaryCard` with `Staff Directory` table/list displaying Display Name, Role Badge, PIN Status Badge, and Active Status Badge.
   - **Right Column (1/3 width)**: `CulinaryCard` containing the `Add Staff Member` form with standardized form controls and `CulinaryButton`.
3. **Use `CulinaryBadge`** for:
   - Role: `<CulinaryBadge variant="brand">{s.role.toUpperCase()}</CulinaryBadge>`
   - PIN state: `<CulinaryBadge variant={s.has_pin !== false ? "success" : "warning"}>{s.has_pin !== false ? "PIN ACTIVE" : "NO PIN"}</CulinaryBadge>`
   - Active state: `<CulinaryBadge variant={s.active !== false ? "neutral" : "danger"}>{s.active !== false ? "ACTIVE" : "INACTIVE"}</CulinaryBadge>`
4. **Use `CulinaryButton`** (`variant="primary"`, `size="md"`) for form submission.

#### Proposed Code Structure:
```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { CulinaryCard, CulinaryButton, CulinaryBadge } from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface StaffRow {
  user_id?: string;
  display_name: string;
  role: string;
  active?: boolean;
  has_pin?: boolean;
}

export function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'server',
    pin: '',
  });
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/admin/staff`, { headers: apiHeaders() });
      const body = await res.json();
      if (body.ok) setStaff(body.data?.staff ?? []);
    } catch {
      setMsg({ text: 'Failed to load staff list from API', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/v1/admin/staff`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Staff creation failed', type: 'error' });
        return;
      }
      setMsg({ text: `Successfully provisioned staff member: ${body.data.display_name}`, type: 'success' });
      setForm({ email: '', display_name: '', role: 'server', pin: '' });
      void load();
    } catch {
      setMsg({ text: 'Network error creating staff member', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0b1c30] uppercase tracking-wider">Staff & Access Control</h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Manage restaurant personnel, role authorizations, and terminal PIN credentials (<code className="font-mono bg-[#f3f4f6] px-1 py-0.5 rounded text-[#0f172a]">staff_pins</code>).
          </p>
        </div>
        <CulinaryBadge variant="brand">{staff.length} Team Members</CulinaryBadge>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          msg.type === 'success' ? 'bg-[#22c55e10] border-[#22c55e30] text-[#16a34a]' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Staff Directory (2 cols) */}
        <div className="lg:col-span-2">
          <CulinaryCard
            title="Team Members Directory"
            subtitle="Personnel with POS and KDS terminal authorizations"
          >
            {loading ? (
              <div className="py-12 text-center text-xs text-[#6b7280] font-medium">
                Loading staff records…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                      <th className="pb-3 px-3">Name & Role</th>
                      <th className="pb-3 px-3">Role Level</th>
                      <th className="pb-3 px-3">PIN Status</th>
                      <th className="pb-3 px-3 text-right">Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6] text-xs">
                    {staff.map((s, i) => (
                      <tr key={s.user_id ?? i} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-[#0b1c30]">{s.display_name}</div>
                          {s.user_id && <div className="text-[10px] font-mono text-[#9ca3af]">{s.user_id}</div>}
                        </td>
                        <td className="py-3.5 px-3">
                          <CulinaryBadge variant="brand">{s.role.toUpperCase()}</CulinaryBadge>
                        </td>
                        <td className="py-3.5 px-3">
                          <CulinaryBadge variant={s.has_pin !== false ? 'success' : 'warning'}>
                            {s.has_pin !== false ? 'PIN ACTIVE' : 'NO PIN'}
                          </CulinaryBadge>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <CulinaryBadge variant={s.active !== false ? 'neutral' : 'danger'}>
                            {s.active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </CulinaryBadge>
                        </td>
                      </tr>
                    ))}
                    {!staff.length && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-[#6b7280]">
                          No staff found. Use the form to provision team members.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CulinaryCard>
        </div>

        {/* Right Column: Add Staff Form (1 col) */}
        <div>
          <CulinaryCard
            title="Add Staff Member"
            subtitle="Provision email, role, and terminal PIN"
          >
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="employee@restaurant.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Chef"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Assigned Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white font-medium capitalize"
                >
                  <option value="server">Server (Terminal POS)</option>
                  <option value="chef">Chef (Kitchen KDS)</option>
                  <option value="manager">Manager (Admin & Voids)</option>
                  <option value="owner">Owner (Full Access)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Terminal PIN (4–8 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  pattern="\d{4,8}"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  required
                  className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white"
                />
                <p className="text-[10px] text-[#9ca3af] mt-1 font-medium">Used for quick POS/KDS login.</p>
              </div>

              <CulinaryButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                disabled={submitting}
              >
                {submitting ? 'Provisioning…' : 'Create Staff Member'}
              </CulinaryButton>
            </form>
          </CulinaryCard>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Build Configuration Recommendations

To ensure `@culinaryos/ui` components and Tailwind classes compile properly in `apps/admin`:

1. **`apps/admin/package.json`**:
   - Add `tailwindcss: "^3.4.0"`, `postcss: "^8.4.38"`, `autoprefixer: "^10.4.19"` to `devDependencies`.
2. **`apps/admin/tailwind.config.js`**:
   ```javascript
   /** @type {import('tailwindcss').Config} */
   export default {
     content: [
       "./index.html",
       "./src/**/*.{js,ts,jsx,tsx}",
       "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
     ],
     theme: {
       extend: {
         colors: {
           brand: '#0f172a',
           brandHover: '#1e293b',
         },
         fontFamily: {
           sans: ['Inter', 'system-ui', 'sans-serif'],
           mono: ['JetBrains Mono', 'monospace'],
         },
       },
     },
     plugins: [],
   }
   ```
3. **`apps/admin/postcss.config.js`**:
   ```javascript
   export default {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```
4. **`apps/admin/src/index.css`**:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   body {
     background: #f8f9fa;
     color: #1f2937;
     font-family: 'Inter', system-ui, sans-serif;
     margin: 0;
   }
   ```
5. **`apps/admin/index.html`**:
   - Include Google Fonts link for `Inter`, `JetBrains Mono`, and `Material Symbols Outlined`.

---

## 5. Verification Checklist

1. [ ] `apps/admin/tailwind.config.js` and `postcss.config.js` created and configured.
2. [ ] `apps/admin/src/index.css` created and imported in `main.tsx`.
3. [ ] `apps/admin/src/App.tsx` created mounting `CulinaryHeader` and sub-navigation tabs.
4. [ ] `apps/admin/src/pages/Menu.tsx` refactored with `CulinaryCard`, `CulinaryBadge`, `CulinaryButton`.
5. [ ] `apps/admin/src/pages/Staff.tsx` refactored with `CulinaryCard`, `CulinaryBadge`, `CulinaryButton`.
6. [ ] Zero raw inline styles or uncontained `<nav>` elements in `apps/admin`.
7. [ ] Run `pnpm --filter @culinaryos/admin typecheck` and `pnpm --filter @culinaryos/admin build`.
