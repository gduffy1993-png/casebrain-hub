-- Phase 1: Police station Copilot additions (custody number, station name, client initials, representation, risk, initial disclosure)
-- Plan: docs/PLAN_POLICE_STATION_COPILOT_ADDITIONS.md

ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS custody_number TEXT,
  ADD COLUMN IF NOT EXISTS police_station_name TEXT,
  ADD COLUMN IF NOT EXISTS client_initials TEXT,
  ADD COLUMN IF NOT EXISTS client_yob INTEGER,
  ADD COLUMN IF NOT EXISTS representation_type TEXT,
  ADD COLUMN IF NOT EXISTS risk_appropriate_adult BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_interpreter BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_mental_health BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_medical_issues BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS initial_disclosure_received BOOLEAN,
  ADD COLUMN IF NOT EXISTS initial_disclosure_notes TEXT;

COMMENT ON COLUMN criminal_cases.custody_number IS 'Custody number (optional) – link to custody records';
COMMENT ON COLUMN criminal_cases.police_station_name IS 'Police station name/code (e.g. Bury, Middleton)';
COMMENT ON COLUMN criminal_cases.client_initials IS 'Client initials (e.g. AB) – non-PII';
COMMENT ON COLUMN criminal_cases.client_yob IS 'Client year of birth (e.g. 1990)';
COMMENT ON COLUMN criminal_cases.representation_type IS 'duty | own_client | telephone_only | attendance';
COMMENT ON COLUMN criminal_cases.initial_disclosure_received IS 'Initial disclosure at station: yes/no';
COMMENT ON COLUMN criminal_cases.initial_disclosure_notes IS 'Notes on initial disclosure (MG5, CCTV, etc.)';
