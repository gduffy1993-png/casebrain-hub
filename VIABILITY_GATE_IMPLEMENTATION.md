# Practice Area Viability Gate Implementation

## Summary

Implemented a foundational shipping fix to prevent CaseBrain from generating wrong-domain strategy when documents don't match the selected solicitor role.

## Files Changed

### Core Implementation
1. **`lib/strategic/practice-area-viability.ts`** (NEW)
   - `assessPracticeAreaViability()` - Main viability assessment function
   - `ROLE_RULES` - Config for all 6 solicitor roles with signal lists
   - `EVIDENCE_TRIGGERS` - Evidence trigger rules for gating
   - `shouldShowEvidenceItem()` - Evidence trigger gating function
   - `hasEvidenceTrigger()` - Helper to check if triggers exist

### Integration Points
2. **`app/api/strategic/[caseId]/overview/route.ts`**
   - Added viability check BEFORE any strategy generation
   - Returns `analysisBanner` when not viable (no strategy)
   - Passes `bundleText` to `findMissingEvidence` for trigger gating

3. **`lib/missing-evidence.ts`**
   - Added optional `bundleText` parameter
   - Applies evidence trigger gating via `shouldShowEvidenceItem()`
   - Only shows evidence items if triggers exist in bundle

## Behavior

### When NOT Viable
- ❌ NO strategy generation (momentum, strategies, weakSpots, leveragePoints, moveSequence all null/empty)
- ✅ Returns only `analysisBanner` with:
  - `severity: "warning"`
  - `title: "Practice area mismatch"`
  - `message: "This document does not contain sufficient indicators for the selected solicitor role."`
  - `reasons: string[]` - Explains what was missing
  - `suggestedRole?: SolicitorRole` - If alternative role detected with ≥3 signals

### When Viable
- ✅ Full strategy generation proceeds normally
- ✅ Evidence items are trigger-gated (only shown if triggers exist)

## Evidence Trigger Gating

Evidence items are only shown if their triggers exist in the bundle:

- **Clinical Neg**: Radiology (ct/mri/x-ray), Consent (procedure/surgery), Escalation (deteriorat/sepsis), Time-to-Treatment (delay/waiting)
- **Housing**: Damp/Mould (damp/mould), Repair Notice (repair notice/works order), Awaab's Law (awaab/mould/damp)
- **PI**: Part 36 (part 36/offer), MOJ Portal (moj portal/cnf)
- **Criminal**: PACE (custody/interview), Disclosure (mg6/disclosure), CCTV (cctv/footage)
- **Family**: CAFCASS (cafcass/s.7), Safeguarding (safeguarding/child protection)

## Role Rules

Each role requires minimum 2 signals (except general_litigation_solicitor: 1):

- **criminal_solicitor**: PACE, CPIA, Crown Court, offence, prosecution, etc.
- **clinical_neg_solicitor**: NHS, Trust, hospital, diagnosis, scan, surgery, negligence, etc.
- **housing_solicitor**: tenant, landlord, damp, mould, section 11, LTA 1985, etc.
- **pi_solicitor**: accident, injury, RTA, CNF, MOJ portal, whiplash, etc.
- **family_solicitor**: child arrangements, CAFCASS, s.8, parental responsibility, etc.
- **general_litigation_solicitor**: claimant, defendant, claim, litigation, court, etc.

## Regression Tests

✅ Upload EWCA Crim judgment while in Clinical Neg → mismatch banner, NO radiology
✅ Upload medical negligence LOC → CN strategy allowed
✅ Upload housing disrepair letter in PI → mismatch banner
✅ Upload correct role docs → full strategy appears

## Next Steps (UI)

1. Create `components/strategic/AnalysisBanner.tsx` to display the banner
2. Update `components/strategic/StrategicIntelligenceSection.tsx` to show banner and suppress panels when present
3. Add "Switch to [Role]" button if `suggestedRole` exists
4. Wire role switch to update case practice area and re-run analysis

## Location of assessPracticeAreaViability

**File**: `lib/strategic/practice-area-viability.ts`
**Function**: `assessPracticeAreaViability(bundleText: string, selectedRole: SolicitorRole)`

## Confirmation

✅ Strategy cannot leak on mismatch - All strategy generation is gated behind viability check
✅ Evidence ladders are trigger-gated - `shouldShowEvidenceItem()` applied in `findMissingEvidence()`

