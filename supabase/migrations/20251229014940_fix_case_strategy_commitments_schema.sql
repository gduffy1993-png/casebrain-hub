-- =============================================================================
-- Fix Case Strategy Commitments schema (add missing columns expected by API/UI)
-- =============================================================================

-- 1) Add missing columns (schema-safe)
ALTER TABLE public.case_strategy_commitments
  ADD COLUMN IF NOT EXISTS primary_strategy TEXT,
  ADD COLUMN IF NOT EXISTS fallback_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS strategy_type TEXT,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Backfill: if older rows used "details" as primary, copy it across
UPDATE public.case_strategy_commitments
SET primary_strategy = COALESCE(primary_strategy, details)
WHERE primary_strategy IS NULL
  AND details IS NOT NULL
  AND btrim(details) <> '';

-- 3) Ensure fallback_strategies is never NULL
UPDATE public.case_strategy_commitments
SET fallback_strategies = '[]'::jsonb
WHERE fallback_strategies IS NULL;

-- 4) Useful index for "latest strategy for case"
CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_case_created_at
  ON public.case_strategy_commitments(case_id, created_at DESC);

-- 5) RLS policy hardening (avoid UUID/TEXT union type errors)
ALTER TABLE public.case_strategy_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view commitments for cases in their org" ON public.case_strategy_commitments;
DROP POLICY IF EXISTS "Users can insert commitments for cases in their org" ON public.case_strategy_commitments;
DROP POLICY IF EXISTS "Users can update commitments for cases in their org" ON public.case_strategy_commitments;
DROP POLICY IF EXISTS "Users can delete commitments for cases in their org" ON public.case_strategy_commitments;

-- Deny anon
DROP POLICY IF EXISTS deny_anon_all_case_strategy_commitments ON public.case_strategy_commitments;
CREATE POLICY deny_anon_all_case_strategy_commitments
  ON public.case_strategy_commitments
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Allow authenticated access by org_id matching either:
-- (a) app.current_org_id, OR
-- (b) user's org_id in public.users, OR
-- (c) solo workspace org_id = 'solo-user_' || auth.uid()
CREATE POLICY "Users can view commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR SELECT
  USING (
    org_id = current_setting('app.current_org_id', TRUE)
    OR org_id = ('solo-user_' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.org_id = public.case_strategy_commitments.org_id
    )
  );

CREATE POLICY "Users can insert commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR INSERT
  WITH CHECK (
    org_id = current_setting('app.current_org_id', TRUE)
    OR org_id = ('solo-user_' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.org_id = public.case_strategy_commitments.org_id
    )
  );

CREATE POLICY "Users can update commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR UPDATE
  USING (
    org_id = current_setting('app.current_org_id', TRUE)
    OR org_id = ('solo-user_' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.org_id = public.case_strategy_commitments.org_id
    )
  )
  WITH CHECK (
    org_id = current_setting('app.current_org_id', TRUE)
    OR org_id = ('solo-user_' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.org_id = public.case_strategy_commitments.org_id
    )
  );

CREATE POLICY "Users can delete commitments for cases in their org"
  ON public.case_strategy_commitments
  FOR DELETE
  USING (
    org_id = current_setting('app.current_org_id', TRUE)
    OR org_id = ('solo-user_' || auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text
        AND u.org_id = public.case_strategy_commitments.org_id
    )
  );
