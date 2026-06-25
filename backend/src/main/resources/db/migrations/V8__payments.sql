-- CulinaryOS Phase 7: Payments Prototype
-- PaymentIntents, Receipts
-- NO card data is stored at any point. PCI scope = zero.
-- Cash and OTHER tender types only at MVP.
-- Stripe Terminal integration deferred to Phase 10.
-- NEVER edit after applied. Add a new migration instead.

-- ─── Payment Intents ─────────────────────────────────────────────────────────
-- Records HOW an order was paid.
-- method: CASH | OTHER (gift card, house account, etc.)
--         CARD is reserved for Phase 10 Stripe Terminal — not used here.
-- tender_amount_cents: what the customer handed over (for cash change calc)
-- tip_cents: optional tip recorded at POS
-- total_cents: amount + tip
-- change_cents: tender_amount - total (cash only; 0 for card/other)
-- receipt_number: FK to the order's receipt_number for reconciliation

CREATE TABLE payment_intents (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id            UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    receipt_number      TEXT        NOT NULL,
    -- Denormalized from orders.receipt_number for fast receipt lookup
    method              TEXT        NOT NULL DEFAULT 'CASH'
                                    CHECK (method IN ('CASH','OTHER')),
    -- CARD deliberately excluded — Phase 10
    amount_cents        INT         NOT NULL,
    -- Pre-tip order total
    tip_cents           INT         NOT NULL DEFAULT 0,
    total_cents         INT         NOT NULL,
    -- amount_cents + tip_cents
    tender_amount_cents INT         NOT NULL DEFAULT 0,
    -- What customer handed over (cash); set to total_cents for non-cash
    change_cents        INT         NOT NULL DEFAULT 0,
    -- tender_amount - total (0 for non-cash)
    status              TEXT        NOT NULL DEFAULT 'COMPLETED'
                                    CHECK (status IN ('COMPLETED','REFUNDED','VOIDED')),
    processed_by        UUID        REFERENCES users(id),
    processed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes               TEXT
);
CREATE INDEX idx_payment_restaurant ON payment_intents(restaurant_id);
CREATE INDEX idx_payment_order      ON payment_intents(order_id);
CREATE INDEX idx_payment_receipt    ON payment_intents(receipt_number);

-- ─── Receipts ──────────────────────────────────────────────────────────────
-- Stores the rendered receipt for reprinting and audit.
-- html_content: the rendered HTML receipt (source of truth for reprints)
-- delivery_method: PRINT | EMAIL | SMS | NONE

CREATE TABLE receipts (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    payment_intent_id   UUID        NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
    receipt_number      TEXT        NOT NULL,
    html_content        TEXT        NOT NULL,
    delivery_method     TEXT        NOT NULL DEFAULT 'PRINT'
                                    CHECK (delivery_method IN ('PRINT','EMAIL','SMS','NONE')),
    delivered_to        TEXT,
    -- Email address or phone number if EMAIL/SMS
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_receipts_restaurant ON receipts(restaurant_id);
CREATE INDEX idx_receipts_receipt_no ON receipts(receipt_number);

-- ─── Update orders table: add closed_at timestamp ───────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
