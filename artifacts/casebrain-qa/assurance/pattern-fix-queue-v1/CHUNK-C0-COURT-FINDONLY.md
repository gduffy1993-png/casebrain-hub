# CHUNK C0 — COURT + CPS CHASE SCALE FIND-ONLY

**Verdict:** `C0_COMPLETE_FINDONLY`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip:** `e3179fa74`  
**Pack:** `artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/`  
**Runner:** `scripts/assurance/court-criminal-sweep/run-court-criminal-sweep.ts`  
**Scored:** **2600 / 2600**  
**Hitlist:** **1478**  
**Invent-flag sum:** **1084**  
**Product fixes this chunk:** **NONE**  
**PR:** https://github.com/gduffy1993-png/casebrain-hub/pull/70  
**Captured:** 2026-08-21

---

## Top families (volume = triage, not guilt)

| Family | N | Note |
|--------|--:|------|
| `invent_bwv` | **520** | Top Court invent — PDF-spotcheck first (detector vs real) |
| `mute_cctv_master` | 320 | Mute on Court/Chase surface |
| `mute_phone_download` | 287 | Residual after Papers P1 |
| `invent_interview_recording` | **261** | Court bleed of interview invent |
| `mute_cad_999` | 217 | |
| `invent_cad_999` | **194** | Court CAD invent volume |
| `modality_summary_vs_recording` | 193 | Soft / expected leftovers |
| `invent_phone_download` | 99 | |
| `invent_cctv_master` | 8 | Low vs Overview freeze era |
| `date_role_hearing_reused_as_deadline_language` | 6 | Soft date-role (gym hop) |

---

## Read

Court/Chase claim surface is **noisier than Overview/Papers tip** on invent_bwv / interview / CAD. That is the bleed we came for — do **not** mass-fix. Next: C0.5 PDF spot-check top invent families → hop book ≥2 shared-root → C1 armour.

## Next

1. **C0.5 DONE** — see `CHUNK-C05-C1-COURT-INVENT-ARMOUR.md`  
2. **C1 DONE + PROOF** — invent sum **1084→114** (`CHUNK-C1-COURT-INVENT-PROOF.md`)  
3. **D0 RUNNING** — Client find-only · then File (E0)
