# PDF ↔ Output diff — ARDEN-MONSTER-0001

## AFTER — export-log fix (`3fa12f9d6…`)

Live capture on https://casebrain-o0y9c5fq9-gduffy1993-pngs-projects.vercel.app  
Dumps: `_live/after-export-log-sha/`

| Claim | Kind | Gold (PDF) | Actual (CaseBrain AFTER) | Result | FP/FN |
|-------|------|------------|--------------------------|--------|-------|
| Phone download / extraction promoted | FACT | Phone = stolen property only | “No support … phone extraction/metadata” | MATCH (TN) | TN |
| Interview recording outstanding | FACT | Interview summary only | No interview-recording promotion | MATCH (TN) | TN |
| CAD/999 as case fact | FACT | CAD/999 = 0 | Safe court line: no CAD fact; boilerplate “such as CAD” advisory | TN* | TN* |
| Export log glued to CCTV master | FACT | Export log **absent** | Court WHY: “full **master footage** outstanding” — **no export log** | MATCH (TN) | **TN** |
| CCTV master outstanding | FACT | Full CCTV master outstanding; partial stills | Overview + Chase master; WHY stills/master | MATCH | TP |
| ID / participation route | ADVISORY | Identification disputed | Identification / participation / attribution pressure | MATCH | TP |
| MG6 unused schedule | FACT | unused/MG6C not established | No MG6 unused chase | MATCH (TN) | TN |
| Export log on Chase cards | FACT | Absent | No export-log card | MATCH (TN) | TN |

### AFTER Court WHY (quoted)
```
WHY THIS READINESS?
CCTV — stills served; full master footage outstanding — outstanding or partial on served papers (CCTV / video section).
```

---

## BEFORE — residual FP (`02d912547…`)

| Claim | Result | FP/FN |
|-------|--------|-------|
| Export log glued to CCTV master | UNSUPPORTED_PROMOTION | **FP** |

### BEFORE Court WHY (quoted)
```
WHY THIS READINESS?
CCTV — stills served; full master footage / export log outstanding — outstanding or partial on served papers (CCTV / video section).
```

### PDF gold (p8) — unchanged
```
Served according to MG6 extract: … partial CCTV stills …
Outstanding / incomplete: … full CCTV master, continuity statement, complete signed MG11.
```
*(export log: 0 hits in whole PDF)*

## What held across BEFORE→AFTER
- Phone download promotion: gone  
- Interview recording promotion: gone  
- CAD as Arden case-fact in safe court line: absent  
- ID route + CCTV master pressure: preserved  
- Export-log readiness coupling: **fixed** on `3fa12f9d6`
