-- Standardize practice_area values across the cases table
-- Maps legacy values to new standardized values

-- First, ensure the column exists
ALTER TABLE cases ADD COLUMN IF NOT EXISTS practice_area TEXT DEFAULT 'other_litigation';

-- Update legacy values to standardized values
UPDATE cases SET practice_area = 'housing_disrepair' 
WHERE practice_area IN ('housing', 'Housing', 'housing_disrepair', 'Housing Disrepair');

UPDATE cases SET practice_area = 'personal_injury' 
WHERE practice_area IN ('pi', 'PI', 'pi_rta', 'pi_general', 'personal_injury', 'Personal Injury', 'RTA', 'rta');

UPDATE cases SET practice_area = 'clinical_negligence' 
WHERE practice_area IN ('clin_neg', 'clinical', 'Clinical Negligence', 'clinical_negligence', 'medical_negligence');

UPDATE cases SET practice_area = 'family' 
WHERE practice_area IN ('family', 'Family', 'family_law', 'matrimonial', 'children', 'financial_remedy');

UPDATE cases SET practice_area = 'other_litigation' 
WHERE practice_area IS NULL OR practice_area NOT IN (
  'housing_disrepair', 'personal_injury', 'clinical_negligence', 'family', 'other_litigation'
);

-- Add comment for documentation
COMMENT ON COLUMN cases.practice_area IS 'Practice area: housing_disrepair, personal_injury, clinical_negligence, family, other_litigation';

