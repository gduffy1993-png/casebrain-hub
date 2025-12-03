-- Phase B: Full Bundle Analysis with Chunking and Jobs

-- Drop existing case_bundles if needed and recreate with full schema
DROP TABLE IF EXISTS bundle_chunks;
DROP TABLE IF EXISTS case_bundles CASCADE;

-- Case Bundles - tracks bundle analysis jobs
CREATE TABLE case_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  file_ref TEXT, -- reference to uploaded document
  bundle_name TEXT NOT NULL,
  total_pages INTEGER DEFAULT 0,
  analysis_level TEXT NOT NULL DEFAULT 'phase_a', -- 'phase_a' | 'full'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  
  -- Phase A summary (quick preview)
  phase_a_summary TEXT,
  detected_sections JSONB DEFAULT '[]',
  
  -- Full analysis results
  full_summary TEXT,
  full_toc JSONB DEFAULT '[]',
  full_timeline JSONB DEFAULT '[]',
  issues_map JSONB DEFAULT '[]',
  contradictions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Bundle Chunks - individual page ranges being processed
CREATE TABLE bundle_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES case_bundles(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL, -- order of chunk
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  
  -- Extracted content
  raw_text TEXT,
  
  -- AI analysis results
  ai_summary TEXT,
  doc_types JSONB DEFAULT '[]', -- detected document types in this chunk
  key_issues JSONB DEFAULT '[]', -- issues mentioned
  key_dates JSONB DEFAULT '[]', -- dates with context
  entities JSONB DEFAULT '[]', -- names, places, etc.
  
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  UNIQUE(bundle_id, chunk_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_bundles_case_id ON case_bundles(case_id);
CREATE INDEX IF NOT EXISTS idx_case_bundles_org_id ON case_bundles(org_id);
CREATE INDEX IF NOT EXISTS idx_case_bundles_status ON case_bundles(status);

CREATE INDEX IF NOT EXISTS idx_bundle_chunks_bundle_id ON bundle_chunks(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_chunks_status ON bundle_chunks(status);

-- RLS
ALTER TABLE case_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_chunks ENABLE ROW LEVEL SECURITY;

-- Update trigger for case_bundles
CREATE OR REPLACE FUNCTION update_bundle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_bundles_updated ON case_bundles;
CREATE TRIGGER trg_case_bundles_updated
  BEFORE UPDATE ON case_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_bundle_timestamp();

