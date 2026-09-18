# 🚀 CulinaryOS SaaS Tiers & Turnkey Packaging Specification

This document details the functional breakdown between the **Free & Open-Source Community Core** and the **Paid SaaS Tiers** (Pro Cloud & Multi-Unit Enterprise), including onboarding flows and turnkey installation requirements.

---

## 🏗️ Architecture Split: Open Source Core vs. Paid SaaS

CulinaryOS is built on an **Open Core** architecture. The core point-of-sale and kitchen display engine are fully functional offline and self-hostable with zero licensing fees. Advanced multi-device cloud synchronization, automated compliance reporting, and enterprise multi-unit management are offered in the managed SaaS tiers.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ENTERPRISE MULTI-UNIT ($149/mo)                      │
│   Commissary Transfer Orders (V17) · Brand Menu Syndication            │
│   Cross-Unit Financial Rollups · Custom Webhooks & ERP Bridge          │
├────────────────────────────────────────────────────────────────────────┤
│                       PRO CLOUD ($49/mo)                               │
│   Managed Supabase Realtime Sync · Gusto/ADP Tip Payroll Export        │
│   Remote Back-Office Dashboard · Live Online Ordering Portal           │
│   Automated Cloud Backups · Multi-Device Instant Handshake             │
├────────────────────────────────────────────────────────────────────────┤
│                  COMMUNITY CORE ($0 — Open Source)                     │
│   Local POS Workstation · Local Kitchen Display Screen (KDS)           │
│   Offline Event Bus & Queue · Local SQLite/Postgres DB · Floor Maps    │
│   ESC/POS Thermal Receipt & Impact Ticket Printing · Cash Drawer Kick  │
│   Standard Shift Z-Reports · FLSA Tip Calculator · Local Staff PINs    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Detailed Feature Matrix

| Feature Domain | Community Core ($0) | Pro Cloud ($49/mo) | Enterprise ($149/mo) |
| :--- | :---: | :---: | :---: |
| **POS Stations per Location** | Unlimited (Local Network) | Unlimited (Cloud Sync) | Unlimited (Multi-Site) |
| **KDS Screens per Location** | Unlimited (Local Network) | Unlimited (Cloud Sync) | Unlimited (Multi-Site) |
| **Hardware Compatibility** | Any PC, Mac, iPad, Android | Any PC, Mac, iPad, Android | Any PC, Mac, iPad, Android |
| **Printer Support** | ESC/POS (LAN / USB / Bluetooth) | ESC/POS + CloudPRNT | ESC/POS + CloudPRNT |
| **Cash Drawer Kick** | RJ11/RJ12 Printer DK Port | RJ11/RJ12 Printer DK Port | RJ11/RJ12 Printer DK Port |
| **Card Payments** | Bring-Your-Own Stripe Terminal | Bring-Your-Own Stripe Terminal | Bring-Your-Own Stripe Terminal |
| **Offline Dining Rush Mode** | Local Queue (Auto-Reconcile) | Local Queue (Cloud Sync) | Local Queue (Cloud Sync) |
| **FLSA Tip Pooling Engine** | In-App Shift Calculation | In-App + Gusto/ADP CSV | In-App + Gusto/ADP + Multi-Unit |
| **Daily Z-Report & Drawer Count**| Local Generation & PDF Print | Cloud Sealed Ledger + PDF | Centralized Organization Audit |
| **Pantry & Recipe Costing** | Local Par Levels & Depletion | Cloud Realtime Auto-86 | Multi-Unit Commissary Transfer |
| **Multi-Location Rollups** | ❌ (Single Unit) | ❌ (Single Unit) | ✅ Full Parent Organization |
| **Centralized Menu Push** | ❌ | ❌ | ✅ Broadcast to All Units |
| **Commissary Logistics** | ❌ | ❌ | ✅ V17 Transfer Orders |

---

## 🛠️ Turnkey Deployment Profiles

CulinaryOS provides three turnkey installation and onboarding paths:

### 1. Local Single-Station / Food Truck (Community Edition)
* **Target:** Single touchscreen PC, laptop, or tablet.
* **Requirements:** Node.js >= 20.
* **Turnkey Setup:**
  ```powershell
  git clone https://github.com/ShadowWalkerNC/CulinaryOS.git
  cd CulinaryOS
  pnpm install
  pnpm dev
  ```
* **Offline Operation:** Zero external cloud accounts required. Uses built-in mock/local database and storage.

### 2. Independent Full-Service Restaurant (Pro Cloud)
* **Target:** Multi-tablet dining room (2 POS, 1 Bar, 2 KDS screens, 1 Receipt Printer, 1 Kitchen Impact Printer).
* **Onboarding Steps:**
  1. Provision managed Supabase project via `pnpm local:supabase` or Supabase Cloud.
  2. Run database migrations: `supabase db push` (V1–V17).
  3. Connect Stripe account via Stripe Connect onboarding link.
  4. Pair tablets via local QR code / mDNS discovery (`culinary mdns discover`).
  5. Configure printer IP addresses in back-office terminal setup.

### 3. Multi-Unit Commissary Enterprise
* **Target:** Central production kitchen supplying 3+ retail restaurant locations.
* **Onboarding Steps:**
  1. Create parent organization in `organizations` table.
  2. Associate unit tenants under `restaurants.organization_id`.
  3. Set up commissary catalog and route replenishment orders via `V17__multi_unit_commissary.sql`.
  4. Access consolidated organization revenue, labor, and food cost rollups.
