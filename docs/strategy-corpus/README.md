# Strategy corpus (Phase 4e v1)

**Synthetic Criminal Bundle Factory v1** — manifest-first, seeded, fictional criminal case generator for blind strategy eval.

## Purpose

Generate and score many fictional case patterns through the existing stack:

```txt
bundle text / manifest
  → metadata extraction
  → explanation fidelity
  → Proof Map (4a)
  → Battleboard-view (4b)
  → War Room-view (4c)
  → score / fingerprint / summary
```

## Important: synthetic alignment ≠ real-world accuracy

A **1000/1000** corpus pass rate means the **factory renderer** and **evaluators** agree on **fictional** case patterns. It does **not** guarantee real-world hearing outcomes, client matter accuracy, or PDF/OCR stress performance. Gold **7** bundles and pilot/production gates remain the primary ship checks.

## Commands

```powershell
# Canary (50 discovery cases)
npx tsx scripts/strategy-corpus.ts --count 50 --split discovery --canary

# Full 1k corpus (all splits scored; holdout frozen)
npx tsx scripts/strategy-corpus.ts --count 1000 --split all

npx tsx scripts/strategy-corpus.test.ts
npx tsx scripts/strategy-corpus-traps.test.ts
```

## Output (gitignored)

| Path | Contents |
|------|----------|
| `artifacts/casebrain-auditor/cache/strategy-corpus/` | Generated manifests + bundle text |
| `artifacts/casebrain-auditor/latest/strategy-corpus/` | Reports (see below) |

### Report files

| File | Purpose |
|------|---------|
| `summary.json` / `SUMMARY.md` | Full run summary |
| `holdout-milestone.json` / `HOLDOUT-MILESTONE.md` | Discovery / validation / holdout split milestone (holdout not tuned) |
| `threshold-baseline.json` / `threshold-baseline.md` | Release thresholds — not 1000/1000 forever |
| `by-split.json` | Per-split pass/weak/fail |
| `fingerprint-rollup.md` | Shared failure fingerprints |
| `weak-fail-cases.csv` | Non-pass cases |

## Split (1000 cases)

| Pack | Count | Use |
|------|------:|-----|
| Discovery | 700 | Fingerprint mining; shared fixes |
| Validation | 150 | Shared threshold tuning only |
| Holdout | 150 | **Frozen** — milestone report only; not tuned against |

## Release thresholds (slice 3)

- No forbidden phrases in stack output
- Safe War Room wording (provisional hearing lines)
- Human review on serious/provisional families
- Gold 7/7 (proof-map, battleboard, war-room, bundle, explanation)
- Corpus pass rate **threshold-based** (default discovery ≥ 85%, fail ≤ 5%) — **not** perfect-score required

## Anti-tautology (slice 3)

Scoring inspects **generated** Proof Map / Battleboard / War Room outputs:

- Text-rendered bundle required (not manifest-only stub)
- Proof-map links reference valid `proofPointId`s
- Battleboard and War Room items carry linked `proofPointId`s
- Stack output derived from bundle pipeline (not manifest fields alone)

## Negative trap tests

`scripts/strategy-corpus-traps.test.ts` runs five deterministic trap bundles that **fail CI** if generators regress into unsafe invention (CCTV reliance without footage, final admissions from summaries, missing do-not-overstate, etc.).

## Anti-overfitting

- No per-`caseId` hacks in repo
- No tuning on holdout during development
- Do not commit generated corpus bodies

## Recipe families

- motoring
- fraud_account_control
- pwits_phone
- robbery_id
- violence_gbh_s18
- generic_provisional

## Generator version

`4e-v1.0.0` — phase `4e-slice-3` in `strategy-corpus-types.ts`.

## Future 50k scale-run (docs only — do not run)

**Fast safe method = chunked manifest/text run with summary-only reports, not 50k PDFs.**

- **50k** = manifest + truth-key + **text** scenarios in **gitignored cache**, not 50k PDFs in repo or on disk by default.  
- **PDFs:** sampled later (OCR/layout stress), not part of the default 50k milestone.  
- **Runs:** staged **1k → 5k → 10k → 50k**; chunked (`--chunk-size` 500–1000); **summary-only** reports by default; **weak/fail-only** detailed artifacts.  
- **Goal:** fingerprint collapse + safety — **not** 50k/50k pass; holdout **frozen**; **no caseId hacks**.  
- **Runtime:** benchmark 1k wall time; estimate 50k ≈ **1k × 50** unless parallelised (with merge/storage caps).  

Full design: [CASEBRAIN_V2_MASTER_PLAN.md §9.8.9](../CASEBRAIN_V2_MASTER_PLAN.md#989-scale-run-method-planned-runner--docs-only). **Do not implement or run 50k until that section’s gates are met.**
