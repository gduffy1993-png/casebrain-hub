-- ============================================================================
-- CUSTOM REPORTS BUILDER
-- ============================================================================
-- Allow users to create custom reports with drag-and-drop interface

-- ============================================================================
-- CUSTOM REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  
  -- Report details
  name TEXT NOT NULL,
  description TEXT,
  data_source TEXT NOT NULL CHECK (data_source IN (
    'cases',
    'time_entries',
    'invoices',
    'communication_events',
    'documents',
    'custom'
  )),
  
  -- Report configuration (JSON)
  fields JSONB NOT NULL DEFAULT '[]', -- Array of {id, name, type, source, path}
  filters JSONB NOT NULL DEFAULT '[]', -- Array of {field, operator, value}
  group_by JSONB NOT NULL DEFAULT '[]', -- Array of {field, order}
  
  -- Visualization
  chart_type TEXT CHECK (chart_type IN ('table', 'bar', 'line', 'pie', 'donut')),
  
  -- Sharing
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with_org BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_org_id ON custom_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_created_by ON custom_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_reports_data_source ON custom_reports(data_source);

-- ============================================================================
-- REPORT SCHEDULES (Auto-generate and email reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  
  -- Schedule details
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
  schedule_config JSONB, -- Cron expression or schedule config
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  
  -- Email recipients
  email_recipients TEXT[] NOT NULL,
  email_subject TEXT,
  email_body TEXT,
  
  -- Export format
  export_format TEXT NOT NULL DEFAULT 'pdf' CHECK (export_format IN ('pdf', 'excel', 'csv')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_org_id ON report_schedules(org_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run_at ON report_schedules(next_run_at) WHERE is_active = TRUE;

-- ============================================================================
-- REPORT RUNS (History of report executions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE SET NULL,
  org_id TEXT NOT NULL,
  
  -- Run details
  executed_by TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Results
  row_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT,
  
  -- Export
  export_url TEXT, -- URL to generated report file
  export_format TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_runs_report_id ON report_runs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_org_id ON report_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_executed_at ON report_runs(executed_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_reports_updated_at ON custom_reports;
CREATE TRIGGER trg_custom_reports_updated_at
  BEFORE UPDATE ON custom_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_report_schedules_updated_at ON report_schedules;
CREATE TRIGGER trg_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

