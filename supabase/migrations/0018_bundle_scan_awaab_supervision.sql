-- ============================================================================
-- Bundle Checker, Awaab's Law Trigger Monitor, and Supervision Pack Tables
-- ============================================================================

-- Bundle Scan Results table
CREATE TABLE IF NOT EXISTS public.bundle_scan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_by text NOT NULL,
  overall_risk text NOT NULL DEFAULT 'low', -- 'low' | 'medium' | 'high' | 'critical'
  total_issues int NOT NULL DEFAULT 0,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bundle_scan_case_idx ON public.bundle_scan (case_id);
CREATE INDEX IF NOT EXISTS bundle_scan_org_idx ON public.bundle_scan (org_id);
CREATE INDEX IF NOT EXISTS bundle_scan_risk_idx ON public.bundle_scan (overall_risk);

-- Bundle Scan Items (individual risk findings)
CREATE TABLE IF NOT EXISTS public.bundle_scan_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.bundle_scan(id) ON DELETE CASCADE,
  item_type text NOT NULL, -- 'missing_surveyor_report' | 'missing_hazard_grading' | 'no_medical_evidence' | 'no_disclosure' | 'no_lba' | 'late_response' | 'expired_limitation' | 'pi_overlap' | 'missing_schedule'
  severity text NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  title text NOT NULL,
  description text,
  recommendation text,
  document_reference text, -- Reference to document if applicable
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bundle_scan_item_scan_idx ON public.bundle_scan_item (scan_id);
CREATE INDEX IF NOT EXISTS bundle_scan_item_type_idx ON public.bundle_scan_item (item_type);
CREATE INDEX IF NOT EXISTS bundle_scan_item_severity_idx ON public.bundle_scan_item (severity);

-- Awaab's Law Trigger Monitor (stores trigger events and status)
CREATE TABLE IF NOT EXISTS public.awaab_trigger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  first_report_date date,
  investigation_date date,
  work_start_date date,
  work_complete_date date,
  is_social_landlord boolean NOT NULL DEFAULT false,
  days_until_investigation_deadline int,
  days_until_work_start_deadline int,
  days_until_completion_deadline int,
  investigation_deadline_breached boolean NOT NULL DEFAULT false,
  work_start_deadline_breached boolean NOT NULL DEFAULT false,
  completion_deadline_breached boolean NOT NULL DEFAULT false,
  overall_risk text NOT NULL DEFAULT 'none', -- 'none' | 'low' | 'medium' | 'high' | 'critical'
  risk_category int, -- 1 or 2
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id)
);

CREATE INDEX IF NOT EXISTS awaab_trigger_case_idx ON public.awaab_trigger (case_id);
CREATE INDEX IF NOT EXISTS awaab_trigger_org_idx ON public.awaab_trigger (org_id);
CREATE INDEX IF NOT EXISTS awaab_trigger_risk_idx ON public.awaab_trigger (overall_risk);

-- Supervision Pack (stores generated supervision reports)
CREATE TABLE IF NOT EXISTS public.supervisor_pack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL,
  pack_json jsonb NOT NULL, -- Full supervision pack data
  pack_markdown text, -- Markdown version for export
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supervisor_pack_case_idx ON public.supervisor_pack (case_id);
CREATE INDEX IF NOT EXISTS supervisor_pack_org_idx ON public.supervisor_pack (org_id);
CREATE INDEX IF NOT EXISTS supervisor_pack_generated_idx ON public.supervisor_pack (generated_at);

-- RLS Policies
ALTER TABLE public.bundle_scan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_scan_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awaab_trigger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_pack ENABLE ROW LEVEL SECURITY;

-- Bundle Scan RLS
CREATE POLICY "Users can view bundle scans in their org"
  ON public.bundle_scan FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY "Users can create bundle scans in their org"
  ON public.bundle_scan FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY "Users can update bundle scans in their org"
  ON public.bundle_scan FOR UPDATE
  USING (org_id = current_setting('app.current_org_id', true));

-- Bundle Scan Item RLS
CREATE POLICY "Users can view bundle scan items in their org"
  ON public.bundle_scan_item FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bundle_scan
      WHERE bundle_scan.id = bundle_scan_item.scan_id
      AND bundle_scan.org_id = current_setting('app.current_org_id', true)
    )
  );

CREATE POLICY "Users can create bundle scan items in their org"
  ON public.bundle_scan_item FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bundle_scan
      WHERE bundle_scan.id = bundle_scan_item.scan_id
      AND bundle_scan.org_id = current_setting('app.current_org_id', true)
    )
  );

-- Awaab Trigger RLS
CREATE POLICY "Users can view awaab triggers in their org"
  ON public.awaab_trigger FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY "Users can create awaab triggers in their org"
  ON public.awaab_trigger FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY "Users can update awaab triggers in their org"
  ON public.awaab_trigger FOR UPDATE
  USING (org_id = current_setting('app.current_org_id', true));

-- Supervisor Pack RLS
CREATE POLICY "Users can view supervisor packs in their org"
  ON public.supervisor_pack FOR SELECT
  USING (org_id = current_setting('app.current_org_id', true));

CREATE POLICY "Users can create supervisor packs in their org"
  ON public.supervisor_pack FOR INSERT
  WITH CHECK (org_id = current_setting('app.current_org_id', true));

CREATE POLICY "Users can update supervisor packs in their org"
  ON public.supervisor_pack FOR UPDATE
  USING (org_id = current_setting('app.current_org_id', true));

-- Add updated_at triggers
CREATE TRIGGER bundle_scan_set_updated_at BEFORE UPDATE ON public.bundle_scan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER awaab_trigger_set_updated_at BEFORE UPDATE ON public.awaab_trigger
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER supervisor_pack_set_updated_at BEFORE UPDATE ON public.supervisor_pack
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

