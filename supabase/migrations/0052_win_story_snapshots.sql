-- =============================================================================
-- Win Story Snapshots Table
-- Captures win stories with before/after snapshots and evidence deltas
-- Part of Post-Build Lock-In layer: Win Story Capture feature
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.win_story_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Win snapshot v1',
  note TEXT,
  before_risk TEXT,
  after_risk TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- snapshot JSONB structure:
  -- {
  --   "risk": "STRONG",
  --   "summary": "...",
  --   "evidence_counts": {
  --     "outstanding": 3,
  --     "received": 5,
  --     "escalated": 1
  --   },
  --   "key_issues_excerpt": [...],
  --   "timeline_count": 12
  -- }
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_win_story_snapshots_case_created 
  ON public.win_story_snapshots(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_win_story_snapshots_org_created 
  ON public.win_story_snapshots(org_id, created_at DESC);

-- RLS
ALTER TABLE public.win_story_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS win_story_snapshots_org_access ON public.win_story_snapshots;

CREATE POLICY win_story_snapshots_org_access
  ON public.win_story_snapshots
  FOR ALL
  USING (org_id = current_setting('app.current_org_id', TRUE))
  WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));
