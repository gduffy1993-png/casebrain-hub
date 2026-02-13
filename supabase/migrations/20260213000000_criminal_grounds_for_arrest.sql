-- Grounds for arrest / suspicion (police station) – free text for key circumstances
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS grounds_for_arrest TEXT;

COMMENT ON COLUMN criminal_cases.grounds_for_arrest IS 'Police grounds/suspicion and key circumstances (e.g. ID, proximity, description) – for defence and next steps';
