# Waves A+B — Human feedback summary

**Date:** 2026-07-10  
**Branch:** `feature/gold-manual-proof-set-v1`  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Audience:** Ged / product — human-review gate  
**Scope:** Reporting / presentation review only. No Brain, chase core, export, Supabase, UI, or deploy changes.

---

## 1. Executive verdict

**Waves A+B: PASS**

| Gate | Status |
|------|--------|
| Human-style review (A+B) | **PASS** |
| Hard safety | **Clean** |
| Court / chase / do-not | **Pass** |
| Full pack provisional scores | **20 pass / 0 warn / 0 fail** |
| Real-world solicitor validation | **Not yet** — checklists unsigned |

Waves A+B are fit to proceed as a **supervised** review set on controlled fictional / PDF-backed bundles. This is **not** a claim of live-client accuracy or legal-advice replacement.

---

## 2. Reviewed cases

### Wave A
| Case | Family |
|------|--------|
| CASE-01 | phone harassment / attribution |
| CASE-02 | BWV referred-only |
| CASE-04 | CCTV stills vs master footage |
| CASE-06 | mixed-defendant material |

### Wave B
| Case | Family |
|------|--------|
| CASE-08 | charge mismatch |
| CASE-15 | motoring SJP / s172 thin evidence |
| CASE-20 | OCR/date/court mismatch |

**Seven cases** depth-reviewed against usefulness, safety, court wording, CPS chase, client summary, proof/source receipts, and supervised pre-court fit.

---

## 3. What passed

| Surface | Result |
|---------|--------|
| Hard safety (plea/outcome/advice patterns) | Clean across A+B |
| Court lines | On-family, hearing-safe, specific enough for supervised use |
| CPS chase | Family-specific; not generic MG6 clutter |
| Do-not-overstate (post-fix) | On-family; off-family Encro/CCTV clutter removed from Wave A |
| Supervised pre-court usefulness | Yes — usable as a first-pass review aid before opening the bundle |
| Full pack rollup | 20 pass · 0 warn · 0 fail |

**Standout exemplars:** CASE-08 (charge–MG5–listing alignment); Wave A phone/BWV/CCTV/co-def court–chase sets after polish.

---

## 4. Feedback found

### Wave A (polish, not hard fail)
1. CASE-04 showed off-family **Encro handle** in do-not sample.
2. CASE-02 showed off-family **CCTV proves** on a BWV matter.
3. Do-not family filtering needed to be stricter.
4. Soft chase notes: CASE-01 call logs; CASE-02 interview stack; CASE-04 bare “audit trail” label.
5. Source anchors needed an explicit “review aid, not sign-off” caveat.

### Wave B (WARN → fixed, then secondary-surface follow-up)
1. **CASE-15** — court/chase were later fixed to s172-led, but client summary / truth map still led device/intoxilyser/CCTV.
2. **CASE-20** — court/chase fixed to OCR/listing-led, but client summary / truth map / proof receipts still read CCTV-first; listing rows wrongly anchored to CCTV page snippets.
3. **CASE-08** — no material concern (PASS throughout).

### Re-review after secondary-surface polish
Waves A+B remained **PASS**; secondary drift on CASE-15/20 addressed for client/truth-map/proof honesty.

---

## 5. Fixes applied

Reporting / presentation only (`presentation-gates.ts`, pack builder, review docs, rebuilt artifacts).

| Fix | Effect |
|-----|--------|
| Stricter family do-not filters | No Encro on CASE-04; no CCTV do-not on CASE-02 |
| Wave A chase/court polish | Soft call logs dropped; BWV interview stack collapsed; CCTV audit trail named |
| CASE-15 family court/chase force | s172 notice · service · keeper/DVLA · nomination · SJP procedure |
| CASE-20 family court/chase force | Listing/hearing/OCR/date verification lead |
| CASE-15/20 secondary surfaces | Client summary + truth map lead family risk; device/CCTV demoted |
| Thin/mismatched proof anchors | Labelled `source verification required` instead of fake page strength |
| Source-anchor caveat in checklists/docs | Review aids, not solicitor sign-off |

Court/chase/do-not wording that already PASSed was kept stable through the secondary-surface pass.

---

## 6. Remaining caveats

1. **Not solicitor-validated** until per-case checklists are signed.
2. **Controlled fictional / PDF-backed only** — not live-client performance.
3. **Provisional PASS ≠ gold promotion.**
4. Remaining pack cases outside A+B have machine PASS but less human adversarial depth.
5. Some proof rows honestly say **source verification required** — still check the bundle.
6. v9 catalog cases (e.g. CASE-08) may lack page anchors / client summary depth.
7. No autonomous court/CPS sending; no legal-advice replacement.

---

## 7. Recommended next gate

**Either (preferred sequence):**

1. **Controlled solicitor pilot** on Waves A+B (seven cases) — supervised review aid only; complete checklists.  
2. **Then full 20-case** human review before any gold-promotion claim.

If bandwidth is limited, start the pilot on A+B now; do not skip checklist sign-off before claiming solicitor validation.

Related: `PILOT-READINESS-REPORT.md`, `GOLD-MANUAL-PROOF-SUMMARY.md`, `docs/gold-manual-proof-pack/human-solicitor-review-v1/`.

---

## 8. Claim discipline (mandatory)

| Claim | Allowed? |
|-------|----------|
| Controlled fictional / PDF-backed human review of Waves A+B | **Yes** |
| Supervised pre-court / fee-earner review aid | **Yes** |
| Waves A+B PASS after feedback + fixes | **Yes** (this report) |
| Full pack provisional 20/0/0 | **Yes** |
| Real-world solicitor-validated performance | **No** until checklists signed |
| Autonomous sending to court/CPS | **No** |
| Legal advice / plea / outcome replacement | **No** |

**One-line claim:**  
*Waves A+B of Gold Manual Proof Set v1 passed human-style review on controlled fictional/PDF-backed bundles after feedback polish — supervised review aid only; not solicitor-validated real-world performance until checklists are signed.*
