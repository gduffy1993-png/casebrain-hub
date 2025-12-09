-- ============================================================================
-- UNIFIED COMMUNICATION HISTORY
-- ============================================================================
-- Track all client communication (email, SMS, calls, letters) in one place

-- ============================================================================
-- COMMUNICATION EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Communication type
  communication_type TEXT NOT NULL CHECK (communication_type IN (
    'email',
    'sms',
    'whatsapp',
    'phone_call',
    'letter',
    'meeting',
    'other'
  )),
  
  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Participants
  from_participant TEXT NOT NULL, -- Email, phone number, or name
  to_participants TEXT[] NOT NULL,
  cc_participants TEXT[],
  bcc_participants TEXT[],
  
  -- Content
  subject TEXT, -- For emails/letters
  body_text TEXT,
  body_html TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'draft',
    'sent',
    'delivered',
    'read',
    'failed',
    'cancelled'
  )),
  
  -- Dates
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Duration (for calls)
  duration_seconds INTEGER,
  
  -- Links to source records
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  letter_id UUID REFERENCES letters(id) ON DELETE SET NULL,
  call_id UUID REFERENCES case_calls(id) ON DELETE SET NULL,
  
  -- Metadata
  attachments_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_events_org_id ON communication_events(org_id);
CREATE INDEX IF NOT EXISTS idx_communication_events_case_id ON communication_events(case_id);
CREATE INDEX IF NOT EXISTS idx_communication_events_communication_type ON communication_events(communication_type);
CREATE INDEX IF NOT EXISTS idx_communication_events_direction ON communication_events(direction);
CREATE INDEX IF NOT EXISTS idx_communication_events_sent_at ON communication_events(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_events_from_participant ON communication_events(from_participant);

-- ============================================================================
-- COMMUNICATION THREADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Thread details
  thread_subject TEXT,
  participants TEXT[] NOT NULL, -- All participants in thread
  communication_types TEXT[] NOT NULL, -- Types of communication in thread
  
  -- Statistics
  event_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_threads_org_id ON communication_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_communication_threads_case_id ON communication_threads(case_id);
CREATE INDEX IF NOT EXISTS idx_communication_threads_last_event_at ON communication_threads(last_event_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_communication_events_updated_at ON communication_events;
CREATE TRIGGER trg_communication_events_updated_at
  BEFORE UPDATE ON communication_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_communication_threads_updated_at ON communication_threads;
CREATE TRIGGER trg_communication_threads_updated_at
  BEFORE UPDATE ON communication_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

