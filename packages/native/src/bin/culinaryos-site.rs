use culinaryos_native::site::SiteService;
use sha2::{Digest, Sha256};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use std::{
    env,
    fs::File,
    io::BufReader,
    net::{IpAddr, SocketAddr},
    str::FromStr,
    time::Duration,
};
use uuid::Uuid;

fn setting(name: &'static str) -> Result<String, &'static str> {
    env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .ok_or(name)
}

#[tokio::main]
async fn main() {
    if let Err(message) = run().await {
        eprintln!("CulinaryOS site startup failed: {message}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), &'static str> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .map_err(|_| "TLS provider")?;
    let site = setting("CULINARYOS_SITE_ID")?
        .parse::<Uuid>()
        .map_err(|_| "Invalid site UUID")?;
    let address = env::var("CULINARYOS_SITE_BIND")
        .unwrap_or_else(|_| "127.0.0.1:8443".into())
        .parse::<SocketAddr>()
        .map_err(|_| "Invalid site bind address")?;
    let certificate = setting("CULINARYOS_SITE_TLS_CERT")?;
    let private_key = setting("CULINARYOS_SITE_TLS_KEY")?;
    let file = File::open(&certificate).map_err(|_| "Cannot open TLS certificate")?;
    let leaf = rustls_pemfile::certs(&mut BufReader::new(file))
        .next()
        .ok_or("TLS certificate is empty")?
        .map_err(|_| "Invalid TLS certificate")?;
    let fingerprint = hex::encode(Sha256::digest(leaf.as_ref()));
    let tls = axum_server::tls_rustls::RustlsConfig::from_pem_file(certificate, private_key)
        .await
        .map_err(|_| "Invalid TLS certificate or key")?;
    let options = PgConnectOptions::from_str(&setting("DATABASE_URL")?)
        .map_err(|_| "Invalid database URL")?;
    if !options
        .get_host()
        .parse::<IpAddr>()
        .is_ok_and(|ip| ip.is_loopback())
        && options.get_host() != "localhost"
    {
        return Err("Pilot database must be on loopback");
    }
    let pool = PgPoolOptions::new()
        .max_connections(8)
        .acquire_timeout(Duration::from_secs(5))
        .connect_with(options)
        .await
        .map_err(|_| "Database connection failed")?;
    let service = SiteService::new(
        pool,
        site,
        setting("CULINARYOS_SITE_ORIGIN")?,
        fingerprint,
        setting("CULINARYOS_PIN_LOOKUP_SECRET")?,
    )
    .await?;
    axum_server::bind_rustls(address, tls)
        .serve(service.router().into_make_service())
        .await
        .map_err(|_| "HTTPS listener failed")
}
