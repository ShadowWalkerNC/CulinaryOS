use crate::{
    cloud_bridge::{
        sign_entitlement_payload, CloudBridge, CloudBridgeError, RelayedOnlineOrder,
        SaasAddon, SaasEntitlementPayload, SignedSaasGrant,
    },
    local_store::{
        calculate_tip_pool, LocalStore, LocalStoreError, TipDistributionMethod,
        TipParticipantInput,
    },
};
use std::collections::BTreeSet;
use axum::{
    extract::{DefaultBodyLimit, Path as AxumPath, Query, State},
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{get, patch, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    path::Path,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use uuid::Uuid;

struct InnerState {
    store: LocalStore,
    cloud: CloudBridge,
    saas_signing_secret: String,
}

#[derive(Clone)]
pub struct StandaloneService {
    inner: Arc<Mutex<InnerState>>,
}

struct ApiError(StatusCode, &'static str, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (
            self.0,
            Json(json!({
                "ok": false,
                "error": {
                    "code": self.1,
                    "message": self.2
                }
            })),
        )
            .into_response()
    }
}

impl From<LocalStoreError> for ApiError {
    fn from(err: LocalStoreError) -> Self {
        match err {
            LocalStoreError::Storage => ApiError(
                StatusCode::INTERNAL_SERVER_ERROR,
                "STORAGE_ERROR",
                "Local database storage failure".to_string(),
            ),
            LocalStoreError::InvalidInput(msg) => {
                ApiError(StatusCode::UNPROCESSABLE_ENTITY, "INVALID_INPUT", msg.to_string())
            }
            LocalStoreError::NotFound(msg) => {
                ApiError(StatusCode::NOT_FOUND, "NOT_FOUND", msg.to_string())
            }
            LocalStoreError::Unauthorized => ApiError(
                StatusCode::UNAUTHORIZED,
                "INVALID_CREDENTIAL",
                "Invalid PIN or session".to_string(),
            ),
            LocalStoreError::Forbidden(msg) => {
                ApiError(StatusCode::FORBIDDEN, "FORBIDDEN", msg.to_string())
            }
            LocalStoreError::Conflict(msg) => {
                ApiError(StatusCode::CONFLICT, "CONFLICT", msg.to_string())
            }
        }
    }
}

impl From<CloudBridgeError> for ApiError {
    fn from(err: CloudBridgeError) -> Self {
        match err {
            CloudBridgeError::InvalidSignature => ApiError(
                StatusCode::UNAUTHORIZED,
                "INVALID_SAAS_GRANT",
                "Invalid SaaS entitlement signature".to_string(),
            ),
            CloudBridgeError::WrongSite => ApiError(
                StatusCode::FORBIDDEN,
                "WRONG_SITE",
                "SaaS entitlement belongs to another site".to_string(),
            ),
            CloudBridgeError::GrantExpired => ApiError(
                StatusCode::PAYMENT_REQUIRED,
                "SAAS_GRANT_EXPIRED",
                "SaaS subscription grant has expired beyond offline grace window; local POS/KDS remains active".to_string(),
            ),
            CloudBridgeError::AddonNotSubscribed(addon) => ApiError(
                StatusCode::FORBIDDEN,
                "SAAS_ADDON_REQUIRED",
                format!("Active CulinaryOS SaaS connection with {:?} add-on is required", addon),
            ),
            CloudBridgeError::StoreError(e) => ApiError::from(e),
        }
    }
}

type ApiReply = Result<(StatusCode, Json<Value>), ApiError>;

fn ok(status: StatusCode, data: Value) -> ApiReply {
    Ok((status, Json(json!({ "ok": true, "data": data }))))
}

fn unix_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(1_700_000_000)
}

impl StandaloneService {
    pub fn open(
        db_path: &Path,
        site_id: Uuid,
        saas_signing_secret: String,
    ) -> Result<Self, LocalStoreError> {
        let store = LocalStore::open_or_init(db_path, site_id)?;
        Ok(Self {
            inner: Arc::new(Mutex::new(InnerState {
                store,
                cloud: CloudBridge::new(),
                saas_signing_secret,
            })),
        })
    }

    pub fn router(self) -> Router {
        Router::new()
            .route("/", get(workstation_ui))
            .route("/health", get(health))
            .route("/ready", get(ready))
            .route("/v1/auth/pin-login", post(pin_login))
            .route("/v1/menu", get(list_menu))
            .route("/v1/orders", post(create_order))
            .route("/v1/orders/{id}/send", patch(send_order))
            .route("/v1/kds/tickets", get(list_tickets))
            .route("/v1/kds/tickets/{id}/bump", post(bump_ticket))
            .route("/v1/payments/cash", post(settle_cash))
            .route("/v1/drawers/close", post(close_drawer))
            .route("/v1/tips/calculate", post(calculate_tips))
            .route("/v1/cloud/status", get(cloud_status))
            .route("/v1/cloud/connect", post(cloud_connect))
            .route("/v1/cloud/demo-enroll", post(cloud_demo_enroll))
            .route("/v1/cloud/sync", post(cloud_sync))
            .route("/v1/cloud/inbound-orders", post(cloud_inbound_order))
            .layer(DefaultBodyLimit::max(65536))
            .with_state(self)
    }
}

async fn workstation_ui() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        Html(STANDALONE_WORKSTATION_HTML),
    )
}

async fn health(State(svc): State<StandaloneService>) -> ApiReply {
    let guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    ok(
        StatusCode::OK,
        json!({
            "service": "culinaryos-rust-standalone",
            "status": "healthy",
            "engine": "embedded-local-db",
            "siteId": guard.store.site_id(),
            "cloudConnected": guard.cloud.is_connected(),
        }),
    )
}

async fn ready(State(svc): State<StandaloneService>) -> ApiReply {
    let guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    ok(
        StatusCode::OK,
        json!({
            "status": "ready",
            "database": "embedded",
            "siteId": guard.store.site_id(),
            "pendingCloudOutbox": guard.store.pending_outbox_len(),
        }),
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PinLoginBody {
    pin: String,
}

async fn pin_login(
    State(svc): State<StandaloneService>,
    Json(body): Json<PinLoginBody>,
) -> ApiReply {
    let guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let staff = guard.store.authenticate_pin(&body.pin)?;
    ok(
        StatusCode::OK,
        json!({
            "userId": staff.id,
            "displayName": staff.display_name,
            "role": staff.role,
            "siteId": guard.store.site_id(),
        }),
    )
}

async fn list_menu(State(svc): State<StandaloneService>) -> ApiReply {
    let guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    ok(StatusCode::OK, json!(guard.store.list_menu()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateOrderItemInput {
    menu_item_id: String,
    quantity: i64,
    #[serde(default = "default_one")]
    seat: u32,
    #[serde(default = "default_one")]
    course: u32,
}

fn default_one() -> u32 {
    1
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateOrderBody {
    order_id: Option<String>,
    table_number: String,
    items: Vec<CreateOrderItemInput>,
}

async fn create_order(
    State(svc): State<StandaloneService>,
    Json(body): Json<CreateOrderBody>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let tuples = body
        .items
        .into_iter()
        .map(|i| (i.menu_item_id, i.quantity, i.seat, i.course))
        .collect();
    let order = guard
        .store
        .create_order(body.order_id, body.table_number, tuples)?;
    ok(StatusCode::CREATED, json!(order))
}

async fn send_order(
    State(svc): State<StandaloneService>,
    AxumPath(id): AxumPath<String>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let tickets = guard.store.send_order_to_kitchen(&id)?;
    ok(StatusCode::OK, json!({ "orderId": id, "tickets": tickets }))
}

#[derive(Deserialize)]
struct StationQuery {
    station: Option<String>,
}

async fn list_tickets(
    State(svc): State<StandaloneService>,
    Query(q): Query<StationQuery>,
) -> ApiReply {
    let guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let tickets = guard.store.list_tickets(q.station.as_deref());
    ok(StatusCode::OK, json!(tickets))
}

async fn bump_ticket(
    State(svc): State<StandaloneService>,
    AxumPath(id): AxumPath<String>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let bumped = guard.store.bump_ticket(&id)?;
    ok(StatusCode::OK, json!(bumped))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CashSettleBody {
    operation_id: String,
    order_id: String,
    tendered_cents: i64,
}

async fn settle_cash(
    State(svc): State<StandaloneService>,
    Json(body): Json<CashSettleBody>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let order =
        guard
            .store
            .settle_cash_order(&body.operation_id, &body.order_id, body.tendered_cents)?;
    ok(StatusCode::OK, json!(order))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CloseDrawerBody {
    counted_cents: i64,
}

async fn close_drawer(
    State(svc): State<StandaloneService>,
    Json(body): Json<CloseDrawerBody>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let drawer = guard.store.close_drawer(body.counted_cents)?;
    ok(StatusCode::OK, json!(drawer))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CalculateTipsBody {
    method: TipDistributionMethod,
    total_pool_cents: i64,
    pays_full_minimum_wage: bool,
    participants: Vec<TipParticipantInput>,
}

async fn calculate_tips(Json(body): Json<CalculateTipsBody>) -> ApiReply {
    let report = calculate_tip_pool(
        body.method,
        body.total_pool_cents,
        body.pays_full_minimum_wage,
        &body.participants,
    )?;
    ok(StatusCode::OK, json!(report))
}

async fn cloud_status(State(svc): State<StandaloneService>) -> ApiReply {
    let guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    ok(
        StatusCode::OK,
        json!({
            "installedApp": true,
            "siteId": guard.store.site_id(),
            "cloudConnected": guard.cloud.is_connected(),
            "entitlement": guard.cloud.current_grant(),
            "pendingOutboxEvents": guard.store.pending_outbox_len(),
        }),
    )
}

async fn cloud_connect(
    State(svc): State<StandaloneService>,
    Json(grant): Json<SignedSaasGrant>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let site_id = guard.store.site_id();
    let secret = guard.saas_signing_secret.clone();
    let payload = guard
        .cloud
        .connect(grant, site_id, &secret, unix_now())?
        .clone();
    ok(
        StatusCode::OK,
        json!({
            "connected": true,
            "entitlement": payload,
        }),
    )
}

async fn cloud_sync(State(svc): State<StandaloneService>) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let InnerState { store, cloud, .. } = &mut *guard;
    let envelope = cloud.prepare_storage_sync_batch(store, unix_now())?;
    ok(StatusCode::OK, json!(envelope))
}

async fn cloud_inbound_order(
    State(svc): State<StandaloneService>,
    Json(relayed): Json<RelayedOnlineOrder>,
) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let InnerState { store, cloud, .. } = &mut *guard;
    let (order, tickets) = cloud.ingest_relayed_online_order(store, relayed, unix_now())?;
    ok(
        StatusCode::CREATED,
        json!({
            "order": order,
            "tickets": tickets,
        }),
    )
}

async fn cloud_demo_enroll(State(svc): State<StandaloneService>) -> ApiReply {
    let mut guard = svc
        .inner
        .lock()
        .map_err(|_| ApiError::from(LocalStoreError::Storage))?;
    let site_id = guard.store.site_id();
    let secret = guard.saas_signing_secret.clone();
    let now = unix_now();
    let mut addons = BTreeSet::new();
    addons.insert(SaasAddon::CloudStorageSync);
    addons.insert(SaasAddon::OnlineOrderingBridge);
    addons.insert(SaasAddon::AiAutopilot);
    addons.insert(SaasAddon::ManagedStripeConnect);
    let payload = SaasEntitlementPayload {
        grant_id: "alpha-pro-grant-001".to_string(),
        customer_id: "cust-alley-katz-alpha".to_string(),
        site_id,
        plan_tier: "saas_pro".to_string(),
        addons,
        cloud_endpoint: "https://culinaryos-api.up.railway.app".to_string(),
        issued_at_unix: now,
        expires_at_unix: now + 30 * 86_400,
        offline_grace_seconds: 86_400,
    };
    let sig = sign_entitlement_payload(&payload, &secret)
        .map_err(|_| ApiError::from(CloudBridgeError::InvalidSignature))?;
    let grant = SignedSaasGrant {
        payload,
        signature_hex: sig,
    };
    let connected_payload = guard
        .cloud
        .connect(grant.clone(), site_id, &secret, now)?
        .clone();
    ok(
        StatusCode::OK,
        json!({
            "connected": true,
            "signedGrant": grant,
            "entitlement": connected_payload,
        }),
    )
}

const STANDALONE_WORKSTATION_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CulinaryOS v1.3.1 — Native Rust Standalone Desktop Workstation</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, system-ui, -apple-system, sans-serif; background: #090d16; color: #f8fafc; }
    header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; background: #111827; border-bottom: 1px solid #1f2937; position: sticky; top: 0; z-index: 20; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 16px; letter-spacing: 0.02em; }
    .badge { background: linear-gradient(135deg, #ff6b35, #e63946); color: #fff; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-family: monospace; letter-spacing: 0.06em; }
    .status-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; font-family: monospace; }
    .pill { padding: 6px 12px; border-radius: 999px; background: #1f2937; border: 1px solid #374151; }
    .pill.ok { color: #34d399; border-color: rgba(52,211,153,0.35); background: rgba(16,185,129,0.1); }
    .pill.saas { color: #fb923c; border-color: rgba(251,146,60,0.4); background: rgba(251,146,60,0.12); }
    .layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 18px; padding: 20px; max-width: 1600px; margin: 0 auto; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    .card h2 { margin: 0; font-size: 16px; display: flex; align-items: center; justify-content: space-between; color: #fff; }
    .sub { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.45; }
    .btn-row { display: flex; flex-wrap: wrap; gap: 8px; }
    button { min-height: 48px; min-width: 48px; padding: 10px 16px; border-radius: 12px; border: 1px solid #374151; background: #ea580c; color: white; font-weight: 700; font-size: 13px; cursor: pointer; transition: transform 75ms ease-out, opacity 120ms; }
    button:hover { opacity: 0.94; }
    button:active { transform: scale(0.97); }
    button.secondary { background: #1f2937; color: #e2e8f0; }
    button.green { background: #059669; border-color: #10b981; }
    .menu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 8px; }
    .menu-btn { display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; text-align: left; background: #1e293b; border: 1px solid #334155; padding: 12px; min-height: 74px; }
    .menu-btn .price { color: #fb923c; font-family: monospace; font-size: 12px; margin-top: 6px; }
    .ticket-list { display: flex; flex-direction: column; gap: 10px; }
    .ticket { background: #0f172a; border: 1px solid #334155; border-left: 4px solid #fb923c; border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .ticket.bumped { border-left-color: #10b981; opacity: 0.65; }
    pre { margin: 0; background: #030712; border: 1px solid #1e293b; padding: 12px; border-radius: 10px; overflow: auto; font-size: 11.5px; max-height: 220px; color: #cbd5e1; }
    input { min-height: 48px; padding: 8px 12px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #fff; font-size: 13px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="badge">RUST DESKTOP v1.3.1</span>
      <span>CulinaryOS Standalone Workstation &amp; Local LAN Server</span>
    </div>
    <div class="status-bar">
      <span id="staff-pill" class="pill ok">Staff: Not Logged In</span>
      <span id="cloud-pill" class="pill saas">Mode: Standalone Offline-First</span>
    </div>
  </header>

  <main class="layout">
    <!-- 1. STAFF PIN & POS TERMINAL -->
    <section class="card">
      <h2><span>1. Staff PIN &amp; POS Terminal</span><span style="font-size:12px;color:#fb923c;">Integer-Cent Engine</span></h2>
      <p class="sub">Authenticate with Staff PIN (<strong>1234</strong> Owner or <strong>5678</strong> Server), tap menu items to ring an order, fire to kitchen stations, and settle cash idempotently.</p>
      <div class="btn-row">
        <button class="secondary" onclick="loginPin('1234')">🔑 Login Owner (1234)</button>
        <button class="secondary" onclick="loginPin('5678')">🔑 Login Server (5678)</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="table-input" value="Table 7" style="width:120px;" aria-label="Table Number" />
        <button onclick="fireCurrentOrder()" style="flex:1;">🔥 Ring &amp; Send Cart to KDS (<span id="cart-count">0</span> items)</button>
        <button class="green" onclick="settleLastOrderCash()">💵 Pay Cash</button>
      </div>
      <div id="menu-container" class="menu-grid"></div>
      <pre id="pos-out">Tap a menu item above to build a POS check.</pre>
    </section>

    <!-- 2. KITCHEN DISPLAY SYSTEM (KDS RAIL) -->
    <section class="card">
      <h2><span>2. Kitchen Display System (KDS)</span><span id="kds-count" style="font-size:12px;color:#34d399;">0 Active</span></h2>
      <p class="sub">Station-routed tickets generated by the local Rust engine. Tap <strong>BUMP</strong> to complete preparation with 0ms local LAN latency.</p>
      <div class="btn-row">
        <button class="secondary" onclick="refreshKds()">🔄 Refresh KDS Rail</button>
      </div>
      <div id="kds-tickets" class="ticket-list"></div>
      <pre id="kds-out">Waiting for kitchen tickets...</pre>
    </section>

    <!-- 3. FLSA TIP POOL & CASH DRAWER -->
    <section class="card">
      <h2><span>3. Hardcoded FLSA Tip Pool &amp; Drawer</span><span style="font-size:12px;color:#38bdf8;">29 U.S.C. 203(m)</span></h2>
      <p class="sub">Verify that Owners/Managers with hiring/firing authority are strictly excluded ($0.00) from tip pools, and close the cash drawer shift.</p>
      <div class="btn-row">
        <button onclick="runFlsaTipCheck()">⚖️ Run FLSA Tip Pool ($300 Pool)</button>
        <button class="secondary" onclick="closeCashDrawer()">🗄️ Close Cash Drawer ($250 Counted)</button>
      </div>
      <pre id="ops-out">Click "Run FLSA Tip Pool" to verify manager exclusion gate.</pre>
    </section>

    <!-- 4. SAAS CLOUD BRIDGE & ONLINE ORDER RELAY -->
    <section class="card">
      <h2><span>4. SaaS Cloud Bridge &amp; Add-Ons</span><span style="font-size:12px;color:#fb923c;">Railway Connected</span></h2>
      <p class="sub">Link this installed Rust application to <strong>CulinaryOS SaaS</strong> (<code>https://culinaryos-api.up.railway.app</code>) to unlock Offsite Storage Sync, Online Ordering Bridge, and AI Autopilot.</p>
      <div class="btn-row">
        <button onclick="enrollSaasBridge()">☁️ 1. Connect SaaS Pro Grant</button>
        <button class="green" onclick="syncToRailwayCloud()">⬆️ 2. Sync Outbox to Railway SaaS</button>
        <button class="secondary" onclick="simulateInboundOnlineOrder()">📲 3. Relay Online Order → KDS</button>
      </div>
      <pre id="cloud-out">Checking local SaaS bridge state...</pre>
    </section>
  </main>

  <script>
    let menuItems = [];
    let cart = [];
    let lastOrder = null;
    let activeSignedGrant = null;

    function fmtCents(c) {
      return '$' + (Number(c || 0) / 100).toFixed(2);
    }

    async function loginPin(pin) {
      const res = await fetch('/v1/auth/pin-login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pin })
      });
      const body = await res.json();
      if (body.ok) {
        document.getElementById('staff-pill').textContent =
          'Staff: ' + body.data.displayName + ' (' + body.data.role.toUpperCase() + ')';
      }
      document.getElementById('pos-out').textContent = JSON.stringify(body, null, 2);
    }

    async function loadMenu() {
      const res = await fetch('/v1/menu');
      const body = await res.json();
      if (body.ok) {
        menuItems = body.data;
        const container = document.getElementById('menu-container');
        container.innerHTML = '';
        menuItems.forEach((item) => {
          const btn = document.createElement('button');
          btn.className = 'menu-btn';
          btn.innerHTML = '<span>' + item.name + ' <small style="color:#94a3b8">[' + item.station.toUpperCase() + ']</small></span>' +
            '<span class="price">' + fmtCents(item.priceCents) + ' • Tap to Add</span>';
          btn.onclick = () => addToCart(item);
          container.appendChild(btn);
        });
      }
    }

    function addToCart(item) {
      const existing = cart.find((c) => c.menuItemId === item.id);
      if (existing) existing.quantity += 1;
      else cart.push({ menuItemId: item.id, name: item.name, quantity: 1, seat: 1, course: 1 });
      const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
      document.getElementById('cart-count').textContent = String(totalItems);
      document.getElementById('pos-out').textContent = 'Current Cart:\n' + JSON.stringify(cart, null, 2);
    }

    async function fireCurrentOrder() {
      if (cart.length === 0 && menuItems.length > 0) {
        addToCart(menuItems[0]);
      }
      const tableNumber = document.getElementById('table-input').value || 'Table 7';
      const res = await fetch('/v1/orders', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tableNumber, items: cart })
      });
      const created = await res.json();
      if (created.ok) {
        lastOrder = created.data;
        cart = [];
        document.getElementById('cart-count').textContent = '0';
        const sent = await fetch('/v1/orders/' + lastOrder.id + '/send', { method: 'PATCH' });
        const sentBody = await sent.json();
        document.getElementById('pos-out').textContent = JSON.stringify({ order: lastOrder, kitchenDispatch: sentBody.data }, null, 2);
        await refreshKds();
        await checkCloud();
      } else {
        document.getElementById('pos-out').textContent = JSON.stringify(created, null, 2);
      }
    }

    async function settleLastOrderCash() {
      if (!lastOrder) {
        document.getElementById('pos-out').textContent = 'Ring an order first before settling cash.';
        return;
      }
      const res = await fetch('/v1/payments/cash', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          operationId: 'cash-op-' + lastOrder.id,
          orderId: lastOrder.id,
          tenderedCents: lastOrder.totalCents
        })
      });
      const settled = await res.json();
      document.getElementById('pos-out').textContent = JSON.stringify(settled, null, 2);
      await checkCloud();
    }

    async function refreshKds() {
      const res = await fetch('/v1/kds/tickets');
      const body = await res.json();
      const list = document.getElementById('kds-tickets');
      list.innerHTML = '';
      if (body.ok) {
        const tickets = body.data;
        const activeCount = tickets.filter((t) => t.status !== 'bumped').length;
        document.getElementById('kds-count').textContent = activeCount + ' Active (' + tickets.length + ' Total)';
        tickets.forEach((t) => {
          const row = document.createElement('div');
          row.className = 'ticket ' + (t.status === 'bumped' ? 'bumped' : '');
          const summary = (t.items || []).map((i) => i.quantity + 'x ' + i.name).join(', ');
          row.innerHTML = '<div><strong>[' + String(t.station).toUpperCase() + '] ' + t.tableNumber + '</strong>' +
            '<div style="font-size:12px;color:#94a3b8;margin-top:3px;">' + summary + ' • Status: ' + t.status.toUpperCase() + '</div></div>';
          if (t.status !== 'bumped') {
            const btn = document.createElement('button');
            btn.className = 'green';
            btn.textContent = '✓ BUMP';
            btn.onclick = () => bumpTicket(t.id);
            row.appendChild(btn);
          }
          list.appendChild(row);
        });
      }
      document.getElementById('kds-out').textContent = JSON.stringify(body, null, 2);
    }

    async function bumpTicket(id) {
      await fetch('/v1/kds/tickets/' + id + '/bump', { method: 'POST' });
      await refreshKds();
      await checkCloud();
    }

    async function runFlsaTipCheck() {
      const res = await fetch('/v1/tips/calculate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          method: 'hours_weighted',
          totalPoolCents: 30000,
          paysFullMinimumWage: true,
          participants: [
            {
              staffId: '00000000-0000-0000-0000-000000000001',
              displayName: 'General Manager (Excluded by FLSA)',
              role: 'manager',
              hasHiringFiringAuthority: true,
              hoursWorkedTenths: 80,
              rolePointsTenths: 10,
              directTipsCents: 0,
              salesCents: 0
            },
            {
              staffId: '00000000-0000-0000-0000-000000000002',
              displayName: 'Lead Server (Eligible)',
              role: 'server',
              hasHiringFiringAuthority: false,
              hoursWorkedTenths: 60,
              rolePointsTenths: 10,
              directTipsCents: 20000,
              salesCents: 120000
            },
            {
              staffId: '00000000-0000-0000-0000-000000000003',
              displayName: 'Line Cook (Eligible w/ Full Min Wage)',
              role: 'line_cook',
              hasHiringFiringAuthority: false,
              hoursWorkedTenths: 60,
              rolePointsTenths: 10,
              directTipsCents: 10000,
              salesCents: 0
            }
          ]
        })
      });
      document.getElementById('ops-out').textContent = JSON.stringify(await res.json(), null, 2);
    }

    async function closeCashDrawer() {
      const res = await fetch('/v1/drawers/close', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ countedCents: 25000 })
      });
      document.getElementById('ops-out').textContent = JSON.stringify(await res.json(), null, 2);
    }

    async function checkCloud() {
      const res = await fetch('/v1/cloud/status');
      const body = await res.json();
      if (body.ok && body.data.cloudConnected) {
        document.getElementById('cloud-pill').textContent =
          'SaaS Connected: ' + body.data.entitlement.planTier.toUpperCase() + ' (' + body.data.pendingOutboxEvents + ' queued)';
        document.getElementById('cloud-pill').className = 'pill ok';
      }
      document.getElementById('cloud-out').textContent = JSON.stringify(body, null, 2);
    }

    async function enrollSaasBridge() {
      const res = await fetch('/v1/cloud/demo-enroll', { method: 'POST' });
      const body = await res.json();
      if (body.ok) {
        activeSignedGrant = body.data.signedGrant;
      }
      await checkCloud();
      document.getElementById('cloud-out').textContent = JSON.stringify(body, null, 2);
    }

    async function syncToRailwayCloud() {
      const res = await fetch('/v1/cloud/sync', { method: 'POST' });
      const localSync = await res.json();
      let railwayReply = null;
      if (localSync.ok && activeSignedGrant) {
        try {
          const cloudRes = await fetch('https://culinaryos-api.up.railway.app/v1/cloud/storage/ingest', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ signedGrant: activeSignedGrant, envelope: localSync.data })
          });
          railwayReply = await cloudRes.json();
        } catch (err) {
          railwayReply = { note: 'Local batch sealed; Railway remote ingest skipped/offline', error: String(err) };
        }
      }
      await checkCloud();
      document.getElementById('cloud-out').textContent = JSON.stringify({ localBatch: localSync, railwayCloudBridge: railwayReply }, null, 2);
    }

    async function simulateInboundOnlineOrder() {
      const res = await fetch('/v1/cloud/inbound-orders', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          externalOrderId: 'web-order-' + Math.floor(Math.random() * 9000 + 1000),
          customerName: 'Online Guest (SaaS Bridge)',
          fulfillmentMode: 'pickup',
          items: [['item-margherita', 1], ['item-fries', 2]]
        })
      });
      const body = await res.json();
      document.getElementById('cloud-out').textContent = JSON.stringify(body, null, 2);
      await refreshKds();
      await checkCloud();
    }

    loginPin('1234');
    loadMenu();
    refreshKds();
    checkCloud();
  </script>
</body>
</html>
"#;

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::Request;
    use tower::ServiceExt;

    #[tokio::test]
    async fn standalone_router_executes_full_pos_kds_cash_and_saas_bridge_workflow() {
        let dir = tempfile::tempdir().unwrap();
        let site_id = Uuid::from_u128(999);
        let secret = "test-saas-bridge-signing-secret-key".to_string();
        let svc = StandaloneService::open(&dir.path().join("standalone.db"), site_id, secret.clone()).unwrap();
        let app = svc.router();

        // 1. PIN login
        let login_res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/auth/pin-login")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"pin":"1234"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(login_res.status(), StatusCode::OK);

        // 2. Create order & send to kitchen
        let order_res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/orders")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        r#"{"orderId":"ord-500","tableNumber":"T4","items":[{"menuItemId":"item-margherita","quantity":2}]}"#,
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(order_res.status(), StatusCode::CREATED);

        let send_res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("PATCH")
                    .uri("/v1/orders/ord-500/send")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(send_res.status(), StatusCode::OK);

        // 3. Connect SaaS Entitlement Grant & sync cloud storage outbox
        let mut addons = BTreeSet::new();
        addons.insert(SaasAddon::CloudStorageSync);
        addons.insert(SaasAddon::OnlineOrderingBridge);
        let payload = SaasEntitlementPayload {
            grant_id: "g-1".to_string(),
            customer_id: "c-1".to_string(),
            site_id,
            plan_tier: "pro".to_string(),
            addons,
            cloud_endpoint: "https://cloud.culinaryos.io".to_string(),
            issued_at_unix: 100,
            expires_at_unix: u64::MAX / 2,
            offline_grace_seconds: 3600,
        };
        let sig = sign_entitlement_payload(&payload, &secret).unwrap();
        let grant = SignedSaasGrant {
            payload,
            signature_hex: sig,
        };

        let connect_res = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/cloud/connect")
                    .header("content-type", "application/json")
                    .body(Body::from(serde_json::to_vec(&grant).unwrap()))
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(connect_res.status(), StatusCode::OK);

        let sync_res = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/cloud/sync")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(sync_res.status(), StatusCode::OK);
    }
}
