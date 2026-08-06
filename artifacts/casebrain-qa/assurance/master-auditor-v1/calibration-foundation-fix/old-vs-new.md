# Stage-20 old vs new (calibration foundation fix)

| | Old | New |
|---|---:|---:|
| Run | maa-20-2026-07-29T00-54-16-877Z | maa-20-2026-07-29T01-17-19-470Z |
| Findings | 781 | 781 |
| pass | 607 | 607 |
| defect | 31 | 31 |
| unresolved | 106 | 106 |
| not_exercised | 37 | 37 |
| containment | 0 | 0 |

## Change summary

{
  "added": 350,
  "removed": 350
}

## Every verdict change

- None — no findingId retained a different verdict.

## Wording-field updates (same verdict)

Count: 0

## Structural (not finding verdicts)

- Control exercise now fully/partial/not — see coverage-report.md
- knownSafetyCriticalFn is null (unknown), not hardcoded 0
- humanConfirmationRate / detectorFalsePositiveRate unavailable until blinded reviews imported
- Corpus membership recorded with uniqueCases=20 / required=20

## Finding-ID churn (350 added / 350 removed, 0 verdict flips)

Finding IDs hash `exactWording`. This fix changed wording fields for evidence-state rows:

- `exactWording` format `label=existence` → `label · existence · reliability` (actual CaseBrain truth-map text)
- absent expected items: `exactWording` cleared (no longer the expected inventory label); `expectedWording` carries the expectation; verdict stays `unresolved` (was already unresolved in old run for many, but IDs changed when exactWording emptied/changed)

Aggregate verdict tallies are unchanged (607/31/106/37/0). Structural gate/exercise/corpus metadata changed as documented above.

Source gold packets under `artifacts/casebrain-qa/gold-manual-proof-set-v1/cases` were not modified.
