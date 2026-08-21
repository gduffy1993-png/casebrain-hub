# CLIENT CRIMINAL SWEEP — STATUS

**Verdict:** `COMPLETE`
**Product SHA (frozen):** `7b900de22`
**Preview:** https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** 2026-08-21T19:12:52.237Z

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **2600** |
| Routed BACKEND_LIVE | 24 |
| Routed OFFLINE_CLIENT_PROJECTION | 2373 |
| Routed SKIP | 203 |
| Client scored (ndjson unique keys) | **2600** |
| Invent-flag events (sum) | 200 |
| Client-fail hitlist rows | 1118 |

## Top invent / modality families (so far)

- **mute:mute_cad_999**: 396
- **mute:mute_cctv_master**: 320
- **mute:mute_phone_download**: 279
- **invent_phone_download**: 166
- **modality_summary_vs_recording**: 103
- **mute:mute_export_log**: 54
- **invent_subscriber_thin**: 14
- **invent_cctv_master**: 8
- **invent_phone_download_from_property**: 8
- **invent_interview_recording**: 4
- **modality_property_phone_vs_download**: 1

## Method

1. Tip SHA `7b900de22` — Client Summary find-only (no product edits)
2. Reuse Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = client-safe explanation + matter-brief client + export client_summary/evidence_gaps + chase bleed
5. Cheap invent/mute/modality/date-role/bleed flags - **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed `unique_key`
7. Emit `CLIENT-FAIL-HITLIST.csv`

## Resume

```bash
CLIENT_SWEEP_REUSE_INDEX=1 CLIENT_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \
CLIENT_SWEEP_OFFLINE_ONLY=1 \
npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts --concurrency=4
```

Pack: `artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/`
Hitlist: `artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/CLIENT-FAIL-HITLIST.csv`


## Note

All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\client-criminal-sweep-v1\CLIENT-FAIL-HITLIST.csv

## ETA

Complete.

