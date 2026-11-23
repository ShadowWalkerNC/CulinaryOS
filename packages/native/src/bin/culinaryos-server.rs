#![forbid(unsafe_code)]

use culinaryos_native::standalone::{spa_router, StandaloneService};
use std::{
    env,
    net::SocketAddr,
    path::PathBuf,
};
use uuid::Uuid;

fn default_data_dir() -> PathBuf {
    if let Ok(custom) = env::var("CULINARYOS_DATA_DIR") {
        if !custom.is_empty() {
            return PathBuf::from(custom);
        }
    }
    if let Ok(appdata) = env::var("APPDATA") {
        return PathBuf::from(appdata).join("CulinaryOS");
    }
    if let Ok(home) = env::var("HOME") {
        return PathBuf::from(home).join(".culinaryos");
    }
    env::temp_dir().join("CulinaryOS")
}

fn default_site_id() -> Uuid {
    env::var("CULINARYOS_SITE_ID")
        .ok()
        .and_then(|v| v.parse::<Uuid>().ok())
        .unwrap_or_else(|| Uuid::from_u128(1))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let addr: SocketAddr = format!("{}:{}", host, port).parse()?;

    let data_dir = default_data_dir();
    std::fs::create_dir_all(&data_dir)?;
    let db_path = data_dir.join("culinaryos.sqlite");

    let site_id = default_site_id();
    let signing_secret = env::var("CULINARYOS_SAAS_SIGNING_SECRET")
        .unwrap_or_else(|_| "culinaryos-production-saas-secret-key-32b".to_string());

    println!("Starting CulinaryOS Native Unified Server (Rust/Axum)...");
    println!("  Data directory: {}", data_dir.display());
    println!("  Site ID:        {}", site_id);
    println!("  Binding on:     http://{}", addr);

    let standalone = StandaloneService::open(&db_path, site_id, signing_secret)
        .map_err(|e| format!("Failed to open local store: {:?}", e))?;

    let api_router = standalone.router();

    // Check if client SPAs exist to serve
    let mut app = api_router;

    if let Ok(apps_dir) = env::var("CULINARYOS_APPS_DIR") {
        let p = PathBuf::from(apps_dir);
        if p.is_dir() {
            let pos_dist = p.join("pos").join("dist");
            if pos_dist.is_dir() {
                println!("  Mounting POS SPA from {}", pos_dist.display());
                app = app.nest("/pos", spa_router(pos_dist));
            }
            let kds_dist = p.join("kds").join("dist");
            if kds_dist.is_dir() {
                println!("  Mounting KDS SPA from {}", kds_dist.display());
                app = app.nest("/kds", spa_router(kds_dist));
            }
            let admin_dist = p.join("admin").join("dist");
            if admin_dist.is_dir() {
                println!("  Mounting Admin SPA from {}", admin_dist.display());
                app = app.nest("/admin", spa_router(admin_dist));
            }
        }
    }

    let listener = tokio::net::TcpListener::bind(addr).await?;
    println!("CulinaryOS Native Server ready. Listening on http://{}", addr);

    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}
