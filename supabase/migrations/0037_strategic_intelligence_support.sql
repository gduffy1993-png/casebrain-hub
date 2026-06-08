-- =============================================================================
-- Strategic Intelligence System Support
-- =============================================================================
-- Adds support for strategic intelligence features
-- 
-- This migration:
-- 1. Adds 'HEARING' category to deadlines table
-- 2. Ensures all required tables exist (timeline_events, bundles, letters)

-- =============================================================================
-- STEP 1: Add org_id column to deadlines if it doesn't exist
-- =============================================================================
DO $$ 
BEGIN
  -- Only proceed if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'deadlines'
  ) THEN
    -- Add org_id if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'org_id'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN org_id TEXT;
    END IF;
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Create deadlines table if it doesn't exist (with all columns)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'MANUAL',
  due_date TIMESTAMPTZ NOT NULL,
  days_remaining INTEGER,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  source TEXT NOT NULL DEFAULT 'MANUAL',
  source_rule TEXT,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  business_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- STEP 3: Add other missing columns to existing deadlines table
-- =============================================================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'deadlines'
  ) THEN
    -- Add category column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'category'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN category TEXT DEFAULT 'MANUAL';
      UPDATE public.deadlines SET category = 'MANUAL' WHERE category IS NULL;
      ALTER TABLE public.deadlines ALTER COLUMN category SET NOT NULL;
      ALTER TABLE public.deadlines ALTER COLUMN category SET DEFAULT 'MANUAL';
    END IF;

    -- Add other columns if missing (title, due_date, priority, status, severity, source)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'title'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN title TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'due_date'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN due_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'priority'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN priority TEXT DEFAULT 'MEDIUM';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'status'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN status TEXT DEFAULT 'UPCOMING';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'severity'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN severity TEXT DEFAULT 'MEDIUM';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'deadlines' 
      AND column_name = 'source'
    ) THEN
      ALTER TABLE public.deadlines ADD COLUMN source TEXT DEFAULT 'MANUAL';
    END IF;
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Drop and recreate constraint with HEARING category
-- =============================================================================
ALTER TABLE public.deadlines 
DROP CONSTRAINT IF EXISTS valid_category;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deadlines' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.deadlines 
    ADD CONSTRAINT valid_category CHECK (category IN (
      'COURT', 'HOUSING', 'LIMITATION', 'MANUAL', 'HEARING'
    ));
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Create indexes (only if columns exist)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_deadlines_case_id ON public.deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON public.deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_deadlines_status ON public.deadlines(status);
CREATE INDEX IF NOT EXISTS idx_deadlines_priority ON public.deadlines(priority);

-- Index on org_id (only create if column exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deadlines' 
    AND column_name = 'org_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_deadlines_org_id ON public.deadlines(org_id);
  END IF;
END $$;

-- Index on category (only create if column exists)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deadlines' 
    AND column_name = 'category'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_deadlines_category ON public.deadlines(category);
  END IF;
END $$;

-- =============================================================================
-- STEP 6: Create timeline_events table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON public.timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_org_id ON public.timeline_events(org_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_event_date ON public.timeline_events(event_date);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS timeline_events_org_access ON public.timeline_events;

CREATE POLICY timeline_events_org_access
ON public.timeline_events
FOR ALL
USING (org_id = current_setting('app.current_org_id', TRUE))
WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));

-- =============================================================================
-- STEP 7: Create bundles table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_case_id ON public.bundles(case_id);
CREATE INDEX IF NOT EXISTS idx_bundles_org_id ON public.bundles(org_id);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bundles_org_access ON public.bundles;

CREATE POLICY bundles_org_access
ON public.bundles
FOR ALL
USING (org_id = current_setting('app.current_org_id', TRUE))
WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));

-- =============================================================================
-- STEP 8: Create letters table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_letters_case_id ON public.letters(case_id);
CREATE INDEX IF NOT EXISTS idx_letters_org_id ON public.letters(org_id);
CREATE INDEX IF NOT EXISTS idx_letters_created_at ON public.letters(created_at);

ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS letters_org_access ON public.letters;

CREATE POLICY letters_org_access
ON public.letters
FOR ALL
USING (org_id = current_setting('app.current_org_id', TRUE))
WITH CHECK (org_id = current_setting('app.current_org_id', TRUE));

-- =============================================================================
-- Summary
-- =============================================================================
-- This migration ensures all tables required by the strategic intelligence
-- system exist and have the correct structure:
--
-- ✅ deadlines table: Added 'HEARING' category
-- ✅ timeline_events table: Created if missing
-- ✅ bundles table: Created if missing  
-- ✅ letters table: Created if missing
--
-- All tables have proper RLS policies for multi-tenant isolation.
