-- ============================================================================
-- TRUST ACCOUNTING (UK-Specific)
-- ============================================================================
-- SRA-compliant client money handling

-- ============================================================================
-- TRUST ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  
  -- Account details
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  sort_code TEXT,
  currency TEXT DEFAULT 'GBP',
  
  -- Balance tracking
  opening_balance NUMERIC(15, 2) DEFAULT 0,
  current_balance NUMERIC(15, 2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_accounts_org_id ON trust_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_trust_accounts_is_active ON trust_accounts(is_active);

-- ============================================================================
-- CLIENT MONEY (Money held on behalf of clients)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_money (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  trust_account_id UUID NOT NULL REFERENCES trust_accounts(id) ON DELETE RESTRICT,
  
  -- Client details
  client_name TEXT NOT NULL,
  client_reference TEXT,
  
  -- Money details
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'deposit',
    'withdrawal',
    'transfer_in',
    'transfer_out',
    'interest',
    'fee_deduction',
    'refund'
  )),
  
  -- Transaction details
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference TEXT,
  
  -- Receipt/Invoice linking
  receipt_number TEXT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'cleared',
    'reconciled',
    'disputed',
    'voided'
  )),
  
  -- Reconciliation
  reconciled_at TIMESTAMPTZ,
  reconciled_by TEXT,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_money_org_id ON client_money(org_id);
CREATE INDEX IF NOT EXISTS idx_client_money_case_id ON client_money(case_id);
CREATE INDEX IF NOT EXISTS idx_client_money_trust_account_id ON client_money(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_client_money_transaction_date ON client_money(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_money_status ON client_money(status);
CREATE INDEX IF NOT EXISTS idx_client_money_client_name ON client_money(client_name);

-- ============================================================================
-- TRUST RECONCILIATION (Monthly reconciliation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trust_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  trust_account_id UUID NOT NULL REFERENCES trust_accounts(id) ON DELETE RESTRICT,
  
  -- Reconciliation period
  reconciliation_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Balances
  opening_balance NUMERIC(15, 2) NOT NULL,
  closing_balance NUMERIC(15, 2) NOT NULL,
  bank_balance NUMERIC(15, 2) NOT NULL, -- From bank statement
  difference NUMERIC(15, 2), -- Calculated: closing_balance - bank_balance
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'in_progress',
    'completed',
    'disputed',
    'approved'
  )),
  
  -- Approval
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_reconciliations_org_id ON trust_reconciliations(org_id);
CREATE INDEX IF NOT EXISTS idx_trust_reconciliations_trust_account_id ON trust_reconciliations(trust_account_id);
CREATE INDEX IF NOT EXISTS idx_trust_reconciliations_reconciliation_date ON trust_reconciliations(reconciliation_date DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update trust account balance when client money transaction is created
CREATE OR REPLACE FUNCTION update_trust_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type IN ('deposit', 'transfer_in', 'interest') THEN
    UPDATE trust_accounts
    SET current_balance = current_balance + NEW.amount
    WHERE id = NEW.trust_account_id;
  ELSIF NEW.transaction_type IN ('withdrawal', 'transfer_out', 'fee_deduction', 'refund') THEN
    UPDATE trust_accounts
    SET current_balance = current_balance - NEW.amount
    WHERE id = NEW.trust_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_trust_account_balance ON client_money;
CREATE TRIGGER trg_update_trust_account_balance
  AFTER INSERT ON client_money
  FOR EACH ROW
  EXECUTE FUNCTION update_trust_account_balance();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trust_accounts_updated_at ON trust_accounts;
CREATE TRIGGER trg_trust_accounts_updated_at
  BEFORE UPDATE ON trust_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_client_money_updated_at ON client_money;
CREATE TRIGGER trg_client_money_updated_at
  BEFORE UPDATE ON client_money
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_trust_reconciliations_updated_at ON trust_reconciliations;
CREATE TRIGGER trg_trust_reconciliations_updated_at
  BEFORE UPDATE ON trust_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

