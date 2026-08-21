# CHUNK C0 — COURT + CPS CHASE SCALE FIND-ONLY

**Verdict:** `C0_STARTED`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip:** `e3179fa74` / docs `b2ee01f69`  
**Pack:** `artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/`  
**Runner:** `scripts/assurance/court-criminal-sweep/run-court-criminal-sweep.ts`  
**Index:** reuse Papers/Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600)  
**Product fixes this chunk:** **NONE** (find-only)  
**PR:** https://github.com/gduffy1993-png/casebrain-hub/pull/70  

---

## Why

Overview + Papers invent lanes done. Next surface stack: **Court Control Room + CPS Chase court-lines** (same invent/mute/modality + date-role discipline), then Client / File.

Volume = triage, not guilt.

## Claim surface

- `buildDisclosureChaseBrief` — primary/additional labels, courtLines, safeCourtLine, deadline notes  
- `buildHearingWarRoomBrief` — safePositionToday, sayThis, doNotOverstate  

## Roadmap after C0

| Chunk | Surface |
|-------|---------|
| C0 | Court + Chase court-lines find-only @ 2600 |
| C1 | Shared-root Court invent/date-role armour (if ≥2 hops) |
| D0 | Client Summary factual find-only |
| E0 | File / exhibits find-only |
| Ship | Merge only when you say |

---

## Run

```bash
COURT_SWEEP_REUSE_INDEX=1 \
COURT_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
COURT_SWEEP_OFFLINE_ONLY=1 \
F167_PRODUCT_SHA=e3179fa74 \
npx tsx scripts/assurance/court-criminal-sweep/run-court-criminal-sweep.ts --concurrency=4
```
