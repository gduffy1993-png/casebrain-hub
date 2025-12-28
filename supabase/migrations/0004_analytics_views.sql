-- 0004_analytics_views.sql
-- Idempotent + schema-safe analytics views (cases.status optional)

DO $$
DECLARE
  has_status boolean;
  sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='cases'
      AND column_name='status'
  ) INTO has_status;

  EXECUTE 'DROP VIEW IF EXISTS public.case_metrics CASCADE';

  sql := 'CREATE VIEW public.case_metrics AS
          SELECT
            c.id AS case_id,
            c.title,
            c.org_id, ';

  IF has_status THEN
    sql := sql || 'c.status::text AS status ';
  ELSE
    sql := sql || 'NULL::text AS status ';
  END IF;

  sql := sql || '
          FROM public.cases c;';

  EXECUTE sql;
END $$;
