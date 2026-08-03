# Stage-3000 Parallel Corpus Controller (Foundation)

**Status:** foundation only — uncommitted for Codex review  
**Baseline:** `308b7cb633f83d7c998bc80adf87356de346b3e9`  
**Branch:** `programme/s3000-parallel-controller`  
**Worktree:** `C:\Users\gduff\casebrain-hub-wt-s3000-controller`

## Scope

Resumable controller foundation that coordinates:

- **3 waves × 4 shards × 250 cases = 3,000**
- Deterministic IDs/seeds, non-overlapping ownership, membership SHA-256 freezes
- Source / truth / output / control separation; CaseBrain plane forbidden to generators
- Truth blinding until candidate freeze
- Checkpoints at 20 / 50 / 150 / 300 / 1000 / 3000
- Interrupt/resume without duplicate cases
- Shard crash retry, rejection/replacement without rewriting other accepted IDs
- Central semantic-duplicate scan, per-shard receipts, final reconciliation
- **No PASS from shard self-reporting alone**

## Non-goals (this change)

- Does **not** implement the accepted V2.1.2 generator (interface/placeholder only)
- Does **not** generate real cases or freeze a real population
- Does **not** run CaseBrain, Brain 1, Guardian, or touch frozen corpora / MAA runs
- Does **not** claim population PASS
- Does **not** commit / push / merge / deploy

## Ownership paths

| Path | Role |
|------|------|
| `lib/eval/stage3000-parallel-controller/` | Controller library |
| `scripts/stage3000-parallel-controller/` | CLI + contracts |
| `docs/stage3000-parallel-controller/` | Design / contract docs |
| `artifacts/stage3000-parallel-controller/` | Artefact root + synthetic fixtures |

## Quick commands

```bash
npx tsx scripts/stage3000-parallel-controller/run-controller.ts doctor --root artifacts/stage3000-parallel-controller/runs/_doctor
npx tsx scripts/stage3000-parallel-controller/stage3000-parallel-controller-contracts.test.ts
```

## Generator port

`UnboundGeneratorPort` fails closed. Wire the **accepted** V2.1.2 generator later via `bindAcceptedGeneratorPort`.  
`SyntheticFixtureGeneratorPort` is **test-only** and is not V2.1.2.
