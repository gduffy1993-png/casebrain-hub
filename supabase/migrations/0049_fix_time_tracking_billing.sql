-- ============================================================================
-- 4. ENSURE INVOICE NUMBER GENERATION WORKS (schema-safe)
-- ============================================================================
-- Some DBs may not have generate_invoice_number() yet (0038 may not have run).
-- Create the function + trigger if missing.

DO $$
BEGIN
  -- Create function if missing
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'generate_invoice_number'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.generate_invoice_number()
      RETURNS TRIGGER AS $$
      DECLARE
        year_part TEXT;
        seq_num INTEGER;
        new_number TEXT;
      BEGIN
        year_part := TO_CHAR(NOW(), 'YYYY');

        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
        INTO seq_num
        FROM public.invoices
        WHERE invoice_number LIKE 'INV-' || year_part || '-%';

        new_number := 'INV-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
        NEW.invoice_number := new_number;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    $fn$;

    RAISE NOTICE 'Created generate_invoice_number()';
  END IF;

  -- Create trigger if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_generate_invoice_number'
  ) THEN
    EXECUTE $trg$
      CREATE TRIGGER trg_generate_invoice_number
      BEFORE INSERT ON public.invoices
      FOR EACH ROW
      WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
      EXECUTE FUNCTION public.generate_invoice_number();
    $trg$;

    RAISE NOTICE 'Created trg_generate_invoice_number';
  END IF;
END $$;
