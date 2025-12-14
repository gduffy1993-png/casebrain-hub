# Phase 2 Implementation Summary - Evidence Tracker UI + CRUD Routes

## Overview
Phase 2 implements the Evidence Tracker UI panel on the case page, API routes for CRUD operations, automatic seeding from missing evidence analysis, and audit event logging for all changes.

---

## 1. API Routes Created

### `app/api/evidence/items/route.ts`

**GET `/api/evidence/items?caseId=...`**
- Lists all evidence items for a case
- Verifies case belongs to org
- Returns array of `EvidenceItem[]`
- Transforms database rows to TypeScript types

**POST `/api/evidence/items`**
- Creates new evidence item (manual creation)
- Payload: `{ caseId, title, category?, source?, whyNeeded?, practiceArea?, meta? }`
- Uses unique constraint `(case_id, title)` to prevent duplicates
- Writes `EVIDENCE_CREATED` audit event
- Returns created `EvidenceItem`

---

### `app/api/evidence/items/[itemId]/status/route.ts`

**PATCH `/api/evidence/items/[itemId]/status`**
- Updates evidence item status
- Payload: `{ status: EvidenceStatus }`
- Automatically sets timestamps based on status:
  - `requested` → sets `requested_at`
  - `received` → sets `received_at`
  - `escalated` → sets `escalated_at`
- Writes `EVIDENCE_STATUS_CHANGED` audit event with previous/new status
- Returns updated `EvidenceItem`

---

### `app/api/evidence/items/[itemId]/chase/route.ts`

**POST `/api/evidence/items/[itemId]/chase`**
- Generates chase draft (Day 7) or escalation draft (Day 14)
- Uses `isChase7Due()` and `isEscalation14Due()` from `lib/evidence/dueLogic.ts`
- Payload: `{ markChased?: boolean }` - if true, updates timestamps
- Returns draft object:
  ```typescript
  {
    type: "chase_7" | "escalate_14",
    subject: string,
    email: string,  // Full email draft
    whatsapp: string  // Short WhatsApp draft
  }
  ```
- If `markChased: true`:
  - Updates `last_chased_at` (for chase) or `escalated_at` (for escalation)
  - Sets status to `escalated` if escalation
  - Writes `CHASE_MARKED_SENT` audit event
- Otherwise writes `CHASE_DRAFTED` audit event

**Draft Generation**:
- Email drafts: Formal, includes source, why needed, date requested
- WhatsApp drafts: 2-3 lines, concise
- Escalation drafts: More urgent tone, mentions days outstanding

---

## 2. UI Component

### `components/evidence/EvidenceTrackerPanel.tsx`

**Client Component** - Displays evidence items with status tracking and actions

**Features**:
- Lists all evidence items with status badges
- Shows: title, source, why needed, requested date, due label
- Status colors and icons:
  - `outstanding`: Gray/outline
  - `requested`: Warning/yellow
  - `received`: Success/green
  - `escalated`: Danger/red
  - `no_longer_needed`: Muted

**Actions per item**:
- **"Mark Requested"** - Changes status from `outstanding` → `requested`
- **"Day 7 Chase"** - Generates chase draft (if due)
- **"Escalation Draft"** - Generates escalation draft (if 14+ days)
- **"Mark Received"** - Changes status to `received`

**Due Logic Display**:
- Shows `nextDueLabel()` output (e.g., "Chase due in 3 days", "Escalation due (14+ days)")
- Highlights items with due chases in warning color

**Summary Badges**:
- Counts for: outstanding, requested, received, escalated
- Quick visual overview

**Refresh Button**:
- Fetches latest items from API
- Updates local state

**Empty State**:
- Shows message when no evidence items exist
- Explains items are auto-created from missing evidence analysis

---

## 3. Case Page Integration

### `app/(protected)/cases/[caseId]/page.tsx`

**Changes**:

1. **Import**:
   ```typescript
   import { EvidenceTrackerPanel } from "@/components/evidence/EvidenceTrackerPanel";
   ```

2. **Seeding Logic** (after `findMissingEvidence`):
   - Calls `seedEvidenceItemsFromMissingEvidence()` idempotently
   - Runs on every page load
   - Won't create duplicates (unique constraint)
   - Fails gracefully (doesn't break page if seeding fails)

3. **Fetch Evidence Items**:
   - Queries `evidence_items` table
   - Filters by `case_id` and `org_id`
   - Transforms to `EvidenceItem[]` type
   - Orders by `created_at DESC`

4. **UI Section**:
   - New `CollapsibleSection` titled "Evidence Tracker"
   - Renders `<EvidenceTrackerPanel>` with `initialItems={evidenceItems}`
   - Wrapped in `ErrorBoundary` for safety
   - Default open: `true`
   - Icon: `FileQuestion`

**Location**: After "Missing Evidence" section, before "Documents & Bundle"

---

## 4. Audit Event Extensions

### `lib/audit.ts`

**Extended `CaseEventType`**:
- Added 9 new event types:
  - `EVIDENCE_CREATED`
  - `EVIDENCE_STATUS_CHANGED`
  - `REQUEST_DRAFTED`
  - `CHASE_DRAFTED`
  - `CHASE_MARKED_SENT`
  - `DOCS_ADDED`
  - `ANALYSIS_VERSION_CREATED`
  - `RISK_CHANGED`
  - `WIN_STORY_SNAPSHOT`

**Extended `getEventTypeLabel()`**:
- Added human-readable labels for all new event types

**Audit Events Written**:
- `EVIDENCE_CREATED` - When evidence item is created (manual or seeded)
- `EVIDENCE_STATUS_CHANGED` - When status changes (includes previous/new status in meta)
- `CHASE_DRAFTED` - When chase draft is generated
- `CHASE_MARKED_SENT` - When chase is marked as sent (markChased: true)

---

## 5. Files Created/Modified

### New Files
1. `app/api/evidence/items/route.ts` - GET/POST evidence items
2. `app/api/evidence/items/[itemId]/status/route.ts` - PATCH status
3. `app/api/evidence/items/[itemId]/chase/route.ts` - POST chase drafts
4. `components/evidence/EvidenceTrackerPanel.tsx` - UI component

### Modified Files
1. `lib/audit.ts` - Extended event types and labels
2. `app/(protected)/cases/[caseId]/page.tsx` - Added seeding, fetching, and panel

---

## 6. Data Flow

### On Case Page Load:
1. `findMissingEvidence()` runs → returns `MissingEvidenceItem[]`
2. `seedEvidenceItemsFromMissingEvidence()` runs → creates/updates `evidence_items` (idempotent)
3. Query `evidence_items` table → fetch all items for case
4. Transform to `EvidenceItem[]` type
5. Pass to `<EvidenceTrackerPanel>` as `initialItems`

### User Actions:
1. **Mark Requested**: 
   - PATCH `/api/evidence/items/[id]/status` with `{ status: "requested" }`
   - API sets `requested_at` timestamp
   - API writes `EVIDENCE_STATUS_CHANGED` audit event
   - Component updates local state

2. **Generate Chase**:
   - POST `/api/evidence/items/[id]/chase` with `{ markChased: false }`
   - API checks due logic (`isChase7Due()` or `isEscalation14Due()`)
   - API generates email + WhatsApp drafts
   - API writes `CHASE_DRAFTED` audit event
   - Component copies draft to clipboard

3. **Mark Received**:
   - PATCH `/api/evidence/items/[id]/status` with `{ status: "received" }`
   - API sets `received_at` timestamp
   - API writes `EVIDENCE_STATUS_CHANGED` audit event
   - Component updates local state

---

## 7. Testing Checklist

### Manual Tests:
- [ ] Open case page → Evidence Tracker panel appears
- [ ] Missing evidence analysis → Evidence items auto-created
- [ ] Click "Mark Requested" → Status changes, timestamp set
- [ ] Wait 7+ days → "Day 7 Chase" button appears
- [ ] Click "Day 7 Chase" → Draft copied to clipboard
- [ ] Click "Mark Received" → Status changes to received
- [ ] Refresh page → Items persist
- [ ] Check audit events → All actions logged

### Edge Cases:
- [ ] No missing evidence → Empty state shows
- [ ] Duplicate evidence items → Unique constraint prevents duplicates
- [ ] Seeding fails → Page still loads (graceful error handling)
- [ ] API errors → Component shows error, doesn't crash

---

## 8. Next Steps (Phase 3+)

**Phase 3**: Chase Draft Logic Enhancement
- Request draft generation (email + WhatsApp)
- Template customization
- Better draft formatting

**Phase 4**: Supervisor Dashboard
- Cases blocked by outstanding evidence
- Overdue chases list
- Escalations due

**Phase 5**: Confidence-Safe Language
- Language sanitization helper
- Apply to analysis outputs

**Phase 6**: Audit Trail UI
- Audit trail panel on case page
- Event history display

**Phase 7**: Win Story Capture
- Capture win story action
- Win stories list page

---

## Summary

Phase 2 delivers:
- ✅ Evidence Tracker UI panel on case page
- ✅ Full CRUD API routes (GET, POST, PATCH)
- ✅ Chase draft generation (Day 7/14)
- ✅ Automatic seeding from missing evidence
- ✅ Audit event logging for all changes
- ✅ Status tracking with timestamps
- ✅ Due logic integration

**Ready for Phase 3**: Enhanced chase drafts and request templates.

