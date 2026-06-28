-- =============================================================================
-- Trust feedback — H3 solicitor marks on Today / Chase / Summary (metadata only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trust_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tab TEXT NOT NULL,
  feedback_kind TEXT NOT NULL,
  line_snippet TEXT,
  context_label TEXT,
  source_state TEXT,
  sendability TEXT,
  note TEXT,
  output_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trust_feedback_tab_check CHECK (tab IN ('today', 'chase', 'summary')),
  CONSTRAINT trust_feedback_kind_check CHECK (
    feedback_kind IN ('wrong', 'unclear', 'unsafe', 'useful', 'missing_issue', 'bad_source')
  ),
  CONSTRAINT trust_feedback_source_state_check CHECK (
    source_state IS NULL OR source_state IN (
      'served', 'referred_only', 'missing', 'not_safely_confirmed', 'provisional', 'needs_review'
    )
  ),
  CONSTRAINT trust_feedback_sendability_check CHECK (
    sendability IS NULL OR sendability IN (
      'safe_to_send', 'needs_solicitor_review', 'blocked', 'provisional_check_source'
    )
  ),
  CONSTRAINT trust_feedback_note_length_check CHECK (note IS NULL OR char_length(note) <= 400),
  CONSTRAINT trust_feedback_snippet_length_check CHECK (
    line_snippet IS NULL OR char_length(line_snippet) <= 280
  ),
  CONSTRAINT trust_feedback_context_label_length_check CHECK (
    context_label IS NULL OR char_length(context_label) <= 240
  )
);

CREATE INDEX IF NOT EXISTS idx_trust_feedback_case_created
  ON public.trust_feedback (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_feedback_org_case
  ON public.trust_feedback (org_id, case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_feedback_org_kind
  ON public.trust_feedback (org_id, feedback_kind, created_at DESC);

ALTER TABLE public.trust_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_trust_feedback ON public.trust_feedback;
CREATE POLICY deny_anon_all_trust_feedback
  ON public.trust_feedback
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can view trust feedback for cases in their org"
  ON public.trust_feedback
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

CREATE POLICY "Users can insert trust feedback for cases in their org"
  ON public.trust_feedback
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

COMMENT ON TABLE public.trust_feedback IS
  'H3 trust-layer solicitor feedback — safe metadata only; no bundle or evidence text; does not alter Brain output.';
