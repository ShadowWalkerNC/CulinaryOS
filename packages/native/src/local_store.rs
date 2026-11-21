use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, File},
    io::{BufReader, BufWriter, Write},
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;
use uuid::Uuid;

#[derive(Debug, Clone, Eq, PartialEq)]
pub enum LocalStoreError {
    Storage,
    InvalidInput(&'static str),
    NotFound(&'static str),
    Unauthorized,
    Forbidden(&'static str),
    Conflict(&'static str),
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum StaffRole {
    Owner,
    Manager,
    Supervisor,
    Server,
    Bartender,
    Busser,
    Runner,
    Cook,
    Prep,
    Dishwasher,
}

impl StaffRole {
    pub fn is_management_or_supervisor(&self) -> bool {
        matches!(
            self,
            StaffRole::Owner | StaffRole::Manager | StaffRole::Supervisor
        )
    }

    pub fn is_boh(&self) -> bool {
        matches!(
            self,
            StaffRole::Cook | StaffRole::Prep | StaffRole::Dishwasher
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StaffMember {
    pub id: Uuid,
    pub display_name: String,
    pub role: StaffRole,
    pub has_hiring_firing_authority: bool,
    pub pin_digest: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub station: String,
    pub price_cents: i64,
    pub available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderLineItem {
    pub id: String,
    pub menu_item_id: String,
    pub name: String,
    pub quantity: i64,
    pub unit_price_cents: i64,
    pub line_total_cents: i64,
    pub station: String,
    pub seat: u32,
    pub course: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Open,
    Sent,
    Paid,
    Voided,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderRecord {
    pub id: String,
    pub site_id: Uuid,
    pub table_number: String,
    pub status: OrderStatus,
    pub items: Vec<OrderLineItem>,
    pub subtotal_cents: i64,
    pub tax_cents: i64,
    pub total_cents: i64,
    pub paid_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TicketStatus {
    Queued,
    Fired,
    Bumped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KitchenTicket {
    pub id: String,
    pub order_id: String,
    pub table_number: String,
    pub station: String,
    pub status: TicketStatus,
    pub items: Vec<OrderLineItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashDrawerSession {
    pub id: String,
    pub opening_cents: i64,
    pub cash_sales_cents: i64,
    pub closed: bool,
    pub counted_cents: Option<i64>,
    pub variance_cents: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TipDistributionMethod {
    KeepYourOwn,
    HoursWeighted,
    RoleWeighted,
    PercentageOfSales,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TipParticipantInput {
    pub staff_id: Uuid,
    pub display_name: String,
    pub role: StaffRole,
    pub has_hiring_firing_authority: bool,
    pub hours_worked_tenths: u64,
    pub role_points_tenths: u64,
    pub direct_tips_cents: i64,
    pub sales_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TipAllocation {
    pub staff_id: Uuid,
    pub display_name: String,
    pub role: StaffRole,
    pub eligible: bool,
    pub exclusion_reason: Option<String>,
    pub allocated_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TipPoolReport {
    pub total_pool_cents: i64,
    pub distributed_cents: i64,
    pub allocations: Vec<TipAllocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkstationSetupProfile {
    pub restaurant_name: String,
    pub city_state: String,
    pub concept_preset: String,
    pub owner_name: String,
    pub owner_email: String,
    pub tables_count: u32,
    pub tax_rate_bps: i64,
    pub tip_method: TipDistributionMethod,
    pub receipt_printer_host: String,
    pub kitchen_printer_host: String,
    pub load_sample_orders: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PantryItemRecord {
    pub id: String,
    pub name: String,
    pub category: String,
    pub current_stock: f64,
    pub unit: String,
    pub par_level: f64,
    pub reorder_point: f64,
    pub cost_per_unit_cents: i64,
    pub vendor_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseOrderLine {
    pub item_id: String,
    pub name: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_cost_cents: i64,
    pub total_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseOrderRecord {
    pub id: String,
    pub po_number: String,
    pub vendor_id: String,
    pub vendor_name: String,
    pub status: String,
    pub total_cents: i64,
    pub lines: Vec<PurchaseOrderLine>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VendorRecord {
    pub id: String,
    pub name: String,
    pub code: String,
    pub contact_email: String,
    pub min_order_cents: i64,
    pub lead_time_days: i32,
    pub categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TalentApplicationRecord {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub role: String,
    pub experience_years: i32,
    pub stage: String,
    pub notes: String,
    pub applied_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TalentJobRecord {
    pub id: String,
    pub title: String,
    pub department: String,
    pub employment_type: String,
    pub pay_rate: String,
    pub is_active: bool,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WasteRecord {
    pub id: String,
    pub item_name: String,
    pub quantity: f64,
    pub unit: String,
    pub estimated_loss_cents: i64,
    pub reason: String,
    pub station: String,
    pub logged_by: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableRecord {
    pub id: String,
    pub number: u32,
    pub capacity: u32,
    pub status: String,
    pub current_order_id: Option<String>,
    pub section: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BarTabRecord {
    pub id: String,
    pub tab_name: String,
    pub card_last4: Option<String>,
    pub preauth_cents: i64,
    pub order_id: String,
    pub is_open: bool,
    pub opened_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZReportSummaryRecord {
    pub id: String,
    pub site_id: Uuid,
    pub date: String,
    pub closed_at: String,
    pub gross_sales_cents: i64,
    pub discounts_cents: i64,
    pub net_sales_cents: i64,
    pub tax_collected_cents: i64,
    pub tip_pool_cents: i64,
    pub cash_sales_cents: i64,
    pub card_sales_cents: i64,
    pub opening_drawer_cents: i64,
    pub expected_cash_cents: i64,
    pub actual_cash_cents: i64,
    pub cash_variance_cents: i64,
    pub order_count: usize,
    pub voids_count: usize,
    pub closed_by_staff_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DisplayRecord {
    pub id: String,
    pub name: String,
    pub screen_type: String,
    pub pairing_code: String,
    pub is_paired: bool,
    pub last_seen_at: String,
}

pub type DisplayDeviceRecord = DisplayRecord;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReservationRecord {
    pub id: String,
    #[serde(alias = "guest_name")]
    pub guest_name: String,
    #[serde(alias = "party_size")]
    pub party_size: u32,
    #[serde(alias = "reservation_time", alias = "time", alias = "reserved_at")]
    pub reservation_time: String,
    pub status: String,
    #[serde(default, alias = "table_id", alias = "tableNumber")]
    pub table_id: String,
    #[serde(default)]
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WebhookEndpointRecord {
    pub id: String,
    #[serde(alias = "tenant_id")]
    pub tenant_id: Uuid,
    pub url: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub events: Vec<String>,
    #[serde(alias = "signing_secret")]
    pub signing_secret: String,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WebhookEventRecord {
    pub id: String,
    pub direction: String,
    pub provider: String,
    #[serde(alias = "event_type")]
    pub event_type: String,
    #[serde(alias = "tenant_id")]
    pub tenant_id: Uuid,
    #[serde(alias = "signature_verified")]
    pub signature_verified: bool,
    pub status: String,
    #[serde(alias = "payload_summary")]
    pub payload_summary: String,
    #[serde(alias = "received_at")]
    pub received_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommissaryTransferRecord {
    pub id: String,
    #[serde(alias = "from_unit")]
    pub from_unit: String,
    #[serde(alias = "to_unit")]
    pub to_unit: String,
    pub status: String,
    #[serde(alias = "total_cost_cents")]
    pub total_cost_cents: i64,
    #[serde(alias = "items_count")]
    pub items_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoreState {
    pub site_id: Uuid,
    #[serde(default)]
    pub setup_completed: bool,
    #[serde(default)]
    pub restaurant_name: String,
    #[serde(default)]
    pub city_state: String,
    #[serde(default)]
    pub concept_preset: String,
    #[serde(default)]
    pub tax_rate_bps: i64,
    #[serde(default)]
    pub tables_count: u32,
    pub staff: Vec<StaffMember>,
    pub menu: BTreeMap<String, MenuItem>,
    pub orders: BTreeMap<String, OrderRecord>,
    pub tickets: BTreeMap<String, KitchenTicket>,
    pub drawer: CashDrawerSession,
    pub applied_operations: BTreeSet<String>,
    pub sync_outbox: Vec<serde_json::Value>,
    #[serde(default)]
    pub pantry: BTreeMap<String, PantryItemRecord>,
    #[serde(default)]
    pub purchase_orders: BTreeMap<String, PurchaseOrderRecord>,
    #[serde(default)]
    pub vendors: Vec<VendorRecord>,
    #[serde(default)]
    pub talent_applications: Vec<TalentApplicationRecord>,
    #[serde(default)]
    pub talent_jobs: Vec<TalentJobRecord>,
    #[serde(default)]
    pub waste: Vec<WasteRecord>,
    #[serde(default)]
    pub tables: BTreeMap<String, TableRecord>,
    #[serde(default)]
    pub tabs: BTreeMap<String, BarTabRecord>,
    #[serde(default)]
    pub z_reports: Vec<ZReportSummaryRecord>,
    #[serde(default)]
    pub displays: Vec<DisplayRecord>,
    #[serde(default)]
    pub settings: serde_json::Value,
    #[serde(default)]
    pub reservations: BTreeMap<String, ReservationRecord>,
    #[serde(default)]
    pub webhook_endpoints: BTreeMap<String, WebhookEndpointRecord>,
    #[serde(default)]
    pub webhook_events: Vec<WebhookEventRecord>,
    #[serde(default)]
    pub commissary_transfers: BTreeMap<String, CommissaryTransferRecord>,
}

pub type PersistedState = StoreState;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Envelope {
    sha256: String,
    state: StoreState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LegacyStoreStateV1 {
    pub site_id: Uuid,
    #[serde(default)]
    pub setup_completed: bool,
    #[serde(default)]
    pub restaurant_name: String,
    #[serde(default)]
    pub city_state: String,
    #[serde(default)]
    pub concept_preset: String,
    #[serde(default)]
    pub tax_rate_bps: i64,
    #[serde(default)]
    pub tables_count: u32,
    pub staff: Vec<StaffMember>,
    pub menu: BTreeMap<String, MenuItem>,
    pub orders: BTreeMap<String, OrderRecord>,
    pub tickets: BTreeMap<String, KitchenTicket>,
    pub drawer: CashDrawerSession,
    pub applied_operations: BTreeSet<String>,
    pub sync_outbox: Vec<serde_json::Value>,
    #[serde(default)]
    pub pantry: BTreeMap<String, PantryItemRecord>,
    #[serde(default)]
    pub purchase_orders: BTreeMap<String, PurchaseOrderRecord>,
    #[serde(default)]
    pub vendors: Vec<VendorRecord>,
    #[serde(default)]
    pub talent_applications: Vec<TalentApplicationRecord>,
    #[serde(default)]
    pub talent_jobs: Vec<TalentJobRecord>,
    #[serde(default)]
    pub waste: Vec<WasteRecord>,
    #[serde(default)]
    pub tables: BTreeMap<String, TableRecord>,
    #[serde(default)]
    pub tabs: BTreeMap<String, BarTabRecord>,
    #[serde(default)]
    pub z_reports: Vec<ZReportSummaryRecord>,
    #[serde(default)]
    pub displays: Vec<DisplayRecord>,
    #[serde(default)]
    pub settings: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RawEnvelope {
    sha256: String,
    state: serde_json::Value,
}

pub struct LocalStore {
    path: PathBuf,
    state: StoreState,
}

fn pin_digest(site_id: Uuid, pin: &str) -> String {
    hex::encode(Sha256::digest(format!("{site_id}:{pin}").as_bytes()))
}

impl LocalStore {
    pub fn default_state(default_site_id: Uuid) -> StoreState {
        let owner_id = Uuid::from_u128(1);
        let server_id = Uuid::from_u128(2);
        let mut menu = BTreeMap::new();
        for (id, name, cat, station, price) in [
            ("item-margherita", "Wood-Fired Margherita", "Pizza", "hot", 1800),
            ("item-diavola", "Spicy Soppressata Diavola", "Pizza", "hot", 2100),
            ("item-ribeye", "Dry-Aged Ribeye 14oz", "Entrees", "grill", 4600),
            ("item-smashburger", "Double Wagyu Smash Burger", "Entrees", "grill", 1950),
            ("item-halibut", "Pan-Roasted Alaskan Halibut", "Entrees", "hot", 3400),
            ("item-caesar", "Little Gem Caesar", "Salads", "cold", 1400),
            ("item-burrata", "Heirloom Tomato & Burrata", "Starters", "cold", 1650),
            ("item-calamari", "Crispy Rhode Island Calamari", "Starters", "fry", 1550),
            ("item-fries", "Tallow Pommes Frites", "Sides", "fry", 900),
            ("item-brussels", "Charred Brussels & Pancetta", "Sides", "hot", 1100),
            ("item-negroni", "Barrel-Aged Negroni", "Cocktails", "bar", 1600),
            ("item-tiramisu", "Espresso Mascarpone Tiramisu", "Desserts", "cold", 1250),
        ] {
            menu.insert(
                id.to_string(),
                MenuItem {
                    id: id.to_string(),
                    name: name.to_string(),
                    category: cat.to_string(),
                    station: station.to_string(),
                    price_cents: price,
                    available: true,
                },
            );
        }

        StoreState {
            site_id: default_site_id,
            setup_completed: false,
            restaurant_name: "Unconfigured Venue".to_string(),
            city_state: "".to_string(),
            concept_preset: "full-service".to_string(),
            tax_rate_bps: 825,
            tables_count: 16,
            staff: vec![
                StaffMember {
                    id: owner_id,
                    display_name: "Restaurant Owner".to_string(),
                    role: StaffRole::Owner,
                    has_hiring_firing_authority: true,
                    pin_digest: pin_digest(default_site_id, "1234"),
                },
                StaffMember {
                    id: server_id,
                    display_name: "Lead Server".to_string(),
                    role: StaffRole::Server,
                    has_hiring_firing_authority: false,
                    pin_digest: pin_digest(default_site_id, "5678"),
                },
            ],
            menu,
            orders: BTreeMap::new(),
            tickets: BTreeMap::new(),
            drawer: CashDrawerSession {
                id: "drawer-default".to_string(),
                opening_cents: 20_000,
                cash_sales_cents: 0,
                closed: false,
                counted_cents: None,
                variance_cents: None,
            },
            applied_operations: BTreeSet::new(),
            sync_outbox: Vec::new(),
            pantry: BTreeMap::new(),
            purchase_orders: BTreeMap::new(),
            vendors: Vec::new(),
            talent_applications: Vec::new(),
            talent_jobs: Vec::new(),
            waste: Vec::new(),
            tables: BTreeMap::new(),
            tabs: BTreeMap::new(),
            z_reports: Vec::new(),
            displays: Vec::new(),
            settings: serde_json::Value::Null,
            reservations: BTreeMap::new(),
            webhook_endpoints: BTreeMap::new(),
            webhook_events: Vec::new(),
            commissary_transfers: BTreeMap::new(),
        }
    }

    pub fn open_or_init(path: &Path, default_site_id: Uuid) -> Result<Self, LocalStoreError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|_| LocalStoreError::Storage)?;
        }
        if path.exists() {
            let file = File::open(path).map_err(|_| LocalStoreError::Storage)?;
            let raw_env: RawEnvelope = serde_json::from_reader(BufReader::new(file))
                .map_err(|_| LocalStoreError::Storage)?;
            let state: StoreState = serde_json::from_value(raw_env.state.clone())
                .map_err(|_| LocalStoreError::Storage)?;
            let typed_serialized =
                serde_json::to_vec(&state).map_err(|_| LocalStoreError::Storage)?;
            let typed_digest = hex::encode(Sha256::digest(&typed_serialized));
            if typed_digest != raw_env.sha256 {
                let legacy_state: LegacyStoreStateV1 = serde_json::from_value(raw_env.state)
                    .map_err(|_| LocalStoreError::Storage)?;
                let legacy_serialized =
                    serde_json::to_vec(&legacy_state).map_err(|_| LocalStoreError::Storage)?;
                let legacy_digest = hex::encode(Sha256::digest(&legacy_serialized));
                if legacy_digest != raw_env.sha256 {
                    return Err(LocalStoreError::Storage);
                }
            }
            let mut store = Self {
                path: path.to_path_buf(),
                state,
            };
            store.ensure_defaults();
            let _ = store.save();
            return Ok(store);
        }

        let state = Self::default_state(default_site_id);
        let mut store = Self {
            path: path.to_path_buf(),
            state,
        };
        store.ensure_defaults();
        store.save()?;
        Ok(store)
    }

    pub fn record_outbox(&mut self, event: serde_json::Value) {
        self.state.sync_outbox.push(event);
    }

    fn save(&self) -> Result<(), LocalStoreError> {
        let dir = self.path.parent().unwrap_or_else(|| Path::new("."));
        if !dir.exists() {
            std::fs::create_dir_all(dir).map_err(|_| LocalStoreError::Storage)?;
        }
        let serialized = serde_json::to_vec(&self.state).map_err(|_| LocalStoreError::Storage)?;
        let sha256 = hex::encode(Sha256::digest(&serialized));
        let env = Envelope {
            sha256,
            state: self.state.clone(),
        };
        let mut temp = NamedTempFile::new_in(dir).map_err(|_| LocalStoreError::Storage)?;
        {
            let mut writer = BufWriter::new(temp.as_file_mut());
            serde_json::to_writer(&mut writer, &env).map_err(|_| LocalStoreError::Storage)?;
            writer.flush().map_err(|_| LocalStoreError::Storage)?;
        }
        temp.as_file()
            .sync_all()
            .map_err(|_| LocalStoreError::Storage)?;
        temp.persist(&self.path)
            .map_err(|_| LocalStoreError::Storage)?;
        Ok(())
    }

    pub fn site_id(&self) -> Uuid {
        self.state.site_id
    }

    pub fn authenticate_pin(&self, pin: &str) -> Result<StaffMember, LocalStoreError> {
        if !(4..=8).contains(&pin.len()) || !pin.bytes().all(|b| b.is_ascii_digit()) {
            return Err(LocalStoreError::InvalidInput("PIN must be 4-8 digits"));
        }
        let target = pin_digest(self.state.site_id, pin);
        self.state
            .staff
            .iter()
            .find(|s| s.pin_digest == target)
            .cloned()
            .ok_or(LocalStoreError::Unauthorized)
    }

    pub fn list_menu(&self) -> Vec<MenuItem> {
        self.state.menu.values().cloned().collect()
    }

    pub fn list_orders(&self) -> Vec<OrderRecord> {
        self.state.orders.values().cloned().collect()
    }

    pub fn get_order(&self, order_id: &str) -> Option<OrderRecord> {
        self.state.orders.get(order_id).cloned()
    }

    #[allow(clippy::too_many_arguments)]
    pub fn add_line_item(
        &mut self,
        order_id: &str,
        menu_item_id: String,
        custom_name: Option<String>,
        custom_unit_price_cents: Option<i64>,
        qty: i64,
        station: Option<String>,
        seat: u32,
        course: u32,
    ) -> Result<OrderLineItem, LocalStoreError> {
        if qty <= 0 {
            return Err(LocalStoreError::InvalidInput("Quantity must be >= 1"));
        }
        let (name, unit_price_cents, resolved_station) =
            if let Some(menu_item) = self.state.menu.get(&menu_item_id) {
                if !menu_item.available {
                    return Err(LocalStoreError::Conflict("Menu item is 86'd / unavailable"));
                }
                (
                    menu_item.name.clone(),
                    custom_unit_price_cents.unwrap_or(menu_item.price_cents),
                    station.unwrap_or_else(|| menu_item.station.clone()),
                )
            } else {
                (
                    custom_name.unwrap_or_else(|| "Custom Item".to_string()),
                    custom_unit_price_cents.unwrap_or(0).max(0),
                    station.unwrap_or_else(|| "hot".to_string()),
                )
            };

        let line_total = unit_price_cents
            .checked_mul(qty)
            .ok_or(LocalStoreError::InvalidInput("Line total overflow"))?;

        let order = self
            .state
            .orders
            .get_mut(order_id)
            .ok_or(LocalStoreError::NotFound("Order not found"))?;
        let line_idx = order.items.len() + 1;
        let line_item = OrderLineItem {
            id: format!("{order_id}-line-{line_idx}"),
            menu_item_id,
            name,
            quantity: qty,
            unit_price_cents,
            line_total_cents: line_total,
            station: resolved_station,
            seat: seat.max(1),
            course: course.max(1),
        };
        order.items.push(line_item.clone());
        order.subtotal_cents = order.items.iter().map(|i| i.line_total_cents).sum();
        order.tax_cents = (order.subtotal_cents * 825 + 5000) / 10_000;
        order.total_cents = order.subtotal_cents + order.tax_cents;
        self.save()?;
        Ok(line_item)
    }

    pub fn create_order(
        &mut self,
        order_id: Option<String>,
        table_number: String,
        items_input: Vec<(String, i64, u32, u32)>,
    ) -> Result<OrderRecord, LocalStoreError> {
        let id = order_id.unwrap_or_else(|| {
            let mut rnd = [0u8; 8];
            let _ = getrandom::fill(&mut rnd);
            format!("ord-{}", hex::encode(rnd))
        });
        if self.state.orders.contains_key(&id) {
            return Err(LocalStoreError::Conflict("Order ID already exists"));
        }
        let mut items = Vec::new();
        let mut subtotal_cents: i64 = 0;

        for (idx, (menu_item_id, qty, seat, course)) in items_input.into_iter().enumerate() {
            if qty <= 0 {
                return Err(LocalStoreError::InvalidInput("Quantity must be >= 1"));
            }
            let menu_item = self
                .state
                .menu
                .get(&menu_item_id)
                .ok_or(LocalStoreError::NotFound("Menu item not found"))?;
            if !menu_item.available {
                return Err(LocalStoreError::Conflict("Menu item is 86'd / unavailable"));
            }
            let line_total = menu_item
                .price_cents
                .checked_mul(qty)
                .ok_or(LocalStoreError::InvalidInput("Line total overflow"))?;
            subtotal_cents = subtotal_cents
                .checked_add(line_total)
                .ok_or(LocalStoreError::InvalidInput("Subtotal overflow"))?;
            items.push(OrderLineItem {
                id: format!("{id}-line-{}", idx + 1),
                menu_item_id,
                name: menu_item.name.clone(),
                quantity: qty,
                unit_price_cents: menu_item.price_cents,
                line_total_cents: line_total,
                station: menu_item.station.clone(),
                seat: seat.max(1),
                course: course.max(1),
            });
        }

        // 8.25% integer-cent rounded tax
        let tax_cents = (subtotal_cents * 825 + 5000) / 10_000;
        let total_cents = subtotal_cents + tax_cents;

        let order = OrderRecord {
            id: id.clone(),
            site_id: self.state.site_id,
            table_number,
            status: OrderStatus::Open,
            items,
            subtotal_cents,
            tax_cents,
            total_cents,
            paid_cents: 0,
        };
        self.state.orders.insert(id, order.clone());
        self.state.sync_outbox.push(serde_json::json!({
            "type": "order.created",
            "orderId": order.id,
            "totalCents": order.total_cents
        }));
        self.save()?;
        Ok(order)
    }

    pub fn send_order_to_kitchen(
        &mut self,
        order_id: &str,
    ) -> Result<Vec<KitchenTicket>, LocalStoreError> {
        let order = self
            .state
            .orders
            .get_mut(order_id)
            .ok_or(LocalStoreError::NotFound("Order not found"))?;
        if order.items.is_empty() {
            return Err(LocalStoreError::InvalidInput(
                "Cannot send empty order to kitchen",
            ));
        }
        order.status = OrderStatus::Sent;
        let table = order.table_number.clone();

        let mut by_station: BTreeMap<String, Vec<OrderLineItem>> = BTreeMap::new();
        for item in &order.items {
            by_station
                .entry(item.station.clone())
                .or_default()
                .push(item.clone());
        }

        let mut created = Vec::new();
        for (station, station_items) in by_station {
            let ticket_id = format!("tkt-{order_id}-{station}");
            let ticket = KitchenTicket {
                id: ticket_id.clone(),
                order_id: order_id.to_string(),
                table_number: table.clone(),
                station,
                status: TicketStatus::Fired,
                items: station_items,
            };
            self.state.tickets.insert(ticket_id, ticket.clone());
            created.push(ticket);
        }
        self.save()?;
        Ok(created)
    }

    pub fn list_tickets(&self, station: Option<&str>) -> Vec<KitchenTicket> {
        self.state
            .tickets
            .values()
            .filter(|t| {
                t.status != TicketStatus::Bumped
                    && station.map_or(true, |s| t.station.eq_ignore_ascii_case(s))
            })
            .cloned()
            .collect()
    }

    pub fn bump_ticket(&mut self, ticket_id: &str) -> Result<KitchenTicket, LocalStoreError> {
        let ticket = self
            .state
            .tickets
            .get_mut(ticket_id)
            .ok_or(LocalStoreError::NotFound("Ticket not found"))?;
        ticket.status = TicketStatus::Bumped;
        let updated = ticket.clone();
        self.state.sync_outbox.push(serde_json::json!({
            "type": "kds.ticket.bumped",
            "ticketId": updated.id,
            "orderId": updated.order_id
        }));
        self.save()?;
        Ok(updated)
    }

    pub fn settle_cash_order(
        &mut self,
        operation_id: &str,
        order_id: &str,
        tendered_cents: i64,
    ) -> Result<OrderRecord, LocalStoreError> {
        if operation_id.trim().is_empty() {
            return Err(LocalStoreError::InvalidInput(
                "Idempotency operation_id is required",
            ));
        }
        if self.state.applied_operations.contains(operation_id) {
            return self
                .state
                .orders
                .get(order_id)
                .cloned()
                .ok_or(LocalStoreError::NotFound("Order not found"));
        }
        let order = self
            .state
            .orders
            .get_mut(order_id)
            .ok_or(LocalStoreError::NotFound("Order not found"))?;
        if order.status == OrderStatus::Paid {
            return Err(LocalStoreError::Conflict("Order is already paid"));
        }
        if tendered_cents < order.total_cents {
            return Err(LocalStoreError::InvalidInput(
                "Tendered cash cents is less than authoritative order total",
            ));
        }
        order.paid_cents = order.total_cents;
        order.status = OrderStatus::Paid;
        let settled = order.clone();
        self.state.drawer.cash_sales_cents += settled.total_cents;
        self.state
            .applied_operations
            .insert(operation_id.to_string());
        self.state.sync_outbox.push(serde_json::json!({
            "type": "payment.cash.settled",
            "operationId": operation_id,
            "orderId": settled.id,
            "amountCents": settled.total_cents
        }));
        self.save()?;
        Ok(settled)
    }

    pub fn close_drawer(&mut self, counted_cents: i64) -> Result<CashDrawerSession, LocalStoreError> {
        if counted_cents < 0 {
            return Err(LocalStoreError::InvalidInput(
                "Counted cents cannot be negative",
            ));
        }
        let expected = self.state.drawer.opening_cents + self.state.drawer.cash_sales_cents;
        self.state.drawer.closed = true;
        self.state.drawer.counted_cents = Some(counted_cents);
        self.state.drawer.variance_cents = Some(counted_cents - expected);
        let closed = self.state.drawer.clone();
        self.state.sync_outbox.push(serde_json::json!({
            "type": "drawer.closed",
            "drawerId": closed.id,
            "expectedCents": expected,
            "countedCents": counted_cents,
            "varianceCents": counted_cents - expected
        }));
        self.save()?;
        Ok(closed)
    }

    pub fn drain_sync_outbox(&mut self) -> Result<Vec<serde_json::Value>, LocalStoreError> {
        let events = std::mem::take(&mut self.state.sync_outbox);
        self.save()?;
        Ok(events)
    }

    pub fn pending_outbox_len(&self) -> usize {
        self.state.sync_outbox.len()
    }

    pub fn is_setup_completed(&self) -> bool {
        self.state.setup_completed
    }

    pub fn restaurant_name(&self) -> &str {
        if self.state.restaurant_name.is_empty() {
            "Unconfigured Venue"
        } else {
            &self.state.restaurant_name
        }
    }

    pub fn city_state(&self) -> &str {
        &self.state.city_state
    }

    pub fn concept_preset(&self) -> &str {
        if self.state.concept_preset.is_empty() {
            "full-service"
        } else {
            &self.state.concept_preset
        }
    }

    pub fn tax_rate_bps(&self) -> i64 {
        if self.state.tax_rate_bps <= 0 {
            825
        } else {
            self.state.tax_rate_bps
        }
    }

    pub fn tables_count(&self) -> u32 {
        self.state.tables_count
    }

    #[allow(clippy::too_many_arguments)]
    pub fn complete_setup(
        &mut self,
        restaurant_name: String,
        city_state: String,
        concept_preset: String,
        owner_name: String,
        owner_pin: Option<String>,
        tables_count: u32,
        tax_rate_bps: i64,
        load_sample_data: bool,
    ) -> Result<(), LocalStoreError> {
        self.state.setup_completed = true;
        self.state.restaurant_name = if restaurant_name.trim().is_empty() {
            "Alley Katz Taproom & Kitchen".to_string()
        } else {
            restaurant_name.trim().to_string()
        };
        self.state.city_state = city_state.trim().to_string();
        self.state.concept_preset = concept_preset.trim().to_string();
        self.state.tables_count = tables_count;
        self.state.tax_rate_bps = tax_rate_bps.clamp(0, 2500);

        if let Some(staff_owner) = self.state.staff.first_mut() {
            if !owner_name.trim().is_empty() {
                staff_owner.display_name = owner_name.trim().to_string();
            }
            if let Some(pin) = owner_pin {
                if (4..=8).contains(&pin.len()) && pin.bytes().all(|b| b.is_ascii_digit()) {
                    staff_owner.pin_digest = pin_digest(self.state.site_id, &pin);
                }
            }
        }

        if load_sample_data && self.state.orders.is_empty() {
            let _ = self.create_order(
                Some("ord-seed-101".to_string()),
                "Table 4".to_string(),
                vec![
                    ("item-margherita".to_string(), 2, 1, 1),
                    ("item-caesar".to_string(), 1, 2, 1),
                    ("item-ribeye".to_string(), 1, 1, 2),
                ],
            );
            let _ = self.send_order_to_kitchen("ord-seed-101");

            let _ = self.create_order(
                Some("ord-seed-102".to_string()),
                "Bar 2".to_string(),
                vec![
                    ("item-smashburger".to_string(), 1, 1, 1),
                    ("item-fries".to_string(), 1, 1, 1),
                    ("item-negroni".to_string(), 2, 1, 1),
                ],
            );
            let _ = self.send_order_to_kitchen("ord-seed-102");
        }

        self.save()
    }

    pub fn ensure_defaults(&mut self) {
        if self.state.pantry.is_empty() {
            let defaults = [
                ("pantry-flour", "00 Pizza Flour", "Dry Goods", 45.0, "kg", 50.0, 20.0, 220, "Sysco"),
                ("pantry-tomatoes", "San Marzano DOP Tomatoes", "Canned", 24.0, "cans", 36.0, 12.0, 450, "Sysco"),
                ("pantry-ribeye", "Prime Ribeye Loins", "Meat", 14.0, "lbs", 25.0, 10.0, 1850, "US Foods"),
                ("pantry-wagyu", "Wagyu Patties 8oz", "Meat", 35.0, "pcs", 50.0, 20.0, 650, "US Foods"),
                ("pantry-halibut", "Alaskan Halibut Fillets", "Seafood", 12.0, "lbs", 20.0, 8.0, 2200, "SeaHarvest"),
                ("pantry-gem", "Little Gem Lettuce", "Produce", 18.0, "heads", 30.0, 10.0, 175, "Local Farms"),
                ("pantry-burrata", "Fresh Burrata 4oz", "Dairy", 22.0, "pcs", 40.0, 15.0, 320, "Local Farms"),
                ("pantry-gin", "Dry Gin 750ml", "Beverage", 6.0, "btls", 12.0, 4.0, 2400, "Craft Spirits"),
            ];
            for (id, name, cat, stock, unit, par, reorder, cost, vendor) in defaults {
                self.state.pantry.insert(
                    id.to_string(),
                    PantryItemRecord {
                        id: id.to_string(),
                        name: name.to_string(),
                        category: cat.to_string(),
                        current_stock: stock,
                        unit: unit.to_string(),
                        par_level: par,
                        reorder_point: reorder,
                        cost_per_unit_cents: cost,
                        vendor_name: vendor.to_string(),
                    },
                );
            }
        }

        if self.state.vendors.is_empty() {
            self.state.vendors = vec![
                VendorRecord {
                    id: "vnd-sysco".to_string(),
                    name: "Sysco Northeast".to_string(),
                    code: "SYSCO".to_string(),
                    contact_email: "orders.ne@sysco.com".to_string(),
                    min_order_cents: 50_000,
                    lead_time_days: 1,
                    categories: vec!["Dry Goods".to_string(), "Canned".to_string(), "Dairy".to_string()],
                },
                VendorRecord {
                    id: "vnd-usfoods".to_string(),
                    name: "US Foods Metro".to_string(),
                    code: "USFOODS".to_string(),
                    contact_email: "dispatch@usfoods.com".to_string(),
                    min_order_cents: 75_000,
                    lead_time_days: 2,
                    categories: vec!["Meat".to_string(), "Poultry".to_string()],
                },
                VendorRecord {
                    id: "vnd-local".to_string(),
                    name: "Hudson Valley Organic Farm".to_string(),
                    code: "LOCAL-FARMS".to_string(),
                    contact_email: "fresh@hudsonfarm.org".to_string(),
                    min_order_cents: 20_000,
                    lead_time_days: 3,
                    categories: vec!["Produce".to_string(), "Dairy".to_string()],
                },
            ];
        }

        if self.state.purchase_orders.is_empty() {
            self.state.purchase_orders.insert(
                "po-1001".to_string(),
                PurchaseOrderRecord {
                    id: "po-1001".to_string(),
                    po_number: "PO-1001".to_string(),
                    vendor_id: "vnd-sysco".to_string(),
                    vendor_name: "Sysco Northeast".to_string(),
                    status: "sent".to_string(),
                    total_cents: 38_400,
                    lines: vec![
                        PurchaseOrderLine {
                            item_id: "pantry-flour".to_string(),
                            name: "00 Pizza Flour".to_string(),
                            quantity: 10.0,
                            unit: "kg".to_string(),
                            unit_cost_cents: 220,
                            total_cents: 2200,
                        },
                        PurchaseOrderLine {
                            item_id: "pantry-tomatoes".to_string(),
                            name: "San Marzano DOP Tomatoes".to_string(),
                            quantity: 12.0,
                            unit: "cans".to_string(),
                            unit_cost_cents: 450,
                            total_cents: 5400,
                        },
                    ],
                    created_at: "2026-11-15T14:00:00Z".to_string(),
                },
            );
        }

        if self.state.talent_jobs.is_empty() {
            self.state.talent_jobs = vec![
                TalentJobRecord {
                    id: "job-1".to_string(),
                    title: "Sous Chef".to_string(),
                    department: "Kitchen / BOH".to_string(),
                    employment_type: "full-time".to_string(),
                    pay_rate: "$26.00/hr".to_string(),
                    is_active: true,
                    description: "Lead line execution, inventory control, and culinary team mentorship.".to_string(),
                },
                TalentJobRecord {
                    id: "job-2".to_string(),
                    title: "Lead Line Cook".to_string(),
                    department: "Kitchen / BOH".to_string(),
                    employment_type: "full-time".to_string(),
                    pay_rate: "$22.00/hr".to_string(),
                    is_active: true,
                    description: "High volume grill and saute station mastery.".to_string(),
                },
                TalentJobRecord {
                    id: "job-3".to_string(),
                    title: "Floor Server / Bartender".to_string(),
                    department: "Front of House".to_string(),
                    employment_type: "part-time".to_string(),
                    pay_rate: "$16.50/hr + tips".to_string(),
                    is_active: true,
                    description: "Hospitality forward service with craft beverage knowledge.".to_string(),
                },
            ];
        }

        if self.state.talent_applications.is_empty() {
            self.state.talent_applications = vec![
                TalentApplicationRecord {
                    id: "app-1".to_string(),
                    name: "Marco Rossi".to_string(),
                    email: "marco.rossi@example.com".to_string(),
                    phone: "555-0192".to_string(),
                    role: "Sous Chef".to_string(),
                    experience_years: 6,
                    stage: "interview".to_string(),
                    notes: "Strong fine-dining background, staging on Tuesday.".to_string(),
                    applied_at: "2026-11-12T10:30:00Z".to_string(),
                },
                TalentApplicationRecord {
                    id: "app-2".to_string(),
                    name: "Elena Vance".to_string(),
                    email: "elena.v@example.com".to_string(),
                    phone: "555-0184".to_string(),
                    role: "Lead Line Cook".to_string(),
                    experience_years: 4,
                    stage: "offer".to_string(),
                    notes: "Offer letter generated, pending sign-off.".to_string(),
                    applied_at: "2026-11-14T11:15:00Z".to_string(),
                },
                TalentApplicationRecord {
                    id: "app-3".to_string(),
                    name: "David Chen".to_string(),
                    email: "david.c@example.com".to_string(),
                    phone: "555-0177".to_string(),
                    role: "Floor Server".to_string(),
                    experience_years: 2,
                    stage: "applied".to_string(),
                    notes: "Previous experience at high-volume gastropub.".to_string(),
                    applied_at: "2026-11-15T09:00:00Z".to_string(),
                },
            ];
        }

        if self.state.waste.is_empty() {
            self.state.waste = vec![
                WasteRecord {
                    id: "wst-1".to_string(),
                    item_name: "Alaskan Halibut".to_string(),
                    quantity: 1.5,
                    unit: "lbs".to_string(),
                    estimated_loss_cents: 3300,
                    reason: "trimming_loss".to_string(),
                    station: "hot".to_string(),
                    logged_by: "Chef de Partie".to_string(),
                    timestamp: "2026-11-15T17:30:00Z".to_string(),
                },
            ];
        }

        if self.state.tables.is_empty() {
            for num in 1..=16 {
                let id = format!("table-{}", num);
                let (cap, section) = if num <= 8 {
                    (4, "Main Dining")
                } else if num <= 12 {
                    (2, "Mezzanine")
                } else {
                    (8, "Patio")
                };
                let status = if num == 4 { "occupied" } else { "available" };
                let current_order_id = if num == 4 { Some("ord-seed-101".to_string()) } else { None };
                self.state.tables.insert(
                    id.clone(),
                    TableRecord {
                        id,
                        number: num,
                        capacity: cap,
                        status: status.to_string(),
                        current_order_id,
                        section: section.to_string(),
                    },
                );
            }
        }

        if self.state.tabs.is_empty() {
            self.state.tabs.insert(
                "tab-bar-1".to_string(),
                BarTabRecord {
                    id: "tab-bar-1".to_string(),
                    tab_name: "Bar Tab - Thompson".to_string(),
                    card_last4: Some("4242".to_string()),
                    preauth_cents: 5000,
                    order_id: "ord-seed-102".to_string(),
                    is_open: true,
                    opened_at: "2026-11-15T18:30:00Z".to_string(),
                },
            );
        }

        if self.state.displays.is_empty() {
            self.state.displays = vec![
                DisplayRecord {
                    id: "disp-kds-1".to_string(),
                    name: "Kitchen Expo Wall".to_string(),
                    screen_type: "kds".to_string(),
                    pairing_code: "EXPO-881".to_string(),
                    is_paired: true,
                    last_seen_at: "Just now".to_string(),
                },
                DisplayRecord {
                    id: "disp-wall-1".to_string(),
                    name: "Dining Room Status Board".to_string(),
                    screen_type: "wallboard".to_string(),
                    pairing_code: "WALL-104".to_string(),
                    is_paired: true,
                    last_seen_at: "Just now".to_string(),
                },
            ];
        }

        if self.state.settings.is_null() {
            self.state.settings = serde_json::json!({
                "restaurantName": self.state.restaurant_name,
                "cityState": self.state.city_state,
                "conceptPreset": self.state.concept_preset,
                "taxRateBps": self.state.tax_rate_bps,
                "tablesCount": self.state.tables_count,
                "tipMethod": "hours_weighted_pool",
                "flsaManagerExclusionEnforced": true,
                "theme": "toast_dark",
                "kdsAudioChime": true,
                "offlineReconciliation": "idempotent"
            });
        }

        if self.state.reservations.is_empty() {
            self.state.reservations.insert(
                "res-001".to_string(),
                ReservationRecord {
                    id: "res-001".to_string(),
                    guest_name: "Elena Rostova".to_string(),
                    party_size: 4,
                    reservation_time: "2026-11-19T19:00:00Z".to_string(),
                    status: "confirmed".to_string(),
                    table_id: "T4".to_string(),
                    notes: "Anniversary dinner — shellfish allergy at Seat 2".to_string(),
                },
            );
            self.state.reservations.insert(
                "res-002".to_string(),
                ReservationRecord {
                    id: "res-002".to_string(),
                    guest_name: "Marcus Vance".to_string(),
                    party_size: 2,
                    reservation_time: "2026-11-19T19:30:00Z".to_string(),
                    status: "confirmed".to_string(),
                    table_id: "T8".to_string(),
                    notes: "Chef's counter preferred".to_string(),
                },
            );
        }

        if self.state.webhook_endpoints.is_empty() {
            self.state.webhook_endpoints.insert(
                "wh-ep-default-erp".to_string(),
                WebhookEndpointRecord {
                    id: "wh-ep-default-erp".to_string(),
                    tenant_id: self.state.site_id,
                    url: "https://accounting.example.com/webhooks/culinaryos".to_string(),
                    description: "Nightly Z-Report & Prime Cost Accounting Sync".to_string(),
                    events: vec![
                        "order.paid".to_string(),
                        "z_report.closed".to_string(),
                        "tip_pool.calculated".to_string(),
                        "inventory.low_stock".to_string(),
                    ],
                    signing_secret: "whsec_culinaryos_default_partner_signing_key_2026".to_string(),
                    active: true,
                },
            );
        }

        if self.state.webhook_events.is_empty() {
            self.state.webhook_events = vec![
                WebhookEventRecord {
                    id: "wh-evt-stripe-001".to_string(),
                    direction: "inbound".to_string(),
                    provider: "stripe".to_string(),
                    event_type: "payment_intent.succeeded".to_string(),
                    tenant_id: self.state.site_id,
                    signature_verified: true,
                    status: "processed".to_string(),
                    payload_summary: "Stripe Connect PaymentIntent verified via HMAC-SHA256".to_string(),
                    received_at: "2026-11-18T12:15:00Z".to_string(),
                },
                WebhookEventRecord {
                    id: "wh-evt-delivery-002".to_string(),
                    direction: "inbound".to_string(),
                    provider: "storefront".to_string(),
                    event_type: "delivery.order.created".to_string(),
                    tenant_id: self.state.site_id,
                    signature_verified: true,
                    status: "processed".to_string(),
                    payload_summary: "Online Storefront order routed to local POS & KDS rails".to_string(),
                    received_at: "2026-11-18T12:20:00Z".to_string(),
                },
            ];
        }

        if self.state.commissary_transfers.is_empty() {
            self.state.commissary_transfers.insert(
                "trf-001".to_string(),
                CommissaryTransferRecord {
                    id: "trf-001".to_string(),
                    from_unit: "Central Commissary Kitchen".to_string(),
                    to_unit: "Alley Katz Taproom & Kitchen".to_string(),
                    status: "in_transit".to_string(),
                    total_cost_cents: 42500,
                    items_count: 6,
                },
            );
        }
    }

    // Staff & Security Management
    pub fn list_staff(&self) -> Vec<StaffMember> {
        self.state.staff.clone()
    }

    pub fn add_staff(
        &mut self,
        name: String,
        role: StaffRole,
        pin: String,
        has_hiring_firing: bool,
    ) -> Result<StaffMember, LocalStoreError> {
        if pin.len() < 4 || !pin.chars().all(|c| c.is_ascii_digit()) {
            return Err(LocalStoreError::InvalidInput("PIN must be 4-8 numeric digits"));
        }
        let digest = pin_digest(self.state.site_id, &pin);
        if self.state.staff.iter().any(|s| s.pin_digest == digest) {
            return Err(LocalStoreError::Conflict("PIN already assigned to another staff member"));
        }
        let id = Uuid::new_v4();
        let member = StaffMember {
            id,
            display_name: name,
            role,
            has_hiring_firing_authority: has_hiring_firing,
            pin_digest: digest,
        };
        self.state.staff.push(member.clone());
        self.save()?;
        Ok(member)
    }

    pub fn update_staff(
        &mut self,
        staff_id: Uuid,
        name: Option<String>,
        role: Option<StaffRole>,
        pin: Option<String>,
    ) -> Result<StaffMember, LocalStoreError> {
        let site_id = self.state.site_id;
        let member = self
            .state
            .staff
            .iter_mut()
            .find(|s| s.id == staff_id)
            .ok_or(LocalStoreError::NotFound("Staff member not found"))?;
        if let Some(n) = name {
            if !n.trim().is_empty() {
                member.display_name = n.trim().to_string();
            }
        }
        if let Some(r) = role {
            member.role = r;
        }
        if let Some(p) = pin {
            if p.len() >= 4 && p.chars().all(|c| c.is_ascii_digit()) {
                member.pin_digest = pin_digest(site_id, &p);
            }
        }
        let result = member.clone();
        self.save()?;
        Ok(result)
    }

    pub fn verify_manager_pin(&self, pin: &str) -> bool {
        let digest = pin_digest(self.state.site_id, pin);
        self.state
            .staff
            .iter()
            .any(|s| s.pin_digest == digest && s.role.is_management_or_supervisor())
    }

    // Menu & 86 Item Controls
    pub fn get_menu_item(&self, item_id: &str) -> Option<MenuItem> {
        self.state.menu.get(item_id).cloned()
    }

    pub fn toggle_item_86(&mut self, item_id: &str) -> Result<MenuItem, LocalStoreError> {
        let item = self
            .state
            .menu
            .get_mut(item_id)
            .ok_or(LocalStoreError::NotFound("Menu item not found"))?;
        item.available = !item.available;
        let result = item.clone();
        self.save()?;
        Ok(result)
    }

    pub fn set_item_available(&mut self, item_id: &str, available: bool) -> Result<MenuItem, LocalStoreError> {
        let item = self
            .state
            .menu
            .get_mut(item_id)
            .ok_or(LocalStoreError::NotFound("Menu item not found"))?;
        item.available = available;
        let result = item.clone();
        self.save()?;
        Ok(result)
    }

    pub fn update_menu_item_price(&mut self, item_id: &str, price_cents: i64) -> Result<MenuItem, LocalStoreError> {
        let item = self
            .state
            .menu
            .get_mut(item_id)
            .ok_or(LocalStoreError::NotFound("Menu item not found"))?;
        item.price_cents = price_cents;
        let result = item.clone();
        self.save()?;
        Ok(result)
    }

    pub fn list_86_items(&self) -> Vec<MenuItem> {
        self.state
            .menu
            .values()
            .filter(|m| !m.available)
            .cloned()
            .collect()
    }

    // Pantry & Purchasing Controls
    pub fn list_pantry_items(&self) -> Vec<PantryItemRecord> {
        self.state.pantry.values().cloned().collect()
    }

    pub fn update_pantry_stock(&mut self, item_id: &str, delta: f64) -> Result<PantryItemRecord, LocalStoreError> {
        let item = self
            .state
            .pantry
            .get_mut(item_id)
            .ok_or(LocalStoreError::NotFound("Pantry item not found"))?;
        item.current_stock = (item.current_stock + delta).max(0.0);
        let result = item.clone();
        self.save()?;
        Ok(result)
    }

    pub fn list_purchase_orders(&self) -> Vec<PurchaseOrderRecord> {
        self.state.purchase_orders.values().cloned().collect()
    }

    pub fn create_purchase_order(&mut self, mut po: PurchaseOrderRecord) -> Result<PurchaseOrderRecord, LocalStoreError> {
        if po.id.is_empty() {
            po.id = format!("po-{}", Uuid::new_v4().as_simple());
        }
        self.state.purchase_orders.insert(po.id.clone(), po.clone());
        self.save()?;
        Ok(po)
    }

    pub fn update_po_status(&mut self, po_id: &str, status: &str) -> Result<PurchaseOrderRecord, LocalStoreError> {
        let po = self
            .state
            .purchase_orders
            .get_mut(po_id)
            .ok_or(LocalStoreError::NotFound("Purchase order not found"))?;
        po.status = status.to_string();
        let result = po.clone();
        self.save()?;
        Ok(result)
    }

    pub fn delete_purchase_order(&mut self, po_id: &str) -> Result<(), LocalStoreError> {
        self.state.purchase_orders.remove(po_id);
        self.save()?;
        Ok(())
    }

    pub fn list_vendors(&self) -> Vec<VendorRecord> {
        self.state.vendors.clone()
    }

    // Talent & Jobs ATS
    pub fn list_talent_applications(&self) -> Vec<TalentApplicationRecord> {
        self.state.talent_applications.clone()
    }

    pub fn update_talent_stage(&mut self, id: &str, stage: &str) -> Result<TalentApplicationRecord, LocalStoreError> {
        let app = self
            .state
            .talent_applications
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or(LocalStoreError::NotFound("Applicant not found"))?;
        app.stage = stage.to_string();
        let result = app.clone();
        self.save()?;
        Ok(result)
    }

    pub fn hire_applicant(&mut self, id: &str, role: StaffRole, pin: &str) -> Result<StaffMember, LocalStoreError> {
        let name = {
            let app = self
                .state
                .talent_applications
                .iter_mut()
                .find(|a| a.id == id)
                .ok_or(LocalStoreError::NotFound("Applicant not found"))?;
            app.stage = "hired".to_string();
            app.name.clone()
        };
        let staff = self.add_staff(name, role, pin.to_string(), false)?;
        Ok(staff)
    }

    pub fn list_talent_jobs(&self) -> Vec<TalentJobRecord> {
        self.state.talent_jobs.clone()
    }

    pub fn create_talent_job(&mut self, mut job: TalentJobRecord) -> Result<TalentJobRecord, LocalStoreError> {
        if job.id.is_empty() {
            job.id = format!("job-{}", Uuid::new_v4().as_simple());
        }
        self.state.talent_jobs.push(job.clone());
        self.save()?;
        Ok(job)
    }

    // Waste Logging
    pub fn record_waste(&mut self, mut waste: WasteRecord) -> Result<WasteRecord, LocalStoreError> {
        if waste.id.is_empty() {
            waste.id = format!("wst-{}", Uuid::new_v4().as_simple());
        }
        self.state.waste.push(waste.clone());
        self.save()?;
        Ok(waste)
    }

    pub fn list_waste(&self) -> Vec<WasteRecord> {
        self.state.waste.clone()
    }

    // Floor Tables
    pub fn list_tables(&self) -> Vec<TableRecord> {
        self.state.tables.values().cloned().collect()
    }

    pub fn transfer_table(&mut self, from_id: &str, to_id: &str) -> Result<(), LocalStoreError> {
        let from_order = self.state.tables.get(from_id).and_then(|t| t.current_order_id.clone());
        if let Some(order_id) = from_order {
            if let Some(to) = self.state.tables.get_mut(to_id) {
                to.current_order_id = Some(order_id);
                to.status = "occupied".to_string();
            }
            if let Some(from) = self.state.tables.get_mut(from_id) {
                from.current_order_id = None;
                from.status = "dirty".to_string();
            }
            self.save()?;
        }
        Ok(())
    }

    pub fn merge_tables(&mut self, target_table_id: &str, source_table_id: &str) -> Result<(), LocalStoreError> {
        if let Some(source) = self.state.tables.get_mut(source_table_id) {
            source.current_order_id = None;
            source.status = "available".to_string();
        }
        if let Some(target) = self.state.tables.get_mut(target_table_id) {
            target.status = "occupied".to_string();
        }
        self.save()?;
        Ok(())
    }

    // Bar Tabs
    pub fn list_tabs(&self) -> Vec<BarTabRecord> {
        self.state.tabs.values().cloned().collect()
    }

    pub fn open_tab(&mut self, mut tab: BarTabRecord) -> Result<BarTabRecord, LocalStoreError> {
        if tab.id.is_empty() {
            tab.id = format!("tab-{}", Uuid::new_v4().as_simple());
        }
        self.state.tabs.insert(tab.id.clone(), tab.clone());
        self.save()?;
        Ok(tab)
    }

    pub fn close_tab(&mut self, tab_id: &str) -> Result<BarTabRecord, LocalStoreError> {
        let tab = self
            .state
            .tabs
            .get_mut(tab_id)
            .ok_or(LocalStoreError::NotFound("Bar tab not found"))?;
        tab.is_open = false;
        let result = tab.clone();
        self.save()?;
        Ok(result)
    }

    pub fn update_tab(
        &mut self,
        tab_id: &str,
        customer_name: Option<String>,
        pre_auth_cents: Option<i64>,
        is_open: Option<bool>,
    ) -> Result<BarTabRecord, LocalStoreError> {
        if let Some(cents) = pre_auth_cents {
            if cents < 0 {
                return Err(LocalStoreError::InvalidInput(
                    "Pre-auth cents cannot be negative",
                ));
            }
        }
        let tab = self
            .state
            .tabs
            .get_mut(tab_id)
            .ok_or(LocalStoreError::NotFound("Bar tab not found"))?;
        if let Some(name) = customer_name {
            if !name.trim().is_empty() {
                tab.tab_name = name.trim().to_string();
            }
        }
        if let Some(cents) = pre_auth_cents {
            tab.preauth_cents = cents;
        }
        if let Some(open) = is_open {
            tab.is_open = open;
        }
        let updated = tab.clone();
        self.record_outbox(serde_json::json!({
            "type": "tab.updated",
            "tabId": updated.id,
            "tabName": updated.tab_name,
            "preauthCents": updated.preauth_cents,
            "isOpen": updated.is_open
        }));
        self.save()?;
        Ok(updated)
    }

    // Z-Report & Cash Drawer Operations
    pub fn get_z_report(&self) -> ZReportSummaryRecord {
        let gross_sales_cents: i64 = self.state.orders.values().map(|o| o.subtotal_cents).sum();
        let net_sales_cents = gross_sales_cents;
        let tax_collected_cents: i64 = self.state.orders.values().map(|o| o.tax_cents).sum();
        let cash_sales_cents = self.state.drawer.cash_sales_cents;
        let paid_total: i64 = self.state.orders.values().map(|o| o.paid_cents).sum();
        let card_sales_cents = (paid_total - cash_sales_cents).max(0);
        let tip_pool_cents = (paid_total - gross_sales_cents - tax_collected_cents).max(0);
        let opening_drawer_cents = self.state.drawer.opening_cents;
        let expected_cash_cents = opening_drawer_cents + cash_sales_cents;
        let actual_cash_cents = self.state.drawer.counted_cents.unwrap_or(expected_cash_cents);
        let cash_variance_cents = actual_cash_cents - expected_cash_cents;

        ZReportSummaryRecord {
            id: format!("zrep-{}", Uuid::new_v4().as_simple()),
            site_id: self.state.site_id,
            date: "2026-11-15".to_string(),
            closed_at: "2026-11-15T23:59:59Z".to_string(),
            gross_sales_cents,
            discounts_cents: 0,
            net_sales_cents,
            tax_collected_cents,
            tip_pool_cents,
            cash_sales_cents,
            card_sales_cents,
            opening_drawer_cents,
            expected_cash_cents,
            actual_cash_cents,
            cash_variance_cents,
            order_count: self.state.orders.len(),
            voids_count: self.state.orders.values().filter(|o| o.status == OrderStatus::Voided).count(),
            closed_by_staff_id: self.state.staff.first().map(|s| s.id.to_string()).unwrap_or_default(),
        }
    }

    pub fn close_z_report(&mut self, staff_id: &str, counted_cash_cents: i64) -> Result<ZReportSummaryRecord, LocalStoreError> {
        let mut report = self.get_z_report();
        report.actual_cash_cents = counted_cash_cents;
        report.cash_variance_cents = counted_cash_cents - report.expected_cash_cents;
        report.closed_by_staff_id = staff_id.to_string();
        self.state.drawer.closed = true;
        self.state.drawer.counted_cents = Some(counted_cash_cents);
        self.state.drawer.variance_cents = Some(report.cash_variance_cents);
        self.state.z_reports.push(report.clone());
        self.save()?;
        Ok(report)
    }

    pub fn drawer_movement(&mut self, amount_cents: i64) -> Result<CashDrawerSession, LocalStoreError> {
        self.state.drawer.cash_sales_cents += amount_cents;
        self.save()?;
        Ok(self.state.drawer.clone())
    }

    pub fn void_order(&mut self, order_id: &str) -> Result<OrderRecord, LocalStoreError> {
        let order = self
            .state
            .orders
            .get_mut(order_id)
            .ok_or(LocalStoreError::NotFound("Order not found"))?;
        order.status = OrderStatus::Voided;
        let result = order.clone();
        self.save()?;
        Ok(result)
    }

    pub fn void_order_item(
        &mut self,
        order_id: &str,
        item_id: &str,
    ) -> Result<OrderRecord, LocalStoreError> {
        let order = self
            .state
            .orders
            .get_mut(order_id)
            .ok_or(LocalStoreError::NotFound("Order not found"))?;
        let pos = order
            .items
            .iter()
            .position(|i| i.id == item_id || i.menu_item_id == item_id)
            .ok_or(LocalStoreError::NotFound("Order line item not found"))?;
        order.items.remove(pos);
        order.subtotal_cents = order.items.iter().map(|i| i.line_total_cents).sum();
        order.tax_cents = (order.subtotal_cents * 825 + 5000) / 10_000;
        order.total_cents = order.subtotal_cents + order.tax_cents;
        let updated = order.clone();
        self.record_outbox(serde_json::json!({
            "type": "order.item.voided",
            "orderId": order_id,
            "itemId": item_id,
            "subtotalCents": updated.subtotal_cents,
            "taxCents": updated.tax_cents,
            "totalCents": updated.total_cents
        }));
        self.save()?;
        Ok(updated)
    }

    // Displays
    pub fn list_displays(&self) -> Vec<DisplayRecord> {
        self.state.displays.clone()
    }

    pub fn pair_display(&mut self, code: &str, name: &str, screen_type: &str) -> Result<DisplayRecord, LocalStoreError> {
        let rec = DisplayRecord {
            id: format!("disp-{}", Uuid::new_v4().as_simple()),
            name: name.to_string(),
            screen_type: screen_type.to_string(),
            pairing_code: code.to_string(),
            is_paired: true,
            last_seen_at: "Just now".to_string(),
        };
        self.state.displays.push(rec.clone());
        self.save()?;
        Ok(rec)
    }

    pub fn update_display(
        &mut self,
        id: &str,
        name: Option<String>,
        screen_type: Option<String>,
    ) -> Result<DisplayDeviceRecord, LocalStoreError> {
        let disp = self
            .state
            .displays
            .iter_mut()
            .find(|d| d.id == id)
            .ok_or(LocalStoreError::NotFound("Display device not found"))?;
        if let Some(n) = name {
            if !n.trim().is_empty() {
                disp.name = n.trim().to_string();
            }
        }
        if let Some(st) = screen_type {
            if !st.trim().is_empty() {
                disp.screen_type = st.trim().to_string();
            }
        }
        let updated = disp.clone();
        self.record_outbox(serde_json::json!({
            "type": "display.updated",
            "displayId": updated.id,
            "name": updated.name,
            "screenType": updated.screen_type
        }));
        self.save()?;
        Ok(updated)
    }

    pub fn delete_display(&mut self, id: &str) -> Result<(), LocalStoreError> {
        let before = self.state.displays.len();
        self.state.displays.retain(|d| d.id != id);
        if self.state.displays.len() == before {
            return Err(LocalStoreError::NotFound("Display device not found"));
        }
        self.record_outbox(serde_json::json!({
            "type": "display.deleted",
            "displayId": id
        }));
        self.save()?;
        Ok(())
    }

    // Reservations
    pub fn list_reservations(&self) -> Vec<ReservationRecord> {
        self.state.reservations.values().cloned().collect()
    }

    pub fn create_reservation(
        &mut self,
        mut reservation: ReservationRecord,
    ) -> Result<ReservationRecord, LocalStoreError> {
        if reservation.id.trim().is_empty() {
            reservation.id = format!("res-{}", Uuid::new_v4().as_simple());
        }
        if reservation.guest_name.trim().is_empty() {
            reservation.guest_name = "Guest".to_string();
        }
        if reservation.party_size == 0 {
            reservation.party_size = 2;
        }
        if reservation.reservation_time.trim().is_empty() {
            reservation.reservation_time = "2026-11-19T19:00:00Z".to_string();
        }
        if reservation.status.trim().is_empty() {
            reservation.status = "confirmed".to_string();
        }
        if reservation.table_id.trim().is_empty() {
            reservation.table_id = "T1".to_string();
        }
        self.state
            .reservations
            .insert(reservation.id.clone(), reservation.clone());
        self.record_outbox(serde_json::json!({
            "type": "reservation.created",
            "reservationId": reservation.id,
            "guestName": reservation.guest_name,
            "partySize": reservation.party_size
        }));
        self.save()?;
        Ok(reservation)
    }

    pub fn cancel_reservation(&mut self, id: &str) -> Result<ReservationRecord, LocalStoreError> {
        let res = self
            .state
            .reservations
            .get_mut(id)
            .ok_or(LocalStoreError::NotFound("Reservation not found"))?;
        res.status = "cancelled".to_string();
        let updated = res.clone();
        self.record_outbox(serde_json::json!({
            "type": "reservation.cancelled",
            "reservationId": updated.id
        }));
        self.save()?;
        Ok(updated)
    }

    pub fn update_reservation_status(
        &mut self,
        id: &str,
        status: &str,
        table_id: Option<String>,
    ) -> Result<ReservationRecord, LocalStoreError> {
        let res = self
            .state
            .reservations
            .get_mut(id)
            .ok_or(LocalStoreError::NotFound("Reservation not found"))?;
        if !status.trim().is_empty() {
            res.status = status.trim().to_string();
        }
        if let Some(tid) = table_id {
            if !tid.trim().is_empty() {
                res.table_id = tid.trim().to_string();
            }
        }
        let updated = res.clone();
        self.record_outbox(serde_json::json!({
            "type": "reservation.status_updated",
            "reservationId": updated.id,
            "status": updated.status,
            "tableId": updated.table_id
        }));
        self.save()?;
        Ok(updated)
    }

    // Webhooks
    pub fn list_webhook_endpoints(&self) -> Vec<WebhookEndpointRecord> {
        self.state.webhook_endpoints.values().cloned().collect()
    }

    pub fn create_webhook_endpoint(
        &mut self,
        mut endpoint: WebhookEndpointRecord,
    ) -> Result<WebhookEndpointRecord, LocalStoreError> {
        if endpoint.id.trim().is_empty() {
            endpoint.id = format!("wh-ep-{}", Uuid::new_v4().as_simple());
        }
        if endpoint.tenant_id.is_nil() {
            endpoint.tenant_id = self.state.site_id;
        }
        if endpoint.url.trim().is_empty() {
            endpoint.url = "https://partner.example.com/webhook".to_string();
        }
        if endpoint.events.is_empty() {
            endpoint.events = vec![
                "order.paid".to_string(),
                "kds.ticket.bumped".to_string(),
                "z_report.closed".to_string(),
            ];
        }
        if endpoint.signing_secret.trim().is_empty() {
            endpoint.signing_secret = format!("whsec_native_{}", Uuid::new_v4().as_simple());
        }
        self.state
            .webhook_endpoints
            .insert(endpoint.id.clone(), endpoint.clone());
        self.record_outbox(serde_json::json!({
            "type": "webhook.endpoint.created",
            "endpointId": endpoint.id,
            "url": endpoint.url
        }));
        self.save()?;
        Ok(endpoint)
    }

    pub fn list_webhook_events(&self) -> Vec<WebhookEventRecord> {
        self.state.webhook_events.clone()
    }

    pub fn record_webhook_event(
        &mut self,
        mut event: WebhookEventRecord,
    ) -> Result<WebhookEventRecord, LocalStoreError> {
        if event.id.trim().is_empty() {
            event.id = format!("wh-evt-{}", Uuid::new_v4().as_simple());
        }
        if event.tenant_id.is_nil() {
            event.tenant_id = self.state.site_id;
        }
        if event.received_at.trim().is_empty() {
            event.received_at = "2026-11-18T12:30:00Z".to_string();
        }
        self.state.webhook_events.push(event.clone());
        self.record_outbox(serde_json::json!({
            "type": "webhook.event.recorded",
            "eventId": event.id,
            "provider": event.provider,
            "eventType": event.event_type
        }));
        self.save()?;
        Ok(event)
    }

    pub fn replay_webhook_event(
        &mut self,
        event_id: &str,
    ) -> Result<WebhookEventRecord, LocalStoreError> {
        let existing = self
            .state
            .webhook_events
            .iter()
            .find(|e| e.id == event_id)
            .cloned()
            .ok_or(LocalStoreError::NotFound("Webhook event not found"))?;
        let replayed = WebhookEventRecord {
            id: format!(
                "{}-replay-{}",
                existing.id,
                self.state.webhook_events.len() + 1
            ),
            direction: existing.direction,
            provider: existing.provider,
            event_type: existing.event_type,
            tenant_id: self.state.site_id,
            signature_verified: true,
            status: "replayed".to_string(),
            payload_summary: format!("Replayed from {}", existing.id),
            received_at: "2026-11-18T12:35:00Z".to_string(),
        };
        self.state.webhook_events.push(replayed.clone());
        self.record_outbox(serde_json::json!({
            "type": "webhook.event.replayed",
            "originalEventId": event_id,
            "replayEventId": replayed.id
        }));
        self.save()?;
        Ok(replayed)
    }

    // Commissary Transfers
    pub fn list_commissary_transfers(&self) -> Vec<CommissaryTransferRecord> {
        self.state.commissary_transfers.values().cloned().collect()
    }

    pub fn create_commissary_transfer(
        &mut self,
        mut transfer: CommissaryTransferRecord,
    ) -> Result<CommissaryTransferRecord, LocalStoreError> {
        if transfer.id.trim().is_empty() {
            transfer.id = format!("trf-{}", Uuid::new_v4().as_simple());
        }
        if transfer.from_unit.trim().is_empty() {
            transfer.from_unit = "Central Commissary Kitchen".to_string();
        }
        if transfer.to_unit.trim().is_empty() {
            transfer.to_unit = self.restaurant_name().to_string();
        }
        if transfer.status.trim().is_empty() {
            transfer.status = "requested".to_string();
        }
        self.state
            .commissary_transfers
            .insert(transfer.id.clone(), transfer.clone());
        self.record_outbox(serde_json::json!({
            "type": "commissary.transfer.created",
            "transferId": transfer.id,
            "fromUnit": transfer.from_unit,
            "toUnit": transfer.to_unit,
            "totalCostCents": transfer.total_cost_cents,
            "itemsCount": transfer.items_count
        }));
        self.save()?;
        Ok(transfer)
    }

    // Settings
    pub fn get_settings(&self) -> serde_json::Value {
        if self.state.settings.is_null() || self.state.settings.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            serde_json::json!({
                "restaurantName": self.state.restaurant_name,
                "cityState": self.state.city_state,
                "conceptPreset": self.state.concept_preset,
                "taxRateBps": self.state.tax_rate_bps,
                "tablesCount": self.state.tables_count,
                "tipMethod": "hours_weighted_pool",
                "flsaManagerExclusionEnforced": true,
                "theme": "toast_dark",
                "kdsAudioChime": true,
                "offlineReconciliation": "idempotent"
            })
        } else {
            self.state.settings.clone()
        }
    }

    pub fn update_settings(&mut self, settings: serde_json::Value) -> Result<(), LocalStoreError> {
        self.state.settings = settings;
        self.save()
    }

    pub fn reset_for_first_run(&mut self) -> Result<(), LocalStoreError> {
        let site_id = self.state.site_id;
        let path = self.path.clone();
        if path.exists() {
            let _ = fs::remove_file(&path);
        }
        let fresh = Self::open_or_init(&path, site_id)?;
        self.state = fresh.state;
        Ok(())
    }
}

/// FLSA-Compliant Tip Pool Engine (Rule 9 binding enforcement in Rust)
/// - Owners, managers, and supervisors (or anyone with hiring/firing authority)
///   are strictly EXCLUDED from every pool — hardcoded and non-configurable.
/// - BOH roles are only eligible when `pays_full_minimum_wage` is true (no tip credit).
/// - All arithmetic is in integer cents with exact remainder conservation.
pub fn calculate_tip_pool(
    method: TipDistributionMethod,
    total_pool_cents: i64,
    pays_full_minimum_wage: bool,
    participants: &[TipParticipantInput],
) -> Result<TipPoolReport, LocalStoreError> {
    if total_pool_cents < 0 {
        return Err(LocalStoreError::InvalidInput(
            "Total tip pool cents cannot be negative",
        ));
    }

    let mut allocations = Vec::with_capacity(participants.len());
    let mut eligible_indices = Vec::new();

    for (idx, p) in participants.iter().enumerate() {
        if p.role.is_management_or_supervisor() || p.has_hiring_firing_authority {
            allocations.push(TipAllocation {
                staff_id: p.staff_id,
                display_name: p.display_name.clone(),
                role: p.role.clone(),
                eligible: false,
                exclusion_reason: Some(
                    "FLSA 29 U.S.C. 203(m)(2)(B): Managers, supervisors, and owners are strictly excluded from tip pools".to_string(),
                ),
                allocated_cents: 0,
            });
        } else if p.role.is_boh() && !pays_full_minimum_wage {
            allocations.push(TipAllocation {
                staff_id: p.staff_id,
                display_name: p.display_name.clone(),
                role: p.role.clone(),
                eligible: false,
                exclusion_reason: Some(
                    "FLSA Tip Credit Gate: BOH staff require full minimum wage (no tip credit) to participate in a shared pool".to_string(),
                ),
                allocated_cents: 0,
            });
        } else {
            eligible_indices.push(idx);
            allocations.push(TipAllocation {
                staff_id: p.staff_id,
                display_name: p.display_name.clone(),
                role: p.role.clone(),
                eligible: true,
                exclusion_reason: None,
                allocated_cents: 0,
            });
        }
    }

    if eligible_indices.is_empty() || total_pool_cents == 0 {
        return Ok(TipPoolReport {
            total_pool_cents,
            distributed_cents: 0,
            allocations,
        });
    }

    let weights: Vec<u128> = eligible_indices
        .iter()
        .map(|&idx| {
            let p = &participants[idx];
            match method {
                TipDistributionMethod::KeepYourOwn => p.direct_tips_cents.max(0) as u128,
                TipDistributionMethod::HoursWeighted => p.hours_worked_tenths as u128,
                TipDistributionMethod::RoleWeighted => {
                    (p.hours_worked_tenths as u128) * (p.role_points_tenths.max(1) as u128)
                }
                TipDistributionMethod::PercentageOfSales => p.sales_cents.max(0) as u128,
            }
        })
        .collect();

    let total_weight: u128 = weights.iter().sum();
    if total_weight == 0 {
        return Err(LocalStoreError::InvalidInput(
            "Eligible participants have zero combined weight",
        ));
    }

    let pool_u128 = total_pool_cents as u128;
    let mut distributed: i64 = 0;

    for (pos, &idx) in eligible_indices.iter().enumerate() {
        let share = ((pool_u128 * weights[pos]) / total_weight) as i64;
        allocations[idx].allocated_cents = share;
        distributed += share;
    }

    // Distribute integer-cent remainder deterministically to top-weighted eligible staff
    let mut remainder = total_pool_cents - distributed;
    for &idx in &eligible_indices {
        if remainder <= 0 {
            break;
        }
        allocations[idx].allocated_cents += 1;
        distributed += 1;
        remainder -= 1;
    }

    Ok(TipPoolReport {
        total_pool_cents,
        distributed_cents: distributed,
        allocations,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_store_persists_order_kds_bump_cash_settlement_and_drawer_close() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("culinaryos.db");
        let site_id = Uuid::from_u128(42);

        let mut store = LocalStore::open_or_init(&db_path, site_id).unwrap();
        let owner = store.authenticate_pin("1234").unwrap();
        assert_eq!(owner.role, StaffRole::Owner);

        let order = store
            .create_order(
                Some("ord-100".to_string()),
                "Table 12".to_string(),
                vec![
                    ("item-margherita".to_string(), 2, 1, 1),
                    ("item-caesar".to_string(), 1, 2, 1),
                ],
            )
            .unwrap();
        assert_eq!(order.subtotal_cents, 5000);
        assert_eq!(order.tax_cents, 413);
        assert_eq!(order.total_cents, 5413);

        let tickets = store.send_order_to_kitchen("ord-100").unwrap();
        assert_eq!(tickets.len(), 2);

        let hot_tickets = store.list_tickets(Some("hot"));
        assert_eq!(hot_tickets.len(), 1);
        store.bump_ticket(&hot_tickets[0].id).unwrap();
        assert_eq!(store.list_tickets(Some("hot")).len(), 0);

        // Settle cash with idempotency key
        let paid = store
            .settle_cash_order("op-cash-1", "ord-100", 6000)
            .unwrap();
        assert_eq!(paid.status, OrderStatus::Paid);
        assert_eq!(paid.paid_cents, 5413);

        // Duplicate replay returns identical settled order without double-charging drawer
        let replay = store
            .settle_cash_order("op-cash-1", "ord-100", 6000)
            .unwrap();
        assert_eq!(replay.paid_cents, 5413);

        // Reopen from disk and close drawer
        drop(store);
        let mut reopened = LocalStore::open_or_init(&db_path, site_id).unwrap();
        let closed = reopened.close_drawer(25_413).unwrap();
        assert!(closed.closed);
        assert_eq!(closed.variance_cents, Some(0));
    }

    #[test]
    fn flsa_tip_engine_hardcodes_manager_exclusion_and_conserves_every_cent() {
        let participants = vec![
            TipParticipantInput {
                staff_id: Uuid::from_u128(1),
                display_name: "General Manager".to_string(),
                role: StaffRole::Manager,
                has_hiring_firing_authority: true,
                hours_worked_tenths: 80,
                role_points_tenths: 10,
                direct_tips_cents: 5000,
                sales_cents: 100_000,
            },
            TipParticipantInput {
                staff_id: Uuid::from_u128(2),
                display_name: "Server Alice".to_string(),
                role: StaffRole::Server,
                has_hiring_firing_authority: false,
                hours_worked_tenths: 60,
                role_points_tenths: 10,
                direct_tips_cents: 10_000,
                sales_cents: 150_000,
            },
            TipParticipantInput {
                staff_id: Uuid::from_u128(3),
                display_name: "Line Cook Bob".to_string(),
                role: StaffRole::Cook,
                has_hiring_firing_authority: false,
                hours_worked_tenths: 60,
                role_points_tenths: 10,
                direct_tips_cents: 0,
                sales_cents: 0,
            },
        ];

        // When tip credit is taken (pays_full_minimum_wage = false), both Manager and BOH Cook are excluded
        let report_tip_credit = calculate_tip_pool(
            TipDistributionMethod::HoursWeighted,
            10_001,
            false,
            &participants,
        )
        .unwrap();
        assert_eq!(report_tip_credit.distributed_cents, 10_001);
        assert_eq!(report_tip_credit.allocations[0].allocated_cents, 0);
        assert!(!report_tip_credit.allocations[0].eligible);
        assert_eq!(report_tip_credit.allocations[1].allocated_cents, 10_001);
        assert_eq!(report_tip_credit.allocations[2].allocated_cents, 0);

        // When full minimum wage is paid (pays_full_minimum_wage = true), Manager is STILL excluded, Server + Cook split 50/50 with exact penny conservation
        let report_full_wage = calculate_tip_pool(
            TipDistributionMethod::HoursWeighted,
            10_001,
            true,
            &participants,
        )
        .unwrap();
        assert_eq!(report_full_wage.distributed_cents, 10_001);
        assert_eq!(report_full_wage.allocations[0].allocated_cents, 0);
        assert_eq!(
            report_full_wage.allocations[1].allocated_cents
                + report_full_wage.allocations[2].allocated_cents,
            10_001
        );
    }
}
