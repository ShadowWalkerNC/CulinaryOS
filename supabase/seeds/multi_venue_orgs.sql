-- ============================================================
-- CulinaryOS — Multi-Organization & Multi-Venue Seed
-- Seeds: >= 2 Organizations, >= 3 Distinct Venues,
-- Real Costed Recipes, Menus, Staff PINs, and Completed Purchase Order Cycles
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. ORGANIZATIONS (Multi-Tenant Enterprise Parents) ─────────────────────────
INSERT INTO public.organizations (id, name, slug, billing_email, royalty_rate_percent) VALUES
  ('00000000-0000-0000-0001-000000000000', 'Apex Hospitality Group', 'apex-hospitality', 'billing@apexhospitality.local', 4.50),
  ('00000000-0000-0000-0002-000000000000', 'Coastal Food Ventures',  'coastal-food',        'finance@coastalfood.local',      3.00)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  billing_email = EXCLUDED.billing_email,
  royalty_rate_percent = EXCLUDED.royalty_rate_percent;

-- ─── 2. VENUES / RESTAURANTS (3 Venues across 2 Orgs) ─────────────────────────
-- Org 1: Venue 1 (Full-Service Bistro) & Venue 2 (Central Commissary)
-- Org 2: Venue 3 (Mobile BBQ Food Truck)
INSERT INTO public.tenants (id, organization_id, name, slug, status, is_commissary) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000000', 'The Golden Fork', 'golden-fork', 'active', false),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000000', 'Golden Fork Commissary & Central Bakery', 'gf-commissary', 'active', true),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0002-000000000000', 'Northern Fixins Food Truck', 'northern-fixins', 'active', false)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  status = EXCLUDED.status,
  is_commissary = EXCLUDED.is_commissary;

-- ─── 3. VENUE INGREDIENTS & PAR LEVELS ─────────────────────────────────────────

-- Venue 1: The Golden Fork (Bistro)
INSERT INTO public.ingredients (id, tenant_id, name, unit, current_qty, reorder_at, reorder_qty, cost_per_unit) VALUES
  ('00000000-0000-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', '12oz Prime Ribeye Steak', 'each', 28, 10, 25, 2650),
  ('00000000-0000-0001-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Atlantic Salmon Fillet', 'each', 20, 8, 20, 1750),
  ('00000000-0000-0001-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Yukon Gold Potatoes', 'lb', 75, 25, 50, 85),
  ('00000000-0000-0001-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Fresh Herb Butter Log', 'portion', 45, 15, 30, 95),
  ('00000000-0000-0001-0001-000000000005', '00000000-0000-0000-0000-000000000001', 'Black Truffle Puree', 'oz', 16, 5, 10, 850)
ON CONFLICT (id) DO UPDATE SET
  current_qty = EXCLUDED.current_qty,
  cost_per_unit = EXCLUDED.cost_per_unit;

-- Venue 2: Commissary & Central Bakery
INSERT INTO public.ingredients (id, tenant_id, name, unit, current_qty, reorder_at, reorder_qty, cost_per_unit) VALUES
  ('00000000-0000-0001-0002-000000000001', '00000000-0000-0000-0000-000000000002', 'High-Gluten Bread Flour (50lb)', 'bag', 40, 10, 30, 2450),
  ('00000000-0000-0001-0002-000000000002', '00000000-0000-0000-0000-000000000002', 'European Butter 82%', 'lb', 250, 50, 150, 380),
  ('00000000-0000-0001-0002-000000000003', '00000000-0000-0000-0000-000000000002', 'San Marzano Tomato Paste', 'case', 35, 10, 20, 4200)
ON CONFLICT (id) DO UPDATE SET
  current_qty = EXCLUDED.current_qty;

-- Venue 3: Northern Fixins (Food Truck)
INSERT INTO public.ingredients (id, tenant_id, name, unit, current_qty, reorder_at, reorder_qty, cost_per_unit) VALUES
  ('00000000-0000-0001-0003-000000000001', '00000000-0000-0000-0000-000000000003', 'Pork Shoulder Bone-In', 'lb', 80, 25, 60, 295),
  ('00000000-0000-0001-0003-000000000002', '00000000-0000-0000-0000-000000000003', 'Beef Brisket USDA Choice', 'lb', 65, 20, 50, 580),
  ('00000000-0000-0001-0003-000000000003', '00000000-0000-0000-0000-000000000003', 'Brioche Sandwich Buns', 'pack', 50, 15, 30, 450),
  ('00000000-0000-0001-0003-000000000004', '00000000-0000-0000-0000-000000000003', 'Carolina Vinegar Sauce', 'gal', 8, 3, 5, 1200)
ON CONFLICT (id) DO UPDATE SET
  current_qty = EXCLUDED.current_qty,
  cost_per_unit = EXCLUDED.cost_per_unit;

-- ─── 4. FULL PURCHASE ORDER LIFECYCLE (Venue 1 — Received Cycle) ───────────────
INSERT INTO public.restock_purchase_orders (
  id, tenant_id, po_number, status, supplier, notes, created_by, approved_by, approved_at, sent_at, received_at, total_cost
) VALUES (
  '00000000-0000-0002-0001-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'PO-2026-0001',
  'received',
  'Sysco Foods (EDI 850)',
  'Weekly protein replenishment — inspected and received intact at loading dock.',
  'Chef Alex',
  'GM Sarah',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day',
  101250 -- $1,012.50 in cents
)
ON CONFLICT (tenant_id, po_number) DO UPDATE SET
  status = EXCLUDED.status,
  received_at = EXCLUDED.received_at;

-- PO Line Items for Received PO
INSERT INTO public.po_line_items (
  id, po_id, ingredient_id, ingredient_name, unit, ordered_qty, received_qty, unit_cost
) VALUES
  ('00000000-0000-0003-0001-000000000001', '00000000-0000-0002-0001-000000000001', '00000000-0000-0001-0001-000000000001', '12oz Prime Ribeye Steak', 'each', 25, 25, 2650),
  ('00000000-0000-0003-0001-000000000002', '00000000-0000-0002-0001-000000000001', '00000000-0000-0001-0001-000000000002', 'Atlantic Salmon Fillet', 'each', 20, 20, 1750)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. ACTIVE PURCHASE ORDER (Venue 3 — Food Truck Active Cycle) ──────────────
INSERT INTO public.restock_purchase_orders (
  id, tenant_id, po_number, status, supplier, notes, created_by, approved_by, approved_at, sent_at, total_cost
) VALUES (
  '00000000-0000-0002-0003-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'PO-2026-0002',
  'sent',
  'US Foods Direct',
  'Weekend festival prep — delivery scheduled for Friday 7 AM.',
  'Operator Nate',
  'Operator Nate',
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '10 hours',
  46700 -- $467.00
)
ON CONFLICT (tenant_id, po_number) DO UPDATE SET
  status = EXCLUDED.status;

-- ─── 6. COMMISSARY TRANSFER ORDER (Venue 2 Commissary -> Venue 1 Bistro) ───────
INSERT INTO public.commissary_orders (
  id, organization_id, from_location_id, to_location_id, order_number, status, total_cost_cents, shipped_at, notes
) VALUES (
  '00000000-0000-0004-0001-000000000001',
  '00000000-0000-0000-0001-000000000000',
  '00000000-0000-0000-0000-000000000002', -- From Central Bakery
  '00000000-0000-0000-0000-000000000001', -- To Golden Fork Bistro
  'XFER-2026-0012',
  'shipped',
  18500,
  NOW() - INTERVAL '4 hours',
  'Fresh daily artisan brioche buns and laminated puff pastry sheets.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.commissary_order_items (
  id, order_id, item_name, lot_code, quantity_requested, quantity_shipped, unit, unit_cost_cents, expiration_date
) VALUES (
  '00000000-0000-0005-0001-000000000001',
  '00000000-0000-0004-0001-000000000001',
  'Artisan Brioche Slider Buns (Batch 42)',
  'LOT-20260918-B42',
  120,
  120,
  'pcs',
  65,
  NOW() + INTERVAL '3 days'
)
ON CONFLICT (id) DO NOTHING;
