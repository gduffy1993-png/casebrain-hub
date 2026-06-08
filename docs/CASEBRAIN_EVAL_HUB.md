# CaseBrain Eval Hub

One loop: **collect → gate → playback → fix → re-run**.

## Lanes

| Lane | Command | Output |
|------|---------|--------|
| 1 Pilot safety | `casebrain-auditor.ts --pack pilot-3` | Release fingerprints |
| 2 Corpus playback | `casebrain-auditor-playback.ts` or `--batch --playback` | `latest/corpus-playback/` |
| 3 Production pass | `casebrain-auditor-overnight.ts production-pass` | `latest/production-deep-pass/` |
| 4 Full batch gate | `casebrain-auditor.ts --batch --corpus real` | `latest/full-960-real-rollup/` |

## Playback sections

- `00-summary.md` — counts, roster vs full, delta vs last run
- `01`–`05` — routing, court/hearing, chase, thin bundle, leakage
- `cases/{caseId}.json` — full per-case detail (gitignored)

## Rules

- Never commit `artifacts/casebrain-auditor/`
- Production gate = A+B only
- Playback = full corpus intelligence
