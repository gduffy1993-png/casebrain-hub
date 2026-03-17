-- Phase 1 Rebuild: store bundle-derived offence, stance, and stage so Strategy and Chat use evidence-driven state.
-- When set, these are the single source of truth (user can override offence via offence_override).

ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS offence_detected_code TEXT,
  ADD COLUMN IF NOT EXISTS offence_detected_label TEXT,
  ADD COLUMN IF NOT EXISTS stance_detected TEXT,
  ADD COLUMN IF NOT EXISTS stage_detected TEXT;

COMMENT ON COLUMN criminal_cases.offence_detected_code IS 'Phase 1: Offence code from bundle (e.g. s20_oapa, theft, criminal_damage_arson). Used by strategy when no override.';
COMMENT ON COLUMN criminal_cases.offence_detected_label IS 'Phase 1: Human-readable offence from charge (e.g. Section 20 GBH, Theft s.1). Acknowledge every case.';
COMMENT ON COLUMN criminal_cases.stance_detected IS 'Phase 1: Inferred defence stance from bundle (e.g. Intent Denial + Causation, Put to Proof).';
COMMENT ON COLUMN criminal_cases.stage_detected IS 'Phase 1: Procedural stage from disclosure (e.g. Disclosure outstanding – not ready for plea).';
