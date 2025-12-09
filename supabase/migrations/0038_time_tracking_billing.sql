-- ============================================================================
-- TIME TRACKING & BILLING SYSTEM
-- ============================================================================
-- Comprehensive time tracking and billing system to match/exceed Clio

-- ============================================================================
-- TIME ENTRIES (Extend existing table)
-- ============================================================================

-- Extend existing time_entries table with billing fields
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS billing_rate_id UUID,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS practice_area TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'billed', 'written_off')),
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing time_entries to use new column names
DO $$
BEGIN
  -- Migrate 'billable' to 'is_billable' if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'billable') THEN
    UPDATE public.time_entries SET is_billable = billable WHERE is_billable IS NULL;
    ALTER TABLE public.time_entries DROP COLUMN IF EXISTS billable;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_time_entries_is_billed ON time_entries(is_billed);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);

-- ============================================================================
-- TIME ENTRIES (Original table - keep for reference)
-- ============================================================================

-- Table already exists from migration 0034, just extending it above
-- All new columns and indexes have been added above

-- ============================================================================
-- BILLING RATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT, -- NULL = default rate for role
  role TEXT, -- 'partner', 'solicitor', 'paralegal', 'trainee'
  practice_area TEXT, -- NULL = applies to all practice areas
  
  -- Rate details
  hourly_rate NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  
  -- Validity
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ, -- NULL = currently active
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_rates_org_id ON billing_rates(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_rates_user_id ON billing_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_rates_role ON billing_rates(role);
CREATE INDEX IF NOT EXISTS idx_billing_rates_effective_from ON billing_rates(effective_from);

-- ============================================================================
-- INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  client_id TEXT, -- References clients table (if exists) or case client
  
  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE, -- Auto-generated: INV-YYYY-XXXX
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Amounts
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Sum of line items
  tax_rate NUMERIC(5, 2) DEFAULT 0, -- VAT rate (e.g., 20.00 for 20%)
  tax_amount NUMERIC(10, 2) DEFAULT 0, -- Calculated: subtotal * (tax_rate / 100)
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Calculated: subtotal + tax_amount
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'written_off'
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  
  -- Payment terms
  payment_terms_days INTEGER DEFAULT 30,
  late_fee_rate NUMERIC(5, 2) DEFAULT 0, -- Percentage
  
  -- Metadata
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_case_id ON invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date DESC);

-- ============================================================================
-- INVOICE LINE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item details
  description TEXT NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1, -- Hours for time entries, units for disbursements
  unit_price NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL, -- Calculated: quantity * unit_price
  
  -- Source
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  disbursement_id UUID, -- References disbursements (PI table or general)
  
  -- Categorization
  item_type TEXT NOT NULL DEFAULT 'time', -- 'time', 'disbursement', 'fixed_fee', 'expense'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_time_entry_id ON invoice_line_items(time_entry_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer', -- 'bank_transfer', 'cheque', 'card', 'cash', 'other'
  reference TEXT, -- Payment reference number
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'failed', 'refunded'
  confirmed_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- DISBURSEMENTS (General - extends PI disbursements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Disbursement details
  description TEXT NOT NULL,
  category TEXT, -- 'expert_fees', 'court_fees', 'travel', 'photocopying', 'other'
  amount NUMERIC(10, 2) NOT NULL,
  incurred_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Billing
  is_billable BOOLEAN DEFAULT TRUE,
  is_billed BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Payment
  paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  payment_reference TEXT,
  
  -- Metadata
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_org_id ON disbursements(org_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_case_id ON disbursements(case_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_is_billed ON disbursements(is_billed);
CREATE INDEX IF NOT EXISTS idx_disbursements_invoice_id ON disbursements(invoice_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-calculate duration when end_time is set
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    
    -- Calculate total amount if hourly rate is set
    IF NEW.hourly_rate IS NOT NULL AND NEW.duration_minutes > 0 THEN
      NEW.total_amount := (NEW.duration_minutes / 60.0) * NEW.hourly_rate;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_time_entry_duration ON time_entries;
CREATE TRIGGER trg_calculate_time_entry_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- Auto-calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  line_total NUMERIC(10, 2);
  invoice_subtotal NUMERIC(10, 2);
  invoice_tax NUMERIC(10, 2);
  invoice_total NUMERIC(10, 2);
BEGIN
  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(total_price), 0) INTO invoice_subtotal
  FROM invoice_line_items
  WHERE invoice_id = NEW.id;
  
  -- Calculate tax
  invoice_tax := invoice_subtotal * (NEW.tax_rate / 100.0);
  
  -- Calculate total
  invoice_total := invoice_subtotal + invoice_tax;
  
  -- Update invoice
  UPDATE invoices
  SET 
    subtotal = invoice_subtotal,
    tax_amount = invoice_tax,
    total_amount = invoice_total,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on invoice line item insert/update
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_invoice_totals() FROM invoices WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_totals ON invoice_line_items;
CREATE TRIGGER trg_update_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Auto-update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total NUMERIC(10, 2);
  paid_total NUMERIC(10, 2);
BEGIN
  -- Get invoice total
  SELECT total_amount INTO invoice_total
  FROM invoices
  WHERE id = NEW.invoice_id;
  
  -- Get paid total
  SELECT COALESCE(SUM(amount), 0) INTO paid_total
  FROM payments
  WHERE invoice_id = NEW.invoice_id AND status = 'confirmed';
  
  -- Update invoice
  UPDATE invoices
  SET 
    paid_amount = paid_total,
    status = CASE
      WHEN paid_total >= invoice_total THEN 'paid'
      WHEN paid_total > 0 THEN 'partially_paid'
      WHEN due_date < CURRENT_DATE AND status != 'cancelled' THEN 'overdue'
      WHEN status = 'sent' THEN 'sent'
      ELSE status
    END,
    paid_at = CASE WHEN paid_total >= invoice_total THEN NOW() ELSE paid_at END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_payment_status ON payments;
CREATE TRIGGER trg_update_invoice_payment_status
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_status();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  -- Format: INV-YYYY-XXXX
  new_number := 'INV-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  NEW.invoice_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_invoice_number ON invoices;
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_rates_updated_at ON billing_rates;
CREATE TRIGGER trg_billing_rates_updated_at
  BEFORE UPDATE ON billing_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_disbursements_updated_at ON disbursements;
CREATE TRIGGER trg_disbursements_updated_at
  BEFORE UPDATE ON disbursements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

