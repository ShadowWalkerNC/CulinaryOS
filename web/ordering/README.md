# CulinaryOS — Customer Ordering Frontend

React / Next.js 14 (App Router) | TypeScript | Tailwind CSS

## Purpose

Mobile-first customer-facing web app for online ordering.
Served at `order.culinaryos.com/{restaurantSlug}` in production.
Self-hosters can run it at any domain.

## Pages

| Route | Description |
|---|---|
| `/[restaurantId]` | Menu browser — loads active MenuSnapshot |
| `/[restaurantId]/checkout` | Order review + customer info form |
| `/track/[trackingToken]` | Order status tracking page (WebSocket) |

## Tech Decisions

- **SSR on menu page** — Next.js server component fetches MenuSnapshot at request time for SEO and fast first paint
- **Client-side WebSocket on tracking page** — status updates pushed from server, no polling
- **Guest checkout** — no account required; optional email for receipt
- **No card processing UI** — payments handled at pickup/delivery (Phase 7 adds POS terminal card processing)
- **Mobile-first** — designed for 375px viewport, scales up to desktop

## Environment Variables

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080
```

## Getting Started

```bash
cd web/ordering
npm install
npm run dev
# → http://localhost:3000
```

## API Integration

All requests go to the Ktor backend `/public` routes — no auth token needed.
Manager dashboard uses authenticated `/online-orders` routes (separate app in `web/dashboard`).

## Scaffold Status

Phase 4 scaffold. Full UI implementation follows in the client build sprint.
Backend API is fully functional — this README documents the integration contract.

## Page → API Mapping

| Page | API Call |
|---|---|
| Menu browser | `GET /public/menu/{restaurantId}` |
| Place order | `POST /public/orders/{restaurantId}` |
| Track order | `GET /public/track/{trackingToken}` + `ws://.../track/ws?token=` |
