-- ============================================================================
-- FIX TIME TRACKING & BILLING ISSUES
-- ============================================================================
-- Fixes schema mismatches and missing functionality

-- ============================================================================
-- 1. FIX TIME_ENTRIES ORG_ID TYPE
-- ============================================================================
-- time_entries was created with org_id uuid, but should be TEXT to match Clerk org IDs

DO $$
BEGIN
  -- Check if org_id is UUID type and needs conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' 
    AND column_name = 'org_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Convert UUID to TEXT
    ALTER TABLE time_entries 
    ALTER COLUMN org_id TYPE TEXT USING org_id::TEXT;
    
    RAISE NOTICE 'Converted time_entries.org_id from UUID to TEXT';
  END IF;
END $$;

-- ============================================================================
-- 2. FIX ACTIVITY_TYPE VALUES
-- ============================================================================
-- Original table has different values than code expects

DO $$
BEGIN
  -- Update activity_type constraint to match code expectations
  ALTER TABLE time_entries 
  DROP CONSTRAINT IF EXISTS time_entries_activity_type_check;
  
  ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_activity_type_check 
  CHECK (activity_type IN (
    'drafting', 'research', 'meeting', 'call', 'review', 
    'court', 'travel', 'general', 'client_call', 'court_attendance', 
    'correspondence', 'admin'
  ));
  
  -- Map old values to new values
  UPDATE time_entries 
  SET activity_type = CASE
    WHEN activity_type = 'client_call' THEN 'call'
    WHEN activity_type = 'court_attendance' THEN 'court'
    WHEN activity_type = 'correspondence' THEN 'general'
    WHEN activity_type = 'admin' THEN 'general'
    ELSE activity_type
  END
  WHERE activity_type IN ('client_call', 'court_attendance', 'correspondence', 'admin');
  
  RAISE NOTICE 'Updated activity_type values';
END $$;

-- ============================================================================
-- 3. ENSURE INVOICE CALCULATION TRIGGER EXISTS
-- ============================================================================

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  line_subtotal NUMERIC(10, 2);
  calculated_tax NUMERIC(10, 2);
  calculated_total NUMERIC(10, 2);
BEGIN
  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(total_price), 0)
  INTO line_subtotal
  FROM invoice_line_items
  WHERE invoice_id = NEW.id;
  
  -- Calculate tax
  calculated_tax := line_subtotal * (COALESCE(NEW.tax_rate, 0) / 100);
  
  -- Calculate total
  calculated_total := line_subtotal + calculated_tax;
  
  -- Update invoice with calculated values
  NEW.subtotal := line_subtotal;
  NEW.tax_amount := calculated_tax;
  NEW.total_amount := calculated_total;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate totals when invoice is created/updated
DROP TRIGGER IF EXISTS trg_calculate_invoice_totals ON invoices;
CREATE TRIGGER trg_calculate_invoice_totals
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- Also trigger when line items change
CREATE OR REPLACE FUNCTION recalculate_invoice_on_line_item_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate invoice totals when line items change
  UPDATE invoices
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_invoice_on_line_item_change ON invoice_line_items;
CREATE TRIGGER trg_recalculate_invoice_on_line_item_change
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_invoice_on_line_item_change();

-- ============================================================================
-- 4. ENSURE INVOICE NUMBER GENERATION WORKS
-- ============================================================================

-- Make sure invoice_number generation trigger exists (from 0038)
-- This should already exist, but ensure it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_generate_invoice_number'
  ) THEN
    -- Recreate the trigger if it doesn't exist
    CREATE TRIGGER trg_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();
    
    RAISE NOTICE 'Created invoice number generation trigger';
  END IF;
END $$;

-- ============================================================================
-- 5. FIX MISSING COLUMNS IN TIME_ENTRIES
-- ============================================================================

-- Ensure all columns from migration 0038 exist
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS billing_rate_id UUID,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS practice_area TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS approved_by TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update status constraint
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_status_check;
  
  -- Add new constraint
  ALTER TABLE time_entries
  ADD CONSTRAINT time_entries_status_check 
  CHECK (status IN ('draft', 'submitted', 'approved', 'billed', 'written_off'));
END $$;

-- Migrate old 'billable' column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'time_entries' 
    AND column_name = 'billable'
  ) THEN
    UPDATE time_entries 
    SET is_billable = billable 
    WHERE is_billable IS NULL;
    
    ALTER TABLE time_entries DROP COLUMN IF EXISTS billable;
    
    RAISE NOTICE 'Migrated billable to is_billable';
  END IF;
END $$;

-- ============================================================================
-- 6. ADD MISSING INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_time_entries_org_id ON time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_billed ON time_entries(is_billed);
CREATE INDEX IF NOT EXISTS idx_time_entries_invoice_id ON time_entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_end_time ON time_entries(end_time);

-- ============================================================================
-- 7. FIX DURATION CALCULATION
-- ============================================================================
-- The generated column might not work if end_time is null, so add a function

CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  ELSE
    NEW.duration_minutes := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_time_entry_duration ON time_entries;
CREATE TRIGGER trg_calculate_time_entry_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- ============================================================================
-- 8. ENSURE BILLING_RATES TABLE EXISTS
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

