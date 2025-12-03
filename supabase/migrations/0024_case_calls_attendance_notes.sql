-- Case Calls / Audio Records Table
-- Stores uploaded audio files and their transcripts

CREATE TABLE IF NOT EXISTS case_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  duration INTEGER, -- seconds
  call_type TEXT NOT NULL DEFAULT 'CLIENT', -- CLIENT, OPPONENT, COURT, EXPERT, OTHER
  call_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  participants TEXT[], -- array of participant names
  transcript_text TEXT,
  status TEXT NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, PROCESSING, COMPLETED, FAILED
  error_message TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_calls_case_id ON case_calls(case_id);
CREATE INDEX IF NOT EXISTS idx_case_calls_org_id ON case_calls(org_id);
CREATE INDEX IF NOT EXISTS idx_case_calls_status ON case_calls(status);

-- Attendance Notes Table
-- Structured notes generated from calls or created manually

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
  tasks_created UUID[] DEFAULT '{}', -- references to tasks table
  key_dates JSONB DEFAULT '[]', -- array of {label, date}
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_details TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_notes_case_id ON attendance_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_org_id ON attendance_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notes_call_record_id ON attendance_notes(call_record_id);

-- Enable RLS
ALTER TABLE case_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_notes ENABLE ROW LEVEL SECURITY;

