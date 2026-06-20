-- Phase 8: AI Prompt Log table
-- Append-only audit trail for all Custom Prompt Library executions

CREATE TABLE IF NOT EXISTS ai_prompt_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id),
  prompt_name     TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  inputs          JSONB NOT NULL,
  raw_output      TEXT NOT NULL,
  review_status   TEXT NOT NULL DEFAULT 'pending'
                  CHECK (review_status IN ('pending','approved','edited','rejected')),
  edited_output   TEXT,
  reviewed_by     UUID REFERENCES staff(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only enforcement: no UPDATE, no DELETE
CREATE RULE no_update_ai_prompt_log
  AS ON UPDATE TO ai_prompt_log DO INSTEAD NOTHING;
CREATE RULE no_delete_ai_prompt_log
  AS ON DELETE TO ai_prompt_log DO INSTEAD NOTHING;

-- Row Level Security
ALTER TABLE ai_prompt_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_isolation" ON ai_prompt_log
  FOR SELECT USING (
    company_id::text = (auth.jwt() ->> 'company_id')
  );

CREATE POLICY "insert_own_company" ON ai_prompt_log
  FOR INSERT WITH CHECK (
    company_id::text = (auth.jwt() ->> 'company_id')
  );

-- Indexes
CREATE INDEX idx_ai_prompt_log_company_created
  ON ai_prompt_log (company_id, created_at DESC);

CREATE INDEX idx_ai_prompt_log_pending
  ON ai_prompt_log (company_id, review_status)
  WHERE review_status = 'pending';
