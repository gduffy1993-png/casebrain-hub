-- D5: Verdict loop + audit trail
-- Audit: when agreed summary / case theory was last updated
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS agreed_summary_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS case_theory_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN criminal_cases.agreed_summary_updated_at IS 'D5: Last time agreed summary (any tier) was saved';
COMMENT ON COLUMN criminal_cases.case_theory_updated_at IS 'D5: Last time case theory line was saved';

-- Verdict loop: rate summary / chat / strategy; optional change note
CREATE TABLE IF NOT EXISTS criminal_verdict_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('summary', 'chat', 'strategy')),
  rating TEXT NOT NULL CHECK (rating IN ('good', 'needs_work')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_criminal_verdict_ratings_case_created
  ON criminal_verdict_ratings(case_id, created_at DESC);

COMMENT ON TABLE criminal_verdict_ratings IS 'D5: User ratings of summary/chat/strategy; optional change list note';
