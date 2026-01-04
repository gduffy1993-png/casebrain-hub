# Phase 2 UI/UX Re-Layout - Implementation Summary

## Overview
Phase 2 focused on making the criminal case page feel like a real solicitor's case file with evidence & disclosure first, strategy as a "recorded position", and fast evidence intake.

## Completed Components

### 0. UI Snapshot Adapter ✅
**File:** `lib/criminal/case-snapshot-adapter.ts`

- Normalizes all API responses into a single `CaseSnapshot` object
- Fetches from: case metadata, analysis version, charges, strategy analysis, commitment, hearings, documents
- Provides consistent shape for UI consumption
- DEV-only console warnings for unexpected shapes
- **No backend changes** - pure mapping layer

**Usage:**
```typescript
import { buildCaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

const snapshot = await buildCaseSnapshot(caseId);
// Use snapshot.caseMeta, snapshot.analysis, snapshot.charges, etc.
```

### 1. Case Status Strip ✅
**File:** `components/criminal/CaseStatusStrip.tsx`

- Compact top-of-page summary row
- Shows: Disclosure status (Thin/Partial/Good), Analysis status, Last updated, Next hearing, Current position
- Never shows "error" language - uses "Temporarily unavailable" with retry
- Conservative disclosure status derivation from docCount + missing items

### 2. Two-Column Layout Components ✅

**Left Column (Evidence):**
- `components/criminal/CaseEvidenceColumn.tsx`
  - Documents list (tagged)
  - Missing Evidence panel (reuses existing)
  - Disclosure Tracker Table

**Right Column (Strategy):**
- `components/criminal/CaseStrategyColumn.tsx`
  - "Record Current Position" (re-tone of commitment)
  - Strategy Overview (collapsed by default)
  - Decision Checkpoints
  - Next Steps

### 3. Disclosure Tracker Table ✅
**File:** `components/criminal/DisclosureTrackerTable.tsx`

- Court-friendly table view
- Columns: Item, Status, Last Action, Date, Notes
- Status badges with icons (Received/Partial/Outstanding/Unknown)
- Conservative: only shows items from missing_evidence or analysis output
- Never invents dates or actions

### 4. Strategy Commitment Re-Tone ✅
**File:** `components/criminal/CaseStrategyColumn.tsx` (partial)

- "Record Current Position" replaces "Commit Strategy"
- Shows as decision log entry: Position, Basis/rationale, Timestamp
- Same backend endpoint (`/api/criminal/[caseId]/strategy-commitment`)
- No schema changes

## Integration Steps

### To integrate into `CriminalCaseView.tsx`:

1. **Add snapshot adapter usage:**
```typescript
import { buildCaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { CaseStatusStrip } from "./CaseStatusStrip";
import { CaseEvidenceColumn } from "./CaseEvidenceColumn";
import { CaseStrategyColumn } from "./CaseStrategyColumn";

// In component:
const [snapshot, setSnapshot] = useState(null);

useEffect(() => {
  buildCaseSnapshot(caseId).then(setSnapshot);
}, [caseId]);
```

2. **Replace layout with:**
```tsx
<div className="space-y-6">
  {snapshot && <CaseStatusStrip snapshot={snapshot} />}
  
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <CaseEvidenceColumn caseId={caseId} snapshot={snapshot} />
    <CaseStrategyColumn 
      caseId={caseId} 
      snapshot={snapshot}
      onRecordPosition={() => {/* open commitment modal */}}
    />
  </div>
</div>
```

## Pending Tasks

### 3. Evidence Add Flow (Pending)
- Drag-and-drop OR button opens minimal modal
- Type (CCTV/BWV/MG6/Witness/Medical/Forensic/Other)
- Status (Received/Partial/Outstanding)
- Notes (optional)
- Auto-detect type if possible
- Use existing upload/ingest pipeline

### 5. Strategy Commitment Full Re-Tone (Partial)
- Update `StrategyCommitmentPanel.tsx` copy to "Record current position"
- Change button text and descriptions
- Keep same endpoint and data structure

## Files Changed

1. `lib/criminal/case-snapshot-adapter.ts` (NEW)
2. `components/criminal/CaseStatusStrip.tsx` (NEW)
3. `components/criminal/CaseEvidenceColumn.tsx` (NEW)
4. `components/criminal/CaseStrategyColumn.tsx` (NEW)
5. `components/criminal/DisclosureTrackerTable.tsx` (NEW)

## Testing Checklist

- [ ] Status strip renders for Pack A without errors
- [ ] Charges show (pending is OK)
- [ ] Missing Evidence panel never errors
- [ ] Strategy banner never shows "Strategy analysis error"
- [ ] Disclosure tracker table shows items from missing_evidence
- [ ] Two-column layout responsive on mobile
- [ ] "Record Current Position" uses existing commitment endpoint

## Notes

- All components are fail-safe: no panels throw
- Uses `safeFetch` for consistent error handling
- Conservative parsing: never claims evidence present/missing unless derived from extracted evidence
- No database schema changes
- No new endpoints (uses existing ones)
- No analysis computation changes

