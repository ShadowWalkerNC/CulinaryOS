-- CulinaryOS Phase 6: Reporting
-- Materialized summary tables for fast dashboard reads.
-- All source-of-truth data lives in the event log tables.
-- These views/tables are refreshed server-side and are NEVER the write target.
-- NEVER edit after applied. Add a new migration instead.

-- ─── Daily Sales Summary ─────────────────────────────────────────────────────────
-- Pre-aggregated per restaurant per day (in restaurant local timezone).
-- Refreshed by the ReportingService on each report request and on a
-- scheduled basis (Phase 9 adds the scheduler).

CREATE TABLE daily_sales_summary (
    id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id       UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    report_date         DATE        NOT NULL,
    -- Date in the restaurant's local timezone (from restaurants.timezone)
    order_count         INT         NOT NULL DEFAULT 0,
    gross_sales_cents   BIGINT      NOT NULL DEFAULT 0,
    -- Sum of all order line unit prices before voids/comps
    void_cents          BIGINT      NOT NULL DEFAULT 0,
    comp_cents          BIGINT      NOT NULL DEFAULT 0,
    net_sales_cents     BIGINT      NOT NULL DEFAULT 0,
    -- gross - voids - comps
    avg_ticket_cents    INT         NOT NULL DEFAULT 0,
    -- net_sales / order_count
    online_order_count  INT         NOT NULL DEFAULT 0,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (restaurant_id, report_date)
);
CREATE INDEX idx_daily_sales_restaurant ON daily_sales_summary(restaurant_id, report_date DESC);

-- ─── Station Ops Summary ───────────────────────────────────────────────────────
-- Per station per day: ticket counts and avg fire-to-bump time.
-- avg_fire_to_bump_seconds: key ops metric for kitchen speed.

CREATE TABLE station_ops_summary (
    id                          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id               UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    station_id                  UUID        NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    report_date                 DATE        NOT NULL,
    tickets_fired               INT         NOT NULL DEFAULT 0,
    tickets_bumped              INT         NOT NULL DEFAULT 0,
    avg_fire_to_bump_seconds    INT         NOT NULL DEFAULT 0,
    computed_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (restaurant_id, station_id, report_date)
);
CREATE INDEX idx_station_ops_restaurant ON station_ops_summary(restaurant_id, report_date DESC);
