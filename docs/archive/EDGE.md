# CulinaryOS Edge Architecture & Local Restaurant Node

> **Document Version:** 1.0.0
> **Target Hardware:** Raspberry Pi 5 (Early Prototypes), Compute Module 5 (Production Appliances)
> **Execution Runtime:** Rust (Low-level edge daemons) + TypeScript (Application / Platform layer)

---

## 1. Edge Node Mission & Reliability Invariant

In high-tempo restaurant environments, internet outages are guaranteed to happen during peak service dinner rushes.

> [!IMPORTANT]
> **The CulinaryOS Edge Node Rule:**
> If the WAN connection to the cloud drops, local restaurant operations **must not stop**.
> FOH servers must take orders and swipe cards. BOH line cooks must receive tickets on KDS. Thermal receipt and kitchen dot-matrix printers must fire without latency.

---

## 2. Hardware Architecture: Raspberry Pi 5 & CM5

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      CulinaryOS Edge Appliance                         │
│                    (Raspberry Pi 5 / CM5 Carrier)                      │
│                                                                        │
│  ┌─────────────────────────┐         ┌───────────────────────────────┐ │
│  │   Rust Edge Daemon      │         │     Node/TypeScript Runtime   │ │
│  │   (Raw USB, BLE, GPIO)  │◀───────▶│     (Local SQLite/Sync Engine)│ │
│  │                         │  IPC/   │                               │ │
│  │  - ESC/POS print spool  │  Local  │  - Local POS/KDS HTTP router  │ │
│  │  - Drawer kick trigger  │  Socket │  - Local Event Bus queue      │ │
│  │  - BLE Temp sensors     │         │  - Durable delta storage      │ │
│  │  - Barcode scanner HID  │         │  - Idempotent cloud sync      │ │
│  └─────────────────────────┘         └───────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Local LAN (Switch / Wi-Fi AP)
                 ┌───────────────────┼───────────────────┐
                 ▼                   ▼                   ▼
          [POS Tablets]       [KDS Displays]      [Thermal Printers]
```

### Why Raspberry Pi 5 & CM5?
1. **Performance:** Quad-core Arm Cortex-A76 @ 2.4GHz with hardware cryptography, dual 4Kp60 HDMI outputs for KDS displays, and PCIe 2.0 interface for high-speed NVMe storage.
2. **Peripheral Connectivity:** 2x USB 3.0, 2x USB 2.0, Gigabit Ethernet, Bluetooth 5.0 / BLE, and 40-pin GPIO for hardware relays (buzzers, stack lights, drawer kick).
3. **Form Factor:** Low thermal dissipation, fanless DIN-rail or kitchen wall-mount enclosure options, low power draw (<15W).

---

## 3. Polyglot Architecture: Rust + TypeScript

| Layer | Language | Purpose | Rationale |
| :--- | :--- | :--- | :--- |
| **Edge Hardware Driver** | **Rust** | USB, Serial, BLE, GPIO, raw ESC/POS rasterization | Zero garbage collection pauses, memory safety, crash-proof socket listener, deterministic latency (<1ms) |
| **Local Service & API** | **TypeScript** | Local REST API, KDS WebSocket broadcast, business rules | Shared contracts with cloud platform, high developer velocity, monorepo code reuse |
| **Local Datastore** | **SQLite / DuckDB** | Transaction queue, cached menu, offline authorization logs | Crash-safe ACID transactions, zero-config embedded storage |

---

## 4. Offline Order Continuity & Sync Contract

When internet connectivity is severed:
1. **Local Authoritative Mode:** The Edge Node acts as the authoritative local coordinator.
2. **Order Enqueueing:** Every POS order and KDS state transition is written to the local durable event queue.
3. **Receipt & Ticket Dispatch:** Raw ESC/POS commands are immediately dispatched to local LAN printers.
4. **Offline Payment Containment:** Stripe Terminal offline-mode PaymentIntents are securely quarantined in the encrypted tamper-resistant store. Non-cash settlements are validated with human manager PINs.
5. **Reconciliation on Reconnect:**
   - Once WAN connectivity is restored, the sync daemon replays queued domain events sequentially.
   - Each event includes an immutable `idempotency_key`, `device_id`, and `tenant_id`.
   - The cloud server processes deltas with `ON CONFLICT DO NOTHING`, guaranteeing zero duplicate charges.
