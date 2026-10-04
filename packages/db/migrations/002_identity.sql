-- ============================================================
-- CulinaryOS pg-foundation 002 — identity, tenancy, device registry
-- Replaces Supabase Auth (auth.users FK) with owned app_users, opaque
-- hashed sessions, and a revocable device-key registry. Fresh DB only.
-- ============================================================

-- ---- Owned users (replaces auth.users) ----
CREATE TABLE public.app_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        citext UNIQUE,
  display_name text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---- Organizations (ported from V17) ----
CREATE TABLE public.organizations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  slug                 text NOT NULL UNIQUE,
  billing_email        text NOT NULL,
  royalty_rate_percent numeric(5,2) DEFAULT 4.50 CHECK (royalty_rate_percent >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---- Tenants (V1 shape + V17 org link + V10 Stripe columns) ----
CREATE TABLE public.tenants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_commissary     boolean NOT NULL DEFAULT false,
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  plan              text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  stripe_customer_id text,
  stripe_account_id  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_organization ON public.tenants(organization_id);

-- ---- Membership (V1 shape, FK retargeted to app_users) ----
CREATE TABLE public.tenant_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','manager','chef','server','viewer','bartender','busser','food_runner','host','line_cook','prep_cook','dishwasher','barista','sommelier')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);

-- ---- Staff PINs (V14 shape + tenant-scoped PIN lookup hash) ----
-- pin_hash is the slow verifier; pin_lookup_hash is an HMAC keyed by a server
-- secret so live lookup is one indexed row instead of a tenant-wide scan.
CREATE TABLE public.staff_pins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  pin_hash        text NOT NULL,
  pin_lookup_hash text NOT NULL,
  display_name    text NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id),
  UNIQUE (tenant_id, pin_lookup_hash)
);
CREATE INDEX idx_staff_pins_tenant ON public.staff_pins(tenant_id);

-- ---- Device / service keys (replaces global INTERNAL/DEVICE secrets) ----
CREATE TABLE public.device_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash     text NOT NULL UNIQUE,
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label        text NOT NULL DEFAULT '',
  capabilities jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(capabilities) = 'array'),
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_keys_tenant ON public.device_keys(tenant_id);

-- ---- Opaque server sessions (SHA-256 hash stored, never the token) ----
CREATE TABLE public.auth_sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner','manager','chef','server','viewer','bartender','busser','food_runner','host','line_cook','prep_cook','dishwasher','barista','sommelier')),
  device_id  uuid REFERENCES public.device_keys(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_sessions_tenant ON public.auth_sessions(tenant_id);
CREATE INDEX idx_auth_sessions_user ON public.auth_sessions(user_id);

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---- Narrow unauthenticated lookup functions ----
-- SECURITY DEFINER is required (callers have no session yet). Each function
-- does exactly one indexed lookup plus expiry/revocation/membership checks,
-- runs with a fixed search_path, and is executable only by culinaryos_app.
-- No broad table access is granted to unauthenticated callers.

-- Resolve one opaque token hash to a verified session or device identity.
-- Sessions require live membership in tenant_users (authoritative role) and a
-- live bound device when device_id is set. Devices return capabilities.
CREATE OR REPLACE FUNCTION public.resolve_identity(p_token_hash text)
RETURNS TABLE (kind text, user_id uuid, tenant_id uuid, role text, device_id uuid, capabilities jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT kind, user_id, tenant_id, role, device_id, capabilities FROM (
    SELECT 0 AS prio, 'session'::text AS kind,
      s.user_id AS user_id, s.tenant_id AS tenant_id, tu.role AS role,
      s.device_id AS device_id, NULL::jsonb AS capabilities
    FROM public.auth_sessions s
    JOIN public.tenant_users tu
      ON tu.user_id = s.user_id AND tu.tenant_id = s.tenant_id
    LEFT JOIN public.device_keys d ON d.id = s.device_id
    WHERE s.token_hash = p_token_hash
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
      AND (s.device_id IS NULL
        OR (d.revoked_at IS NULL AND (d.expires_at IS NULL OR d.expires_at > now())))
    UNION ALL
    SELECT 1 AS prio, 'device'::text AS kind,
      NULL::uuid AS user_id, d.tenant_id AS tenant_id, NULL::text AS role,
      d.id AS device_id, d.capabilities AS capabilities
    FROM public.device_keys d
    WHERE d.key_hash = p_token_hash
      AND d.revoked_at IS NULL
      AND (d.expires_at IS NULL OR d.expires_at > now())
  ) ranked
  ORDER BY prio
  LIMIT 1;
$$;

-- Return the single active PIN candidate for (tenant, lookup HMAC).
CREATE OR REPLACE FUNCTION public.find_staff_pin(p_tenant_id uuid, p_lookup_hash text)
RETURNS TABLE (user_id uuid, pin_hash text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id, s.pin_hash, s.display_name
  FROM public.staff_pins s
  WHERE s.tenant_id = p_tenant_id
    AND s.pin_lookup_hash = p_lookup_hash
    AND s.active
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_identity(text) TO culinaryos_app;
REVOKE ALL ON FUNCTION public.find_staff_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_staff_pin(uuid, text) TO culinaryos_app;

-- ---- RLS (enabled + forced on every table) ----
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users FORCE ROW LEVEL SECURITY;
CREATE POLICY "app_users_select_own" ON public.app_users
  FOR SELECT USING (id = public.app_user_id());
CREATE POLICY "app_users_insert" ON public.app_users
  FOR INSERT WITH CHECK (true);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.organization_id = organizations.id
      AND t.id = public.app_tenant_id()
  ));
CREATE POLICY "organizations_insert" ON public.organizations
  FOR INSERT WITH CHECK (true);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT USING (id = public.app_tenant_id());
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT WITH CHECK (id = public.app_tenant_id());
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (id = public.app_tenant_id()) WITH CHECK (id = public.app_tenant_id());
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE USING (id = public.app_tenant_id());

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users FORCE ROW LEVEL SECURITY;
CREATE POLICY "tu_select" ON public.tenant_users FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "tu_insert" ON public.tenant_users FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "tu_update" ON public.tenant_users FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "tu_delete" ON public.tenant_users FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_pins FORCE ROW LEVEL SECURITY;
CREATE POLICY "pins_select" ON public.staff_pins FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "pins_insert" ON public.staff_pins FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "pins_update" ON public.staff_pins FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "pins_delete" ON public.staff_pins FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.device_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_keys FORCE ROW LEVEL SECURITY;
CREATE POLICY "dk_select" ON public.device_keys FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "dk_insert" ON public.device_keys FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "dk_update" ON public.device_keys FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "dk_delete" ON public.device_keys FOR DELETE USING (tenant_id = public.app_tenant_id());

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY "sess_select" ON public.auth_sessions FOR SELECT USING (tenant_id = public.app_tenant_id());
CREATE POLICY "sess_insert" ON public.auth_sessions FOR INSERT WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "sess_update" ON public.auth_sessions FOR UPDATE USING (tenant_id = public.app_tenant_id()) WITH CHECK (tenant_id = public.app_tenant_id());
CREATE POLICY "sess_delete" ON public.auth_sessions FOR DELETE USING (tenant_id = public.app_tenant_id());

-- ---- Grants (least privilege; manager-only writes enforced server-side) ----
GRANT SELECT, INSERT ON TABLE public.app_users TO culinaryos_app;
GRANT SELECT, INSERT ON TABLE public.organizations TO culinaryos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO culinaryos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_users TO culinaryos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_pins TO culinaryos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.device_keys TO culinaryos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_sessions TO culinaryos_app;
