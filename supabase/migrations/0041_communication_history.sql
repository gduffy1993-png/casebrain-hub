-- =============================================================================
-- Communication History (SCHEMA-SAFE)
-- =============================================================================
-- Ensures communication_events exists with expected columns.
-- Adds missing columns if table already exists from older schema.
-- Creates indexes only when columns exist.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  case_id uuid,
  event_type text NOT NULL,
  direction text,
  subject text,
  body text,
  from_email text,
  to_email text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- If the table already existed, ensure expected columns exist
ALTER TABLE public.communication_events
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS case_id uuid,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS to_email text,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Backfill timestamps if null (safe)
UPDATE public.communication_events
SET occurred_at = COALESCE(occurred_at, created_at, now())
WHERE occurred_at IS NULL;

UPDATE public.communication_events
SET created_at = COALESCE(created_at, now())
WHERE created_at IS NULL;

-- Create indexes only if columns exist (schema-safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='communication_events' AND column_name='case_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_communication_events_case_id ON public.communication_events(case_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='communication_events' AND column_name='org_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_communication_events_org_id ON public.communication_events(org_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='communication_events' AND column_name='occurred_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_communication_events_occurred_at ON public.communication_events(occurred_at DESC)';
  END IF;
END $$;
