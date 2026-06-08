# Phase 0 - Incremental Case Update Audit Report

## Executive Summary
This audit identifies where case analysis is stored, how PDFs are uploaded/processed, and where timelines, key issues, risk, and missing evidence are generated. This will guide implementation of versioned incremental updates.

---

## 1. Case Analysis Storage

### Current Storage Locations

#### `cases` Table
- **Field**: `current_analysis` (JSONB) - Stores current analysis snapshot
- **Field**: `summary` (TEXT) - Stores document summary (updated on each upload)
- **Field**: `extracted_summary` (TEXT) - Legacy field
- **Field**: `timeline` (JSONB) - Stores timeline data
- **Location**: Updated in `app/api/upload/route.ts` (line 375-381)

#### `case_analysis_history` Table (Existing)
- **Location**: `supabase/migrations/0031_enterprise_features.sql`
- **Structure**:
  ```sql
  CREATE TABLE case_analysis_history (
    id UUID PRIMARY KEY,
    case_id UUID FK -> cases,
    created_at TIMESTAMPTZ,
    meta JSONB,  -- Metadata
    snapshot JSONB  -- Full snapshot
  );
  ```
- **Status**: Exists but is basic - no version numbers, no document tracking
- **Usage**: Not actively used in current codebase

#### `documents` Table
- **Field**: `extracted_json` (JSONB) - Per-document extracted facts
- **Contains**: `summary`, `parties`, `dates`, `keyIssues`, `timeline`, `housingMeta`, `piMeta`, etc.
- **Location**: Each document stores its own extraction

### Analysis Generation Flow
1. **Upload** (`app/api/upload/route.ts`):
   - Extracts text from PDF
   - Calls `extractCaseFacts()` (AI extraction)
   - Stores in `documents.extracted_json`
   - Updates `cases.summary` with latest document summary
   - **Problem**: Overwrites previous summary, no versioning

2. **Case Page** (`app/(protected)/cases/[caseId]/page.tsx`):
   - Fetches all documents with `extracted_json`
   - Aggregates data in-memory for display
   - **Problem**: No persistence of aggregated analysis

---

## 2. PDF Upload and Processing

### Upload Flow
- **Route**: `app/api/upload/route.ts`
- **Method**: POST with FormData
- **Features**:
  - ✅ Supports adding to existing case (checks by title, line 88-93)
  - ✅ Extracts text from PDF/DOCX
  - ✅ Runs AI extraction (`extractCaseFacts()`)
  - ✅ Stores in `documents` table
  - ✅ Updates `cases.summary`
  - ✅ Detects risk flags
  - ✅ Writes audit event `UPLOAD_COMPLETED`
  - ❌ **No versioning** - overwrites summary
  - ❌ **No "new docs added" tracking**

### Documents Table Structure (Inferred)
- `id` (UUID, PK)
- `case_id` (UUID, FK)
- `org_id` (TEXT)
- `name` (TEXT) - filename
- `type` (TEXT) - MIME type
- `storage_url` (TEXT) - Supabase storage path
- `extracted_json` (JSONB) - Extracted facts
- `uploaded_by` (TEXT) - Clerk user ID
- `created_at` (TIMESTAMPTZ)
- `redaction_map` (JSONB)

### Re-Extract Route
- **Route**: `app/api/cases/[caseId]/re-extract/route.ts`
- **Purpose**: Re-runs extraction on existing documents
- **Features**:
  - Fetches all documents
  - Re-extracts from `extracted_json`
  - Updates risk flags
  - **Problem**: No versioning, overwrites existing data

---

## 3. Timeline Generation

### Source
- **File**: `lib/timeline.ts`
- **Function**: Timeline built from `extracted_json.timeline` arrays
- **Storage**: 
  - Per-document: `documents.extracted_json.timeline[]`
  - Aggregated: `cases.timeline` (JSONB) - but not actively updated
- **Display**: Case page aggregates from all documents in-memory

### Current Flow
1. Each document extraction includes `timeline[]` array
2. Case page aggregates all timelines from documents
3. No persistent aggregated timeline version

---

## 4. Key Issues Generation

### Source
- **File**: `lib/key-issues.ts`
- **Function**: `buildKeyIssues(caseId, rawIssues, practiceArea)`
- **Input**: Raw issues from `extracted_json.keyIssues[]`
- **Output**: `KeyIssue[]` with deduplication and severity inference
- **Storage**: 
  - Per-document: `documents.extracted_json.keyIssues[]`
  - No persistent aggregated version

### Current Flow
1. Each document extraction includes `keyIssues[]` array
2. Case page calls `buildKeyIssues()` with aggregated raw issues
3. Displayed in-memory, not persisted

---

## 5. Risk Assessment

### Source
- **File**: `lib/heatmap.ts`
- **Function**: `computeCaseHeatmap(input)` - computes risk heatmap
- **File**: `lib/risk.ts` (inferred) - risk flag detection
- **Storage**: 
  - `risk_flags` table - individual risk flags
  - `cases.current_analysis` - may contain risk data
  - No persistent risk rating version

### Current Flow
1. Risk flags detected during upload (`detectRiskFlags()`)
2. Stored in `risk_flags` table
3. Heatmap computed in-memory on case page
4. No versioned risk rating

---

## 6. Missing Evidence

### Source
- **File**: `lib/missing-evidence.ts`
- **Function**: `findMissingEvidence(caseId, caseType, documents)`
- **Input**: Documents array with `extracted_json`
- **Output**: `MissingEvidenceItem[]`
- **Storage**: 
  - Computed on-demand
  - No persistent version

### Current Flow
1. Case page calls `findMissingEvidence()` with all documents
2. Computed in-memory
3. Displayed in `MissingEvidencePanel`
4. No versioning or tracking of changes

---

## 7. Existing Tables

### `cases`
- `id`, `org_id`, `title`, `summary`, `extracted_summary`
- `practice_area`, `timeline` (JSONB)
- `current_analysis` (JSONB)
- `created_at`, `updated_at`

### `documents`
- `id`, `case_id`, `org_id`, `name`, `type`
- `storage_url`, `extracted_json` (JSONB)
- `uploaded_by`, `created_at`
- `redaction_map` (JSONB)

### `case_analysis_history` (Existing but Unused)
- `id`, `case_id`, `created_at`
- `meta` (JSONB), `snapshot` (JSONB)
- **Problem**: No version numbers, no document tracking, not actively used

### `case_audit_events` (Existing)
- `id`, `case_id`, `event_type`, `timestamp`, `user_id`, `meta` (JSONB)
- **Event Types**: Limited set (needs extension)
- **Constraint**: CHECK constraint limits event types

---

## 8. Implementation Plan

### Tables to Add

#### `case_documents` (Optional - May Use Existing `documents`)
- **Decision**: Use existing `documents` table, add fields if needed
- **New Fields** (if needed):
  - `source` (TEXT) - Hospital/GP/Client
  - `document_type` (TEXT) - Guessed type
  - `meta` (JSONB) - Page count, date ranges, hashes

#### `case_analysis_versions` (New)
- **Purpose**: Versioned analysis snapshots
- **Fields**:
  - `id` (UUID, PK)
  - `case_id` (UUID, FK)
  - `version_number` (INTEGER) - Sequential
  - `document_ids` (UUID[]) - Documents included
  - `risk_rating` (TEXT) - e.g., "STRONG", "BALANCED", "WEAK"
  - `summary` (TEXT)
  - `key_issues` (JSONB)
  - `timeline` (JSONB)
  - `missing_evidence` (JSONB)
  - `created_at` (TIMESTAMPTZ)
  - `created_by` (TEXT)
  - `analysis_delta` (JSONB, nullable) - Delta vs previous version
  - **Unique**: `(case_id, version_number)`

### Tables to Modify

#### `case_audit_events`
- **Extend**: `event_type` constraint to include:
  - `DOCS_ADDED`
  - `ANALYSIS_RERUN`
  - `ANALYSIS_VERSION_CREATED`
  - `RISK_CHANGED`
- **Add** (optional):
  - `summary` (TEXT) - One-line summary for faster queries

#### `cases`
- **Add** (optional):
  - `latest_analysis_version` (INTEGER) - Reference to latest version number
  - `analysis_stale` (BOOLEAN) - True if new docs added but analysis not rerun

#### `documents` (Optional Enhancements)
- **Add** (if not present):
  - `source` (TEXT, nullable)
  - `document_type` (TEXT, nullable)
  - `meta` (JSONB, nullable)

---

## 9. Files/Components to Touch

### New Files

#### Migrations
1. `supabase/migrations/0053_case_analysis_versions.sql`
2. `supabase/migrations/0054_extend_audit_events_incremental.sql`

#### Backend Modules
1. `lib/analysis/version-manager.ts` - Version creation, delta computation
2. `lib/analysis/delta-engine.ts` - Compute deltas between versions
3. `lib/analysis/aggregator.ts` - Aggregate analysis from documents

#### API Routes
1. `app/api/cases/[caseId]/documents/add/route.ts` - Add documents to existing case
2. `app/api/cases/[caseId]/analysis/rerun/route.ts` - Re-run analysis (versioned)
3. `app/api/cases/[caseId]/analysis/versions/route.ts` - List analysis versions
4. `app/api/cases/[caseId]/analysis/versions/[versionNumber]/route.ts` - Get specific version

#### UI Components
1. `components/cases/CaseActionsMenu.tsx` - 3-dots menu with actions
2. `components/cases/AddDocumentsModal.tsx` - Modal for adding documents
3. `components/cases/AnalysisDeltaPanel.tsx` - "What Changed" panel
4. `components/cases/AnalysisHistoryModal.tsx` - View analysis history
5. `components/cases/StaleAnalysisBanner.tsx` - Banner when analysis is stale

### Files to Modify

#### Backend
1. `app/api/upload/route.ts`:
   - Add flag for "adding to existing case"
   - Set `analysis_stale = true` when adding to existing case
   - Write `DOCS_ADDED` audit event

2. `lib/audit.ts`:
   - Extend `CaseEventType` enum with new event types

3. `lib/key-issues.ts`:
   - Ensure idempotent (for versioning)

4. `lib/missing-evidence.ts`:
   - Ensure idempotent (for versioning)

5. `lib/timeline.ts`:
   - Ensure idempotent (for versioning)

#### Frontend
1. `app/(protected)/cases/[caseId]/page.tsx`:
   - Add `CaseActionsMenu` component
   - Add `StaleAnalysisBanner` if `analysis_stale = true`
   - Add `AnalysisDeltaPanel` after re-analysis
   - Fetch and display latest analysis version

2. `components/core/MissingEvidencePanel.tsx`:
   - May need to show version context

---

## 10. Delta Engine Logic

### Delta Computation
After creating new analysis version, compute:

1. **Timeline Delta**:
   - Count new events: `newVersion.timeline.length - oldVersion.timeline.length`
   - Identify new event types

2. **Key Issues Delta**:
   - Added: Issues in new but not in old
   - Removed: Issues in old but not in new
   - Changed: Issues with different severity

3. **Missing Evidence Delta**:
   - Resolved: Items in old but not in new
   - Still Outstanding: Items in both
   - New: Items in new but not in old

4. **Risk Delta**:
   - Previous rating → Current rating
   - Explanation: Why it changed (e.g., "New medical evidence strengthens causation")

5. **Store Delta**:
   - In `case_analysis_versions.analysis_delta` (JSONB)
   - In `case_audit_events.meta` for `ANALYSIS_VERSION_CREATED` event

---

## 11. Safety & Supervision Rules

### Never Auto-Downgrade Risk
- If risk rating decreases, require explicit explanation
- Store explanation in `analysis_delta.risk_change_reason`

### Always Preserve Old Outputs
- Never delete or modify previous versions
- All versions are read-only after creation

### Confidence-Safe Language
- Add helper: `lib/analysis/confidence-framing.ts`
- Replace overconfident phrases:
  - "This indicates..." → "Based on documents received as of [date], this is suggestive of..."
  - "The case is strong" → "Further evidence required to confirm, but initial indicators suggest..."
- Apply to:
  - Analysis summaries
  - Risk assessments
  - Key issues descriptions

---

## 12. Implementation Sequence

### Phase 1: Database Changes
1. Create `case_analysis_versions` table
2. Extend `case_audit_events` event types
3. Add optional fields to `cases` and `documents`

### Phase 2: Backend - Add Documents
1. Create `add-documents` API route
2. Update upload route to support "add to case" mode
3. Set `analysis_stale` flag
4. Write `DOCS_ADDED` audit event

### Phase 3: Backend - Re-Run Analysis
1. Create `rerun-analysis` API route
2. Implement version manager
3. Aggregate analysis from all documents
4. Create new version
5. Compute delta
6. Write `ANALYSIS_VERSION_CREATED` audit event

### Phase 4: Delta Engine
1. Implement delta computation logic
2. Store deltas in version record
3. Include in audit events

### Phase 5: UI - Add Documents
1. Create `CaseActionsMenu` component
2. Create `AddDocumentsModal` component
3. Integrate into case page

### Phase 6: UI - Delta Panel
1. Create `AnalysisDeltaPanel` component
2. Display after re-analysis
3. Make dismissible

### Phase 7: UI - Analysis History
1. Create `AnalysisHistoryModal` component
2. List all versions
3. Allow viewing old versions (read-only)

### Phase 8: Safety & Supervision
1. Implement confidence-safe language helper
2. Add risk downgrade protection
3. Add supervision notes

---

## 13. Critical Implementation Notes

### Idempotency
- All analysis functions must be idempotent
- Same documents → same analysis (deterministic)

### Performance
- Version creation should be fast
- Use incremental aggregation (only process new documents)
- Cache aggregated results

### Data Integrity
- Never modify previous versions
- All mutations create new versions
- Audit trail is append-only

### User Experience
- Clear indication when analysis is stale
- One-click re-analysis
- Clear "what changed" summary
- Easy access to history

---

## Summary

- **Analysis Storage**: Currently in `cases.current_analysis` and `documents.extracted_json` - no versioning
- **Upload Flow**: Supports adding to existing case but overwrites summary
- **Analysis Generation**: Timeline, key issues, risk, missing evidence all computed in-memory
- **Existing Tables**: `case_analysis_history` exists but is unused and too basic
- **Next Steps**: Create proper versioning system with `case_analysis_versions` table

Ready to proceed with Phase 1 implementation.

