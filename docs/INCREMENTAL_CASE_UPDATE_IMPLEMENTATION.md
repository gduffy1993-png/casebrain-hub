# Incremental Case Update Implementation

## Overview
This implementation enables adding new PDFs to existing cases and re-running analysis as versioned snapshots, preserving previous versions and showing what changed.

---

## 1. Database Migrations

### `supabase/migrations/0053_case_analysis_versions.sql`

**New Table: `case_analysis_versions`**
- Stores versioned analysis snapshots
- Fields:
  - `version_number` (incremental, unique per case)
  - `document_ids` (array of UUIDs)
  - `risk_rating`, `summary`, `key_issues`, `timeline`, `missing_evidence` (JSONB)
  - `analysis_delta` (computed delta vs previous version)
  - `created_at`, `created_by`

**Case Table Extensions:**
- `latest_analysis_version` (INTEGER) - tracks current version
- `analysis_stale` (BOOLEAN) - flag when new docs added but analysis not rerun

**RLS:** Org-level access control

---

## 2. API Routes

### `POST /api/cases/[caseId]/documents/add`
**Purpose:** Add new PDFs to existing case without overwriting analysis

**Features:**
- Accepts multiple files via FormData
- Extracts text, redacts, extracts case facts
- Stores documents in `documents` table
- Detects risk flags
- Marks case as `analysis_stale = true`
- Writes `DOCS_ADDED` audit event
- Skips duplicate filenames

**Response:**
```json
{
  "success": true,
  "caseId": "...",
  "documentIds": ["..."],
  "skippedFiles": ["..."],
  "message": "X document(s) added. Analysis not yet updated."
}
```

---

### `POST /api/cases/[caseId]/analysis/rerun`
**Purpose:** Re-run analysis on all case documents and create new version

**Features:**
- Aggregates analysis from all documents
- Builds timeline, key issues, missing evidence
- Computes risk rating from risk flags
- Creates new version (version_number + 1)
- Computes delta vs previous version
- Updates case `latest_analysis_version` and clears `analysis_stale`
- Writes `ANALYSIS_VERSION_CREATED` and `RISK_CHANGED` audit events

**Response:**
```json
{
  "success": true,
  "version": {
    "id": "...",
    "versionNumber": 2,
    "createdAt": "...",
    "documentCount": 5,
    "riskRating": "HIGH"
  },
  "delta": {
    "timelineAdded": 3,
    "issuesAdded": [...],
    "missingEvidenceResolved": 2,
    "riskChanged": {...}
  }
}
```

---

### `GET /api/cases/[caseId]/analysis/versions`
**Purpose:** List all analysis versions for a case

**Response:**
```json
{
  "versions": [
    {
      "id": "...",
      "versionNumber": 2,
      "riskRating": "HIGH",
      "summary": "...",
      "documentCount": 5,
      "createdAt": "...",
      "createdBy": "..."
    }
  ]
}
```

---

### `GET /api/cases/[caseId]/analysis/versions/[versionNumber]`
**Purpose:** Get specific analysis version (read-only)

**Response:**
```json
{
  "version": {
    "id": "...",
    "versionNumber": 2,
    "riskRating": "HIGH",
    "summary": "...",
    "keyIssues": [...],
    "timeline": [...],
    "missingEvidence": [...],
    "documentIds": [...],
    "analysisDelta": {...},
    "createdAt": "...",
    "createdBy": "..."
  }
}
```

---

## 3. Delta Engine

### `lib/analysis/delta-engine.ts`

**Function: `computeAnalysisDelta(previous, current)`**

**Computes:**
- **Timeline:** Added/removed events (by ID or date+label)
- **Key Issues:** Added/removed issues (by label)
- **Missing Evidence:** Resolved, still outstanding, new
- **Risk Change:** From/to with inferred reason

**Risk Change Reasons:**
- "Missing evidence resolved"
- "New key issues identified"
- "Key issues resolved"
- "New timeline events added"
- "Analysis updated with new documents"

---

## 4. UI Components

### `components/cases/CaseActionsMenu.tsx`
**3-dots menu** on case page Actions card

**Menu Items:**
1. **Add documents** - Opens AddDocumentsModal
2. **Re-run analysis** - Calls rerun API, refreshes page
   - Shows "(New docs added)" badge if `analysis_stale = true`
3. **Analysis history** - Opens AnalysisHistoryModal

---

### `components/cases/AddDocumentsModal.tsx`
**Modal for adding PDFs to case**

**Features:**
- File input (multiple, PDF/DOCX)
- Shows selected file count
- Upload progress indicator
- Success/error messages
- Auto-closes on success
- Refreshes page on success

---

### `components/cases/AnalysisHistoryModal.tsx`
**Modal listing all analysis versions**

**Features:**
- Lists versions (newest first)
- Shows version number, risk rating, date, document count
- "View" button to see specific version (future: read-only view)
- Empty state when no versions

---

### `components/cases/AnalysisDeltaPanel.tsx`
**Panel showing "What Changed" after re-run**

**Displays:**
- Timeline added/removed count
- Key issues added (with labels)
- Key issues removed (strikethrough)
- Missing evidence: resolved, still outstanding, new
- Risk change: from → to with reason

**Auto-shows:** When `latest_analysis_version > 1` and delta exists
**Dismissible:** X button to hide

---

### `components/cases/AnalysisDeltaPanelWrapper.tsx`
**Client wrapper** that fetches latest delta and renders panel

**Features:**
- Fetches latest version on mount
- Fetches full version to get delta
- Renders `AnalysisDeltaPanel` if delta exists
- Handles dismissal state

---

### `components/cases/CasePageClientWithActions.tsx`
**Client component** managing all action modals and state

**Features:**
- Manages modal open/close state
- Handles re-run analysis (calls API, refreshes)
- Handles add documents success (refreshes)
- Renders all modals and menu

---

## 5. Case Page Integration

### `app/(protected)/cases/[caseId]/page.tsx`

**Changes:**
1. **Fetch `latest_analysis_version` and `analysis_stale`** from cases table
2. **Add `CasePageClientWithActions`** to Actions card (3-dots menu)
3. **Add `AnalysisDeltaPanelWrapper`** after Evidence Tracker (conditional on version > 1)

**Location:**
- Actions menu: Line ~969 (in Actions card header)
- Delta panel: Line ~1164 (after Evidence Tracker section)

---

## 6. Audit Events

**New Event Types** (already in `case_audit_events` constraint):
- `DOCS_ADDED` - When documents added to case
- `ANALYSIS_VERSION_CREATED` - When analysis rerun creates new version
- `RISK_CHANGED` - When risk rating changes between versions

**Event Metadata:**
- `DOCS_ADDED`: `{ documentIds, documentCount, skippedFiles? }`
- `ANALYSIS_VERSION_CREATED`: `{ versionNumber, documentCount, riskRating }`
- `RISK_CHANGED`: `{ previousRisk, newRisk, reason }`

---

## 7. Manual Test Steps

### Test 1: Add Documents
1. Open existing case
2. Click 3-dots menu → "Add documents"
3. Select 1-2 PDF files
4. Click "Add Documents"
5. Verify:
   - Success message appears
   - Modal closes
   - Page refreshes
   - Documents appear in Documents section
   - Case shows `analysis_stale = true` (menu shows "(New docs added)")

### Test 2: Re-Run Analysis
1. After adding documents, click 3-dots menu → "Re-run analysis"
2. Wait for API call (spinner)
3. Verify:
   - Page refreshes
   - New version created (check API response or history)
   - Delta panel appears showing changes
   - `analysis_stale` cleared

### Test 3: Analysis History
1. Click 3-dots menu → "Analysis history"
2. Verify:
   - Modal opens
   - Lists all versions (newest first)
   - Shows version number, risk, date, doc count
   - "View" button present (future: opens read-only view)

### Test 4: Delta Panel
1. After re-running analysis (version > 1), verify delta panel:
   - Appears after Evidence Tracker
   - Shows timeline changes
   - Shows key issues added/removed
   - Shows missing evidence changes
   - Shows risk change (if changed)
2. Click X to dismiss
3. Verify panel doesn't reappear on refresh (dismissed state)

### Test 5: Duplicate Prevention
1. Add same PDF twice
2. Verify:
   - First upload succeeds
   - Second upload skipped (duplicate filename)
   - Response shows `skippedFiles: ["filename.pdf"]`

### Test 6: Version Incrementing
1. Re-run analysis multiple times
2. Verify:
   - Version numbers increment: 1, 2, 3, ...
   - Each version stores correct document_ids
   - Delta computed vs previous version (not vs version 1)

### Test 7: Audit Trail
1. Add documents → Check audit trail for `DOCS_ADDED`
2. Re-run analysis → Check for `ANALYSIS_VERSION_CREATED`
3. If risk changed → Check for `RISK_CHANGED`
4. Verify metadata is correct

---

## 8. Files Created/Modified

### New Files
1. `supabase/migrations/0053_case_analysis_versions.sql` - DB schema
2. `lib/analysis/delta-engine.ts` - Delta computation
3. `app/api/cases/[caseId]/documents/add/route.ts` - Add docs API
4. `app/api/cases/[caseId]/analysis/rerun/route.ts` - Rerun API
5. `app/api/cases/[caseId]/analysis/versions/route.ts` - List versions API
6. `app/api/cases/[caseId]/analysis/versions/[versionNumber]/route.ts` - Get version API
7. `components/cases/CaseActionsMenu.tsx` - 3-dots menu
8. `components/cases/AddDocumentsModal.tsx` - Add docs modal
9. `components/cases/AnalysisHistoryModal.tsx` - History modal
10. `components/cases/AnalysisDeltaPanel.tsx` - Delta panel
11. `components/cases/AnalysisDeltaPanelWrapper.tsx` - Delta wrapper
12. `components/cases/CasePageClientWithActions.tsx` - Actions client component
13. `components/ui/dropdown-menu.tsx` - Dropdown menu component (if needed)

### Modified Files
1. `app/(protected)/cases/[caseId]/page.tsx` - Added menu, delta panel, imports
2. `lib/audit.ts` - Already extended with new event types (from Phase 1)

---

## 9. Future Enhancements (Not Implemented)

1. **View Old Version UI:** Read-only view of specific version (timeline, issues, evidence)
2. **Version Comparison:** Side-by-side diff view
3. **Rollback:** Restore previous version (with confirmation)
4. **Export Version:** Export specific version as PDF
5. **Version Notes:** User notes on why version was created

---

## Summary

✅ **Database:** Versioned analysis table with delta tracking  
✅ **API Routes:** Add docs, rerun analysis, list/get versions  
✅ **Delta Engine:** Computes changes between versions  
✅ **UI Components:** Menu, modals, delta panel  
✅ **Case Page Integration:** Actions menu and delta panel  
✅ **Audit Events:** DOCS_ADDED, ANALYSIS_VERSION_CREATED, RISK_CHANGED  

**Ready for testing.**

