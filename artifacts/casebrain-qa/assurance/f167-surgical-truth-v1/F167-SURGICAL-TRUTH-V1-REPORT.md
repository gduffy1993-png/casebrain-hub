# F167 SURGICAL TRUTH V1 — REPORT

**Date:** 2026-08-20  
**Worktree:** `C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Known matter:** Arden Vale — Robbery · `99090c69-5d78-41e3-946d-119b4bc335ba`

---

## Final verdict (exactly one)

# `F167_SURGICAL_TRUTH_PASS`

F167 richness (identification route, CCTV master/continuity chase, MG6-on-file guardrail, provisional court desk) remains intact. Confirmed factual promotions (phone download from stolen-phone property, interview recording from interview summary, CAD/999 and export-log clauses without source, MG6 unused without unused/MG6C) were corrected at general root transitions with opposite-direction tests. Authenticated AFTER Preview on SHA `02d912547…` confirms the material solicitor-visible corrections. Protected recovery branch / PR #69 untouched.

---

## 1. Exact starting SHA

| Field | Value |
|-------|--------|
| Full SHA | `f167c58762c8931aa29bbc3e0ebe3b576372fe55` |
| Short | `f167c5876` |
| Subject | `fix(ui): harden live case evidence wording invariants` |
| Confirmed before work | Yes (`git rev-parse` on fresh worktree) |

`move_agent_to_root` unavailable to subagent; work executed via absolute surgical worktree path (same pattern as F167 recovery report).

---

## 2. Final SHA

| Field | Value |
|-------|--------|
| Full SHA (branch tip) | `81ebb418549f7b23b14a69d589d8e3a81fd187c9` |
| Tip subject | `docs(assurance): record final tip SHA in F167 surgical truth report` |
| Product-fix tip (authenticated Preview) | `02d9125473f2413d7079b41b9e0ec596598e4682` |

Commits on branch (from `f167c5876`):

1. `70314a041` — stop property-phone / bare MG6 inventing phone download  
2. `55038a3aa` — source-gate robbery CAD/999 and CCTV export-log clauses  
3. `c400b76ba` — separate interview summary from recording/transcript chase  
4. `02d912547` — opposite-direction surgical factual contracts  
5. `309d4aad0` — assurance report + Arden BEFORE/AFTER captures  
6. `81ebb4185` — report tip SHA sync  

---

## 3. Preview URL

| Check | Result |
|-------|--------|
| Vercel project | **casebrain-hub** (`prj_pwA6ielvQP8lwu7SdqMO0vNU9KsC`) |
| Git-linked Preview (SHA `02d912547…`) | https://casebrain-hoygbj0r9-gduffy1993-pngs-projects.vercel.app |
| CLI upload Preview (same worktree) | https://casebrain-16o8w1rlp-gduffy1993-pngs-projects.vercel.app |
| Production promote | **Not done** |
| PR merge | **Not done** (branch pushed only) |

Prefer the **git-linked** URL for SHA certainty.

---

## 4. Source PDF used

| Field | Value |
|-------|--------|
| Pack | Monster Bundle Load Pack |
| Filename | `CB-MONSTER-2026-0001.pdf` |
| Bytes | `400768` (matches live storage object for this case) |
| Physical path | `C:\Users\gduff\Downloads\CaseBrain_Monster_and_Charge_Coverage_2026\casebrain_monster_charge\Monster_Bundle_Load_Pack\pdfs\CB-MONSTER-2026-0001.pdf` |
| Worktree copy | `artifacts/.../f167-surgical-truth-v1/_source/CB-MONSTER-2026-0001.pdf` |
| Extract | `artifacts/.../_source/arden-full-extract.txt` (300 pages, selectable text via PyMuPDF) |
| Gold answers | Present as **reference only** (`CB-MONSTER-2026-0001-GOLD-REF-ONLY.txt`) — **not** used as source truth |

---

## 5. Arden source-ground-truth summary

**Established on papers**

- Defendant: Arden Vale; Offence: Robbery; Stage: PTPH  
- Allegation: On 02/06/2026 at Station Lane, stolen phone from Marlow Reed with force immediately before  
- MG6 disclosure position (p8): **Served:** MG5 extract, MG6 extract, partial CCTV stills, one MG11 extract, custody/interview summary  
- **Outstanding/incomplete:** full bundle pages 88–94 and 201–206, **full CCTV master**, **continuity statement**, **complete signed MG11**  
- Interview account (p10): No comment after limited disclosure; identification and force disputed  
- Exhibits: EX-MON-MG5-01; EX-MON-MG6-01; EX-MON-INT-01; EX-MON-CCTV-01; EX-MON-MG11-01  
- File chaos: long-bundle-load; partial extract only; duplicate MG5 pages  

**Not established (term scan of full PDF)**

- CAD / 999 / audio / control-room: **0 hits**  
- Export log / phone download / subscriber / MG6C / unused schedule / interview transcript / interview recording as outstanding modalities: **not present**  
- “Phone” appears as **property of the offence**, not digital extraction evidence  

---

## 6. Every audited material claim

| SURFACE | CLAIM | SOURCE | RESULT |
|---------|-------|--------|--------|
| Overview | Arden Vale / Robbery | p1–p2 | CORRECT |
| Overview | 2 served · 2 missing · 5 incomplete | projection counts (different scope) | PRESENTATION_ONLY / not forced equal |
| Overview BEFORE | CCTV outstanding | stills served; master outstanding | SUPPORTED_BUT_OVERSTATED → AFTER clearer “CCTV master outstanding” |
| Overview BEFORE | Interview recording outstanding | summary served; recording not outstanding | WRONG_MODALITY → **fixed** |
| Overview BEFORE | Phone download / source export referred to… | stolen phone only | UNSUPPORTED → **fixed** |
| Overview | MG6 disclosure schedule appears on file | MG6 extract p8 | CORRECT |
| Overview | No support for phone extraction/metadata (guardrail) | consistent with source | CORRECT (was contradictory with gap line) |
| Court | Primary route: Identification / participation / attribution | ID disputed p10 | CORRECT (preserved) |
| Court BEFORE | Safe court line includes 999/CAD timing | no CAD/999 in PDF | UNSUPPORTED → **fixed** |
| Court BEFORE | Chase full CCTV master/**export log**/continuity | master+continuity yes; export log no | WRONG_MODALITY → **fixed** (export log dropped) |
| Court | Chase ID procedure + complainant first account | ID live; signed MG11 outstanding | ADVISORY / SUPPORTED (kept) |
| Chase BEFORE | Interview recording / transcript | summary ≠ recording | WRONG_MODALITY → **fixed** (removed) |
| Chase BEFORE | MG6 / unused schedule clarification | MG6 extract, no unused/MG6C | WRONG_STATE → **fixed** (removed) |
| Chase | CCTV continuity / master | source outstanding list | CORRECT (kept) |
| Chase | Exhibit mapping / provenance | exhibits listed; chaos notes | AMBIGUOUS_SOURCE / kept as cautious chase |
| Counts | Overview chase vs Court (5) vs CPS total (was 6, now 4) | different populations | Do **not** force equal |
| Readiness | Generic “such as … CAD …” example list | boilerplate families | PRESENTATION_ONLY — not treated as Arden CAD fact |
| Readiness WHY | “… master footage / export log outstanding” | residual template coupling | REMAINING — see §14 |

---

## 7. Confirmed defects

1. Digital-polish hay treated property-of-theft “phone” as digital disclosure → MG6 unused rewritten to phone download on Overview.  
2. Phone chase-gate `\bphone\b` fired on stolen-phone allegation.  
3. Robbery court-line template hard-included 999/CAD without source gate.  
4. CCTV “export log” bundled into master/continuity actions without source.  
5. Interview family / humanize promoted “interview summary” → “Interview recording outstanding”.  
6. MG6 unused family matched bare MG6 extract.

---

## 8. Root cause for each defect

| Defect | First wrong transition |
|--------|------------------------|
| Phone download on Overview | `isDigitalDisclosureHay` too broad → `polishPresentationLine` MG6→phone rewrite; phone `familySupport` bare `\bphone\b` |
| 999/CAD in court line | `workflowSafeCourtLine` / case-wide robbery phrase bypassed `PROFILE_SOURCE_SUPPORT_RULES` |
| Export log chase/action | Robbery pack glued export log into CCTV continuity/master lines |
| Interview recording | Chase family match + `humanizeEvidenceLabel` collapsed interview→recording |
| MG6 unused | Chase family / gate treated MG6 extract as unused schedule |

---

## 9. Files changed

- `lib/criminal/demo-presentation-polish.ts`  
- `lib/criminal/chase-source-gate.ts`  
- `lib/criminal/pilot-workflow.ts`  
- `components/criminal/five-answers/evidence-display.ts`  
- `components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts`  
- `scripts/f167-surgical-truth-opposite-direction.test.ts` (new)

No Arden caseId / defendant / offence hardcodes.

---

## 10. Tests added

- `scripts/f167-surgical-truth-opposite-direction.test.ts`  
- Also re-ran: `pilot-workflow-profile.test.ts`, `live-ui-wording-regression.test.ts` — PASS  

---

## 11. Opposite-direction tests

| Suppression | Opposite retain |
|-------------|-----------------|
| No CAD/999 in Arden court line | Court line keeps 999/CAD when CAD/999 audio text present |
| No phone download from stolen phone | Digital harassment hay still rewrites MG6 umbrella to phone download |
| Interview summary ≠ recording | Recording/transcript text → interview family mentioned + recording outstanding label |
| No export-log action without source | Explicit “CCTV export log outstanding” retains export-log action |
| No MG6 unused from MG6 extract | MG6C unused wording → `mg6_unused` mentioned |

---

## 12. BEFORE/AFTER screenshots

**BEFORE** (f167 recovery Preview, SHA `f167c5876…`):  
`artifacts/casebrain-qa/assurance/f167-surgical-truth-v1/before/screenshots/before/`

**AFTER** (surgical Preview, SHA `02d912547…`):  
`artifacts/casebrain-qa/assurance/f167-surgical-truth-v1/after/screenshots/after/`

Text dumps: `before/*.txt`, `after/*.txt`.

### Material BEFORE → AFTER

| Item | BEFORE | AFTER |
|------|--------|-------|
| Overview phone download gap | Present | **Absent** |
| Overview interview recording gap | Present | **Absent** |
| Overview CCTV | “CCTV outstanding” | “CCTV outstanding” + “CCTV master outstanding” |
| Court line 999/CAD | Present | **Absent** |
| Next action export log | Present | **Absent** (“Chase full CCTV master and continuity.”) |
| Chase interview recording | Present | **Absent** |
| Chase MG6 unused | Present | **Absent** |
| Chase CCTV continuity/master | Present | **Present** |
| Primary ID route | Present | **Present** |
| CPS Chase TOTAL | 6 | 4 (false items removed) |

---

## 13. Behaviour deliberately preserved

- Identification / participation / attribution primary route  
- CCTV master + continuity disclosure pressure  
- MG6-on-file wording guardrail  
- Provisional / solicitor-review posture  
- Complainant / signed MG11 chase importance (source-backed outstanding)  
- Client summary / court desk richness (not replaced with generic warnings)  
- Evidence state counters **not** force-equalised across surfaces  

---

## 14. Remaining uncertainties

- Readiness “WHY” line can still couple “export log” into CCTV stills/master wording via a separate readiness/explanation path — not rewritten in this pass to avoid broader readiness refactor.  
- Generic readiness sentence listing example families (“such as … CAD …”) is boilerplate, not an Arden CAD assertion.  
- Exhibit-mapping chase retained as cautious; provenance page-level certainty limited by monster-bundle chaos design.  
- Court “Source-material chase (5 items)” vs CPS TOTAL 4 — intentional different scopes.  

---

## 15. Anything deliberately NOT changed

- No LI recovery architecture import / Overview rebuild  
- No Chase UI redesign / global certainty lowering  
- No Arden hardcoding  
- No wholesale canonical rewrite / giant corpus / holdout  
- No muting of identification legal reasoning  
- Protected `recovery/pre-assurance-good-f167c5876` and PR #69 **not** modified/merged  

---

## 16. Merge recommendation

**Recommend draft PR review of `fix/f167-surgical-truth-v1` against f167 baseline** — do **not** auto-merge. Human should spot-check Arden Overview/Court/Chase AFTER screenshots and one opposite digital-harassment matter if available. Do not merge into the protected recovery branch tip; keep recovery SHA pristine.

---

## Defect table

| DEFECT | OLD F167 BEHAVIOUR | SOURCE TRUTH | ROOT CAUSE | NEW BEHAVIOUR | REGRESSION PROOF |
|--------|-------------------|--------------|------------|---------------|------------------|
| Phone download gap | Overview: phone download / source export outstanding | Stolen phone only; no download/export | Digital hay + phone gate on bare `phone` | Gap removed; guardrail consistent | Opposite: digital hay still rewrites MG6→phone |
| Interview recording | Overview + Chase: recording/transcript outstanding | Custody/interview **summary** served | Interview family/humanize collapse | Recording chase/label suppressed | Opposite: recording text keeps recording outstanding |
| CAD/999 court line | Court line conditional on 999/CAD | No CAD/999 in PDF | Robbery court template ungated | Court line omits CAD/999 | Opposite: CAD/999 text restores clause |
| Export log | Actions/asks glued to CCTV master | Continuity+master yes; export log no | Pack line bundled modalities | Separate gated export-log item | Opposite: export log text restores chase |
| MG6 unused | Chase MG6/unused clarification | MG6 extract; no unused/MG6C | Family match on bare MG6 | Unused chase removed | Opposite: MG6C unused → mentioned |

---

## Topology checks

| Check | Result |
|-------|--------|
| Surgical worktree HEAD start | Exact `f167c5876…` |
| Protected recovery worktree | Still `f167c5876…` (untouched by this pass’s product commits) |
| PR #69 | Not merged |
| Existing branches | Not deleted/reset |
