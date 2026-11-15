use crate::{
    cloud_bridge::{
        CloudBridge, CloudBridgeError, RelayedOnlineOrder, SignedSaasGrant,
    },
    local_store::{
        calculate_tip_pool, LocalStore, LocalStoreError, TipDistributionMethod,
        TipParticipantInput,
    },
};
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

const STANDALONE_WORKSTATION_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CulinaryOS — Native Rust Standalone Workstation</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: #f8fafc; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: #111827; border-bottom: 1px solid #1f2937; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; letter-spacing: 0.04em; }
    .badge { background: #ea580c; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; padding: 20px; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 16px; }
    button { min-height: 48px; min-width: 48px; padding: 10px 16px; border-radius: 10px; border: 1px solid #374151; background: #ea580c; color: white; font-weight: 700; cursor: pointer; }
    button:active { transform: scale(0.97); }
    pre { background: #030712; padding: 12px; border-radius: 8px; overflow: auto; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="badge">RUST STANDALONE</span>
      <span>CulinaryOS Desktop Workstation &amp; Local Server</span>
    </div>
    <div id="cloud-pill" style="font-size:12px;color:#34d399;">Local Engine Ready (Offline-First)</div>
  </header>
  <main class="grid">
    <section class="card">
      <h3>1. POS Quick Order &amp; Send to Kitchen</h3>
      <button onclick="ringOrder()">Ring 2x Margherita + Send to KDS</button>
      <pre id="pos-out">Ready.</pre>
    </section>
    <section class="card">
      <h3>2. Kitchen Display System (KDS Rail)</h3>
      <button onclick="refreshKds()">Refresh Active KDS Tickets</button>
      <pre id="kds-out">No active tickets.</pre>
    </section>
    <section class="card">
      <h3>3. SaaS Server Connection &amp; Add-Ons</h3>
      <p style="font-size:13px;color:#94a3b8;">Connect this installed Rust app to CulinaryOS Cloud for remote storage backup, online ordering bridge, and AI Autopilot add-ons.</p>
      <button onclick="checkCloud()">Check SaaS Bridge Status</button>
      <pre id="cloud-out">Standalone Community Mode.</pre>
    </section>
  </main>
  <script>
    async function ringOrder() {
      const res = await fetch('/v1/orders', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ tableNumber: 'Table 7', items: [{ menuItemId: 'item-margherita', quantity: 2, seat: 1, course: 1 }] })
      });
      const created = await res.json();
      if (created.ok) {
        const sent = await fetch('/v1/orders/' + created.data.id + '/send', { method: 'PATCH' });
        document.getElementById('pos-out').textContent = JSON.stringify(await sent.json(), null, 2);
        refreshKds();
      }
    }
    async function refreshKds() {
      const res = await fetch('/v1/kds/tickets');
      document.getElementById('kds-out').textContent = JSON.stringify(await res.json(), null, 2);
    }
    async function checkCloud() {
      const res = await fetch('/v1/cloud/status');
      document.getElementById('cloud-out').textContent = JSON.stringify(await res.json(), null, 2);
    }
    checkCloud();
  </script>
</body>
</html>
"#;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cloud_bridge::{
        sign_entitlement_payload, SaasAddon, SaasEntitlementPayload, SignedSaasGrant,
    };
    use axum::body::Body;
    use axum::http::Request;
    use std::collections::BTreeSet;
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
