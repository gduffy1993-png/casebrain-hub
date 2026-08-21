# CHUNK D0 — CLIENT SCALE FIND-ONLY

**Verdict:** `D0_RUNNING`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip:** `7b900de22`  
**Pack:** `artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/`  
**Runner:** `scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts`

## Claim surface

Client-safe / Client Summary projection (not Court Control Room):

- `buildClientSafeExplanation`
- War-room `draftWording.clientExplanation`
- Matter-brief `client` section
- Export-pack `client_summary` + `evidence_gaps` (chase bleed)
- Chase labels as `CHASE_BLEED` (gym CLIENT≈Court hop)
- Bleed detectors: court-control language / papers-inventory chrome in client core

DO_NOT lines excluded from invent scoring (same C0.5 lesson).

## Method

```
CLIENT_SWEEP_REUSE_INDEX=1 \
CLIENT_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
CLIENT_SWEEP_OFFLINE_ONLY=1 \
CLIENT_SWEEP_CONCURRENCY=4 \
F167_PRODUCT_SHA=7b900de22 \
npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts
```

Smoke (3 cases): runner OK — saw `invent_interview_recording` on Client bleed surface.

## Next

1. Complete 2600 Client find-only  
2. Triage top invent / bleed families (no mass-fix)  
3. File (E0) after D0 complete
