-- V17: Enterprise Multi-Unit & Commissary Distribution Schema
-- ============================================================

-- 1. Organizations (Enterprise Parent Franchise / Brand Tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  slug                    TEXT NOT NULL UNIQUE,
  billing_email           TEXT NOT NULL,
  royalty_rate_percent    NUMERIC(5,2) DEFAULT 4.50 CHECK (royalty_rate_percent >= 0),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_member_read" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM restaurants WHERE id = my_tenant_id()
    )
  );

CREATE POLICY "service_role_orgs" ON organizations
  FOR ALL USING (current_setting('role') = 'service_role');

-- 2. Link Restaurants to Parent Organization
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_commissary BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_restaurants_organization ON restaurants(organization_id);

-- 3. Commissary Stock Transfer Orders (Branch Store <-> Central Kitchen)
CREATE TABLE IF NOT EXISTS commissary_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_location_id        UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  to_location_id          UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  order_number            TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('draft','requested','approved','batching','shipped','delivered','cancelled')),
  total_cost_cents        BIGINT DEFAULT 0,
  shipped_at              TIMESTAMPTZ,
  received_at             TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commissary_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissary_orders_tenant_access" ON commissary_orders
  FOR ALL USING (
    from_location_id = my_tenant_id() OR to_location_id = my_tenant_id()
  );

CREATE POLICY "service_role_commissary_orders" ON commissary_orders
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE INDEX IF NOT EXISTS idx_commissary_orders_org ON commissary_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_commissary_orders_to_loc ON commissary_orders(to_location_id);
CREATE INDEX IF NOT EXISTS idx_commissary_orders_status ON commissary_orders(status);

-- 4. Commissary Transfer Order Items with Batch Lot Tracking
CREATE TABLE IF NOT EXISTS commissary_order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID NOT NULL REFERENCES commissary_orders(id) ON DELETE CASCADE,
  item_name               TEXT NOT NULL,
  lot_code                TEXT,
  quantity_requested      NUMERIC(10,3) NOT NULL CHECK (quantity_requested > 0),
  quantity_shipped        NUMERIC(10,3) DEFAULT 0,
  quantity_received       NUMERIC(10,3) DEFAULT 0,
  unit                    TEXT NOT NULL DEFAULT 'kg',
  unit_cost_cents         INT DEFAULT 0,
  expiration_date         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE commissary_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissary_items_tenant_access" ON commissary_order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM commissary_orders
      WHERE from_location_id = my_tenant_id() OR to_location_id = my_tenant_id()
    )
  );

CREATE POLICY "service_role_commissary_items" ON commissary_order_items
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE INDEX IF NOT EXISTS idx_commissary_items_order ON commissary_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_commissary_items_lot ON commissary_order_items(lot_code);
