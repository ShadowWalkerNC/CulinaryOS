-- Sprint 10: Founding customer tracking — written at conversion, never deleted
CREATE TABLE founding_customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES companies(id),
  customer_number     INTEGER NOT NULL UNIQUE CHECK (customer_number BETWEEN 1 AND 5),
  business_name       TEXT NOT NULL,
  business_type       TEXT NOT NULL,
  location            TEXT NOT NULL,
  converted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  public_name         TEXT,
  public_permission   BOOLEAN DEFAULT FALSE,
  guarantee_terms     TEXT NOT NULL DEFAULT
    'Lifetime access to every CulinaryOS feature at Enterprise tier. ' ||
    'Irrevocable. Transferable with business sale. No additional charge. Ever.',
  transferable_to     UUID REFERENCES companies(id)
);

ALTER TABLE founding_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published" ON founding_customers
  FOR SELECT USING (public_permission = TRUE);

CREATE POLICY "founder_write" ON founding_customers
  FOR ALL USING (auth.jwt() ->> 'role' = 'owner');

-- Stamp founding badge on company record at conversion
CREATE OR REPLACE FUNCTION stamp_founding_badge()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE companies
  SET
    is_founding_customer        = TRUE,
    founding_customer_number    = NEW.customer_number,
    founding_customer_at        = NEW.converted_at
  WHERE id = NEW.company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_founding_badge
  AFTER INSERT ON founding_customers
  FOR EACH ROW EXECUTE FUNCTION stamp_founding_badge();
