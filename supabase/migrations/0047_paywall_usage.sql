-- ============================================================================
-- PAYWALL USAGE TRACKING
-- ============================================================================
-- Adds total usage counters and updates plan system to "free" | "pro"
-- This replaces monthly limits with lifetime total limits

-- ============================================================================
-- UPDATE ORGANISATIONS TABLE
-- ============================================================================

-- Add usage tracking columns (total lifetime counts)
ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS upload_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS analysis_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS export_count INTEGER NOT NULL DEFAULT 0;

-- Update plan constraint to support "free" and "pro"
-- First, migrate existing plan values
DO $$
BEGIN
  -- Migrate existing plans to new system
  UPDATE public.organisations
  SET plan = CASE
    WHEN plan IN ('PAID_MONTHLY', 'PAID_YEARLY') THEN 'pro'
    WHEN plan = 'LOCKED' THEN 'free'  -- LOCKED becomes free (they hit limits)
    ELSE 'free'  -- FREE becomes free
  END
  WHERE plan IS NOT NULL;
END $$;

-- Drop old constraint
ALTER TABLE public.organisations
DROP CONSTRAINT IF EXISTS valid_plan;

-- Add new constraint
ALTER TABLE public.organisations
ADD CONSTRAINT valid_plan CHECK (plan IN ('free', 'pro'));

-- Update default plan
ALTER TABLE public.organisations
ALTER COLUMN plan SET DEFAULT 'free';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organisations_plan ON public.organisations(plan);
CREATE INDEX IF NOT EXISTS idx_organisations_upload_count ON public.organisations(upload_count);
CREATE INDEX IF NOT EXISTS idx_organisations_analysis_count ON public.organisations(analysis_count);
CREATE INDEX IF NOT EXISTS idx_organisations_export_count ON public.organisations(export_count);

-- ============================================================================
-- HELPER FUNCTION: INCREMENT USAGE COUNTER
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage_counter(
  org_id_param UUID,
  counter_type TEXT
)
RETURNS VOID AS $$
BEGIN
  IF counter_type = 'upload' THEN
    UPDATE public.organisations
    SET upload_count = upload_count + 1
    WHERE id = org_id_param;
  ELSIF counter_type = 'analysis' THEN
    UPDATE public.organisations
    SET analysis_count = analysis_count + 1
    WHERE id = org_id_param;
  ELSIF counter_type = 'export' THEN
    UPDATE public.organisations
    SET export_count = export_count + 1
    WHERE id = org_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

