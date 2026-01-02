-- =============================================================================
-- Case Disclosure Chasers
-- =============================================================================
-- Tracks disclosure requests, chase trail, and responses
-- RLS: org_id scoped (consistent with existing criminal tables)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.case_disclosure_chasers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  -- Disclosure item details
  item TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'chased', 'received', 'overdue')),
  
  -- Timeline
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chased_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_disclosure_chasers_case_id
  ON public.case_disclosure_chasers(case_id);

CREATE INDEX IF NOT EXISTS idx_case_disclosure_chasers_org_id
  ON public.case_disclosure_chasers(org_id);

CREATE INDEX IF NOT EXISTS idx_case_disclosure_chasers_status
  ON public.case_disclosure_chasers(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.case_disclosure_chasers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_disclosure_chasers_updated_at ON public.case_disclosure_chasers;
CREATE TRIGGER trg_case_disclosure_chasers_updated_at
BEFORE UPDATE ON public.case_disclosure_chasers
FOR EACH ROW
EXECUTE FUNCTION public.case_disclosure_chasers_updated_at();

-- RLS
ALTER TABLE public.case_disclosure_chasers ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access
DROP POLICY IF EXISTS deny_anon_all_case_disclosure_chasers ON public.case_disclosure_chasers;
CREATE POLICY deny_anon_all_case_disclosure_chasers
  ON public.case_disclosure_chasers
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Remove old policies if they exist
DROP POLICY IF EXISTS "Users can view disclosure chasers for cases in their org" ON public.case_disclosure_chasers;
DROP POLICY IF EXISTS "Users can insert disclosure chasers for cases in their org" ON public.case_disclosure_chasers;
DROP POLICY IF EXISTS "Users can update disclosure chasers for cases in their org" ON public.case_disclosure_chasers;
DROP POLICY IF EXISTS "Users can delete disclosure chasers for cases in their org" ON public.case_disclosure_chasers;

-- RLS Policies (org_id scoped - consistent with criminal tables)
CREATE POLICY "Users can view disclosure chasers for cases in their org"
  ON public.case_disclosure_chasers
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.id = org_id
        AND (
          o.id = (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1)
          OR o.external_ref = 'solo-user_' || auth.uid()::text
        )
    )
  );

CREATE POLICY "Users can insert disclosure chasers for cases in their org"
  ON public.case_disclosure_chasers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.id = org_id
        AND (
          o.id = (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1)
          OR o.external_ref = 'solo-user_' || auth.uid()::text
        )
    )
  );

CREATE POLICY "Users can update disclosure chasers for cases in their org"
  ON public.case_disclosure_chasers
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.id = org_id
        AND (
          o.id = (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1)
          OR o.external_ref = 'solo-user_' || auth.uid()::text
        )
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.id = org_id
        AND (
          o.id = (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1)
          OR o.external_ref = 'solo-user_' || auth.uid()::text
        )
    )
  );

CREATE POLICY "Users can delete disclosure chasers for cases in their org"
  ON public.case_disclosure_chasers
  FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.id = org_id
        AND (
          o.id = (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1)
          OR o.external_ref = 'solo-user_' || auth.uid()::text
        )
    )
  );

