# Internal evidence-state audit pack (local prep)

> **Controlled internal prep only** — not a solicitor-reviewed real-world audit.  
> Do **not** commit real client bundles or identifiable matter data.

This folder holds truth keys and paired `casebrain-output.json` files for the Evidence-State Accuracy Audit harness (`lib/eval/evidence-state-audit/`).

## Runnable cases today

**Count:** 10 runnable cases (target **30** for batch audit stage).

| Case ID | Trap focus | Truth items |
|---------|------------|-------------|
| `proof-pack-01` | BWV referred, partial phone, co-def bleed | 7 |
| `sim-038` | Encro handle + co-defendant bleed | 11 |
| `sim-039` | Cropped screenshots / incomplete export | 11 |
| `sim-041` | County lines / safeguarding referred | 11 |
| `sim-044` | Presence vs participation | 11 |
| `sim-045` | Joint enterprise + partial BWV | 11 |
| `sim-050` | Screenshots without full download | 11 |
| `sim-055` | Referred-only BWV as served | 12 |
| `sim-058` | Going equipped / intent inference | 12 |
| `sim-061` | FTP specimen procedure gaps | 13 |

Seed more: `npx tsx scripts/seed-evidence-state-audit-cases.ts` (simulator v2 only).

## Add a case

1. Create `cases/<audit-case-id>/`.
2. Add `truth-key.json` using `truth-key.template.json` (item-list format).
3. Run CaseBrain on the **same** synthetic/anonymised bundle blind; save presentation output as `casebrain-output.json` (H5 builders snapshot — no Brain 1 edits).
4. Verify no real client identifiers in either file.
5. Run `npx tsx scripts/run-evidence-state-audit.ts` — the harness auto-discovers folders with both files.

## Accepted evidence states

See `ACCEPTED_EVIDENCE_STATES.md`.

## Scoring

See `SCORING_RULES.md` and `docs/audit/EVIDENCE_STATE_ACCURACY_AUDIT.md`.

## Run harness

```bash
npx tsx scripts/evidence-state-audit.test.ts
npx tsx scripts/run-evidence-state-audit.ts
```

Reports land in `artifacts/casebrain-qa/evidence-state-audit/report.json` and `REPORT.md`.

## Simulator v2 truth keys

`docs/h4/simulator-pack-v2/sim-*/truth-key.json` use list-style format (served/referred/missing arrays). The harness can **parse** them via `parseTruthKeyJson`, but each case still needs a paired `casebrain-output.json` before it is runnable. Do not bulk-convert without blind output snapshots.

## Claims discipline

- Do not claim near-zero false-served on unseen real-world bundles.
- Do not claim solicitor-reviewed audit complete.
- Label all harness output: **Controlled audit harness run — not solicitor-reviewed real-world audit.**
