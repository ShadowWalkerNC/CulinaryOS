-- Sprint 11: Extension marketplace registry

CREATE TABLE extension_registry (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id      TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL
                    CHECK (category IN (
                      'ordering','inventory','ai','reporting',
                      'loyalty','integrations','staff','other'
                    )),
  version           TEXT NOT NULL,
  author_name       TEXT NOT NULL,
  author_email      TEXT NOT NULL,
  pricing_model     TEXT NOT NULL
                    CHECK (pricing_model IN ('free','paid','usage')),
  price_cents       INTEGER NOT NULL DEFAULT 0,
  download_url      TEXT NOT NULL,
  manifest_hash     TEXT NOT NULL,
  permissions       TEXT[] NOT NULL,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  install_count     INTEGER NOT NULL DEFAULT 0,
  avg_rating        NUMERIC(3,2),
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE installed_extensions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID NOT NULL REFERENCES locations(id),
  extension_id    TEXT NOT NULL REFERENCES extension_registry(extension_id),
  installed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  settings        JSONB NOT NULL DEFAULT '{}',
  last_error      TEXT,
  last_error_at   TIMESTAMPTZ,
  UNIQUE (location_id, extension_id)
);

CREATE TABLE extension_error_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     UUID REFERENCES locations(id),
  extension_id    TEXT NOT NULL,
  error_message   TEXT NOT NULL,
  stack_trace     TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_install_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE extension_registry
  SET install_count = install_count + 1
  WHERE extension_id = NEW.extension_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_install_count
  AFTER INSERT ON installed_extensions
  FOR EACH ROW EXECUTE FUNCTION increment_install_count();

ALTER TABLE extension_registry   ENABLE ROW LEVEL SECURITY;
ALTER TABLE installed_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_error_log  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published" ON extension_registry
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "location_owner" ON installed_extensions
  USING (location_id IN (
    SELECT id FROM locations WHERE company_id = (
      SELECT company_id FROM auth_helpers.current_company()
    )
  ));

-- Seed: Voice Ordering extension (verified, free, ships at launch)
INSERT INTO extension_registry (
  extension_id, name, description, category, version,
  author_name, author_email, pricing_model, price_cents,
  download_url, manifest_hash, permissions, is_verified, is_published, published_at
) VALUES (
  'com.culinaryos.ext.voice_ordering',
  'Voice Ordering',
  'Parse spoken orders using iOS/Android native STT. No on-device model required. Fuzzy matches spoken item names to your menu in real time.',
  'ordering', '1.0.0',
  'CulinaryOS Team', 'extensions@culinaryos.com',
  'free', 0,
  'https://extensions.culinaryos.com/voice_ordering/1.0.0.zip',
  'placeholder_hash_set_at_publish',
  ARRAY['microphone','menu.read','orders.write','modifiers.read'],
  TRUE, TRUE, NOW()
);
