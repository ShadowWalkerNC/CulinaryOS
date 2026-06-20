-- Sprint 9: Beta Applications table
CREATE TABLE IF NOT EXISTS beta_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name   TEXT NOT NULL,
  business_type   TEXT NOT NULL,
  current_pos     TEXT,
  primary_pain    TEXT,
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL,
  location        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','admitted','declined','converted')),
  founder_notes   TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admitted_at     TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ
);

ALTER TABLE beta_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_only" ON beta_applications
  USING (auth.jwt() ->> 'role' = 'owner');

CREATE INDEX idx_beta_applications_status
  ON beta_applications (status, applied_at DESC);
