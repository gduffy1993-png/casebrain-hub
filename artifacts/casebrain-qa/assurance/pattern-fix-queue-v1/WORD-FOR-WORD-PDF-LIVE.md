# WORD-FOR-WORD PDF ↔ LIVE UI

**Verdict:** `GRANT_CCTV_MASTER_INVENT_FIXED` (overall material word-for-word **PASS** on Grant invent class + Arden/Trap opposites)  
**Preview:** https://casebrain-2r0jobmh3-gduffy1993-pngs-projects.vercel.app  
**Product tip SHA:** `2e6d6d3447d5398980a2c0b7aa3f983b73deb8b2`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Captured:** 2026-08-21 (fresh AUTH after invent fix)  
**QA:** `gduffy1993+casebrain@gmail.com` — login **OK** (`ProdSmokeOnly!Jun2026`; no restore)  
**Live dumps:** `artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-word-for-word-after-cctv-fix/`  
**Fix note:** `GRANT-CCTV-MASTER-INVENT-FIX.md`  
**Sources:** verified PDF extracts / source-maps (not CaseBrain output); Arden also `f167-surgical-truth-v1/_source/CB-MONSTER-2026-0001.pdf`

---

## Invent / mute miss table (material)

| Case | Class | PDF quote (page) | Live UI quote (surface) | Verdict |
|------|-------|------------------|-------------------------|---------|
| **Grant** | invent_cctv_master | p3: *"Review whether listed CCTV/BWV has been served"* — **no** “CCTV master” / “full window” | Overview DISCLOSURE GAPS: *"Interview recording outstanding"*, *"Phone download / source export referred to, not served on file"* — **no** CCTV master. Court TOP CHASE: *"Body Worn Video (BWV)"*; WHAT'S MISSING: BWV / Custody — **no** CCTV Full Window / Continuity invent | **MATCH** (TN held) |
| Arden | invent_export_log | Term hit `export` = **0** | Overview + Chase: no “export log” | **MATCH** (TN held) |
| Arden | invent_phone_download (property) | phone is stolen property; `phone download` = **0** | No phone-download chase | **MATCH** (TN held) |
| Arden | mute_cctv_master | p8: *"full CCTV master, continuity statement"* | Overview: *"CCTV master outstanding"*; Chase: *"CCTV full window / master footage"*; Court: *"CCTV full window"*, *"CCTV Continuity"* | **MATCH** (TP held) |
| Brookes | mute_phone_download | Original download outstanding | Chase primary phone download (prior tip; not re-guilt this hop) | **MATCH** (prior) |
| Trap | invent_cctv_master | invent-advisory only | Overview + Court + Chase: **no** CCTV master / full window | **MATCH** (TN held) |
| Grant | invent_cad_999 outstanding | CAD / 999 extract **Present** | No CAD extract outstanding invent | **MATCH** (TN held) |

---

## Grant AFTER (this fix)

| PDF quote | UI AFTER | Verdict |
|-----------|----------|---------|
| *"Review whether listed CCTV/BWV has been served"* | Overview gaps have **no** *"CCTV master outstanding"* / *"CCTV outstanding"* invent | **MATCH** |
| same | Court no longer TOP-CHASE / WHAT'S-MISSING *"CCTV full window"* / *"CCTV Continuity"* from thin listed language | **MATCH** |

## Arden opposite (must hold)

| PDF quote | UI AFTER | Verdict |
|-----------|----------|---------|
| *"Outstanding / incomplete: … full CCTV master, continuity statement"* | Overview *"CCTV master outstanding"*; Chase master + continuity cards; Court *"CCTV full window"* + *"CCTV Continuity"* | **MATCH** |

---

## Final

| Rollup | Status |
|--------|--------|
| Grant CCTV master invent | **FIXED** |
| Arden CCTV master TP | **PASS** (not regressed) |
| Trap invent TN | **PASS** |
| **Overall** | **`GRANT_CCTV_MASTER_INVENT_FIXED`** |

### Soft residuals (not guilt)

- Client Summary brief spinner (`Building matter brief…`) on some surfaces
- Grant Court may still list BWV / Custody CCTV checklist items when BWV is on papers (distinct from master invent)
- Papers inventory row mash / OCR-ish labels

### Do not regress

Arden export-log TN · Arden phone-extraction TN · Arden CCTV master TP · Brookes phone download **primary** Chase · Trap CCTV/interview/subscriber invent TNs · Grant CAD-on-file TN · no caseId hardcodes · no mute-everything · exclude `casebrain-review-bundle.zip`
