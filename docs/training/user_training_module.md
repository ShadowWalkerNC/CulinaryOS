# CulinaryOS Operator Training & Human Verification Guide

This guide documents the commercial restaurant operational workflows for CulinaryOS, functioning as both an interactive training module for new restaurant operators and an empirical verification record.

---

## 1. System Architecture & Endpoints

| Service | Port / URL | Role | Status |
| :--- | :--- | :--- | :--- |
| **Hono API Server** | `http://localhost:3000` | Realtime state bridge, auth, orders, ledger, talent | 🟢 Active |
| **POS Terminal** | `http://localhost:5172` | Staff PIN login, Floor map, multi-seat ordering, checkout | 🟢 Active |
| **KDS Kitchen Display** | `http://localhost:5173` | Station filtering, course hold pacing, ticket bump bar | 🟢 Active |
| **Chrome DevTools Bridge** | `http://localhost:9222` | Live browser QA automation & Playwright recording harness | 🟢 Active |

---

## 2. Interactive Testing Protocol & Operator Modules

### Module 1: Staff Authentication & Shift Unlock
- **Action:** Open `http://localhost:5172` in browser.
- **Operator Instruction:** Click **"Server (1234)"** or enter PIN `1234` on the numeric keypad.
- **Verification Target:** Station unlocks immediately and redirects to the Shift Dashboard with active staff identity displayed in the top header.

### Module 2: Cash Drawer Float Declaration, Multi-Drawer Management & GL Reconcile
- **Action:** From the Shift Dashboard (`http://localhost:5172`), observe the **Station & Day Status pill** (`Day OPEN` / `Day CLOSED`) and the active drawer selector.
- **Operator Instruction:**
  1. Click **"Manager: Open Day / Close Day"** to toggle the daily business state and adjust opening floats across all stations.
  2. Use **"Switch"** on the Active Cash Drawer card to switch between Station #1 (Main FOH), Station #2 (Bar / Patio), or Station #3 (Takeout).
  3. Click **"Declare Cash Drawer"**. Enter counts into the bill boxes ($1, $5, $10, $20) — noticing inputs auto-select cleanly on click with zero-placeholder styling.
  4. Click **"Save Audit & Log GL"**.
- **Verification Target:** An in-app toast notification displays the discrepancy status and General Ledger Journal Entry reference without jarring browser alerts. The **Fees Kept Today vs Square** live ticker dynamically updates.

### Module 3: Floor Map & Multi-Seat Table Ordering
- **Action:** Click **"Floor Map"** on the top navigation.
- **Operator Instruction:** Select an open table (e.g. Table 12 or Table 1).
- **Verification Target:** Active ticket opens. Add items (e.g. Maine Clam Chowder for Seat 1, Crispy Calamari for Seat 2). Confirm allergen badges and course numbers appear accurately.

### Module 4: Real-Time Kitchen Dispatch & KDS Bump Bar
- **Action:** Click **"SEND TO KITCHEN"** on the POS ticket panel.
- **Operator Instruction:** Switch to KDS at `http://localhost:5173/station/expo`.
- **Verification Target:** Ticket appears instantly with live aging timer. Click **"BUMP"** on the ticket header. Verify that ticket clears and the order status on POS transitions to `'served'`.

### Module 5: Zero-Fee Dual Pricing & Checkout Tender
- **Action:** Return to POS checkout (`Pay` button).
- **Operator Instruction:** Review side-by-side **Cash Tender Price** vs **Card Tender Price (3.8%)**. Select **"Cash"**, click **"Exact"**, and click **"Finalize Payment"**.
- **Verification Target:** Physical cash drawer kick triggers via ESC/POS driver, transaction approves, and guest receipt tape generates.
