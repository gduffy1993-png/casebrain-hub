# GRANT CCTV MASTER INVENT — FIX

**Verdict:** `GRANT_CCTV_MASTER_INVENT_FIXED`  
**Product tip SHA:** `2e6d6d3447d5398980a2c0b7aa3f983b73deb8b2`  
**Commits:** `4d01ff2a0` (gate) + `2e6d6d344` (build fix)  
**Preview:** https://casebrain-2r0jobmh3-gduffy1993-pngs-projects.vercel.app  
**Branch:** `fix/f167-surgical-truth-v1`  
**Captured:** 2026-08-21 (fresh AUTH after fix)  
**QA:** `gduffy1993+casebrain@gmail.com` — login OK (`ProdSmokeOnly!Jun2026`; no restore)  
**Live dumps:** `artifacts/casebrain-qa/assurance/pattern-fix-queue-v1/live-auth-word-for-word-after-cctv-fix/`

---

## Shared root

Thin Grant language *"Review whether listed CCTV/BWV has been served"* was promoting:

1. `disclosure-state` — bare `"cctv"` pattern → **CCTV Full Window** / auto **CCTV Continuity** topic  
2. `structured-extractor` — document-wide CCTV + any "not served" → full-window invent  
3. Court `collectChaseItems` — no `bundleText` → ungated Full Window / Continuity labels  
4. Overview humanize — **CCTV Full Window** → *"CCTV master outstanding"*

## Fix (no caseId hardcodes)

- Affirmative `isCctvMasterEstablished` / `isCctvContinuityEstablished` in `chase-source-gate`  
- Strip thin listed CCTV/BWV + product checklist labels from establishment hay  
- Gate master/full-window/continuity in `gateChaseLine` / `gateMaterialLine` / chase brief  
- Tighten `disclosure-state` topics + relevance (bare CCTV ≠ full window)  
- Clause-local structured-extractor master outstanding  
- Pass `bundleText` into Court / matter-brief chase collection  
- Humanize: full-window alone ≠ "CCTV master outstanding"

Opposite contracts: Grant-like TN · Arden TP · Trap TN (`f167-surgical-truth-opposite-direction.test.ts`).

---

## Live AFTER (word-for-word)

| Case | PDF | UI AFTER | Verdict |
|------|-----|----------|---------|
| **Grant** | p3: *"Review whether listed CCTV/BWV has been served"* — no master/full-window | Overview gaps: *"Interview recording outstanding"*, *"Phone download / source export referred to, not served on file"* — **no** CCTV master. Court TOP CHASE: *"Body Worn Video (BWV)"*; WHAT'S MISSING: BWV / Custody — **no** CCTV Full Window / Continuity invent | **TN held** |
| **Arden** | p8: *"full CCTV master, continuity statement"* | Overview: *"CCTV master outstanding"*; Chase: *"CCTV full window / master footage"* + *"CCTV Continuity / provenance"*; Court: *"CCTV full window"*, *"CCTV Continuity"*, *"Chase full CCTV master and continuity"* | **TP held** |
| **Trap** | invent-advisory only | Overview / Court / Chase: **no** CCTV master / full window | **TN held** |

---

## Final

`GRANT_CCTV_MASTER_INVENT_FIXED` — not `REGRESSED_ARDEN_MASTER`.
