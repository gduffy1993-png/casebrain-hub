-- =============================================================================
-- Add 'criminal' to practice_area standardization
-- Ensures criminal cases are properly recognized in the database
-- =============================================================================

-- Update any existing criminal case practice_area values to standardized 'criminal'
UPDATE cases 
SET practice_area = 'criminal' 
WHERE practice_area IN ('criminal', 'Criminal', 'criminal_law', 'Criminal Law', 'criminal_defense', 'defense');

-- Update the comment to include 'criminal'
COMMENT ON COLUMN cases.practice_area IS 'Practice area: housing_disrepair, personal_injury, clinical_negligence, family, criminal, other_litigation';

