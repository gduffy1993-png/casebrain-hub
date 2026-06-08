-- Row-level JSON for eval observability (route_trace, grounding_metrics, fingerprints).
ALTER TABLE public.eval_sweep_rows ADD COLUMN IF NOT EXISTS row_meta JSONB;

COMMENT ON COLUMN public.eval_sweep_rows.row_meta IS 'Optional eval_meta / observability payload from defence-plan-chat (v1).';
