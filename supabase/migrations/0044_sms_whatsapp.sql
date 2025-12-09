-- ============================================================================
-- SMS/WHATSAPP INTEGRATION
-- ============================================================================
-- Track SMS and WhatsApp messages sent to clients

-- ============================================================================
-- SMS MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Message details
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'whatsapp')),
  
  -- Provider
  provider TEXT NOT NULL DEFAULT 'twilio',
  provider_message_id TEXT, -- Twilio message SID or other provider ID
  
  -- Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued',
    'sent',
    'delivered',
    'failed',
    'undelivered',
    'read' -- For WhatsApp
  )),
  
  -- Dates
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ, -- For WhatsApp read receipts
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  
  -- Cost tracking
  cost NUMERIC(10, 4), -- Cost in provider currency
  currency TEXT DEFAULT 'USD',
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_org_id ON sms_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_case_id ON sms_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_to_number ON sms_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sent_at ON sms_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_provider_message_id ON sms_messages(provider_message_id);

-- ============================================================================
-- SMS CONVERSATIONS (Thread messages together)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Conversation details
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'whatsapp')),
  
  -- Statistics
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_org_id ON sms_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_case_id ON sms_conversations(case_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone_number ON sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_last_message_at ON sms_conversations(last_message_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update conversation stats when message is created
CREATE OR REPLACE FUNCTION update_sms_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or create conversation
  INSERT INTO sms_conversations (org_id, case_id, phone_number, message_type, message_count, last_message_at)
  VALUES (
    NEW.org_id,
    NEW.case_id,
    NEW.to_number,
    NEW.message_type,
    1,
    NEW.sent_at
  )
  ON CONFLICT (org_id, case_id, phone_number, message_type) DO UPDATE
  SET
    message_count = sms_conversations.message_count + 1,
    last_message_at = GREATEST(sms_conversations.last_message_at, NEW.sent_at),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint for conversations
ALTER TABLE sms_conversations
ADD CONSTRAINT unique_sms_conversation UNIQUE (org_id, case_id, phone_number, message_type);

DROP TRIGGER IF EXISTS trg_update_sms_conversation_stats ON sms_messages;
CREATE TRIGGER trg_update_sms_conversation_stats
  AFTER INSERT ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_conversation_stats();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sms_messages_updated_at ON sms_messages;
CREATE TRIGGER trg_sms_messages_updated_at
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_sms_conversations_updated_at ON sms_conversations;
CREATE TRIGGER trg_sms_conversations_updated_at
  BEFORE UPDATE ON sms_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

