# Gold Manual Proof Set v1 — Pilot readiness report

**Date:** 2026-07-10  
**Branch:** `feature/gold-manual-proof-set-v1`  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Audience:** Ged / product — pilot go/no-go  
**Scope:** Reporting / presentation review only. No Brain, chase core, export, Supabase, UI, or deploy changes in this readiness path.

---

## 1. Executive verdict

**Ready for a controlled solicitor pilot: YES (provisional).**

| Gate | Status |
|------|--------|
| Pack provisional scores | **20 pass / 0 warn / 0 fail** |
| Hard safety | **0** |
| Wave A human-style review | **PASS** |
| Wave B re-review (after fixes) | **PASS** |
| Real-world solicitor validation | **Not yet** — checklists unsigned |

The pack is fit to start a **supervised** solicitor pilot on controlled fictional / PDF-backed bundles. It is **not** a claim of live-client accuracy, autonomous sending readiness, or legal-advice replacement.

---

## 2. What was tested

### Pack breadth
- **20** gold manual cases (`CASE-01` … `CASE-20`) mapped to controlled demo-audit families
- Surfaces reviewed per packet: truth states, court line, CPS chase, do-not-overstate, client summary (where present), proof/source anchors, hard-safety scan
- Human review docs: `docs/gold-manual-proof-pack/human-solicitor-review-v1/`

### Wave A (depth review)
| Case | Family |
|------|--------|
| CASE-01 | phone harassment / attribution |
| CASE-02 | BWV referred-only |
| CASE-04 | CCTV stills vs master footage |
| CASE-06 | mixed-defendant material |

Focus: court-line specificity, chase necessity, off-family do-not samples, source-anchor discipline, supervised pre-court usefulness.

### Wave B (depth review + re-review)
| Case | Family |
|------|--------|
| CASE-08 | charge mismatch |
| CASE-15 | motoring SJP / s172 thin evidence |
| CASE-20 | OCR/date/court mismatch |

Focus: charge/date/court mismatch safety, family-risk surfacing, generic chase, overstatement vs over-caution.

---

## 3. What passed

| Area | Result |
|------|--------|
| Full pack provisional scoring | 20 pass · 0 warn · 0 fail |
| Hard safety (plea/outcome/advice patterns) | 0 failures |
| Wave A | **PASS** — court/chase on-family; usable as supervised pre-court aid |
| Wave B (post-fix) | **PASS** — CASE-08 charge mismatch clean; CASE-15 s172-led; CASE-20 OCR/listing-led |
| Family presentation gates | Court/chase/do-not filters keep packets on-family for reviewed waves |
| Claim banners / readiness docs | Aligned: ready YES, not solicitor-validated until signed |

Wave A exemplars (court/chase): phone attribution, BWV/custody, CCTV stills/master, co-defendant segregation.  
Wave B exemplars: charge–MG5–listing alignment; s172 notice/keeper/service/nomination; OCR listing/date confirmation.

---

## 4. What reviewer concerns were found

### Wave A (polish, not hard fail)
1. CASE-04 showed off-family **Encro handle** in do-not-overstate sample.
2. CASE-02 showed off-family **CCTV proves** do-not sample on a BWV matter.
3. Do-not-overstate family filtering needed to be stricter.
4. Source/page anchors needed an explicit caveat: review aids, not solicitor sign-off.
5. Soft chase polish: CASE-01 call logs; CASE-02 interview stack length; CASE-04 bare “audit trail” label.

### Wave B (WARN → fixed)
1. **CASE-15** — usable but too device/intoxilyser/CCTV-centred for an s172 pack; garbled CCTV-stills do-not clutter.
2. **CASE-20** — labelled OCR/date/court mismatch but court/chase read like another CCTV case (CASE-04 shape); listing/OCR risk under-surfaced.
3. **CASE-08** — no material concern (PASS throughout).

---

## 5. What was fixed

Reporting / presentation only (`presentation-gates.ts`, pack builder, review docs, rebuilt artifacts).

| Fix | Effect |
|-----|--------|
| Stricter family do-not-overstate filters | No Encro on CASE-04; no CCTV do-not on CASE-02; Wave A off-family samples cleared |
| Source-anchor caveat in checklists / review docs | “Page/source anchors are review aids, not solicitor sign-off” |
| Wave A chase/court polish | Drop soft call logs; collapse BWV interview stack; name CCTV audit trail; preserve source metadata after remap |
| CASE-15 family court/chase force | s172 notice · service · keeper/DVLA · nomination · SJP procedure; demote intoxilyser/calibration lead; drop CCTV-stills do-not |
| CASE-20 family court/chase force | Listing/hearing/OCR/date verification lead; CCTV not the lead; OCR listing-date do-not instead of stills ID stock |
| Pack rebuild + clean-review zip | Fresh review artifacts for Downloads / Documents\\Codex |

Key commits on this path include Wave A do-not/chase polish and Wave B S172/OCR presentation fixes (see branch log on `feature/gold-manual-proof-set-v1`).

---

## 6. Remaining caveats

1. **Not solicitor-validated** until per-case `manual-review-checklist.md` is signed.
2. **Controlled fictional / PDF-backed bundles only** — not a live-client performance claim.
3. **Provisional PASS ≠ gold promotion** — promotion still requires solicitor/Ged sign-off.
4. **Secondary surfaces may still show bundle-native detail** (e.g. CASE-15/20 truth-map or client summary mentioning device/CCTV) while court/chase/do-not correctly lead the family risk.
5. **v9 catalog cases** may lack page anchors (flagged N/A) — confirm against bundle text in review.
6. **Source anchors** remain review aids; some chase rows may need source verification.
7. Wave A/B were depth-reviewed; remaining cases (`CASE-03`, `05`, `07`, `09`–`14`, `16`–`19`) have provisional machine PASS but less human adversarial depth than Waves A/B.

---

## 7. Recommended next step

**Proceed to a controlled solicitor pilot**, with this order:

1. **Pilot start set:** Wave A (`CASE-01`, `02`, `04`, `06`) + Wave B (`CASE-08`, `15`, `20`) — already human-reviewed PASS.
2. **Pilot mode:** supervised pre-court review aid only; solicitor completes checklist; no autonomous CPS/court sending.
3. **Then:** full **20-case** solicitor pass (or staged remainder) before any gold-promotion claim.
4. **Hold:** live-client validation, product-core changes, and any “solicitor-validated” marketing language until checklists are signed.

Optional parallel: keep using the clean-review zip + `docs/gold-manual-proof-pack/human-solicitor-review-v1/` as the reviewer entry point.

---

## 8. Claim discipline (mandatory)

| Claim | Allowed? |
|-------|----------|
| Controlled fictional / PDF-backed gold manual review | **Yes** |
| Supervised pre-court / fee-earner review aid | **Yes** |
| Provisional pack ready for human solicitor pilot | **Yes** (this report) |
| Real-world solicitor-validated performance | **No** until checklists signed |
| Autonomous sending to court/CPS | **No** |
| Legal advice / plea / outcome replacement | **No** |
| Live-client accuracy guarantee | **No** |

**One-line claim for pilot materials:**  
*Gold Manual Proof Set v1 is a supervised review aid on controlled fictional/PDF-backed bundles — provisional pack PASS after Wave A/B review; not solicitor-validated real-world performance until checklists are signed.*

---

## Related artifacts

- `GOLD-MANUAL-PROOF-SUMMARY.md`
- `INTERNAL-GOLD-QA-REPORT.md`
- `GOLD-MANUAL-WARN-REVIEW.md`
- `HUMAN-SOLICITOR-REVIEW.md`
- `gold-manual-proof-set-v1-review-pack.zip`
- `docs/gold-manual-proof-pack/human-solicitor-review-v1/`
