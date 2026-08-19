# CaseBrain master 3,000 quality programme — Starter Gold checkpoint

Generated: 2026-08-19T14:26:39.110Z

## Verdict

**STARTER_GOLD_AUDIT_COMPLETE__FULL_3000_NOT_STARTED**

This checkpoint selected a real starter Gold batch from locally available independent truth keys, kept Holdout disjoint, produced the 361-control map, and audited only the starter Gold batch. It did **not** run the 500/1000/3000 stress set.

## Denominators

- Starter Gold: **40** matters
- Holdout candidates: **80** matters, not audited
- Real-PDF candidates: **20**, candidate-only pending independent truth labels
- 361-control map: **9 evaluated / 352 not exercised**

## Starter audit result

- Audit rows: **623**
- Candidate failures: **124**
- Confirmed failures: **0**
- Failure clusters: **45** total; **43** P0/P1

## Root-cause discipline

No individual case patching was done. Auditor false-positive roots were corrected first; remaining P1 clusters are stored-output-vs-truth candidates until checked against the current live shared builders.

## Next

Review P0/P1 stored-output candidate clusters against current live shared builders; only patch confirmed live shared roots, then rerun starter Gold before any 500/1000/3000 stress.
