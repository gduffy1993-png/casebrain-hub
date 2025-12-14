-- =============================================================================
-- Case Analysis Versions Table
-- Stores versioned analysis snapshots for incremental case updates
-- Part of Incremental Case Update system
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.case_analysis_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  document_ids UUID[] NOT NULL DEFAULT '{}',
  risk_rating TEXT,
  summary TEXT,
  key_issues JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  missing_evidence JSONB DEFAULT '[]'::jsonb,
  analysis_delta JSONB, -- Delta vs previous version
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  
  -- One version number per case
  CONSTRAINT case_analysis_versions_case_version_unique UNIQUE (case_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_analysis_versions_case_id ON public.case_analysis_versions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_analysis_versions_case_version ON public.case_analysis_versions(case_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_case_analysis_versions_org_id ON public.case_analysis_versions(org_id);

-- RLS
ALTER TABLE public.case_analysis_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_analysis_versions_org_access ON public.case_analysis_versions;

CREATE POLICY case_analysis_versions_org_access
  ON public.case_analysis_versions
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE))
  WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));

-- Add optional fields to cases table for tracking
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS latest_analysis_version INTEGER;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS analysis_stale BOOLEAN DEFAULT FALSE;

