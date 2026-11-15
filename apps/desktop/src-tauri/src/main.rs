#![forbid(unsafe_code)]

use culinaryos_native::{
    local_store::{calculate_tip_pool, LocalStore, StaffRole, TipDistributionMethod, TipParticipantInput},
    standalone::StandaloneService,
};
use std::{
    env,
    net::SocketAddr,
    path::PathBuf,
    process::Command,
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
            .args(["/C", "start", "", &format!("msedge --app={url}")])
            .spawn();
    }
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
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
    let db_path = data_dir.join("culinaryos.db");
    let site_id = default_site_id();
    let saas_secret = env::var("CULINARYOS_SAAS_SIGNING_SECRET")
        .unwrap_or_else(|_| "culinaryos-default-local-signing-secret-key".to_string());
    let bind_addr: SocketAddr = env::var("CULINARYOS_DESKTOP_BIND")
        .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
        .parse()
        .expect("Valid CULINARYOS_DESKTOP_BIND socket address");

    let service = StandaloneService::open(&db_path, site_id, saas_secret)
        .expect("Initialize CulinaryOS embedded database");

    let url = format!("http://{bind_addr}");
    println!("[CulinaryOS Desktop] Native Rust Workstation listening at {url}");
    println!("[CulinaryOS Desktop] Embedded Database: {}", db_path.display());

    if !args.iter().any(|a| a == "--headless") {
        try_open_native_app_window(&url);
    }

    axum_server::bind(bind_addr)
        .serve(service.router().into_make_service())
        .await
        .expect("CulinaryOS Desktop server exited");
}
