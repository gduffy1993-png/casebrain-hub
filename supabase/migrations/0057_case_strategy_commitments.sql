-- =============================================================================
-- Case Strategy Commitments
-- =============================================================================
-- Stores “what we are actually doing” commitments + status per case
-- RLS: deny anon; allow authenticated users where org_id matches their org context
-- NOTE: org_id is TEXT in this schema (solo-user_<clerkId> and/or org UUID as text)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.case_strategy_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,

  -- commitment content
  title TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','blocked','dropped')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),

  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_case_id
  ON public.case_strategy_commitments(case_id);

CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_org_id
  ON public.case_strategy_commitments(org_id);

CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_status
  ON public.case_strategy_commitments(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.case_strategy_commitments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_strategy_commitments_updated_at ON public.case_strategy_commitments;
CREATE TRIGGER trg_case_strategy_commitments_updated_at
BEFORE UPDATE ON public.case_strategy_commitments
FOR EACH ROW
EXECUTE FUNCTION public.case_strategy_commitments_updated_at();

-- RLS
ALTER TABLE public.case_strategy_commitments ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access (safe even if you later add proper per-org policies)
DROP POLICY IF EXISTS deny_anon_all_case_strategy_commitments ON public.case_strategy_commitments;
CREATE POLICY deny_anon_all_case_strategy_commitments
  ON public.case_strategy_commitments
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Remove old policies if they exist
DROP POLICY IF EXISTS "Users can view commitments for cases in their org" ON public.case_strategy_commitments;
DROP POLICY IF EXISTS "Users can insert commitments for cases in their org" ON public.case_strategy_commitments;
DROP POLICY IF EXISTS "Users can update commitments for cases in their org" ON public.case_strategy_commitments;
DROP POLICY IF EXISTS "Users can delete commitments for cases in their org" ON public.case_strategy_commitments;

-- Helper: compute allowed org_id as TEXT (either users.org_id or organisations.id::text via external_ref)
-- We avoid UNION type issues and keep everything text-safe.
CREATE POLICY "Users can view commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR SELECT
  TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
  );

CREATE POLICY "Users can insert commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
  );

CREATE POLICY "Users can update commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR UPDATE
  TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
  )
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
  );

CREATE POLICY "Users can delete commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR DELETE
  TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
  );
