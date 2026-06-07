-- =============================================================================
-- Export reviews — safe metadata for solicitor export drafts (append-only)
-- =============================================================================
-- Strategy: append-only rows. Latest review per case/type:
--   SELECT * FROM export_reviews WHERE case_id = $1 AND export_type = $2
--   ORDER BY created_at DESC LIMIT 1;

CREATE TABLE IF NOT EXISTS public.export_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  review_status TEXT NOT NULL,
  route_label TEXT,
  readiness_level TEXT,
  human_review_required BOOLEAN NOT NULL DEFAULT false,
  solicitor_review_required BOOLEAN NOT NULL DEFAULT true,
  export_hash TEXT,
  note TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT export_reviews_export_type_check CHECK (
    export_type IN ('disclosure_chase', 'hearing_prep', 'case_handover', 'client_explanation')
  ),
  CONSTRAINT export_reviews_review_status_check CHECK (
    review_status IN ('generated', 'copied', 'reviewed', 'needs_review', 'superseded')
  ),
  CONSTRAINT export_reviews_readiness_check CHECK (
    readiness_level IS NULL OR readiness_level IN ('green', 'amber', 'red')
  ),
  CONSTRAINT export_reviews_route_label_length_check CHECK (
    route_label IS NULL OR char_length(route_label) <= 240
  ),
  CONSTRAINT export_reviews_note_length_check CHECK (
    note IS NULL OR char_length(note) <= 400
  ),
  CONSTRAINT export_reviews_export_hash_format_check CHECK (
    export_hash IS NULL OR export_hash ~ '^[a-f0-9]{64}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_export_reviews_case_created
  ON public.export_reviews (case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_reviews_case_type_created
  ON public.export_reviews (case_id, export_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_reviews_org_case
  ON public.export_reviews (org_id, case_id, created_at DESC);

ALTER TABLE public.export_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_export_reviews ON public.export_reviews;
CREATE POLICY deny_anon_all_export_reviews
  ON public.export_reviews
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Users can view export reviews for cases in their org"
  ON public.export_reviews
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

CREATE POLICY "Users can insert export reviews for cases in their org"
  ON public.export_reviews
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

COMMENT ON TABLE public.export_reviews IS
  'Append-only export review metadata — hash and labels only; no export body or evidence text.';
