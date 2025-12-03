-- ============================================
-- CASEBRAIN MISSING TABLES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CASE NOTES TABLE
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

CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_org_id ON case_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON case_notes(created_at DESC);

ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;

-- 2. CASE CALLS (AUDIO) TABLE
CREATE TABLE IF NOT EXISTS case_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  duration INTEGER,
  call_type TEXT NOT NULL DEFAULT 'CLIENT',
  call_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  participants TEXT[],
  transcript_text TEXT,
  status TEXT NOT NULL DEFAULT 'UPLOADED',
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_calls_case_id ON case_calls(case_id);
CREATE INDEX IF NOT EXISTS idx_case_calls_org_id ON case_calls(org_id);
CREATE INDEX IF NOT EXISTS idx_case_calls_status ON case_calls(status);

ALTER TABLE case_calls ENABLE ROW LEVEL SECURITY;

-- 3. ATTENDANCE NOTES TABLE
CREATE TABLE IF NOT EXISTS attendance_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  call_record_id UUID REFERENCES case_calls(id) ON DELETE SET NULL,
  org_id TEXT NOT NULL,
  note_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attendees TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  advice_given TEXT[] DEFAULT '{}',
  issues_discussed TEXT[] DEFAULT '{}',
  risks_identified TEXT[] DEFAULT '{}',
  tasks_created UUID[] DEFAULT '{}',
  key_dates JSONB DEFAULT '[]',
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_details TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_notes_case_id ON attendance_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_org_id ON attendance_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_call_record_id ON attendance_notes(call_record_id);

ALTER TABLE attendance_notes ENABLE ROW LEVEL SECURITY;

-- 4. CLIENT UPDATE & OPPONENT TRACKING COLUMNS ON CASES
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_update_last_generated_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_update_preview TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opponent_last_contact_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS opponent_avg_response_days INTEGER;

-- 5. CASE BUNDLES TABLE
CREATE TABLE IF NOT EXISTS case_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  bundle_name TEXT NOT NULL,
  file_url TEXT,
  page_count INTEGER,
  phase_a_summary TEXT,
  detected_sections JSONB DEFAULT '[]',
  is_partial_analysis BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_bundles_case_id ON case_bundles(case_id);
CREATE INDEX IF NOT EXISTS idx_case_bundles_org_id ON case_bundles(org_id);

ALTER TABLE case_bundles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE! All tables created.
-- ============================================

