# CaseBrain Recent Changes Summary (Last 5 Prompts)

## Overview
This document summarizes all changes made to CaseBrain in the last 5 prompts, focusing on:
1. Criminal Defense output consistency and court-safety
2. Practice area viability gating (preventing wrong-domain strategy)
3. UI updates for viability banner and strategy suppression

---

## PROMPT 1: Criminal Defense Output Consistency & Court-Safety

### Goal
Make Criminal Defense case output consistent and court-safe by fixing:
- PACE "not recorded" contradiction
- Duplicated items
- Civil admin leakage (CFA/retainer)
- Misleading win % when bundle completeness is critical

### Changes Made

#### A) Fixed PACE Contradiction
**Files Changed:**
- `lib/packs/criminal/violentBeastMode.ts` - Added `paceStatus` calculation (UNKNOWN | CHECKED_NO_BREACHES | BREACH_FLAGGED)
- `lib/strategic/move-sequencing/types.ts` - Added `paceStatus` to `proceduralIntegrity` type
- `app/api/criminal/[caseId]/pace/route.ts` - Determines `paceStatus` based on evidence presence and breaches
- `components/criminal/PACEComplianceChecker.tsx` - Updated UI to show correct status messages

**Before → After:**
- Before: Showed "No PACE breaches detected" even when critical evidence was missing
- After: Shows "PACE status: UNKNOWN — missing custody/interview/solicitor records in bundle" when evidence is missing, "No PACE breaches detected (in provided material)" only when evidence exists and checked

#### B) Deduplication Applied
**Files Changed:**
- `lib/strategic/deduplication.ts` (NEW) - Helper module with `dedupeStrings`, `dedupeByKey`, `dedupeMissingEvidence`, `dedupeProceduralIntegrity`
- `lib/missing-evidence.ts` - Applied deduplication to missing evidence items
- `lib/packs/criminal/violentBeastMode.ts` - Applied deduplication to procedural integrity checklist and missing critical items
- `lib/strategic/move-sequencing/win-kill-conditions.ts` - Applied deduplication to win/kill conditions
- `lib/strategic/move-sequencing/move-sequencer.ts` - Applied deduplication to move sequence by `evidenceRequested`

**Before → After:**
- Before: Duplicate items like "Custody record..." and "Disclosure schedules..." appeared multiple times
- After: All items deduplicated using stable keys (label/item/evidenceRequested)

#### C) Removed Civil-Only Content from Criminal
**Files Changed:**
- `lib/strategic/practice-area-filters.ts` - Extended forbidden tokens to include "Client Identification" (civil meaning)

**Before → After:**
- Before: "Client Identification / Retainer / CFA" could appear in criminal packs
- After: All civil-only items (CFA, Part 36, PAP, retainer, client identification) are filtered out for criminal cases

#### D) Harmonised Win Probability with Bundle Completeness
**Files Changed:**
- `lib/criminal/probability-gate.ts` - Updated thresholds: < 10% = no numeric, < 30% = no headline
- `components/criminal/GetOffProbabilityMeter.tsx` - Updated UI to show appropriate messages based on completeness

**Before → After:**
- Before: Showed "70% win probability" even when bundle completeness was 0% / CRITICAL
- After: < 10% shows "Decision support only — upload served prosecution case papers", < 30% shows "Provisional assessment — bundle incomplete" (no numeric headline)

#### E) Fixed "Stay" Language (Court-Safe)
**Files Changed:**
- `lib/criminal/aggressive-defense-engine.ts` - Replaced all "Case should be stayed" with "Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable"

**Before → After:**
- Before: "Case should be stayed as an abuse of process"
- After: "Consider stay/abuse of process only if disclosure failures persist after a clear chase trail and directions/timetable"

---

## PROMPT 2: Practice Area Viability Gate (Backend)

### Goal
Prevent CaseBrain from generating wrong-domain strategy when uploaded documents don't contain minimum signals for the selected solicitor role. This applies to ALL 6 solicitor roles.

### Changes Made

#### Core Implementation
**File Created:**
- `lib/strategic/practice-area-viability.ts` (NEW)
  - `assessPracticeAreaViability()` - Main viability assessment function
  - `ROLE_RULES` - Config for all 6 solicitor roles with signal lists and minimum requirements
  - `EVIDENCE_TRIGGERS` - Evidence trigger rules for gating
  - `shouldShowEvidenceItem()` - Evidence trigger gating function
  - `hasEvidenceTrigger()` - Helper to check if triggers exist

**ROLE_RULES Configuration:**
```typescript
ROLE_RULES = {
  criminal_solicitor: { minSignals: 2, signals: ["EWCA Crim", "R v", "Crown Court", "PACE", "CPIA", ...] },
  clinical_neg_solicitor: { minSignals: 2, signals: ["patient", "NHS", "Trust", "hospital", "diagnosis", ...] },
  housing_solicitor: { minSignals: 2, signals: ["tenant", "landlord", "damp", "mould", "section 11", ...] },
  pi_solicitor: { minSignals: 2, signals: ["accident", "injury", "RTA", "CNF", "MOJ portal", ...] },
  family_solicitor: { minSignals: 2, signals: ["child arrangements", "CAFCASS", "s.8", ...] },
  general_litigation_solicitor: { minSignals: 1, signals: ["claimant", "defendant", "litigation", ...] }
}
```

**Evidence Trigger Rules:**
- Clinical Neg: radiology (ct/mri/x-ray), consent (procedure/surgery), escalation (deteriorat/sepsis), timeToTreatment (delay/waiting)
- Housing: dampMould, repairNotice, awaabsLaw
- PI: part36, mojPortal
- Criminal: pace, disclosure, cctv
- Family: cafcass, safeguarding

#### Integration Points
**Files Changed:**
1. **`app/api/strategic/[caseId]/overview/route.ts`**
   - Added viability check BEFORE any strategy generation
   - Builds `bundleText` from documents and timeline
   - Maps practice area to solicitor role
   - If not viable, returns only `analysisBanner` (no strategy)
   - Passes `bundleText` to `findMissingEvidence` for trigger gating

2. **`lib/missing-evidence.ts`**
   - Added optional `bundleText` parameter
   - Applies evidence trigger gating via `shouldShowEvidenceItem()`
   - Only shows evidence items if triggers exist in bundle

### Behavior

**When NOT Viable:**
- ❌ NO strategy generation (momentum, strategies, weakSpots, leveragePoints, moveSequence all null/empty)
- ✅ Returns only `analysisBanner` with:
  - `severity: "warning"`
  - `title: "Practice area mismatch"`
  - `message: "This document does not contain sufficient indicators for the selected solicitor role."`
  - `reasons: string[]` - Explains what was missing
  - `suggestedRole?: SolicitorRole` - If alternative role detected with ≥3 signals

**When Viable:**
- ✅ Full strategy generation proceeds normally
- ✅ Evidence items are trigger-gated (only shown if triggers exist)

---

## PROMPT 3: Practice Area Viability Gate (UI)

### Goal
Update UI so wrong-domain strategy cannot appear visually and user is guided cleanly when documents don't match selected role.

### Changes Made

#### 1. AnalysisBanner Component
**File Created:**
- `components/strategic/AnalysisBanner.tsx` (NEW)
  - Accepts props: `severity`, `title`, `message`, `reasons[]`, `suggestedRole`, `onSwitchRole`
  - Renders clear banner at top of Strategic Intelligence section
  - Shows title + message
  - Bullet list of reasons if present
  - "Switch to [Role Name]" button if `suggestedRole` exists
  - Helper text: "Strategy is paused until documents match the selected solicitor role."
  - No modal, no blocking UI, calm professional tone

#### 2. Strategy Panel Suppression
**File Changed:**
- `components/strategic/StrategicIntelligenceSection.tsx`
  - Fetches `analysisBanner` from overview API
  - Renders `AnalysisBanner` when `severity === "warning"`
  - **Suppresses ALL strategy panels when banner exists:**
    - Strategic Routes (`StrategicRoutesPanel`)
    - Fastest Upgrade Path (in `MoveSequencePanel`)
    - Win / Kill Conditions (in `MoveSequencePanel`)
    - Recommended Move Order (`MoveSequencePanel`)
    - Leverage / Weak Spots (`LeverageAndWeakSpotsPanel`)
    - Probabilities / Momentum (`StrategicOverviewCard`)
    - Missing Evidence ladders (gated server-side)
  - Shows only banner + minimal helper message when not viable

#### 3. Role Switch Functionality
**File Changed:**
- `components/strategic/StrategicIntelligenceSection.tsx`
  - Implements `handleSwitchRole()` function
  - Maps solicitor role to practice area
  - Calls `/api/cases/${caseId}/practice-area` PATCH endpoint
  - Refreshes page to re-run analysis with new role
  - No page reload, fast and obvious

#### 4. StrategicOverviewCard Update
**File Changed:**
- `components/strategic/StrategicOverviewCard.tsx`
  - Checks for `analysisBanner` in API response
  - Shows error message if banner exists (prevents strategy display)

### Suppression Logic Location
**File**: `components/strategic/StrategicIntelligenceSection.tsx`  
**Lines**: 146-150

```typescript
{analysisBanner && analysisBanner.severity === "warning" ? (
  // Show only minimal UI when banner is present
  <div className="text-sm text-muted-foreground p-4 bg-muted/30 border border-border/50 rounded-lg">
    <p>Upload documents that match the selected solicitor role to see strategic analysis.</p>
  </div>
) : (
  // Full strategy panels only render when viable
  <>
    <StrategicOverviewCard ... />
    <MoveSequencePanel ... />
    <StrategicRoutesPanel ... />
    <LeverageAndWeakSpotsPanel ... />
    ...
  </>
)}
```

---

## Complete File List

### New Files Created
1. `lib/strategic/deduplication.ts` - Deduplication helpers
2. `lib/strategic/practice-area-viability.ts` - Viability assessment engine
3. `components/strategic/AnalysisBanner.tsx` - Banner component

### Files Modified
1. `lib/packs/criminal/violentBeastMode.ts` - PACE status, deduplication
2. `lib/strategic/move-sequencing/types.ts` - Added `paceStatus` type
3. `app/api/criminal/[caseId]/pace/route.ts` - PACE status logic
4. `components/criminal/PACEComplianceChecker.tsx` - PACE UI updates
5. `lib/strategic/practice-area-filters.ts` - Extended forbidden tokens
6. `lib/criminal/probability-gate.ts` - Updated thresholds
7. `components/criminal/GetOffProbabilityMeter.tsx` - Probability UI updates
8. `lib/criminal/aggressive-defense-engine.ts` - "Stay" language fixes
9. `lib/strategic/move-sequencing/win-kill-conditions.ts` - Deduplication
10. `lib/missing-evidence.ts` - Evidence trigger gating, deduplication
11. `lib/strategic/move-sequencing/move-sequencer.ts` - Move deduplication
12. `app/api/strategic/[caseId]/overview/route.ts` - Viability gate integration
13. `components/strategic/StrategicIntelligenceSection.tsx` - Banner + suppression
14. `components/strategic/StrategicOverviewCard.tsx` - Banner check

---

## Key Behaviors

### Criminal Defense Output
- ✅ PACE status correctly shows UNKNOWN when evidence missing
- ✅ No duplicate items in any strategic output
- ✅ No civil-only content (CFA/retainer/Part 36) in criminal cases
- ✅ Win probability suppressed when bundle < 30% complete
- ✅ "Stay" language is court-safe and conditional

### Practice Area Viability
- ✅ Backend prevents strategy generation when documents don't match role
- ✅ UI shows clear banner with reasons and suggested role
- ✅ All strategy panels suppressed when banner exists
- ✅ Evidence items only shown when triggers exist
- ✅ Role switch button updates case and re-runs analysis

### Regression Tests
- ✅ Criminal judgment in Clinical Neg → Banner shown, zero CN strategy
- ✅ Medical negligence LOC → CN strategy allowed
- ✅ Housing disrepair letter in PI → Banner shown
- ✅ Correct-role documents → Full strategy renders
- ✅ Evidence ladders only appear when triggers exist

---

## Technical Details

### Viability Assessment Logic
```typescript
assessPracticeAreaViability(bundleText: string, selectedRole: SolicitorRole) => {
  viable: boolean,  // true if hits >= minSignals
  score: number,    // 0-1, how well bundle matches role
  reasons: string[], // Explains what was missing
  suggestedRole?: SolicitorRole // If alternative role has ≥3 signals
}
```

### Evidence Trigger Gating
Evidence items are only shown if their triggers exist in bundle:
- Radiology → only if ct|mri|x-ray|scan|imaging
- Consent → only if procedure|surgery|operation|consent
- Escalation → only if deteriorat|sepsis|critical|red flag
- Time-to-Treatment → only if delay|waiting|hours|triage
- (Similar logic for all other evidence types)

### API Response Structure
When not viable:
```json
{
  "analysisBanner": {
    "severity": "warning",
    "title": "Practice area mismatch",
    "message": "This document does not contain sufficient indicators...",
    "reasons": ["Found 1 signal(s) for clinical_neg_solicitor (minimum required: 2)", ...],
    "suggestedRole": "criminal_solicitor"
  },
  "momentum": null,
  "strategies": [],
  "weakSpots": [],
  "leveragePoints": [],
  "moveSequence": null
}
```

---

## Acceptance Criteria Met

✅ PACE cannot show "No breaches detected" if data is missing  
✅ Criminal pack cannot show CFA/retainer/client-ID civil items  
✅ Duplicates removed from all panels  
✅ Win probability harmonised with bundle completeness  
✅ "Stay" language is court-safe  
✅ Strategy cannot leak on mismatch (backend + UI)  
✅ Evidence ladders are trigger-gated  
✅ UI suppresses all strategy panels when banner exists  
✅ Role switch button updates case and re-runs analysis  

---

## Impact

**Before:**
- CaseBrain could generate wrong-domain strategy (e.g., CN strategy for criminal documents)
- Evidence items appeared even when no triggers existed
- Duplicate items cluttered output
- Win probabilities shown on incomplete bundles
- PACE showed "no breaches" when evidence missing

**After:**
- CaseBrain actively prevents wrong-domain strategy generation
- Evidence items only appear when relevant triggers exist
- All outputs are deduplicated
- Win probabilities suppressed on incomplete bundles
- PACE status accurately reflects evidence presence
- UI clearly guides users when documents don't match role

This is a foundational shipping fix that transforms CaseBrain from a checklist bot into a decision-discipline engine.

