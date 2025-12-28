-- Migration: Create case_strategy_commitments table
-- Purpose: Store strategy commitments for criminal cases to enable Phase 2 directive planning

CREATE TABLE IF NOT EXISTS public.case_strategy_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  primary_strategy TEXT NOT NULL CHECK (primary_strategy IN ('fight_charge', 'charge_reduction', 'outcome_management')),
  fallback_strategies TEXT[] DEFAULT '{}',
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  committed_by TEXT NOT NULL, -- user_id from Clerk
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one commitment per case (can be updated but not duplicated)
  UNIQUE(case_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_case_id ON public.case_strategy_commitments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_org_id ON public.case_strategy_commitments(org_id);
CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_committed_by ON public.case_strategy_commitments(committed_by);

-- RLS Policies
ALTER TABLE public.case_strategy_commitments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view commitments for cases in their org
CREATE POLICY "Users can view commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()::text
      UNION
      SELECT id FROM public.organisations WHERE external_ref = 'solo-user_' || auth.uid()::text
    )
  );

-- Policy: Users can insert commitments for cases in their org
CREATE POLICY "Users can insert commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()::text
      UNION
      SELECT id FROM public.organisations WHERE external_ref = 'solo-user_' || auth.uid()::text
    )
    AND committed_by = auth.uid()::text
  );

-- Policy: Users can update commitments for cases in their org (only if they created it or are owner)
CREATE POLICY "Users can update commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()::text
      UNION
      SELECT id FROM public.organisations WHERE external_ref = 'solo-user_' || auth.uid()::text
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()::text
      UNION
      SELECT id FROM public.organisations WHERE external_ref = 'solo-user_' || auth.uid()::text
    )
  );

-- Policy: Users can delete commitments for cases in their org (only if they created it or are owner)
CREATE POLICY "Users can delete commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.users WHERE id = auth.uid()::text
      UNION
      SELECT id FROM public.organisations WHERE external_ref = 'solo-user_' || auth.uid()::text
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_case_strategy_commitments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_case_strategy_commitments_updated_at
  BEFORE UPDATE ON public.case_strategy_commitments
  FOR EACH ROW
  EXECUTE FUNCTION update_case_strategy_commitments_updated_at();

