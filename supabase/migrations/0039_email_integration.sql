-- ============================================================================
-- EMAIL INTEGRATION SYSTEM
-- ============================================================================
-- Comprehensive email integration to match/exceed Clio

-- ============================================================================
-- EMAIL ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user ID
  
  -- Email account details
  email_address TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'gmail', 'outlook', 'imap', 'smtp'
  display_name TEXT,
  
  -- OAuth tokens (encrypted)
  access_token_encrypted TEXT, -- Encrypted OAuth access token
  refresh_token_encrypted TEXT, -- Encrypted OAuth refresh token
  expires_at TIMESTAMPTZ,
  
  -- IMAP/SMTP settings (if not OAuth)
  imap_host TEXT,
  imap_port INTEGER,
  imap_username TEXT,
  imap_password_encrypted TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password_encrypted TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_org_id ON email_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_email ON email_accounts(email_address);

-- ============================================================================
-- EMAILS
-- ============================================================================

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  
  -- Email details
  message_id TEXT NOT NULL UNIQUE, -- Email Message-ID header
  thread_id TEXT, -- Thread/conversation ID
  in_reply_to TEXT, -- Message-ID of parent email
  
  -- Headers
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT NOT NULL,
  
  -- Content
  body_text TEXT,
  body_html TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_draft BOOLEAN DEFAULT FALSE,
  is_sent BOOLEAN DEFAULT FALSE,
  
  -- Case linking
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  auto_linked BOOLEAN DEFAULT FALSE, -- Was this auto-linked to case?
  
  -- Dates
  received_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  
  -- Metadata
  labels TEXT[], -- Gmail labels, Outlook categories
  attachments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_org_id ON emails(org_id);
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_case_id ON emails(case_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_sent ON emails(is_sent);

-- ============================================================================
-- EMAIL ATTACHMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  
  -- Attachment details
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT, -- Path in storage (Supabase Storage)
  storage_url TEXT, -- Public URL if available
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);

-- ============================================================================
-- EMAIL THREADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  thread_id TEXT NOT NULL UNIQUE, -- Email thread ID
  
  -- Thread details
  subject TEXT,
  participants TEXT[], -- All email addresses in thread
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  
  -- Statistics
  email_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  last_email_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_threads_org_id ON email_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_case_id ON email_threads(case_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_email_at ON email_threads(last_email_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update email thread stats
CREATE OR REPLACE FUNCTION update_email_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    -- Update or create thread
    INSERT INTO email_threads (org_id, thread_id, subject, participants, last_email_at, email_count, unread_count)
    VALUES (
      NEW.org_id,
      NEW.thread_id,
      NEW.subject,
      ARRAY(SELECT DISTINCT unnest(NEW.to_emails || NEW.cc_emails || ARRAY[NEW.from_email])),
      NEW.received_at,
      1,
      CASE WHEN NOT NEW.is_read THEN 1 ELSE 0 END
    )
    ON CONFLICT (thread_id) DO UPDATE
    SET
      subject = COALESCE(EXCLUDED.subject, email_threads.subject),
      participants = (
        SELECT array_agg(DISTINCT email)
        FROM unnest(email_threads.participants || EXCLUDED.participants) AS email
      ),
      last_email_at = GREATEST(email_threads.last_email_at, EXCLUDED.last_email_at),
      email_count = email_threads.email_count + 1,
      unread_count = email_threads.unread_count + CASE WHEN NOT NEW.is_read THEN 1 ELSE 0 END,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_email_thread_stats ON emails;
CREATE TRIGGER trg_update_email_thread_stats
  AFTER INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION update_email_thread_stats();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER trg_email_accounts_updated_at
  BEFORE UPDATE ON email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_emails_updated_at ON emails;
CREATE TRIGGER trg_emails_updated_at
  BEFORE UPDATE ON emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_email_threads_updated_at ON email_threads;
CREATE TRIGGER trg_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

