# CLIENT CRIMINAL SWEEP — STATUS

**Verdict:** `COMPLETE`
**Product SHA (code tip):** `e20e0b1da` (runner Preview env stamp was `627789b1e` — ignore)
**Preview:** https://casebrain-l632o48mf-gduffy1993-pngs-projects.vercel.app
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** 2026-08-21T21:56:07.239Z

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **2600** |
| Routed BACKEND_LIVE | 24 |
| Routed OFFLINE_CLIENT_PROJECTION | 2373 |
| Routed SKIP | 203 |
| Client scored (ndjson unique keys) | **2600** |
| Invent-flag events (sum) | 20 |
| Client-fail hitlist rows | 1047 |

## Top invent / modality families (so far)

- **mute:mute_cad_999**: 396
- **mute:mute_phone_download**: 331
- **mute:mute_cctv_master**: 320
- **modality_summary_vs_recording**: 103
- **mute:mute_export_log**: 54
- **modality_screenshot_vs_download**: 32
- **invent_cctv_master**: 8
- **invent_phone_download**: 7
- **invent_interview_recording**: 4
- **modality_property_phone_vs_download**: 1
- **invent_phone_download_from_property**: 1

## Method

1. Tip SHA ``e20e0b1da`` (D2 armour) — Client Summary find-only (no product edits)
2. Reuse Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = Disclosure Chase labels/courtLines + safe court line + war-room position
5. Cheap invent/mute/modality/date-role flags — **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed `unique_key`
7. Emit `CLIENT-FAIL-HITLIST.csv`

## Resume

```bash
CLIENT_SWEEP_REUSE_INDEX=1 CLIENT_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
npx tsx scripts/assurance/court-criminal-sweep/run-court-criminal-sweep.ts --concurrency=6
```

Pack: `artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/`
Hitlist: `artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/CLIENT-FAIL-HITLIST.csv`


## Note

All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\client-criminal-sweep-v1\tip-resweep-d2-e20e0b1da\CLIENT-FAIL-HITLIST.csv

## ETA

Complete.

