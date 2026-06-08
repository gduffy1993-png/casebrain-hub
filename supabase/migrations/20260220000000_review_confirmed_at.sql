-- Unified Review & Confirm: user completes one screen before full case workspace.
ALTER TABLE public.criminal_cases
  ADD COLUMN IF NOT EXISTS review_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.criminal_cases.review_confirmed_at IS 'Set when user completes Review & Confirm; null = show review gate first.';

-- Grandfather: cases that already committed strategy or recorded position skip the gate once.
UPDATE public.criminal_cases cc
SET review_confirmed_at = COALESCE(cc.review_confirmed_at, sub.m)
FROM (
  SELECT case_id, MAX(COALESCE(committed_at, created_at)) AS m
  FROM public.case_strategy_commitments
  GROUP BY case_id
) sub
WHERE cc.id = sub.case_id AND cc.review_confirmed_at IS NULL;

UPDATE public.criminal_cases cc
SET review_confirmed_at = COALESCE(cc.review_confirmed_at, cp.latest)
FROM (
  SELECT case_id, MAX(created_at) AS latest
  FROM public.case_positions
  GROUP BY case_id
) cp
WHERE cc.id = cp.case_id AND cc.review_confirmed_at IS NULL;
