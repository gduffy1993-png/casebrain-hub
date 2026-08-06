# Master Assurance Auditor — 20-case calibration report

Run: `maa-20-2026-07-29T18-08-29-011Z`
Stage completed: **20**
Status: **STOP_FOR_CODEX_REVIEW**
Programme PASS supported: **false**

## Case units (separate denominators)

- Cases: 20
- Surfaces (occurrence load): 462
- Findings (occurrence): 799
- Exact wording unique: 408
- Template unique: 347

## Verdicts

- pass: 629
- defect: 0
- containment: 0
- unresolved: 133
- not_exercised: 37
- design findings (separate): 20

## Genuine defects vs detector FP / unavailable

- Safety-FN knowledge: unknown (knownSafetyCriticalFn=null)
- Human rates: unavailable (confirmation=null, fp=null)
- Defects require actual CaseBrain exactWording; expected inventory labels live in expectedWording only.
- Control exercise: fully/partial/not — not_exercised-only lanes are not fully exercised.
- Detector FP not auto-counted; blank human fields stay blank.

## Remediation grouping


## Next command

```
npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=50  # refused until corpus plan + Codex clearance
```

Do not run 50/150/300/3000 until Codex review clears this checkpoint.
