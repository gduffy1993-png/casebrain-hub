-- =============================================================================
-- Migration: Enhance Tasks & Add Critical Features
-- =============================================================================
-- Adds task assignment, time tracking foundation, and conflict checking

-- =============================================================================
-- 1. Enhance Tasks Table (Add Assignment)
-- =============================================================================

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS assigned_to text, -- Clerk user ID
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS estimated_hours numeric(5,2),
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Index for assigned tasks
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON public.tasks (priority);

-- =============================================================================
-- 2. Time Tracking Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id text NOT NULL, -- Clerk user ID
  description text NOT NULL,
  activity_type text NOT NULL DEFAULT 'general' CHECK (activity_type IN (
    'drafting', 'research', 'client_call', 'court_attendance', 'meeting', 
    'review', 'correspondence', 'admin', 'general'
  )),
  billable boolean DEFAULT true,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
      ELSE NULL
    END
  ) STORED,
  hourly_rate numeric(10,2), -- Optional: user's hourly rate
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_entries_org_idx ON public.time_entries (org_id);
CREATE INDEX IF NOT EXISTS time_entries_case_idx ON public.time_entries (case_id);
CREATE INDEX IF NOT EXISTS time_entries_user_idx ON public.time_entries (user_id);
CREATE INDEX IF NOT EXISTS time_entries_date_idx ON public.time_entries (start_time);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_time_entries ON public.time_entries;
CREATE POLICY deny_anon_time_entries
  ON public.time_entries
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- 3. Conflict Checking Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  entity_name text NOT NULL, -- Client name, opponent name, etc.
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'opponent', 'witness', 'expert', 'related_party')),
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  conflict_type text NOT NULL CHECK (conflict_type IN ('direct', 'potential', 'resolved')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL, -- Clerk user ID
  resolved_at timestamptz,
  resolved_by text,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS conflicts_org_idx ON public.conflicts (org_id);
CREATE INDEX IF NOT EXISTS conflicts_entity_idx ON public.conflicts (entity_name);
CREATE INDEX IF NOT EXISTS conflicts_case_idx ON public.conflicts (case_id);
CREATE INDEX IF NOT EXISTS conflicts_type_idx ON public.conflicts (conflict_type);

ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_conflicts ON public.conflicts;
CREATE POLICY deny_anon_conflicts
  ON public.conflicts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- 4. Settlement Calculator History (for analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.settlement_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  calculation_type text NOT NULL CHECK (calculation_type IN ('pi', 'housing', 'clinical_neg', 'general')),
  inputs jsonb NOT NULL, -- Store calculation inputs
  result jsonb NOT NULL, -- Store calculation result
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL
);

CREATE INDEX IF NOT EXISTS settlement_calc_org_idx ON public.settlement_calculations (org_id);
CREATE INDEX IF NOT EXISTS settlement_calc_case_idx ON public.settlement_calculations (case_id);

ALTER TABLE public.settlement_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_settlement_calc ON public.settlement_calculations;
CREATE POLICY deny_anon_settlement_calc
  ON public.settlement_calculations
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- =============================================================================
-- 5. Updated At Triggers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.time_entries_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_time_entries_updated_at ON public.time_entries;
CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.time_entries_set_updated_at();

-- =============================================================================
-- 6. Comments
-- =============================================================================

COMMENT ON TABLE public.time_entries IS 'Tracks billable and non-billable time for cases and tasks';
COMMENT ON TABLE public.conflicts IS 'Conflict of interest checking - SRA requirement';
COMMENT ON TABLE public.settlement_calculations IS 'History of settlement calculations for analytics';

