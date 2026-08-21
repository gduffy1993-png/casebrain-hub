# FILE CRIMINAL SWEEP — STATUS

**Verdict:** `COMPLETE`
**Product SHA (frozen):** `b47ead423`
**Preview:** https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** 2026-08-21T19:48:33.232Z

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **2600** |
| Routed BACKEND_LIVE | 24 |
| Routed OFFLINE_FILE_PROJECTION | 2373 |
| Routed SKIP | 203 |
| File scored (ndjson unique keys) | **2600** |
| Invent-flag events (sum) | 43 |
| File-fail hitlist rows | 2074 |

## Top invent / modality families (so far)

- **date:date_role_hearing_passed_as_ops_chrome**: 1980
- **mute:mute_stage_despite_pdf**: 278
- **date:date_role_hearing_passed_chrome**: 185
- **mute:mute_hearing_despite_pdf**: 62
- **invent_court_header**: 43
- **mute:mute_defendant_despite_pdf**: 23
- **mute:mute_court_despite_pdf**: 5

## Method

1. Tip SHA `b47ead423` — File tab find-only (no product edits)
2. Reuse Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = File header chrome (defendant/charge/court/hearing/stage) + raw extract presence
5. Cheap invent/mute/modality/date-role flags — **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed `unique_key`
7. Emit `FILE-FAIL-HITLIST.csv`

## Resume

```bash
FILE_SWEEP_REUSE_INDEX=1 FILE_SWEEP_OFFLINE_ONLY=1 FILE_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
npx tsx scripts/assurance/file-criminal-sweep/run-file-criminal-sweep.ts --concurrency=6
```

Pack: `artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/`
Hitlist: `artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/FILE-FAIL-HITLIST.csv`


## Note

All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\file-criminal-sweep-v1\FILE-FAIL-HITLIST.csv

## ETA

Complete.

