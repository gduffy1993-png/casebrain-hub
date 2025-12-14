# STRONG (Expert Pending) Implementation Summary

## Overview
Added a new momentum classification level "STRONG (Expert Pending)" that triggers when medical records alone provide a complete negligence story, even if no expert report is uploaded yet.

## Changes Made

### 1. Momentum Engine (`lib/strategic/momentum-engine.ts`)
✅ **Already Updated** - The momentum engine already has the correct evaluation order:
- If no meaningful medical records → WEAK
- If medical records incomplete → BALANCED
- If breach/cause/harm all strong AND no expert → STRONG (Expert Pending)
- If breach/cause/harm all strong AND expert uploaded → STRONG

The enum `MOMENTUM` already includes:
```typescript
export const MOMENTUM = {
  WEAK: "WEAK",
  BALANCED: "BALANCED",
  STRONG_PENDING: "STRONG (Expert Pending)",
  STRONG: "STRONG",
} as const;
```

### 2. UI Components
✅ **StrategicOverviewCard** (`components/strategic/StrategicOverviewCard.tsx`)
- Already handles "STRONG (Expert Pending)" with correct colors:
  - BALANCED = amber
  - STRONG (Expert Pending) = blue
  - STRONG = green

### 3. Strategic Intelligence (`lib/strategic/strategy-paths.ts`)
✅ **Updated** - Enhanced strategy for STRONG (Expert Pending):
- Added `momentumState` parameter to `StrategyPathInput`
- Routes A, B, C, D now show for STRONG (Expert Pending) cases
- Route A description updated to mention: "The medical records alone strongly support breach and causation. Expert evidence is now required only to confirm and quantify the opinion."

### 4. Strategic Overview API (`app/api/strategic/[caseId]/overview/route.ts`)
✅ **Updated** - Now passes momentum state to strategy-paths:
```typescript
momentumState: momentum.state, // Pass momentum state for enhanced strategy
```

### 5. Missing Evidence Logic (`lib/strategic/cpr-compliance.ts`)
✅ **Updated** - No longer blocks STRONG when medical records show breach/causation/harm:
- Added optional `breachEvidence`, `causationEvidence`, `harmEvidence` parameters
- When all three are strong, message changes from:
  - ❌ "Critical medical evidence not provided"
  - ✅ "Expert evidence required to formalise breach and causation. Underlying medical records strongly support negligence."
- Severity downgraded from CRITICAL to HIGH when medical records support negligence

### 6. Breach/Causation/Harm Detection
✅ **Already Implemented** - The detection functions already exist:
- `lib/analysis/breach.ts` - Detects breach evidence (HIGH/MEDIUM/LOW/NONE)
- `lib/analysis/causation.ts` - Detects causation evidence (HIGH/MEDIUM/LOW/NONE)
- `lib/analysis/harm.ts` - Detects harm evidence (PRESENT/NONE)
- `lib/analysis/expert-detection.ts` - Checks if expert report is uploaded

## Criteria for STRONG (Expert Pending)

A case is classified as STRONG (Expert Pending) when ALL of the following are true:

1. **Breach Evidence = HIGH**
   - Missed imaging findings
   - Misinterpreted imaging (initial "no fracture" + later confirmation)
   - Failure to escalate despite abnormal symptoms
   - No safety-netting
   - Deteriorating condition ignored

2. **Causation Evidence = HIGH**
   - Condition worsened between visits
   - Re-attendance with significant deterioration
   - Repeat imaging shows progression or worsening
   - Consultant/ortho review states delay impacted injury

3. **Harm Evidence = PRESENT**
   - Immobilisation started later
   - Prolonged pain / worsening function
   - Surgery discussed or required
   - Functional loss documented

4. **Expert evidence is NOT uploaded**

## Acceptance Test

When uploading a medical bundle containing:
- initial misread imaging
- repeat imaging showing fracture
- re-attendance deterioration
- ortho confirmation
- no expert report

**Expected Output:**
```
Case Momentum: STRONG (Expert Pending)
```

**Must NOT return BALANCED.**

## Files Modified

1. `lib/strategic/momentum-engine.ts` - Already had correct logic
2. `lib/strategic/strategy-paths.ts` - Added momentumState parameter and enhanced strategy
3. `app/api/strategic/[caseId]/overview/route.ts` - Passes momentum state to strategy-paths
4. `lib/strategic/cpr-compliance.ts` - Updated missing evidence message for strong medical records
5. `components/strategic/StrategicOverviewCard.tsx` - Already had correct colors

## Next Steps

1. Test with "Strong Momentum PDF" containing:
   - initial misread imaging
   - repeat imaging showing fracture
   - re-attendance deterioration
   - ortho confirmation
   - no expert report

2. Verify that:
   - Momentum shows as "STRONG (Expert Pending)" (blue)
   - Strategic intelligence shows 3-5 routes
   - Missing evidence message is adjusted
   - Case does NOT show as BALANCED

