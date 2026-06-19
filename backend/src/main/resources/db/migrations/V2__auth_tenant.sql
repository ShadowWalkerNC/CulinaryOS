-- CulinaryOS Phase 1: Auth & Tenant Shell
-- Creates the full tenant hierarchy: organizations -> restaurants -> users
-- Plus RBAC roles and refresh token rotation.
-- NEVER edit this file after it has been applied. Add a new migration instead.

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE organizations (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Restaurants ──────────────────────────────────────────────────────────────
CREATE TABLE restaurants (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    timezone        TEXT        NOT NULL DEFAULT 'America/New_York',
    -- IANA timezone identifier e.g. America/New_York, America/Los_Angeles
    -- Required for shift reporting, daily sales bucketing, and all time-based logic.
    address         TEXT,
    phone           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_restaurants_org ON restaurants(organization_id);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    email         TEXT        NOT NULL,
    password_hash TEXT        NOT NULL,
    name          TEXT        NOT NULL,
    role          TEXT        NOT NULL CHECK (role IN ('owner','manager','server','cook','cashier')),
    is_active     BOOLEAN     NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_email     ON users(email);
CREATE INDEX        idx_users_restaurant ON users(restaurant_id);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────────
-- Single-use, 7-day TTL, rotated on every use.
-- Store hash only — never the raw token.
CREATE TABLE refresh_tokens (
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,           -- NULL = valid; non-NULL = used (replay = security alert)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
