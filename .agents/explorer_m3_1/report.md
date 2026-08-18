# Investigation Report: Admin Build Configuration & Tailwind Setup

**Agent**: Explorer 1 (Milestone 3: UI Design Tokens & Admin Portal Modernization)  
**Date**: 2026-08-16  
**Target Packages**: `apps/admin`, `packages/ui`  
**Reference Applications**: `apps/pos`, `apps/kds`, `apps/web`

---

## Executive Summary

`apps/admin` is currently built using Vite + React + TypeScript, but it completely lacks Tailwind CSS and PostCSS configuration. Its pages (`Menu.tsx`, `Staff.tsx`, `Pantry.tsx`) currently rely on ad-hoc inline styles or unrendered Tailwind utility classes when importing `@culinaryos/ui` components (such as `CulinaryHeader`).

To modernize `apps/admin` with corporate modern design tokens and ensure seamless rendering of `@culinaryos/ui` components (`CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, `CulinaryBadge`), `apps/admin` requires:
1. Adding `tailwindcss`, `postcss`, and `autoprefixer` to `apps/admin/package.json` devDependencies.
2. Adding `apps/admin/postcss.config.js`.
3. Adding `apps/admin/tailwind.config.js` scanning both `apps/admin/src` and `packages/ui/src`.
4. Adding `apps/admin/src/index.css` with `@tailwind base; @tailwind components; @tailwind utilities;` directives.
5. Importing `./index.css` in `apps/admin/src/main.tsx`.

---

## 1. Investigation Findings

### 1.1 `apps/admin` Configuration State
- **Config Files**:
  - `apps/admin/tailwind.config.js` does **not** exist.
  - `apps/admin/postcss.config.js` does **not** exist.
- **Dependencies (`apps/admin/package.json`)**:
  - Currently declares:
    ```json
    "dependencies": {
      "@culinaryos/config": "workspace:*",
      "@culinaryos/ui": "workspace:*",
      "react": "^18.3.0",
      "react-dom": "^18.3.0",
      "react-router-dom": "^6.23.0",
      "@culinaryos/shared": "workspace:*"
    },
    "devDependencies": {
      "@types/react": "^18.3.0",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.0",
      "typescript": "^5.4.0",
      "vite": "^5.2.0"
    }
    ```
  - **Defect**: Missing `"tailwindcss": "^3.4.0"`, `"postcss": "^8.4.38"`, and `"autoprefixer": "^10.4.19"`.
- **CSS / Directive Files**:
  - `apps/admin/src/` contains **no** `.css` file.
  - `apps/admin/src/main.tsx` does **not** import any stylesheet.
- **Component Styling**:
  - `apps/admin/src/pages/Menu.tsx` uses 100% inline `style={{...}}` with hardcoded color hex values (`#0f172a`, `#64748b`, `#cbd5e1`, `#f1f5f9`).
  - `apps/admin/src/pages/Staff.tsx` uses 100% inline `style={{...}}`.
  - `apps/admin/src/pages/Pantry.tsx` imports `CulinaryHeader` from `@culinaryos/ui`, but because Tailwind is not configured in `apps/admin`, the Tailwind classes on `CulinaryHeader` (e.g. `bg-white border-b border-[#e5e7eb] px-5 py-3 flex items-center justify-between shadow-xs shrink-0 select-none`) do not produce CSS output at runtime.
- **Vite Bundler Setup (`apps/admin/vite.config.ts`)**:
  - Aliases `@culinaryos/ui` -> `packages/ui/src/index.ts` and `@culinaryos/shared` -> `packages/shared/src/index.ts`.
  - Proxies `/v1` to `http://localhost:3000`.
  - Port is configured to `5174`.

---

### 1.2 `packages/ui` Build & Export Architecture
- **Package Manifest (`packages/ui/package.json`)**:
  ```json
  {
    "name": "@culinaryos/ui",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "main": "./src/index.ts",
    "exports": {
      ".": "./src/index.ts",
      "./culinary-theme.css": "./src/culinary-theme.css"
    },
    "scripts": {
      "build": "tsc",
      "typecheck": "tsc --noEmit"
    }
  }
  ```
- **Source Code (`packages/ui/src`)**:
  - `index.ts`: Imports `'./culinary-theme.css'` and re-exports `CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, and `CulinaryBadge`.
  - `culinary-theme.css`: Defines CSS custom properties (`:root { --cos-brand: #0f172a; --cos-bg: #f8f9fa; --cos-surface: #ffffff; ... }`) and utility classes (`.cos-card`, `.cos-btn`, `.cos-badge`, `.cos-section-nav`, `.cos-cart-fab`).
  - `CulinaryHeader.tsx`, `CulinaryCard.tsx`, `CulinaryButton.tsx`, `CulinaryBadge.tsx`: Reusable React components built using Tailwind utility classes (`bg-white`, `border-[#e5e7eb]`, `text-[#0f172a]`, `shadow-xs`, etc.).
- **Tailwind Content Extraction Model**:
  - In consumer apps (`apps/pos`, `apps/kds`), Tailwind is configured with:
    `"../../packages/ui/src/**/*.{js,ts,jsx,tsx}"` in `content`.
  - This allows consumer apps' Tailwind compilers to scan the source code of `@culinaryos/ui` and generate all utility classes utilized by the shared components.

---

### 1.3 Monorepo Comparative Analysis

| Feature | `apps/pos` | `apps/kds` | `apps/web` | `apps/admin` (Current) | `apps/admin` (Proposed) |
|---|---|---|---|---|---|
| `tailwindcss` in `devDependencies` | ✅ `^3.4.0` | ✅ `^3.4.0` | ❌ | ❌ | ✅ `^3.4.0` |
| `postcss` in `devDependencies` | ✅ `^8.4.38` | ✅ `^8.4.38` | ❌ | ❌ | ✅ `^8.4.38` |
| `autoprefixer` in `devDependencies` | ✅ `^10.4.19` | ✅ `^10.4.19` | ❌ | ❌ | ✅ `^10.4.19` |
| `postcss.config.js` | ✅ Present | ✅ Present | ❌ | ❌ | ✅ Present |
| `tailwind.config.js` | ✅ Present | ✅ Present | ❌ | ❌ | ✅ Present |
| `src/index.css` with `@tailwind` | ✅ Present | ✅ Present | ❌ | ❌ | ✅ Present |
| Imports `index.css` in `main.tsx` | ✅ Line 5 | ❌ (in index.html) | ✅ Line 4 | ❌ | ✅ Line 4 |
| Scans `packages/ui/src` in Tailwind | ✅ Yes | ✅ Yes | N/A | ❌ | ✅ Yes |

---

## 2. Concrete Recommendations & Configuration Code

### 2.1 File: `apps/admin/package.json`
Update `devDependencies` to include Tailwind, PostCSS, and Autoprefixer matching the monorepo lockfile:

```json
{
  "name": "@culinaryos/admin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc && vite build",
    "preview": "vite preview --port 5174",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@culinaryos/config": "workspace:*",
    "@culinaryos/ui": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.23.0",
    "@culinaryos/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

---

### 2.2 File: `apps/admin/postcss.config.js` (NEW)
Create `apps/admin/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### 2.3 File: `apps/admin/tailwind.config.js` (NEW)
Create `apps/admin/tailwind.config.js`:

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
        'cos-bg': 'var(--cos-bg, #f8f9fa)',
        'cos-surface': 'var(--cos-surface, #ffffff)',
        'cos-surface-2': 'var(--cos-surface-2, #f1f3f5)',
        'cos-border': 'var(--cos-border, #e5e7eb)',
        'cos-text': 'var(--cos-text, #1f2937)',
        'cos-text-muted': 'var(--cos-text-muted, #6b7280)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
};
```

*Note on `boxShadow.xs`*: In `@culinaryos/ui`, `CulinaryHeader`, `CulinaryCard`, and `CulinaryButton` utilize the `shadow-xs` class. In Tailwind v3, `shadow-xs` is not part of the default palette, so extending `boxShadow.xs: '0 1px 2px rgba(0,0,0,0.05)'` ensures seamless alignment with `--cos-shadow-xs`.

---

### 2.4 File: `apps/admin/src/index.css` (NEW)
Create `apps/admin/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  padding: 0;
  background: var(--cos-bg, #f8f9fa);
  color: var(--cos-text, #1f2937);
  font-family: var(--cos-font-sans, 'Inter', system-ui, sans-serif);
}
```

---

### 2.5 File: `apps/admin/src/main.tsx`
Add `import './index.css';` to `apps/admin/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import './index.css';
import { PantryPage } from './pages/Pantry';
import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';
...
```

---

### 2.6 Optional: `packages/ui` Tailwind Preset Export
To centralize theme tokens and prevent duplication across apps, `packages/ui` can optionally export `tailwind.preset.js`:

`packages/ui/src/tailwind.preset.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        brand: '#0f172a',
        brandHover: '#1e293b',
        'cos-bg': 'var(--cos-bg, #f8f9fa)',
        'cos-surface': 'var(--cos-surface, #ffffff)',
        'cos-surface-2': 'var(--cos-surface-2, #f1f3f5)',
        'cos-border': 'var(--cos-border, #e5e7eb)',
        'cos-text': 'var(--cos-text, #1f2937)',
        'cos-text-muted': 'var(--cos-text-muted, #6b7280)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.05)',
      },
    },
  },
};
```
And add `"./preset": "./src/tailwind.preset.js"` to `packages/ui/package.json` `exports`.

---

## 3. Implementation Checklist for Worker

- [ ] Update `apps/admin/package.json` devDependencies.
- [ ] Create `apps/admin/postcss.config.js`.
- [ ] Create `apps/admin/tailwind.config.js`.
- [ ] Create `apps/admin/src/index.css`.
- [ ] Update `apps/admin/src/main.tsx` to import `./index.css`.
- [ ] Verify `pnpm --filter @culinaryos/admin build` and `pnpm --filter @culinaryos/admin typecheck` pass cleanly.
