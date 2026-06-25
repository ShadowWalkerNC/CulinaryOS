-- CulinaryOS Phase 2: POS Core
-- Menu items, modifiers, sections, tables, orders, order lines
-- receipt_number sequence, void/comp/discount audit trail
-- NEVER edit after applied. Add a new migration instead.

-- ─── Menu ────────────────────────────────────────────────────────────────────

CREATE TABLE menu_categories (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    sort_order    INT         NOT NULL DEFAULT 0,
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id);

CREATE TABLE menu_items (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id   UUID        REFERENCES menu_categories(id) ON DELETE SET NULL,
    name          TEXT        NOT NULL,
    description   TEXT,
    price         NUMERIC(10,2) NOT NULL DEFAULT 0,
    station_tags  TEXT[]      NOT NULL DEFAULT '{}',
    -- e.g. ARRAY['GRILL','EXPO'] — controls KDS routing in Phase 3
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category   ON menu_items(category_id);

CREATE TABLE modifier_groups (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    min_select    INT         NOT NULL DEFAULT 0,
    max_select    INT         NOT NULL DEFAULT 1,
    is_required   BOOLEAN     NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_modifier_groups_restaurant ON modifier_groups(restaurant_id);

CREATE TABLE modifiers (
    id               UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    modifier_group_id UUID         NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    restaurant_id    UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name             TEXT          NOT NULL,
    price_delta      NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active        BOOLEAN       NOT NULL DEFAULT true,
    sort_order       INT           NOT NULL DEFAULT 0
);
CREATE INDEX idx_modifiers_group      ON modifiers(modifier_group_id);
CREATE INDEX idx_modifiers_restaurant ON modifiers(restaurant_id);

CREATE TABLE menu_item_modifier_groups (
    menu_item_id      UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (menu_item_id, modifier_group_id)
);

-- ─── Tables / Sections ───────────────────────────────────────────────────────

CREATE TABLE sections (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sections_restaurant ON sections(restaurant_id);

CREATE TABLE dining_tables (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    section_id    UUID        REFERENCES sections(id) ON DELETE SET NULL,
    name          TEXT        NOT NULL,
    capacity      INT         NOT NULL DEFAULT 2,
    status        TEXT        NOT NULL DEFAULT 'AVAILABLE'
                              CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','CLEANING')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dining_tables_restaurant ON dining_tables(restaurant_id);
CREATE INDEX idx_dining_tables_section    ON dining_tables(section_id);

-- ─── Receipt Number Sequence ─────────────────────────────────────────────────
-- Per-restaurant, per-day sequence. Generates RCP-YYYY-NNNN.
-- Sequence resets daily — handled in application logic, not DB sequence.

CREATE TABLE receipt_sequences (
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    seq_date      DATE        NOT NULL,
    last_seq      INT         NOT NULL DEFAULT 0,
    PRIMARY KEY (restaurant_id, seq_date)
);

-- ─── Orders ──────────────────────────────────────────────────────────────────

CREATE TABLE orders (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_id        UUID        REFERENCES dining_tables(id) ON DELETE SET NULL,
    opened_by       UUID        NOT NULL REFERENCES users(id),
    status          TEXT        NOT NULL DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN','SENT','PARTIALLY_PAID','PAID','VOIDED')),
    source          TEXT        NOT NULL DEFAULT 'POS'
                                CHECK (source IN ('POS','ONLINE','KIOSK')),
    receipt_number  TEXT,
    -- Format: RCP-YYYY-NNNN — assigned on close, not on open
    cover_count     INT         NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_table      ON orders(table_id);
CREATE INDEX idx_orders_status     ON orders(restaurant_id, status);

CREATE TABLE order_lines (
    id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id        UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id   UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_item_id    UUID          NOT NULL REFERENCES menu_items(id),
    menu_item_name  TEXT          NOT NULL,
    -- Snapshot name at time of order — survives menu item rename
    unit_price      NUMERIC(10,2) NOT NULL,
    quantity        INT           NOT NULL DEFAULT 1,
    station_tags    TEXT[]        NOT NULL DEFAULT '{}',
    -- Copied from menu_item at order time for KDS routing
    modifiers_json  JSONB         NOT NULL DEFAULT '[]',
    -- [{"name":"Extra Cheese","priceDelta":1.00},...]
    line_total      NUMERIC(10,2) NOT NULL,
    status          TEXT          NOT NULL DEFAULT 'PENDING'
                                  CHECK (status IN ('PENDING','SENT','COMPLETED','VOIDED')),
    void_reason     TEXT,
    voided_by       UUID          REFERENCES users(id),
    voided_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_lines_order      ON order_lines(order_id);
CREATE INDEX idx_order_lines_restaurant ON order_lines(restaurant_id);

-- ─── Discount / Comp Audit ───────────────────────────────────────────────────

CREATE TABLE order_adjustments (
    id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id        UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    restaurant_id   UUID          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    type            TEXT          NOT NULL CHECK (type IN ('DISCOUNT','COMP','SURCHARGE')),
    amount          NUMERIC(10,2) NOT NULL,
    reason          TEXT          NOT NULL,
    authorized_by   UUID          NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_adjustments_order      ON order_adjustments(order_id);
CREATE INDEX idx_order_adjustments_restaurant ON order_adjustments(restaurant_id);
