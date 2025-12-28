-- =============================================================================
-- TIME TRACKING & BILLING SYSTEM (SCHEMA-SAFE)
-- =============================================================================

-- =============================================================================
-- TIME ENTRIES (EXTEND EXISTING)
-- =============================================================================

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS billing_rate_id UUID,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS practice_area TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='time_entries' AND column_name='billable'
  ) THEN
    UPDATE public.time_entries SET is_billable = billable WHERE is_billable IS NULL;
    ALTER TABLE public.time_entries DROP COLUMN billable;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_time_entries_is_billed ON public.time_entries(is_billed);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON public.time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON public.time_entries(status);

-- =============================================================================
-- BILLING RATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT,
  practice_area TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'GBP',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.billing_rates
  ADD COLUMN IF NOT EXISTS org_id TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS practice_area TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS effective_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_billing_rates_org_id ON public.billing_rates(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_rates_user_id ON public.billing_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_rates_role ON public.billing_rates(role);

-- =============================================================================
-- INVOICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_case_id ON public.invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- =============================================================================
-- INVOICE LINE ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL,
  item_type TEXT DEFAULT 'time',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  status TEXT DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- =============================================================================
-- DISBURSEMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  is_billable BOOLEAN DEFAULT TRUE,
  is_billed BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES public.invoices(id),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_case_id ON public.disbursements(case_id);

-- =============================================================================
-- TRIGGERS (SAFE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.safe_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_rates_updated_at ON public.billing_rates;
CREATE TRIGGER trg_billing_rates_updated_at
BEFORE UPDATE ON public.billing_rates
FOR EACH ROW EXECUTE FUNCTION public.safe_set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.safe_set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.safe_set_updated_at();

DROP TRIGGER IF EXISTS trg_disbursements_updated_at ON public.disbursements;
CREATE TRIGGER trg_disbursements_updated_at
BEFORE UPDATE ON public.disbursements
FOR EACH ROW EXECUTE FUNCTION public.safe_set_updated_at();
