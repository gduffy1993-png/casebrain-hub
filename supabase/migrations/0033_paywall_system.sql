-- =============================================================================
-- Paywall System: Organisations, Usage Tracking, Abuse Prevention
-- =============================================================================

-- =============================================================================
-- ORGANISATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domain TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_plan CHECK (plan IN ('FREE', 'LOCKED', 'PAID_MONTHLY', 'PAID_YEARLY'))
);

CREATE INDEX IF NOT EXISTS idx_organisations_email_domain ON public.organisations(email_domain);
CREATE INDEX IF NOT EXISTS idx_organisations_plan ON public.organisations(plan);

-- =============================================================================
-- ORGANISATION MEMBERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_members_org_id ON public.organisation_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_user_id ON public.organisation_members(user_id);

-- =============================================================================
-- USAGE COUNTERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  pdf_uploads INTEGER NOT NULL DEFAULT 0,
  cases_active INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organisation_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_org_id ON public.usage_counters(organisation_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_year_month ON public.usage_counters(year_month);

-- =============================================================================
-- ABUSE TRACKER
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.abuse_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_tracker_ip ON public.abuse_tracker(ip);
CREATE INDEX IF NOT EXISTS idx_abuse_tracker_created_at ON public.abuse_tracker(created_at DESC);

-- =============================================================================
-- PHONE TRIALS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.phone_trials_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_trials_phone_number ON public.phone_trials_used(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_trials_org_id ON public.phone_trials_used(organisation_id);

-- =============================================================================
-- APP EVENTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON public.app_events(user_id);
CREATE INDEX IF NOT EXISTS idx_app_events_org_id ON public.app_events(organisation_id);
CREATE INDEX IF NOT EXISTS idx_app_events_event_type ON public.app_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON public.app_events(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_trials_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- DENY ANON ACCESS (Postgres-safe, idempotent)
-- =============================================================================
DROP POLICY IF EXISTS deny_anon_organisations ON public.organisations;
CREATE POLICY deny_anon_organisations ON public.organisations
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_organisation_members ON public.organisation_members;
CREATE POLICY deny_anon_organisation_members ON public.organisation_members
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_usage_counters ON public.usage_counters;
CREATE POLICY deny_anon_usage_counters ON public.usage_counters
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_abuse_tracker ON public.abuse_tracker;
CREATE POLICY deny_anon_abuse_tracker ON public.abuse_tracker
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_phone_trials_used ON public.phone_trials_used;
CREATE POLICY deny_anon_phone_trials_used ON public.phone_trials_used
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_app_events ON public.app_events;
CREATE POLICY deny_anon_app_events ON public.app_events
  FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- UPDATED_AT TRIGGER (SAFE)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_organisations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_organisations_updated_at ON public.organisations;
CREATE TRIGGER trigger_update_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organisations_updated_at();
