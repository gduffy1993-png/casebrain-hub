-- Align `public.documents` with CaseBrain Hub upload/extract and related routes.
-- Run after confirming live schema (use information_schema if needed).
-- Each column uses IF NOT EXISTS so partial / drifted DBs can apply safely.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storage_url text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS raw_text text,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS extracted_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS redaction_map jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS uploaded_by text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS red_flags_json jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.documents.raw_text IS 'Redacted full text extract (pdf-parse / mammoth / text).';
COMMENT ON COLUMN public.documents.extracted_text IS 'Plain extract mirror; same pipeline as raw_text where both are set.';
COMMENT ON COLUMN public.documents.extracted_json IS 'Structured AI extraction + aiSummary.';
