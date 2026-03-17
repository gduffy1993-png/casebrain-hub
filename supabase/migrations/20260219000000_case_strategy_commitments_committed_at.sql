-- Single source of truth: case_strategy_commitments.committed_at
-- Used by getCaseStateSnapshot() and strategy-commitment API. When the user commits a strategy,
-- we store the timestamp so Chat/Strategy can show "committed at ...".

ALTER TABLE public.case_strategy_commitments
  ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.case_strategy_commitments.committed_at IS 'When the user committed this strategy (single source of truth for "strategy committed at").';

-- Backfill existing rows: use created_at so snapshot/UI have a sensible value
UPDATE public.case_strategy_commitments
SET committed_at = created_at
WHERE committed_at IS NULL;
