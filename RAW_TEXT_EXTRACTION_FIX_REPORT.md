# Raw Text Extraction Pipeline Fix Report

## Problem
Even for text-based PDFs (selectable text), the UI showed "Extracted text: 0 chars" while "Extracted data: ~4k chars" existed. This meant raw text extraction was not being persisted and/or not being retrieved by case-context.

## Root Cause
The upload and extract routes were extracting raw text from PDFs but **not storing it** in the `documents.raw_text` column. Only `extracted_json` was being persisted.

## Files Changed

### 1. Upload Route (`app/api/upload/route.ts`)
**Change:** Added `raw_text: redactedText` to document insert
```typescript
.insert({
  // ... existing fields
  raw_text: redactedText, // Store extracted raw text for case-context diagnostics
  extracted_json: enrichedExtraction,
  // ... rest of fields
})
```

### 2. Extract Route (`app/api/extract/route.ts`)
**Change:** Added `raw_text: redactedText` to document update
```typescript
.update({
  raw_text: redactedText, // Store extracted raw text for case-context diagnostics
  extracted_json: enrichedExtraction,
  redaction_map: redactionMap,
})
```

### 3. Debug Endpoint (`app/api/debug/extraction/[caseId]/route.ts`) - NEW
**Purpose:** Dev/admin endpoint to diagnose extraction issues
**Returns:**
- `docCount`: Number of documents
- `diagnostics`: Full case-context diagnostics (rawCharsTotal, jsonCharsTotal, etc.)
- `documents`: Array with per-document details:
  - `id`, `name`, `mime`
  - `rawChars`, `jsonChars`
  - `preview`: First 200 chars of raw_text (dev only)
  - `rawTextEmptyReason`: Clear explanation if raw_text is empty

**Usage:**
```
GET /api/debug/extraction/[caseId]
```

### 4. UI Banner Deduplication

#### Strategic Intelligence Section (`components/strategic/StrategicIntelligenceSection.tsx`)
- Added gate banner rendering at the top (was already checking but not rendering)
- When gate banner is shown, all child panels are suppressed

#### Criminal Case View (`components/criminal/CriminalCaseView.tsx`)
- Added gate banner check via `useEffect` (checks aggressive-defense endpoint)
- Shows banner once at the top when gated
- All child panels show minimal placeholders instead of full banners

#### Child Panels Updated (Show Minimal Placeholders)
**Criminal:**
- `components/criminal/AggressiveDefensePanel.tsx`
- `components/criminal/GetOffProbabilityMeter.tsx`
- `components/criminal/LoopholesPanel.tsx`
- `components/criminal/DefenseStrategiesPanel.tsx`

**Strategic:**
- `components/strategic/StrategicRoutesPanel.tsx`
- `components/strategic/LeverageAndWeakSpotsPanel.tsx`
- `components/strategic/TimePressureAndSettlementPanel.tsx`
- `components/strategic/JudicialExpectationsPanel.tsx`

**Change Pattern:**
```typescript
// Before: Full banner
if (gatedResponse) {
  return <AnalysisGateBanner ... />;
}

// After: Minimal placeholder
if (gatedResponse) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">
        Analysis unavailable. {gatedResponse.banner?.message || "..."}
      </p>
    </Card>
  );
}
```

## Database Columns Used

**Authoritative Field:** `documents.raw_text` (TEXT column)

**Verified Usage:**
- `lib/case-context.ts` line 130: Reads `doc.raw_text ?? ""`
- `lib/db/case-lookup.ts` lines 156, 172, 188, 207: Selects `raw_text` in all queries
- `buildCaseContext` calculates `rawCharsTotal` from `doc.raw_text` length

## Extraction Code Paths

### Upload Flow
1. File uploaded → `extractTextFromFile()` extracts raw text
2. Text redacted → `redact()` produces `redactedText`
3. AI extraction → `extractCaseFacts()` produces `extracted_json`
4. **NEW:** Both `raw_text` (redactedText) and `extracted_json` stored in DB

### Re-extract Flow
1. Document downloaded from storage
2. `extractTextFromBuffer()` extracts raw text
3. Text redacted → `redact()` produces `redactedText`
4. AI extraction → `extractCaseFacts()` produces `extracted_json`
5. **NEW:** Both `raw_text` (redactedText) and `extracted_json` updated in DB

## Regression Check

### Expected Behavior
1. **Text-based PDF upload:**
   - PDF with selectable text (copy/paste works)
   - Upload should produce `rawCharsTotal > 1000`
   - Verify using: `GET /api/debug/extraction/[caseId]`
   - Expected output:
     ```json
     {
       "docCount": 1,
       "diagnostics": {
         "rawCharsTotal": 5000,  // > 1000 for text-based PDF
         "jsonCharsTotal": 2000,
         "canGenerateAnalysis": true
       },
       "documents": [{
         "id": "...",
         "name": "test.pdf",
         "mime": "application/pdf",
         "rawChars": 5000,
         "jsonChars": 2000,
         "preview": "First 200 chars of text...",
         "rawTextEmptyReason": null
       }]
     }
     ```

2. **Scanned PDF (no text):**
   - PDF with images only (no selectable text)
   - Upload should produce `rawCharsTotal = 0`
   - `canGenerateAnalysis = false`
   - Banner shown at top, panels show minimal placeholders

3. **Re-extract:**
   - Re-extracting a document should update `raw_text` if text extraction succeeds
   - Verify `rawCharsTotal` increases after re-extract

### Test Steps
1. Upload a text-based PDF (e.g., `test-documents/crown-court-bundle-s18-oapa.md` converted to PDF)
2. Check debug endpoint: `GET /api/debug/extraction/[caseId]`
3. Verify `rawCharsTotal > 1000`
4. Verify UI shows correct char counts (not "0 chars")
5. Verify analysis panels render normally (no banners)

## Summary

- **Fixed:** Raw text now persisted during upload and re-extract
- **Verified:** case-context reads from authoritative `documents.raw_text` column
- **Added:** Debug endpoint for extraction diagnostics
- **Improved:** UI banner deduplication (one banner at top, minimal placeholders in panels)
- **Result:** Text-based PDFs now correctly show `rawCharsTotal > 0` and analysis works as expected
