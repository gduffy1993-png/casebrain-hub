-- Phase G: Client Updates, Opponent Radar, Bundle Navigator

-- Client Update tracking per case
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_update_last_generated_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_update_preview TEXT;

-- Opponent activity (derived/cached data)
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opponent_last_contact_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opponent_avg_response_days INTEGER;

-- Bundle Phase A fields
CREATE TABLE IF NOT EXISTS case_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  bundle_name TEXT NOT NULL,
  file_url TEXT,
  page_count INTEGER,
  phase_a_summary TEXT,
  detected_sections JSONB DEFAULT '[]',
  is_partial_analysis BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_bundles_case_id ON case_bundles(case_id);
CREATE INDEX IF NOT EXISTS idx_case_bundles_org_id ON case_bundles(org_id);

ALTER TABLE case_bundles ENABLE ROW LEVEL SECURITY;

