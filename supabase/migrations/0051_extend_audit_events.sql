-- =============================================================================
-- Extend case_audit_events for Evidence Memory and Incremental Updates
-- Adds new event types and ensures proper indexing
-- =============================================================================

-- Drop existing constraint to allow new event types
ALTER TABLE public.case_audit_events
  DROP CONSTRAINT IF EXISTS valid_event_type;

-- Recreate constraint with extended event types
ALTER TABLE public.case_audit_events
  ADD CONSTRAINT valid_event_type CHECK (event_type IN (
    -- Existing event types
    'UPLOAD_STARTED',
    'UPLOAD_COMPLETED',
    'EXTRACTION_STARTED',
    'EXTRACTION_COMPLETED',
    'ANALYSIS_GENERATED',
    'ANALYSIS_REGENERATED',
    'SUPERVISOR_REVIEWED',
    'OVERVIEW_PDF_EXPORTED',
    'DOCUMENT_VIEWED',
    'DOCUMENT_DELETED',
    'CASE_ARCHIVED',
    'CASE_RESTORED',
    'CASE_DELETED',
    'AI_ERROR',
    'SYSTEM_ERROR',
    -- New event types for Evidence Memory
    'DOCS_ADDED',
    'EVIDENCE_CREATED',
    'EVIDENCE_STATUS_CHANGED',
    'REQUEST_DRAFTED',
    'CHASE_DRAFTED',
    'CHASE_MARKED_SENT',
    -- New event types for Incremental Updates
    'ANALYSIS_VERSION_CREATED',
    'RISK_CHANGED',
    -- New event types for Win Stories
    'WIN_STORY_SNAPSHOT'
  ));

-- Ensure meta field exists (should already exist, but make sure)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'case_audit_events'
    AND column_name = 'meta'
  ) THEN
    ALTER TABLE public.case_audit_events ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add index for case_id + created_at (for efficient history queries)
CREATE INDEX IF NOT EXISTS idx_case_audit_events_case_created 
  ON public.case_audit_events(case_id, created_at DESC);

-- Add optional summary field for faster queries (one-line summary)
-- This is optional and can be added later if needed for performance
-- For now, we'll use meta JSONB for all details

