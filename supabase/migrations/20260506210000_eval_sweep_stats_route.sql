-- Extra diagnostics for eval sweeps (route path + aggregate stats)

ALTER TABLE public.eval_sweep_runs ADD COLUMN IF NOT EXISTS summary_stats JSONB;

ALTER TABLE public.eval_sweep_rows ADD COLUMN IF NOT EXISTS route_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_eval_sweep_rows_route ON public.eval_sweep_rows(route_tag)
  WHERE route_tag IS NOT NULL;
