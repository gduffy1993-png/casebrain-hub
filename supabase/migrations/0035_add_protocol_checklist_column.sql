-- =============================================================================
-- Migration: Add protocol_checklist column to cases table
-- =============================================================================
-- Stores protocol checklist completion state as JSON

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS protocol_checklist jsonb DEFAULT '{}'::jsonb;

-- Index for querying cases with incomplete protocol checklists
CREATE INDEX IF NOT EXISTS cases_protocol_checklist_idx ON public.cases 
USING gin (protocol_checklist) 
WHERE protocol_checklist IS NOT NULL;

COMMENT ON COLUMN public.cases.protocol_checklist IS 'Stores pre-action protocol checklist completion state as JSON: { "itemId": true/false }';
