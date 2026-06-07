-- =============================================================================
-- Case review audit events — append-only safe metadata trail
-- =============================================================================
-- Strategy: append-only rows. Latest events per case:
--   SELECT * FROM case_review_audit_events WHERE case_id = $1 ORDER BY created_at DESC;

CREATE TABLE IF NOT EXISTS public.case_review_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_surface TEXT,
  safe_label TEXT NOT NULL,
  related_record_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_review_audit_events_event_type_check CHECK (
    event_type IN (
      'reasoning_feedback_saved',
      'supervisor_signoff_saved',
      'evidence_snapshot_saved',
      'export_review_saved',
      'export_generated',
      'export_copied',
      'export_marked_reviewed',
      'export_marked_needs_review',
      'material_change_reviewed',
      'supervisor_escalated',
      'supervisor_marked_reviewed'
    )
  ),
  CONSTRAINT case_review_audit_events_source_surface_check CHECK (
    source_surface IS NULL OR source_surface IN (
      'control_room',
      'war_room',
      'reasoning_v2',
      'evidence_change_detector',
      'supervisor_qa',
      'solicitor_export_builder',
      'client_explanation'
    )
  ),
  CONSTRAINT case_review_audit_events_safe_label_length_check CHECK (
    char_length(safe_label) <= 280
  )
);

CREATE INDEX IF NOT EXISTS idx_case_review_audit_events_case_created
  ON public.case_review_audit_events (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_review_audit_events_org_case_created
  ON public.case_review_audit_events (org_id, case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_review_audit_events_org_type_created
  ON public.case_review_audit_events (org_id, event_type, created_at DESC);

ALTER TABLE public.case_review_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_case_review_audit_events ON public.case_review_audit_events;
CREATE POLICY deny_anon_all_case_review_audit_events
  ON public.case_review_audit_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can view case review audit events for cases in their org"
  ON public.case_review_audit_events
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

CREATE POLICY "Users can insert case review audit events for cases in their org"
  ON public.case_review_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
    AND actor_id = auth.uid()::text
  );

COMMENT ON TABLE public.case_review_audit_events IS
  'Append-only review workflow audit metadata — safe labels and enums only; no bundle or export bodies.';
