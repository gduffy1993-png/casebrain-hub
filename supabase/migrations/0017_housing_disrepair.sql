-- ============================================================================
-- Housing Disrepair / HRA Tables
-- ============================================================================

-- Housing Disrepair Cases table
CREATE TABLE IF NOT EXISTS public.housing_cases (
  id uuid PRIMARY KEY REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  tenant_name text,
  tenant_dob date,
  tenant_vulnerability text[],
  property_address text,
  landlord_name text,
  landlord_type text,
  first_report_date date,
  repair_attempts_count int DEFAULT 0,
  no_access_count int DEFAULT 0,
  no_access_days_total int DEFAULT 0,
  unfit_for_habitation boolean DEFAULT false,
  hhsrs_category_1_hazards text[],
  hhsrs_category_2_hazards text[],
  limitation_risk text,
  limitation_date date,
  stage text NOT NULL DEFAULT 'intake',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housing_cases_org_idx ON public.housing_cases (org_id);
CREATE INDEX IF NOT EXISTS housing_cases_stage_idx ON public.housing_cases (stage);
CREATE INDEX IF NOT EXISTS housing_cases_limitation_idx ON public.housing_cases (limitation_date);

-- Housing Defects / Hazards table
CREATE TABLE IF NOT EXISTS public.housing_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  defect_type text NOT NULL,
  location text,
  severity text,
  first_reported_date date,
  last_reported_date date,
  repair_attempted boolean DEFAULT false,
  repair_date date,
  repair_successful boolean,
  hhsrs_category text,
  photos_count int DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housing_defects_case_idx ON public.housing_defects (case_id);
CREATE INDEX IF NOT EXISTS housing_defects_org_idx ON public.housing_defects (org_id);
CREATE INDEX IF NOT EXISTS housing_defects_type_idx ON public.housing_defects (defect_type);

-- Housing Timeline Events table
CREATE TABLE IF NOT EXISTS public.housing_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  source_document_id uuid REFERENCES public.documents(id),
  source_type text,
  parties_involved text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housing_timeline_case_idx ON public.housing_timeline (case_id);
CREATE INDEX IF NOT EXISTS housing_timeline_org_idx ON public.housing_timeline (org_id);
CREATE INDEX IF NOT EXISTS housing_timeline_date_idx ON public.housing_timeline (event_date);

-- Housing Landlord Responses table
CREATE TABLE IF NOT EXISTS public.housing_landlord_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id text NOT NULL,
  response_date date NOT NULL,
  response_type text NOT NULL,
  response_text text,
  repair_scheduled_date date,
  contractor_name text,
  no_access_reason text,
  source_document_id uuid REFERENCES public.documents(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housing_landlord_responses_case_idx ON public.housing_landlord_responses (case_id);
CREATE INDEX IF NOT EXISTS housing_landlord_responses_org_idx ON public.housing_landlord_responses (org_id);

-- Housing Letter Templates table
CREATE TABLE IF NOT EXISTS public.housing_letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housing_letter_templates_org_idx ON public.housing_letter_templates (org_id);
CREATE INDEX IF NOT EXISTS housing_letter_templates_code_idx ON public.housing_letter_templates (code);

-- Add updated_at triggers
CREATE TRIGGER housing_cases_set_updated_at BEFORE UPDATE ON public.housing_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER housing_defects_set_updated_at BEFORE UPDATE ON public.housing_defects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER housing_timeline_set_updated_at BEFORE UPDATE ON public.housing_timeline
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER housing_landlord_responses_set_updated_at BEFORE UPDATE ON public.housing_landlord_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER housing_letter_templates_set_updated_at BEFORE UPDATE ON public.housing_letter_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

