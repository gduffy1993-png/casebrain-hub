-- =============================================================================
-- Workspace entitlements — temporary capacity grants scoped by organisation ID
-- =============================================================================
-- Service-role only (Phase 1 style). Product code looks up by workspace_id;
-- never by email. bypass_active must remain false for internal_qa grants.

CREATE TABLE IF NOT EXISTS public.workspace_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  cases_limit INTEGER NOT NULL,
  documents_limit INTEGER NOT NULL,
  analyses_limit INTEGER NOT NULL,
  exports_limit INTEGER NOT NULL,
  bypass_active BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  granted_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_entitlements_kind_check CHECK (kind IN ('internal_qa')),
  CONSTRAINT workspace_entitlements_bypass_false_for_internal_qa CHECK (
    kind <> 'internal_qa' OR bypass_active = false
  ),
  CONSTRAINT workspace_entitlements_positive_limits CHECK (
    cases_limit > 0
    AND documents_limit > 0
    AND analyses_limit > 0
    AND exports_limit > 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_entitlements_workspace_active
  ON public.workspace_entitlements (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_entitlements_expires_at
  ON public.workspace_entitlements (expires_at);

CREATE TABLE IF NOT EXISTS public.workspace_entitlement_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  granted_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_entitlement JSONB,
  new_entitlement JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_entitlement_audit_workspace_created
  ON public.workspace_entitlement_audit (workspace_id, created_at DESC);

ALTER TABLE public.workspace_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_entitlement_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_all_workspace_entitlements ON public.workspace_entitlements;
CREATE POLICY deny_anon_all_workspace_entitlements
  ON public.workspace_entitlements
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_all_workspace_entitlement_audit ON public.workspace_entitlement_audit;
CREATE POLICY deny_anon_all_workspace_entitlement_audit
  ON public.workspace_entitlement_audit
  FOR ALL
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.workspace_entitlements FROM anon, authenticated;
REVOKE ALL ON TABLE public.workspace_entitlement_audit FROM anon, authenticated;

COMMENT ON TABLE public.workspace_entitlements IS
  'Temporary workspace-scoped capacity grants (e.g. internal_qa). Lookup by workspace_id only; bypass_active must stay false.';

COMMENT ON TABLE public.workspace_entitlement_audit IS
  'Append-only audit of workspace entitlement grants/changes.';
