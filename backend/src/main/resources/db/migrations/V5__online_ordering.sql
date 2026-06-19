-- CulinaryOS Phase 4: Online Ordering
-- MenuSnapshot (versioned), CustomerOrders, OrderStatusEvents
-- NEVER edit after applied. Add a new migration instead.

-- ─── Menu Snapshots ──────────────────────────────────────────────────────────
-- A MenuSnapshot is a versioned, point-in-time, immutable copy of the active
-- menu published by a manager. Online orders are validated against a snapshot
-- version — a mismatch triggers re-validation before the order is accepted.
--
-- status: DRAFT (being built) | ACTIVE (live) | ARCHIVED (superseded)
-- Only ONE snapshot per restaurant may be ACTIVE at a time.
-- Enforced by partial unique index below.

CREATE TABLE menu_snapshots (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    version         INT         NOT NULL DEFAULT 1,
    status          TEXT        NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
    published_by    UUID        REFERENCES users(id),
    published_at    TIMESTAMPTZ,
    snapshot_json   JSONB       NOT NULL DEFAULT '{}',
    -- Full denormalized menu tree: categories → items → modifiers
    -- Stored as JSONB so queries never need to JOIN across 4 tables at read time.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_snapshot_one_active
    ON menu_snapshots(restaurant_id)
    WHERE status = 'ACTIVE';
-- Guarantees only one ACTIVE snapshot per restaurant at the DB level.

CREATE INDEX idx_snapshot_restaurant ON menu_snapshots(restaurant_id, status);

-- ─── Customer Orders ──────────────────────────────────────────────────────────
-- Placed by a guest or registered customer via the web ordering frontend.
-- Injected into the POS + KDS pipeline as a standard Order (source: ONLINE).
-- Linked to the POS order via pos_order_id after injection.

CREATE TABLE customer_orders (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    menu_snapshot_id    UUID        NOT NULL REFERENCES menu_snapshots(id),
    -- snapshot pinned at order time for version mismatch detection
    fulfillment_type    TEXT        NOT NULL CHECK (fulfillment_type IN ('PICKUP','DELIVERY')),
    customer_name       TEXT        NOT NULL,
    customer_email      TEXT,
    customer_phone      TEXT,
    delivery_address    TEXT,
    -- NULL for PICKUP orders
    special_instructions TEXT,
    lines_json          JSONB       NOT NULL DEFAULT '[]',
    -- Denormalized lines: [{itemId, itemName, quantity, unitPrice, modifiers}]
    subtotal_cents      INT         NOT NULL DEFAULT 0,
    status              TEXT        NOT NULL DEFAULT 'RECEIVED'
                                    CHECK (status IN ('RECEIVED','PREPARING','READY','COMPLETED','CANCELLED')),
    pos_order_id        UUID        REFERENCES orders(id),
    -- Set when injected into POS pipeline
    tracking_token      TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
    -- Public token for status page — not guessable, not a UUID exposure
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_orders_restaurant ON customer_orders(restaurant_id);
CREATE INDEX idx_customer_orders_status     ON customer_orders(restaurant_id, status);
CREATE INDEX idx_customer_orders_tracking   ON customer_orders(tracking_token);

-- ─── Order Status Events ──────────────────────────────────────────────────────
-- Append-only log of every customer order status transition.
-- Drives WebSocket push to the customer tracking page.
-- Also used for reporting: time-to-ready, time-to-complete per order.

CREATE TABLE customer_order_status_events (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_order_id   UUID        NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
    restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    from_status         TEXT        NOT NULL,
    to_status           TEXT        NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id            UUID        REFERENCES users(id)
    -- NULL for system-generated transitions (e.g. auto-RECEIVED on order placed)
);

CREATE INDEX idx_status_events_order      ON customer_order_status_events(customer_order_id);
CREATE INDEX idx_status_events_restaurant ON customer_order_status_events(restaurant_id);
