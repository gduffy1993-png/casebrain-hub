-- Optional internal eval pack tagging (orchestration / reporting; does not affect normal case behaviour)

ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS eval_pack_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS eval_pack_name TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS eval_case_no INT;

COMMENT ON COLUMN public.cases.eval_pack_id IS 'Eval harness pack id A–J when case is part of regression corpus; null for normal matters.';
COMMENT ON COLUMN public.cases.eval_pack_name IS 'Human-readable pack label for dashboards.';
COMMENT ON COLUMN public.cases.eval_case_no IS 'Optional ordinal within a pack (e.g. Case 12 of 40).';

CREATE INDEX IF NOT EXISTS idx_cases_org_eval_pack
  ON public.cases (org_id, eval_pack_id)
  WHERE eval_pack_id IS NOT NULL AND is_archived = false;
