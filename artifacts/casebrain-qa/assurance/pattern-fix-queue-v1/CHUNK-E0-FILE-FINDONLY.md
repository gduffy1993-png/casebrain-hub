# CHUNK E0 — FILE SCALE FIND-ONLY

**Verdict:** `E0_COMPLETE_FINDONLY`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip:** `b47ead423`  
**Pack:** `artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/`  
**Runner:** `scripts/assurance/file-criminal-sweep/run-file-criminal-sweep.ts`  
**Scored:** **2600 / 2600**  
**Hitlist:** **2074**  
**Invent-flag sum:** **43**  
**Product fixes this chunk:** **NONE**  
**Captured:** 2026-08-21

---

## Claim surface

- File tab = shared header chrome (defendant / charge / court / hearing / stage) + raw source extract
- Projection: `extractBundleCaseMetadata` + `resolveCaseHeaderMetadata` + `resolveSolicitorHearingStatus` + pilot strip display guards
- Evidence invent/mute detectors **gated off** on `FILE_SURFACE | RAW_SOURCE_EXTRACT` (raw extract ≡ PDF — chase-family invent/mute is noise)
- Fixed `asOf` `2026-08-21` for hearing passed chrome (soft date-role volume)

## Top families (volume = triage, not guilt)

| Family | N | Note |
|--------|--:|------|
| `date_role_hearing_passed_as_ops_chrome` | **1980** | Soft — statusLabel `Hearing date passed · …` on File/header strip; gym hop `HEARING_DATE_USED_AS_OPERATIONAL_DEADLINE` |
| `mute_stage_despite_pdf` | 278 | Stage muted while PDF has stage/PTPH/remand cues |
| `date_role_hearing_passed_chrome` | 185 | Soft twin (hearingRaw + passed chrome) |
| `mute_hearing_despite_pdf` | 62 | Gym-shaped; includes Arden / Trap-ish keys — PDF-spotcheck first |
| `invent_court_header` | **43** | Sole invent family — often glued `Crown Court at X Hearing` |
| `mute_defendant_despite_pdf` | 23 | Identity mute |
| `mute_court_despite_pdf` | 5 | |
| `mute_charge_despite_pdf` | **0** | Cleared on this projection |

## Invent signal

- **Invent sum = 43** — all `invent_court_header`
- Sample shapes: `HEADER_COURT | Crown Court at Manchester Hearing` (hearing token glued into court cell)
- No evidence-family invents on File surface (gated)

## Next

1. **E0.5** — PDF-spotcheck top `invent_court_header` + `mute_hearing_despite_pdf` / `mute_defendant_despite_pdf` (not the 1980 date-role lump)
2. Optional E1 armour only if spotcheck confirms shared-root chrome invent/mute
3. Live AUTH canaries (Overview→File) when surfaces settle
4. Merge to programme **only on explicit ask**
