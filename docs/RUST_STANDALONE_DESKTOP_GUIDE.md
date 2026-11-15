# CulinaryOS — Native Rust Standalone Desktop & Local Server Guide

> **Public Open-Source Repository:** [`ShadowWalkerNC/CulinaryOS`](https://github.com/ShadowWalkerNC/CulinaryOS)
> **Commercial SaaS Cloud Bridge Repository (Private):** [`ShadowWalkerNC/CulinaryOS-SaaS`](https://github.com/ShadowWalkerNC/CulinaryOS-SaaS)

---

## 1. Overview & Open-Core Boundary

CulinaryOS is unified into a root **Rust Cargo Workspace** ([`Cargo.toml`](../Cargo.toml)) compiled with `#![forbid(unsafe_code)]`.

Every restaurant—whether running the **Free Open-Source Community Edition** or subscribing to **CulinaryOS SaaS**—installs and runs the native Rust binaries locally on-premise so that Point-of-Sale (POS), Kitchen Display Systems (KDS), ESC/POS thermal/impact printers, and 24V cash drawers operate at sub-millisecond LAN speed with zero internet dependency.

### Workspace Crates & Binaries

| Binary / Crate | Path | Description |
|---|---|---|
| `culinaryos-desktop` | [`apps/desktop/src-tauri`](../apps/desktop/src-tauri) | Standalone restaurant workstation executable (`culinaryos-desktop.exe`). Auto-provisions the zero-config embedded database (`%APPDATA%/CulinaryOS/culinaryos.db` or `~/.local/share/culinaryos/culinaryos.db`), binds the local Axum HTTP/UI server (`127.0.0.1:3000`), and launches the workstation shell. |
| `culinaryos-site` (`culinaryos-native`) | [`packages/native`](../packages/native) | Local LAN server & SaaS Cloud Bridge node (`culinaryos-site.exe`). Supports Dual-Engine storage: Embedded Local Store out-of-the-box or PostgreSQL `001-009` when `DATABASE_URL` is configured. |
| `culinaryos-edge-daemon` | [`packages/hardware/daemon`](../packages/hardware/daemon) | Direct TCP (`:9100`) and USB ESC/POS receipt printer spooler and RJ11/RJ12 cash drawer pulse daemon (`culinaryos-edge-daemon.exe`). |

---

## 2. Building, Testing & Running the Rust Binaries

```bash
# 1. Run the full Rust workspace unit & integration test suite
cargo test --workspace

# 2. Run the standalone desktop binary self-test (verifies embedded DB + HTTP + SaaS bridge readiness)
cargo run --bin culinaryos-desktop -- --self-test

# 3. Launch the standalone desktop workstation on port 3000
cargo run --release --bin culinaryos-desktop -- --port 3000

# 4. Run the headless local LAN site server (Dual-Engine: Embedded DB or DATABASE_URL Postgres)
cargo run --release --bin culinaryos-site

# 5. Run the ESC/POS hardware printer & cash drawer daemon
cargo run --release --bin culinaryos-edge-daemon
```

---

## 3. Dual-Engine Storage Architecture

1. **Zero-Config Embedded Mode (Default — No `DATABASE_URL` Required):**
   - Implemented in [`packages/native/src/local_store.rs`](../packages/native/src/local_store.rs).
   - Stores state in a crash-safe, SHA-256 checksum-verified envelope (`NamedTempFile` atomic rename) with starter menu items, default staff PINs (`1234` Owner / `5678` Server), POS orders, station-routed KDS tickets (`grill`, `fry`, `salad`, `expo`), idempotent cash payments, cash drawer shift closeouts, and outbound SaaS Cloud Bridge event outbox queues.
2. **PostgreSQL Production / Multi-Terminal Mode (`DATABASE_URL` Set):**
   - Automatically applies SQL migrations `001_site_enrollment.sql` through `009_audit_hardening.sql` in [`packages/native/migrations/`](../packages/native/migrations/).
   - Enforces device pairing (`device_pairing_sessions`, `enrolled_devices`), durable command idempotency (`processed_device_operations`), and append-only audit logs.

---

## 4. Standalone HTTP API & Workstation Endpoints (`packages/native/src/standalone.rs`)

| Method & Path | Description |
|---|---|
| `GET /` | Embedded Native Rust Workstation HTML UI (POS + KDS + Cloud Bridge HUD) |
| `GET /health` & `GET /ready` | Liveness and readiness probes (`mode`, `siteId`, `cloudBridge`) |
| `POST /v1/auth/pin-login` | Staff PIN authentication (`1234` Owner, `5678` Server) |
| `GET /v1/menu` | Active restaurant menu items (prices in integer cents) |
| `GET /v1/orders` & `POST /v1/orders` | List or create dining room / counter / online orders in integer cents |
| `POST /v1/orders/{id}/send` | Fire order to kitchen stations and generate KDS tickets |
| `GET /v1/kds/tickets` | List active or bumped KDS tickets (filterable by `?station=`) |
| `POST /v1/kds/tickets/{id}/bump` | Bump a kitchen ticket (`bumpedBy`, `nowUnix`) |
| `POST /v1/payments/cash` | Idempotent integer-cent cash settlement (`operationId`, `orderId`, `amountCents`) |
| `POST /v1/drawers/close` | Close cash drawer shift and calculate integer-cent variance (`actualCountedCents - expectedCents`) |
| `POST /v1/tips/calculate` | Hours-weighted tip pool distribution with **hardcoded FLSA 29 U.S.C. 203(m)(2)(B)** exclusion of owners, managers, and supervisors |
| `GET /v1/cloud/status` | Inspect current SaaS Cloud Bridge connection status, unlocked add-ons, and pending outbox count |
| `POST /v1/cloud/connect` | Enroll the local Rust application with a signed `SignedSaasGrant` token from CulinaryOS SaaS |
| `POST /v1/cloud/sync` | Package pending local events into a SHA-256 verified `CloudSyncEnvelope` (`cloud_storage_sync`) |
| `POST /v1/cloud/inbound-orders` | Accept online storefront orders relayed from the SaaS Cloud Bridge (`online_ordering_bridge`) and auto-fire to KDS |

---

## 5. Connecting the Installed Rust App to CulinaryOS SaaS

While the standalone Rust application is 100% functional offline forever, subscribing to **CulinaryOS SaaS** (`https://culinaryos-demo.up.railway.app` / `https://culinaryos-api.up.railway.app`) issues a signed `SignedSaasGrant` token (`HMAC-SHA256`) that unlocks cloud-hosted capabilities in [`packages/native/src/cloud_bridge.rs`](../packages/native/src/cloud_bridge.rs):

- `cloud_storage_sync` — Offsite SHA-256 verified cloud backup & delta replication
- `online_ordering_bridge` — Public online storefront orders relayed into local KDS
- `ai_autopilot` — Predictive prep scaling, waste forecasting & 86 countdowns
- `multi_unit_commissary` — Multi-location commissary transfer orders & enterprise rollups
- `managed_stripe_connect` — Bring-Your-Own-Stripe Connect Standard (SAQ-A compliant)

```bash
# Connect your local Rust node to CulinaryOS SaaS
curl -X POST http://127.0.0.1:3000/v1/cloud/connect \
  -H "Content-Type: application/json" \
  -d '{
    "signedGrant": {
      "payload": {
        "grantId": "grant-001",
        "customerId": "cust-alley-katz",
        "siteId": "00000000-0000-0000-0000-000000000001",
        "planTier": "saas_pro",
        "addons": ["ai_autopilot", "cloud_storage_sync", "managed_stripe_connect", "online_ordering_bridge"],
        "cloudEndpoint": "https://culinaryos-api.up.railway.app",
        "issuedAtUnix": 1763220000,
        "expiresAtUnix": 1765812000,
        "offlineGraceSeconds": 86400
      },
      "signatureHex": "<hmac-sha256-signature>"
    },
    "nowUnix": 1763220100
  }'
```
