-- Correspondence Tracking Table
-- Tracks outgoing letters, emails, forms for smart chasers

CREATE TABLE IF NOT EXISTS correspondence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'LETTER', -- LETTER, EMAIL, FORM
  template_id TEXT,
  subject TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_type TEXT DEFAULT 'OPPONENT', -- CLIENT, OPPONENT, COURT, EXPERT, OTHER
  content_summary TEXT,
  sent_at TIMESTAMPTZ,
  expected_response_days INTEGER DEFAULT 14,
  chase_due_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, RESPONSE_RECEIVED, CHASER_DUE, CHASER_SENT
  chaser_count INTEGER DEFAULT 0,
  last_chaser_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_correspondence_case_id ON correspondence(case_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_org_id ON correspondence(org_id);
CREATE INDEX IF NOT EXISTS idx_correspondence_status ON correspondence(status);
CREATE INDEX IF NOT EXISTS idx_correspondence_chase_due ON correspondence(chase_due_at) WHERE response_received_at IS NULL;

-- Trigger to auto-calculate chase_due_at
CREATE OR REPLACE FUNCTION calculate_chase_due()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL AND NEW.expected_response_days IS NOT NULL THEN
    NEW.chase_due_at := NEW.sent_at + (NEW.expected_response_days || ' days')::INTERVAL;
    IF NEW.response_received_at IS NULL THEN
      NEW.status := 'SENT';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_correspondence_chase_due ON correspondence;
CREATE TRIGGER trg_correspondence_chase_due
  BEFORE INSERT OR UPDATE ON correspondence
  FOR EACH ROW
  EXECUTE FUNCTION calculate_chase_due();

-- Enable RLS
ALTER TABLE correspondence ENABLE ROW LEVEL SECURITY;

