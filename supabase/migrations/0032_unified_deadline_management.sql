-- =============================================================================
-- Unified Deadline Management System (IDEMPOTENT / SAFE)
-- =============================================================================
-- Extends deadlines table to support all deadline types and integrations

-- -----------------------------------------------------------------------------
-- 1. Create deadlines table (safe)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'MANUAL',
  due_date TIMESTAMPTZ NOT NULL,
  days_remaining INTEGER,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  source TEXT NOT NULL DEFAULT 'MANUAL',
  source_rule TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  business_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_category CHECK (category IN ('COURT','HOUSING','LIMITATION','MANUAL')),
  CONSTRAINT valid_priority CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  CONSTRAINT valid_status CHECK (status IN ('UPCOMING','DUE_TODAY','DUE_SOON','OVERDUE','COMPLETED','CANCELLED')),
  CONSTRAINT valid_severity CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  CONSTRAINT valid_source CHECK (source IN ('AUTO_CALCULATED','MANUAL','COURT_ORDER'))
);

-- -----------------------------------------------------------------------------
-- 2. Indexes (safe)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON public.deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_org_id ON public.deadlines(org_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON public.deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON public.deadlines(status);
CREATE INDEX IF NOT EXISTS idx_deadlines_priority ON public.deadlines(priority);
CREATE INDEX IF NOT EXISTS idx_deadlines_category ON public.deadlines(category);

-- -----------------------------------------------------------------------------
-- 3. updated_at trigger (SAFE: drop before create)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deadlines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deadlines_set_updated_at ON public.deadlines;

CREATE TRIGGER deadlines_set_updated_at
BEFORE UPDATE ON public.deadlines
FOR EACH ROW
EXECUTE FUNCTION public.deadlines_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deadlines_org_access ON public.deadlines;

CREATE POLICY deadlines_org_access
ON public.deadlines
FOR ALL
USING (org_id = current_setting('app.current_org_id', TRUE))
WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));
