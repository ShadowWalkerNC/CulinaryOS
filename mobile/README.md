# CulinaryOS Mobile Companion

Universal Android & iOS manager and tableside companion for CulinaryOS, built with **React Native + Expo SDK 52**.

> **Status: Active.** The mobile companion integrates directly with the unified Hono API and local demo fallbacks. It enables managers, expediters, and floor staff to monitor live operations, bump kitchen tickets, update 86 stock status, and audit par inventory shortfalls from handheld devices.

---

## Capabilities

- **Live Shift Telemetry:** Continuous shift metrics tracking gross sales, seated covers, active dining room tables, and average ticket pacing.
- **1-Tap Role & PIN Switcher:** Fast staff profile switching between Manager (`1234`), Server (`5678`), Chef (`9012`), and Bartender (`3456`).
- **Kitchen Chit Bump Engine:** Interactive ticket cards with status pills (`PENDING`, `PREPARING`, `READY`), modifier tags, and 1-tap bump routing.
- **Real-Time 86 Catalog Control:** Toggle item availability between `IN STOCK` and `86'D`, instantly freezing sold-out items across POS terminals and guest QR menus.
- **Pantry Par Level Audits:** View live stock levels against par minimums with low-stock warning indicators and unit costs.

---

## Stack

- **React Native + Expo SDK 52** (TypeScript)
- **Expo Router** — file-based tab navigation
- **NativeWind** — Tailwind CSS for React Native
- **Zustand** — global operational state store (`lib/store.ts`)
- **Isomorphic API Client** — multi-tenant HTTP client with offline mock fallback (`lib/api.ts`)
- **Expo SQLite** — local device cache and offline durability
- **EAS Build** — standalone APK and IPA production packaging

---

## Getting Started

```bash
cd mobile
pnpm install
cp ../.env.example .env
# Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_TENANT_ID
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) or run on an attached Android/iOS device.

---

## Project Structure

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout & providers
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar navigation
│       ├── index.tsx        # Shift telemetry HUD & PIN switcher
│       ├── orders.tsx       # Live ticket queue & bump actions
│       ├── inventory.tsx    # Pantry par levels & stock audits
│       └── menu.tsx         # Menu catalog & 86 toggles
├── lib/
│   ├── api.ts               # Isomorphic API client
│   └── store.ts             # Zustand global state
├── app.json                 # Expo project manifest
└── package.json
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL for CulinaryOS Hono API | `http://localhost:3000` |
| `EXPO_PUBLIC_TENANT_ID` | Active restaurant tenant UUID | `00000000-0000-0000-0000-000000000001` |

---

## Building for Production

```bash
# Android Standalone APK (Local)
eas build --platform android --profile preview --local

# Android Production Bundle (EAS Cloud)
eas build --platform android --profile production

# iOS Standalone IPA (EAS Cloud)
eas build --platform ios --profile production
```
