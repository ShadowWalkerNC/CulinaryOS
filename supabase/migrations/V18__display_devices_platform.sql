-- ============================================================
-- CulinaryOS V18 — Display Platform & Android TV Device Schema
-- Multi-Tenant Display Devices, Pairing, Remote Control & Playlists
-- ============================================================

-- 1. Display Devices
CREATE TABLE IF NOT EXISTS public.display_devices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id      UUID,
  name             TEXT NOT NULL,
  pairing_code     VARCHAR(10),
  device_token     TEXT UNIQUE,
  device_type      TEXT NOT NULL DEFAULT 'android_tv',
  platform         TEXT NOT NULL DEFAULT 'android_tv'
                   CHECK (platform IN ('android_tv', 'web', 'tablet', 'browser', 'unknown')),
  app_version      TEXT NOT NULL DEFAULT '1.0.0',
  assigned_mode    TEXT NOT NULL DEFAULT 'kitchen'
                   CHECK (assigned_mode IN ('kitchen', 'manager', 'staff', 'guest', 'pickup', 'marketing')),
  assigned_view    TEXT NOT NULL DEFAULT 'all',
  configuration    JSONB NOT NULL DEFAULT '{}'::jsonb,
  paired_at        TIMESTAMPTZ,
  last_seen_at     TIMESTAMPTZ DEFAULT NOW(),
  online           BOOLEAN NOT NULL DEFAULT TRUE,
  enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant isolation and fast pairing lookup
CREATE INDEX IF NOT EXISTS idx_display_devices_tenant ON public.display_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_display_devices_pairing ON public.display_devices(pairing_code) WHERE pairing_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_display_devices_token ON public.display_devices(device_token) WHERE device_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_display_devices_status ON public.display_devices(tenant_id, online, enabled);

-- 2. Display Playlists / Scheduled Content
CREATE TABLE IF NOT EXISTS public.display_playlists (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  items            JSONB NOT NULL DEFAULT '[]'::jsonb,
  schedule         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_display_playlists_tenant ON public.display_playlists(tenant_id);

-- Updated_at triggers
CREATE TRIGGER trg_display_devices_updated_at BEFORE UPDATE ON public.display_devices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_display_playlists_updated_at BEFORE UPDATE ON public.display_playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Row Level Security (RLS) - Mandatory Compliance
ALTER TABLE public.display_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_playlists ENABLE ROW LEVEL SECURITY;

-- Tenant user read & write policies
CREATE POLICY "tenant_users_select_display_devices" ON public.display_devices
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "tenant_users_insert_display_devices" ON public.display_devices
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "tenant_users_update_display_devices" ON public.display_devices
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

CREATE POLICY "tenant_users_delete_display_devices" ON public.display_devices
  FOR DELETE USING (tenant_id = public.my_tenant_id());

-- Playlists RLS
CREATE POLICY "tenant_users_select_display_playlists" ON public.display_playlists
  FOR SELECT USING (tenant_id = public.my_tenant_id());

CREATE POLICY "tenant_users_insert_display_playlists" ON public.display_playlists
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "tenant_users_update_display_playlists" ON public.display_playlists
  FOR UPDATE USING (tenant_id = public.my_tenant_id());

CREATE POLICY "tenant_users_delete_display_playlists" ON public.display_playlists
  FOR DELETE USING (tenant_id = public.my_tenant_id());

-- Service role bypass for server background sync & device token authentication
CREATE POLICY "service_role_display_devices" ON public.display_devices
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "service_role_display_playlists" ON public.display_playlists
  FOR ALL USING (current_setting('role') = 'service_role');
