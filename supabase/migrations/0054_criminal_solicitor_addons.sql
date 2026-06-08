-- =============================================================================
-- Criminal Solicitor Add-Ons
-- =============================================================================
-- Adds three solicitor-grade features:
-- 1) Declared Dependencies (JSONB in criminal_cases)
-- 2) Irreversible Decision Warnings (JSONB in criminal_cases)
-- 3) Disclosure Chase Timeline (separate table)
-- =============================================================================

-- =============================================================================
-- 1) DECLARED DEPENDENCIES
-- =============================================================================
-- Add JSONB field to criminal_cases for declared dependencies
ALTER TABLE criminal_cases 
ADD COLUMN IF NOT EXISTS declared_dependencies JSONB DEFAULT '[]'::jsonb;

-- Structure: [
--   {
--     "id": "cctv_aroma_kebab",
--     "label": "CCTV (Aroma Kebab 23:10–23:30)",
--     "status": "required" | "helpful" | "not_needed",
--     "note": "optional string",
--     "updated_at": "ISO timestamp",
--     "updated_by": "user_id"
--   }
-- ]

-- =============================================================================
-- 2) IRREVERSIBLE DECISION WARNINGS
-- =============================================================================
-- Add JSONB field to criminal_cases for irreversible decisions
ALTER TABLE criminal_cases 
ADD COLUMN IF NOT EXISTS irreversible_decisions JSONB DEFAULT '[]'::jsonb;

-- Structure: [
--   {
--     "id": "enter_plea_ptph",
--     "label": "Enter plea at PTPH",
--     "status": "not_yet" | "planned" | "completed",
--     "note": "optional string",
--     "updated_at": "ISO timestamp",
--     "updated_by": "user_id"
--   }
-- ]

-- =============================================================================
-- 3) DISCLOSURE CHASE TIMELINE
-- =============================================================================
-- Create separate table for disclosure timeline entries
CREATE TABLE IF NOT EXISTS criminal_disclosure_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Evidence item (enum aligned with dependencies)
  item TEXT NOT NULL,
  
  -- Action taken
  action TEXT NOT NULL CHECK (action IN ('requested', 'chased', 'served', 'reviewed', 'outstanding', 'overdue')),
  
  -- Date of action (ISO date)
  date DATE NOT NULL,
  
  -- Optional note
  note TEXT,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  
  -- Index for efficient queries
  CONSTRAINT criminal_disclosure_timeline_case_item_date_idx UNIQUE (case_id, item, date, action)
);

-- If table already existed with a different schema (partial apply or other migration), add missing columns
ALTER TABLE criminal_disclosure_timeline
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS item TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Indexes (all columns now exist after ALTER above)
CREATE INDEX IF NOT EXISTS idx_criminal_disclosure_timeline_case_id ON criminal_disclosure_timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_criminal_disclosure_timeline_org_id ON criminal_disclosure_timeline(org_id);
CREATE INDEX IF NOT EXISTS idx_criminal_disclosure_timeline_date ON criminal_disclosure_timeline(date DESC);
CREATE INDEX IF NOT EXISTS idx_criminal_disclosure_timeline_item ON criminal_disclosure_timeline(item);
CREATE INDEX IF NOT EXISTS idx_criminal_disclosure_timeline_action ON criminal_disclosure_timeline(action);

-- RLS
ALTER TABLE criminal_disclosure_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS criminal_disclosure_timeline_org_access ON criminal_disclosure_timeline;

CREATE POLICY criminal_disclosure_timeline_org_access
  ON criminal_disclosure_timeline
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE)::UUID)
  WITH CHECK (org_id = current_setting('app.current_org_id', TRUE)::UUID);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON COLUMN criminal_cases.declared_dependencies IS 'Solicitor-declared dependencies for strategy. Array of {id, label, status, note, updated_at, updated_by}';
COMMENT ON COLUMN criminal_cases.irreversible_decisions IS 'Irreversible decision warnings. Array of {id, label, status, note, updated_at, updated_by}';
COMMENT ON TABLE criminal_disclosure_timeline IS 'Timeline of disclosure requests, chases, and status updates';
