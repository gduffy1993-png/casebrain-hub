-- =============================================================================
-- Trust feedback — H5 Feedback Console surfaces + extended kinds
-- =============================================================================

ALTER TABLE public.trust_feedback DROP CONSTRAINT IF EXISTS trust_feedback_tab_check;

ALTER TABLE public.trust_feedback ADD CONSTRAINT trust_feedback_tab_check CHECK (
  tab IN (
    'today',
    'chase',
    'summary',
    'five_answers',
    'hearing_mode',
    'export_pack',
    'evidence_trace',
    'decision_board',
    'advice_change_radar'
  )
);

ALTER TABLE public.trust_feedback DROP CONSTRAINT IF EXISTS trust_feedback_kind_check;

ALTER TABLE public.trust_feedback ADD CONSTRAINT trust_feedback_kind_check CHECK (
  feedback_kind IN (
    'wrong',
    'unclear',
    'unsafe',
    'useful',
    'missing_issue',
    'bad_source',
    'missing_evidence',
    'overstated',
    'needs_rewrite',
    'good_for_court',
    'good_for_cps_chase',
    'good_for_client_explanation'
  )
);

ALTER TABLE public.trust_feedback ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE public.trust_feedback ADD COLUMN IF NOT EXISTS section TEXT;
ALTER TABLE public.trust_feedback ADD COLUMN IF NOT EXISTS export_id TEXT;
ALTER TABLE public.trust_feedback ADD COLUMN IF NOT EXISTS export_type TEXT;

ALTER TABLE public.trust_feedback DROP CONSTRAINT IF EXISTS trust_feedback_severity_check;

ALTER TABLE public.trust_feedback ADD CONSTRAINT trust_feedback_severity_check CHECK (
  severity IS NULL OR severity IN ('polish', 'warning', 'blocking')
);

ALTER TABLE public.trust_feedback DROP CONSTRAINT IF EXISTS trust_feedback_section_length_check;

ALTER TABLE public.trust_feedback ADD CONSTRAINT trust_feedback_section_length_check CHECK (
  section IS NULL OR char_length(section) <= 120
);

ALTER TABLE public.trust_feedback DROP CONSTRAINT IF EXISTS trust_feedback_export_id_length_check;

ALTER TABLE public.trust_feedback ADD CONSTRAINT trust_feedback_export_id_length_check CHECK (
  export_id IS NULL OR char_length(export_id) <= 80
);
