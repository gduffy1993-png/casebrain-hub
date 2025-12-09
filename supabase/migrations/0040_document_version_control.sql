-- ============================================================================
-- DOCUMENT VERSION CONTROL
-- ============================================================================
-- Track document versions, changes, and enable restore

-- ============================================================================
-- DOCUMENT VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  
  -- Version details
  version_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  version_name TEXT, -- Optional: "v1.0", "Final", "Draft 2", etc.
  
  -- File details
  file_name TEXT NOT NULL,
  file_size INTEGER,
  storage_path TEXT NOT NULL, -- Path in storage
  storage_url TEXT, -- Public URL if available
  content_hash TEXT, -- SHA-256 hash of file content for deduplication
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Change tracking
  change_summary TEXT, -- What changed in this version
  changed_by TEXT, -- Who made the change
  parent_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL, -- Previous version
  
  UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_org_id ON document_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_content_hash ON document_versions(content_hash);

-- ============================================================================
-- DOCUMENT VERSION COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_version_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  
  -- Comment details
  comment_text TEXT NOT NULL,
  page_number INTEGER, -- If commenting on specific page
  x_position NUMERIC(10, 2), -- X coordinate on page (for annotations)
  y_position NUMERIC(10, 2), -- Y coordinate on page (for annotations)
  
  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Threading
  parent_comment_id UUID REFERENCES document_version_comments(id) ON DELETE CASCADE, -- For replies
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_document_version_comments_version_id ON document_version_comments(version_id);
CREATE INDEX IF NOT EXISTS idx_document_version_comments_parent_comment_id ON document_version_comments(parent_comment_id);

-- ============================================================================
-- DOCUMENT LOCKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  
  -- Lock details
  locked_by TEXT NOT NULL, -- User ID
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional: auto-unlock after X minutes
  
  -- Lock type
  lock_type TEXT NOT NULL DEFAULT 'edit' CHECK (lock_type IN ('edit', 'review', 'approve')),
  
  UNIQUE(document_id) -- Only one lock per document
);

CREATE INDEX IF NOT EXISTS idx_document_locks_document_id ON document_locks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_locks_org_id ON document_locks(org_id);
CREATE INDEX IF NOT EXISTS idx_document_locks_expires_at ON document_locks(expires_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-increment version number
CREATE OR REPLACE FUNCTION get_next_version_number()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM document_versions
  WHERE document_id = NEW.document_id;
  
  NEW.version_number := next_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_get_next_version_number ON document_versions;
CREATE TRIGGER trg_get_next_version_number
  BEFORE INSERT ON document_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION get_next_version_number();

-- Auto-expire locks
CREATE OR REPLACE FUNCTION expire_document_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM document_locks
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add function to be called periodically (via cron or scheduled job)
-- SELECT expire_document_locks();

