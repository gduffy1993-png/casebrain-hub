# COURT CRIMINAL SWEEP — STATUS

**Verdict:** `COMPLETE`
**Product SHA (code tip):** `5d679c77a` (runner Preview env stamp was `627789b1e` — ignore)
**Preview:** https://casebrain-l632o48mf-gduffy1993-pngs-projects.vercel.app
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** 2026-08-21T22:27:07.587Z

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **2600** |
| Routed BACKEND_LIVE | 24 |
| Routed OFFLINE_COURT_PROJECTION | 2373 |
| Routed SKIP | 203 |
| Court scored (ndjson unique keys) | **2600** |
| Invent-flag events (sum) | 13 |
| Court-fail hitlist rows | 1206 |

## Top invent / modality families (so far)

- **mute:mute_phone_download**: 566
- **mute:mute_cad_999**: 396
- **mute:mute_cctv_master**: 320
- **modality_summary_vs_recording**: 103
- **modality_screenshot_vs_download**: 85
- **mute:mute_export_log**: 54
- **invent_cctv_master**: 8
- **invent_interview_recording**: 4
- **invent_bwv**: 1

## Method

1. Tip SHA ``5d679c77a`` (C2+D2+D3 armour) — Court / Chase court-line find-only (no product edits)
2. Reuse Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = Disclosure Chase labels/courtLines + safe court line + war-room position
5. Cheap invent/mute/modality/date-role flags — **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed `unique_key`
7. Emit `COURT-FAIL-HITLIST.csv`

## Resume

```bash
COURT_SWEEP_REUSE_INDEX=1 COURT_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
npx tsx scripts/assurance/court-criminal-sweep/run-court-criminal-sweep.ts --concurrency=6
```

Pack: `artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/`
Hitlist: `artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/COURT-FAIL-HITLIST.csv`


## Note

All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\court-criminal-sweep-v1\tip-resweep-d2-e20e0b1da\COURT-FAIL-HITLIST.csv

## ETA

Complete.

