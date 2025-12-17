-- =============================================================================
-- Add organisations.external_ref for stable external organisation resolution
-- =============================================================================
-- Used to map Clerk org IDs and solo-user workspaces to the UUID primary key.

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS external_ref TEXT;

-- Unique when set (allow many NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organisations_external_ref_unique
  ON public.organisations (external_ref)
  WHERE external_ref IS NOT NULL;


