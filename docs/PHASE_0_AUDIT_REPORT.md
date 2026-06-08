# Phase 0 - Repo Audit Report
## Post-Build Lock-In Layer Implementation

### Executive Summary
This audit identifies existing patterns, components, and database structures to guide implementation of the Evidence Memory, Chase Drafts, Supervisor Dashboard, Audit Trail, and Win Story features.

---

## 1. Missing Evidence - Current Implementation

### Backend Source
- **File**: `lib/missing-evidence.ts`
- **Function**: `findMissingEvidence(caseId, caseType, documents)`
- **Returns**: `MissingEvidenceItem[]` with fields:
  - `id`, `caseId`, `category`, `label`, `reason`, `priority`, `status`, `suggestedAction`
- **Status values**: `"MISSING" | "REQUESTED" | "RECEIVED"` (limited - needs expansion)
- **Uses**: Pack system (`getEvidenceChecklist`) with fallback to legacy requirements
- **Detection**: Pattern-based matching on document names/types and extracted JSON

### UI Component
- **File**: `components/core/MissingEvidencePanel.tsx`
- **Location**: Used in `app/(protected)/cases/[caseId]/page.tsx`
- **Features**:
  - Groups by category (LIABILITY, CAUSATION, QUANTUM, HOUSING, PROCEDURE)
  - Shows status badges (MISSING, REQUESTED, RECEIVED)
  - "Create Task" button for missing items
  - Currently creates tasks via `/api/tasks` endpoint
- **Limitations**:
  - No status tracking (requested_at, last_chased_at)
  - No chase draft generation
  - No evidence request templates
  - Status changes don't persist to DB (only local state)

---

## 2. Cases Table Structure

### Base Table
- **Table**: `cases`
- **Key Fields** (from migrations and usage):
  - `id` (UUID, PK)
  - `org_id` (TEXT)
  - `title`, `summary`, `extracted_summary`
  - `practice_area` (TEXT)
  - `timeline` (JSONB)
  - `is_archived` (BOOLEAN)
  - `supervisor_reviewed`, `supervisor_reviewed_at`, `supervisor_reviewer_id`, `supervisor_review_note`
  - `current_analysis` (JSONB)
  - `created_at`, `updated_at`

### Practice Area Specific Tables
- `pi_cases` (references `cases.id`)
- `housing_cases` (references `cases.id`)
- `criminal_cases` (references `cases.id`)

### Access Pattern
- Cases fetched via `getSupabaseAdminClient()` with `org_id` filter
- RLS policies enforce org-level access (see RLS section)

---

## 3. Database Patterns

### Migration Structure
- **Location**: `supabase/migrations/`
- **Naming**: Sequential numbers (e.g., `0050_*.sql`)
- **Pattern**: 
  - `CREATE TABLE IF NOT EXISTS`
  - Indexes created immediately after table
  - RLS enabled with policies
  - Triggers for `updated_at` timestamps

### Existing Audit Table
- **Table**: `case_audit_events` (from `0031_enterprise_features.sql`)
- **Fields**: `id`, `case_id`, `event_type`, `timestamp`, `user_id`, `meta` (JSONB)
- **Event Types**: Limited set (UPLOAD_STARTED, ANALYSIS_GENERATED, etc.)
- **Library**: `lib/audit.ts` with `logCaseEvent()` / `appendAuditLog()`
- **Note**: Will need to extend event types for new features

### RLS Patterns
- **Pattern**: Org-level access control
- **Example** (from `0037_strategic_intelligence_support.sql`):
  ```sql
  CREATE POLICY timeline_events_org_access
    ON public.timeline_events
    FOR ALL
    USING (org_id = current_setting('app.current_org_id')::text)
    WITH CHECK (org_id = current_setting('app.current_org_id')::text);
  ```
- **Access**: Uses `getSupabaseAdminClient()` (service role) for server-side, bypasses RLS
- **Client-side**: Would use RLS, but most operations are server-side

---

## 4. UI Components

### Available Components
- **Card**: `components/ui/card.tsx` - Supports `title`, `description`, `action`, variants
- **Badge**: `components/ui/badge.tsx` - Variants: default, success, warning, danger, primary, secondary, outline
- **Button**: `components/ui/button.tsx` (assumed, not read)
- **No Toast Component Found**: Will need to check or create

### Design System
- Dark theme with glassmorphism
- Color tokens: `primary`, `secondary`, `accent`, `success`, `warning`, `danger`
- Consistent spacing and rounded corners (`rounded-2xl`, `rounded-xl`)

---

## 5. API Route Patterns

### Structure
- **Location**: `app/api/`
- **Pattern**: RESTful routes (e.g., `/api/cases/[caseId]/...`)
- **Auth**: Uses `requireAuthContext()` or `requireRole()` from `lib/auth`
- **DB Access**: `getSupabaseAdminClient()` from `lib/supabase`
- **Response**: `NextResponse.json()` with error handling

### Example Pattern
```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await requireAuthContext();
  const { caseId } = await params;
  const supabase = getSupabaseAdminClient();
  
  // Fetch with org_id filter
  const { data, error } = await supabase
    .from("table")
    .select("*")
    .eq("case_id", caseId)
    .eq("org_id", orgId);
    
  return NextResponse.json({ data });
}
```

### No Server Actions Found
- Codebase uses API routes, not Next.js Server Actions
- Will follow this pattern

---

## 6. Case Page Structure

### File
- **Location**: `app/(protected)/cases/[caseId]/page.tsx`
- **Structure**: Server component that fetches data, renders panels
- **Panels**: Multiple `<Card>` components with various panels (MissingEvidencePanel, RiskAlertsPanel, etc.)
- **Data Fetching**: Parallel `Promise.all()` for multiple queries
- **Error Handling**: Graceful error boundaries and fallbacks

### Missing Evidence Integration
- Currently renders `<MissingEvidencePanel caseId={caseId} items={missingEvidence} />`
- Missing evidence computed server-side using `findMissingEvidence()`
- No persistence of status changes

---

## 7. Files to Touch

### New Files to Create
1. **Migrations**:
   - `supabase/migrations/0050_evidence_items.sql`
   - `supabase/migrations/0051_extend_audit_events.sql` (extend event types)
   - `supabase/migrations/0052_win_story_snapshots.sql`

2. **Backend Modules**:
   - `lib/evidence/evidence-items.ts` - CRUD operations
   - `lib/evidence/status-transitions.ts` - Status change logic
   - `lib/evidence/due-logic.ts` - Day 7/14 chase logic
   - `lib/evidence/draft-generators.ts` - Request/chase/escalation drafts
   - `lib/evidence/seed-from-analysis.ts` - Auto-create from missing evidence

3. **API Routes**:
   - `app/api/evidence/items/route.ts` - CRUD operations
   - `app/api/evidence/items/[itemId]/status/route.ts` - Status updates
   - `app/api/evidence/items/[itemId]/chase/route.ts` - Generate chase drafts
   - `app/api/evidence/items/[itemId]/request-draft/route.ts` - Generate request drafts
   - `app/api/supervision/dashboard/route.ts` - Supervisor dashboard data
   - `app/api/win-stories/route.ts` - Win story CRUD
   - `app/api/win-stories/[caseId]/capture/route.ts` - Capture win story

4. **UI Components**:
   - `components/evidence/EvidenceTrackerPanel.tsx` - Main evidence panel (replaces/enhances MissingEvidencePanel)
   - `components/evidence/EvidenceItemRow.tsx` - Individual evidence item with actions
   - `components/evidence/ChaseDraftModal.tsx` - Modal for chase drafts
   - `components/evidence/RequestDraftModal.tsx` - Modal for request drafts
   - `components/supervision/SupervisionDashboard.tsx` - Supervisor dashboard page
   - `components/audit/AuditTrailPanel.tsx` - Audit trail panel for case page
   - `components/win-stories/WinStoryCaptureModal.tsx` - Capture win story modal
   - `components/win-stories/WinStoriesList.tsx` - List of captured win stories

5. **Pages**:
   - `app/(protected)/supervision/page.tsx` - Supervisor dashboard
   - `app/(protected)/win-stories/page.tsx` - Win stories list

6. **Types**:
   - Extend `lib/types/casebrain.ts` with:
     - `EvidenceItem`, `EvidenceStatus`, `EvidenceCategory`
     - `WinStorySnapshot`
     - Extended `CaseEventType` enum

### Files to Modify
1. `lib/audit.ts` - Extend `CaseEventType` with new event types
2. `app/(protected)/cases/[caseId]/page.tsx` - Add EvidenceTrackerPanel, AuditTrailPanel
3. `components/core/MissingEvidencePanel.tsx` - May deprecate or enhance
4. `lib/missing-evidence.ts` - Add function to seed evidence items from analysis

---

## 8. Tables to Add/Modify

### New Tables

#### `evidence_items`
- **Purpose**: Track evidence items with status, chase dates, source
- **Fields**:
  - `id` (UUID, PK)
  - `case_id` (UUID, FK -> cases)
  - `org_id` (TEXT) - for RLS
  - `practice_area` (TEXT, nullable)
  - `title` (TEXT)
  - `category` (TEXT) - Records, Radiology, Witness, Finance, etc.
  - `source` (TEXT) - Hospital, GP, Client, Landlord, Opponent
  - `why_needed` (TEXT)
  - `status` (TEXT) - enum: outstanding | requested | received | escalated | no_longer_needed
  - `requested_at` (TIMESTAMPTZ, nullable)
  - `last_chased_at` (TIMESTAMPTZ, nullable)
  - `escalated_at` (TIMESTAMPTZ, nullable)
  - `received_at` (TIMESTAMPTZ, nullable)
  - `due_at` (TIMESTAMPTZ, nullable)
  - `meta` (JSONB, nullable) - date ranges, provider info, etc.
  - `created_at`, `updated_at`
- **Indexes**: `(case_id)`, `(case_id, status)`, `(status, last_chased_at)`, `(org_id)`

#### `win_story_snapshots`
- **Purpose**: Capture win stories with before/after snapshots
- **Fields**:
  - `id` (UUID, PK)
  - `case_id` (UUID, FK -> cases)
  - `org_id` (TEXT)
  - `title` (TEXT)
  - `before_risk` (TEXT) - risk rating before
  - `after_risk` (TEXT) - risk rating after
  - `evidence_delta` (JSONB) - evidence stats snapshot
  - `snapshot_payload` (JSONB) - full case snapshot
  - `note` (TEXT) - "what changed / outcome"
  - `captured_at` (TIMESTAMPTZ)
  - `captured_by` (TEXT) - user_id
  - `created_at`
- **Indexes**: `(case_id)`, `(org_id)`, `(captured_at DESC)`

### Tables to Modify

#### `case_audit_events`
- **Extend**: `event_type` constraint to include:
  - `EVIDENCE_CREATED`
  - `EVIDENCE_STATUS_CHANGED`
  - `CHASE_DRAFTED`
  - `CHASE_MARKED_SENT`
  - `EVIDENCE_RECEIVED`
  - `RISK_UPDATED`
  - `WIN_STORY_SNAPSHOT`
- **Add fields** (optional):
  - `actor_role` (TEXT) - "owner", "member"
  - `summary` (TEXT) - one-line summary (for faster queries)

---

## 9. Endpoints/Actions to Add

### Evidence Items
- `GET /api/evidence/items?caseId=...` - List evidence items for case
- `POST /api/evidence/items` - Create evidence item
- `PATCH /api/evidence/items/[itemId]` - Update evidence item
- `PATCH /api/evidence/items/[itemId]/status` - Update status (with audit)
- `POST /api/evidence/items/[itemId]/chase` - Generate chase draft (Day 7/14)
- `POST /api/evidence/items/[itemId]/request-draft` - Generate request draft (email/WhatsApp)
- `POST /api/evidence/seed` - Auto-create from missing evidence analysis

### Supervisor Dashboard
- `GET /api/supervision/dashboard` - Aggregated data:
  - Cases blocked by outstanding evidence
  - Overdue chases
  - Escalations due
  - High risk cases
  - Table data with computed fields

### Audit Trail
- `GET /api/audit/events?caseId=...` - Get audit events for case (may already exist)

### Win Stories
- `GET /api/win-stories` - List win stories (with filters)
- `POST /api/win-stories/[caseId]/capture` - Capture win story snapshot
- `GET /api/win-stories/[id]` - Get single win story

---

## 10. Implementation Notes

### Service Layer Pattern
- All mutations should go through service functions in `lib/evidence/`
- Service functions handle:
  - DB operations
  - Audit logging (via `logCaseEvent()`)
  - Status transition validation
  - Due date calculations

### Confidence-Safe Language
- Create `lib/analysis/confidence-framing.ts` helper
- Replace overconfident phrases in:
  - Analysis outputs
  - Internal notes
  - Risk assessments
- Patterns:
  - "This indicates..." → "Based on current documents, this is suggestive of..."
  - "The case is strong" → "Further evidence required to confirm, but initial indicators suggest..."
  - "Definitely" → "Appears to" / "Suggests"

### Idempotency
- Evidence item seeding must be idempotent
- Use deterministic key: `(case_id, title)` or `meta.hash`
- Check for existing items before creating

### Performance
- Supervisor dashboard must be fast
- Use aggregated queries or materialized views if needed
- Consider caching for frequently accessed data

---

## 11. Testing Considerations

### No Test Setup Found
- Codebase doesn't appear to have a testing framework set up
- Will skip tests but keep code clean and well-structured
- Add comprehensive error handling and logging

---

## 12. Next Steps

1. **Phase 1**: Create database migrations and types
2. **Phase 2**: Implement evidence items backend (CRUD, status transitions)
3. **Phase 3**: Build UI components (EvidenceTrackerPanel)
4. **Phase 4**: Implement chase draft logic
5. **Phase 5**: Build supervisor dashboard
6. **Phase 6**: Add audit trail UI
7. **Phase 7**: Implement win story capture

---

## Summary

- **Missing Evidence**: Currently computed but not persisted; needs status tracking
- **Cases Table**: Well-structured with org-level access
- **Audit System**: Exists but needs extension
- **UI Components**: Card, Badge available; consistent design system
- **API Pattern**: RESTful routes with auth; no server actions
- **RLS**: Org-level policies; server-side uses admin client

Ready to proceed with Phase 1 implementation.

