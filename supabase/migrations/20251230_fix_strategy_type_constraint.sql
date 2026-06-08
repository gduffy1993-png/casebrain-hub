-- =============================================================================
-- Fix valid_strategy_type constraint for case_strategy_commitments
-- =============================================================================
-- The constraint currently only allows old defense_strategies values.
-- We need to allow the new commitment strategy types: fight_charge, charge_reduction, outcome_management

-- Drop the old constraint if it exists
ALTER TABLE public.case_strategy_commitments
  DROP CONSTRAINT IF EXISTS valid_strategy_type;

-- Add new constraint that allows both old and new strategy types
ALTER TABLE public.case_strategy_commitments
  ADD CONSTRAINT valid_strategy_type CHECK (
    strategy_type IS NULL 
    OR strategy_type IN (
      -- Old defense strategy types (for backward compatibility)
      'PACE_breach',
      'evidence_challenge',
      'disclosure_failure',
      'alibi_defense',
      'technical_defense',
      'partial_plea',
      'mitigation',
      -- New commitment strategy types
      'fight_charge',
      'charge_reduction',
      'outcome_management'
    )
  );

