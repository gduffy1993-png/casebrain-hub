-- ============================================================================
-- E-SIGNATURE TRACKING
-- ============================================================================
-- Track e-signature requests and status

-- ============================================================================
-- E-SIGNATURE REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS esignature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  
  -- Provider
  provider TEXT NOT NULL CHECK (provider IN ('docusign', 'hellosign', 'adobe_sign', 'other')),
  
  -- Envelope/Request details
  envelope_id TEXT, -- DocuSign envelope ID, HelloSign signature request ID, etc.
  request_id TEXT UNIQUE, -- Internal request ID
  
  -- Document details
  document_name TEXT NOT NULL,
  document_url TEXT, -- URL to document for signing
  
  -- Recipients
  recipients JSONB NOT NULL, -- Array of {email, name, role, status, signedAt}
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'sent',
    'delivered',
    'signed',
    'completed',
    'declined',
    'voided',
    'expired',
    'failed'
  )),
  
  -- Dates
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  
  -- Metadata
  email_subject TEXT,
  email_message TEXT,
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_days INTEGER DEFAULT 3,
  
  -- Provider-specific data
  provider_data JSONB, -- Store provider-specific response data
  
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esignature_requests_org_id ON esignature_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_esignature_requests_case_id ON esignature_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_esignature_requests_document_id ON esignature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_esignature_requests_envelope_id ON esignature_requests(envelope_id);
CREATE INDEX IF NOT EXISTS idx_esignature_requests_status ON esignature_requests(status);
CREATE INDEX IF NOT EXISTS idx_esignature_requests_provider ON esignature_requests(provider);

-- ============================================================================
-- E-SIGNATURE EVENTS (Webhook events from providers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS esignature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES esignature_requests(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'viewed', 'signed', 'declined', 'voided', etc.
  event_data JSONB, -- Full event payload from provider
  
  -- Provider info
  provider TEXT NOT NULL,
  provider_event_id TEXT, -- Provider's event ID
  
  -- Timestamp
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esignature_events_request_id ON esignature_events(request_id);
CREATE INDEX IF NOT EXISTS idx_esignature_events_event_type ON esignature_events(event_type);
CREATE INDEX IF NOT EXISTS idx_esignature_events_occurred_at ON esignature_events(occurred_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update request status based on events
CREATE OR REPLACE FUNCTION update_esignature_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update request status based on latest event
  UPDATE esignature_requests
  SET
    status = CASE
      WHEN NEW.event_type = 'sent' THEN 'sent'
      WHEN NEW.event_type = 'delivered' THEN 'delivered'
      WHEN NEW.event_type = 'signed' THEN 'signed'
      WHEN NEW.event_type = 'completed' THEN 'completed'
      WHEN NEW.event_type = 'declined' THEN 'declined'
      WHEN NEW.event_type = 'voided' THEN 'voided'
      WHEN NEW.event_type = 'expired' THEN 'expired'
      WHEN NEW.event_type = 'failed' THEN 'failed'
      ELSE esignature_requests.status
    END,
    sent_at = CASE WHEN NEW.event_type = 'sent' THEN NEW.occurred_at ELSE esignature_requests.sent_at END,
    completed_at = CASE WHEN NEW.event_type = 'completed' THEN NEW.occurred_at ELSE esignature_requests.completed_at END,
    voided_at = CASE WHEN NEW.event_type = 'voided' THEN NEW.occurred_at ELSE esignature_requests.voided_at END,
    updated_at = NOW()
  WHERE id = NEW.request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_esignature_request_status ON esignature_events;
CREATE TRIGGER trg_update_esignature_request_status
  AFTER INSERT ON esignature_events
  FOR EACH ROW
  EXECUTE FUNCTION update_esignature_request_status();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_esignature_requests_updated_at ON esignature_requests;
CREATE TRIGGER trg_esignature_requests_updated_at
  BEFORE UPDATE ON esignature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

