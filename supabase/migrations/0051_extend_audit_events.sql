-- =============================================================================
-- Extend case_audit_events for Evidence Memory and Incremental Updates
-- Schema-safe: works whether created_at / event_at / timestamp exists
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend valid_event_type constraint
-- ---------------------------------------------------------------------------

ALTER TABLE public.case_audit_events
  DROP CONSTRAINT IF EXISTS valid_event_type;

ALTER TABLE public.case_audit_events
  ADD CONSTRAINT valid_event_type CHECK (event_type IN (
    -- Existing
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

    -- Evidence memory
    'DOCS_ADDED',
    'EVIDENCE_CREATED',
    'EVIDENCE_STATUS_CHANGED',
    'REQUEST_DRAFTED',
    'CHASE_DRAFTED',
    'CHASE_MARKED_SENT',

    -- Incremental analysis
    'ANALYSIS_VERSION_CREATED',
    'RISK_CHANGED',

    -- Win stories
    'WIN_STORY_SNAPSHOT'
  ));

-- ---------------------------------------------------------------------------
-- 2. Ensure meta column exists
-- ---------------------------------------------------------------------------

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'case_audit_events'
      AND column_name = 'meta'
  ) THEN
    ALTER TABLE public.case_audit_events
      ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Added meta column to case_audit_events';
  END IF;
END;
$do$;

-- ---------------------------------------------------------------------------
-- 3. Case history index (schema-safe timestamp detection)
-- ---------------------------------------------------------------------------

DO $do$
BEGIN
  -- Prefer created_at
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'case_audit_events'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_case_audit_events_case_created
      ON public.case_audit_events(case_id, created_at DESC)
    ';
    RAISE NOTICE 'Index created using created_at';

  -- Fallback: event_at
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'case_audit_events'
      AND column_name = 'event_at'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_case_audit_events_case_created
      ON public.case_audit_events(case_id, event_at DESC)
    ';
    RAISE NOTICE 'Index created using event_at';

  -- Fallback: "timestamp"
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'case_audit_events'
      AND column_name = 'timestamp'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_case_audit_events_case_created
      ON public.case_audit_events(case_id, "timestamp" DESC)
    ';
    RAISE NOTICE 'Index created using timestamp';

  ELSE
    RAISE NOTICE 'No timestamp column found on case_audit_events — index skipped';
  END IF;
END;
$do$;
