# Stage-50 evidence-state remediation — frozen rerun

**Prior:** `maa-50-2026-07-29T18-48-49-771Z`
**Rerun:** `maa-50-2026-07-29T19-34-46-243Z`
**Freeze hash:** `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832` (before+after verified)

## Acceptance

```json
{
  "knownDetectorFalsePositivesEliminated": true,
  "confirmedAppDefectsCorrected": true,
  "truthKeyDefectsMigrated": true,
  "unresolvedRemainUnresolved": true,
  "freezeHashUnchanged": true,
  "zeroFixtureSpecificPatches": true,
  "newDefectCount": 1,
  "addedDefectCount": 1,
  "fpEliminated": true,
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
    "defect_to_pass": 2,
    "defect_to_unresolved": 19,
    "defect_retained": 0,
    "removed_no_successor": 0,
    "other": 0
  },
  "detector_false_positive": {
    "count": 22,
    "defect_to_pass": 16,
    "defect_to_unresolved": 5,
    "defect_retained": 0,
    "removed_no_successor": 1,
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
    "defect_to_pass": 43,
    "defect_to_unresolved": 0,
    "defect_retained": 0,
    "removed_no_successor": 0,
    "other": 0
  }
}
```

## Transitions

- defect_to_unresolved: **24**
- defect_to_pass: **61**
- removed_no_successor: **8**

## New evidence-state defect count: 1
## Added defects (regressions): 1
