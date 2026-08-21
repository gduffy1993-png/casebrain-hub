# CHUNK P0 — PAPERS SCALE FIND-ONLY

**Verdict:** `P0_COMPLETE_FINDONLY` (+ `P0_5_TRIAGE_DONE`)  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip:** `6e63bb6d2`  
**Preview:** https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app  
**Pack:** `artifacts/casebrain-qa/assurance/papers-criminal-sweep-v1/`  
**Runner:** `scripts/assurance/papers-criminal-sweep/run-papers-criminal-sweep.ts`  
**Spot-check:** `scripts/assurance/papers-criminal-sweep/p0-pdf-spotcheck.ts` → `p0-pdf-spotcheck.json`  
**Index:** reuse Overview `CRIMINAL-UNIQUE-INDEX.csv` (2600 unique criminal)  
**Scored:** **2600 / 2600**  
**Product fixes this chunk:** **NONE** (find-only)  
**Merge / Master-3000:** **NOT DONE**  
**Captured:** 2026-08-21

---

## Why this chunk

Overview invent/mute/modality proved at 2600. Papers inventory truth was the missing twin.  
P0 projects **Papers inventory** (`buildBundleTruthLedger` materials) vs PDF/source text.

Volume = triage, not guilt. Fix only after hop book (≥2 / shared-root) + opposite tests.

---

## Scale result (tip `6e63bb6d2`)

| Metric | N |
|--------|--:|
| Scored | **2600** |
| Hitlist rows | **759** |
| Invent-flag events (sum) | **1** |
| Top mute phone | **606** |
| modality_summary_vs_recording | **102** |
| mute_cad_999 / mute_cctv_master / mute_export_log | 29 / 28 / 14 |
| invent_bwv | **1** |

**Read:** Papers invent at scale is **quiet**. Hitlist is mute/modality volume, not invent firestorm.  
Full pass used `PAPERS_SWEEP_OFFLINE_ONLY=1` after backend corpus timeout (resilient fallback).

---

## P0.5 PDF triage

| Family | Sample | Class mix | Disposition |
|--------|-------:|-----------|-------------|
| `invent_bwv` | 1/1 | REAL_INVENT_SUSPECT ×1 | **WATCH** one-off — not shared-root yet |
| `mute_phone_download` | 12 | REAL_MUTE_CANDIDATE ×11 · DETECTOR_NOISE ×1 | **WATCH** shared mute candidate — needs Brookes TP / Arden TN opposite before any fix |
| `modality_summary_vs_recording` | 10 | PDF_TRUE_BOTH ×10 | **DETECTOR_SOFT** — leave WATCH; do not fix |

**Stop:** No product edit from P0. Mute-phone is the only multi-case survivor; treat as careful P1 candidate only with opposite armour (no mute-everything).

---

## Artefacts

- `papers-sweep.ndjson`
- `PAPERS-FAIL-HITLIST.csv`
- `PAPERS-SWEEP-STATUS.md`
- `p0-pdf-spotcheck.json`
- `CRIMINAL-UNIQUE-INDEX.csv`

---

## Next

1. Optional **P1** — only `PAPERS_PHONE_DOWNLOAD_MUTE` if opposite pair proves FN without inventing on property-phone TN cases.  
2. Date-role / Court bleed — later.  
3. Single `invent_bwv` — soft WATCH unless a second PDF confirms shared root.
