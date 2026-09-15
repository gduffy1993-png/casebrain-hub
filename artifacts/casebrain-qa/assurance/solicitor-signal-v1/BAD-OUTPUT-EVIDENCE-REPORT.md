# Bad-output evidence report (manual random scan)

**Purpose:** Receipts pack for Codex before next root fix. No patches. No commits. No merge/deploy.
**Scan tip:** shortlist-freeze Preview `casebrain-8b3kvk22f-…` (PR #101 tip).
**Live captures:** `artifacts/casebrain-qa/assurance/solicitor-signal-v1/_live/manual-random-{1..5}-*/`
**Sources:** family-pdf text extracts (`*_extracts/*.full.txt`) + live UI text dumps. Pixel PDF page images not re-opened; where extract has page markers those are cited; else `SOURCE_NOT_AVAILABLE`.

**Cases scanned:** 5 (live PDF QA matters, lightly touched / not Dunn·Brookes·Patterson grind)


| #   | Case ID                                | Name         | Bundle / extract                                                                         |
| --- | -------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| 1   | `a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27` | Imani Tobin  | CB-TB-1925 / `RP-03-TOBIN`                                                               |
| 2   | `687cf5a6-6898-4257-baef-33e33ace08df` | Layla Davies | CB-TB-439 / `RP-15-DAVIES`                                                               |
| 3   | `ed3c9806-3227-4ee9-ad86-9784e6000084` | Isaac Patel  | CB-TB-546 / `ISAAC-PATEL-TB-546`                                                         |
| 4   | `14823d9e-1f0f-4cfc-af01-e6595d1cdfc4` | Leon Hale    | CB-MURDER-TEST-0001 (Papers live + inventory; murder extract path not in family-pdf set) |
| 5   | `99090c69-5d78-41e3-946d-119b4bc335ba` | Arden Vale   | CB-MONSTER-2026-0001 / `ARDEN-MONSTER-0001`                                              |


**Total findings logged below (representative, clustered):** 18  
**Duplicates suppressed:** many more identical custody court-line / all-MG6-type rows exist; not enumerated 1:1.

---



## Coverage vs Codex’s current 3-file patch

Files named by Codex:

1. `components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts` (incl. `assembleSolicitorShortlist`)
2. `lib/criminal/source-truth-guardian/guardian.ts`
3. `source-truth-guardian.test.ts` (guardian tests)


| Cluster                                                                            | Covered by that 3-file patch?                                                                                                                |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| A Charge invent / wrong person-case on Overview                                    | **NO** — guardian lints chase/war-room *lines*; does not own Overview charge header / client-safe charge string                              |
| B Schedule-loud priority drop / desk collapse                                      | **PARTIAL only** — shortlist *freezes projection* of whatever seeds survive; does **not** re-rank to MG6 loudness                            |
| C Wrong status / status soft-flip (Outstanding→Served / Referred only)             | **NO** for Papers inventory STATUS column; guardian may soften affirmative *facts*, not fix schedule-row status mapping                      |
| D Sticky / mismatched case-wide court line                                         | **NO** — chase-shaped court lines pass `isChaseOrDisclosureLine` and survive guardian; sticky template still emitted upstream                |
| E Template bleed (999 / medical / Brookes-style subscriber wording / all-TYPE=MG6) | **PARTIAL** — guardian catches some wrong-modality *affirmative* claims; does **not** fix Papers TYPE typing or soft CAD/999 chase promotion |
| F SIDE / noise inventory rows                                                      | **PARTIAL** — shortlist mute removes SIDE from Overview/Chase primary; Papers inventory still noisy                                          |
| G UI wording only (`cCTV` typo)                                                    | **NO** (and should not block root work)                                                                                                      |


**Honest:** freeze+guardian = necessary safety net for shortlist shape + some invent mute. **This scan’s P0/P1 failures are mostly outside that 3-file surface.**

---



## Cluster A — WRONG_PERSON/CASE (charge invent) · **P0**



### A1

1. **Case:** `14823d9e…` Leon Hale
2. **Surface:** Overview
3. **CB output:** `Fraud by false representation · Listing on papers · 22 May 2026 at 10:00`
4. **Source:** Papers live inventory header: `Murder, contrary to common law` (same capture `papers.txt`). Pixel PDF: `SOURCE_NOT_AVAILABLE` (murder bundle not in family-pdf `_extracts/`).
5. **Verdict:** `WRONG_PERSON/CASE`
6. **Suspected root:** Overview charge projection / demo adapter / client-update charge string not bound to Papers charge parse (`DemoOverviewView` / `demoOverviewAdapter` / matter charge field) — **not** `assembleSolicitorShortlist`
7. **Severity:** **P0**



### A2

1. **Case:** same Hale
2. **Surface:** Overview · Client Update
3. **CB output:** `We are reviewing the papers in your case (Fraud by false representation).`
4. **Source:** same as A1 — Papers = Murder
5. **Verdict:** `WRONG_PERSON/CASE`
6. **Suspected root:** same charge field bleed into client-safe summary
7. **Severity:** **P0**



### A3 (control — CORRECT on other surfaces)

1. **Case:** same Hale
2. **Surface:** Papers & Evidence
3. **CB output:** `Murder, contrary to common law`
4. **Source:** live Papers capture (bundle truth on that tab)
5. **Verdict:** `CORRECT` (Papers); proves Overview is the invent surface
6. **Suspected root:** n/a
7. **Severity:** n/a (control)

**Already covered by Codex 3-file patch?** **No.**

---



## Cluster B — UNSUPPORTED_PROMOTION / schedule priority drop · **P0**



### B1 Tobin — loud BWV/transcript missing from desk

1. **Case:** `a42cb20a…` Imani Tobin
2. **Surface:** Overview (+ CPS Chase match)
3. **CB output (desk):** `Subscriber / account data` · `Full custody record / PACE material` · `Medical / expert source report`
4. **Source (extract** `RP-03-TOBIN.full.txt`**):**
  - Page 4 schedule: `U1 BWV clip Outstanding` · `U3 Full interview transcript Outstanding`  
  - Page 19: `U1 Phone extraction report Listed - not served` · `U3 Full CCTV master Part copy only`  
  - Page 13 Digital note: `Subscriber and SIM evidence are not complete` (subscriber theme exists, but not louder than BWV/transcript/master)
5. **Verdict:** `UNSUPPORTED_PROMOTION` (custody/medical/subscriber elevated over schedule-loud BWV/transcript/CCTV master)
6. **Suspected root:** seed generators + ranking before `assembleSolicitorShortlist` (`pilot-workflow` / chase seeds / evidence-state map) — freeze only freezes wrong shortlist
7. **Severity:** **P0**



### B2 Davies — bank / CCTV continuity / analyst dropped

1. **Case:** `687cf5a6…` Layla Davies
2. **Surface:** Overview / CPS Chase
3. **CB output:** desk leads `Full phone download` / `Full custody record / PACE` / `Medical / expert` (from chase capture)
4. **Source (**`RP-15-DAVIES.full.txt` **page 7 / CB-TB-439 page 7):**
  `MG6/04 bank source statements Outstanding Not in papers supplied`  
   `MG6/05 CCTV continuity log Outstanding Awaiting export`  
   `MG6/06 analyst certificate Outstanding Awaiting export`  
   `MG6/01 custody record extract Served Contained in papers`
5. **Verdict:** `UNSUPPORTED_PROMOTION` (+ custody served-but-elevated)
6. **Suspected root:** POCA-blind seed priority; custody/medical templates
7. **Severity:** **P0**



### B3 Patel — CAD/999 + continuity over signed MG11 + transcript

1. **Case:** `ed3c9806…` Isaac Patel
2. **Surface:** Overview
3. **CB output:** `CCTV continuity / provenance` · `CCTV full window / master footage` · `CAD / dispatch / 999 material` · `Full custody record / PACE material`
4. **Source (**`ISAAC-PATEL-TB-546.full.txt` **~page 7 MG6):**
  `MG6/04 signed final MG11 outstanding`  
   `MG6/05 full CCTV master outstanding`  
   `MG6/07 full interview transcript outstanding`  
   — no MG6 row for 999; CAD not schedule-loud
5. **Verdict:** `UNSUPPORTED_PROMOTION` (CAD/999) + priority miss (signed MG11 / transcript off Overview desk)
6. **Suspected root:** CAD/999 template seed; continuity preferred over schedule item titles
7. **Severity:** **P0**



### B4 Hale — desk collapse drops murder media wall

1. **Case:** `14823d9e…` Leon Hale
2. **Surface:** Overview / CPS Chase
3. **CB output:** only `Interview recording` · `Final medical/forensic report` (TOTAL 2)
4. **Source (live Papers inventory):** `Master footage outstanding` · `BWV not served` · `Fingerprint report … outstanding` · `Final MG11 … outstanding` · `CAD log is outstanding`
5. **Verdict:** `UNSUPPORTED_PROMOTION` / desk drop
6. **Suspected root:** shortlist cap + soft medical/interview preference over index loudness
7. **Severity:** **P0**



### B5 Arden — Overview CORRECT primary (control)

1. **Case:** `99090c69…` Arden Vale
2. **Surface:** Overview
3. **CB output:** `CCTV continuity / provenance` · `CCTV full window / master footage` · charge `Robbery`
4. **Source (**`ARDEN-MONSTER-0001.full.txt` **page 8-ish):** `Outstanding / incomplete: … full CCTV master, continuity statement`
5. **Verdict:** `CORRECT` (Overview primary)
6. **Suspected root:** n/a
7. **Severity:** n/a

**Already covered by Codex 3-file patch?** **No** (freeze may shrink list; does not fix MG6-loud ranking).

---



## Cluster C — WRONG_STATUS · **P0**



### C1 Davies — bank statements Outstanding labelled Served on Papers

1. **Case:** `687cf5a6…` Layla Davies
2. **Surface:** Papers & Evidence
3. **CB output:** row material `MG6/04bank source statementsOutstandingNot in papers supplied` with STATUS `Served / on file`
4. **Source (**`RP-15-DAVIES.full.txt` **page 7):** `MG6/04 bank source statements Outstanding Not in papers supplied`
5. **Verdict:** `WRONG_STATUS`
6. **Suspected root:** Papers inventory status mapper / evidence-state align mis-binding schedule text to wrong status enum (`papers` inventory builder — **outside** guardian chase lint)
7. **Severity:** **P0**



### C2 Patel — CCTV master Outstanding → Referred only

1. **Case:** `ed3c9806…` Isaac Patel
2. **Surface:** Papers & Evidence
3. **CB output:** row about full CCTV master with STATUS `Referred only`
4. **Source (**`ISAAC-PATEL-TB-546.full.txt`**):** `MG6/05 full CCTV master outstanding requested / not attached`
5. **Verdict:** `WRONG_STATUS` (soften)
6. **Suspected root:** status soften path for media masters
7. **Severity:** **P1** (still dangerous; less than inventing Served)



### C3 Arden — 0 served while extract lists served extracts

1. **Case:** `99090c69…` Arden Vale
2. **Surface:** Papers & Evidence
3. **CB output:** `19 material row(s) · 0 served/on-file · 19 gap / partial / unclear`
4. **Source (**`ARDEN-MONSTER-0001.full.txt`**):** `Served according to MG6 extract: MG5 extract, MG6 extract, partial CCTV stills, one MG11`
5. **Verdict:** `WRONG_STATUS` (served→none)
6. **Suspected root:** monster-bundle inventory classifier treating noise/wrapper as gaps; TYPE/STATUS pipeline
7. **Severity:** **P0**

**Already covered by Codex 3-file patch?** **No.**

---



## Cluster D — sticky / mismatched court line · **P1** (P0 when wrong offence)



### D1 Tobin — custody court line while Subscriber selected

1. **Case:** `a42cb20a…` Tobin
2. **Surface:** Overview (Safe Court Line)
3. **CB output:** `The defence asks the court to record that custody/PACE and interview material need source-status confirmation before the hearing position is fixed.`
4. **Source:** selected issue = Subscriber; PDF does not mandate that exact court line — `SOURCE_NOT_AVAILABLE` for court-line template origin (product template)
5. **Verdict:** `WRONG_PROVENANCE` / sticky template (court line ≠ selected issue)
6. **Suspected root:** case-wide court line builder in `buildDisclosureChaseBrief` (court_line helpers) not rebinding to primary selection
7. **Severity:** **P1**



### D2 Patel — same custody sticky while CCTV selected

1. **Case:** `ed3c9806…` Patel
2. **Surface:** Overview Safe Court Line
3. **CB output:** identical custody/PACE+interview line as Tobin
4. **Source:** selected = CCTV continuity; MG6 loud = MG11/master/transcript
5. **Verdict:** `WRONG_PROVENANCE`
6. **Suspected root:** same sticky court-line template
7. **Severity:** **P1**



### D3 Hale — dishonesty/phone court line on Murder

1. **Case:** `14823d9e…` Hale
2. **Surface:** Overview Safe Court Line
3. **CB output:** `Account-control and dishonesty issues remain conditional on served phone/device material.`
4. **Source:** Papers = Murder; selected issue = Interview recording
5. **Verdict:** `WRONG_PERSON/CASE` + `WRONG_PROVENANCE`
6. **Suspected root:** fraud/phone court-line template bleed with Cluster A charge invent
7. **Severity:** **P0** (wrong offence language)

**Already covered by Codex 3-file patch?** **No** (chase-shaped lines exempted in guardian).

---



## Cluster E — WRONG_MODALITY / template bleed · **P1**



### E1 Tobin — Brookes-style screenshot subscriber wording

1. **Case:** Tobin
2. **Surface:** Overview / Chase
3. **CB output:** `Screenshots or partial extraction alone do not prove subscriber attribution.`
4. **Source (Page 13):** partial extraction / SIM incomplete — **no** “screenshots” language on that note
5. **Verdict:** `WRONG_MODALITY` / template bleed
6. **Suspected root:** digital-attribution copy pack shared across families
7. **Severity:** **P1**



### E2 Patel — CAD / 999 promotion

1. **Case:** Patel
2. **Surface:** Overview
3. **CB output:** `CAD / dispatch / 999 material` · `The papers identify a CAD/dispatch material gap…`
4. **Source:** MG6 has no 999 outstanding row; CAD is timing chatter not schedule gap
5. **Verdict:** `UNSUPPORTED_PROMOTION` + `WRONG_MODALITY`
6. **Suspected root:** CAD/999 seed template
7. **Severity:** **P1**



### E3 Papers TYPE column all MG6 (Tobin + Davies + Arden)

1. **Cases:** Tobin, Davies, Arden (and peers)
2. **Surface:** Papers & Evidence
3. **CB output:** almost every row `TYPE = MG6` including charge sheet, directions, noise wrappers, MG5, digital notes
4. **Source:** extract document types are mixed (MG5, MG6, MG11, digital note, etc.) — Arden page 8 distinguishes MG5/MG6/CCTV/MG11
5. **Verdict:** `WRONG_MODALITY` (typing) / `UI_WORDING_ONLY` only if treated as label — **operationally WRONG_PROVENANCE** for solicitor inventory
6. **Suspected root:** Papers inventory type classifier defaulting to MG6
7. **Severity:** **P1**

**Already covered by Codex 3-file patch?** **Partial** at best for affirmative modality invent; **not** for TYPE column or soft chase promotion.

---



## Cluster F — SIDE / noise inventory · **P2**



### F1 Arden Papers noise rows

1. **Case:** Arden
2. **Surface:** Papers
3. **CB output examples:** `Duplicated old summary wrapper…` · `This may assist the defence because: Missing source pages…` · `Safe move: chase missing material…` all typed MG6 Outstanding
4. **Source:** monster bundle includes deliberate noise pages (extract pages 1–12 narrative) — noise exists in PDF, but **promoting narrative into MATERIAL inventory rows** is product failure
5. **Verdict:** `UNSUPPORTED_PROMOTION` (noise→inventory)
6. **Suspected root:** inventory row extraction without KEEP filter
7. **Severity:** **P2** (Overview primary OK on this case)

**Already covered by Codex 3-file patch?** **Partial** — Overview/Chase SIDE muted; Papers not.

---



## Cluster G — UI_WORDING_ONLY · **P3**



### G1

- Chase typo `cCTV` seen on Patel/Arden chase drafts  
- **Verdict:** `UI_WORDING_ONLY` · **P3** · do not block root work

---



## Surfaces not deeply sampled this pass

Court Position, Client Summary (beyond Overview client-update snippet), File & Preparation — only lightly touched. **Do not claim green.** Trap / thin LIVE / Priya mismatch pack not in this 5.

---



## End totals (for Codex)


| Metric                  | Value                                                                             |
| ----------------------- | --------------------------------------------------------------------------------- |
| Cases scanned           | **5**                                                                             |
| Representative findings | **18** (clustered; many duplicates suppressed)                                    |
| **P0 clusters**         | **A** charge invent · **B** schedule priority drop · **C** wrong status on Papers |
| **P1 clusters**         | **D** sticky court line · **E** modality/template/TYPE bleed                      |
| **P2**                  | **F** SIDE noise inventory                                                        |
| **P3**                  | **G** typo                                                                        |




### Fix first

**Cluster A (charge invent on Overview) first** — solicitor-facing wrong offence is catastrophic and orthogonal to freeze.  
**Then Cluster C (Papers WRONG_STATUS)** — inventing Served on Outstanding bank statements.  
**Then Cluster B (MG6-loud ranking into shortlist)** — freeze made lists agree; lists still wrong homework.

### Are actual PDF page images needed before fixing?

**No — not for starting A/C/B.** Text extracts already carry page markers for Tobin/Davies/Patel/Arden. Hale murder pixel PDF would help Cluster A provenance polish but live Papers tab already proves Murder vs Overview Fraud.  
**Yes — later** if Codex wants courtroom-grade page screenshots for a customer evidence pack, or if a finding is marked `SOURCE_NOT_AVAILABLE` and contested.

### Do not

- Patch individual cases  
- Commit/merge/deploy/mark done from this report alone  
- Rewrite broad UI before root clusters A→C→B

