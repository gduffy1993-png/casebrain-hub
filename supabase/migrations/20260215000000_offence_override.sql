-- Allow user to override resolved offence (charges + matter + bundle) so strategy uses their choice.
-- Value should be one of: assault_oapa, robbery, theft, burglary, drugs, fraud, sexual, criminal_damage_arson, public_order, other.
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS offence_override TEXT;

COMMENT ON COLUMN criminal_cases.offence_override IS 'User override for resolved offence type (e.g. burglary, assault_oapa). When set, strategy and UI use this instead of auto-resolved offence. NULL = use auto resolution.';
