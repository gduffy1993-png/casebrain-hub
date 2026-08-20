# Trap CCTV invent fix notes

**Verdict target:** `TRAP_CCTV_INVENT_FIXED`  
**Branch:** `fix/f167-surgical-truth-v1`

## Root cause

Thin Trap-0030 papers say *do not strengthen by assuming missing CCTV*. That invent-advisory still contained the token `CCTV`, so:

1. `familySupport("cctv")` returned **mentioned**
2. Violence playbook seeded **CCTV/BWV** into missing evidence
3. Chase classified it as **CCTV full window / master footage**
4. Overview gaps humanized the same FP

Interview-recording invent was already TN (modality gate). CCTV invent was the remaining watch.

## Shared-root fix

- `chase-source-gate`: strip do-not-invent advisory clauses before counting CCTV/BWV/forensic as established (`absent`, not chase).
- `build-brief-plan`: gate playbook `missingMaterial` through `gateMaterialLines`.
- `pilot-workflow`: CCTV master/continuity profile lines require real stills/master/footage support (not invent-advisory alone).
- Chase family matchers: invent-advisory-only text does not classify as `cctv_master` / `cctv_continuity`.
- Confirm-none preservation through collapse/finalize (negated CCTV stays confirm-none, not re-chased).

## Opposite direction (must keep)

| Case | Expectation |
|------|-------------|
| Arden | CCTV stills served + master/continuity outstanding **kept** |
| Patel | CCTV master outstanding **kept** when papers establish it |
| Explicit export-log language | still surfaces (prior F167 gate) |

## Unit

- `scripts/f167-surgical-truth-opposite-direction.test.ts` — section G
- `scripts/chase-source-gate.test.ts` — invent-advisory absent + opposite keep
