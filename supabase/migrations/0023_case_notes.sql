-- Case Notes Table
-- Allows users to add notes to cases with timestamps and pinning capability

CREATE TABLE IF NOT EXISTS case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_org_id ON case_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON case_notes(created_at DESC);

-- Enable RLS
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (if using Supabase auth)
-- For now, we rely on server-side auth checks via Clerk

