-- =============================================================================
-- Supervisor sign-offs — human review actions on Supervisor QA (metadata only)
-- =============================================================================
-- Strategy: append-only rows. Latest sign-off per case:
--   SELECT * FROM supervisor_signoffs WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1;

CREATE TABLE IF NOT EXISTS public.supervisor_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  qa_status TEXT NOT NULL,
  reason_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  readiness_level TEXT,
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  evidence_change_status TEXT,
  note TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT supervisor_signoffs_status_check CHECK (
    status IN ('pending', 'reviewed', 'escalated', 'no_issue')
  ),
  CONSTRAINT supervisor_signoffs_qa_status_check CHECK (
    qa_status IN ('none', 'suggested', 'required')
  ),
  CONSTRAINT supervisor_signoffs_readiness_check CHECK (
    readiness_level IS NULL OR readiness_level IN ('green', 'amber', 'red')
  ),
  CONSTRAINT supervisor_signoffs_note_length_check CHECK (
    note IS NULL OR char_length(note) <= 400
  ),
  CONSTRAINT supervisor_signoffs_evidence_status_length_check CHECK (
    evidence_change_status IS NULL OR char_length(evidence_change_status) <= 280
  )
);

CREATE INDEX IF NOT EXISTS idx_supervisor_signoffs_case_created
  ON public.supervisor_signoffs (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_supervisor_signoffs_org_case
  ON public.supervisor_signoffs (org_id, case_id, created_at DESC);

ALTER TABLE public.supervisor_signoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_supervisor_signoffs ON public.supervisor_signoffs;
CREATE POLICY deny_anon_all_supervisor_signoffs
  ON public.supervisor_signoffs
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can view supervisor signoffs for cases in their org"
  ON public.supervisor_signoffs
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

CREATE POLICY "Users can insert supervisor signoffs for cases in their org"
  ON public.supervisor_signoffs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
    AND reviewer_id = auth.uid()::text
  );

COMMENT ON TABLE public.supervisor_signoffs IS
  'Append-only supervisor sign-off metadata — no bundle, evidence, or client account text.';
