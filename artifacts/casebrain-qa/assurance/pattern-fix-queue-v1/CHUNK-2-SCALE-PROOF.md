# CHUNK 2 — SCALE PROOF (INVENT RE-SWEEP)

**Verdict:** `CHUNK_2_PROOF_STRONG`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Worktree HEAD:** `2ab432c3e` (docs ahead of product tip)  
**Product tip SHA (projection + Preview):** `2e6d6d3447d5398980a2c0b7aa3f983b73deb8b2`  
**Preview:** https://casebrain-2r0jobmh3-gduffy1993-pngs-projects.vercel.app  
**Freeze baseline SHA:** `55c41d8956c044d20f4265cccc6fd8669349d2ae`  
**Freeze pack:** `artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/` (NDJSON / hitlist preserved)  
**Tip resweep pack:** `artifacts/.../overview-criminal-sweep-v1/tip-resweep-2e6d6d344/`  
**Captured:** 2026-08-21  
**Product fixes this chunk:** **NONE** (report-only)  
**Chunk 3 (new family armour) / merge:** **NOT STARTED**

---

## Method

1. Reused freeze `CRIMINAL-UNIQUE-INDEX.csv` (**2600** criminal unique keys).
2. Re-ran same Overview invent/mute/modality runner on **tip product libraries** @ `2e6d6d344` with tip Preview metadata.
3. Crash-safe resumable NDJSON in isolated out-dir (`tip-resweep-2e6d6d344/`); concurrency **6**; completed **2600/2600**.
4. Compared last-write-wins unique-case family flags: freeze NDJSON vs tip NDJSON.
5. PDF spot-checked **all 16** remaining `invent_cctv_master` hits + **5** modality leftovers.

Runner support added (non-product): `OVERVIEW_SWEEP_OUT_DIR` / `OVERVIEW_SWEEP_INDEX_SRC` so tip resweep does not clobber freeze artefacts.

---

## Before / after (unique cases with flag)

| Family | Freeze `55c41d895` | Tip `2e6d6d344` | Δ | Class |
|--------|-------------------:|----------------:|--:|-------|
| `invent_cctv_master` | **177** | **16** | −161 | **DROPPED** (~91%) — residual = detector / affirmative-gap, not new shared-root invent |
| `invent_interview_recording` | **477** | **0** | −477 | **CLEARED** |
| `invent_cad_999` | **94** | **0** | −94 | **CLEARED** |
| `modality_summary_vs_recording` | **301** | **103** | −198 | **DROPPED** — leftovers expected PDF-true contrast |
| `mute_phone_download` | **695** | **695** | 0 | **WATCH** — still high; detector volume ≠ product mute |

**Corpus:** 2600 / 2600 scored both sides.  
**Invent-flag event sum:** freeze **748** → tip **16**.  
**Hitlist rows:** freeze **1298** → tip **852**.

Artefacts:
- `tip-resweep-2e6d6d344/chunk2-before-after.json`
- `tip-resweep-2e6d6d344/overview-sweep.ndjson`
- `tip-resweep-2e6d6d344/OVERVIEW-FAIL-HITLIST.csv`
- `tip-resweep-2e6d6d344/OVERVIEW-SWEEP-STATUS.md`

---

## Sample PDF triage (remaining AFTER invent)

### `invent_cctv_master` residual = 16 / 16 spot-checked

| Class | N | Notes |
|-------|--:|-------|
| `DETECTOR_NOISE_OR_AFFIRMATIVE_GAP` | **16** | Papers mention **CCTV** but lack explicit “CCTV master / full master” source phrase; tip still emits chase lines like *“Chase CCTV master with continuity.”* On several (e.g. Turner / Banks) MG6 already lists **full CCTV export outstanding** — closer to TP gap than Grant-style invent. |
| `REAL_INVENT_SUSPECT` (no CCTV on papers) | **0** | None in residual set |
| `GRANT_LIKE_THIN_REVIEW` | **0** | None |

**Conclusion:** No clear **new shared-root invent** surviving PDF spot-check → **no product fix in Chunk 2**.

Examples: `CB-TB-1575_Reynolds`, `CB-TB-498_Turner`, `CB-TB-499_Banks`, thin MG5-only packs — all CCTV-present / thin, detector-flagged.

### `modality_summary_vs_recording` sample (5)

All **5** → `PDF_TRUE_CONTRAST` (interview summary on papers + recording claim). Matches Chunk 1 residual finding; not invent shared-root.

Artefact: `tip-resweep-2e6d6d344/chunk2-pdf-spotcheck.json`  
Script: `scripts/assurance/overview-criminal-sweep/chunk2-pdf-spotcheck.ts`

### `mute_phone_download`

**Still 695** — unchanged vs freeze. Honest WATCH: Brookes Overview still surfaces phone gap live (Chunk 1). Detector hitlist volume is not proof of mute-everything failure or invent clearance.

---

## Scope guards

| Guard | Status |
|-------|--------|
| No caseId product hacks | Held |
| No password resets | Held |
| No Master-3000 / holdout | Held |
| Exclude `casebrain-review-bundle.zip` | Held |
| No Chunk 3 / merge | **Confirmed not started** |
| Product fix this chunk | **None** (report-only) |

---

## Final

`CHUNK_2_PROOF_STRONG` — full 2600 tip re-sweep proves invent interview + CAD cleared (0), CCTV invent collapsed 177→16 with residuals PDF-triaged as detector/affirmative-gap (not new shared-root invent), modality down 301→103 (PDF-true leftovers), mute phone still high WATCH. Chunk 3 not started.
