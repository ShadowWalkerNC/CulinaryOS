-- CulinaryOS Phase 3: KDS
-- Stations, ticket event log, WebSocket outbox
-- NEVER edit after applied. Add a new migration instead.

-- ─── Stations ────────────────────────────────────────────────────────────────
-- A station is a named kitchen position that receives routed order lines.
-- station_type drives the default routing suggestion in POS UI.

CREATE TABLE stations (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    station_type  TEXT        NOT NULL DEFAULT 'CUSTOM'
                              CHECK (station_type IN ('GRILL','FRY','SAUTE','EXPO','CUSTOM')),
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    sort_order    INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stations_restaurant ON stations(restaurant_id);

-- ─── Ticket Events ───────────────────────────────────────────────────────────
-- Append-only log. Every state transition on a kitchen ticket is recorded here.
-- The KDS UI is derived entirely from this log — never mutate, always append.
--
-- fired_at: timestamp when the order was sent to kitchen (ORDER_SENT_TO_KITCHEN).
--           Copied from the source order event for ticket-time metric calculation.
-- occurred_at: when THIS event happened (BUMPED / RECALLED / COMPLETED).

CREATE TABLE ticket_events (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    order_id      UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    station_id    UUID        NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    event_type    TEXT        NOT NULL
                              CHECK (event_type IN ('FIRED','BUMPED','RECALLED','COMPLETED')),
    fired_at      TIMESTAMPTZ NOT NULL,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id      UUID        REFERENCES users(id),
    -- NULL for system-generated events (e.g. auto-fire on order send)
    payload_json  JSONB       NOT NULL DEFAULT '{}'
    -- Reserved for future structured metadata (course number, seat, etc.)
);
CREATE INDEX idx_ticket_events_restaurant ON ticket_events(restaurant_id);
CREATE INDEX idx_ticket_events_order      ON ticket_events(order_id);
CREATE INDEX idx_ticket_events_station    ON ticket_events(station_id);
CREATE INDEX idx_ticket_events_type       ON ticket_events(restaurant_id, event_type);

-- ─── WebSocket Outbox ────────────────────────────────────────────────────────
-- Guarantees zero missed tickets.
-- Every FIRED event is written here BEFORE the WebSocket push is attempted.
-- On reconnect, the client sends its last acknowledged server_sequence.
-- The server replays all undelivered rows since that sequence.

CREATE SEQUENCE ws_outbox_seq;

CREATE TABLE pending_push (
    id              BIGINT      NOT NULL DEFAULT nextval('ws_outbox_seq') PRIMARY KEY,
    restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    target_station_id UUID      REFERENCES stations(id) ON DELETE CASCADE,
    -- NULL = broadcast to all stations in this restaurant
    event_type      TEXT        NOT NULL,
    payload_json    JSONB       NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at    TIMESTAMPTZ
    -- NULL = pending; non-NULL = delivered to at least one connected client
);
CREATE INDEX idx_pending_push_restaurant   ON pending_push(restaurant_id);
CREATE INDEX idx_pending_push_station      ON pending_push(target_station_id);
CREATE INDEX idx_pending_push_undelivered  ON pending_push(restaurant_id) WHERE delivered_at IS NULL;
