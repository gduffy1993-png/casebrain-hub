# Design — Stage-3000 Parallel Corpus Controller

## Topology

```
Wave 1: shards S0..S3 → global slots 0..999     (4 × 250)
Wave 2: shards S0..S3 → global slots 1000..1999
Wave 3: shards S0..S3 → global slots 2000..2999
Total: 3000
```

Shard key format: `W{wave}-S{shard}`.

## Deterministic identity

- Primary case ID: `S3000-W{wave}-S{shard}-{localIndex:03d}`
- Replacement case ID: `S3000-W{wave}-S{shard}-R{serial:03d}`
- Seed: `sha256("s3000-seed-v1"|populationId|caseId|generatorVersionPin|controllerVersion)`

Replacements reuse the rejected/withdrawn **global slot** for ownership coverage but always mint a **new** caseId and seed. Other accepted membership IDs are never rewritten.

## Workspace planes

| Role | Generator access | Purpose |
|------|------------------|---------|
| `source/` | yes | pins, prompts, generator inputs |
| `truth/` | **no** until candidate freeze (controller-side reveal only) | ground truth |
| `output/` | write candidates via controller | shard outputs |
| `control/` | **no** | manifests, checkpoints, state, receipts |
| `casebrain_forbidden/` | **never** | CaseBrain outputs — generators must not read |

## Truth blinding

Generators receive only `sourceRoot` + explicit `forbiddenRoots`.  
Truth reveal is gated on `candidateContentSha256` being present (candidate freeze).

## Checkpoints

When accepted membership count crosses 20, 50, 150, 300, 1000, or 3000, the controller writes a checkpoint artefact embedding the membership SHA-256.

## Resume

Controller state is persisted under `control/state/controller-state.json` with a resume token. On resume, accepted primary slots are skipped — no duplicate caseIds.

## Crash / retry

Per-slot generation retries up to `maxSlotRetries` (default 3). Exhaustion fails closed for that slot.

## Rejection / replacement

- Rejected candidates never enter accepted membership.
- Pre-freeze withdrawal removes an accepted ID and records rejection; replacement fills the slot with a new ID.
- Post-freeze membership is immutable.

## Receipts vs PASS

Per-shard acceptance receipts are **necessary evidence**, never sufficient.  
Final PASS requires reconciled membership at target size, intact SHA, clean central semantic-dupe scan, matching receipts, full checkpoints, and a **bound** accepted generator pin. Shard self-reports alone → fail.

## Generator port

Placeholder: `UnboundGeneratorPort` / `GENERATOR_VERSION_PIN_UNBOUND`.  
Real V2.1.2 implementation is owned elsewhere and must be accepted before bind.
