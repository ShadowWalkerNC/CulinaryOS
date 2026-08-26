# 🚀 Sean's 5-Minute Quickstart Guide — CulinaryOS

Welcome to **CulinaryOS**! This guide is written so you can download, boot, and test out every single piece of the restaurant OS on your machine in under 5 minutes with **zero database setup and zero external API keys needed**.

---

## ⚡ 1. Booting Up (30 Seconds)

### Step 1: Install Dependencies
Open your terminal in the `CulinaryOS` folder and run:

```bash
pnpm install
```
*(If you don't have pnpm installed yet: `npm install -g pnpm`)*

### Step 2: One-Command Turnkey Launch
Run:

```bash
pnpm quickstart
```
*(Or simply double-click `quickstart.bat` on Windows, or `./quickstart.sh` on Mac/Linux).*

This automatically creates your `.env`, builds the shared ratio/dietary engines, and launches all 5 applications in parallel!

---

## 🖥️ 2. Live Application URLs & Demo Credentials

| Surface | URL | Demo PIN / Login | Purpose |
|---|---|---|---|
| **POS Terminal** | [http://localhost:5172](http://localhost:5172) | Server: `1234` · Manager: `5678` | Order entry, 2D/3D floor map, checkout |
| **Kitchen Display (KDS)** | [http://localhost:5173](http://localhost:5173) | *(No login required)* | Live tickets, aging timers, station tabs, bump bar |
| **Admin Portal** | [http://localhost:5174](http://localhost:5174) | *(No login required)* | Inventory par levels, purchase orders, menu 86ing, staff |
| **Online Storefront** | [http://localhost:5176](http://localhost:5176) | *(No login required)* | Guest ordering, FDA Top 9 dietary filters, cart |
| **Unified API** | [http://localhost:3000](http://localhost:3000) | `X-Tenant-Id: 00000000-0000-0000-0000-000000000001` | Hono API, ops routes, marketplace |

---

## 🧪 3. Top 5 Features to Test (Interactive Walkthrough)

### Test Flow #1: 3D Dining Room & POS Order Fire
1. Open **POS** at [http://localhost:5172](http://localhost:5172).
2. Enter PIN **`1234`** to unlock the terminal.
3. Click **"Table Service"**.
4. In the top-right toggle, click **"3D Spatial"** ➔ Drag your mouse to orbit around the Three.js 3D dining room! Notice the glowing status halos (🟢 Available, 🟠 Occupied with live bill total, 🟣 Reserved, 🔴 Dirty).
5. Click **Table 1** (or any table) ➔ Click **"Start Order / Seat"**.
6. Add a **Wood-Fired Margherita Pizza** and a **Prime Bistro Burger**.
7. Click **"Send to Kitchen"** (or pay directly via Tap-to-Pay / QR Scan).

### Test Flow #2: Kitchen Display (KDS) Live Tickets & Aging
1. Open **KDS** at [http://localhost:5173](http://localhost:5173).
2. Watch your pizza and burger tickets appear in real time on the kitchen rail.
3. Click through the Station tabs at the top: **Hot Grill**, **Cold Prep**, **Fryer**, **Bar**, **Expo Pass**.
4. Watch the 1-second aging timers transition dynamically (Green < 5m ➔ Amber 5–10m ➔ Red > 10m).
5. Click **"BUMP"** on a ticket to complete cooking.

### Test Flow #3: Admin Pantry Par Levels & 1-Click Purchase Orders
1. Open **Admin** at [http://localhost:5174](http://localhost:5174).
2. Click **"Pantry / Inventory"** in the sidebar.
3. Notice how your POS order automatically decremented stock levels (flour, beef, mozzarella) based on the recipe formula tree!
4. Click **"Auto-Generate Purchase Order"** to bundle low-stock items into a supplier PO draft with 1 click.

### Test Flow #4: Customer Online Storefront & Dietary Filters
1. Open **Online Ordering** at [http://localhost:5176](http://localhost:5176).
2. Click the dietary filter tags at the top (**Vegan**, **Gluten-Free**, **Nut-Free**, **Dairy-Free**).
3. Notice how items dynamically filter and display FDA Top 9 allergen badges (`🌾 Wheat`, `🥛 Dairy`, `🦐 Shellfish`, `🥜 Peanuts`).
4. Add items to your cart, test modifier customization, and proceed to checkout.

### Test Flow #5: AI Operations Manager Audit
Open a new terminal window and run:

```bash
pnpm ops:audit
```

This runs the automated restaurant operations consultant diagnostic, evaluates speed-of-service, touchscreen ergonomics, and allergen cross-contact safety, and generates a fresh report in [`docs/DAILY_OPERATIONS_REPORT.md`](docs/DAILY_OPERATIONS_REPORT.md).

---

## 🛠️ 4. Developer Quality Verification Commands

If you want to run the full automated test suite or static checks:

```bash
# Run all 32 test suites (110+ unit and integration tests)
node ./scripts/run-all-tests.cjs

# Run workspace-wide TypeScript typecheck (0 errors)
pnpm run typecheck

# Run production preflight doctor
pnpm doctor
```

Enjoy testing CulinaryOS! If you find anything you'd like adjusted or added, let us know!
