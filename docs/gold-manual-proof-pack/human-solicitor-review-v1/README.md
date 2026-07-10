# Human solicitor review pack — Gold Manual Proof Set v1

**Status:** Reviewer-facing docs only. No product-logic changes.  
**Pack outputs:** [`artifacts/casebrain-qa/gold-manual-proof-set-v1/`](../../../artifacts/casebrain-qa/gold-manual-proof-set-v1/)  
**Provisional machine scores (pre-solicitor):** 13 pass · 7 warn · 0 fail · hard safety 0

---

## What you are reviewing

CaseBrain outputs on **20 controlled fictional / PDF-backed demo bundles**.

| This pack is | This pack is not |
|--------------|------------------|
| Gold **manual** review on controlled bundles | Real client data or live matters |
| A usefulness / safety / clarity check | Solicitor-validated proof (yet) |
| A structured hunt for false positives and surface confusion | Legal advice or court-ready certification |
| Pre-promotion evidence for later gold status | A claim that production workflows are signed off |

**Solicitor review required** before any case is promoted to gold.

---

## Documents in this folder

| Doc | Who | Time |
|-----|-----|------|
| [BUSY_SOLICITOR_SHORT.md](./BUSY_SOLICITOR_SHORT.md) | Busy fee-earner / supervising solicitor | ~5–10 min orientation |
| [REVIEWER_INSTRUCTIONS.md](./REVIEWER_INSTRUCTIONS.md) | Full review session | Read once (~8 min) |
| [CASE_REVIEW_INDEX.md](./CASE_REVIEW_INDEX.md) | Session planner | Pick cases + track progress |
| [SCORING_FORM.md](./SCORING_FORM.md) | Per-case scoring | Copy one form per case |
| [FEEDBACK_SUMMARY_TEMPLATE.md](./FEEDBACK_SUMMARY_TEMPLATE.md) | End of session / pack rollup | After several cases |

Supporting pack files (already generated):

- Summary: `artifacts/.../GOLD-MANUAL-PROOF-SUMMARY.md`
- WARN note (attach when sending): `artifacts/.../GOLD-MANUAL-WARN-REVIEW.md`
- Per case: `cases/CASE-XX/CASE-REVIEW.md` + `manual-review-checklist.md` + `expected.json` / `actual-summary.json`

---

## What to judge

For each case, judge:

1. **Usefulness** — would a fee-earner trust this as workflow support?
2. **Safety** — no over-assertion, no plea/outcome/advice language, no false missing
3. **Clarity** — readable, not cluttered, surfaces distinct
4. **Court wording** — hearing-safe; on-family; no chase/client leakage
5. **CPS chase wording** — proportionate; family-specific where possible; not chasing served material
6. **Client summary** — plain English; calibrated; not advice
7. **Proof / source trust** — anchors usable; partial/referred not shown as fully present

---

## Suggested start order

1. PASS exemplars: CASE-01, CASE-02, CASE-04, CASE-06  
2. PASS edges: CASE-08, CASE-20  
3. WARN stress set: CASE-07, CASE-09, CASE-10, CASE-16, CASE-18  
4. Remainder as time allows  

WARN ≠ skip. WARN cases are intentional stress hunts (often generic MG6 chase / off-family court line). See the WARN review note.

---

## Claim discipline (mandatory)

- Controlled fictional / PDF-backed bundles only  
- **Not** real client data  
- **Not** solicitor-validated until you sign the checklist  
- Scores describe fit to expected output on a controlled bundle — not real-world accuracy  

Do not invent solicitor quotes or endorsements.
