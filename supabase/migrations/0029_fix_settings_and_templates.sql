-- Migration: Fix settings and templates tables
-- 1. Add missing columns to organisation_settings
-- 2. Create / harden letterTemplates table
-- 3. Seed default templates safely

-- ============================================================================
-- 1. Add missing columns to organisation_settings
-- ============================================================================

ALTER TABLE public.organisation_settings
ADD COLUMN IF NOT EXISTS firm_name text,
ADD COLUMN IF NOT EXISTS firm_address text,
ADD COLUMN IF NOT EXISTS default_sign_off text;

-- ============================================================================
-- 2. Create / harden letterTemplates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."letterTemplates" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL,
  name text NOT NULL,
  body_template text NOT NULL,
  practice_area text DEFAULT 'general',
  placeholders jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure placeholders column exists (older DBs)
ALTER TABLE public."letterTemplates"
  ADD COLUMN IF NOT EXISTS placeholders jsonb DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS letter_templates_org_idx
  ON public."letterTemplates" (org_id);

CREATE INDEX IF NOT EXISTS letter_templates_practice_area_idx
  ON public."letterTemplates" (practice_area);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.letter_templates_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_letter_templates_updated_at
  ON public."letterTemplates";

CREATE TRIGGER trg_letter_templates_updated_at
  BEFORE UPDATE ON public."letterTemplates"
  FOR EACH ROW
  EXECUTE FUNCTION public.letter_templates_set_updated_at();

-- Enable RLS
ALTER TABLE public."letterTemplates" ENABLE ROW LEVEL SECURITY;

-- Deny anon access (admin client only)
DROP POLICY IF EXISTS deny_anon_letter_templates
  ON public."letterTemplates";

CREATE POLICY deny_anon_letter_templates
  ON public."letterTemplates"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- 3. Seed default templates (only if table is empty)
-- ============================================================================

INSERT INTO public."letterTemplates" (name, body_template, practice_area, placeholders)
SELECT name, body_template, practice_area, placeholders
FROM (VALUES
  (
    'Initial Client Letter',
    E'Dear {{client_name}},\n\nThank you for instructing us in relation to your matter.\n\nWe write to confirm that we have now opened a file and will be handling your case.\n\n{{case_summary}}\n\nWe will be in touch shortly with next steps.\n\nYours sincerely,\n{{fee_earner_name}}',
    'general',
    '["client_name", "case_summary", "fee_earner_name"]'::jsonb
  ),
  (
    'Letter Before Action',
    E'Dear Sirs,\n\nWe act on behalf of {{client_name}} in respect of {{matter_description}}.\n\nWe hereby put you on notice of our client''s claim.\n\n{{claim_details}}\n\nWe require a response within 14 days, failing which we will proceed to issue proceedings without further notice.\n\nYours faithfully,\n{{fee_earner_name}}',
    'general',
    '["client_name", "matter_description", "claim_details", "fee_earner_name"]'::jsonb
  ),
  (
    'Chaser Letter',
    E'Dear Sirs,\n\nWe refer to our previous correspondence dated {{previous_letter_date}}.\n\nWe have not received a response and write to chase for the same.\n\nPlease respond within 7 days.\n\nYours faithfully,\n{{fee_earner_name}}',
    'general',
    '["previous_letter_date", "fee_earner_name"]'::jsonb
  ),
  (
    'Client Update Letter',
    E'Dear {{client_name}},\n\nWe write to update you on the progress of your matter.\n\n{{update_content}}\n\nIf you have any questions, please do not hesitate to contact us.\n\nYours sincerely,\n{{fee_earner_name}}',
    'general',
    '["client_name", "update_content", "fee_earner_name"]'::jsonb
  ),
  (
    'Housing - Pre-Action Protocol Letter',
    E'Dear Sirs,\n\nWe act on behalf of {{client_name}} who is the tenant of {{property_address}}.\n\nOur client has suffered from disrepair at the property, namely:\n\n{{defects_list}}\n\nThe defects were first reported to you on {{first_report_date}}.\n\nDespite repeated requests, the defects have not been properly addressed.\n\nIn accordance with the Pre-Action Protocol for Housing Conditions Claims, we hereby require you to:\n\n1. Carry out a full inspection within 20 working days\n2. Provide a schedule of proposed works within 20 working days\n3. Complete all necessary repairs within a reasonable time\n\nOur client claims damages for:\n- General damages for inconvenience and distress\n- Special damages (details to follow)\n\nWe look forward to your substantive response within 20 working days.\n\nYours faithfully,\n{{fee_earner_name}}',
    'housing_disrepair',
    '["client_name", "property_address", "defects_list", "first_report_date", "fee_earner_name"]'::jsonb
  ),
  (
    'PI - Letter of Claim',
    E'Dear Sirs,\n\nWe act on behalf of {{client_name}} in respect of an accident which occurred on {{accident_date}} at {{accident_location}}.\n\nCIRCUMSTANCES OF THE ACCIDENT\n{{accident_description}}\n\nINJURIES SUSTAINED\n{{injuries_description}}\n\nALLEGATIONS OF NEGLIGENCE\n{{negligence_allegations}}\n\nIn accordance with the Pre-Action Protocol for Personal Injury Claims, we invite your insurer to nominate themselves within 21 days.\n\nWe look forward to hearing from you.\n\nYours faithfully,\n{{fee_earner_name}}',
    'pi',
    '["client_name", "accident_date", "accident_location", "accident_description", "injuries_description", "negligence_allegations", "fee_earner_name"]'::jsonb
  )
) AS t(name, body_template, practice_area, placeholders)
WHERE NOT EXISTS (
  SELECT 1 FROM public."letterTemplates" LIMIT 1
);
