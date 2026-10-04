-- ============================================================
-- CulinaryOS pg-foundation 001 — extensions, roles, helpers, bootstrap
-- Fresh PostgreSQL only. No Supabase constructs (no auth.*, no anon/
-- service_role, no supabase_realtime publication, no uuid-ossp).
-- ============================================================

-- Portable extensions: pgcrypto (gen_random_uuid), citext (nullable emails),
-- pg_trgm (menu search). No pgtap in production migrations.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Restricted runtime role: owns nothing, cannot log in, cannot bypass RLS.
-- The migration/owner login is granted membership so pooled sessions can
-- SET LOCAL ROLE to it; production credential ceremony is handled server-side.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'culinaryos_app') THEN
    CREATE ROLE culinaryos_app WITH NOLOGIN NOBYPASSRLS;
  ELSE
    ALTER ROLE culinaryos_app WITH NOLOGIN NOBYPASSRLS;
  END IF;
END
$do$;

GRANT USAGE ON SCHEMA public TO culinaryos_app;

DO $do$
BEGIN
  EXECUTE format('GRANT culinaryos_app TO %I', current_user);
EXCEPTION WHEN duplicate_object THEN
  -- Membership already granted; safe to ignore.
  NULL;
END
$do$;

-- ---- Tenant/user setting helpers (empty-safe and invalid-safe UUID cast) ----
CREATE OR REPLACE FUNCTION public.app_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  raw text := nullif(current_setting('app.tenant_id', true), '');
  tid uuid;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    tid := raw::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;
  RETURN tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  raw text := nullif(current_setting('app.user_id', true), '');
  uid uuid;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    uid := raw::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NULL;
  END;
  RETURN uid;
END;
$$;

-- Shared updated_at trigger (ported from V1).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---- Migration ledger hardening (table created by the runner) ----
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schema_migrations_all" ON public.schema_migrations;
-- Owner-managed ledger: RLS forced on, permissive policy; the app role gets
-- SELECT only via grants below, so it can report versions but never mutate.
CREATE POLICY "schema_migrations_all" ON public.schema_migrations
  FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT ON TABLE public.schema_migrations TO culinaryos_app;

-- ---- One-time bootstrap singleton ----
-- Row inserted BEFORE forcing RLS; afterwards the table is deny-all (no
-- policies, no grants). Presence of id=1 proves the bootstrap ran exactly once
-- inside this migration's transaction.
CREATE TABLE IF NOT EXISTS public.pg_foundation_bootstrap (
  id             int PRIMARY KEY CHECK (id = 1),
  bootstrapped_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.pg_foundation_bootstrap (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.pg_foundation_bootstrap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_foundation_bootstrap FORCE ROW LEVEL SECURITY;
