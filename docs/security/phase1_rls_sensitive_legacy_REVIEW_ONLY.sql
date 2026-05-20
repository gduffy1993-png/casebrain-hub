-- =============================================================================
-- Phase 1 — Supabase Advisor: "RLS Disabled in Public" (REVIEW ONLY)
-- =============================================================================
-- Location: docs/security/phase1_rls_sensitive_legacy_REVIEW_ONLY.sql
-- NOT an active Supabase migration. Do not place under supabase/migrations/.
-- Do not run via `supabase db push`, CI, or automation. Do not apply until approved.
--
-- IN SCOPE:  Enable RLS + deny anon on sensitive/legacy/service-only tables below.
-- OUT OF SCOPE (Phase 1): Sensitive Columns Exposed, Security Definer views,
--   storage.objects, users table, active workflow tables (see EXCLUDED list).
--
-- SCOPE: Tables listed in Phase 1 security brief only.
-- EXCLUDED (already have RLS — do not touch): cases, documents, criminal_cases,
--   criminal_charges, criminal_hearings, case_positions, case_strategy_commitments,
--   case_disclosure_chasers, eval_sweep_runs, eval_sweep_rows, users, etc.
--
-- APP PATTERN: CaseBrain server routes use getSupabaseAdminClient() / service role
--   for these tables (lib/audit.ts, lib/email/*, lib/billing/*, lib/trust-accounting/*,
--   app/api/criminal/.../verdict-ratings, etc.). Phase 1 uses service-only RLS:
--   anon denied, no authenticated policies → PostgREST cannot read/write; service
--   role continues to work (bypasses RLS).
--
-- PRE-FLIGHT (run in Supabase SQL editor, save output):
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename IN (
--     'audit_log','email_accounts','emails','email_threads','email_attachments',
--     'invoices','invoice_line_items','payments','billing_rates','disbursements',
--     'client_money','trust_accounts','trust_reconciliations',
--     'criminal_cases_legacy_20251217001918','criminal_charges_legacy_20251217001918',
--     'criminal_hearings_legacy_20251217001918','pace_compliance_legacy_20251217001918',
--     'disclosure_tracker_legacy_20251217001918',
--     'documents_versions','document_versions','document_version_comments','document_locks',
--     'case_audit_events','case_analysis_history','llm_cache','criminal_verdict_ratings'
--   ) ORDER BY tablename;
--
--   SELECT tablename, policyname, roles, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename IN ( ... same list ... );
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper: enable RLS, drop all existing policies, deny anon (service-role-only)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.casebrain_phase1_lock_service_only(
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
  r record;
  deny_policy text := 'casebrain_p1_deny_anon';
BEGIN
  qualified := format('%I.%I', p_schema, p_table);

  IF to_regclass(qualified) IS NULL THEN
    RAISE NOTICE 'casebrain_phase1: skip % (relation not found)', qualified;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', qualified);

  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = p_schema AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', r.policyname, qualified);
  END LOOP;

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', deny_policy, qualified);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR ALL TO anon USING (false) WITH CHECK (false)',
    deny_policy,
    qualified
  );

  RAISE NOTICE 'casebrain_phase1: locked % (RLS on, anon denied, no authenticated policies)', qualified;
END;
$$;

REVOKE ALL ON FUNCTION public.casebrain_phase1_lock_service_only(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.casebrain_phase1_lock_service_only(text, text) TO postgres;

-- -----------------------------------------------------------------------------
-- Phase 1 target tables (service-only lock)
-- -----------------------------------------------------------------------------

-- Audit
SELECT public.casebrain_phase1_lock_service_only('public', 'audit_log');

-- Email (org_id TEXT on accounts/emails/threads; attachments via email_id only)
SELECT public.casebrain_phase1_lock_service_only('public', 'email_accounts');
SELECT public.casebrain_phase1_lock_service_only('public', 'emails');
SELECT public.casebrain_phase1_lock_service_only('public', 'email_threads');
SELECT public.casebrain_phase1_lock_service_only('public', 'email_attachments');

-- Billing / finance (org_id TEXT on parent tables; invoice_line_items via invoice_id)
SELECT public.casebrain_phase1_lock_service_only('public', 'invoices');
SELECT public.casebrain_phase1_lock_service_only('public', 'invoice_line_items');
SELECT public.casebrain_phase1_lock_service_only('public', 'payments');
SELECT public.casebrain_phase1_lock_service_only('public', 'billing_rates');
SELECT public.casebrain_phase1_lock_service_only('public', 'disbursements');

-- Trust accounting (highly sensitive — service role only in Phase 1)
SELECT public.casebrain_phase1_lock_service_only('public', 'trust_accounts');
SELECT public.casebrain_phase1_lock_service_only('public', 'client_money');
SELECT public.casebrain_phase1_lock_service_only('public', 'trust_reconciliations');

-- Legacy criminal snapshots (no app references — archive tables)
SELECT public.casebrain_phase1_lock_service_only('public', 'criminal_cases_legacy_20251217001918');
SELECT public.casebrain_phase1_lock_service_only('public', 'criminal_charges_legacy_20251217001918');
SELECT public.casebrain_phase1_lock_service_only('public', 'criminal_hearings_legacy_20251217001918');
SELECT public.casebrain_phase1_lock_service_only('public', 'pace_compliance_legacy_20251217001918');
SELECT public.casebrain_phase1_lock_service_only('public', 'disclosure_tracker_legacy_20251217001918');

-- Document versioning (documents_versions = typo/alias in Advisor; lock if present)
SELECT public.casebrain_phase1_lock_service_only('public', 'documents_versions');
SELECT public.casebrain_phase1_lock_service_only('public', 'document_versions');
SELECT public.casebrain_phase1_lock_service_only('public', 'document_version_comments');
SELECT public.casebrain_phase1_lock_service_only('public', 'document_locks');

-- Enterprise audit / analysis snapshots (case_id only — lib/audit.ts uses service role)
SELECT public.casebrain_phase1_lock_service_only('public', 'case_audit_events');
SELECT public.casebrain_phase1_lock_service_only('public', 'case_analysis_history');

-- LLM cache (org_id TEXT — lib/llm/cache.ts uses admin client)
SELECT public.casebrain_phase1_lock_service_only('public', 'llm_cache');

-- Verdict ratings (org_id UUID — API uses admin client; active criminal_cases NOT touched)
SELECT public.casebrain_phase1_lock_service_only('public', 'criminal_verdict_ratings');

-- Drop helper after apply (optional — comment out to keep for Phase 2)
DROP FUNCTION IF EXISTS public.casebrain_phase1_lock_service_only(text, text);

COMMIT;

-- =============================================================================
-- ROLLBACK (REVIEW ONLY — run only if Phase 1 must be reverted)
-- =============================================================================
/*
BEGIN;

-- Option A: Disable RLS (re-opens PostgREST exposure — NOT recommended for production)
ALTER TABLE IF EXISTS public.audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoice_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.billing_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disbursements DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trust_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.client_money DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trust_reconciliations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.criminal_cases_legacy_20251217001918 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.criminal_charges_legacy_20251217001918 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.criminal_hearings_legacy_20251217001918 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pace_compliance_legacy_20251217001918 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disclosure_tracker_legacy_20251217001918 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_version_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_audit_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_analysis_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.llm_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.criminal_verdict_ratings DISABLE ROW LEVEL SECURITY;

-- Option B: Remove only Phase 1 policies (keeps RLS on, restores prior policies only if you backed them up)
-- DROP POLICY IF EXISTS casebrain_p1_deny_anon ON public.audit_log;
-- ... repeat per table ...

COMMIT;
*/

-- =============================================================================
-- POST-APPLY VERIFICATION (run after manual apply in SQL editor)
-- =============================================================================
-- All Phase 1 tables should show rowsecurity = true:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename IN (
--       'audit_log','email_accounts','emails','email_threads','email_attachments',
--       'invoices','invoice_line_items','payments','billing_rates','disbursements',
--       'client_money','trust_accounts','trust_reconciliations',
--       'criminal_cases_legacy_20251217001918','criminal_charges_legacy_20251217001918',
--       'criminal_hearings_legacy_20251217001918','pace_compliance_legacy_20251217001918',
--       'disclosure_tracker_legacy_20251217001918',
--       'documents_versions','document_versions','document_version_comments','document_locks',
--       'case_audit_events','case_analysis_history','llm_cache','criminal_verdict_ratings'
--     )
--   ORDER BY tablename;
--
-- Each locked table should have exactly one policy for anon deny:
--
--   SELECT tablename, policyname, roles, cmd
--   FROM pg_policies
--   WHERE schemaname = 'public' AND policyname = 'casebrain_p1_deny_anon'
--   ORDER BY tablename;
--
-- Anon API test (expect 0 rows or permission error):
--   GET /rest/v1/trust_accounts?select=id
--   GET /rest/v1/emails?select=id
--   GET /rest/v1/payments?select=id
