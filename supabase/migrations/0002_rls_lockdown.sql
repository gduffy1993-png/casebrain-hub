-- Idempotent RLS lockdown
-- Safe to run even if some tables do not exist

DO $$
BEGIN
  -- =========================
  -- ENABLE RLS (if table exists)
  -- =========================

  IF to_regclass('public.cases') IS NOT NULL THEN
    ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.templates') IS NOT NULL THEN
    ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.letters') IS NOT NULL THEN
    ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
  END IF;

  IF to_regclass('public.deadlines') IS NOT NULL THEN
    ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
  END IF;

  -- =========================
  -- DROP OLD POLICIES (if table exists)
  -- =========================

  IF to_regclass('public.cases') IS NOT NULL THEN
    DROP POLICY IF EXISTS anon_select_cases ON public.cases;
    DROP POLICY IF EXISTS dev_all_cases ON public.cases;
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    DROP POLICY IF EXISTS anon_select_documents ON public.documents;
    DROP POLICY IF EXISTS dev_all_docs ON public.documents;
  END IF;

  IF to_regclass('public.templates') IS NOT NULL THEN
    DROP POLICY IF EXISTS anon_select_templates ON public.templates;
    DROP POLICY IF EXISTS dev_all_templates ON public.templates;
  END IF;

  IF to_regclass('public.letters') IS NOT NULL THEN
    DROP POLICY IF EXISTS anon_select_letters ON public.letters;
    DROP POLICY IF EXISTS dev_all_letters ON public.letters;
  END IF;

  IF to_regclass('public.deadlines') IS NOT NULL THEN
    DROP POLICY IF EXISTS anon_select_deadlines ON public.deadlines;
    DROP POLICY IF EXISTS dev_all_deadlines ON public.deadlines;
  END IF;

  -- =========================
  -- DENY ANON ACCESS (if table exists)
  -- =========================

  IF to_regclass('public.cases') IS NOT NULL THEN
    CREATE POLICY deny_anon_all_cases
      ON public.cases
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.documents') IS NOT NULL THEN
    CREATE POLICY deny_anon_all_docs
      ON public.documents
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.templates') IS NOT NULL THEN
    CREATE POLICY deny_anon_all_templates
      ON public.templates
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.letters') IS NOT NULL THEN
    CREATE POLICY deny_anon_all_letters
      ON public.letters
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

  IF to_regclass('public.deadlines') IS NOT NULL THEN
    CREATE POLICY deny_anon_all_deadlines
      ON public.deadlines
      FOR ALL
      USING (false)
      WITH CHECK (false);
  END IF;

END $$;
