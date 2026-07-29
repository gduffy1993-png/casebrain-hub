# Stage-50 evidence-state remediation — frozen rerun

**Prior:** `maa-50-2026-07-29T18-48-49-771Z`
**Rerun:** `maa-50-2026-07-29T19-28-55-656Z`
**Freeze hash:** `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832` (before+after verified)

## Acceptance

```json
{
  "knownDetectorFalsePositivesEliminated": false,
  "confirmedAppDefectsCorrected": true,
  "truthKeyDefectsMigrated": true,
  "unresolvedRemainUnresolved": true,
  "freezeHashUnchanged": true,
  "zeroFixtureSpecificPatches": true,
  "newDefectCount": 4,
  "addedDefectCount": 2,
  "fpEliminated": false,
  "appCorrected": true,
  "tkMigrated": true,
  "unresolvedNotDefect": true,
  "overallGate": false
}
```

## Disposition outcomes

```json
{
  "unresolved_source": {
    "count": 21,
    "defect_to_pass": 1,
    "defect_to_unresolved": 20,
    "defect_retained": 0,
    "removed_no_successor": 0,
    "other": 0
  },
  "detector_false_positive": {
    "count": 22,
    "defect_to_pass": 14,
    "defect_to_unresolved": 6,
    "defect_retained": 2,
    "removed_no_successor": 0,
    "other": 0
  },
  "truth_key_defect": {
    "count": 7,
    "defect_to_pass": 0,
    "defect_to_unresolved": 0,
    "defect_retained": 0,
    "removed_no_successor": 7,
    "other": 0
  },
  "confirmed_app_defect": {
    "count": 43,
    "defect_to_pass": 39,
    "defect_to_unresolved": 4,
    "defect_retained": 0,
    "removed_no_successor": 0,
    "other": 0
  }
}
```

## Transitions

- defect_to_unresolved: **30**
- defect_to_pass: **54**
- removed_no_successor: **7**
- defect_retained: **2**

## New evidence-state defect count: 4
## Added defects (regressions): 2
