-- ============================================================
-- CulinaryOS — Base demo tenant
-- Idempotent seed for local single-tenant demos.
-- Tenant UUID matches VITE_TENANT_ID default in .env.example
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO public.tenants (id, name, slug, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'The Golden Fork',
  'golden-fork',
  'active',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    status = EXCLUDED.status;
