-- =============================================================================
-- Evidence change snapshots — NECD safe metadata (append-only)
-- =============================================================================
-- Strategy: append-only rows. Latest snapshot per case:
--   SELECT * FROM evidence_change_snapshots WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1;

CREATE TABLE IF NOT EXISTS public.evidence_change_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  saved_by TEXT NOT NULL,
  route_label TEXT NOT NULL,
  readiness_level TEXT NOT NULL,
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  missing_material_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  contradiction_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_pressure_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  disclosure_chase_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  do_not_concede_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_instruction_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  safe_next_action TEXT,
  war_room_hearing_line TEXT,
  source_document_count INT,
  source_combined_text_length INT,
  source_snippet_count INT,
  source_bundle_availability_reason TEXT,
  source_matter_updated_marker TIMESTAMPTZ,
  app_version TEXT,
  schema_version TEXT NOT NULL DEFAULT 'evidence-change-v2',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evidence_change_snapshots_readiness_check CHECK (
    readiness_level IN ('green', 'amber', 'red')
  ),
  CONSTRAINT evidence_change_snapshots_route_label_length_check CHECK (
    char_length(route_label) <= 240
  ),
  CONSTRAINT evidence_change_snapshots_safe_next_action_length_check CHECK (
    safe_next_action IS NULL OR char_length(safe_next_action) <= 280
  ),
  CONSTRAINT evidence_change_snapshots_war_room_line_length_check CHECK (
    war_room_hearing_line IS NULL OR char_length(war_room_hearing_line) <= 280
  )
);

CREATE INDEX IF NOT EXISTS idx_evidence_change_snapshots_case_created
  ON public.evidence_change_snapshots (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_change_snapshots_org_case
  ON public.evidence_change_snapshots (org_id, case_id, created_at DESC);

ALTER TABLE public.evidence_change_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_evidence_change_snapshots ON public.evidence_change_snapshots;
CREATE POLICY deny_anon_all_evidence_change_snapshots
  ON public.evidence_change_snapshots
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can view evidence change snapshots for cases in their org"
  ON public.evidence_change_snapshots
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

CREATE POLICY "Users can insert evidence change snapshots for cases in their org"
  ON public.evidence_change_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text
        LIMIT 1)
    )
    AND saved_by = auth.uid()::text
  );

COMMENT ON TABLE public.evidence_change_snapshots IS
  'Append-only NECD snapshot metadata — label arrays and source counts only; no bundle or evidence text.';
