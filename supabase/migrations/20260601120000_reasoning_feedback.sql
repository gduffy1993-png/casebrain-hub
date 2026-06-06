-- =============================================================================
-- Reasoning feedback — solicitor marks on Reasoning V2 surfaces (metadata only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reasoning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  feedback_option TEXT NOT NULL,
  note TEXT,
  route_label TEXT,
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reasoning_feedback_surface_check CHECK (
    surface IN ('control-room-reasoning', 'war-room-reasoning')
  ),
  CONSTRAINT reasoning_feedback_option_check CHECK (
    feedback_option IN (
      'useful',
      'missed_key_issue',
      'too_vague',
      'unsafe_overconfident',
      'needs_solicitor_review',
      'good_enough_hearing_prep'
    )
  ),
  CONSTRAINT reasoning_feedback_note_length_check CHECK (
    note IS NULL OR char_length(note) <= 400
  ),
  CONSTRAINT reasoning_feedback_route_label_length_check CHECK (
    route_label IS NULL OR char_length(route_label) <= 240
  )
);

CREATE INDEX IF NOT EXISTS idx_reasoning_feedback_case_created
  ON public.reasoning_feedback (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reasoning_feedback_org_case
  ON public.reasoning_feedback (org_id, case_id, created_at DESC);

ALTER TABLE public.reasoning_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_reasoning_feedback ON public.reasoning_feedback;
CREATE POLICY deny_anon_all_reasoning_feedback
  ON public.reasoning_feedback
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can view reasoning feedback for cases in their org"
  ON public.reasoning_feedback
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

CREATE POLICY "Users can insert reasoning feedback for cases in their org"
  ON public.reasoning_feedback
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

COMMENT ON TABLE public.reasoning_feedback IS
  'Solicitor feedback marks on Reasoning V2 — safe metadata only; no bundle or evidence text.';
