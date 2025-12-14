# Audit Trail UI Implementation

## Overview
Read-only Audit Trail panel on the case page displaying all audit events in a supervisor-safe, readable format.

---

## 1. API Route

### `app/api/cases/[caseId]/audit-events/route.ts`

**GET `/api/cases/[caseId]/audit-events`**

**Features**:
- Verifies case belongs to org (security)
- Uses existing `getCaseEvents()` helper from `lib/audit.ts`
- Returns events ordered newest → oldest (already handled by helper)
- Generates human-readable summaries for each event
- Transforms to API response format:
  ```typescript
  {
    events: [
      {
        id: string,
        eventType: CaseEventType,
        timestamp: string,
        userId: string | null,
        summary: string,  // Human-readable summary
        payload: Record<string, unknown>  // Full meta JSONB
      }
    ]
  }
  ```

**Summary Generation**:
- `EVIDENCE_STATUS_CHANGED` → "Evidence '[title]' status changed from [old] to [new]"
- `EVIDENCE_CREATED` → "Evidence item '[title]' created"
- `CHASE_DRAFTED` → "Chase draft generated for '[title]'"
- `CHASE_MARKED_SENT` → "Chase sent for '[title]'"
- `ANALYSIS_VERSION_CREATED` → "Analysis version [N] created" or "Case analysis updated"
- `DOCS_ADDED` → "[N] document(s) added to case"
- `RISK_CHANGED` → "Risk rating changed from [old] to [new]"
- And more...

---

## 2. UI Component

### `components/audit/AuditTrailPanel.tsx`

**Client Component** - Displays audit events in a readable, supervisor-safe format

**Features**:
- **Lazy Loading**: Fetches events on mount (doesn't block case page)
- **Chronological Display**: Newest events first
- **Event Cards**: Each event in a colored card based on event type
- **Expandable Payloads**: Click chevron to expand/collapse full JSON payload
- **Human-Readable Labels**: Uses `getEventTypeLabel()` from `lib/audit.ts`
- **Formatted Timestamps**: "DD MMM YYYY, HH:MM" format (en-GB)
- **Event Type Badges**: Shows raw event type for technical reference

**Color Coding**:
- Evidence events: Primary/blue
- Chase events: Warning/yellow
- Analysis events: Secondary/cyan
- Upload events: Accent/gray
- Risk events: Danger/red
- Supervisor events: Success/green

**States**:
- Loading: Shows spinner with "Loading audit trail..."
- Error: Shows error message in red
- Empty: Shows friendly message explaining no events yet

**Readability**:
- Clean, minimal design
- Expandable details (not overwhelming)
- Clear timestamps
- Human-readable summaries
- Pretty-printed JSON payloads

---

## 3. Case Page Integration

### `app/(protected)/cases/[caseId]/page.tsx`

**Changes**:

1. **Import**:
   ```typescript
   import { AuditTrailPanel } from "@/components/audit/AuditTrailPanel";
   ```

2. **New Section**:
   - Added after "Evidence Tracker" section
   - Before "Documents & Bundle" section
   - `CollapsibleSection` with:
     - Title: "Audit Trail"
     - Description: "Complete history of case events and changes"
     - Default open: `false` (collapsed by default)
     - Icon: `History` (purple)

3. **Error Boundary**:
   - Wrapped in `ErrorBoundary` for safety
   - Graceful fallback message

**Lazy Loading**:
- Component fetches data on mount (client-side)
- Does not block case page server-side rendering
- Fast initial page load

---

## 4. Event Label Mapping

All event types use `getEventTypeLabel()` from `lib/audit.ts`:

- `EVIDENCE_STATUS_CHANGED` → "Evidence status changed"
- `CHASE_DRAFTED` → "Chase draft generated"
- `ANALYSIS_VERSION_CREATED` → "Case analysis updated"
- `EVIDENCE_CREATED` → "Evidence item created"
- `CHASE_MARKED_SENT` → "Chase marked as sent"
- `REQUEST_DRAFTED` → "Evidence request drafted"
- `DOCS_ADDED` → "Documents added to case"
- `RISK_CHANGED` → "Risk rating changed"
- `UPLOAD_COMPLETED` → "Upload completed"
- `ANALYSIS_GENERATED` → "Analysis generated"
- `SUPERVISOR_REVIEWED` → "Supervisor reviewed"
- And all other event types...

---

## 5. Files Created/Modified

### New Files
1. `app/api/cases/[caseId]/audit-events/route.ts` - GET audit events API
2. `components/audit/AuditTrailPanel.tsx` - UI component

### Modified Files
1. `app/(protected)/cases/[caseId]/page.tsx` - Added Audit Trail section

---

## 6. Manual Test Steps

### Test 1: Basic Display
1. Open a case page
2. Scroll to "Audit Trail" section
3. Click to expand
4. Verify events load and display
5. Check timestamps are formatted correctly
6. Verify event labels are human-readable

### Test 2: Event Details
1. Find an event with payload data
2. Click chevron to expand
3. Verify JSON payload is pretty-printed
4. Click chevron again to collapse
5. Verify expansion/collapse works smoothly

### Test 3: Empty State
1. Open a new case (no events yet)
2. Expand Audit Trail section
3. Verify empty state message displays
4. Message should be friendly and informative

### Test 4: Error Handling
1. Temporarily break API route
2. Open case page
3. Expand Audit Trail section
4. Verify error message displays gracefully
5. Page should not crash

### Test 5: Event Types
1. Perform various actions on a case:
   - Upload document
   - Change evidence status
   - Generate chase draft
   - Mark evidence received
2. Refresh case page
3. Expand Audit Trail
4. Verify all events appear with correct labels
5. Verify summaries are meaningful

### Test 6: Chronological Order
1. Open case with multiple events
2. Expand Audit Trail
3. Verify newest events appear first
4. Scroll down to verify older events

---

## 7. Security & Performance

**Security**:
- ✅ API verifies case belongs to org
- ✅ Uses existing `getCaseEvents()` helper (server-side)
- ✅ No sensitive data exposed
- ✅ Read-only (no mutations)

**Performance**:
- ✅ Lazy loading (client-side fetch)
- ✅ Doesn't block case page render
- ✅ Efficient query (indexed on case_id, timestamp)
- ✅ Collapsed by default (saves initial render)

---

## 8. Supervisor-Safe Design

**Readability**:
- Human-readable event labels
- Clear summaries (not technical jargon)
- Formatted timestamps
- Color-coded by event type

**Clarity**:
- Expandable details (not overwhelming)
- Pretty-printed JSON (readable)
- Event type badges (for technical reference)
- Clean, minimal design

**Completeness**:
- All events displayed
- Full payload available (expandable)
- Chronological order
- No filtering (complete history)

---

## Summary

✅ **API Route**: `GET /api/cases/[caseId]/audit-events` with human-readable summaries  
✅ **UI Component**: `AuditTrailPanel` with expandable payloads  
✅ **Case Page Integration**: New "Audit Trail" section  
✅ **Read-Only**: No mutations, supervisor-safe  
✅ **Lazy Loading**: Doesn't block case page  
✅ **Complete**: All events displayed chronologically  

**Ready for testing.**

