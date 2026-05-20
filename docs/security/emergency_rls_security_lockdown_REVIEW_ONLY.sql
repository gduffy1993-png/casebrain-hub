-- =============================================================================
-- Emergency RLS security lockdown — REVIEW ONLY
-- =============================================================================
-- Location: docs/security/emergency_rls_security_lockdown_REVIEW_ONLY.sql
-- NOT an active Supabase migration. Do not place under supabase/migrations/.
-- Do not run via `supabase db push` or CI. Apply manually in SQL editor only after approval.
-- =============================================================================
-- CaseBrain uses getSupabaseAdminClient() (service role) on server routes; service
-- role bypasses RLS. This migration closes PostgREST/anon exposure on public tables
-- and adds authenticated org-scoped policies for defense-in-depth.
--
-- BEFORE APPLYING — run in Supabase SQL editor and save results:
--
--   SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
--   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
--
--   SELECT table_schema, table_name, column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
--
--   SELECT id, name, public FROM storage.buckets ORDER BY name;
--
--   SELECT policyname, roles, cmd, qual
--   FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
--   ORDER BY policyname;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Shared helpers (SECURITY DEFINER — membership lookup for auth.uid())
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.casebrain_auth_org_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organisation_id::text
  FROM public.organisation_members om
  WHERE om.user_id = auth.uid()::text
  UNION
  SELECT u.org_id::text
  FROM public.users u
  WHERE u.id = auth.uid()::text
    AND u.org_id IS NOT NULL
  UNION
  SELECT o.id::text
  FROM public.organisations o
  WHERE o.external_ref = 'solo-user_' || auth.uid()::text;
$$;

REVOKE ALL ON FUNCTION public.casebrain_auth_org_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.casebrain_auth_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.casebrain_auth_org_ids() TO service_role;

CREATE OR REPLACE FUNCTION public.casebrain_auth_org_uuids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organisation_id
  FROM public.organisation_members om
  WHERE om.user_id = auth.uid()::text
  UNION
  SELECT u.org_id::uuid
  FROM public.users u
  WHERE u.id = auth.uid()::text
    AND u.org_id IS NOT NULL
  UNION
  SELECT o.id
  FROM public.organisations o
  WHERE o.external_ref = 'solo-user_' || auth.uid()::text;
$$;

REVOKE ALL ON FUNCTION public.casebrain_auth_org_uuids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.casebrain_auth_org_uuids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.casebrain_auth_org_uuids() TO service_role;

CREATE OR REPLACE FUNCTION public.casebrain_case_in_auth_org(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cases c
    WHERE c.id = p_case_id
      AND c.org_id IN (SELECT public.casebrain_auth_org_ids())
  );
$$;

REVOKE ALL ON FUNCTION public.casebrain_case_in_auth_org(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.casebrain_case_in_auth_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.casebrain_case_in_auth_org(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. Fix legacy "deny ALL roles" policies → deny anon only
--    (Existing policies used FOR ALL with no TO clause, blocking authenticated too.)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'deny_anon%'
      AND (roles IS NULL OR 'public' = ANY(roles)) -- broad deny policies
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR ALL TO anon USING (false) WITH CHECK (false)',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Macro: service-role-only lock (RLS on, anon denied, no authenticated policies)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.__casebrain_lock_table_service_only(p_qualified text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass(p_qualified) IS NULL THEN
    RETURN;
  END IF;
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', p_qualified);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS casebrain_deny_anon ON %s', p_qualified);
  EXECUTE format(
    'CREATE POLICY casebrain_deny_anon ON %s FOR ALL TO anon USING (false) WITH CHECK (false)',
    p_qualified
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Macro: org_id TEXT column — authenticated CRUD
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.__casebrain_apply_org_text_rls(p_qualified text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pfx text := replace(replace(p_qualified, 'public.', ''), '.', '_');
BEGIN
  IF to_regclass(p_qualified) IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.__casebrain_lock_table_service_only(p_qualified);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_select', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_insert', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_update', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_delete', p_qualified);

  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (org_id IN (SELECT public.casebrain_auth_org_ids()))',
    pfx || '_select', p_qualified
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT public.casebrain_auth_org_ids()))',
    pfx || '_insert', p_qualified
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (org_id IN (SELECT public.casebrain_auth_org_ids())) WITH CHECK (org_id IN (SELECT public.casebrain_auth_org_ids()))',
    pfx || '_update', p_qualified
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (org_id IN (SELECT public.casebrain_auth_org_ids()))',
    pfx || '_delete', p_qualified
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Macro: org_id UUID column — authenticated CRUD
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.__casebrain_apply_org_uuid_rls(p_qualified text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pfx text := replace(replace(p_qualified, 'public.', ''), '.', '_');
BEGIN
  IF to_regclass(p_qualified) IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.__casebrain_lock_table_service_only(p_qualified);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_select', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_insert', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_update', p_qualified);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pfx || '_delete', p_qualified);

  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (org_id IN (SELECT public.casebrain_auth_org_uuids()))',
    pfx || '_select', p_qualified
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (org_id IN (SELECT public.casebrain_auth_org_uuids()))',
    pfx || '_insert', p_qualified
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (org_id IN (SELECT public.casebrain_auth_org_uuids())) WITH CHECK (org_id IN (SELECT public.casebrain_auth_org_uuids()))',
    pfx || '_update', p_qualified
  );
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (org_id IN (SELECT public.casebrain_auth_org_uuids()))',
    pfx || '_delete', p_qualified
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Core active tables (org_id TEXT on cases/documents per migrations)
-- -----------------------------------------------------------------------------

SELECT public.__casebrain_apply_org_text_rls('public.cases');
SELECT public.__casebrain_apply_org_text_rls('public.documents');
SELECT public.__casebrain_apply_org_text_rls('public.deadlines');
SELECT public.__casebrain_apply_org_text_rls('public.letters');
SELECT public.__casebrain_apply_org_text_rls('public.templates');
SELECT public.__casebrain_apply_org_text_rls('public.timeline_events');
SELECT public.__casebrain_apply_org_text_rls('public.bundles');
SELECT public.__casebrain_apply_org_text_rls('public.evidence_items');
SELECT public.__casebrain_apply_org_text_rls('public.time_entries');
SELECT public.__casebrain_apply_org_text_rls('public.case_positions');
SELECT public.__casebrain_apply_org_text_rls('public.case_disclosure_chasers');
SELECT public.__casebrain_apply_org_text_rls('public.case_strategy_commitments');
SELECT public.__casebrain_apply_org_text_rls('public.win_story_snapshots');
SELECT public.__casebrain_apply_org_text_rls('public.case_analysis_versions');
SELECT public.__casebrain_apply_org_text_rls('public.firm_pack_overrides');
SELECT public.__casebrain_apply_org_text_rls('public.communication_events');
SELECT public.__casebrain_apply_org_text_rls('public.custom_reports');
SELECT public.__casebrain_apply_org_text_rls('public.document_versions');
SELECT public.__casebrain_apply_org_text_rls('public.document_locks');

-- Housing (org_id text)
SELECT public.__casebrain_apply_org_text_rls('public.housing_cases');
SELECT public.__casebrain_apply_org_text_rls('public.housing_defects');
SELECT public.__casebrain_apply_org_text_rls('public.housing_timeline');
SELECT public.__casebrain_apply_org_text_rls('public.housing_landlord_responses');

-- Email / finance (org_id text) — highly sensitive
SELECT public.__casebrain_apply_org_text_rls('public.email_accounts');
SELECT public.__casebrain_apply_org_text_rls('public.emails');
SELECT public.__casebrain_apply_org_text_rls('public.email_threads');
SELECT public.__casebrain_apply_org_text_rls('public.trust_accounts');
SELECT public.__casebrain_apply_org_text_rls('public.client_money');
SELECT public.__casebrain_apply_org_text_rls('public.trust_reconciliations');
SELECT public.__casebrain_apply_org_text_rls('public.invoices');
SELECT public.__casebrain_apply_org_text_rls('public.invoice_line_items');
SELECT public.__casebrain_apply_org_text_rls('public.payments');
SELECT public.__casebrain_apply_org_text_rls('public.disbursements');
SELECT public.__casebrain_apply_org_text_rls('public.billing_rates');

-- Bundle / scan (org_id text in 0018)
SELECT public.__casebrain_apply_org_text_rls('public.bundle_scan');
SELECT public.__casebrain_apply_org_text_rls('public.bundle_scan_item');
SELECT public.__casebrain_apply_org_text_rls('public.awaab_trigger');
SELECT public.__casebrain_apply_org_text_rls('public.supervisor_pack');

-- WIP / opponent (org_id text)
SELECT public.__casebrain_apply_org_text_rls('public.opponent_profiles');
SELECT public.__casebrain_apply_org_text_rls('public.opponent_behavior_events');
SELECT public.__casebrain_apply_org_text_rls('public.case_profitability');
SELECT public.__casebrain_apply_org_text_rls('public.wip_recovery_alerts');
SELECT public.__casebrain_apply_org_text_rls('public.client_payment_behavior');

-- Eval (org_id text)
SELECT public.__casebrain_apply_org_text_rls('public.eval_sweep_runs');
SELECT public.__casebrain_apply_org_text_rls('public.eval_sweep_rows');

-- -----------------------------------------------------------------------------
-- 7. org_id UUID tables
-- -----------------------------------------------------------------------------

SELECT public.__casebrain_apply_org_uuid_rls('public.tasks');
SELECT public.__casebrain_apply_org_uuid_rls('public.risk_flags');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_cases');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_charges');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_evidence');
SELECT public.__casebrain_apply_org_uuid_rls('public.pace_compliance');
SELECT public.__casebrain_apply_org_uuid_rls('public.disclosure_tracker');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_loopholes');
SELECT public.__casebrain_apply_org_uuid_rls('public.defense_strategies');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_hearings');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_disclosure_timeline');
SELECT public.__casebrain_apply_org_uuid_rls('public.criminal_verdict_ratings');
SELECT public.__casebrain_apply_org_uuid_rls('public.pi_cases');
SELECT public.__casebrain_apply_org_uuid_rls('public.pi_medical_reports');
SELECT public.__casebrain_apply_org_uuid_rls('public.pi_offers');
SELECT public.__casebrain_apply_org_uuid_rls('public.pi_hearings');
SELECT public.__casebrain_apply_org_uuid_rls('public.pi_disbursements');
SELECT public.__casebrain_apply_org_uuid_rls('public.conflicts');
SELECT public.__casebrain_apply_org_uuid_rls('public.settlement_calculations');
SELECT public.__casebrain_apply_org_uuid_rls('public.calendar_events');
SELECT public.__casebrain_apply_org_uuid_rls('public.calendar_accounts');
SELECT public.__casebrain_apply_org_uuid_rls('public.sms_messages');
SELECT public.__casebrain_apply_org_uuid_rls('public.esignature_requests');

-- organisation_settings: PK is org_id uuid
DO $$
BEGIN
  IF to_regclass('public.organisation_settings') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.organisation_settings');
    DROP POLICY IF EXISTS organisation_settings_select ON public.organisation_settings;
    DROP POLICY IF EXISTS organisation_settings_all ON public.organisation_settings;
    CREATE POLICY organisation_settings_select ON public.organisation_settings
      FOR SELECT TO authenticated
      USING (org_id IN (SELECT public.casebrain_auth_org_uuids()));
    CREATE POLICY organisation_settings_write ON public.organisation_settings
      FOR ALL TO authenticated
      USING (org_id IN (SELECT public.casebrain_auth_org_uuids()))
      WITH CHECK (org_id IN (SELECT public.casebrain_auth_org_uuids()));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. Case-scoped tables (no org_id column — scope via cases.org_id)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.case_audit_events') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.case_audit_events');
    DROP POLICY IF EXISTS case_audit_events_select ON public.case_audit_events;
    DROP POLICY IF EXISTS case_audit_events_insert ON public.case_audit_events;
    CREATE POLICY case_audit_events_select ON public.case_audit_events
      FOR SELECT TO authenticated
      USING (public.casebrain_case_in_auth_org(case_id));
    CREATE POLICY case_audit_events_insert ON public.case_audit_events
      FOR INSERT TO authenticated
      WITH CHECK (public.casebrain_case_in_auth_org(case_id));
  END IF;

  IF to_regclass('public.case_analysis_history') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.case_analysis_history');
    DROP POLICY IF EXISTS case_analysis_history_select ON public.case_analysis_history;
    CREATE POLICY case_analysis_history_select ON public.case_analysis_history
      FOR SELECT TO authenticated
      USING (public.casebrain_case_in_auth_org(case_id));
    CREATE POLICY case_analysis_history_insert ON public.case_analysis_history
      FOR INSERT TO authenticated
      WITH CHECK (public.casebrain_case_in_auth_org(case_id));
  END IF;

  IF to_regclass('public.case_notes') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.case_notes');
    DROP POLICY IF EXISTS case_notes_org ON public.case_notes;
    CREATE POLICY case_notes_select ON public.case_notes
      FOR SELECT TO authenticated
      USING (public.casebrain_case_in_auth_org(case_id));
    CREATE POLICY case_notes_write ON public.case_notes
      FOR ALL TO authenticated
      USING (public.casebrain_case_in_auth_org(case_id))
      WITH CHECK (public.casebrain_case_in_auth_org(case_id));
  END IF;

  IF to_regclass('public.case_bundles') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.case_bundles');
    CREATE POLICY case_bundles_select ON public.case_bundles
      FOR SELECT TO authenticated
      USING (public.casebrain_case_in_auth_org(case_id));
    CREATE POLICY case_bundles_write ON public.case_bundles
      FOR ALL TO authenticated
      USING (public.casebrain_case_in_auth_org(case_id))
      WITH CHECK (public.casebrain_case_in_auth_org(case_id));
  END IF;

  IF to_regclass('public.bundle_chunks') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.bundle_chunks');
    CREATE POLICY bundle_chunks_select ON public.bundle_chunks
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.case_bundles b
          WHERE b.id = bundle_chunks.bundle_id
            AND public.casebrain_case_in_auth_org(b.case_id)
        )
      );
  END IF;

  IF to_regclass('public.email_attachments') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.email_attachments');
    CREATE POLICY email_attachments_select ON public.email_attachments
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.emails e
          WHERE e.id = email_attachments.email_id
            AND e.org_id IN (SELECT public.casebrain_auth_org_ids())
        )
      );
  END IF;

  IF to_regclass('public.document_version_comments') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.document_version_comments');
    CREATE POLICY document_version_comments_select ON public.document_version_comments
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.document_versions dv
          WHERE dv.id = document_version_comments.version_id
            AND dv.org_id IN (SELECT public.casebrain_auth_org_ids())
        )
      );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. users — self profile only (no public directory)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS deny_anon_all_users ON public.users;
    DROP POLICY IF EXISTS casebrain_deny_anon ON public.users;
    CREATE POLICY casebrain_deny_anon ON public.users
      FOR ALL TO anon USING (false) WITH CHECK (false);

    DROP POLICY IF EXISTS users_select_self ON public.users;
    DROP POLICY IF EXISTS users_update_self ON public.users;
    CREATE POLICY users_select_self ON public.users
      FOR SELECT TO authenticated
      USING (id = auth.uid()::text);
    CREATE POLICY users_update_self ON public.users
      FOR UPDATE TO authenticated
      USING (id = auth.uid()::text)
      WITH CHECK (id = auth.uid()::text);
    -- INSERT: service role only (ensureSupabaseUser via admin client)
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 10. organisations / organisation_members — membership visibility
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.organisations') IS NOT NULL THEN
    ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.organisations FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS organisations_select_member ON public.organisations;
    CREATE POLICY organisations_select_member ON public.organisations
      FOR SELECT TO authenticated
      USING (id IN (SELECT public.casebrain_auth_org_uuids()));
    -- writes via service role (billing/paywall)
  END IF;

  IF to_regclass('public.organisation_members') IS NOT NULL THEN
    ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.organisation_members FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS organisation_members_select_self ON public.organisation_members;
    CREATE POLICY organisation_members_select_self ON public.organisation_members
      FOR SELECT TO authenticated
      USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 11. criminal_law_chunks — no direct client access; RPC only (admin ingests)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.criminal_law_chunks') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public.criminal_law_chunks');
    -- No authenticated policies: SELECT/INSERT blocked at table level.
  END IF;
END $$;

-- Harden RPC used by lib/criminal/criminal-law-corpus.ts
CREATE OR REPLACE FUNCTION public.match_criminal_law_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source text,
  title text,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.source,
    c.title,
    c.content_text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.criminal_law_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

REVOKE ALL ON FUNCTION public.match_criminal_law_chunks(vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_criminal_law_chunks(vector, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_criminal_law_chunks(vector, int) TO service_role;

-- -----------------------------------------------------------------------------
-- 12. Service-role-only tables (paywall abuse, cache, legacy mail, etc.)
-- -----------------------------------------------------------------------------

SELECT public.__casebrain_lock_table_service_only('public.abuse_tracker');
SELECT public.__casebrain_lock_table_service_only('public.usage_counters');
SELECT public.__casebrain_lock_table_service_only('public.phone_trials_used');
SELECT public.__casebrain_lock_table_service_only('public.app_events');
SELECT public.__casebrain_lock_table_service_only('public.llm_cache');
SELECT public.__casebrain_lock_table_service_only('public.audit_log');
SELECT public.__casebrain_lock_table_service_only('public.case_analysis');
SELECT public.__casebrain_lock_table_service_only('public.mail_messages');
SELECT public.__casebrain_lock_table_service_only('public.builder_jobs');
SELECT public.__casebrain_lock_table_service_only('public.task_log');
SELECT public.__casebrain_lock_table_service_only('public.portal_sessions');
SELECT public.__casebrain_lock_table_service_only('public.report_schedules');
SELECT public.__casebrain_lock_table_service_only('public.report_runs');
SELECT public.__casebrain_lock_table_service_only('public.esignature_events');
SELECT public.__casebrain_lock_table_service_only('public.case_calls');
SELECT public.__casebrain_lock_table_service_only('public.attendance_notes');
SELECT public.__casebrain_lock_table_service_only('public.case_embeddings');
SELECT public.__casebrain_lock_table_service_only('public.document_embeddings');
SELECT public.__casebrain_lock_table_service_only('public.letter_embeddings');
SELECT public.__casebrain_lock_table_service_only('public.entities');
SELECT public.__casebrain_lock_table_service_only('public.entity_links');
SELECT public.__casebrain_lock_table_service_only('public.housing_letter_templates');

-- letterTemplates (quoted identifier)
DO $$
BEGIN
  IF to_regclass('public."letterTemplates"') IS NOT NULL THEN
    PERFORM public.__casebrain_lock_table_service_only('public."letterTemplates"');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 13. Security definer views → security invoker (Postgres 15+)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  has_status boolean;
  sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'status'
  ) INTO has_status;

  IF to_regclass('public.case_metrics') IS NOT NULL THEN
    EXECUTE 'DROP VIEW IF EXISTS public.case_metrics CASCADE';
    sql := 'CREATE VIEW public.case_metrics WITH (security_invoker = true) AS
            SELECT c.id AS case_id, c.title, c.org_id, ';
    IF has_status THEN
      sql := sql || 'c.status::text AS status ';
    ELSE
      sql := sql || 'NULL::text AS status ';
    END IF;
    sql := sql || 'FROM public.cases c';
    EXECUTE sql;
    REVOKE ALL ON public.case_metrics FROM PUBLIC;
    GRANT SELECT ON public.case_metrics TO authenticated;
    GRANT SELECT ON public.case_metrics TO service_role;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.template_metrics') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.template_metrics SET (security_invoker = true)';
    REVOKE ALL ON public.template_metrics FROM PUBLIC;
    GRANT SELECT ON public.template_metrics TO authenticated;
    GRANT SELECT ON public.template_metrics TO service_role;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'template_metrics view not altered: %', SQLERRM;
END $$;

-- -----------------------------------------------------------------------------
-- 14. Drop helper macros (leave auth helpers)
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.__casebrain_lock_table_service_only(text);
DROP FUNCTION IF EXISTS public.__casebrain_apply_org_text_rls(text);
DROP FUNCTION IF EXISTS public.__casebrain_apply_org_uuid_rls(text);

COMMIT;

-- =============================================================================
-- STORAGE (run separately after confirming bucket list — NOT auto-applied here)
-- =============================================================================
-- Confirmed in codebase: env.SUPABASE_STORAGE_BUCKET default "casebrain-documents"
-- (lib/env.ts, app/api/upload/route.ts, app/api/files/[fileId]/view/route.ts)
--
-- Recommended:
--   UPDATE storage.buckets SET public = false WHERE id = 'casebrain-documents';
--
-- Example objects policies (adjust path pattern after inspecting storage.objects):
--
--   CREATE POLICY casebrain_objects_select ON storage.objects
--     FOR SELECT TO authenticated
--     USING (
--       bucket_id = 'casebrain-documents'
--       AND (storage.foldername(name))[1] IN (SELECT public.casebrain_auth_org_ids())
--     );
--
--   CREATE POLICY casebrain_objects_insert ON storage.objects
--     FOR INSERT TO authenticated
--     WITH CHECK (
--       bucket_id = 'casebrain-documents'
--       AND (storage.foldername(name))[1] IN (SELECT public.casebrain_auth_org_ids())
--     );
--
-- Server routes already use signed URLs via service role; private bucket is safe.
