-- V16: SaaS Subscriptions + Reservations
-- ============================================================

-- Subscriptions table (one per tenant)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  status                  TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  trial_ends_at           TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_subscription_read" ON subscriptions
  FOR SELECT USING (tenant_id = my_tenant_id());

CREATE POLICY "service_role_all" ON subscriptions
  FOR ALL USING (current_setting('role') = 'service_role');

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guest_name      TEXT NOT NULL,
  guest_phone     TEXT,
  guest_email     TEXT,
  party_size      INT NOT NULL CHECK (party_size > 0),
  reserved_at     TIMESTAMPTZ NOT NULL,
  duration_mins   INT DEFAULT 90,
  table_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no_show')),
  notes           TEXT,
  sms_reminded    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_reservations" ON reservations
  FOR ALL USING (tenant_id = my_tenant_id());

CREATE POLICY "service_role_reservations" ON reservations
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date ON reservations(tenant_id, reserved_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
