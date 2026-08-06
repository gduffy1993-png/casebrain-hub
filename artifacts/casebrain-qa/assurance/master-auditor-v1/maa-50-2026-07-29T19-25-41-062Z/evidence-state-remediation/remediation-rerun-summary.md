# Stage-50 evidence-state remediation — frozen rerun

**Prior:** `maa-50-2026-07-29T18-48-49-771Z`
**Rerun:** `maa-50-2026-07-29T19-25-41-062Z`
**Freeze hash:** `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832` (before+after verified)

## Acceptance

```json
{
  "knownDetectorFalsePositivesEliminated": true,
  "confirmedAppDefectsCorrected": true,
  "truthKeyDefectsMigrated": true,
  "unresolvedRemainUnresolved": false,
  "freezeHashUnchanged": true,
  "zeroFixtureSpecificPatches": true,
  "newDefectCount": 41,
  "addedDefectCount": 24,
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
    "defect_to_pass": 1,
    "defect_to_unresolved": 15,
    "defect_retained": 0,
    "removed_no_successor": 0,
    "other": 5
  },
  "detector_false_positive": {
    "count": 22,
    "defect_to_pass": 10,
    "defect_to_unresolved": 4,
    "defect_retained": 0,
    "removed_no_successor": 0,
    "other": 8
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
    "defect_to_pass": 34,
    "defect_to_unresolved": 3,
    "defect_retained": 0,
    "removed_no_successor": 2,
    "other": 4
  }
}
```

## Transitions

- retained_same_verdict: **17**
- defect_to_unresolved: **22**
- defect_to_pass: **45**
- removed_no_successor: **9**

## New evidence-state defect count: 41
## Added defects (regressions): 24
