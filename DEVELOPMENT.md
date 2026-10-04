# CulinaryOS Developer Setup & Environment Runbook

> **Document Version:** 1.0.0
> **Platform Engine:** Node.js 20+, pnpm 9, Turborepo, TypeScript 5.9

---

## 1. Quick Start

### 1.1 Prerequisites
- **Node.js:** v20.x or v22.x LTS
- **pnpm:** v9.x (`corepack enable && corepack prepare pnpm@9.0.0 --activate`)
- **Git:** Git 2.40+
- **Supabase CLI / PostgreSQL:** (optional for local full-stack development; demo mode boots offline)

### 1.2 Installation
```bash
# Clone the repository
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS

# Install dependencies across all workspaces
pnpm install

# Copy environment variables
cp .env.example .env
```

---

## 2. Port Allocation Matrix

CulinaryOS uses predictable port bindings across all services:

| Service / Application | Filter Name | Port | Description |
| :--- | :--- | :--- | :--- |
| **API Server** | `@culinaryos/server` | `3000` | Core Hono REST/SSE backend |
| **POS Terminal** | `@culinaryos/app-pos` | `5172` | Front-of-House Point of Sale |
| **KDS Kitchen** | `@culinaryos/app-kds` | `5173` | Back-of-House Cook Rails |
| **Admin Workstation**| `@culinaryos/admin` | `5174` | Manager Back-Office & HACCP Operations |
| **Public Web** | `@culinaryos/app-web` | `5176` | Guest ordering & restaurant site |
| **Prep Kitchen** | `@culinaryos/app-kitchenkit` | `5177` | Shift prep planner & recipe vault |
| **Operations Hub** | `@culinaryos/app-ops` | `5178` | Labor, prime cost, waste tracking |
| **Marketing Studio**| `@culinaryos/app-marketing` | `5179` | Campaign generator & social planner |
| **Marketing Engine**| `services/marketing-python` | `8000` | FastAPI content generation engine |
| **Intelligence MCP**| `intelligence/mcp` | `8100` | Restaurant AI tool server (HTTP/SSE) |

---

## 3. Standard Scripts

```bash
# Run core service trio (API + POS + KDS)
pnpm dev

# Run individual applications
pnpm pos         # POS Terminal on :5172
pnpm kds         # KDS Kitchen on :5173
pnpm admin       # Admin Workstation on :5174
pnpm web         # Public Web on :5176
pnpm prep        # CulinaryOS Prep on :5177
pnpm ops         # CulinaryOS Ops on :5178
pnpm server      # Hono API on :3000

# Typecheck the entire monorepo
pnpm run typecheck

# Build all packages and applications
pnpm run build

# Run targeted unit tests
node -r ./scripts/test-hook.cjs --import tsx tests/admin/auth-gate.test.ts
node -r ./scripts/test-hook.cjs --import tsx tests/ui/navigation.test.ts
```

---

## 4. Degraded / Offline Demo Mode

The entire system is architected to boot with **zero cloud dependencies**:
- If `SUPABASE_URL` contains placeholder text, the API boots in relaxed demo mode (`AUTH_RELAXED=true`).
- POS serves built-in mock menus and persists orders to localStorage/IndexedDB.
- KDS serves simulated tickets with live aging timers.
- Demo PINs for login:
  - `1234`: Store Manager (Access to POS, KDS, and Admin Workstation)
  - `5678`: Line Cook (KDS only)
  - `9999`: General Manager / Owner
