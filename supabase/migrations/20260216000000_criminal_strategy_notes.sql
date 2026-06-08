-- Phase 5: Solicitor correction / instructions
-- Free-text field so solicitors can record "I disagree with this assessment" or "Client instructions: …".
ALTER TABLE criminal_cases
ADD COLUMN IF NOT EXISTS strategy_notes TEXT;

COMMENT ON COLUMN criminal_cases.strategy_notes IS 'Solicitor instructions or overrides that affect strategy (e.g. "I disagree with this assessment", "Client instructions: …"). Displayed with strategy so strategy can respect instructions.';
