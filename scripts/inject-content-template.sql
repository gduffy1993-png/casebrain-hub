-- ============================================
-- INJECT EXTRACTED CONTENT - SQL TEMPLATE
-- ============================================
-- Replace the variables below with your actual values
-- Then run this in Supabase SQL Editor

-- VARIABLES TO REPLACE:
-- :documentId - Your document UUID
-- :fullText - The complete extracted text (can be very long)
-- :summary - The AI-generated summary
-- :keyIssuesJson - JSON array of key issues (see example below)
-- :timelineJson - JSON array of timeline events (see example below)

-- First, get your case_id and org_id from the document:
-- SELECT case_id, org_id FROM documents WHERE id = :documentId;

-- ============================================
-- STEP 1: Update Document
-- ============================================
UPDATE documents
SET 
  raw_text = :fullText,
  ai_summary = :summary,
  extracted_json = jsonb_build_object(
    'summary', :summary,
    'keyIssues', :keyIssuesJson::jsonb,
    'timeline', :timelineJson::jsonb,
    'parties', '[]'::jsonb,
    'dates', '[]'::jsonb,
    'amounts', '[]'::jsonb
  ),
  updated_at = NOW()
WHERE id = :documentId;

-- ============================================
-- STEP 2: Ensure Practice Area
-- ============================================
UPDATE cases
SET practice_area = 'clinical_negligence'
WHERE id = (
  SELECT case_id FROM documents WHERE id = :documentId
)
AND org_id = (
  SELECT org_id FROM documents WHERE id = :documentId
);

-- ============================================
-- STEP 3: Create/Update Bundle and Chunk
-- ============================================
DO $$
DECLARE
  v_case_id UUID;
  v_org_id TEXT;
  v_bundle_id UUID;
  v_doc_name TEXT;
BEGIN
  -- Get case and org info
  SELECT case_id, org_id, name 
  INTO v_case_id, v_org_id, v_doc_name
  FROM documents 
  WHERE id = :documentId;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', :documentId;
  END IF;

  -- Find or create bundle
  SELECT id INTO v_bundle_id
  FROM case_bundles
  WHERE case_id = v_case_id AND org_id = v_org_id
  LIMIT 1;

  IF v_bundle_id IS NULL THEN
    INSERT INTO case_bundles (
      case_id, org_id, bundle_name, status, analysis_level, progress
    )
    VALUES (
      v_case_id, 
      v_org_id, 
      COALESCE(v_doc_name, 'Extracted Document Bundle'),
      'completed',
      'full',
      100
    )
    RETURNING id INTO v_bundle_id;
  END IF;

  -- Insert or update bundle_chunk
  INSERT INTO bundle_chunks (
    bundle_id, 
    chunk_index, 
    page_start, 
    page_end, 
    status,
    raw_text, 
    ai_summary, 
    processed_at
  )
  VALUES (
    v_bundle_id,
    0,
    1,
    1,
    'completed',
    :fullText,
    :summary,
    NOW()
  )
  ON CONFLICT (bundle_id, chunk_index) 
  DO UPDATE SET 
    raw_text = :fullText,
    ai_summary = :summary,
    status = 'completed',
    processed_at = NOW();

  RAISE NOTICE 'Successfully injected content for document %, case %, bundle %', 
    :documentId, v_case_id, v_bundle_id;
END $$;

-- ============================================
-- EXAMPLE KEY ISSUES JSON:
-- ============================================
-- [
--   {
--     "label": "Missed fracture on initial imaging",
--     "description": "Initial X-ray failed to identify scaphoid fracture",
--     "severity": "HIGH"
--   },
--   {
--     "label": "Delay in diagnosis",
--     "description": "2 week delay between initial presentation and correct diagnosis",
--     "severity": "MEDIUM"
--   }
-- ]

-- ============================================
-- EXAMPLE TIMELINE JSON:
-- ============================================
-- [
--   {
--     "date": "2024-01-15",
--     "label": "Initial A&E attendance",
--     "description": "Right wrist pain, X-ray reported no fracture"
--   },
--   {
--     "date": "2024-01-29",
--     "label": "Re-attendance",
--     "description": "Worsening pain, repeat X-ray shows displaced fracture"
--   },
--   {
--     "date": "2024-02-05",
--     "label": "Surgery",
--     "description": "ORIF performed for displaced scaphoid fracture"
--   }
-- ]

-- ============================================
-- VERIFICATION QUERIES:
-- ============================================
-- Check document was updated:
-- SELECT id, name, ai_summary, 
--        extracted_json->>'summary' as summary,
--        jsonb_array_length(extracted_json->'keyIssues') as key_issues_count,
--        jsonb_array_length(extracted_json->'timeline') as timeline_count
-- FROM documents WHERE id = :documentId;

-- Check bundle_chunk was created:
-- SELECT bc.*, cb.case_id
-- FROM bundle_chunks bc
-- JOIN case_bundles cb ON bc.bundle_id = cb.id
-- JOIN documents d ON cb.case_id = d.case_id
-- WHERE d.id = :documentId;

