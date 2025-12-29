-- ============================================================================
-- PATCH: Case Strategy Commitments (missing columns)
-- ============================================================================

ALTER TABLE public.case_strategy_commitments
  ADD COLUMN IF NOT EXISTS primary_strategy TEXT,
  ADD COLUMN IF NOT EXISTS fallback_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS strategy_type TEXT,
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill old rows (details -> primary_strategy)
UPDATE public.case_strategy_commitments
SET primary_strategy = details
WHERE primary_strategy IS NULL
  AND details IS NOT NULL
  AND btrim(details) <> '';

-- Ensure fallback_strategies never null
UPDATE public.case_strategy_commitments
SET fallback_strategies = '[]'::jsonb
WHERE fallback_strategies IS NULL;

-- Index for latest strategy lookup
CREATE INDEX IF NOT EXISTS idx_case_strategy_commitments_latest
  ON public.case_strategy_commitments(case_id, created_at DESC);
