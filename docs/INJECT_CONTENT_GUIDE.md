# Inject Extracted Content Guide

This guide shows how to inject extracted content directly into Supabase, bypassing the `/api/extract` endpoint.

## Method 1: API Endpoint (Recommended)

### Step 1: Prepare your data

You need:
- `documentId`: The UUID of the document in the `documents` table
- `fullText`: The complete extracted text from the PDF
- `summary`: The AI-generated summary
- `keyIssues`: Array of key issues (optional)
- `timeline`: Array of timeline events (optional)

### Step 2: Make API request

```bash
curl -X POST http://localhost:3000/api/admin/inject-content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "documentId": "DOCUMENT_ID_GOES_HERE",
    "fullText": "-----BEGIN TEXT-----\n[YOUR FULL TEXT]\n-----END TEXT-----",
    "summary": "-----BEGIN SUMMARY-----\n[YOUR SUMMARY]\n-----END SUMMARY-----",
    "keyIssues": [{"label": "Issue 1", "description": "..."}],
    "timeline": [{"date": "2024-01-01", "label": "Event", "description": "..."}]
  }'
```

### Step 3: SQL Queries that will run

The API will execute these SQL operations:

```sql
-- 1. Update document
UPDATE documents
SET 
  raw_text = :fullText,
  ai_summary = :summary,
  extracted_json = :extractedJson,
  updated_at = NOW()
WHERE id = :documentId;

-- 2. Ensure practice_area
UPDATE cases
SET practice_area = 'clinical_negligence'
WHERE id = :caseId AND org_id = :orgId;

-- 3. Find or create bundle
SELECT id FROM case_bundles 
WHERE case_id = :caseId AND org_id = :orgId 
LIMIT 1;

-- If not found:
INSERT INTO case_bundles (case_id, org_id, bundle_name, status, analysis_level, progress)
VALUES (:caseId, :orgId, :bundleName, 'completed', 'full', 100)
RETURNING id;

-- 4. Insert/update bundle_chunk
INSERT INTO bundle_chunks (
  bundle_id, chunk_index, page_start, page_end, status,
  raw_text, ai_summary, processed_at
)
VALUES (
  :bundleId, 0, 1, 1, 'completed',
  :fullText, :summary, NOW()
)
ON CONFLICT (bundle_id, chunk_index) 
DO UPDATE SET 
  raw_text = :fullText,
  ai_summary = :summary,
  status = 'completed',
  processed_at = NOW();
```

## Method 2: Direct SQL (For Supabase Dashboard)

If you prefer to run SQL directly in Supabase:

```sql
-- Replace these variables:
-- :documentId - Your document UUID
-- :caseId - Your case UUID (get from documents table)
-- :orgId - Your org ID (get from documents table)
-- :fullText - Your extracted text
-- :summary - Your AI summary
-- :keyIssues - JSON array of key issues
-- :timeline - JSON array of timeline events

-- 1. Update document
UPDATE documents
SET 
  raw_text = :fullText,
  ai_summary = :summary,
  extracted_json = jsonb_build_object(
    'summary', :summary,
    'keyIssues', :keyIssues::jsonb,
    'timeline', :timeline::jsonb,
    'parties', '[]'::jsonb,
    'dates', '[]'::jsonb,
    'amounts', '[]'::jsonb
  ),
  updated_at = NOW()
WHERE id = :documentId;

-- 2. Ensure practice_area
UPDATE cases
SET practice_area = 'clinical_negligence'
WHERE id = :caseId AND org_id = :orgId;

-- 3. Get or create bundle
DO $$
DECLARE
  v_bundle_id UUID;
BEGIN
  SELECT id INTO v_bundle_id
  FROM case_bundles
  WHERE case_id = :caseId AND org_id = :orgId
  LIMIT 1;

  IF v_bundle_id IS NULL THEN
    INSERT INTO case_bundles (case_id, org_id, bundle_name, status, analysis_level, progress)
    VALUES (:caseId, :orgId, 'Extracted Document Bundle', 'completed', 'full', 100)
    RETURNING id INTO v_bundle_id;
  END IF;

  -- 4. Insert/update bundle_chunk
  INSERT INTO bundle_chunks (
    bundle_id, chunk_index, page_start, page_end, status,
    raw_text, ai_summary, processed_at
  )
  VALUES (
    v_bundle_id, 0, 1, 1, 'completed',
    :fullText, :summary, NOW()
  )
  ON CONFLICT (bundle_id, chunk_index) 
  DO UPDATE SET 
    raw_text = :fullText,
    ai_summary = :summary,
    status = 'completed',
    processed_at = NOW();
END $$;
```

## After Injection

1. **Re-run Strategic Intelligence**: Navigate to the case page and click "Re-run Strategic Intelligence" or refresh the Strategic Overview panel.

2. **Verify**: Check that:
   - Document shows extracted content
   - Momentum updates (should show STRONG if breach/causation/harm detected)
   - Bundle chunks are populated

## Example Request Body

```json
{
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "fullText": "Patient presented to A&E with right wrist pain following fall. Initial X-ray reported no fracture. Patient re-attended 2 weeks later with worsening pain. Repeat X-ray showed displaced scaphoid fracture. Surgery required for ORIF.",
  "summary": "Missed scaphoid fracture on initial presentation. Delay in diagnosis led to displacement requiring surgical fixation.",
  "keyIssues": [
    {
      "label": "Missed fracture on initial imaging",
      "description": "Initial X-ray failed to identify scaphoid fracture"
    },
    {
      "label": "Delay in diagnosis",
      "description": "2 week delay between initial presentation and correct diagnosis"
    }
  ],
  "timeline": [
    {
      "date": "2024-01-15",
      "label": "Initial A&E attendance",
      "description": "Right wrist pain, X-ray reported no fracture"
    },
    {
      "date": "2024-01-29",
      "label": "Re-attendance",
      "description": "Worsening pain, repeat X-ray shows displaced fracture"
    },
    {
      "date": "2024-02-05",
      "label": "Surgery",
      "description": "ORIF performed for displaced scaphoid fracture"
    }
  ]
}
```

