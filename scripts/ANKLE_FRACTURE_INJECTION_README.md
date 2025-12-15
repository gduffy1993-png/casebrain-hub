# Ankle Fracture Bundle Injection - Quick Start

This bundle contains **clear breach, causation, and harm indicators** and should trigger **STRONG (Expert Pending)** momentum after injection.

## What This Bundle Contains

✅ **Breach Evidence (HIGH)**:
- Missed fracture on initial imaging (radiology addendum confirms)
- Failure to immobilise despite inability to weight bear
- No referral to fracture clinic

✅ **Causation Evidence (HIGH)**:
- 7-day delay in diagnosis
- Delay linked to worsening displacement
- Orthopaedic surgeon confirms delay contributed to need for surgery

✅ **Harm Evidence (PRESENT)**:
- Surgery required (ORIF)
- Prolonged pain and functional limitation
- Loss of earnings
- Trust investigation accepts breach and causation

## Step 1: Get Your Document ID

Run this in Supabase SQL Editor:

```sql
SELECT id, name, case_id, org_id 
FROM documents 
WHERE name LIKE '%ankle%' OR name LIKE '%fracture%' OR name LIKE '%test%'
ORDER BY created_at DESC
LIMIT 5;
```

Copy the `id` (UUID) of your document.

## Step 2: Choose Your Method

### Option A: SQL (Direct in Supabase)

1. Open `scripts/inject-ankle-fracture-bundle.sql`
2. Replace `:documentId` with your actual document UUID (keep the quotes)
3. Run the entire script in Supabase SQL Editor

**Example:**
```sql
-- Replace this:
WHERE id = :documentId;

-- With this (using your actual UUID):
WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

### Option B: API Endpoint

1. Open `scripts/inject-ankle-fracture-api.json`
2. Replace `"REPLACE_WITH_YOUR_DOCUMENT_ID"` with your actual UUID
3. Make POST request:

```bash
curl -X POST http://localhost:3000/api/admin/inject-content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @scripts/inject-ankle-fracture-api.json
```

Or use Postman/Insomnia with the JSON file.

## Step 3: Verify Injection

Run this query to verify:

```sql
SELECT 
  id,
  name,
  LEFT(ai_summary, 100) as summary_preview,
  jsonb_array_length(extracted_json->'keyIssues') as key_issues_count,
  jsonb_array_length(extracted_json->'timeline') as timeline_count,
  updated_at
FROM documents 
WHERE id = 'YOUR_DOCUMENT_ID';
```

You should see:
- `key_issues_count` = 4
- `timeline_count` = 6
- `summary_preview` = "Missed ankle fracture on initial radiology report..."

## Step 4: Re-run Strategic Intelligence

1. Navigate to the case page in CaseBrain
2. Click "Re-run Strategic Intelligence" or refresh the Strategic Overview panel
3. **Expected Result**: Momentum should now show **STRONG (Expert Pending)** or **STRONG**

## Expected Detection Results

After injection, the breach/causation/harm detection should find:

**Breach Patterns Detected:**
- ✅ "missed fracture" / "fracture not identified"
- ✅ "retrospective review" / "addendum"
- ✅ "initially missed"
- ✅ "fracture later identified"
- ✅ "no immobilisation" / "no boot" / "no cast"
- ✅ "not referred"
- ✅ "discharged despite"

**Causation Patterns Detected:**
- ✅ "re-presented" / "re-attended"
- ✅ "delay in diagnosis" / "delayed diagnosis"
- ✅ "worsening" / "deteriorated"
- ✅ "earlier intervention would have"
- ✅ "surgery required" / "ORIF"
- ✅ "fracture displacement"

**Harm Patterns Detected:**
- ✅ "surgery" / "operation" / "ORIF"
- ✅ "persistent pain" / "ongoing pain"
- ✅ "loss of earnings"
- ✅ "functional limitation"
- ✅ "prolonged recovery"

## Troubleshooting

**If momentum is still WEAK:**

1. Check practice_area is set:
   ```sql
   SELECT practice_area FROM cases WHERE id = 'YOUR_CASE_ID';
   ```
   Should be `'clinical_negligence'`

2. Check bundle_chunks were created:
   ```sql
   SELECT bc.* FROM bundle_chunks bc
   JOIN case_bundles cb ON bc.bundle_id = cb.id
   JOIN documents d ON cb.case_id = d.case_id
   WHERE d.id = 'YOUR_DOCUMENT_ID';
   ```

3. Check document has content:
   ```sql
   SELECT 
     LENGTH(raw_text) as text_length,
     ai_summary IS NOT NULL as has_summary,
     extracted_json IS NOT NULL as has_json
   FROM documents 
   WHERE id = 'YOUR_DOCUMENT_ID';
   ```

4. Check case role is claimant:
   ```sql
   SELECT case_role FROM cases WHERE id = 'YOUR_CASE_ID';
   ```
   Should be `'claimant'` (or NULL, which defaults to claimant)

## What Should Happen

After successful injection and re-running Strategic Intelligence:

1. **Momentum**: Should change from WEAK → **STRONG (Expert Pending)** or **STRONG**
2. **Explanation**: Should mention "medical records alone strongly support breach and causation"
3. **Strategic Routes**: Should show enhanced strategy (Routes A, B, C, D) if STRONG (Expert Pending)
4. **Leverage Tools**: Should be unlocked

The bundle explicitly contains:
- Trust admission of breach
- Trust acceptance that delay "more likely than not" caused need for surgery
- Multiple references to missed fracture, delay, and harm
- Clear causation link between delay and surgery requirement

This is a **textbook STRONG (Expert Pending)** case.

