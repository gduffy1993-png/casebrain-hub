# FAMILY PDF ACCURACY — Friday pack

**Verdict:** `PARTIAL`

**Freeze / tip:** product SHA `3fa12f9d6e7c7aa179d8308f2686e0cc62463f73` | Preview https://casebrain-o0y9c5fq9-gduffy1993-pngs-projects.vercel.app | branch `fix/f167-surgical-truth-v1`  
**Beat/extend:** `02d9125473f2413d7079b41b9e0ec596598e4682`  
**No password resets. No Master-3000 / holdout. No recovery/LI-recovery mainline.**

## Micro-fix #1 — export log

| Check | Result |
|-------|--------|
| Shared transition | `detectCctvStillsVsMaster` in explanation-fidelity-generate |
| Commit | `fix(truth): do not promote export log from CCTV master alone` |
| Arden Court/Papers/Client WHY | **export log GONE**; master outstanding KEPT |
| Opposite unit | PASS (export log surfaces when sourced) |
| Ahmed live | export-log exhibit text on chase provenance |

See `EXPORT-LOG-FIX-NOTES.md` · `FRIDAY-CANARY-STATUS.md` · `FAMILY-GYM-LOCKED.csv`

## Counts

| Metric | N |
|--------|--:|
| Gym locked cases | **20** |
| Mandatory canaries | Arden, Patel, Brookes, Dunn, Ahmed |
| Live diffs this pass | **7** (Arden + Brookes/Dunn/Ahmed/Patel/Tobin/Grant) |
| Brookes scorable live | **0** (PDF XRef fail — BLOCKED_LIVE) |
| Export-log Arden AFTER | **PASS** |

## Opposite-direction coverage

| Family | Negative | Positive / live note |
|--------|----------|----------------------|
| Export log | **Arden AFTER** — TN | Ahmed exhibit note in chase; unit opposite PASS |
| Phone download | Arden TN | Brookes **BLOCKED_LIVE** (bad PDF on backend) |
| CAD/999 | Arden TN | **Dunn/Patel/Grant** live CAD pressure |
| Interview | Arden TN (no recording invent) | Patel transcript/recording outstanding language (source-backed) |
| CCTV master | — | Arden/Patel TP preserved |

## Pack path

`artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/`

- `FAMILY-GYM-LOCKED.csv`
- `FAMILY-PAIR-SHORTLIST.csv`
- `EXPORT-LOG-FIX-NOTES.md`
- `FRIDAY-CANARY-STATUS.md`
- `cases/<case_key>/{source-map,actual-output,pdf-vs-output-diff}.md`
- `_live/after-export-log-sha/` · `_live/canaries/`
