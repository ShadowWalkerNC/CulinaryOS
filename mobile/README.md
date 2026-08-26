# CulinaryOS Mobile

React Native + Expo mobile companion for CulinaryOS.

> **Status: Early stub.** The mobile app scaffolding is in place but is not yet feature-complete. The primary operational surfaces (POS, KDS, Admin) are web-first React applications. This companion app targets staff-facing mobile workflows in a future release.

---

## Stack

- **React Native + Expo SDK 52** (TypeScript)
- **Expo Router** — file-based navigation
- **NativeWind** — Tailwind CSS for React Native
- **TanStack Query** — server state management
- **Zustand** — global state
- **Supabase JS SDK** — auth + data
- **Expo SQLite** — offline local storage
- **EAS Build** — CI/CD to Google Play & App Store

---

## Getting Started

```bash
cd mobile
pnpm install
cp ../.env.example .env
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your Android or iOS device.

---

## Project Structure

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout (QueryClient, StatusBar)
│   └── (tabs)/
│       ├── _layout.tsx      # Tab bar configuration
│       ├── index.tsx        # Dashboard
│       ├── orders.tsx       # Order queue
│       ├── inventory.tsx    # Stock levels
│       └── menu.tsx         # Menu browser
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── store.ts             # Zustand global store
└── app.json                 # Expo config
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser-safe) |

---

## Building for Production

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios

# Submit to stores
eas submit
```
