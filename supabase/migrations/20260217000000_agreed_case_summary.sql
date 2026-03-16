-- V2: Agreed case summary and case theory line (canonical for Summary tab, Strategy, and chat grounding)
ALTER TABLE criminal_cases
  ADD COLUMN IF NOT EXISTS agreed_summary_short TEXT,
  ADD COLUMN IF NOT EXISTS agreed_summary_detailed TEXT,
  ADD COLUMN IF NOT EXISTS agreed_summary_full TEXT,
  ADD COLUMN IF NOT EXISTS case_theory_line TEXT;

COMMENT ON COLUMN criminal_cases.agreed_summary_short IS 'V2: One-paragraph agreed summary for dashboard and best way to fight';
COMMENT ON COLUMN criminal_cases.agreed_summary_detailed IS 'V2: 2–3 paragraph agreed summary for chat grounding and strategy';
COMMENT ON COLUMN criminal_cases.agreed_summary_full IS 'V2: Full agreed summary for internal/counsel use';
COMMENT ON COLUMN criminal_cases.case_theory_line IS 'V2: One-sentence case theory (Prosecution say X; we say Y; best angle Z)';
