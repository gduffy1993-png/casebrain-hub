-- Matter state / lifecycle, police station, and bail extensions for criminal cases
-- Plan: docs/PLAN_AI_STRATEGY_HERO_AND_CONVERSATION.md

-- Matter state: drives default tab and available actions
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS matter_state TEXT;

COMMENT ON COLUMN criminal_cases.matter_state IS 'Lifecycle: at_station | bailed | rui | charged | before_first_hearing | before_ptph | before_trial | trial | sentencing | disposed';

-- Police station
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS time_in_custody_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_pace_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interview_stance TEXT,
  ADD COLUMN IF NOT EXISTS station_summary TEXT;

COMMENT ON COLUMN criminal_cases.interview_stance IS 'no_comment | prepared_statement | answered';

-- Bail extensions (bail_return_date, outcome at return)
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS bail_return_date DATE,
  ADD COLUMN IF NOT EXISTS bail_outcome TEXT;

COMMENT ON COLUMN criminal_cases.bail_outcome IS 'At return: extended_bail | rui | nfa | charged';

-- Matter closed / NFA
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS matter_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS matter_closed_reason TEXT;
