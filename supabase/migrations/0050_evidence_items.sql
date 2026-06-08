-- =============================================================================
-- Evidence Items Table
-- Tracks evidence items with status, chase dates, and source information
-- Part of Post-Build Lock-In layer: Evidence Memory system
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  practice_area TEXT,
  title TEXT NOT NULL,
  category TEXT,
  source TEXT,
  why_needed TEXT,
  status TEXT NOT NULL DEFAULT 'outstanding',
  requested_at TIMESTAMPTZ,
  last_chased_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT evidence_items_status_check CHECK (status IN (
    'outstanding',
    'requested',
    'received',
    'escalated',
    'no_longer_needed'
  )),
  
  -- Prevent duplicates per case (same title)
  CONSTRAINT evidence_items_case_title_unique UNIQUE (case_id, title)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_items_case_id ON public.evidence_items(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_case_status ON public.evidence_items(case_id, status);
CREATE INDEX IF NOT EXISTS idx_evidence_items_status_chased ON public.evidence_items(status, last_chased_at);
CREATE INDEX IF NOT EXISTS idx_evidence_items_org_id ON public.evidence_items(org_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.evidence_items_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evidence_items_updated_at ON public.evidence_items;
CREATE TRIGGER trg_evidence_items_updated_at
  BEFORE UPDATE ON public.evidence_items
  FOR EACH ROW
  EXECUTE FUNCTION public.evidence_items_set_updated_at();

-- RLS
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_items_org_access ON public.evidence_items;

CREATE POLICY evidence_items_org_access
  ON public.evidence_items
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE))
  WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));

