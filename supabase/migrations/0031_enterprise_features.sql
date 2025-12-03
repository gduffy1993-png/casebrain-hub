-- Enterprise Features Migration
-- Adds: audit log, supervisor review, analysis snapshots, firm overrides

-- =============================================================================
-- AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS case_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  
  -- Indexes for common queries
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'UPLOAD_STARTED', 'UPLOAD_COMPLETED',
    'EXTRACTION_STARTED', 'EXTRACTION_COMPLETED',
    'ANALYSIS_GENERATED', 'ANALYSIS_REGENERATED',
    'SUPERVISOR_REVIEWED', 'OVERVIEW_PDF_EXPORTED',
    'DOCUMENT_VIEWED', 'DOCUMENT_DELETED',
    'CASE_ARCHIVED', 'CASE_RESTORED', 'CASE_DELETED',
    'AI_ERROR', 'SYSTEM_ERROR'
  ))
);

CREATE INDEX IF NOT EXISTS idx_case_audit_events_case_id ON case_audit_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_audit_events_timestamp ON case_audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_case_audit_events_event_type ON case_audit_events(event_type);

-- =============================================================================
-- SUPERVISOR REVIEW
-- =============================================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS supervisor_reviewed BOOLEAN DEFAULT FALSE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS supervisor_reviewed_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS supervisor_reviewer_id TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS supervisor_review_note TEXT;

-- =============================================================================
-- ANALYSIS SNAPSHOTS
-- =============================================================================

-- Store current analysis JSON on the case
ALTER TABLE cases ADD COLUMN IF NOT EXISTS current_analysis JSONB;

-- Store analysis history in separate table
CREATE TABLE IF NOT EXISTS case_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta JSONB NOT NULL,
  snapshot JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_analysis_history_case_id ON case_analysis_history(case_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_history_created_at ON case_analysis_history(created_at DESC);

-- =============================================================================
-- FIRM PACK OVERRIDES
-- =============================================================================

CREATE TABLE IF NOT EXISTS firm_pack_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One override per org per pack
  UNIQUE(org_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_pack_overrides_org_id ON firm_pack_overrides(org_id);

-- =============================================================================
-- HOUSING HAZARD DATA
-- =============================================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS housing_hazard_summary JSONB;


