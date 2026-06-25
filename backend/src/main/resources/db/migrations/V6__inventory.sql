-- CulinaryOS Phase 5: Inventory
-- inventory_items, storage_locations, recipe links, depletion events,
-- reorder rules, purchase orders
-- NEVER edit after applied. Add a new migration instead.

-- ─── Storage Locations ────────────────────────────────────────────────────────
-- Physical locations where stock is stored (walk-in, dry storage, bar, etc.)

CREATE TABLE storage_locations (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_storage_restaurant ON storage_locations(restaurant_id);

-- ─── Inventory Items ──────────────────────────────────────────────────────────
-- A single trackable stock unit (e.g. "Ribeye 12oz", "House Merlot 750ml")
-- unit: the unit of measure for quantity tracking (oz, ml, each, lb, kg, liter)
-- par_level: minimum acceptable quantity; triggers alert when stock <= par_level
-- reorder_quantity: suggested order amount when par is breached

CREATE TABLE inventory_items (
    id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    storage_location_id UUID      REFERENCES storage_locations(id) ON DELETE SET NULL,
    name              TEXT        NOT NULL,
    unit              TEXT        NOT NULL DEFAULT 'each',
    current_quantity  NUMERIC(12,4) NOT NULL DEFAULT 0,
    par_level         NUMERIC(12,4) NOT NULL DEFAULT 0,
    reorder_quantity  NUMERIC(12,4) NOT NULL DEFAULT 0,
    cost_per_unit_cents INT       NOT NULL DEFAULT 0,
    is_active         BOOLEAN     NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_restaurant ON inventory_items(restaurant_id);
CREATE INDEX idx_inventory_par        ON inventory_items(restaurant_id)
    WHERE current_quantity <= par_level AND is_active = true;
-- Partial index: only items AT or BELOW par — makes par-alert queries fast

-- ─── Menu Item → Ingredient Recipe Links ──────────────────────────────────────
-- Defines how much of each inventory_item is consumed when a menu_item is sold.
-- quantity_used: amount depleted per ONE unit of menu item sold
-- Example: "Ribeye Plate" consumes 12 oz of "Ribeye 12oz" inventory item

CREATE TABLE menu_item_ingredients (
    id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id      UUID        NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_item_id UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_used     NUMERIC(12,4) NOT NULL,
    -- How much inventory is consumed per 1 quantity of this menu item sold
    UNIQUE (menu_item_id, inventory_item_id)
);
CREATE INDEX idx_ingredients_menu_item  ON menu_item_ingredients(menu_item_id);
CREATE INDEX idx_ingredients_inv_item   ON menu_item_ingredients(inventory_item_id);

-- ─── Depletion Events ─────────────────────────────────────────────────────────
-- Append-only log of every inventory change.
-- source: SALE (auto from order), WASTE (manual), ADJUSTMENT (count correction),
--         PURCHASE_RECEIVED (PO receipt increases stock)
-- quantity_delta: negative = depletion, positive = addition
-- Inventory current_quantity is always derivable from summing all deltas,
-- but we also maintain current_quantity on inventory_items for fast reads.

CREATE TABLE depletion_events (
    id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    source            TEXT        NOT NULL
                                  CHECK (source IN ('SALE','WASTE','ADJUSTMENT','PURCHASE_RECEIVED')),
    quantity_delta    NUMERIC(12,4) NOT NULL,
    -- Negative = stock decreases. Positive = stock increases.
    order_id          UUID        REFERENCES orders(id) ON DELETE SET NULL,
    order_line_id     UUID        REFERENCES order_lines(id) ON DELETE SET NULL,
    -- Set for SALE events; NULL for WASTE/ADJUSTMENT/PURCHASE_RECEIVED
    actor_id          UUID        REFERENCES users(id),
    notes             TEXT,
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_depletion_restaurant ON depletion_events(restaurant_id);
CREATE INDEX idx_depletion_item       ON depletion_events(inventory_item_id);
CREATE INDEX idx_depletion_source     ON depletion_events(restaurant_id, source);
CREATE INDEX idx_depletion_order      ON depletion_events(order_id) WHERE order_id IS NOT NULL;

-- ─── Reorder Rules ────────────────────────────────────────────────────────────
-- Defines automatic PO draft behavior when par is breached.
-- vendor_name / vendor_contact: where to send the reorder
-- auto_draft: if true, system creates a DRAFT PurchaseOrder automatically

CREATE TABLE reorder_rules (
    id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id     UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    inventory_item_id UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE UNIQUE,
    vendor_name       TEXT,
    vendor_contact    TEXT,
    auto_draft        BOOLEAN     NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reorder_restaurant ON reorder_rules(restaurant_id);

-- ─── Purchase Orders ──────────────────────────────────────────────────────────
-- DRAFT → SUBMITTED → RECEIVED
-- Lines are stored as JSONB for simplicity (no separate PO lines table at MVP).
-- lines_json: [{inventoryItemId, inventoryItemName, quantity, unitCostCents}]

CREATE TABLE purchase_orders (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    status          TEXT        NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','SUBMITTED','RECEIVED','CANCELLED')),
    vendor_name     TEXT,
    lines_json      JSONB       NOT NULL DEFAULT '[]',
    total_cost_cents INT        NOT NULL DEFAULT 0,
    notes           TEXT,
    created_by      UUID        REFERENCES users(id),
    submitted_at    TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_restaurant ON purchase_orders(restaurant_id);
CREATE INDEX idx_po_status     ON purchase_orders(restaurant_id, status);
