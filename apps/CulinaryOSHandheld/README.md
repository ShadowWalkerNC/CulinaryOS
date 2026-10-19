# CulinaryOS Handheld (Native iOS via xtool)

Native Swift 6 / iOS 17 tableside ordering and ticket dispatch application for CulinaryOS, configured for development and compilation on Windows using **xtool**.

> **Status: Active.** The handheld app delivers high-density floor operations, 78px circular touch targets following Jakob's Law, instant 4-digit PIN authentication, tableside check cart management, and sub-second kitchen ticket routing.

---

## Key Features

- **Thumb-Zone Physical Ergonomics (Jakob's Law):** 78px circular numeric keypad touch targets with system haptic feedback and instant 4-digit PIN authentication (`KeypadPinView`).
- **Tableside Cart & Ordering:** Dynamic table switcher, real-time category filtering (Starters, Mains, Desserts, Beverages), modifier selection, and an ergonomic bottom-sticky "Send to Kitchen" action tray (`TablesideOrderView`).
- **Live Ticket Status:** View active dining room and bar tickets with status pills (`PENDING`, `PREPARING`, `READY`), and 1-tap "Mark Ready" or "Close & Pay" (`ActiveTicketsView`).
- **Offline Seed Engine:** Fallback offline menu catalog, staff PINs, and table orders to guarantee non-stop tableside service during Wi-Fi dropouts (`APIClient.swift`).
- **Server-Authoritative Money:** Integer cents calculation (`Int`) for all order subtotals, tax rates, and check totals.

---

## Toolchain & Compilation

- **Language:** Swift 6.1 (Strict Concurrency)
- **Framework:** SwiftUI
- **Minimum Target:** iOS 17.0+
- **Compiler / Orchestrator:** `xtool` via WSL2 Ubuntu toolchain on Windows

### Development Commands

```bash
# Verify xtool environment and Swift toolchain
xtool doctor

# Run local development with hot-reload
xtool dev

# List connected physical iOS devices over USB
xtool devices

# Provision and install onto physical iPhone / iPod Touch
xtool install

# Launch app directly on connected device
xtool launch
```

---

## Configuration (`xtool.yml`)

```yaml
bundleID: com.shadowwalker.culinaryos.handheld
displayName: CulinaryOS Handheld
category: public.app-category.business
```

---

## Project Structure

```
apps/CulinaryOSHandheld/
├── Package.swift               # SwiftPM manifest (Swift 6.1, iOS 17)
├── xtool.yml                   # xtool deployment configuration
└── Sources/CulinaryOSHandheld/
    ├── CulinaryOSHandheld.swift # App entrypoint
    ├── Models.swift             # RestaurantOrder, MenuItem, StaffUser (integer cents)
    ├── APIClient.swift          # HTTP client & offline memory seed store
    ├── KeypadPinView.swift      # 78px touch target PIN keypad with haptics
    ├── TablesideOrderView.swift # Tableside cart & category tray
    ├── ActiveTicketsView.swift  # Live kitchen chits & bump actions
    └── ContentView.swift        # Main navigation shell & lock screen
```
