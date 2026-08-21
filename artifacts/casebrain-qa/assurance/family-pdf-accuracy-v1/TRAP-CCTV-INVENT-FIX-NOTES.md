# Trap CCTV invent fix notes

**Verdict:** `TRAP_CCTV_INVENT_FIXED`  
**Commit:** `55c41d8956c044d20f4265cccc6fd8669349d2ae` — `fix(truth): do not invent CCTV master from thin-file advisory`  
**Preview:** https://casebrain-8h2c8ennr-gduffy1993-pngs-projects.vercel.app  
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

| Case | Expectation | Live AFTER |
|------|-------------|------------|
| Arden | CCTV stills served + master/continuity outstanding | **KEPT** (Overview + Chase + Court WHY; no export log) |
| Patel | CCTV master when papers establish it | prior LIVE preserved |
| Brookes phone download | opposite KEPT | Overview smoke PASS |
| Explicit export-log language | still surfaces | unit opposite PASS |

## Unit

- `scripts/f167-surgical-truth-opposite-direction.test.ts` — section G
- `scripts/chase-source-gate.test.ts` — invent-advisory absent + opposite keep

## Live Trap AFTER (`ce5bc9f2-…`)

- Overview gaps: **Exhibit mapping / provenance** + schedule — **no CCTV / master**
- Chase: **no CCTV full window / master footage**
- Court: **no CCTV invent**
- Interview recording invent: still TN
