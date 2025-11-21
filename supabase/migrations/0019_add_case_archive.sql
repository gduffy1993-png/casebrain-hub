-- Add archive support to cases table
-- This allows soft-deleting cases without losing audit trail

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS cases_is_archived_idx ON public.cases (is_archived);

COMMENT ON COLUMN public.cases.is_archived IS 'Soft delete flag - archived cases are excluded from normal views but kept in DB';
COMMENT ON COLUMN public.cases.archived_at IS 'Timestamp when case was archived';

