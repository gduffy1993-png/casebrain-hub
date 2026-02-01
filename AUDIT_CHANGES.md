# Audit: Files Changed and Function Usage

## Files Changed in This Session

### 1. New Files Created

#### `lib/criminal/disclosure-state.ts`
- **Purpose**: Single source of truth for disclosure state computation
- **Exports**: 
  - `computeDisclosureState(input)` - Main function
  - `DisclosureState` type
  - `DisclosureStateInput` type
- **UI Usage**: 
  - `components/criminal/StrategyCommitmentPanel.tsx` (lines 12, 1409, 1483, 2564, 4868)
  - Used in `ProceduralSafetyPanel` and `SupervisorSnapshot`

#### `lib/criminal/judge-constraint-lens.ts`
- **Purpose**: Doctrine-based constraints on how the court must analyze issues
- **Exports**:
  - `buildJudgeConstraintLens(input)` - Main function
  - `JudgeConstraintLens` type
- **UI Usage**:
  - `components/criminal/StrategyCommitmentPanel.tsx` (lines 19, 4828, 5631-5700)
  - Rendered in Phase 2 as "Judge Constraints (Doctrine)" panel (read-only, only when `isCommitted`)

#### `lib/criminal/strategy-output/route-playbooks.ts`
- **Purpose**: Operational fight plans per route (trial, reduction, procedural, mitigation)
- **Exports**:
  - `buildRoutePlaybooks(input)` - Main function
  - `RoutePlaybooks` type
  - `RoutePlaybook` type
- **UI Usage**:
  - `components/criminal/StrategyCommitmentPanel.tsx` (lines 20, 4843, 5387-5553)
  - Rendered in Phase 2 as "Route Playbooks" panel (read-only, only when `isCommitted`)
  - Primary route expanded by default, others collapsible

#### `lib/criminal/strategy-output/hearing-scripts.ts`
- **Purpose**: Short checklists for court hearings tied to disclosure and routes
- **Exports**:
  - `buildHearingScripts(input)` - Main function
  - `HearingScripts` type
  - `HearingScript` type
- **UI Usage**:
  - `components/criminal/StrategyCommitmentPanel.tsx` (lines 21, 4876, 5556-5624)
  - Rendered in Phase 2 as "Hearing Checklists" collapsible panel (read-only, only when `isCommitted`)

#### `components/criminal/AddEvidenceModal.tsx`
- **Purpose**: Modal for uploading new evidence (PDFs) to existing cases
- **UI Usage**:
  - `components/criminal/CriminalCaseView.tsx` (lines 27, 49, 472, 631-648)
  - Triggered by "Add Evidence" button in `CaseEvidenceColumn`
  - Separate from `EvidenceSelectorModal` (analysis selection)

### 2. Modified Files

#### `components/criminal/StrategyCommitmentPanel.tsx`
- **Changes**:
  - Added imports for new functions (lines 12, 19-21)
  - Added state: `disclosureState`, `judgeConstraintLens`, `routePlaybooks`, `hearingScripts`, `expandedPlaybooks`, `showHearingScripts`
  - Updated `ProceduralSafetyPanel` to use `computeDisclosureState` (lines 2504-2668)
  - Updated `SupervisorSnapshot` to use `computeDisclosureState` (lines 1334-1605)
  - Added Phase 2 guard (lines 4790-4796)
  - Added computation of new lenses/playbooks/scripts (lines 4810-4883)
  - Added UI panels for Route Playbooks (lines 5413-5553), Hearing Checklists (lines 5556-5624), Judge Constraints (lines 5631-5700)
  - Updated CPS Pressure Points display (lines 5273-5301)

#### `components/criminal/CriminalCaseView.tsx`
- **Changes**:
  - Added separate state: `showAddDocuments` (analysis selection) and `showAddEvidenceUpload` (upload)
  - Wired `EvidenceSelectorModal` with `onUploadMoreEvidence` callback (lines 613-628)
  - Wired `AddEvidenceModal` separately (lines 631-648)
  - Both modals refresh snapshot and router on success

#### `components/cases/EvidenceSelectorModal.tsx`
- **Changes**:
  - Added `onUploadMoreEvidence?: () => void` prop (line 22)
  - Updated "Upload more evidence" link to use callback (lines 196-200)
  - Removed DOM manipulation hacks

#### `components/criminal/CaseEvidenceColumn.tsx`
- **Changes**:
  - Added `onAddEvidenceUpload?: () => void` prop
  - "Add Evidence" button prioritizes upload callback if provided

#### `lib/criminal/strategy-output/cps-pressure.ts`
- **Changes**:
  - Updated `pressure_points` type to include:
    - `targets_element: string`
    - `depends_on: string[]`
    - `how_to_blunt: string[]`
  - Updated `buildPressurePoints` to populate new fields (lines 246-334)

## Function Usage in UI

### `computeDisclosureState`
**Location**: `lib/criminal/disclosure-state.ts`

**Used in**:
1. `ProceduralSafetyPanel` (StrategyCommitmentPanel.tsx:2564)
   - Computes disclosure state for procedural safety status
   - Shows SIMULATED badge and banner if detected
   - Displays missing/satisfied items

2. `SupervisorSnapshot` (StrategyCommitmentPanel.tsx:1409)
   - Computes disclosure state for snapshot export
   - Uses `missing_items` for disclosure status summary
   - Adds SIMULATED note to export (factual, not banner text)

3. `Hearing Scripts` (StrategyCommitmentPanel.tsx:4868)
   - Computes disclosure state to generate hearing-specific asks
   - Uses `missing_items` and `status` to determine what to request

### `buildJudgeConstraintLens`
**Location**: `lib/criminal/judge-constraint-lens.ts`

**Used in**:
1. `StrategyCommitmentPanel` Phase 2 (line 4828)
   - Computed after route playbooks
   - Rendered as "Judge Constraints (Doctrine)" panel (lines 5631-5700)
   - Only visible when `isCommitted === true`
   - Shows: constraints, required_findings, intolerances, red_flags

### `buildRoutePlaybooks`
**Location**: `lib/criminal/strategy-output/route-playbooks.ts`

**Used in**:
1. `StrategyCommitmentPanel` Phase 2 (line 4843)
   - Computed after judge constraint lens
   - Rendered as "Route Playbooks" panel (lines 5413-5553)
   - Only visible when `isCommitted === true`
   - Primary route expanded by default
   - Shows: posture, objective, prosecution_burden, defence_counters, kill_switches, pivots, next_actions

### `buildHearingScripts`
**Location**: `lib/criminal/strategy-output/hearing-scripts.ts`

**Used in**:
1. `StrategyCommitmentPanel` Phase 2 (line 4876)
   - Computed after route playbooks
   - Rendered as "Hearing Checklists" collapsible panel (lines 5556-5624)
   - Only visible when `isCommitted === true`
   - Shows: checklist, asks_of_court, do_not_concede for each hearing type

### `buildCPSPressureLens`
**Location**: `lib/criminal/strategy-output/cps-pressure.ts`

**Used in**:
1. `StrategyCommitmentPanel` Phase 2 (line 4819)
   - Computed after defence strategy plan
   - Displayed in "How This Case Is Fought" section (lines 5273-5301)
   - Only visible when `isCommitted === true`
   - Shows pressure points with targets_element, depends_on, why_it_bites, how_to_blunt

### `buildDefenceStrategyPlan`
**Location**: `lib/criminal/strategy-output/defence-strategy.ts`

**Used in**:
1. `StrategyCommitmentPanel` Phase 2 (line 4810)
   - Computed after evidence snapshot
   - Displayed in "How This Case Is Fought" section (lines 5222-5342)
   - Only visible when `isCommitted === true`
   - Shows: posture, primary_route, CPS pressure points, defence_counters, kill_switches, pivot_plan

## Verification Checklist

### ✅ EvidenceSelectorModal still selects docs for analysis
**Location**: `components/criminal/CriminalCaseView.tsx` (lines 613-628)
- State: `showAddDocuments` controls visibility
- Usage: Opens when user clicks "Select Evidence for Analysis"
- Function: Selects existing documents for analysis bundle
- Callback: `onUploadMoreEvidence` navigates to upload modal (does not upload inside modal)

### ✅ AddEvidenceModal still uploads PDFs
**Location**: `components/criminal/CriminalCaseView.tsx` (lines 631-648)
- State: `showAddEvidenceUpload` controls visibility
- Usage: Opens when user clicks "Add Evidence" button or "Upload more evidence" link
- Function: Uploads new PDF files to case
- On success: Refreshes snapshot and router, updates document list

### ✅ Disclosure state is computed in one place and reused everywhere
**Single Source**: `lib/criminal/disclosure-state.ts` - `computeDisclosureState()`

**Used in**:
1. `ProceduralSafetyPanel` (StrategyCommitmentPanel.tsx:2564)
2. `SupervisorSnapshot` (StrategyCommitmentPanel.tsx:1409)
3. `Hearing Scripts` (StrategyCommitmentPanel.tsx:4868)

**No ad-hoc disclosure logic**: All panels use the same function, preventing contradictions.

### ✅ Phase 2 outputs only render after commitment
**Guard Location**: `components/criminal/StrategyCommitmentPanel.tsx` (lines 4790-4796)

```typescript
// Hard Phase-2 guard: defence strategy outputs only exist when strategy is committed
if (!isCommitted) {
  setDefenceStrategyPlan(null);
  setCpsPressureLens(null);
  setJudgeConstraintLens(null);
  setRoutePlaybooks(null);
  setHearingScripts(null);
  return;
}
```

**UI Guards**:
- `defenceStrategyPlan && isCommitted` (line 5292)
- `cpsPressureLens && isCommitted` (line 5300, within "How This Case Is Fought" section)
- `judgeConstraintLens && isCommitted` (line 5631)
- `routePlaybooks && routePlaybooks.playbooks.length > 0 && isCommitted` (line 5413)
- `hearingScripts && hearingScripts.scripts.length > 0 && isCommitted` (line 5556)

### ✅ Simulated docs are labelled in UI and do not contaminate exports
**Detection**: `lib/criminal/disclosure-state.ts` - `isSimulated()` function
- Checks document titles for "SIMULATED" (case-insensitive)

**UI Labels**:
1. `ProceduralSafetyPanel` (lines 2627-2638):
   - Shows "SIMULATED" badge next to status
   - Shows "Demo / Simulated evidence present" banner (UI-only)

2. `SupervisorSnapshot` (lines 1591-1593):
   - Shows "SIMULATED" badge in disclosure status summary (UI-only)

**Export Handling**:
- `SupervisorSnapshot` export (line 1497):
  - Adds factual note: "NOTE: SIMULATED documents detected - this is a demo/test case."
  - Does NOT include banner text "Demo / Simulated evidence present"
  - Note is factual, not a warning banner

## Summary

All requirements verified:
- ✅ EvidenceSelectorModal: Selects docs for analysis (separate from upload)
- ✅ AddEvidenceModal: Uploads PDFs (separate from analysis selection)
- ✅ Disclosure state: Single source of truth (`computeDisclosureState`)
- ✅ Phase 2 outputs: Hard guard + UI guards ensure only render after commitment
- ✅ Simulated docs: Labelled in UI with badges/banners, factual note in exports (no banner text)
