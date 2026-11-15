use crate::{DeviceAssignment, DeviceRole, Operation, Site};
use axum::{
    extract::{DefaultBodyLimit, Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    middleware,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Postgres, Transaction};
use std::{
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use subtle::ConstantTimeEq;
use uuid::Uuid;

const STATIONS: [&str; 8] = [
    "hot", "cold", "grill", "fry", "sauce", "pastry", "pass", "bar",
];

#[derive(Clone)]
pub struct SiteService {
    pool: PgPool,
    site_id: Uuid,
    origin: String,
    fingerprint: String,
    pin_secret: Arc<str>,
    login_window: Arc<Mutex<(Instant, u32)>>,
}

#[derive(Debug)]
struct Error(StatusCode, &'static str);

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"ok":false,"error":{"code":self.1}}))).into_response()
    }
}

const UNAUTHORIZED: Error = Error(StatusCode::UNAUTHORIZED, "INVALID_CREDENTIAL");
const FORBIDDEN: Error = Error(StatusCode::FORBIDDEN, "FORBIDDEN");
const INVALID: Error = Error(StatusCode::UNPROCESSABLE_ENTITY, "INVALID_INPUT");
const UNAVAILABLE: Error = Error(StatusCode::SERVICE_UNAVAILABLE, "SITE_UNAVAILABLE");

type Reply = Result<(StatusCode, Json<Value>), Error>;

fn ok(status: StatusCode, data: Value) -> Reply {
    Ok((status, Json(json!({"ok":true,"data":data}))))
}

impl From<sqlx::Error> for Error {
    fn from(_: sqlx::Error) -> Self {
        UNAVAILABLE
    }
}

impl SiteService {
    pub async fn new(
        pool: PgPool,
        site_id: Uuid,
        origin: String,
        fingerprint: String,
        pin_secret: String,
    ) -> Result<Self, &'static str> {
        if site_id.is_nil()
            || pin_secret.len() < 32
            || fingerprint.len() != 64
            || !fingerprint.bytes().all(|c| c.is_ascii_hexdigit())
        {
            return Err("Invalid site configuration");
        }
        let parsed = url::Url::parse(&origin).map_err(|_| "Invalid site origin")?;
        if parsed.scheme() != "https"
            || parsed.host().is_none()
            || parsed.path() != "/"
            || !parsed.username().is_empty()
            || parsed.password().is_some()
            || parsed.query().is_some()
            || parsed.fragment().is_some()
        {
            return Err("Site origin must be an HTTPS origin");
        }
        let valid: bool = sqlx::query_scalar(r#"
            SELECT EXISTS (
                SELECT FROM pg_roles r WHERE r.rolname = session_user
                AND session_user = current_user
                AND r.rolcanlogin AND NOT (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication)
                AND pg_has_role(session_user, 'culinaryos_app', 'MEMBER')
                AND NOT pg_has_role(session_user, 'culinaryos_identity', 'MEMBER')
                AND NOT pg_has_role(session_user, 'pg_write_all_data', 'MEMBER')
                AND NOT pg_has_role(session_user, 'pg_read_all_data', 'MEMBER')
                AND NOT EXISTS (SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
                    AND pg_has_role(r.oid, c.relowner, 'MEMBER'))
            )
            AND to_regprocedure('public.issue_native_pairing(text,uuid,text,text,text,text)') IS NOT NULL
            AND to_regprocedure('public.redeem_native_pairing(text,uuid,text)') IS NOT NULL
        "#).fetch_one(&pool).await.map_err(|_| "Database role or migration check failed")?;
        if !valid {
            return Err("Restricted runtime role and migration 009 are required");
        }
        Ok(Self {
            pool,
            site_id,
            origin: parsed.origin().ascii_serialization(),
            fingerprint,
            pin_secret: pin_secret.into(),
            login_window: Arc::new(Mutex::new((Instant::now(), 0))),
        })
    }

    pub fn router(self) -> Router {
        Router::new()
            .route("/ready", get(ready))
            .route("/v1/auth/pin-login", post(login))
            .route("/v1/sites/{site}/pairings", post(issue))
            .route("/v1/sites/{site}/pairings/redeem", post(redeem))
            .route("/v1/sites/{site}/devices/{device}", delete(revoke))
            .route("/v1/kds/tickets", get(tickets))
            .layer(DefaultBodyLimit::max(8192))
            .layer(middleware::map_response(
                |mut response: Response| async move {
                    response.headers_mut().insert(
                        header::CACHE_CONTROL,
                        header::HeaderValue::from_static("no-store"),
                    );
                    response
                },
            ))
            .with_state(self)
    }

    fn check_site(&self, site: Uuid) -> Result<(), Error> {
        if self.site_id == site {
            Ok(())
        } else {
            Err(FORBIDDEN)
        }
    }

    async fn transaction(&self) -> Result<Transaction<'_, Postgres>, Error> {
        let mut tx = self.pool.begin().await?;
        sqlx::query("SET LOCAL ROLE culinaryos_app")
            .execute(&mut *tx)
            .await?;
        sqlx::query("SET LOCAL statement_timeout = '5s'")
            .execute(&mut *tx)
            .await?;
        Ok(tx)
    }

    fn count_login(&self) -> Result<(), Error> {
        let mut window = self.login_window.lock().map_err(|_| UNAVAILABLE)?;
        if window.0.elapsed() >= Duration::from_secs(60) {
            *window = (Instant::now(), 0);
        }
        if window.1 >= 30 {
            return Err(Error(StatusCode::TOO_MANY_REQUESTS, "PIN_RATE_LIMIT"));
        }
        window.1 += 1;
        Ok(())
    }
}

fn token(prefix: &str) -> Result<String, Error> {
    let mut bytes = [0; 32];
    getrandom::fill(&mut bytes).map_err(|_| UNAVAILABLE)?;
    Ok(format!("{prefix}{}", URL_SAFE_NO_PAD.encode(bytes)))
}

fn token_hash(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

fn valid_token(value: &str, prefix: &str) -> bool {
    value.strip_prefix(prefix).is_some_and(|suffix| {
        suffix.len() == 43
            && URL_SAFE_NO_PAD
                .decode(suffix)
                .is_ok_and(|bytes| bytes.len() == 32)
    })
}

fn bearer(headers: &HeaderMap, prefix: &str) -> Result<String, Error> {
    let value = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(UNAUTHORIZED)?;
    if !valid_token(value, prefix) {
        return Err(UNAUTHORIZED);
    }
    Ok(token_hash(value))
}

async fn ready(State(state): State<SiteService>) -> Reply {
    sqlx::query("SELECT 1").execute(&state.pool).await?;
    ok(
        StatusCode::OK,
        json!({"database":"postgres","siteId":state.site_id}),
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Login {
    tenant_id: Uuid,
    pin: String,
}

async fn login(State(state): State<SiteService>, Json(body): Json<Login>) -> Reply {
    state.check_site(body.tenant_id)?;
    if !(4..=8).contains(&body.pin.len()) || !body.pin.bytes().all(|b| b.is_ascii_digit()) {
        return Err(INVALID);
    }
    state.count_login()?;
    let mut mac =
        Hmac::<Sha256>::new_from_slice(state.pin_secret.as_bytes()).map_err(|_| UNAVAILABLE)?;
    mac.update(format!("{}:{}", state.site_id, body.pin).as_bytes());
    let lookup = hex::encode(mac.finalize().into_bytes());
    let mut tx = state.transaction().await?;
    let (user, stored, display_name): (Uuid, String, String) =
        sqlx::query_as("SELECT user_id, pin_hash, display_name FROM public.find_staff_pin($1,$2)")
            .bind(state.site_id)
            .bind(&lookup)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or(UNAUTHORIZED)?;
    let verified = tokio::task::spawn_blocking(move || verify_pin(&body.pin, &stored))
        .await
        .map_err(|_| UNAVAILABLE)?;
    if !verified {
        return Err(UNAUTHORIZED);
    }
    let session = token("cs_")?;
    let role: String = sqlx::query_scalar(
        "SELECT public.mint_session($1,$2,$3,NULL,now()+interval '12 hours',$4,NULL)",
    )
    .bind(token_hash(&session))
    .bind(user)
    .bind(state.site_id)
    .bind(lookup)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    ok(
        StatusCode::OK,
        json!({"token":session,"userId":user,"tenantId":state.site_id,"role":role,"displayName":display_name}),
    )
}

fn verify_pin(pin: &str, stored: &str) -> bool {
    let Some((salt, hash)) = stored.split_once(':') else {
        return false;
    };
    let mut expected = [0; 32];
    if salt.len() != 32
        || !salt.bytes().all(|b| b.is_ascii_hexdigit())
        || hex::decode_to_slice(hash, &mut expected).is_err()
    {
        return false;
    }
    let mut output = [0; 32];
    let params = scrypt::Params::new(14, 8, 1, output.len()).expect("fixed scrypt parameters");
    scrypt::scrypt(pin.as_bytes(), salt.as_bytes(), &params, &mut output).is_ok()
        && bool::from(output.ct_eq(&expected))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PairingRequest {
    label: String,
    role: String,
    station: Option<String>,
}

async fn issue(
    State(state): State<SiteService>,
    Path(site): Path<Uuid>,
    headers: HeaderMap,
    Json(body): Json<PairingRequest>,
) -> Reply {
    state.check_site(site)?;
    let manager = bearer(&headers, "cs_")?;
    let label = body.label.trim();
    let valid_role = match (body.role.as_str(), body.station.as_deref()) {
        ("pos" | "manager", None) => true,
        ("kds", Some(station)) => STATIONS.contains(&station),
        _ => false,
    };
    if !valid_role
        || label.is_empty()
        || label.chars().count() > 100
        || label.chars().any(char::is_control)
    {
        return Err(INVALID);
    }
    let pairing = token("cp_")?;
    let mut tx = state.transaction().await?;
    let accepted: bool =
        sqlx::query_scalar("SELECT public.issue_native_pairing($1,$2,$3,$4,$5,$6)")
            .bind(manager)
            .bind(site)
            .bind(token_hash(&pairing))
            .bind(label)
            .bind(body.role)
            .bind(body.station)
            .fetch_one(&mut *tx)
            .await?;
    if !accepted {
        return Err(FORBIDDEN);
    }
    tx.commit().await?;
    ok(
        StatusCode::CREATED,
        json!({"code":pairing,"siteId":site,"origin":state.origin,"tlsFingerprint":state.fingerprint,"expiresInSeconds":300}),
    )
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Redemption {
    code: String,
}

async fn redeem(
    State(state): State<SiteService>,
    Path(site): Path<Uuid>,
    Json(body): Json<Redemption>,
) -> Reply {
    state.check_site(site)?;
    if !valid_token(&body.code, "cp_") {
        return Err(UNAUTHORIZED);
    }
    let device_token = token("cd_")?;
    let mut tx = state.transaction().await?;
    let device: Option<Uuid> = sqlx::query_scalar("SELECT public.redeem_native_pairing($1,$2,$3)")
        .bind(token_hash(&body.code))
        .bind(site)
        .bind(token_hash(&device_token))
        .fetch_one(&mut *tx)
        .await?;
    let id = device.ok_or(UNAUTHORIZED)?;
    tx.commit().await?;
    ok(
        StatusCode::CREATED,
        json!({"deviceId":id,"token":device_token}),
    )
}

async fn revoke(
    State(state): State<SiteService>,
    Path((site, device)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> Reply {
    state.check_site(site)?;
    let hash = bearer(&headers, "cs_")?;
    let mut tx = state.transaction().await?;
    let manager: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT FROM public.resolve_identity($1) WHERE kind='session' AND tenant_id=$2 AND role IN ('owner','manager'))")
        .bind(&hash).bind(site).fetch_one(&mut *tx).await?;
    if !manager {
        return Err(FORBIDDEN);
    }
    let revoked: bool = sqlx::query_scalar("SELECT public.revoke_device_key($1,$2)")
        .bind(hash)
        .bind(device)
        .fetch_one(&mut *tx)
        .await?;
    tx.commit().await?;
    ok(StatusCode::OK, json!({"revoked":revoked}))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct TicketQuery {
    station: Option<String>,
}

async fn tickets(
    State(state): State<SiteService>,
    Query(query): Query<TicketQuery>,
    headers: HeaderMap,
) -> Reply {
    let hash = bearer(&headers, "cd_")?;
    let mut tx = state.transaction().await?;
    let (tenant, capabilities): (Uuid, Value) = sqlx::query_as(
        "SELECT tenant_id, capabilities FROM public.resolve_identity($1) WHERE kind='device'",
    )
    .bind(&hash)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or(UNAUTHORIZED)?;
    state.check_site(tenant)?;
    if capabilities.get(0).and_then(Value::as_str) != Some("native:kds") {
        return Err(FORBIDDEN);
    }
    let station = capabilities
        .get(1)
        .and_then(Value::as_str)
        .ok_or(FORBIDDEN)?;
    if query
        .station
        .as_deref()
        .is_some_and(|requested| requested != station)
    {
        return Err(FORBIDDEN);
    }
    let station_id = STATIONS
        .iter()
        .position(|value| *value == station)
        .ok_or(FORBIDDEN)? as u128;
    let scope = Site {
        company_id: tenant.as_u128(),
        site_id: tenant.as_u128(),
    };
    DeviceAssignment {
        site: scope,
        role: DeviceRole::Kds { station_id },
        revoked: false,
    }
    .authorize(scope, Operation::ReadTickets { station_id })
    .map_err(|_| FORBIDDEN)?;
    sqlx::query("SELECT set_config('app.token_hash',$1,true)")
        .bind(hash)
        .execute(&mut *tx)
        .await?;
    let rows: Vec<Value> = sqlx::query_scalar(
        r#"
        SELECT to_jsonb(t) || jsonb_build_object('ticket_items', COALESCE(
            (SELECT jsonb_agg(i ORDER BY i.sort_order, i.id) FROM public.ticket_items i
             WHERE i.tenant_id=t.tenant_id AND i.ticket_id=t.id), '[]'::jsonb))
        FROM public.kitchen_tickets t WHERE tenant_id=$1 AND station=$2
          AND status IN ('queued','fired','cooking')
        ORDER BY fired_at NULLS LAST, created_at, id
    "#,
    )
    .bind(tenant)
    .bind(station)
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;
    ok(StatusCode::OK, json!(rows))
}
