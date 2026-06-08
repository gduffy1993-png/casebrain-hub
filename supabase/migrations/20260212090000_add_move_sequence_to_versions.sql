-- =============================================================================
-- Add move_sequence column to case_analysis_versions
-- Part of Move Sequencing Intelligence system
-- =============================================================================

ALTER TABLE public.case_analysis_versions 
ADD COLUMN IF NOT EXISTS move_sequence JSONB DEFAULT NULL;

-- Add index for move_sequence queries (optional, but helpful for filtering)
CREATE INDEX IF NOT EXISTS idx_case_analysis_versions_move_sequence 
ON public.case_analysis_versions(case_id) 
WHERE move_sequence IS NOT NULL;

