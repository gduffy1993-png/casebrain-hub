-- ============================================================================
-- WIP RECOVERY OPTIMIZER & OPPONENT BEHAVIOR PROFILER
-- ============================================================================
-- Database schema for WIP recovery tracking and opponent behavior profiling

-- ============================================================================
-- OPPONENT BEHAVIOR TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS opponent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  opponent_firm TEXT,
  opponent_type TEXT, -- 'solicitor', 'insurer', 'local_authority', 'other'
  
  -- Behavior metrics (calculated from cases)
  total_cases INTEGER DEFAULT 0,
  settlement_rate NUMERIC(5, 2), -- Percentage of cases that settled
  average_settlement_stage TEXT, -- 'pre_action', 'litigation', 'trial'
  average_settlement_time_days INTEGER,
  part36_acceptance_rate NUMERIC(5, 2), -- Percentage of Part 36 offers accepted
  average_response_time_days NUMERIC(5, 2),
  trial_rate NUMERIC(5, 2), -- Percentage of cases that went to trial
  disclosure_compliance_rate NUMERIC(5, 2), -- Percentage of cases with timely disclosure
  
  -- Payment behavior
  average_payment_days INTEGER,
  payment_reliability_score NUMERIC(5, 2), -- 0-100 score
  
  -- Last updated
  last_case_date DATE,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, opponent_name)
);

CREATE INDEX IF NOT EXISTS idx_opponent_profiles_org_id ON opponent_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_opponent_profiles_name ON opponent_profiles(opponent_name);
CREATE INDEX IF NOT EXISTS idx_opponent_profiles_settlement_rate ON opponent_profiles(settlement_rate);

-- Opponent behavior events (track individual interactions)
CREATE TABLE IF NOT EXISTS opponent_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  opponent_profile_id UUID REFERENCES opponent_profiles(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'settlement', 'part36_offer', 'part36_accept', 'part36_reject', 'disclosure', 'response', 'trial', 'payment'
  event_date DATE NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb, -- Flexible data storage
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opponent_behavior_events_org_id ON opponent_behavior_events(org_id);
CREATE INDEX IF NOT EXISTS idx_opponent_behavior_events_case_id ON opponent_behavior_events(case_id);
CREATE INDEX IF NOT EXISTS idx_opponent_behavior_events_profile_id ON opponent_behavior_events(opponent_profile_id);
CREATE INDEX IF NOT EXISTS idx_opponent_behavior_events_type ON opponent_behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_opponent_behavior_events_date ON opponent_behavior_events(event_date DESC);

-- ============================================================================
-- CASE PROFITABILITY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_profitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Fee structure
  fee_type TEXT NOT NULL, -- 'hourly', 'fixed_fee', 'cfa', 'legal_aid', 'retainer'
  agreed_fee_amount NUMERIC(10, 2), -- Fixed fee or retainer amount
  hourly_rate NUMERIC(10, 2), -- If hourly billing
  
  -- Time tracking
  total_time_hours NUMERIC(10, 2) DEFAULT 0,
  billable_time_hours NUMERIC(10, 2) DEFAULT 0,
  unbilled_time_hours NUMERIC(10, 2) DEFAULT 0,
  
  -- Financial tracking
  total_billed NUMERIC(10, 2) DEFAULT 0,
  total_recovered NUMERIC(10, 2) DEFAULT 0,
  total_costs_incurred NUMERIC(10, 2) DEFAULT 0, -- Disbursements, etc.
  
  -- Profitability metrics
  profitability_score NUMERIC(5, 2), -- -100 to 100 (negative = losing money)
  recovery_rate NUMERIC(5, 2), -- Percentage of WIP recovered
  cost_to_fee_ratio NUMERIC(5, 2), -- Costs as percentage of fee
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'closed', 'written_off'
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_profitability_org_id ON case_profitability(org_id);
CREATE INDEX IF NOT EXISTS idx_case_profitability_case_id ON case_profitability(case_id);
CREATE INDEX IF NOT EXISTS idx_case_profitability_profitability_score ON case_profitability(profitability_score);
CREATE INDEX IF NOT EXISTS idx_case_profitability_status ON case_profitability(status);

-- ============================================================================
-- WIP RECOVERY ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS wip_recovery_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL, -- 'unbilled_time', 'unbilled_disbursement', 'fixed_fee_risk', 'stage_transition', 'part36_success_fee', 'legal_aid_deadline', 'cfa_success_fee', 'awaab_billing_window'
  practice_area TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Amounts
  unbilled_amount NUMERIC(10, 2),
  days_unbilled INTEGER,
  
  -- Alert message
  message TEXT NOT NULL,
  recommended_action TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wip_recovery_alerts_org_id ON wip_recovery_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_wip_recovery_alerts_case_id ON wip_recovery_alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_wip_recovery_alerts_type ON wip_recovery_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_wip_recovery_alerts_practice_area ON wip_recovery_alerts(practice_area);
CREATE INDEX IF NOT EXISTS idx_wip_recovery_alerts_status ON wip_recovery_alerts(status);
CREATE INDEX IF NOT EXISTS idx_wip_recovery_alerts_severity ON wip_recovery_alerts(severity);

-- ============================================================================
-- CLIENT PAYMENT BEHAVIOR
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_payment_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL, -- Client identifier (from cases or clients table)
  client_name TEXT,
  
  -- Payment metrics
  total_invoices INTEGER DEFAULT 0,
  total_invoiced NUMERIC(10, 2) DEFAULT 0,
  total_paid NUMERIC(10, 2) DEFAULT 0,
  average_payment_days NUMERIC(5, 2),
  on_time_payment_rate NUMERIC(5, 2), -- Percentage paid on time
  overdue_invoices_count INTEGER DEFAULT 0,
  
  -- Last payment
  last_payment_date DATE,
  last_payment_amount NUMERIC(10, 2),
  
  -- Reliability score (0-100)
  payment_reliability_score NUMERIC(5, 2),
  
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(org_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_payment_behavior_org_id ON client_payment_behavior(org_id);
CREATE INDEX IF NOT EXISTS idx_client_payment_behavior_client_id ON client_payment_behavior(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payment_behavior_reliability ON client_payment_behavior(payment_reliability_score);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update case profitability when time entries or invoices change
CREATE OR REPLACE FUNCTION update_case_profitability()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called from application logic, not directly from triggers
  -- to avoid circular dependencies
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update opponent profile when behavior events are added
CREATE OR REPLACE FUNCTION update_opponent_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate opponent metrics (called from application logic)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_wip_recovery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wip_recovery_alerts_updated_at ON wip_recovery_alerts;
CREATE TRIGGER trg_wip_recovery_alerts_updated_at
  BEFORE UPDATE ON wip_recovery_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_wip_recovery_updated_at();

DROP TRIGGER IF EXISTS trg_case_profitability_updated_at ON case_profitability;
CREATE TRIGGER trg_case_profitability_updated_at
  BEFORE UPDATE ON case_profitability
  FOR EACH ROW
  EXECUTE FUNCTION update_wip_recovery_updated_at();

DROP TRIGGER IF EXISTS trg_opponent_profiles_updated_at ON opponent_profiles;
CREATE TRIGGER trg_opponent_profiles_updated_at
  BEFORE UPDATE ON opponent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_wip_recovery_updated_at();

