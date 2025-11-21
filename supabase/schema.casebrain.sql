-- ===========================
-- CaseBrain Patch Update
-- Safe to run on existing install
-- ===========================

-- Add OIC/MedCo fields to PI cases table
ALTER TABLE public.pi_cases
ADD COLUMN IF NOT EXISTS oic_track text,
ADD COLUMN IF NOT EXISTS injury_summary text,
ADD COLUMN IF NOT EXISTS whiplash_tariff_band text,
ADD COLUMN IF NOT EXISTS whiplash_tariff_amount numeric,
ADD COLUMN IF NOT EXISTS special_damages numeric,
ADD COLUMN IF NOT EXISTS general_damages numeric;

-- Allow intake inbox (unassigned documents)
ALTER TABLE public.documents
ALTER COLUMN case_id DROP NOT NULL;

-- Ensure org_id column exists for documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS org_id text;

-- Add portal session tracking fields
ALTER TABLE public.portal_sessions
ADD COLUMN IF NOT EXISTS org_id text,
ADD COLUMN IF NOT EXISTS created_by text;

-- Recommended index for performance
CREATE INDEX IF NOT EXISTS documents_org_idx ON public.documents (org_id);
