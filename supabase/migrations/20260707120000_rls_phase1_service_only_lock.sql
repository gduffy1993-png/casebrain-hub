-- =============================================================================
-- Phase 1 — RLS service-only lock (Gate A)
-- =============================================================================
-- Applied manually in Supabase (verified clean). Idempotent re-run safe.
--
-- Per existing Phase 1 table (skips missing relations):
--   1. ENABLE ROW LEVEL SECURITY
--   2. REVOKE ALL ON TABLE … FROM anon, authenticated
--   3. CREATE POLICY casebrain_p1_deny_anon IF MISSING (FOR ALL TO anon, deny)
--   4. PRESERVE all other existing policies (no DROP POLICY loop)
--
-- Views (non-destructive — no DROP/CREATE):
--   ALTER VIEW … SET (security_invoker = true) when present
--
-- Service role (getSupabaseAdminClient) bypasses RLS — server routes unchanged.
--
-- Applied verification (26 existing Phase 1 tables in production):
--   existing_phase1_tables = 26
--   rls_enabled_tables = 26
--   deny_anon_policies = 26
--   remaining_anon_authenticated_grants = 0
--   case_metrics options = security_invoker=true
--   template_metrics options = security_invoker=true
--
-- EXCLUDED (not modified in Phase 1):
--   cases, documents, templates, letters, deadlines, risk_flags, tasks
--   criminal_cases, criminal_charges, criminal_hearings, criminal_evidence,
--   pace_compliance, disclosure_tracker, criminal_loopholes, defense_strategies,
--   criminal_disclosure_timeline
--   case_positions, case_strategy_commitments, case_disclosure_chasers,
--   win_story_snapshots, case_analysis_versions, evidence_items
--   reasoning_feedback, supervisor_signoffs, evidence_change_snapshots,
--   export_reviews, case_review_audit_events, trust_feedback
--   eval_sweep_runs, eval_sweep_rows, criminal_law_chunks
--   organisations, organisation_members, users
--   housing_*, sms_messages, calendar_*, custom_reports (Phase 2)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper: enable RLS, revoke PostgREST grants, ensure deny-anon policy exists.
-- Does NOT drop or alter any other policy.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.casebrain_phase1_harden_service_only(
  p_schema text,
  p_table text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qualified text;
  deny_policy text := 'casebrain_p1_deny_anon';
  has_deny_anon boolean;
BEGIN
  qualified := format('%I.%I', p_schema, p_table);

  IF to_regclass(qualified) IS NULL THEN
    RAISE NOTICE 'casebrain_phase1: skip % (relation not found)', qualified;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', qualified);

  BEGIN
    EXECUTE format('REVOKE ALL ON TABLE %s FROM anon', qualified);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'casebrain_phase1: revoke anon on % skipped: %', qualified, SQLERRM;
  END;

  BEGIN
    EXECUTE format('REVOKE ALL ON TABLE %s FROM authenticated', qualified);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'casebrain_phase1: revoke authenticated on % skipped: %', qualified, SQLERRM;
  END;

  SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = p_schema
      AND tablename = p_table
      AND policyname = deny_policy
  ) INTO has_deny_anon;

  IF has_deny_anon THEN
    RAISE NOTICE 'casebrain_phase1: % already has policy % — preserved', qualified, deny_policy;
  ELSE
    EXECUTE format(
      'CREATE POLICY %I ON %s FOR ALL TO anon USING (false) WITH CHECK (false)',
      deny_policy,
      qualified
    );
    RAISE NOTICE 'casebrain_phase1: created policy % on %', deny_policy, qualified;
  END IF;

  RAISE NOTICE 'casebrain_phase1: hardened % (RLS on, grants revoked, other policies preserved)', qualified;
END;
$$;

REVOKE ALL ON FUNCTION public.casebrain_phase1_harden_service_only(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.casebrain_phase1_harden_service_only(text, text) TO postgres;

-- Phase 1 target table list (27 names; typically 26 exist — documents_versions often absent)
-- Group A — Platform audit log
SELECT public.casebrain_phase1_harden_service_only('public', 'audit_log');

-- Group B — Email integration
SELECT public.casebrain_phase1_harden_service_only('public', 'email_accounts');
SELECT public.casebrain_phase1_harden_service_only('public', 'emails');
SELECT public.casebrain_phase1_harden_service_only('public', 'email_threads');
SELECT public.casebrain_phase1_harden_service_only('public', 'email_attachments');

-- Group C — Billing / invoicing
SELECT public.casebrain_phase1_harden_service_only('public', 'invoices');
SELECT public.casebrain_phase1_harden_service_only('public', 'invoice_line_items');
SELECT public.casebrain_phase1_harden_service_only('public', 'payments');
SELECT public.casebrain_phase1_harden_service_only('public', 'billing_rates');
SELECT public.casebrain_phase1_harden_service_only('public', 'disbursements');

-- Group D — Trust accounting
SELECT public.casebrain_phase1_harden_service_only('public', 'trust_accounts');
SELECT public.casebrain_phase1_harden_service_only('public', 'client_money');
SELECT public.casebrain_phase1_harden_service_only('public', 'trust_reconciliations');

-- Group E — Legacy criminal DB snapshots
SELECT public.casebrain_phase1_harden_service_only('public', 'criminal_cases_legacy_20251217001918');
SELECT public.casebrain_phase1_harden_service_only('public', 'criminal_charges_legacy_20251217001918');
SELECT public.casebrain_phase1_harden_service_only('public', 'criminal_hearings_legacy_20251217001918');
SELECT public.casebrain_phase1_harden_service_only('public', 'pace_compliance_legacy_20251217001918');
SELECT public.casebrain_phase1_harden_service_only('public', 'disclosure_tracker_legacy_20251217001918');

-- Group F — Document version control
SELECT public.casebrain_phase1_harden_service_only('public', 'documents_versions');
SELECT public.casebrain_phase1_harden_service_only('public', 'document_versions');
SELECT public.casebrain_phase1_harden_service_only('public', 'document_version_comments');
SELECT public.casebrain_phase1_harden_service_only('public', 'document_locks');

-- Group G — Enterprise audit / analysis snapshots
SELECT public.casebrain_phase1_harden_service_only('public', 'case_audit_events');
SELECT public.casebrain_phase1_harden_service_only('public', 'case_analysis_history');

-- Group H — Server-side LLM cache
SELECT public.casebrain_phase1_harden_service_only('public', 'llm_cache');

-- Group I — Criminal verdict ratings metadata
SELECT public.casebrain_phase1_harden_service_only('public', 'criminal_verdict_ratings');

-- -----------------------------------------------------------------------------
-- Group J — Views: security_invoker only (no DROP/CREATE — preserves view SQL)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.case_metrics') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER VIEW public.case_metrics SET (security_invoker = true)';
      RAISE NOTICE 'casebrain_phase1: set security_invoker on public.case_metrics';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'casebrain_phase1: case_metrics not altered: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'casebrain_phase1: skip public.case_metrics (view not found)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.template_metrics') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER VIEW public.template_metrics SET (security_invoker = true)';
      RAISE NOTICE 'casebrain_phase1: set security_invoker on public.template_metrics';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'casebrain_phase1: template_metrics not altered: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'casebrain_phase1: skip public.template_metrics (view not found)';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.casebrain_phase1_harden_service_only(text, text);

COMMIT;

-- =============================================================================
-- POST-APPLY VERIFICATION (expected clean state after Gate A)
-- =============================================================================
--
-- -- Count existing Phase 1 tables
-- WITH phase1 AS (
--   SELECT unnest(ARRAY[
--     'audit_log','email_accounts','emails','email_threads','email_attachments',
--     'invoices','invoice_line_items','payments','billing_rates','disbursements',
--     'client_money','trust_accounts','trust_reconciliations',
--     'criminal_cases_legacy_20251217001918','criminal_charges_legacy_20251217001918',
--     'criminal_hearings_legacy_20251217001918','pace_compliance_legacy_20251217001918',
--     'disclosure_tracker_legacy_20251217001918',
--     'documents_versions','document_versions','document_version_comments','document_locks',
--     'case_audit_events','case_analysis_history','llm_cache','criminal_verdict_ratings'
--   ]) AS tablename
-- )
-- SELECT
--   (SELECT count(*) FROM phase1 p
--    JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = p.tablename) AS existing_phase1_tables,
--   (SELECT count(*) FROM phase1 p
--    JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = p.tablename
--    WHERE t.rowsecurity) AS rls_enabled_tables,
--   (SELECT count(*) FROM pg_policies pol
--    JOIN phase1 p ON pol.schemaname = 'public' AND pol.tablename = p.tablename
--    WHERE pol.policyname = 'casebrain_p1_deny_anon') AS deny_anon_policies;
-- -- PASS: existing_phase1_tables = rls_enabled_tables = deny_anon_policies (26 in prod)
--
-- -- Remaining anon/authenticated table grants on Phase 1 tables
-- WITH phase1 AS (
--   SELECT unnest(ARRAY[
--     'audit_log','email_accounts','emails','email_threads','email_attachments',
--     'invoices','invoice_line_items','payments','billing_rates','disbursements',
--     'client_money','trust_accounts','trust_reconciliations',
--     'criminal_cases_legacy_20251217001918','criminal_charges_legacy_20251217001918',
--     'criminal_hearings_legacy_20251217001918','pace_compliance_legacy_20251217001918',
--     'disclosure_tracker_legacy_20251217001918',
--     'documents_versions','document_versions','document_version_comments','document_locks',
--     'case_audit_events','case_analysis_history','llm_cache','criminal_verdict_ratings'
--   ]) AS tablename
-- )
-- SELECT count(*) AS remaining_anon_authenticated_grants
-- FROM information_schema.table_privileges tp
-- JOIN phase1 p ON tp.table_schema = 'public' AND tp.table_name = p.tablename
-- WHERE tp.grantee IN ('anon', 'authenticated');
-- -- PASS: remaining_anon_authenticated_grants = 0
--
-- -- View security invoker
-- SELECT c.relname AS viewname,
--        COALESCE(c.reloptions::text, '') AS options
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relkind = 'v'
--   AND c.relname IN ('case_metrics', 'template_metrics');
-- -- PASS: options contains security_invoker=true for each existing view
--
-- Anon PostgREST probes (expect permission error or 0 rows):
--   GET /rest/v1/trust_accounts?select=id
--   GET /rest/v1/emails?select=id
--   GET /rest/v1/llm_cache?select=id

-- =============================================================================
-- ROLLBACK NOTES (manual — use pre-flight policy archive if needed)
-- =============================================================================
-- Option A: DROP POLICY IF EXISTS casebrain_p1_deny_anon ON public.<table>;
-- Option B: GRANT … TO authenticated/anon (staging only, not recommended)
-- Option C: ALTER TABLE … DISABLE ROW LEVEL SECURITY (staging only)
-- Views: ALTER VIEW … SET (security_invoker = false) if needed
