-- =============================================================================
-- Case Positions Table
-- =============================================================================
-- Stores recorded defence positions for criminal cases
-- Separate from strategy commitments - this is for free-text position recording

CREATE TABLE IF NOT EXISTS public.case_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  phase INT NOT NULL DEFAULT 1,
  position_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_positions_case_id_created_at ON public.case_positions(case_id, created_at DESC);

-- RLS
ALTER TABLE public.case_positions ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access
DROP POLICY IF EXISTS deny_anon_all_case_positions ON public.case_positions;
CREATE POLICY deny_anon_all_case_positions
  ON public.case_positions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Allow authenticated access by org_id matching either:
-- (a) app.current_org_id, OR
-- (b) user's org_id in public.users, OR
-- (c) solo workspace org_id = 'solo-user_' || auth.uid()
CREATE POLICY "Users can view positions for cases in their org"
  ON public.case_positions
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

CREATE POLICY "Users can insert positions for cases in their org"
  ON public.case_positions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
    AND user_id = auth.uid()::text
  );

CREATE POLICY "Users can update positions for cases in their org"
  ON public.case_positions
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

CREATE POLICY "Users can delete positions for cases in their org"
  ON public.case_positions
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

