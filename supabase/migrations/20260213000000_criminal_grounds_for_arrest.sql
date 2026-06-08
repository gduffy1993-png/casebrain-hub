-- Grounds for arrest / suspicion (police station) – free text for key circumstances
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS grounds_for_arrest TEXT;

COMMENT ON COLUMN criminal_cases.grounds_for_arrest IS 'Police grounds/suspicion and key circumstances (e.g. ID, proximity, description) – for defence and next steps';

-- Date of arrest and offence alleged (at station, before charge)
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS date_of_arrest DATE,
  ADD COLUMN IF NOT EXISTS alleged_offence TEXT;

COMMENT ON COLUMN criminal_cases.date_of_arrest IS 'Date of arrest (police station matters)';
COMMENT ON COLUMN criminal_cases.alleged_offence IS 'Offence suspected / alleged at station (e.g. armed robbery)';
