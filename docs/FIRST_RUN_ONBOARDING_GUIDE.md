# CulinaryOS — First-Run Desktop Installation & Onboarding Guide

> **Architecture:** Standalone Native Rust Desktop Workstation (`culinaryos-desktop.exe`) + Optional CulinaryOS SaaS Cloud Bridge (`https://culinaryos-api.up.railway.app`).

---

## 1. Launching a Clean First-Time Installation

Every restaurant runs `culinaryos-desktop.exe` locally on-premise so Point of Sale (`:5172`), Kitchen Display (`:5173`), Back-Office Admin (`:5174`), receipt printers, and cash drawers execute over LAN with zero internet dependency.

To launch or reset the workstation into **First-Time Installation Mode**:

```powershell
# Launch fresh first-time installer on Windows
.\target\debug\culinaryos-desktop.exe --port 3000 --fresh-install
```

Or reset a running workstation at any time via the local API:

```powershell
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:3000/v1/setup/reset"
```

When `setupCompleted` is `false`, opening `http://127.0.0.1:3000` or `http://127.0.0.1:3000/setup` launches the **5-Step Native Rust Workstation Installer & Onboarding Wizard**.

---

## 2. The 5-Step First-Run Onboarding Wizard

### Step 1: Venue Identity & Concept Template
1. Enter your **Restaurant / Venue Name** (e.g., `Alley Katz Taproom & Kitchen` or `Cheezies Gourmet`) and **City & State**.
2. Set your **Primary Owner / GM Name** and **Owner POS/Admin PIN** (default `1234`, 4–8 digits, hashed via SHA-256 into `%APPDATA%\CulinaryOS\culinaryos.db`).
3. Choose one of the three built-in operational presets:
   - **`01 / Full-Service Dining`** — 16 tables, Course 1/2 pacing, Hot/Grill/Cold/Fry/Bar stations, hours-weighted tip pool.
   - **`02 / Cheezies Gourmet Pilot`** — Fast-casual & food truck flow, Grill/Fry split rail, quick counter checkout (`6.75%` Ohio tax).
   - **`03 / High-Volume Bar & Taproom`** — 24 tables + bar tabs, rapid drink rail, 24V cash drawer fast-settle.

### Step 2: Dining Room Floor, Tax & FLSA Tip Engine
1. Configure **Total Dining Room Tables** and **Sales Tax Rate** in basis points (`825` = `8.25%`).
2. Verify the **FLSA Manager & Supervisor Tip Pool Exclusion** gate (`29 U.S.C. 203(m)(2)(B)`), which is hardcoded in Rust (`packages/native/src/local_store.rs`) so owners and managers can never be allocated tip pool cents.
3. Keep **Seed Starter Menu & Live Demo Kitchen Tickets** checked to pre-populate:
   - **12 dishes** across 5 stations (`Wood-Fired Margherita`, `Spicy Soppressata Diavola`, `Dry-Aged Ribeye 14oz`, `Double Wagyu Smash Burger`, `Pan-Roasted Alaskan Halibut`, `Little Gem Caesar`, `Heirloom Tomato & Burrata`, `Crispy Rhode Island Calamari`, `Tallow Pommes Frites`, `Charred Brussels & Pancetta`, `Barrel-Aged Negroni`, `Espresso Mascarpone Tiramisu`).
   - **2 active open checks** (`Table 4` and `Bar 2`) and **6 live station tickets** on the KDS rail.

### Step 3: Local LAN Hardware & ESC/POS Discovery
1. Verifies FOH Thermal Receipt Printer (`Star TSP143IV` / `Epson TM-m30` on TCP `:9100` with 24V RJ11/RJ12 cash drawer kick).
2. Verifies BOH Kitchen Impact Printer (`Star SP742` / `Epson TM-U220`).
3. Verifies Card-Present Reader (`Stripe Terminal WisePOS E / S700` under Bring-Your-Own-Stripe Connect Standard, SAQ-A out-of-scope).

### Step 4: Optional CulinaryOS SaaS Cloud Bridge
1. Keep **Enroll Demo SaaS Pro Entitlement Grant** checked to issue and verify an HMAC-SHA256 `SignedSaasGrant` unlocking:
   - `cloud_storage_sync` (encrypted SHA-256 offsite delta backup)
   - `online_ordering_bridge` (public web orders relayed into local KDS)
   - `ai_autopilot` (predictive prep & 86 countdowns)
   - `managed_stripe_connect` (Bring-Your-Own-Stripe Connect Standard)
2. If internet drops, the workstation continues running 100% locally with a 24-hour SaaS grace window.

### Step 5: Preflight Verification & Workstation Launch
1. Confirms all 8 local React surface ports and the Rust API gateway are `ONLINE`.
2. Click **Complete Installation & Launch Workstation** (`POST /v1/setup/complete`), which persists your configuration to `%APPDATA%\CulinaryOS\culinaryos.db` and redirects directly into the **Master Restaurant Workstation Shell** (`http://localhost:5180`).

---

## 3. Workstation Surface Map & Demo Credentials

| Shortcut | Surface | Local URL | Default PIN / Access |
|---|---|---|---|
| **Master Shell** | Restaurant Workstation Frame | `http://localhost:5180` | `F1`–`F7` surface switcher, `F9` Diagnostics, `F10` Mobile Pairing, `F11` Kiosk |
| **`F1`** | POS Terminal | `http://localhost:5172` | Owner PIN: `1234` · Server PIN: `5678` |
| **`F2`** | KDS Kitchen Display | `http://localhost:5173` | 6 live tickets seeded (`Table 4` & `Bar 2`) |
| **`F3`** | Back-Office Admin & MRP | `http://localhost:5174` | Owner PIN: `1234` (includes Setup Assistant button in top ribbon) |
| **`F4`** | Guest Storefront & QR Menu | `http://localhost:5176/menu/demo` | Public guest ordering view |
| **`F5`** | KitchenKit Prep & Yield | `http://localhost:5175` | Recipe scaling, baker percentages & shelf-life labels |
| **`F6`** | CulinaryOps Finance & FLSA | `http://localhost:5177` | Food cost, waste logging & FLSA labor |
| **`F7`** | Display & RecipeOS Wallboard | `http://localhost:5178` | 140% TV wallboard & RecipeOS vault |
| **Setup** | First-Run Installer Wizard | `http://127.0.0.1:3000/setup` | 5-step PC installation & demo data seeder |
| **API** | Native Rust Gateway | `http://127.0.0.1:3000` | `/health`, `/v1/setup/status`, `/v1/orders`, `/v1/kds/tickets`, `/v1/cloud/status` |
