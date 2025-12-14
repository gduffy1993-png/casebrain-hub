# Phase 1 Implementation Summary - Evidence Memory System

## Overview
Phase 1 implements the database foundation, types, and seed helpers for the Evidence Memory system (Post-Build Lock-In layer). This enables tracking evidence items with status, chase dates, and automatic seeding from missing evidence analysis.

---

## 1. Database Migrations

### Migration A: `0050_evidence_items.sql`
**File**: `supabase/migrations/0050_evidence_items.sql`

**Table**: `evidence_items`

**Columns**:
- `id` (UUID, PK)
- `case_id` (UUID, FK → cases)
- `org_id` (TEXT) - for RLS
- `practice_area` (TEXT, nullable)
- `title` (TEXT, NOT NULL)
- `category` (TEXT, nullable) - Records, Radiology, Witness, Finance, etc.
- `source` (TEXT, nullable) - Hospital, GP, Client, Landlord, Opponent
- `why_needed` (TEXT, nullable)
- `status` (TEXT, NOT NULL, default: 'outstanding')
- `requested_at` (TIMESTAMPTZ, nullable)
- `last_chased_at` (TIMESTAMPTZ, nullable)
- `escalated_at` (TIMESTAMPTZ, nullable)
- `received_at` (TIMESTAMPTZ, nullable)
- `due_at` (TIMESTAMPTZ, nullable)
- `meta` (JSONB, default: '{}')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Constraints**:
- `status` CHECK constraint: `outstanding | requested | received | escalated | no_longer_needed`
- `UNIQUE (case_id, title)` - prevents duplicates per case

**Indexes**:
- `(case_id)`
- `(case_id, status)`
- `(status, last_chased_at)`
- `(org_id)`

**Triggers**:
- `trg_evidence_items_updated_at` - auto-updates `updated_at` on row update

**RLS**:
- Policy: `evidence_items_org_access` - org-level access control

---

### Migration B: `0051_extend_audit_events.sql`
**File**: `supabase/migrations/0051_extend_audit_events.sql`

**Changes to**: `case_audit_events` table

**Actions**:
1. Drops existing `valid_event_type` CHECK constraint
2. Recreates constraint with extended event types:
   - **Existing**: UPLOAD_STARTED, UPLOAD_COMPLETED, EXTRACTION_STARTED, EXTRACTION_COMPLETED, ANALYSIS_GENERATED, ANALYSIS_REGENERATED, SUPERVISOR_REVIEWED, OVERVIEW_PDF_EXPORTED, DOCUMENT_VIEWED, DOCUMENT_DELETED, CASE_ARCHIVED, CASE_RESTORED, CASE_DELETED, AI_ERROR, SYSTEM_ERROR
   - **New Evidence Memory**: EVIDENCE_CREATED, EVIDENCE_STATUS_CHANGED, REQUEST_DRAFTED, CHASE_DRAFTED, CHASE_MARKED_SENT
   - **New Incremental Updates**: DOCS_ADDED, ANALYSIS_VERSION_CREATED, RISK_CHANGED
   - **New Win Stories**: WIN_STORY_SNAPSHOT
3. Ensures `meta` JSONB column exists
4. Adds index: `(case_id, created_at DESC)` for efficient history queries

---

### Migration C: `0052_win_story_snapshots.sql`
**File**: `supabase/migrations/0052_win_story_snapshots.sql`

**Table**: `win_story_snapshots`

**Columns**:
- `id` (UUID, PK)
- `case_id` (UUID, FK → cases)
- `org_id` (TEXT)
- `title` (TEXT, default: 'Win snapshot v1')
- `note` (TEXT, nullable)
- `before_risk` (TEXT, nullable)
- `after_risk` (TEXT, nullable)
- `snapshot` (JSONB, default: '{}') - stores risk, summary, evidence_counts, key_issues_excerpt, timeline_count
- `created_by` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

**Indexes**:
- `(case_id, created_at DESC)`
- `(org_id, created_at DESC)`

**RLS**:
- Policy: `win_story_snapshots_org_access` - org-level access control

---

## 2. TypeScript Types and Constants

### File: `lib/evidence/types.ts`

**Exports**:

1. **`EvidenceStatus`** (union type):
   ```typescript
   "outstanding" | "requested" | "received" | "escalated" | "no_longer_needed"
   ```

2. **`EvidenceItem`** (interface):
   - Full type definition matching database schema
   - Includes all fields: id, caseId, orgId, practiceArea, title, category, source, whyNeeded, status, timestamps, meta

3. **`EvidenceDraftType`** (union type):
   ```typescript
   "request_email" | "request_whatsapp" | "chase_7" | "escalate_14"
   ```

4. **`AUDIT_EVENT_TYPES`** (constants object):
   - All new audit event type constants
   - Used for type-safe event logging

5. **`EvidenceAuditEventType`** (union type):
   - Type-safe union of all evidence-related audit event types

6. **`WinStorySnapshot`** (interface):
   - Full type definition for win story snapshots
   - Includes snapshot JSONB structure typing

---

## 3. Due Logic Functions

### File: `lib/evidence/dueLogic.ts`

**Pure functions** (no database access):

1. **`isChase7Due(item, now?)`**:
   - Returns `boolean`
   - Checks if Day 7 chase draft is due
   - Conditions:
     - Status is "requested" or "outstanding"
     - `requested_at` exists
     - `now - requested_at >= 7 days`
     - (`last_chased_at` is null OR `now - last_chased_at >= 7 days`)

2. **`isEscalation14Due(item, now?)`**:
   - Returns `boolean`
   - Checks if Day 14 escalation draft is due
   - Conditions:
     - `now - requested_at >= 14 days`
     - `escalated_at` is null

3. **`nextDueLabel(item, now?)`**:
   - Returns `string | null`
   - Human-readable label for what's due next
   - Examples:
     - "Escalation due (14+ days)"
     - "Chase due (7+ days)"
     - "Chase due in 3 days"
     - "Not yet requested"

---

## 4. Seed Helper

### File: `lib/evidence/seedFromMissingEvidence.ts`

**Function**: `seedEvidenceItemsFromMissingEvidence(caseId, orgId, missingEvidence[])`

**Purpose**: Idempotent conversion of missing evidence gaps into `evidence_items`

**Features**:
- Takes `MissingEvidenceItem[]` from `lib/missing-evidence.ts`
- Derives `title` from `label`
- Derives `why_needed` from `reason`
- Maps `category` from `MissingEvidenceItem.category`
- Infers `source` from label content (Hospital, GP, Client, Landlord, Opponent, Witness, Expert)
- Maps `status` from `MissingEvidenceItem.status` (MISSING → outstanding, REQUESTED → requested, RECEIVED → received)
- Stores priority, suggestedAction, linkedDocIds in `meta` JSONB
- Uses `UPSERT` with `(case_id, title)` unique constraint for idempotency
- Returns array of created/updated evidence item IDs

**Helper**: `getCasePracticeArea(caseId, orgId)` - fetches practice area from case record

---

## 5. SQL Sanity Check Queries

### Verify Tables Created
```sql
-- Check evidence_items table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'evidence_items';

-- Check win_story_snapshots table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'win_story_snapshots';

-- Check constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'evidence_items' 
AND constraint_type = 'CHECK';
```

### Verify Indexes
```sql
-- Check evidence_items indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'evidence_items';

-- Check win_story_snapshots indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'win_story_snapshots';
```

### Verify RLS Policies
```sql
-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('evidence_items', 'win_story_snapshots');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('evidence_items', 'win_story_snapshots');
```

### Verify Audit Events Extended
```sql
-- Check constraint includes new event types
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'valid_event_type' 
AND conrelid = 'case_audit_events'::regclass;

-- Check index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'case_audit_events' 
AND indexname = 'idx_case_audit_events_case_created';
```

### Test Insert (with proper org_id)
```sql
-- Test evidence_items insert (replace with real case_id and org_id)
INSERT INTO evidence_items (case_id, org_id, title, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'test-org', 'Test Evidence', 'outstanding')
ON CONFLICT (case_id, title) DO NOTHING
RETURNING id;

-- Test win_story_snapshots insert
INSERT INTO win_story_snapshots (case_id, org_id, title, snapshot)
VALUES ('00000000-0000-0000-0000-000000000000', 'test-org', 'Test Win Story', '{}'::jsonb)
RETURNING id;
```

---

## 6. Files Created/Modified

### New Files
1. `supabase/migrations/0050_evidence_items.sql`
2. `supabase/migrations/0051_extend_audit_events.sql`
3. `supabase/migrations/0052_win_story_snapshots.sql`
4. `lib/evidence/types.ts`
5. `lib/evidence/dueLogic.ts`
6. `lib/evidence/seedFromMissingEvidence.ts`

### Modified Files
- None (Phase 1 is database + types only, no existing code changes)

---

## 7. Next Steps (Phase 2+)

**Phase 2**: Evidence Memory UI on Case Page
- Evidence Tracker panel component
- Status badges and actions
- "Mark Requested", "Generate Chase Draft", "Mark Received" buttons

**Phase 3**: Chase Draft Logic
- Day 7 chase draft generation
- Day 14 escalation draft generation
- Draft content templates (email + WhatsApp)

**Phase 4**: Supervisor Dashboard
- Cases blocked by outstanding evidence
- Overdue chases
- Escalations due
- High risk cases

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

## 8. Testing Notes

- All migrations are idempotent (safe to run multiple times)
- Seed helper is idempotent (uses UPSERT with unique constraint)
- Due logic functions are pure (no side effects, easy to test)
- RLS policies follow existing repo patterns
- Types are fully typed with TypeScript

---

## Summary

Phase 1 provides the complete database foundation for Evidence Memory:
- ✅ Evidence items table with full status tracking
- ✅ Extended audit events for all new event types
- ✅ Win story snapshots table
- ✅ TypeScript types and constants
- ✅ Pure due logic functions
- ✅ Idempotent seed helper

**Ready for Phase 2**: UI components and API routes.

