-- =============================================================================
-- RLS follow-up — criminal persistence hardening (REVIEW ONLY)
-- =============================================================================
-- NOT an active migration. Do not auto-run. Apply manually after review.
--
-- Closes gap: INSERT policies check org_id on the row but not that case_id
-- belongs to that org. App routes already verify; this hardens PostgREST path.
-- =============================================================================

BEGIN;

-- reasoning_feedback
DROP POLICY IF EXISTS "Users can insert reasoning feedback for cases in their org"
  ON public.reasoning_feedback;

CREATE POLICY "Users can insert reasoning feedback for cases in their org"
  ON public.reasoning_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.org_id = reasoning_feedback.org_id
    )
  );

-- supervisor_signoffs
DROP POLICY IF EXISTS "Users can insert supervisor signoffs for cases in their org"
  ON public.supervisor_signoffs;

CREATE POLICY "Users can insert supervisor signoffs for cases in their org"
  ON public.supervisor_signoffs
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()::text
    AND org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.org_id = supervisor_signoffs.org_id
    )
  );

-- evidence_change_snapshots
DROP POLICY IF EXISTS "Users can insert evidence change snapshots for cases in their org"
  ON public.evidence_change_snapshots;

CREATE POLICY "Users can insert evidence change snapshots for cases in their org"
  ON public.evidence_change_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (
    saved_by = auth.uid()::text
    AND org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.org_id = evidence_change_snapshots.org_id
    )
  );

-- export_reviews
DROP POLICY IF EXISTS "Users can insert export reviews for cases in their org"
  ON public.export_reviews;

CREATE POLICY "Users can insert export reviews for cases in their org"
  ON public.export_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.org_id = export_reviews.org_id
    )
  );

-- case_review_audit_events
DROP POLICY IF EXISTS "Users can insert case review audit events for cases in their org"
  ON public.case_review_audit_events;

CREATE POLICY "Users can insert case review audit events for cases in their org"
  ON public.case_review_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()::text
    AND org_id = COALESCE(
      (SELECT u.org_id FROM public.users u WHERE u.id = auth.uid()::text LIMIT 1),
      (SELECT o.id::text FROM public.organisations o
        WHERE o.external_ref = 'solo-user_' || auth.uid()::text LIMIT 1)
    )
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.org_id = case_review_audit_events.org_id
    )
  );

COMMIT;

-- PRE-FLIGHT:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename LIKE '%signoff%' OR tablename LIKE '%feedback%';
