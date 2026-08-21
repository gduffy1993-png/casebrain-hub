# PAPERS CRIMINAL SWEEP — STATUS

**Verdict:** `COMPLETE`
**Product SHA (frozen):** `6e63bb6d2`
**Preview:** https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** 2026-08-21T17:18:50.096Z

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **2600** |
| Routed BACKEND_LIVE | 24 |
| Routed OFFLINE_PAPERS_PROJECTION | 2373 |
| Routed SKIP | 203 |
| Papers scored (ndjson unique keys) | **2600** |
| Invent-flag events (sum) | 1 |
| Papers-fail hitlist rows | 759 |

## Top invent / modality families (so far)

- **mute:mute_phone_download**: 606
- **modality_summary_vs_recording**: 102
- **mute:mute_cad_999**: 29
- **mute:mute_cctv_master**: 28
- **mute:mute_export_log**: 14
- **modality_stills_collapsed_to_generic_cctv**: 2
- **invent_bwv**: 1
- **modality_screenshot_vs_download**: 1
- **contra:contradict_export_log**: 1

## Method

1. Tip SHA `6e63bb6d2` — Papers inventory find-only (no product edits)
2. Reuse Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = `buildBundleTruthLedger` materials (+ charge/hearing literals)
5. Cheap invent/mute/modality/date-role flags — **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed `unique_key`
7. Emit `PAPERS-FAIL-HITLIST.csv`

## Resume

```bash
PAPERS_SWEEP_REUSE_INDEX=1 PAPERS_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
npx tsx scripts/assurance/papers-criminal-sweep/run-papers-criminal-sweep.ts --concurrency=6
```

Pack: `artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1/`
Hitlist: `artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1/PAPERS-FAIL-HITLIST.csv`


## Note

All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\papers-criminal-sweep-v1\PAPERS-FAIL-HITLIST.csv

## ETA

Complete.

