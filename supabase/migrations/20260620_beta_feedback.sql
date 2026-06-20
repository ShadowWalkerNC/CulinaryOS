-- Sprint 10: Weekly beta operator feedback
CREATE TABLE beta_feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES beta_applications(id),
  week_number       INTEGER NOT NULL,
  call_date         DATE NOT NULL,
  bugs_reported     TEXT[],
  confusion_points  TEXT[],
  feature_requests  TEXT[],
  what_worked       TEXT,
  nps_score         INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  conversion_intent TEXT CHECK (conversion_intent IN (
    'definitely_converting',
    'likely_converting',
    'undecided',
    'unlikely',
    'churning'
  )),
  conversion_blocker TEXT,
  founder_action_items TEXT[],
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_only" ON beta_feedback
  USING (auth.jwt() ->> 'role' = 'owner');

-- At-risk view: operators signaling churn or blockers
CREATE VIEW beta_at_risk AS
  SELECT
    ba.business_name,
    ba.phone,
    bf.week_number,
    bf.conversion_intent,
    bf.conversion_blocker,
    bf.nps_score,
    bf.call_date
  FROM beta_feedback bf
  JOIN beta_applications ba ON ba.id = bf.application_id
  WHERE bf.conversion_intent IN ('unlikely', 'churning')
     OR bf.nps_score < 7
  ORDER BY bf.call_date DESC;
