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

## Commands

```powershell
# Canary (50 discovery cases)
npx tsx scripts/strategy-corpus.ts --count 50 --split discovery --canary

# Full 1k corpus (all splits scored; holdout frozen)
npx tsx scripts/strategy-corpus.ts --count 1000 --split all

npx tsx scripts/strategy-corpus.test.ts
```

## Output (gitignored)

| Path | Contents |
|------|----------|
| `artifacts/casebrain-auditor/cache/strategy-corpus/` | Generated manifests + bundle text |
| `artifacts/casebrain-auditor/latest/strategy-corpus/` | Reports: summary.json, SUMMARY.md, fingerprint-rollup.md, weak-fail-cases.csv, holdout-summary.json |

## Split (1000 cases)

| Pack | Count | Use |
|------|------:|-----|
| Discovery | 700 | Fingerprint mining; shared fixes |
| Validation | 150 | Shared threshold tuning only |
| Holdout | 150 | **Frozen** — scored but not tuned against |

## Anti-overfitting

- No per-`caseId` hacks in repo
- No tuning on holdout during development
- No 1000/1000 pass target — fix **shared fingerprints**
- Do not commit generated corpus bodies

## Recipe families

- motoring
- fraud_account_control
- pwits_phone
- robbery_id
- violence_gbh_s18
- generic_provisional

See `lib/eval/casebrain-auditor/strategy-corpus-recipes.ts` for failure-mode tag compatibility.

## Generator version

`4e-v1.0.0` — see `STRATEGY_CORPUS_GENERATOR_VERSION` in `strategy-corpus-types.ts`.
