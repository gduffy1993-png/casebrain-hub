# Master Assurance Auditor — 20-case calibration report

Run: `maa-20-2026-07-29T00-54-16-877Z`
Stage completed: **20**
Status: **STOP_FOR_CODEX_REVIEW**
Programme PASS supported: **false**

## Case units (separate denominators)

- Cases: 20
- Surfaces (occurrence load): 462
- Findings (occurrence): 781
- Exact wording unique: 412
- Template unique: 374

## Verdicts

- pass: 607
- defect: 31
- containment: 0
- unresolved: 106
- not_exercised: 37
- design findings (separate): 20

## Genuine defects vs detector FP / unavailable

- Genuine defects: evidence-state mismatches, must-not-say violations, internal leaks, incomplete disclaimers, served-item chased.
- Detector FP: not auto-counted; bullet/header mid-sentence class suppressed by boundary profiles (MIG-005/MIG-019).
- Unavailable evidence: lanes marked not_exercised where gold packets lack relationship graphs / registry traces.
- Human-labeled FP count: 0 (blank until review batches filled).

## Remediation grouping

- **evidence_state** ×24 — Repair evidence-state reconcile or update gold after human review.
- **cross_exit_contradiction** ×5 — enforceCrossExitConsistency before surface emit.
- **cross_surface_consistency** ×2 — Suppress chase for served units; chase incomplete siblings only.

## Next command

```
npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=50 --resume=false
```

Do not run 50/150/300/3000 until Codex review clears this checkpoint.
