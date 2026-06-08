-- Golden / bulk eval sweep results (org-scoped, sensitive — same RLS pattern as case_strategy_commitments)

CREATE TABLE IF NOT EXISTS public.eval_sweep_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  created_by TEXT,
  source TEXT NOT NULL DEFAULT 'golden' CHECK (source IN ('golden', 'defence_box')),
  question_labels JSONB,
  row_count INT NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eval_sweep_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.eval_sweep_runs(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL,
  case_title TEXT,
  question_no INT NOT NULL DEFAULT 1,
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  error TEXT,
  duration_ms INT,
  weak BOOLEAN,
  http_status INT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_eval_sweep_runs_org_created
  ON public.eval_sweep_runs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_sweep_rows_run
  ON public.eval_sweep_rows(run_id);

CREATE INDEX IF NOT EXISTS idx_eval_sweep_rows_org
  ON public.eval_sweep_rows(org_id);

ALTER TABLE public.eval_sweep_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eval_sweep_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_eval_sweep_runs ON public.eval_sweep_runs;
CREATE POLICY deny_anon_eval_sweep_runs
  ON public.eval_sweep_runs FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_eval_sweep_rows ON public.eval_sweep_rows;
CREATE POLICY deny_anon_eval_sweep_rows
  ON public.eval_sweep_rows FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Users can view eval sweeps in their org" ON public.eval_sweep_runs;
CREATE POLICY "Users can view eval sweeps in their org"
  ON public.eval_sweep_runs FOR SELECT TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Users can insert eval sweeps in their org" ON public.eval_sweep_runs;
CREATE POLICY "Users can insert eval sweeps in their org"
  ON public.eval_sweep_runs FOR INSERT TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Users can delete eval sweeps in their org" ON public.eval_sweep_runs;
CREATE POLICY "Users can delete eval sweeps in their org"
  ON public.eval_sweep_runs FOR DELETE TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Users can view eval sweep rows in their org" ON public.eval_sweep_rows;
CREATE POLICY "Users can view eval sweep rows in their org"
  ON public.eval_sweep_rows FOR SELECT TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Users can insert eval sweep rows in their org" ON public.eval_sweep_rows;
CREATE POLICY "Users can insert eval sweep rows in their org"
  ON public.eval_sweep_rows FOR INSERT TO authenticated
  WITH CHECK (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Users can delete eval sweep rows in their org" ON public.eval_sweep_rows;
CREATE POLICY "Users can delete eval sweep rows in their org"
  ON public.eval_sweep_rows FOR DELETE TO authenticated
  USING (
    org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
  );
