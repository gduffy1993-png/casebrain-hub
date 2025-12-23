# UI Phase Gating Implementation Report

## Overview
This report documents the implementation of phased UI layout and strict UI gating for criminal defence cases. The implementation ensures that panels only appear when they're justified, keeping DISCLOSURE-FIRST cases tight and court-credible.

## Implementation Date
December 2024

## Components Modified

### 1. CasePhaseSelector Component (NEW)
**File:** `components/criminal/CasePhaseSelector.tsx`

**Purpose:** Provides a UI toggle for selecting between three case phases:
- Phase 1: Disclosure & Readiness
- Phase 2: Positioning & Options
- Phase 3: Sentencing & Outcome

**Features:**
- Defaults to Phase 1 when `isDisclosureFirstMode === true`
- Defaults to Phase 2 when `isDisclosureFirstMode === false`
- Shows warning banners for Phase 1 (DISCLOSURE-FIRST) and Phase 3 (Sentencing)
- Prevents moving to Phase 3 without explicit user action
- Displays phase descriptions

**UI Triggers:**
- Phase 1: Default when `MODE === "DISCLOSURE-FIRST"`
- Phase 2: Default when `MODE !== "DISCLOSURE-FIRST"`
- Phase 3: Requires explicit user click with warning label

### 2. CriminalCaseView Component (MODIFIED)
**File:** `components/criminal/CriminalCaseView.tsx`

**Changes:**
- Added `CasePhaseSelector` at the top of the view
- Implemented phase-based conditional rendering for panels
- Added accordion for "Custody / Bail Tools" in Phase 1 (collapsed by default)
- Added accordion for "Sentencing Tools" in Phase 3 (visible only in Phase 3)
- Maintained existing disclosure-first mode detection logic

**Phase-Based Visibility Rules:**

**Phase 1 (Disclosure & Readiness):**
- ✅ Case Fight Plan (always visible)
- ✅ Loopholes Panel (always visible)
- ✅ Charges Panel (always visible)
- ✅ Disclosure Tracker (always visible)
- ✅ Client Advice Panel (always visible)
- ✅ PACE Compliance (only if `panelData.pace.hasData === true`)
- ✅ Court Hearings (only if `panelData.hearings.hasData === true`)
- ❌ Bail Application (hidden, available in accordion)
- ❌ Bail Tracker (hidden, available in accordion)
- ❌ Sentencing Mitigation (hidden until Phase 3)

**Phase 2 (Positioning & Options):**
- Everything from Phase 1 PLUS:
- ✅ Bail Application (visible if `panelData.bail.hasData === true` or Phase 2+)
- ✅ Bail Tracker (visible)
- ✅ Court Hearings (visible)
- ✅ PACE Compliance (visible)
- ❌ Sentencing Mitigation (still hidden)

**Phase 3 (Sentencing & Outcome):**
- Everything from Phase 2 PLUS:
- ✅ Sentencing Mitigation (visible in accordion)

**Accordions:**
- "Custody / Bail Tools" - Collapsed in Phase 1, visible in Phase 2+
- "Sentencing Tools" - Only visible in Phase 3

### 3. ChargesPanel Component (MODIFIED)
**File:** `components/criminal/ChargesPanel.tsx`

**Changes:**
- Enhanced detected charges fallback display
- Added "Add Charge" button in detected charges section
- Never shows "No charges recorded" if detected charges exist

**Logic:**
1. If structured charges exist → show them
2. Else if detected charges exist → show "Detected charges (unconfirmed)" with Add Charge CTA
3. Else → show "No charges recorded"

### 4. MissingEvidencePanel Component (ALREADY IMPLEMENTED)
**File:** `components/core/MissingEvidencePanel.tsx`

**Existing Logic Verified:**
- Checks disclosure gaps via `/api/criminal/${caseId}/disclosure`
- Never shows "All required evidence appears to be present" if disclosure gaps exist
- Shows fallback message: "Outstanding disclosure items detected. Review disclosure tracker for details."

**Implementation:**
- Uses `hasDisclosureGaps` state to check:
  - `disclosureData?.missingItems?.length > 0`
  - `disclosureData?.incompleteDisclosure`
  - `disclosureData?.lateDisclosure`

### 5. KeyFactsPanel Component (ALREADY IMPLEMENTED)
**File:** `components/cases/KeyFactsPanel.tsx`

**Existing Logic Verified:**
- For criminal cases, only shows `criminal_solicitor` lens (Criminal Defence Lens)
- Hides all other role lenses (PI, Housing, Family, Clinical Neg, General Litigation)
- Supervisor view toggle remains available

**Implementation:**
- Checks `keyFacts?.practiceArea === "criminal"`
- Filters out all roles except `criminal_solicitor` for criminal cases

## Phase Triggers (UI Only)

### Automatic Triggers:
1. **Phase 1:** When `isDisclosureFirstMode === true` (detected from aggressive-defense API response)
2. **Phase 2:** When `isDisclosureFirstMode === false` (default for non-disclosure-first cases)

### Manual Triggers:
- User can manually switch phases using the `CasePhaseSelector` component
- Phase 3 requires explicit user click with warning label

### Data-Based Visibility (Not Phase Triggers):
- Bail tools: Visible if `panelData.bail.hasData === true` OR `currentPhase >= 2`
- Sentencing tools: Visible if `currentPhase >= 3`
- Court Hearings: Visible if `panelData.hearings.hasData === true` OR `currentPhase >= 2`
- PACE Compliance: Visible if `panelData.pace.hasData === true` OR `currentPhase >= 2`

## UI/UX Improvements

### 1. Phase Banner
- Phase 1: Shows amber warning banner: "DISCLOSURE-FIRST MODE: Tools are limited until disclosure is stabilised."
- Phase 3: Shows red warning banner: "SENTENCING PHASE: Use only after plea/conviction posture is clear."

### 2. Accordions
- "Custody / Bail Tools" accordion in Phase 1 (collapsed by default)
- "Sentencing Tools" accordion in Phase 3 (expanded by default)

### 3. Empty Panel Handling
- Panels with no data are hidden or collapsed
- No empty scaffolding panels dominate the page
- Court Hearings panel only shows if hearings exist or Phase 2+
- PACE Compliance panel only shows if data exists or Phase 2+

## Data Consistency Fixes (UI Presentation Only)

### A) Charges Panel
✅ **Fixed:** Shows detected charges fallback when structured charges don't exist
- Displays "Detected charges (unconfirmed)" list
- Includes "Add Charge" CTA button
- Never shows "No charges recorded" if detected charges exist

### B) Evidence Checklist
✅ **Already Fixed:** Checks disclosure gaps before showing success message
- Never claims "All required evidence appears to be present" when disclosure gaps exist
- Shows fallback: "Outstanding disclosure items detected. Review disclosure tracker for details."

### C) Role Lenses
✅ **Already Fixed:** For criminal cases, only shows:
- Supervisor view toggle
- Criminal Defence lens (`criminal_solicitor`)
- All other lenses hidden

## Non-Negotiable Constraints Respected

✅ **UI/UX ONLY Changes:**
- No modifications to One Brain / Case Context architecture
- No changes to extraction logic
- No changes to scoring/strategy engines
- No changes to disclosure detection logic
- No changes to `canGenerateAnalysis` gating logic
- No changes to analysis API routes

✅ **Display-Only Fixes:**
- Charges panel: Fixed display logic only
- Evidence checklist: Uses existing disclosure gap data
- Role lenses: Uses existing filtering logic

## Acceptance Criteria Status

### ✅ 1. Criminal Case with MODE=DISCLOSURE-FIRST and Thin Bundle
- [x] Phase defaults to Phase 1
- [x] Bail + sentencing panels not visible unless user opens accordion (bail) or switches to Phase 3 (sentencing)
- [x] No empty scaffolding panels dominate the page
- [x] Charges never shows "No charges recorded" if detected charges exist
- [x] Evidence checklist never claims all evidence present when disclosure gaps exist
- [x] Only Criminal lens visible by default

### ✅ 2. Analysis Results Remain Identical
- [x] No changes to analysis computation logic
- [x] Only presentation/display logic modified
- [x] All underlying data structures unchanged

## Files Created
1. `components/criminal/CasePhaseSelector.tsx` - Phase selector component

## Files Modified
1. `components/criminal/CriminalCaseView.tsx` - Phase-based conditional rendering
2. `components/criminal/ChargesPanel.tsx` - Detected charges fallback display

## Files Verified (No Changes Needed)
1. `components/core/MissingEvidencePanel.tsx` - Already implements disclosure gap checking
2. `components/cases/KeyFactsPanel.tsx` - Already filters role lenses for criminal cases

## Testing Recommendations

1. **Phase 1 (DISCLOSURE-FIRST):**
   - Verify phase defaults to 1
   - Verify bail/sentencing panels are hidden
   - Verify accordion for bail tools exists and is collapsed
   - Verify banner shows DISCLOSURE-FIRST warning

2. **Phase 2 (Positioning & Options):**
   - Switch to Phase 2
   - Verify bail tools become visible
   - Verify court hearings visible
   - Verify sentencing tools still hidden

3. **Phase 3 (Sentencing & Outcome):**
   - Switch to Phase 3
   - Verify sentencing tools accordion appears
   - Verify warning banner shows

4. **Charges Panel:**
   - Test with structured charges → should show charges
   - Test with detected charges only → should show "Detected charges (unconfirmed)"
   - Test with no charges → should show "No charges recorded"

5. **Evidence Checklist:**
   - Test with disclosure gaps → should NOT show "All required evidence appears to be present"
   - Test without disclosure gaps → should show success message

6. **Role Lenses:**
   - Test criminal case → should only show Criminal Defence lens
   - Test non-criminal case → should show all applicable lenses

## Notes

- Phase selection is stored in component state (not persisted to database)
- Phase can be controlled via URL query parameter in the future if needed
- All phase logic is UI-only and does not affect analysis computation
- Disclosure-first mode detection uses existing aggressive-defense API response
- Panel data checks use existing API endpoints (no new endpoints created)

## Future Enhancements (Not Implemented)

1. Persist phase selection in URL query parameter
2. Add confirmation dialog when moving to Phase 3
3. Add phase transition animations
4. Add phase-specific tooltips/help text
5. Add phase history/audit trail

