-- =============================================================================
-- Criminal Law System - Database Schema
-- =============================================================================
-- Creates tables and columns for criminal case management, evidence tracking,
-- PACE compliance, disclosure, bail, and defense strategies.

-- =============================================================================
-- Criminal Cases Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS criminal_cases (
  id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Defendant Information
  defendant_name TEXT,
  defendant_dob DATE,
  defendant_address TEXT,
  
  -- Court Information
  court_type TEXT CHECK (court_type IN ('Crown Court', 'Magistrates Court')),
  court_name TEXT,
  next_hearing_date TIMESTAMPTZ,
  next_hearing_type TEXT CHECK (next_hearing_type IN ('First Hearing', 'Plea Hearing', 'Trial', 'Sentencing', 'Case Management')),
  
  -- Bail & Custody
  bail_status TEXT CHECK (bail_status IN ('bailed', 'remanded', 'police_bail')),
  bail_conditions TEXT[], -- Array of conditions like ['curfew', 'reporting', 'no_contact']
  next_bail_review TIMESTAMPTZ,
  remand_time_hours INTEGER,
  
  -- Plea
  plea TEXT CHECK (plea IN ('not_guilty', 'guilty', 'no_plea')),
  plea_date TIMESTAMPTZ,
  
  -- Defense Strategy
  recommended_strategy TEXT,
  get_off_probability INTEGER CHECK (get_off_probability >= 0 AND get_off_probability <= 100),
  risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Criminal Charges Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS criminal_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  offence TEXT NOT NULL,
  section TEXT, -- e.g. "s.1 Theft Act 1968"
  charge_date DATE,
  location TEXT,
  value NUMERIC, -- For theft/fraud cases
  details TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'proceeding', 'dismissed', 'convicted', 'acquitted')) DEFAULT 'pending',
  
  -- Sentencing (if convicted)
  sentence_months INTEGER,
  sentence_type TEXT CHECK (sentence_type IN ('custodial', 'community', 'fine', 'discharge')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Criminal Evidence Table (Prosecution & Defense)
-- =============================================================================
CREATE TABLE IF NOT EXISTS criminal_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Evidence Type
  side TEXT NOT NULL CHECK (side IN ('prosecution', 'defense')),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('witness_statement', 'CCTV', 'forensic', 'police_statement', 'confession', 'alibi', 'character', 'expert', 'other')),
  
  -- Details
  title TEXT NOT NULL,
  description TEXT,
  witness_name TEXT,
  date DATE,
  location TEXT,
  
  -- Assessment
  credibility TEXT CHECK (credibility IN ('high', 'medium', 'low')),
  strength_score INTEGER CHECK (strength_score >= 0 AND strength_score <= 100),
  issues TEXT[], -- Array of issues like ['distance', 'lighting', 'chain_of_custody']
  
  -- Chain of Custody (for forensic evidence)
  chain_of_custody_complete BOOLEAN DEFAULT true,
  chain_of_custody_notes TEXT,
  
  -- File/Document Reference
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PACE Compliance Tracker
-- =============================================================================
CREATE TABLE IF NOT EXISTS pace_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- PACE Requirements
  caution_given BOOLEAN,
  caution_given_before_questioning BOOLEAN,
  interview_recorded BOOLEAN,
  right_to_solicitor BOOLEAN,
  solicitor_present BOOLEAN,
  
  -- Detention
  arrest_date TIMESTAMPTZ,
  detention_start TIMESTAMPTZ,
  detention_end TIMESTAMPTZ,
  detention_time_hours INTEGER,
  detention_time_exceeded BOOLEAN DEFAULT false,
  
  -- Search & Seizure
  search_warrant BOOLEAN,
  search_proper_authority BOOLEAN,
  evidence_properly_seized BOOLEAN,
  
  -- Breaches Detected
  breaches_detected TEXT[], -- Array of breach types
  breach_severity TEXT CHECK (breach_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  breach_impact TEXT, -- Description of impact
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(case_id) -- One PACE record per case
);

-- =============================================================================
-- Disclosure Tracker
-- =============================================================================
CREATE TABLE IF NOT EXISTS disclosure_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Disclosure Status
  initial_disclosure_received BOOLEAN DEFAULT false,
  initial_disclosure_date DATE,
  full_disclosure_received BOOLEAN DEFAULT false,
  full_disclosure_date DATE,
  
  -- Missing Items
  missing_items TEXT[], -- Array like ['CCTV', 'witness_statements', 'expert_reports']
  
  -- Requests
  disclosure_requested BOOLEAN DEFAULT false,
  disclosure_request_date DATE,
  disclosure_deadline DATE,
  
  -- Issues
  late_disclosure BOOLEAN DEFAULT false,
  incomplete_disclosure BOOLEAN DEFAULT false,
  disclosure_issues TEXT[], -- Array of issues
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(case_id) -- One disclosure tracker per case
);

-- =============================================================================
-- Loopholes & Weaknesses
-- =============================================================================
CREATE TABLE IF NOT EXISTS criminal_loopholes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Loophole Details
  loophole_type TEXT NOT NULL CHECK (loophole_type IN ('PACE_breach', 'procedural_error', 'evidence_weakness', 'disclosure_failure', 'identification_issue', 'contradiction', 'missing_evidence', 'chain_of_custody', 'hearsay', 'bad_character')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Assessment
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  exploitability TEXT CHECK (exploitability IN ('low', 'medium', 'high')),
  success_probability INTEGER CHECK (success_probability >= 0 AND success_probability <= 100),
  
  -- Suggested Action
  suggested_action TEXT,
  legal_argument TEXT, -- Ready-to-use legal argument
  
  -- Status
  status TEXT CHECK (status IN ('identified', 'exploiting', 'exploited', 'dismissed')) DEFAULT 'identified',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Defense Strategies
-- =============================================================================
CREATE TABLE IF NOT EXISTS defense_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Strategy Details
  strategy_name TEXT NOT NULL,
  strategy_type TEXT NOT NULL CHECK (strategy_type IN ('PACE_breach', 'evidence_challenge', 'disclosure_failure', 'alibi_defense', 'technical_defense', 'partial_plea', 'mitigation')),
  description TEXT NOT NULL,
  
  -- Success Metrics
  success_probability INTEGER NOT NULL CHECK (success_probability >= 0 AND success_probability <= 100),
  impact TEXT CHECK (impact IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  
  -- Legal Arguments
  legal_argument TEXT, -- Ready-to-use argument
  precedent_cases TEXT[], -- Array of case references
  
  -- Actions Required
  actions_required TEXT[], -- Array of action items
  
  -- Status
  status TEXT CHECK (status IN ('suggested', 'adopted', 'executing', 'completed', 'dismissed')) DEFAULT 'suggested',
  selected BOOLEAN DEFAULT false, -- Is this the chosen strategy?
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Court Hearings
-- =============================================================================
CREATE TABLE IF NOT EXISTS criminal_hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  
  -- Hearing Details
  hearing_type TEXT NOT NULL CHECK (hearing_type IN ('First Hearing', 'Plea Hearing', 'Case Management', 'Trial', 'Sentencing', 'Appeal', 'Bail Review')),
  hearing_date TIMESTAMPTZ NOT NULL,
  court_name TEXT,
  court_location TEXT,
  
  -- Outcomes
  outcome TEXT,
  notes TEXT,
  
  -- Attendance
  solicitor_attended BOOLEAN DEFAULT false,
  client_attended BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_criminal_cases_org ON criminal_cases(org_id);
CREATE INDEX IF NOT EXISTS idx_criminal_cases_court_date ON criminal_cases(next_hearing_date);

CREATE INDEX IF NOT EXISTS idx_criminal_charges_case ON criminal_charges(case_id);
CREATE INDEX IF NOT EXISTS idx_criminal_charges_org ON criminal_charges(org_id);

CREATE INDEX IF NOT EXISTS idx_criminal_evidence_case ON criminal_evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_criminal_evidence_org ON criminal_evidence(org_id);
CREATE INDEX IF NOT EXISTS idx_criminal_evidence_side ON criminal_evidence(side);

CREATE INDEX IF NOT EXISTS idx_pace_compliance_case ON pace_compliance(case_id);
CREATE INDEX IF NOT EXISTS idx_pace_compliance_org ON pace_compliance(org_id);

CREATE INDEX IF NOT EXISTS idx_disclosure_tracker_case ON disclosure_tracker(case_id);
CREATE INDEX IF NOT EXISTS idx_disclosure_tracker_org ON disclosure_tracker(org_id);

CREATE INDEX IF NOT EXISTS idx_criminal_loopholes_case ON criminal_loopholes(case_id);
CREATE INDEX IF NOT EXISTS idx_criminal_loopholes_org ON criminal_loopholes(org_id);
CREATE INDEX IF NOT EXISTS idx_criminal_loopholes_severity ON criminal_loopholes(severity);

CREATE INDEX IF NOT EXISTS idx_defense_strategies_case ON defense_strategies(case_id);
CREATE INDEX IF NOT EXISTS idx_defense_strategies_org ON defense_strategies(org_id);
CREATE INDEX IF NOT EXISTS idx_defense_strategies_selected ON defense_strategies(selected);

CREATE INDEX IF NOT EXISTS idx_criminal_hearings_case ON criminal_hearings(case_id);
CREATE INDEX IF NOT EXISTS idx_criminal_hearings_org ON criminal_hearings(org_id);
CREATE INDEX IF NOT EXISTS idx_criminal_hearings_date ON criminal_hearings(hearing_date);

-- =============================================================================
-- RLS Policies
-- =============================================================================
ALTER TABLE criminal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE pace_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE disclosure_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_loopholes ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE criminal_hearings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their organisation's data
CREATE POLICY "Users can view their org's criminal cases" ON criminal_cases
  FOR SELECT USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can insert their org's criminal cases" ON criminal_cases
  FOR INSERT WITH CHECK (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can update their org's criminal cases" ON criminal_cases
  FOR UPDATE USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

-- Similar policies for all other tables
CREATE POLICY "Users can manage their org's criminal charges" ON criminal_charges
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their org's criminal evidence" ON criminal_evidence
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their org's PACE compliance" ON pace_compliance
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their org's disclosure tracker" ON disclosure_tracker
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their org's criminal loopholes" ON criminal_loopholes
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their org's defense strategies" ON defense_strategies
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage their org's criminal hearings" ON criminal_hearings
  FOR ALL USING (org_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()::text));

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_criminal_cases_updated_at BEFORE UPDATE ON criminal_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criminal_charges_updated_at BEFORE UPDATE ON criminal_charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criminal_evidence_updated_at BEFORE UPDATE ON criminal_evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pace_compliance_updated_at BEFORE UPDATE ON pace_compliance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disclosure_tracker_updated_at BEFORE UPDATE ON disclosure_tracker
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criminal_loopholes_updated_at BEFORE UPDATE ON criminal_loopholes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_defense_strategies_updated_at BEFORE UPDATE ON defense_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_criminal_hearings_updated_at BEFORE UPDATE ON criminal_hearings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

