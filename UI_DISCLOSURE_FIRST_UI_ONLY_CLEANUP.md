# UI Disclosure-First Mode Cleanup (UI-Only Changes)

## Overview

This document describes UI/UX presentation-layer changes made to clean up the Criminal case page in DISCLOSURE-FIRST mode. All changes are **presentation-only** - no analysis logic, extraction logic, or data computation was modified.

## Changes Made

### A) Role Lenses - UI Gating Only

**File:** `components/cases/KeyFactsPanel.tsx`

**Change:** Added conditional rendering to filter role lenses for criminal cases.

- **Before:** All role lenses (Family, Housing, PI, Clinical Neg, Criminal, General Litigation) were displayed for all cases.
- **After:** For criminal cases (`practiceArea === "criminal"`), only the **Criminal Defence Lens** is displayed. Supervisor view toggle remains available for all cases.

**Implementation:**
- Added check: `if (isCriminalCase && role !== "criminal_solicitor") return null;`
- This prevents Family, Housing, PI, and Clinical Neg lenses from rendering on criminal cases.
- No changes to lens computation logic - only conditional rendering.

---

### B) Evidence Checklist - Presentation Consistency

**File:** `components/core/MissingEvidencePanel.tsx`

**Change:** Added disclosure gap check before showing "All required evidence appears to be present" message.

- **Before:** If `localItems.length === 0`, always showed green success message.
- **After:** If `localItems.length === 0` but disclosure gaps exist (from `/api/criminal/[caseId]/disclosure`), shows amber warning: "Outstanding disclosure items detected. Review disclosure tracker for details."

**Implementation:**
- Added `hasDisclosureGaps` state that checks disclosure tracker endpoint.
- Checks for: `missingItems.length > 0`, `incompleteDisclosure`, or `lateDisclosure`.
- If gaps exist, shows warning instead of success message.
- **No changes to evidence detection logic** - only display consistency fix.

---

### C) Charges Panel - UI Fallback Only

**File:** `components/criminal/ChargesPanel.tsx`

**Change:** Check for detected charges in key facts before showing "No charges recorded".

- **Before:** If structured charges table is empty, always showed "No charges recorded".
- **After:** If structured charges are empty BUT charges are detected in key facts (`primaryIssues` containing "Charge:" or "Offence:", or `causeOfAction`), shows "Detected charges (unconfirmed)" with read-only list.

**Implementation:**
- Added `detectedCharges` state that fetches key facts and extracts charge mentions.
- If detected charges exist, displays them as read-only text with amber warning styling.
- **No database writes, no inference, no extraction changes** - display-only fallback.

---

### D) DISCLOSURE-FIRST Mode - Panel Visibility Rules

**File:** `components/criminal/CriminalCaseView.tsx`

**Change:** Conditionally hide/collapse empty panels when in DISCLOSURE-FIRST mode.

**Panels Affected:**
1. **Bail Application Panel** - Hidden if DISCLOSURE-FIRST mode AND no structured data
2. **Sentencing Mitigation Panel** - Hidden if DISCLOSURE-FIRST mode AND no structured data
3. **Court Hearings Panel** - Hidden if DISCLOSURE-FIRST mode AND no structured data
4. **PACE Compliance Panel** - Hidden if DISCLOSURE-FIRST mode AND no structured data

**Implementation:**
- Added `isDisclosureFirstMode` state determined by:
  - If analysis is gated (`isGated(normalized)`) → `true`
  - If primary angle type is `"DISCLOSURE_FAILURE_STAY"` or undefined → `true`
  - Otherwise → `false`
- Added `panelData` state that checks each panel's API endpoint for structured data:
  - Bail: checks for `grounds.length > 0`
  - Sentencing: checks for `personalMitigation.length > 0`
  - Hearings: checks for `hearings.length > 0`
  - PACE: checks for `paceStatus` existence
- Conditional rendering: `{(!isDisclosureFirstMode || panelData.[panel].hasData) && <Panel />}`
- **Panels still exist in code** - they simply don't render when empty in DISCLOSURE-FIRST mode.

---

## What Was NOT Changed

- ❌ No analysis engine logic
- ❌ No extraction logic
- ❌ No scoring/calibration logic
- ❌ No strategy generation logic
- ❌ No disclosure detection logic
- ❌ No "One Brain / Case Context" architecture
- ❌ No gating logic (`canGenerateAnalysis`)
- ❌ No API routes that compute facts, risk, strategy, or readiness
- ❌ No database writes
- ❌ No charge inference
- ❌ No conclusion generation changes

---

## Acceptance Criteria Status

✅ **Only Supervisor + Criminal Defence lenses visible on criminal cases**
- Implemented: Role lens filtering in `KeyFactsPanel.tsx`

✅ **Evidence Checklist never contradicts visible disclosure gaps**
- Implemented: Disclosure gap check in `MissingEvidencePanel.tsx`

✅ **"No charges recorded" never shown when detected charges exist**
- Implemented: Detected charges fallback in `ChargesPanel.tsx`

✅ **Empty panels do not dominate the page in DISCLOSURE-FIRST mode**
- Implemented: Conditional panel hiding in `CriminalCaseView.tsx`

✅ **Analysis conclusions remain IDENTICAL before and after**
- Confirmed: No logic changes, only UI presentation

---

## Files Modified

1. `components/cases/KeyFactsPanel.tsx` - Role lens filtering
2. `components/core/MissingEvidencePanel.tsx` - Disclosure gap check
3. `components/criminal/ChargesPanel.tsx` - Detected charges fallback
4. `components/criminal/CriminalCaseView.tsx` - DISCLOSURE-FIRST mode panel hiding
5. `components/criminal/CourtHearingsPanel.tsx` - Minor comment addition (no functional change)

---

## Testing Notes

To verify these changes:

1. **Role Lenses:** Open a criminal case → Key Facts panel → Only "Criminal Defence Lens" should be visible (not Family/Housing/PI/Clinical Neg)

2. **Evidence Checklist:** 
   - Criminal case with disclosure gaps → Should show amber warning, not green success
   - Criminal case without gaps → Should show green success

3. **Charges Panel:**
   - Criminal case with detected charges in key facts but empty structured table → Should show "Detected charges (unconfirmed)"
   - Criminal case with no charges anywhere → Should show "No charges recorded"

4. **DISCLOSURE-FIRST Mode:**
   - Upload a criminal PDF with insufficient text → Should see DISCLOSURE-FIRST mode
   - Empty panels (Bail, Sentencing, Hearings, PACE) should not render
   - If panels have data, they should still render normally

---

## Notes

- All changes are **reversible** - they only affect conditional rendering
- No data is modified or inferred
- Panels can still be accessed directly via URL if needed
- The UI now accurately reflects the incomplete state of data in DISCLOSURE-FIRST mode
