-- =============================================================================
-- SMS / WhatsApp (SCHEMA-SAFE)
-- =============================================================================
-- Ensures sms_messages exists with expected columns and indexes.
-- Some DBs may have an older sms_messages table missing sent_at.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  case_id uuid,
  provider text,
  direction text NOT NULL DEFAULT 'outbound',
  to_number text,
  from_number text,
  body text,
  status text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- If table already exists, add missing columns
ALTER TABLE public.sms_messages
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS case_id uuid,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS to_number text,
  ADD COLUMN IF NOT EXISTS from_number text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Backfill sent_at if missing (best-effort)
UPDATE public.sms_messages
SET sent_at = COALESCE(sent_at, created_at, now())
WHERE sent_at IS NULL;

-- Indexes only if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sms_messages' AND column_name='org_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_messages_org_id ON public.sms_messages(org_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sms_messages' AND column_name='case_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_messages_case_id ON public.sms_messages(case_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sms_messages' AND column_name='sent_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON public.sms_messages(sent_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sms_messages' AND column_name='created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON public.sms_messages(created_at DESC)';
  END IF;
END $$;
