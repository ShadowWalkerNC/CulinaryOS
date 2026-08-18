# Specification Mining & Architecture Report: KDS, POS, Event Spine, Zero-Dependency Local Mode & UI Tokens

**Agent**: Spec Miner 2 (`.agents/explorer_2`)  
**Assignment**: Exploration of apps/kds, apps/pos, apps/server, packages/ui, packages/shared, packages/event-bus, and cross-surface frontend styling.  
**Timestamp**: 2026-08-15T21:19:00-04:00  

---

## 1. 5-Component Handoff Report

### 1.1. Observation
- **KDS & Course Firing Architecture**:
  - `packages/shared/src/course-engine.ts` (lines 8–10): `initialHoldStatus(courseNumber)` deterministically flags Course 1 as `'firing'` and any Course $\ge 2$ as `'held'`.
  - `packages/event-bus/src/handlers/pos-order-created.ts` (lines 36–91): When POS emits `pos:order:created`, items are grouped by unique `station::courseNumber` pairs. Course 1 generates active tickets with `status = 'fired'`, `course_hold_status = 'fired'`, and `fired_at = now()`. Course 2+ generates held tickets with `status = 'queued'`, `course_hold_status = 'held'`, and `fired_at = null`. Outbox notifications are inserted into `pending_push`.
  - `apps/server/src/routes/orders.ts` (lines 359–436): `POST /v1/orders/:id/fire-course` accepts `{ courseNumber, serverName }` (validates `courseNumber >= 2`), updates held tickets to `course_hold_status = 'fired'`, `status = 'queued'`, logs to `course_fire_log`, and emits `kds:course:fired`.
  - `apps/kds/src/pages/Station.tsx` (lines 76–101, 214–239) & `apps/server/src/routes/kds.ts` (lines 122–152): Allows line chefs/expo to directly fire a held course via `PATCH /v1/kds/tickets/:id/fire`.
  - `apps/kds/src/hooks/useCourseFiredNotices.ts` & `apps/kds/src/components/CourseHoldBanner.tsx`: Subscribes to `course_fire_log` via Supabase Realtime to render an animated banner with flame icon and ticket count when a held course is released.
- **Station Routing & Bump Workflows**:
  - `packages/shared/src/stations.ts` (lines 6–53): Defines bidirectional mapping between UI Station IDs (`'expo'`, `'1'`, `'2'`, `'3'`, `'4'`, `'all'`) and database stations (`'grill'`, `'hot'`, `'cold'`, `'fry'`, `'bar'`, `'pastry'`, `'sauce'`, `'pass'`).
  - `apps/kds/src/pages/Station.tsx` (lines 104–114, 196–227): The Expo Pass (`stationId === 'expo'`) displays all stations, shows both held and fired tickets, and renders a live Station Status Bar (`hotGrill`, `coldPrep`, `fryer`, `bar`, and `heldCourses`). Individual station screens (`'1'`, `'2'`, `'3'`, `'4'`) filter out held tickets until released.
  - `apps/kds/src/components/BumpButton.tsx` (lines 14–68) & `apps/server/src/routes/kds.ts` (lines 88–119): `PATCH /v1/kds/tickets/:id/bump` transitions tickets to `status = 'bumped'` with timestamp `bumped_at`.
  - `packages/event-bus/src/handlers/kds-ticket-bumped.ts` (lines 14–42): Checks remaining tickets for the order. If all tickets are bumped, advances `pos_orders.status` to `'ready'`; if partial, updates to `'in-progress'`.
  - `apps/kds/src/components/TicketCard.tsx` (lines 12–22, 184–211): Real-time ticket aging timers change colors and alerts: Normal `< 300s` (Green), Amber Alert `300s–599s` (Amber), Red Alert `\ge 600s` (Red).
  - `apps/server/src/routes/kds.ts` (lines 284–303): Implements `GET /v1/kds/htmx-cards` for lightweight zero-JS kiosk hardware bump workflows.
- **Zero-Dependency Local Demo Mode**:
  - `apps/server/src/lib/secrets.ts` (lines 5–9) & `apps/server/src/middleware/auth.ts` (lines 11–15, 56–148): Detects missing/placeholder Supabase credentials and activates `AUTH_RELAXED = true` demo mode without throwing 500s.
  - `apps/server/src/routes/auth.ts` (lines 28–113) & `apps/server/src/lib/pin.ts`: Supports demo PINs `1234` (server: John Doe) and `5678` (manager: Jane Smith), returning a device token session. Live mode authenticates against `staff_pins` with salted scrypt hashing and Supabase Auth.
  - `apps/server/src/lib/mock-kitchen.ts` (lines 45–172): In-memory kitchen ticket store (`mockTickets`) supports `createMockTicketsFromOrder()`, `bumpMockTicket()`, `fireMockTicket()`, and station filtering.
  - `packages/shared/src/offline-sync.ts` (lines 33–124) & `apps/pos/src/components/ConnectionStatus.tsx`: Enqueues delta actions (`create_order`, `add_line_item`, `apply_discount`, `finalize_payment`, `void_order`) with UUIDv4 IDs into `localStorage['culinaryos_offline_transaction_queue']`. Replays to `POST /v1/pos/sync-deltas` on reconnect and only marks confirmed IDs as `synced: true`.
  - `apps/kds/src/hooks/useRealtimeTickets.ts` (lines 231–292): When Supabase is offline, polls `GET /v1/kds/tickets` against `apps/server` every 2s, allowing orders sent from POS (:5172) to appear on KDS (:5173) in real-time without database dependencies.
- **UI Styling & Design Token Consistency**:
  - `packages/ui/src/culinary-theme.css`: Canonical Corporate Modern / Stitch design tokens (`--cos-brand: #0f172a`, `--cos-bg: #f8f9fa`, `--cos-surface: #ffffff`, `--cos-border: #e5e7eb`, `--cos-green: #16a34a`, `--cos-amber: #d97706`, `--cos-red: #dc2626`) and utility classes (`.cos-card`, `.cos-btn`, `.cos-badge`, `.cos-section-nav`, `.cos-cart-fab`).
  - `packages/ui/src/` exports `CulinaryHeader`, `CulinaryCard`, `CulinaryButton`, and `CulinaryBadge`.
  - `apps/pos` (:5172): Mounts `CulinaryHeader`, has Tailwind, but heavily uses hardcoded hex utilities (`bg-[#0f172a]`, `border-[#e5e7eb]`, `text-[#1f2937]`).
  - `apps/kds` (:5173): Mounts `CulinaryHeader`, disables Tailwind Preflight, and uses a dark low-light kitchen palette (`--bg: #0b1220`, `--surface: #131c2e`, `--accent: #93b4ff`).
  - `apps/admin` (:5174): **Critical Inconsistency**: Missing Tailwind/PostCSS configs. `Pantry.tsx` imports `CulinaryHeader` and uses dark inline table styles (`#1a1d27`, `#2e3150`), while `Menu.tsx` and `Staff.tsx` do not import `CulinaryHeader`, lack `@culinaryos/ui` components, and use light inline styles with a raw manual `<nav>`.
  - `apps/web` (:5176): Mounts `CulinaryHeader`, uses custom orange accent token (`--accent: #ff5f1f`), has no Tailwind config, and relies on `src/index.css`.

### 1.2. Logic Chain
1. *Observation*: `apps/server/src/routes/orders.ts` accepts client snapshots in `PATCH /v1/orders/:id/send` during demo mode, generating tickets in `apps/server/src/lib/mock-kitchen.ts`.
2. *Inference*: The event spine is decoupled from live PostgreSQL; `apps/server` acts as the local shared mock hub so separate Vite origins (`:5172` and `:5173`) can communicate without Supabase.
3. *Observation*: `apps/kds/src/hooks/useRealtimeTickets.ts` polls `GET /v1/kds/tickets` every 2000ms when `!supabase`.
4. *Inference*: In demo mode, tickets appear on the KDS board within 2 seconds of the POS user clicking "Send to Kitchen".
5. *Observation*: `apps/admin/src/pages/Menu.tsx` and `Staff.tsx` do not import `CulinaryHeader` or use `@culinaryos/ui`, and have hardcoded light `<nav>` elements, whereas `Pantry.tsx` imports `CulinaryHeader` and uses dark styling.
6. *Inference*: `apps/admin` suffers from fragmented styling and layout drift that needs consolidation under `@culinaryos/ui`.

### 1.3. Caveats
- Browser-only demo mode (without `apps/server` running on `:3000`) relies on `localStorage`, which cannot cross origins between `:5172` and `:5173`. Running `apps/server` is required for cross-app local demo sync.
- In offline demo mode, closed-loop pantry ingredient deductions are tracked in memory and do not persist across server restarts unless Supabase or SQLite persistence is configured.

### 1.4. Conclusion
The POS-to-KDS spine, multi-course holding, course firing, station routing, PIN authentication, and offline sync queue are fully operational with robust demo mode fallbacks. The primary technical gaps reside in:
1. Fragmented styling and missing Tailwind configuration in `apps/admin`.
2. Hardcoded styling in `apps/pos` views that should adopt `@culinaryos/ui` design tokens.
3. Missing automated course progression (auto-firing Course N+1 upon completing Course N) in live runtime.

### 1.5. Verification Method
- Run all test suites: `node ./scripts/run-all-tests.cjs`
- Typecheck monorepo: `pnpm run typecheck`
- Test course firing unit tests: `bun test tests/course-firing/` or `node -r ./scripts/test-hook.cjs tests/course-firing/engine.test.ts`
- Test POS-to-KDS fire integration: `bun test tests/server/pos-kds-fire.test.ts`
- Test offline sync queue: `bun test tests/shared/offline-sync.test.ts`
- Test PIN auth: `bun test tests/server/auth-pin-login.test.ts`

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | KDS & POS | Multi-Course Holding | Groups order items by course; holds course $\ge 2$ while releasing course 1 | `OrderItem[]` with `courseNumber` | `KitchenTicket[]` with `courseHoldStatus = 'held'` \| `'firing'` | Default to course 1 if undefined | `packages/shared/src/course-engine.ts:8` |
| 2 | KDS & POS | Manual Course Fire | Allows servers or expo chefs to fire held course 2+ | `orderId`, `courseNumber >= 2`, `serverName` | Updated ticket status `'queued'` & `fired_at` timestamp | 422 if `courseNumber < 2`; 404 if no held tickets | `apps/server/src/routes/orders.ts:359` |
| 3 | KDS & POS | Direct KDS Card Fire | Line cook or expo releases a single held ticket from the card UI | `ticketId` | Ticket status updated to `'fired'` / `'cooking'` | 404 if ticket not found | `apps/kds/src/pages/Station.tsx:76` |
| 4 | KDS & POS | Course Fired Flash Banner | Full-width animated green banner announcing course release | `CourseFireEvent` from `course_fire_log` | Banner with flame icon, ticket count, 4.2s auto-fade | Null when event is null | `apps/kds/src/components/CourseHoldBanner.tsx:13` |
| 5 | KDS & POS | Station Routing Matrix | Bidirectional mapping between UI tabs and database station strings | UI Tab ID (`'1'.. '4'`, `'expo'`, `'all'`) | Station array (`['grill', 'hot']`, etc.) | Fallback to literal station ID | `packages/shared/src/stations.ts:6` |
| 6 | KDS & POS | Expo Pass Overview Bar | Head chef station displaying live count of fired tickets across all stations | Active tickets on Expo board | Counters for Hot Grill, Cold Prep, Fryer, Bar, and Held | 0 count on empty stations | `apps/kds/src/pages/Station.tsx:107` |
| 7 | KDS & POS | Line Station Ticket Isolation | Hides held courses from line cook stations until fired | Station filter & tickets | Only fired tickets for assigned station | Empty state message if all clear | `apps/kds/src/hooks/useRealtimeTickets.ts:242` |
| 8 | KDS & POS | Tactile Bump Bar | Large touch button with active scale and async spinner for bumping tickets | `ticketId`, `stationId` | Ticket marked `'bumped'`, removed from active board | Button disabled while in-flight | `apps/kds/src/components/BumpButton.tsx:14` |
| 9 | KDS & POS | Order Status Auto-Advance | Advances POS order to `'ready'` if all tickets bumped, else `'in-progress'` | `kds:ticket:bumped` event with `orderId` | `pos_orders.status` update | Log error if DB query fails | `packages/event-bus/src/handlers/kds-ticket-bumped.ts:14` |
| 10 | KDS & POS | Aging Timers & Alerts | Real-time elapsed timer with Green (<5m), Amber (5-10m), and Red (>10m) alerts | `firedAt` or `createdAt` timestamp | Formatted `mm:ss` string and badge color | Defaults to 0s if timestamp missing | `apps/kds/src/components/TicketCard.tsx:12` |
| 11 | KDS & POS | Station Analytics Bar | Bottom footer displaying avg ticket time, bump rate, queue depth, held count | Station ID, period (default 60m) | JSON analytics summary object | Returns 0s if no bumped tickets | `apps/kds/src/components/AnalyticsBar.tsx:17` |
| 12 | KDS & POS | HTMX Kiosk Cards | Zero-JS server-rendered HTML cards with inline bump action for embedded hardware | `GET /v1/kds/htmx-cards` | HTML snippet with `hx-patch` | HTML-escaped text | `apps/server/src/routes/kds.ts:284` |
| 13 | Event Spine | POS Order Send Spine | Dispatches order snapshot from POS terminal to backend event bus | `PATCH /v1/orders/:id/send` | Created kitchen tickets, pantry deduct event, plate economics | 409 if order already sent | `apps/server/src/routes/orders.ts:272` |
| 14 | Event Spine | Outbox Reconnect Catch-up | Records ticket events in `pending_push` table for offline/reconnecting screens | Domain event payload | Outbox rows with `delivered_at` status | Best-effort insert, silent fail if missing | `packages/event-bus/src/handlers/pos-order-created.ts:79` |
| 15 | Event Spine | Realtime Bridge Broadcast | Mirrors PostgreSQL change feeds to tenant broadcast channels (`kds:{tenantId}`, `pos:{tenantId}`) | DB change triggers | Broadcast websocket frames | Logs offline skip if Supabase unset | `packages/event-bus/src/realtime-bridge.ts:39` |
| 16 | Demo Mode | In-Memory Mock Kitchen | Server in-memory ticket store supporting multi-station and multi-course simulation | Order item list | `MockKitchenTicket[]` array | None (in-memory) | `apps/server/src/lib/mock-kitchen.ts:88` |
| 17 | Demo Mode | PIN Authentication (1234/5678) | Terminal lock screen PIN login for quick staff identification | `pin: '1234' \| '5678'`, `tenant_id` | Session with role (`server` / `manager`) and device token | 401 on invalid PIN; 422 on bad format | `apps/server/src/routes/auth.ts:28` |
| 18 | Demo Mode | Offline LocalStorage Delta Queue | Client-side queue for transactions during network disconnection | `OfflineTransactionDelta` | Queued in `localStorage`, replayed on reconnect | Preserves unsynced queue on network error | `packages/shared/src/offline-sync.ts:33` |
| 19 | Demo Mode | Delta Replay & Confirmation | Server replay endpoint processing offline payment, order creation, and void deltas | `POST /v1/pos/sync-deltas` | `{ confirmedIds: string[], applied: number }` | Rejects card without capture authorization | `apps/server/src/routes/pos-sync.ts:24` |
| 20 | Demo Mode | Live Connection Indicator | Status badge displaying Live, Connecting, or Offline/Demo mode | Presence channel & `navigator.onLine` | Visual status dot and label | Flushes pending deltas upon reconnect | `apps/pos/src/components/ConnectionStatus.tsx:6` |
| 21 | UI Design | Universal Header | Master navigation bar with brand logo, module tabs (:5172, :5173, :5174, :5176), and status | `activeModule`, `tenantName`, `serverStatus` | Standardized header component | Defaults to 'connected' | `packages/ui/src/CulinaryHeader.tsx:9` |
| 22 | UI Design | Unified Design System CSS | Corporate Modern CSS variables, typography tokens, and utility classes | `culinary-theme.css` | `--cos-*` tokens, `.cos-card`, `.cos-btn`, `.cos-badge` | Fallbacks to system-ui | `packages/ui/src/culinary-theme.css:1` |
| 23 | UI Design | Reusable UI Components | Pre-built primitives: CulinaryButton, CulinaryCard, CulinaryBadge | Props: `variant`, `size`, `className` | Styled JSX elements | Standard HTML attributes | `packages/ui/src/index.ts:1` |

---

## 3. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Course Hold Status | Order with single course (`courseNumber = 1`) | Generates ticket with `courseHoldStatus = 'firing'` and `status = 'fired'`. Line cooks see it immediately. |
| 2 | Course Hold Status | Order with multiple courses (`courseNumber = 2, 3`) | Generates tickets with `courseHoldStatus = 'held'` and `status = 'queued'`. Held tickets are hidden on line stations (`1..4`) but visible on Expo (`expo`). |
| 3 | Manual Course Fire | `POST /v1/orders/:id/fire-course` with `courseNumber = 1` | Server rejects with HTTP 422: `courseNumber must be 2 or greater`. |
| 4 | Manual Course Fire | `POST /v1/orders/:id/fire-course` on voided or paid order | Server rejects with HTTP 409: `Cannot fire course on a voided/paid order`. |
| 5 | POS Order Send | Client fires order with no live Supabase configured | Order snapshot in request body is parsed by `apps/server`, generating tickets in `mock-kitchen.ts`. Returns `ticketCount: N`. |
| 6 | POS Order Send | Repeat send request for already sent order | Server returns idempotent success with `{ alreadySent: true, ticketCount: 0 }`. |
| 7 | Offline Sync Replay | Offline card payment without `allow_offline_card` flag | Server rejects delta with `card payments require online capture`, preventing invalid charge replay. |
| 8 | Offline Sync Replay | API returns HTTP 200 without `confirmedIds` list | Client queue refuses to clear, preventing data loss on unconfirmed responses. |
| 9 | Station Filtering | KDS station query `?station=1` | Shared resolver matches tickets with `station = 'grill'` or `station = 'hot'`. |
| 10 | Station Filtering | KDS station query `?station=expo` | Returns all tickets across all stations, including held courses. |
| 11 | Aging Timers | Ticket cooking for 301 seconds | Elapsed timer shifts from Green (`#34d399`) to Amber Alert (`#fbbf24`). Card top border changes to amber. |
| 12 | Aging Timers | Ticket cooking for 605 seconds | Elapsed timer shifts to Red Alert (`#f87171`). Card top border turns red. |
| 13 | PIN Login | Entering `1234` in demo mode | Returns server session for John Doe with device API key without contacting external Supabase Auth. |
| 14 | PIN Login | Entering `0000` (unregistered PIN) | Returns HTTP 401: `Invalid PIN. Demo PINs: 1234 (server), 5678 (manager)`. |
| 15 | PIN Login | Entering non-numeric or 2-digit PIN | Returns HTTP 422: `PIN must be 4–8 digits`. |
| 16 | Bump Order Transition | Last ticket for an order is bumped | Event handler detects `allBumped === true` and transitions parent `pos_orders.status` to `'ready'`. |
| 17 | Bump Order Transition | 1 of 3 tickets bumped | Event handler detects `allBumped === false` and transitions parent `pos_orders.status` to `'in-progress'`. |
| 18 | Admin Page Navigation | Navigating to `/pantry` in Admin app | Renders `CulinaryHeader` with dark theme table. Navigating to `/menu` switches to a light page with no `CulinaryHeader` and a raw text navigation bar. |

---

## 4. Detailed Technical Architecture & Flow Analysis

### 4.1. POS & KDS Multi-Course Holding & Firing Spine
```
[POS Client :5172]
       │
       │  PATCH /v1/orders/:id/send (includes snapshot)
       ▼
[Server Route: orders.ts]
       │
       ├─► [Event Bus: pos:order:created]
       │         │
       │         ├─► Group items by station::courseNumber
       │         ├─► Course 1 -> status: fired, holdStatus: firing
       │         ├─► Course 2+ -> status: queued, holdStatus: held
       │         ├─► Write to kitchen_tickets + ticket_items
       │         ├─► Emit pos:menu:item-sold (pantry deduction)
       │         └─► Calculate theoretical cost -> plate_economics
       │
       └─► [Offline Fallback: mock-kitchen.ts]
                 └─► In-memory mock tickets created for KDS polling
```

### 4.2. Course Firing & Release Lifecycle
1. **Initial Placing**:
   - Course 1 items are sent to the kitchen immediately upon firing (`status: 'fired'`, `courseHoldStatus: 'firing'`).
   - Course 2+ items start as held (`status: 'queued'`, `courseHoldStatus: 'held'`).
2. **Line Station Visibility**:
   - Station views (`/station/1`, `/station/2`, etc.) filter query by `course_hold_status = 'fired'`. Held items do not clutter the active cooking board.
3. **Expo Pass Visibility**:
   - Expo Pass (`/station/expo`) displays all tickets. Held tickets display a distinct amber `HELD` badge with a pause icon.
   - Real-time station counter displays total held courses currently waiting.
4. **Course Release Trigger**:
   - **Method A (POS Server Fire)**: Server calls `POST /v1/orders/:id/fire-course` with `{ courseNumber: 2 }`. Updates held tickets to `fired` and logs to `course_fire_log`.
   - **Method B (KDS Direct Fire)**: Expo or lead cook clicks "Fire Course 2" on the ticket card (`PATCH /v1/kds/tickets/:id/fire`).
5. **Real-Time Notification**:
   - `useCourseFiredNotices` detects insert into `course_fire_log`.
   - `CourseHoldBanner` animates down across all KDS screens announcing the course release.

### 4.3. Zero-Dependency Local Demo Mode Architecture
- **No-Config Boot**: Setting `SUPABASE_URL` to a placeholder or omitting it triggers `isLiveSupabaseConfigured() === false`. The server enables `AUTH_RELAXED` mode.
- **PIN Terminal Auth**:
  - `POST /v1/auth/pin-login` handles credentials in memory. Demo PINs `1234` (server) and `5678` (manager) issue instant valid sessions with device tokens.
- **Cross-Port State Sync**:
  - POS running on `:5172` and KDS running on `:5173` are separate browser origins.
  - When POS fires an order, it sends the full order payload in `PATCH /v1/orders/:id/send` to `apps/server` (:3000).
  - `apps/server` populates its in-memory `mockTickets` store.
  - KDS polls `GET /v1/kds/tickets` every 2000ms, immediately picking up new tickets.
- **Offline Transaction Resilience**:
  - All POS operations (order creation, line items, discounts, voids, payments) are enqueued into `localStorage['culinaryos_offline_transaction_queue']`.
  - Upon network reconnection, `ConnectionStatus` triggers `flushOfflineQueue()`. Deltas are sent to `POST /v1/pos/sync-deltas`. Confirmed IDs are marked `synced: true`.

### 4.4. Cross-Surface UI Design Token & Styling Consistency Audit

```
┌────────────────────────────────────────────────────────────────────────┐
│                      packages/ui (@culinaryos/ui)                      │
│   • culinary-theme.css (--cos-brand: #0f172a, --cos-bg: #f8f9fa, etc.) │
│   • CulinaryHeader, CulinaryCard, CulinaryButton, CulinaryBadge        │
└────────────────────────────────────────────────────────────────────────┘
        ▲                     ▲                    ▲                 ▲
        │                     │                    │                 │
┌───────┴────────┐   ┌────────┴────────┐   ┌───────┴────────┐  ┌─────┴──────────┐
│   apps/pos     │   │    apps/kds     │   │   apps/admin   │  │    apps/web    │
│    (:5172)     │   │     (:5173)     │   │    (:5174)     │  │    (:5176)     │
├────────────────┼───┼─────────────────┼───┼────────────────┼──┼────────────────┤
│ • CulinaryHead │   │ • CulinaryHead  │   │ • Inconsistent │  │ • CulinaryHead │
│ • Tailwind OK  │   │ • Dark Kitchen  │   │ • NO Tailwind  │  │ • Custom CSS   │
│ • Hardcoded hex│   │   Theme (--bg:  │   │ • Raw inline   │  │ • Accent:      │
│   utilities    │   │   #0b1220)      │   │   styles       │  │   #ff5f1f      │
│                │   │ • Preflight OFF │   │ • Missing Head │  │                │
└────────────────┘   └─────────────────┘   └────────────────┘  └────────────────┘
```

---

## 5. Concrete Gap Matrix & Recommended Milestone Groupings

### 5.1. Identified Technical & Design Gaps

| ID | Module / Area | Gap Description | Severity | Impact | Recommended Solution |
|---|---|---|---|---|---|
| G1 | `apps/admin` | Missing Tailwind CSS & PostCSS configuration; lacks unified theme imports. | High | Admin app looks disjointed; cannot use Tailwind utility classes. | Add `tailwind.config.js` and `postcss.config.js` to `apps/admin` referencing `packages/ui`. |
| G2 | `apps/admin` | Header & layout inconsistency across pages (`Pantry.tsx` has `CulinaryHeader` with dark styles; `Menu.tsx` and `Staff.tsx` have no header and raw `<nav>`). | High | Broken user experience when switching tabs in Back Office. | Replace inline `<nav>` in `Menu.tsx` and `Staff.tsx` with `CulinaryHeader` and `@culinaryos/ui` components. |
| G3 | `apps/pos` | Views use hardcoded arbitrary Tailwind classes (e.g. `bg-[#0f172a]`, `border-[#e5e7eb]`, `text-[#1f2937]`) instead of design system tokens. | Medium | Theme changes require manual search/replace across multiple POS views. | Standardize classnames to use theme tokens (`bg-brand`, `border-cos`, or `CulinaryButton` / `CulinaryBadge`). |
| G4 | `apps/kds` | Auto course release engine (advancing Course N+1 when all tickets of Course N are bumped) exists in unit tests but lacks automated server-side trigger hook. | Medium | Requires manual server/expo click to fire subsequent courses if auto-advance was expected. | Wire `handleTicketBumped` event handler to check for remaining held courses and auto-fire Course N+1 when Course N is fully bumped. |
| G5 | `apps/web` | Public ordering storefront uses custom `--accent: #ff5f1f` without Tailwind integration. | Low | Functional, but doesn't share Tailwind configuration with POS/Admin. | Optionally add Tailwind config to `apps/web` with `brand-web: '#ff5f1f'`. |

---

### 5.2. Recommended Milestone Groupings

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Milestone 1: Core Event Spine, POS/KDS Course Workflow & Demo Mode (Current) │
│ • POS order send event spine (pos:order:created -> kitchen_tickets).       │
│ • Multi-course holding (courses 2+ held) and course fire endpoints.         │
│ • Station routing (expo pass, grill, cold, fry, bar) and bump transitions. │
│ • Zero-dependency local demo mode (PIN auth 1234/5678, mock kitchen store). │
│ • Offline localStorage transaction queue and sync replay.                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Milestone 2: UI Design Token Unification & Admin Portal Modernization       │
│ • Configure Tailwind and PostCSS in apps/admin.                             │
│ • Mount CulinaryHeader across all apps/admin views (Menu, Staff, Pantry).   │
│ • Refactor hardcoded CSS in apps/pos and apps/admin to use @culinaryos/ui.  │
│ • Verify seamless cross-surface visual fidelity on ports 5172, 5173, 5174.  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Milestone 3: Closed-Loop Automation & Production Hardening                  │
│ • Auto-course advancement trigger upon Course N full bump.                  │
│ • Automated inventory reorder alerts & supplier PO generation.              │
│ • Live Stripe webhook & terminal capture confirmation.                      │
│ • Full end-to-end integration test execution across all modules.            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Verification & Test Suite Summary

- Canonical test runner: `node ./scripts/run-all-tests.cjs`
- Passing test coverage includes:
  - Ratio Engine recipe scaling & costing (`packages/ratio-engine/src/index.test.ts`)
  - Course firing holding status and validation (`tests/course-firing/engine.test.ts`)
  - KDS station routing and aging timer thresholds (`tests/kds/station.test.ts`)
  - Server POS-to-KDS order fire path (`tests/server/pos-kds-fire.test.ts`)
  - PIN authentication demo & live modes (`tests/server/auth-pin-login.test.ts`)
  - Offline sync engine queue and replay (`tests/shared/offline-sync.test.ts`)
  - Station mapping helpers (`tests/shared/stations.test.ts`)
