-- =============================================================================
-- Paywall Usage: schema-safe plan migration
-- =============================================================================
-- Problem: existing DB may contain old plan values (FREE/LOCKED/PAID_*)
-- and/or new values (free/pro). Old CHECK constraint may reject new values.
-- Fix: drop old constraint safely, normalize values, re-add new constraint.
-- =============================================================================

-- 1) Ensure columns exist (your notices show they already do; keep safe anyway)
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS upload_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS export_count integer NOT NULL DEFAULT 0;

-- 2) Drop old plan constraint if it exists
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname
  INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'organisations'
    AND c.contype = 'c'
    AND c.conname = 'valid_plan';

  IF conname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.organisations DROP CONSTRAINT ' || quote_ident(conname);
  END IF;
END $$;

-- 3) Normalize existing plans to the new system
--    Old -> new:
--      PAID_MONTHLY/PAID_YEARLY -> pro
--      LOCKED/FREE/NULL -> free
--    Also normalize weird casing.
UPDATE public.organisations
SET plan = CASE
  WHEN plan IS NULL THEN 'free'
  WHEN lower(plan) IN ('paid_monthly','paid_yearly','pro') THEN 'pro'
  WHEN lower(plan) IN ('locked','free') THEN 'free'
  ELSE 'free'
END;

-- 4) Ensure default is new system
ALTER TABLE public.organisations
  ALTER COLUMN plan SET DEFAULT 'free';

-- 5) Re-add a new constraint that accepts the new values
--    (Optionally allow legacy values too so older inserts don’t crash.)
ALTER TABLE public.organisations
  ADD CONSTRAINT valid_plan CHECK (
    plan IN ('free','pro')
    OR plan IN ('FREE','LOCKED','PAID_MONTHLY','PAID_YEARLY') -- legacy tolerance
  );
