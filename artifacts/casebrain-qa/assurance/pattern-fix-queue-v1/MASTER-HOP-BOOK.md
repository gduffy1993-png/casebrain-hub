# MASTER HOP BOOK — Pattern fix queue

**Wave status:** **`INVENT_WAVE_CLOSED`** — `WAVE-CLOSE-INVENT-V1.md`  
**Freeze product SHA:** `55c41d8956c044d20f4265cccc6fd8669349d2ae`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Close tip:** `b2c041ec0` · Preview (AUTH) https://casebrain-5eq2vjtuv-gduffy1993-pngs-projects.vercel.app  
**Rule:** Overview-sweep **volume = triage**, not guilt. Gym / PDF-verify drives fix order.  
**Do not regress:** Arden export-log TN · Trap CCTV invent TN · Brookes phone-download TP · Arden phone-property TN · Arden/Patel CCTV master TP · Dunn BWV stills≠full

Sources merged: `overview-criminal-sweep-v1`, `surface-findonly-v1/papers-chase`, `surface-findonly-v1/court-client-file`, `family-pdf-accuracy-v1` Friday canaries / FIXED hops.

---

## Scoreboard

| Status | N |
|--------|--:|
| FIXED (prior surgical + Trap CCTV + this wave + A lock + B Papers/Client + Chunk 3 BWV + P1 phone mute + C1 Court invent + D1 Client phone + E1 File chrome + C2 Court phone + D2 Client residual + D3 negation hygiene + C4 CCTV not-full + C5 interview/glued BWV) | 36 |
| OPEN (remaining) | 0 |
| STOP → Phase B (Papers / Client) | 0 |
| WATCH (UI / soft Chase inject / volume triage / Chunk 3 soft / File E0) | 8 |

**Phase A locked:** `cbf40f08f` · Preview https://casebrain-jo16a5tt0-gduffy1993-pngs-projects.vercel.app · see `PHASE-A-LOCK.md`  
**Phase B tip:** `a13739f4b` · Preview https://casebrain-98u6ps28m-gduffy1993-pngs-projects.vercel.app · see `PHASE-B-PAPERS-CLIENT.md`  
**Chunk 3:** `CHUNK-3-FAMILY-ARMOUR.md` · Preview https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app

---

## FIXED (keep green)

| ID | Surfaces | Class | Example cases | PDF verify | Notes |
|----|----------|-------|---------------|------------|-------|
| `EXPORT_LOG_FROM_CCTV_MASTER_ALONE` | Court/Papers/Client WHY | invent | Arden | Arden PDF: no export log; master outstanding | Commit `3fa12f9d6` — do not promote export log from master alone |
| `TRAP_CCTV_MASTER_FROM_INVENT_ADVISORY` | Overview/Chase/Court | invent | Trap-0030 | Thin file: do-not-assume CCTV | Commit `55c41d895` — invent-advisory strip + gate |
| `ARDEN_PHONE_DOWNLOAD_FROM_PROPERTY` | Overview/Chase | invent | Arden | Stolen phone ≠ download | F167 surgical `70314a041` |
| `ARDEN_INTERVIEW_RECORDING_FROM_SUMMARY` | Overview/Chase | invent / modality | Arden | Summary served; recording not outstanding | F167 surgical `c400b76ba` |
| `TRAP_INTERVIEW_RECORDING_INVENT` | Overview/Court/Papers/Chase | invent | Trap-0030 | No PACE recording/transcript | LIVE TN on freeze Preview |
| `BWV_STILLS_SERVED_PROMOTED_TO_FULL_EXPORT` | Chase (+ Overview gaps) | invent / modality | Dunn TN; Tobin/CASE-02 TP | Dunn S01 BWV stills Served ≠ full export | Chunk 3 — `isBwvFullExportEstablished` + family gate · Preview `76gk8` · opposite I3 |
| `PAPERS_PHONE_DOWNLOAD_MUTE` | Papers inventory + Chase | mute / modality | Brookes TP; Arden TN | Outstanding download outside MG6 head + download≠subscriber collapse | Chunk P1 — material ITEM_RE + denial + subscriber rewrite guard · opposite L2 |
| `COURT_DO_NOT_INVENT_DETECTOR_NOISE` | Court sweep invent flags | detector | Arden invent_bwv | DO_NOT “Do not import BWV/CAD…” ≠ invent claim | C0.5 — inventClaimBlob excludes DO_NOT |
| `COURT_INTERVIEW_RECORDING_FROM_PACE_PLAYBOOK` | Court/Chase | invent | RP-03; PDF-0d761… | PACE/custody ≠ interview recording | C1 — playbook + reconcileInterview + establishment helpers |
| `COURT_CAD_FROM_PAGE_999` | Court/Chase | invent | PDF-044f2ca43399 | Bare schedule “999” ≠ CAD | C1 — isCad999Established + match tighten |
| `CLIENT_PHONE_GAP_FROM_DONOT_OVERSTATE` | Client export gaps / five-answers | invent | harassment + “Do not import phone…” | Brookes pack invented without PDF download family | D1 — expandTruthMapRows PDF-true + bundleText |
| `CLIENT_SCREENSHOT_FROM_SUBSCRIBER_WHY` | Client export gaps | invent | Graves TB-050 | whyItMatters “Screenshots or…” ≠ screenshot served | D1 — establishment hay = labels+bundle only |
| `FILE_COURT_TRAILING_HEARING_GLUE` | File/header court | invent / glue | CB-TB-10 Mitchell; TB factory | `ManchesterHearing24 June` ≠ venue “Hearing” | E1 — scrubGluedCourt + crown match exclude Hearing |
| `FILE_NEXT_HEARING_SLASH_GLUE` | File/header hearing | mute | Trap-0030 | `StatusremandNext hearing18/08/2026` | E1 — normalize + Next hearing slash |
| `FILE_DEFENDANT_DATE_OF_BIRTH_GLUE` | File/header defendant | mute | CB-TB-012 Morley | `DefendantAlex MorleyDate of birth…` | E1 — trimPersonCapture Date of birth |
| `COURT_PHONE_DOWNLOAD_FROM_SIM_SUBSCRIBER` | Court/Chase | invent | Mercer; drugs playbook | SIM/IMEI/subscriber ≠ Full phone download | C2 — isPhoneDownloadEstablished + playbook seed |
| `CLIENT_FULL_PHONE_FROM_MIDSTATE_CHASE_LABEL` | Client export gaps | invent | Khan / Hayes mid-state PDFs | Chase mid-state inject ≠ Full phone download gap | D2 — modality from bundleText only + glued “this section” |
| `CLIENT_INVENT_PHONE_FROM_NEGATION_NOTE` | Client/Court invent detectors | detector | residual 7 after D2 | “not full phone download…” on Screenshot [Served] ≠ invent claim | D3 — note wording + claim-hay strip |
| `COURT_CCTV_MASTER_FROM_NOT_FULL_SEQUENCE` | Court/Chase | invent | Clarke/Turner tip residual | “not the full CCTV or BWV sequence” ≠ master | C4 — strip negation; full CCTV requires master/window |
| `COURT_INTERVIEW_SUMMARY_ONLY_FULL_RECORDING_DETECTOR` | Court invent detectors | detector | tip residual ×4 (fraud/murder/theft/RP-07) | SUMMARY ONLY / FULL RECORDING OUTSTANDING ≠ invent | C5 — interview_recording_source mid-state |
| `COURT_BWV_FROM_GLUED_SCHEDULE_TOKEN` | Court/Chase + invent detectors | invent / glue | gauntlet-06 `004BWV…not servedMay` | digit-glued BWV missed by `\bBWV\b` | C5 — family + full-export + invent source |

---

## OPEN — fix order (gym / PDF-true)

_(Wave open list cleared into FIXED / WATCH. See Phase A–C + Chunk 1–3 artefacts.)_

---

## WATCH (not first wave)

| ID | Why watch |
|----|-----------|
| `mute_phone_download` volume (~695 Overview) | Overview detector volume still WATCH; Papers inventory path FIXED in P1 (re-score later) |
| `EXPORT_LOG_PRESENT_GLUED_UNDER_MASTER` | Ahmed soft opposite — unit opposite already PASS; Patel Papers glue residual |
| `HEADER_CHARGE_MUTE_DESPITE_PDF` | Brookes/Patel — identity/extraction; not this truth wave |
| `THIN_TRAP_INVENT_SUBSCRIBER` | Folded into subscriber both-ways (#8) |
| `MG11_COMPLAINANT_LABEL_SOFT` | Chunk 3 — Trap/Arden both show Complainant MG11 card |
| `TOBIN_BWV_CHASE_BOARD_SOFT_MUTE` | Chunk 3 — Overview BWV true; Chase board priority soft mute |
| `HEARING_DATE_DEADLINE_UI_REUSE` | Chunk 3 + File E0 — listing “Hearing date passed” frames strip/ops chrome (~1980 File soft hits) |
| `FILE_INVENT_COURT_HEADER_GLUE` | File E0 invent — **FIXED** in E1 (tip 12/12); residual Trap court mash WATCH |
| `FILE_MUTE_HEARING_OR_DEFENDANT` | File E0 — defendant glue **FIXED** E1 (7/8); hearing Trap **FIXED**; Arden/charge no-date soft residual |

---

## Fix-wave priority (execute)

**STOPPED — invent wave closed.** See `WAVE-CLOSE-INVENT-V1.md`.  
Prior hops (interview / CAD / phone / Papers / hearing / subscriber / Dunn BWV / File chrome) landed FIXED.  
Remaining WATCH rows above are backlog only — not an active invent queue.

Companion: `MASTER-HOP-BOOK.csv` · status: `PATTERN-FIX-WAVE-STATUS.md` · close: `WAVE-CLOSE-INVENT-V1.md`
