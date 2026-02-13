-- Hearings first-class: whats_needed_next, extended hearing types (PTPH, PCMH, Mention)
-- Plan: docs/PLAN_AI_STRATEGY_HERO_AND_CONVERSATION.md step 11

ALTER TABLE criminal_hearings
  ADD COLUMN IF NOT EXISTS whats_needed_next TEXT;

COMMENT ON COLUMN criminal_hearings.whats_needed_next IS 'What is needed for the next hearing (e.g. disclosure, defence statement, trial bundle)';

-- Extend hearing_type to include PTPH, PCMH, Mention
ALTER TABLE criminal_hearings DROP CONSTRAINT IF EXISTS criminal_hearings_hearing_type_check;

ALTER TABLE criminal_hearings
  ADD CONSTRAINT criminal_hearings_hearing_type_check
  CHECK (hearing_type IN (
    'First Hearing', 'Plea Hearing', 'Case Management', 'Trial', 'Sentencing',
    'Appeal', 'Bail Review', 'PTPH', 'PCMH', 'Mention'
  ));
