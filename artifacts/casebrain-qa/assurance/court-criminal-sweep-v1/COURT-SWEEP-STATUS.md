# COURT CRIMINAL SWEEP — STATUS

**Verdict:** `COMPLETE`
**Product SHA (frozen):** `e3179fa74`
**Preview:** https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** 2026-08-21T18:04:33.745Z

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **2600** |
| Routed BACKEND_LIVE | 24 |
| Routed OFFLINE_COURT_PROJECTION | 2373 |
| Routed SKIP | 203 |
| Court scored (ndjson unique keys) | **2600** |
| Invent-flag events (sum) | 1084 |
| Court-fail hitlist rows | 1478 |

## Top invent / modality families (so far)

- **invent_bwv**: 520
- **mute:mute_cctv_master**: 320
- **mute:mute_phone_download**: 287
- **invent_interview_recording**: 261
- **mute:mute_cad_999**: 217
- **invent_cad_999**: 194
- **modality_summary_vs_recording**: 193
- **invent_phone_download**: 99
- **modality_screenshot_vs_download**: 63
- **mute:mute_export_log**: 54
- **invent_cctv_master**: 8
- **date:date_role_hearing_reused_as_deadline_language**: 6
- **invent_phone_download_from_property**: 2
- **modality_property_phone_vs_download**: 1

## Method

1. Tip SHA `e3179fa74` — Court / Chase court-line find-only (no product edits)
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

All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\court-criminal-sweep-v1\COURT-FAIL-HITLIST.csv

## ETA

Complete.

