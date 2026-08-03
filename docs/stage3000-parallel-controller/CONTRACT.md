# Contract — Stage-3000 Parallel Corpus Controller Foundation

## Invariants

1. **Determinism** — same `(populationId, wave, shard, localIndex, generatorVersionPin, controllerVersion)` → same caseId and seed.
2. **Non-overlap** — exactly one shard owns each global slot in `0..2999`.
3. **Membership append-only under freeze** — frozen manifests reject mutation; SHA-256 must match canonical accepted set.
4. **Plane separation** — generators never receive truth or CaseBrain roots.
5. **Blinding** — truth sealed until candidate content hash exists.
6. **Checkpoints** — thresholds `[20,50,150,300,1000,3000]` recorded with membership SHA.
7. **Resume** — reload skips accepted slots; acceptedCount and membershipSha256 stable across no-op resume.
8. **Crash retry** — transient shard failures retry per slot; permanent exhaustion fails closed.
9. **Rejection** — rejected IDs absent from accepted set; replacements use `R###` IDs; remaining accepted IDs unchanged.
10. **Lineage pins** — every accepted entry carries controller + generator version pins.
11. **Central dupes** — semantic fingerprint collisions detected by controller, not shard self-check.
12. **Receipts insufficient** — `selfReportStatus: shard_complete_claimed` alone cannot produce PASS.
13. **Reconciliation required** — final verdict from `reconcilePopulation`, not from receipt aggregation.
14. **No generator invention** — V2.1.2 generator is an unbound port until externally accepted and bound.

## Contract suites (synthetic fixtures)

| Suite | Intent |
|-------|--------|
| Positive | IDs/seeds, ownership, planes, blinding, freeze hash, scaled run, checkpoints, lineage, clean dupe scan, full synthetic reconcile PASS structure |
| Negative | Unbound generator, receipt-only fail, forbidden roots, under-size freeze, duplicate accept, unbound reconcile |
| Mutation | Tampered SHA, injected semantic dupes, reject/replace stability, ownership overlap throw |
| Resume | Interrupt/resume no dupes, state round-trip, crash retry recovery |

## Explicit non-claims

Passing foundation contracts is **not** a Stage-3000 population PASS, not V2.1.2 acceptance, and not authorisation to freeze or run CaseBrain.
