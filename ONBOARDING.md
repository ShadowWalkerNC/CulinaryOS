# 📖 CulinaryOS — Operator's Master Onboarding & Setup Guide

Welcome to **CulinaryOS**, the open-source, sovereign restaurant operating system and Point of Sale (POS) hub.

This document is your step-by-step operator guide to taking orders, routing kitchen tickets, configuring hardware, and collecting payments right out of the box.

---

## ⚡ 1. Fast Launch (Under 60 Seconds)

### Prerequisites
- **Node.js**: v20 or later ([Download](https://nodejs.org/))
- **pnpm**: v9 or later (`npm install -g pnpm`)

### One-Command Turnkey Boot
```bash
# Clone the repository
git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
cd CulinaryOS

# Install dependencies
pnpm install

# Start all services in zero-config demo mode
pnpm quickstart
```

> **Windows Operators:** Double-click `quickstart.bat` in File Explorer.  
> **macOS / Linux Operators:** Run `./quickstart.sh` in Terminal.

---

## 🖥️ 2. Application Directory & Roles

Once launched, all services are active and communicating on your machine:

| Surface | Port / URL | Default PIN / Access | Operational Role |
|---|---|---|---|
| **POS Terminal** | `http://localhost:5172` | Server: `1234`<br>Manager: `5678` | Tableside order entry, 2D/3D floor plan, payment checkout, ESC/POS receipt printing |
| **Kitchen Display (KDS)** | `http://localhost:5173` | *(No PIN needed)* | Cook-line ticket rails with 1-second aging timers, station filtering (Grill, Cold, Bar, Expo), bump bar |
| **Back-Office Admin** | `http://localhost:5174` | *(No PIN needed)* | Menu catalog, 1-click 86 item toggle, inventory par levels, auto-PO generator, staff security PINs, integrations |
| **KitchenKit Prep** | `http://localhost:5175` | *(No PIN needed)* | Morning prep checklists, cover volume projections, perishable FIFO tracking |
| **Online Storefront** | `http://localhost:5176` | *(No PIN needed)* | Customer web ordering with FDA Top 9 allergen filtering, cart drawer, live status tracking |
| **CulinaryOps Analytics** | `http://localhost:5177` | *(No PIN needed)* | Food cost variance %, kitchen trim waste logs, labor analytics |
| **RecipeOS Vault** | `http://localhost:5178` | *(No PIN needed)* | Next.js recipe vault, ratio scaling engine, unit conversions |
| **Unified API Server** | `http://localhost:3000` | Tenant UUID: `0000...0001` | Hono REST API, event broker, payment processing, integration webhooks |

---

## 💳 3. Taking Orders & Payments Right Off The Bat

### A. Cash Transactions & Cash Drawer Kick
1. On the POS (`http://localhost:5172`), enter PIN `1234`.
2. Select a table on the Floor Map, add items to seats (e.g. Seat 1: *Prime Burger*, Seat 2: *Margherita Pizza*).
3. Click **"Send to Kitchen"** to fire tickets to the KDS (`:5173`).
4. Click **"Pay Check"** to enter Checkout.
5. Select **Cash** tender, enter the bill tendered (e.g. `$50.00`).
6. The change due calculates instantly.
7. Clicking **"Finalize Payment"** automatically:
   - Closes the check in local memory/database.
   - Sends a 24V RJ11/RJ12 solenoid pulse to kick open your cash drawer.
   - Spools the thermal receipt.

### B. Credit / Debit Card & Tap-to-Pay (Stripe Terminal)
- **Demo Mode (Out of the Box)**: Settle instantly with simulated authorization.
- **Live Mode (With Stripe Account)**:
  1. Add your `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `.env`.
  2. Pair your smart reader (**BBPOS WisePOS E**, **Stripe Reader S700**, or **Stripe Reader M2**) via the Admin **Integrations** tab (`http://localhost:5174/integrations`).
  3. When ringing up an order, tap **Card** or **Tap-to-Pay** — the bill total and tip prompt display on the physical customer-facing reader screen.

### C. Split Billing (By Seat or Equal Divide)
1. In POS Checkout, tap **"Split Check"**.
2. Select **"Split by Seat"** to isolate Seat 1 or Seat 2, or **"Split Evenly"** across 2–6 payers.
3. Charge each tender independently (e.g. Card for Seat 1, Cash for Seat 2).

### D. Pre-Authorized Bar Tabs
1. Tap **"Bar Tabs"** on the POS navigation bar.
2. Click **"Open New Tab"**, swipe/tap card to pre-authorize a configurable hold (default `$25.00`).
3. Add drinks throughout the evening.
4. Settle with 1 click when the guest closes out.

---

## 🖨️ 4. Connecting Thermal Hardware & Printers

CulinaryOS communicates directly with industry-standard ESC/POS receipt printers right in the browser via WebUSB, Web Bluetooth, and Network IP — **zero proprietary printer drivers or paid bridge software needed**:

1. On the POS (`http://localhost:5172`), click **Settings** (gear icon) ➔ **Hardware Devices**.
2. **USB Printers (Epson, Star, MUNBYN, Bixolon)**:
   - Plug the printer into your computer/tablet via USB.
   - Click **"Pair WebUSB Printer"** ➔ Select your device from the browser popup.
3. **Bluetooth Mobile Printers**:
   - Turn on your mobile belt printer.
   - Click **"Pair Bluetooth"** ➔ Select printer.
4. **Network / IP Printers (Kitchen Ticket Spoolers)**:
   - Enter printer local IP address (e.g. `192.168.1.200`) and port `9100`.
5. **Paper Size**: Switch between **80mm standard** (48 chars/line) and **58mm compact** (32 chars/line).
6. Click **"Test Print Sample"** to verify receipt formatting, barcode/QR rendering, and paper cutting.

---

## 📱 5. Connecting Phones & Tablets for Tableside Service

Turn any iPhone, Android phone, or iPad into a mobile server terminal over your restaurant's local Wi-Fi:

1. On your main computer running CulinaryOS, open Command Prompt or Terminal and find your local IP address (`ipconfig` on Windows or `ifconfig` on Mac/Linux, e.g. `192.168.1.50`).
2. Ensure your phones/tablets are connected to the **same Wi-Fi network**.
3. On the phone browser (Safari or Chrome), navigate to:
   ```
   http://192.168.1.50:5172
   ```
4. Enter Server PIN `1234`. Waitstaff can now take orders at the table, assign seats, add kitchen notes, and fire orders directly to the kitchen!

---

## 🍳 6. Kitchen Display (KDS) & Expo Pass Setup

1. Mount a touchscreen monitor, Android tablet, or TV in the kitchen.
2. Open `http://<HOST_IP>:5173` (or `http://localhost:5173`).
3. Set the station view:
   - **Master Expo Pass**: Shows all incoming orders across all lines.
   - **Hot Grill**: Filters burger, steak, and grill items.
   - **Cold Prep / Salad**: Filters cold appetizers, salads, and desserts.
   - **Pizza Oven**: Filters pizzas and baked items.
   - **Bar**: Filters cocktail, beer, and wine orders.
4. Tickets automatically age in real-time:
   - 🟢 **Normal**: Under 5 minutes
   - 🟡 **Warning**: 5 to 10 minutes
   - 🔴 **Critical**: Over 10 minutes
5. Tap **"BUMP"** on a ticket to clear it from the active screen when completed.

---

## 🔄 7. Connecting External Integrations (Square & Toast)

If you have existing menus or hardware from Square or Toast:

### Square Integration
1. Go to **Admin** ➔ **Integrations** (`http://localhost:5174/integrations`).
2. **1-Click Catalog Import**: Paste your Square catalog JSON or access token to instantly import categories, items, and modifier lists.
3. **Live Order Webhook**: Point Square webhooks to `http://<YOUR_DOMAIN>/v1/integrations/square/webhook`. Orders placed on Square appear immediately on your CulinaryOS kitchen screens!
4. **Auto-86 Sync**: Toggling 86 in CulinaryOS updates item availability in Square.

### Toast POS Dining Bridge
1. Point Toast dining webhook to `http://<YOUR_DOMAIN>/v1/integrations/toast/webhook`.
2. Dine-in tickets from Toast route directly onto your kitchen KDS rail with automatic station filtering.

---

## 🛠️ 8. Troubleshooting & Health Diagnostics

CulinaryOS includes automated diagnostic scripts to verify the complete system anytime:

```bash
# Run complete system health check
pnpm doctor

# Run full empirical test suite (34 test suites)
node ./scripts/run-all-tests.cjs

# Verify TypeScript type-safety across all 36 workspace packages
pnpm typecheck
```

---

*Version: 1.0 · MIT License · Sovereign Open-Source Restaurant OS*
