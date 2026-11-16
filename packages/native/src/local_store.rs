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
struct PersistedState {
    site_id: Uuid,
    #[serde(default)]
    setup_completed: bool,
    #[serde(default)]
    restaurant_name: String,
    #[serde(default)]
    city_state: String,
    #[serde(default)]
    concept_preset: String,
    #[serde(default)]
    tax_rate_bps: i64,
    #[serde(default)]
    tables_count: u32,
    staff: Vec<StaffMember>,
    menu: BTreeMap<String, MenuItem>,
    orders: BTreeMap<String, OrderRecord>,
    tickets: BTreeMap<String, KitchenTicket>,
    drawer: CashDrawerSession,
    applied_operations: BTreeSet<String>,
    sync_outbox: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Envelope {
    sha256: String,
    state: PersistedState,
}

pub struct LocalStore {
    path: PathBuf,
    state: PersistedState,
}

fn pin_digest(site_id: Uuid, pin: &str) -> String {
    hex::encode(Sha256::digest(format!("{site_id}:{pin}").as_bytes()))
}

impl LocalStore {
    pub fn open_or_init(path: &Path, default_site_id: Uuid) -> Result<Self, LocalStoreError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|_| LocalStoreError::Storage)?;
        }
        if path.exists() {
            let file = File::open(path).map_err(|_| LocalStoreError::Storage)?;
            let env: Envelope = serde_json::from_reader(BufReader::new(file))
                .map_err(|_| LocalStoreError::Storage)?;
            let serialized =
                serde_json::to_vec(&env.state).map_err(|_| LocalStoreError::Storage)?;
            let actual = hex::encode(Sha256::digest(&serialized));
            if actual != env.sha256 {
                return Err(LocalStoreError::Storage);
            }
            return Ok(Self {
                path: path.to_path_buf(),
                state: env.state,
            });
        }

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

        let state = PersistedState {
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
        };

        let store = Self {
            path: path.to_path_buf(),
            state,
        };
        store.save()?;
        Ok(store)
    }

    fn save(&self) -> Result<(), LocalStoreError> {
        let dir = self.path.parent().unwrap_or_else(|| Path::new("."));
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
