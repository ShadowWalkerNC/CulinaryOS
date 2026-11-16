#![forbid(unsafe_code)]

use culinaryos_native::{
    local_store::{calculate_tip_pool, LocalStore, StaffRole, TipDistributionMethod, TipParticipantInput},
    standalone::{diagnostics_router, mime_for_path, spa_router, StandaloneService},
};
use axum::response::{IntoResponse, Response};
use std::{
    env,
    net::SocketAddr,
    path::{Path, PathBuf},
    process::Command,
    sync::Arc,
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

fn serve_spa_root(root: &Path) -> Response {
    let index = root.join("index.html");
    if let Ok(bytes) = std::fs::read(&index) {
        (
            axum::http::StatusCode::OK,
            [(axum::http::header::CONTENT_TYPE, "text/html; charset=utf-8")],
            bytes,
        )
            .into_response()
    } else {
        (axum::http::StatusCode::NOT_FOUND, "SPA index.html not found").into_response()
    }
}

fn serve_spa_subpath(root: &Path, rel_path: &str) -> Response {
    if rel_path.contains("..") {
        return axum::http::StatusCode::BAD_REQUEST.into_response();
    }
    let candidate = root.join(rel_path);
    if candidate.is_file() {
        if let Ok(bytes) = std::fs::read(&candidate) {
            return (
                axum::http::StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, mime_for_path(&candidate))],
                bytes,
            )
                .into_response();
        }
    }
    serve_spa_root(root)
}

fn locate_workspace_apps_dir() -> Option<PathBuf> {
    if let Ok(custom) = env::var("CULINARYOS_APPS_DIR") {
        let p = PathBuf::from(custom);
        if p.is_dir() {
            return Some(p);
        }
    }
    if let Ok(cwd) = env::current_dir() {
        let candidate = cwd.join("apps");
        if candidate.join("desktop").join("dist").is_dir() {
            return Some(candidate);
        }
    }
    if let Ok(exe) = env::current_exe() {
        let mut cur: Option<&Path> = exe.parent();
        while let Some(dir) = cur {
            let candidate = dir.join("apps");
            if candidate.join("desktop").join("dist").is_dir() {
                return Some(candidate);
            }
            cur = dir.parent();
        }
    }
    let compile_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join("apps"));
    if let Some(p) = compile_root {
        if p.is_dir() {
            return Some(p);
        }
    }
    None
}

fn run_self_test() -> Result<(), String> {
    let dir = tempfile::tempdir().map_err(|e| e.to_string())?;
    let db_path = dir.path().join("desktop-selftest.db");
    let site_id = Uuid::from_u128(1001);
    let mut store = LocalStore::open_or_init(&db_path, site_id)
        .map_err(|e| format!("LocalStore init failed: {:?}", e))?;

    let owner = store
        .authenticate_pin("1234")
        .map_err(|e| format!("PIN auth failed: {:?}", e))?;
    if owner.role != StaffRole::Owner {
        return Err("Expected owner role".to_string());
    }

    let order = store
        .create_order(
            Some("selftest-ord-1".to_string()),
            "Table 1".to_string(),
            vec![("item-margherita".to_string(), 1, 1, 1)],
        )
        .map_err(|e| format!("Order creation failed: {:?}", e))?;

    let tickets = store
        .send_order_to_kitchen(&order.id)
        .map_err(|e| format!("Send to KDS failed: {:?}", e))?;
    if tickets.is_empty() {
        return Err("Expected at least 1 KDS ticket".to_string());
    }

    store
        .bump_ticket(&tickets[0].id)
        .map_err(|e| format!("Bump KDS ticket failed: {:?}", e))?;

    let settled = store
        .settle_cash_order("selftest-op-1", &order.id, order.total_cents)
        .map_err(|e| format!("Cash settlement failed: {:?}", e))?;
    if settled.paid_cents != order.total_cents {
        return Err("Settled cents mismatch".to_string());
    }

    let tip_report = calculate_tip_pool(
        TipDistributionMethod::HoursWeighted,
        5000,
        false,
        &[
            TipParticipantInput {
                staff_id: Uuid::from_u128(1),
                display_name: "Owner".to_string(),
                role: StaffRole::Owner,
                has_hiring_firing_authority: true,
                hours_worked_tenths: 80,
                role_points_tenths: 10,
                direct_tips_cents: 0,
                sales_cents: 0,
            },
            TipParticipantInput {
                staff_id: Uuid::from_u128(2),
                display_name: "Server".to_string(),
                role: StaffRole::Server,
                has_hiring_firing_authority: false,
                hours_worked_tenths: 80,
                role_points_tenths: 10,
                direct_tips_cents: 5000,
                sales_cents: 20000,
            },
        ],
    )
    .map_err(|e| format!("Tip pool check failed: {:?}", e))?;

    if tip_report.allocations[0].allocated_cents != 0
        || tip_report.allocations[1].allocated_cents != 5000
    {
        return Err("FLSA tip gate failed in self-test".to_string());
    }

    println!(
        "CULINARYOS_DESKTOP_READY site={} db={} engine=rust-embedded",
        site_id,
        db_path.display()
    );
    Ok(())
}

fn try_open_native_app_window(url: &str) {
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd")
            .args(["/C", "start", "msedge", &format!("--app={url}")])
            .spawn();
    }
}

fn resolve_bind_addr(args: &[String]) -> SocketAddr {
    for i in 0..args.len() {
        if args[i] == "--port" {
            if let Some(p) = args.get(i + 1) {
                if let Ok(port) = p.parse::<u16>() {
                    return SocketAddr::from(([127, 0, 0, 1], port));
                }
            }
        }
    }
    env::var("CULINARYOS_DESKTOP_BIND")
        .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
        .parse()
        .expect("Valid CULINARYOS_DESKTOP_BIND socket address")
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|a| a == "--help" || a == "-h") {
        println!("CulinaryOS Standalone Native Rust Desktop Workstation v1.3.1");
        println!("Toast & Square Open-Source Industrial Alternative");
        println!();
        println!("Usage: culinaryos-desktop.exe [OPTIONS]");
        println!();
        println!("Options:");
        println!("  --port <PORT>        Port to bind the unified web workstation and API (default: 3000)");
        println!("  --fresh-install      Reset local embedded database to blank first-time setup state");
        println!("  --headless           Run server in background without opening Edge kiosk window");
        println!("  --self-test          Run fast headless FLSA compliance and local store self-test and exit");
        println!("  --legacy-ports       Also bind legacy split ports (5172..5180)");
        println!("  --help, -h           Print this help menu and exit");
        std::process::exit(0);
    }
    if args.iter().any(|a| a == "--self-test" || a == "--headless-check") {
        match run_self_test() {
            Ok(()) => std::process::exit(0),
            Err(err) => {
                eprintln!("CulinaryOS Desktop self-test failed: {err}");
                std::process::exit(1);
            }
        }
    }

    let data_dir = default_data_dir();
    let _ = std::fs::create_dir_all(&data_dir);
    let db_path = data_dir.join("culinaryos.db");
    if args.iter().any(|a| a == "--fresh-install" || a == "--reset") && db_path.exists() {
        let _ = std::fs::remove_file(&db_path);
        println!("[CulinaryOS Desktop] Reset local database for fresh first-time installation.");
    }
    let site_id = default_site_id();
    let saas_secret = env::var("CULINARYOS_SAAS_SIGNING_SECRET")
        .unwrap_or_else(|_| "6a2693f12117beb3a558bb30ed74efbcbee68a9ee927a4a28045026b892515f0".to_string());
    let bind_addr: SocketAddr = resolve_bind_addr(&args);

    let service = StandaloneService::open(&db_path, site_id, saas_secret)
        .expect("Initialize CulinaryOS embedded database");

    let mut workstation_url = format!("http://{bind_addr}");

    let mut main_router = service.clone().router();

    if let Some(apps_dir) = locate_workspace_apps_dir() {
        let single_port_surfaces: [(&str, &str); 7] = [
            ("pos", "pos"),
            ("kds", "kds"),
            ("admin", "admin"),
            ("kitchenkit", "kitchenkit"),
            ("menu", "web"),
            ("ops", "ops"),
            ("display", "display"),
        ];

        for (route_prefix, folder) in single_port_surfaces {
            let dist_path = apps_dir.join(folder).join("dist");
            if dist_path.is_dir() {
                println!("[CulinaryOS Desktop] Mounted /{route_prefix} on Port 3000 ({})", dist_path.display());
                let dist_dir = Arc::new(dist_path);

                let d1 = Arc::clone(&dist_dir);
                let d2 = Arc::clone(&dist_dir);
                let d3 = Arc::clone(&dist_dir);

                main_router = main_router
                    .route(
                        &format!("/{route_prefix}"),
                        axum::routing::get(move || {
                            let root = Arc::clone(&d1);
                            async move { serve_spa_root(&root) }
                        }),
                    )
                    .route(
                        &format!("/{route_prefix}/"),
                        axum::routing::get(move || {
                            let root = Arc::clone(&d2);
                            async move { serve_spa_root(&root) }
                        }),
                    )
                    .route(
                        &format!("/{route_prefix}/{{*path}}"),
                        axum::routing::get(move |axum::extract::Path(path): axum::extract::Path<String>| {
                            let root = Arc::clone(&d3);
                            async move { serve_spa_subpath(&root, &path) }
                        }),
                    );
            }
        }

        let shared_apps_dir = Arc::new(apps_dir.clone());
        let shared_dir_assets = Arc::clone(&shared_apps_dir);
        let shared_dir_files = Arc::clone(&shared_apps_dir);

        main_router = main_router
            .route(
                "/assets/{*file}",
                axum::routing::get(move |axum::extract::Path(file): axum::extract::Path<String>| {
                    let root = Arc::clone(&shared_dir_assets);
                    async move {
                        let folders = ["pos", "kds", "admin", "kitchenkit", "web", "ops", "display", "desktop"];
                        for folder in &folders {
                            let p = root.join(folder).join("dist").join("assets").join(&file);
                            if p.is_file() {
                                if let Ok(bytes) = std::fs::read(&p) {
                                    return (
                                        axum::http::StatusCode::OK,
                                        [(axum::http::header::CONTENT_TYPE, mime_for_path(&p))],
                                        bytes,
                                    )
                                        .into_response();
                                }
                            }
                        }
                        axum::http::StatusCode::NOT_FOUND.into_response()
                    }
                }),
            )
            .route(
                "/registerSW.js",
                axum::routing::get(move || {
                    let root = Arc::clone(&shared_dir_files);
                    async move {
                        let p = root.join("pos").join("dist").join("registerSW.js");
                        if let Ok(bytes) = std::fs::read(&p) {
                            (
                                axum::http::StatusCode::OK,
                                [(axum::http::header::CONTENT_TYPE, "application/javascript; charset=utf-8")],
                                bytes,
                            )
                                .into_response()
                        } else {
                            axum::http::StatusCode::NOT_FOUND.into_response()
                        }
                    }
                }),
            );

        if env::var("CULINARYOS_LEGACY_PORTS").is_ok() || args.iter().any(|a| a == "--legacy-ports") {
            let legacy_surfaces: [(&str, u16, &str); 8] = [
                ("POS Terminal", 5172, "pos"),
                ("KDS Kitchen", 5173, "kds"),
                ("Back-Office Admin", 5174, "admin"),
                ("KitchenKit", 5175, "kitchenkit"),
                ("Guest Storefront", 5176, "web"),
                ("CulinaryOps", 5177, "ops"),
                ("Display & RecipeOS", 5178, "display"),
                ("Master Workstation", 5180, "desktop"),
            ];

            for (label, port, folder) in legacy_surfaces {
                let dist_path = apps_dir.join(folder).join("dist");
                if dist_path.is_dir() {
                    let addr = SocketAddr::from(([127, 0, 0, 1], port));
                    let router = spa_router(dist_path);
                    println!("[CulinaryOS Desktop] Legacy port {port} active for {label}");
                    tokio::spawn(async move {
                        let _ = axum_server::bind(addr)
                            .serve(router.into_make_service())
                            .await;
                    });
                }
            }
        }

        let diag_addr = SocketAddr::from(([127, 0, 0, 1], 5188));
        tokio::spawn(async move {
            let _ = axum_server::bind(diag_addr)
                .serve(diagnostics_router().into_make_service())
                .await;
        });

        workstation_url = if service.is_setup_completed() {
            format!("http://{bind_addr}")
        } else {
            format!("http://{bind_addr}/setup")
        };
    }

    println!("[CulinaryOS Desktop] Native Rust API Gateway & Unified GUI listening at http://{bind_addr}");
    println!("[CulinaryOS Desktop] Master Workstation Entry: {workstation_url}");
    println!("[CulinaryOS Desktop] Embedded Database: {}", db_path.display());

    if !args.iter().any(|a| a == "--headless") {
        try_open_native_app_window(&workstation_url);
    }

    axum_server::bind(bind_addr)
        .serve(main_router.into_make_service())
        .await
        .expect("CulinaryOS Desktop server exited");
}
