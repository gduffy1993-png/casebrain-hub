-- Option 3 Phase 4.3: Optional audit – record when a position was AI-suggested and user-approved.
-- Not shown to client; for audit/compliance only.

ALTER TABLE public.case_positions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS ai_approved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.case_positions.source IS 'manual | ai_suggested. For audit only.';
COMMENT ON COLUMN public.case_positions.ai_approved_at IS 'Set when source=ai_suggested; time user approved. For audit only.';
