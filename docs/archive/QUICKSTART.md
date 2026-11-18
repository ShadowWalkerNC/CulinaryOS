# 🚀 5-Minute Quickstart Guide — CulinaryOS

Welcome to **CulinaryOS**! This guide walks you through downloading, booting, and testing every piece of the restaurant OS on your machine in under 5 minutes — with **zero database setup and zero external API keys required**.

---

## Prerequisites

Make sure you have these installed before starting:

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 20 or later | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9 or later | `npm install -g pnpm` |

Verify with:
```bash
node --version   # should print v20.x.x or later
pnpm --version   # should print 9.x.x or later
```

---

## ⚡ Step 1 — 1-Click Launch (30 Seconds)

### 🪟 Windows (1-Click Desktop Installer & Shortcut)
Double-click [**`Install-CulinaryOS.bat`**](Install-CulinaryOS.bat) in File Explorer (or run via PowerShell):
```powershell
.\Install-CulinaryOS.bat
```
- Auto-installs Node.js & `pnpm` if missing.
- Creates a permanent **`CulinaryOS` shortcut on your Windows Desktop**.
- Double-clicking the Desktop shortcut automatically pulls the newest repository updates (`git pull --rebase`) and boots the restaurant workstation!

### 🍎 macOS / Linux (1-Click Bash Launcher)
```bash
./START_HERE.sh
```

### 💻 Direct pnpm Command
```bash
pnpm quickstart
```

The launcher automatically creates your `.env` from `.env.example`, builds shared packages, and launches all services in parallel. Wait for the services to boot and your browser to open.

> **What's happening behind the scenes:** `pnpm quickstart` runs `scripts/quickstart.ts` which starts `apps/server` (Hono API on Node.js 20), `apps/pos` (Vite), `apps/kds` (Vite), `apps/admin` (Vite), and `apps/web` (Vite) in parallel. With no Supabase keys configured, the API boots in **demo mode**: auth is relaxed (no bearer token needed), and the in-memory mock kitchen store handles POS → KDS communication.

---

## 🖥️ Step 2 — Live Application URLs & Demo Credentials

| Surface | URL | Demo Credential | Purpose |
|---|---|---|---|
| **POS Terminal** | [http://localhost:5172](http://localhost:5172) | Server PIN: `1234` · Manager PIN: `5678` | Order entry, 2D/3D floor map, checkout |
| **Kitchen Display (KDS)** | [http://localhost:5173](http://localhost:5173) | *(No login required)* | Live tickets, aging timers, station tabs, bump bar |
| **Admin Portal** | [http://localhost:5174](http://localhost:5174) | *(No login required)* | Inventory par levels, purchase orders, menu 86ing, staff |
| **Online Storefront** | [http://localhost:5176](http://localhost:5176) | *(No login required)* | Guest ordering, FDA Top 9 dietary filters, cart |
| **Unified API** | [http://localhost:3000](http://localhost:3000) | `X-Tenant-Id: 00000000-0000-0000-0000-000000000001` | Hono REST API, ops routes, marketplace |

> **Demo mode note:** POS and KDS are separate browser origins (`:5172` vs `:5173`). In offline/demo mode they use the API's in-memory kitchen store for cross-app communication — POS "Send to Kitchen" tickets appear on the KDS board via polling every 2 seconds. For true Supabase Realtime sync, see [Connecting to Supabase](#connecting-to-supabase).

---

## 🧪 Step 3 — Top 5 Features to Test

### Test Flow #1: 3D Dining Room & POS Order Fire

1. Open **POS** at [http://localhost:5172](http://localhost:5172).
2. Enter PIN **`1234`** to unlock the terminal.
3. Click **"Table Service"**.
4. In the top-right toggle, click **"3D Spatial"** → Drag your mouse to orbit around the Three.js 3D dining room. Notice the glowing status halos (🟢 Available, 🟠 Occupied with live bill total, 🟣 Reserved, 🔴 Dirty/Bus).
5. Click **Table 1** (or any table) → Click **"Start Order / Seat"**.
6. Add a **Wood-Fired Margherita Pizza** and a **Prime Bistro Burger**.
7. Click **"Send to Kitchen"** (or pay directly via Tap-to-Pay / QR Scan).

### Test Flow #2: Kitchen Display (KDS) Live Tickets & Aging

1. Open **KDS** at [http://localhost:5173](http://localhost:5173).
2. Your pizza and burger tickets appear on the kitchen rail within ~2 seconds.
3. Click through the Station tabs: **Hot Grill**, **Cold Prep**, **Fryer**, **Bar**, **Expo Pass**.
4. Watch the 1-second aging timers transition: Green (<5m) → Amber (5–10m) → Red (>10m).
5. Click **"BUMP"** on a ticket to mark it complete.

### Test Flow #3: Admin Pantry Par Levels & 1-Click Purchase Orders

1. Open **Admin** at [http://localhost:5174](http://localhost:5174).
2. Click **"Pantry / Inventory"** in the sidebar.
3. POS order firing automatically decremented stock levels (flour, beef, mozzarella) based on the recipe formula tree.
4. Click **"Auto-Generate Purchase Order"** to bundle all low-stock items into a supplier PO draft in one click.

### Test Flow #4: Customer Online Storefront & Dietary Filters

1. Open **Online Ordering** at [http://localhost:5176](http://localhost:5176).
2. Click the dietary filter tags at the top (**Vegan**, **Gluten-Free**, **Nut-Free**, **Dairy-Free**).
3. Items dynamically filter based on the FDA FASTER Act Top 9 allergen engine. Allergen badges display inline (`🌾 Wheat`, `🥛 Dairy`, `🦐 Shellfish`, `🥜 Peanuts`).
4. Add items to your cart, test modifier customization, and proceed to checkout.

### Test Flow #5: AI Operations Manager Audit

Open a new terminal window and run:

```bash
pnpm ops:audit
```

This runs the automated restaurant operations consultant diagnostic. It evaluates speed-of-service, touchscreen ergonomics, and allergen cross-contact safety, and generates a fresh report in [`docs/DAILY_OPERATIONS_REPORT.md`](docs/DAILY_OPERATIONS_REPORT.md).

---

## 🛠️ Step 4 — Developer Quality Verification

Run the full automated quality gate:

```bash
# TypeScript typecheck — 18 tasks, 0 errors
pnpm run typecheck

# Full test suite (32 suites, 110+ tests)
node ./scripts/run-all-tests.cjs

# Production preflight diagnostics
pnpm doctor
```

---

## Connecting to Supabase

To enable true multi-device POS → KDS Realtime sync, RLS enforcement, and live seeded staff PINs:

1. Create a [Supabase](https://supabase.com) project and copy your `URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY`.
2. Set them in `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   AUTH_RELAXED=false
   ```
3. Apply migrations and seed:
   ```bash
   npx supabase db reset
   pnpm seed
   ```
4. Restart the stack — POS and KDS will now share live order state via Supabase Realtime.

---

Enjoy testing CulinaryOS! Found a bug or want to contribute? See [`CONTRIBUTING.md`](CONTRIBUTING.md).
