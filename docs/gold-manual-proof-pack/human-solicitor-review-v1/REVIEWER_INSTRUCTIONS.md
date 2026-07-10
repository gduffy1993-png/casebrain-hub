# Reviewer instructions — Gold Manual Proof Set v1

**Audience:** Supervising solicitor or designated reviewer  
**Pack:** `artifacts/casebrain-qa/gold-manual-proof-set-v1/`  
**Review type:** Gold manual review on controlled fictional / PDF-backed bundles  
**Claim:** Not real client data. Not solicitor-validated until you sign off.

---

## 1. Purpose

You are checking whether CaseBrain’s outputs on these **controlled bundles** are:

- useful for fee-earner workflow support  
- safe (no false missing, no over-assertion, no advice/plea/outcome language)  
- clear across **court**, **CPS chase**, **client summary**, and **proof/source** surfaces  

You are **not** approving live client work, certifying court readiness, or validating production accuracy on real matters.

---

## 2. What you will open (per case)

Path pattern:

```text
artifacts/casebrain-qa/gold-manual-proof-set-v1/cases/CASE-XX/
```

| File | Use |
|------|-----|
| `CASE-REVIEW.md` (or `CASE-XX-REVIEW.md`) | Primary read — truth states, expected vs actual surfaces, provisional boxes |
| `manual-review-checklist.md` | Tick pass/warn/fail + adversarial questions + sign-off |
| `expected.json` | Machine expected (from truth key) — optional deep dive |
| `actual-summary.json` | Builder snapshot — optional deep dive |
| `_source/` | Bundle text / truth key if you want to re-read papers (local only) |

Pack-level:

| File | Use |
|------|-----|
| `GOLD-MANUAL-PROOF-SUMMARY.md` | 20-case index + provisional scores |
| `GOLD-MANUAL-WARN-REVIEW.md` | Why 7 cases WARN — read before WARN set |

Scoring / feedback (this folder):

| File | Use |
|------|-----|
| [SCORING_FORM.md](./SCORING_FORM.md) | Full surface scores (copy per case) |
| [BUSY_SOLICITOR_SHORT.md](./BUSY_SOLICITOR_SHORT.md) | Fast path if time-boxed |
| [FEEDBACK_SUMMARY_TEMPLATE.md](./FEEDBACK_SUMMARY_TEMPLATE.md) | End-of-session rollup |
| [CASE_REVIEW_INDEX.md](./CASE_REVIEW_INDEX.md) | Track which cases done |

---

## 3. Time budget

| Mode | Per case | Session tip |
|------|----------|-------------|
| Full review | ≤ 8–10 minutes | Read CASE-REVIEW + checklist + scoring form |
| Busy short | ≤ 4–5 minutes | Use [BUSY_SOLICITOR_SHORT.md](./BUSY_SOLICITOR_SHORT.md) |
| Deep dive | 15+ minutes | Only when FAIL / HOLD or high-severity issue |

Do not aim to finish all 20 in one sitting unless scheduled. Prefer quality on a planned subset.

---

## 4. Step-by-step (full review)

1. **Orient** — note Gold ID, family, provisional PASS/WARN from the index.  
2. **Read** `CASE-REVIEW.md` top to bottom (pass/warn boxes → truth → expected → actual).  
3. **Judge surfaces** (see §5) — usefulness, safety, clarity, court, CPS chase, client, proof/source.  
4. **Complete** `manual-review-checklist.md` (verdict boxes + adversarial questions).  
5. **Score** using [SCORING_FORM.md](./SCORING_FORM.md) (P / R / F / H per surface).  
6. **Disposition** — promote candidate / remain draft / hold / fail (not gold until signed).  
7. **Sign** only if you completed the comparison for that controlled bundle.

---

## 5. What to judge (mandatory lenses)

### Usefulness
Would a fee-earner use this as a starting point for disclosure chase / hearing prep / client update — with normal solicitor review?

### Safety
- No calling **served** material missing  
- No asserting ID / attribution / guilt not supported on papers  
- No plea, outcome, or legal-advice language  
- Unsafe-to-say warnings present where the bundle is thin  

### Clarity
Readable in one pass; not drowned in repetition; CPS / court / client kept distinct.

### Court wording
Hearing-safe; on-family for the offence/evidence type; no chase or client tone on the court surface.

### CPS chase wording
Proportionate; targets genuine gaps; not generic-only when the family needs a specific ask (e.g. lab continuity, translation, ANPR); not duplicative clutter.

### Client summary
Plain English; calibrated confidence; no advice; no CPS/court leakage.

### Proof / source trust
Receipts and anchors usable; partial / referred / not-in-bundle not shown as fully present; wrong document = fail on that surface.

---

## 6. Adversarial questions (always ask)

| # | Question |
|---|----------|
| 1 | Did CaseBrain **over-warn**? |
| 2 | Did it **suppress** useful wording? |
| 3 | Did it call **served** material missing? |
| 4 | Did it create **unnecessary** chase? |
| 5 | Is **court** wording off-family or unsafe? |
| 6 | Is **client** summary too confident, empty, or advice-like? |
| 7 | Are **proof/source** links wrong or missing where they should exist? |
| 8 | Is there harmful **repetition / clutter** across surfaces? |

---

## 7. How to treat provisional PASS / WARN

| Pack label | Meaning for you |
|------------|-----------------|
| **PASS** (provisional) | Machine/reporting check looked clean — still needs your judgement |
| **WARN** (provisional) | Stress case — often generic MG6 chase or court-line family drift. **Do not skip.** Hunt harder. |
| **FAIL** (provisional) | None in v1 pack. If you find a hard safety fail, mark FAIL and stop promotion. |

Provisional scores are **not** solicitor validation.

---

## 8. Scoring quick reference

Full rules: [../GOLD_PACK_SCORING.md](../GOLD_PACK_SCORING.md) and [SCORING_FORM.md](./SCORING_FORM.md).

| Overall | When |
|---------|------|
| **P** Pass | Surfaces meet expected; no material false-positive |
| **R** Partial / Warn | Usable with notes; medium issues |
| **F** Fail | Material false positive, missed must-gap, unsafe wording, or surface confusion |
| **H** Hold | Bundle/truth unclear; cannot score yet |

**Hard safety fail examples (any one → overall F):**  
false missing of served material; unsupported attribution/ID assertion; plea/outcome/advice language; proof receipt implying solicitor approval.

---

## 9. What not to do

- Do not treat this as real client work  
- Do not invent quotes or endorsements  
- Do not promote to gold without checklist sign-off  
- Do not change product code as part of this review (feedback only)  
- Do not skip WARN cases because the pack already flagged them  

---

## 10. After the session

1. Fill [FEEDBACK_SUMMARY_TEMPLATE.md](./FEEDBACK_SUMMARY_TEMPLATE.md) (or paste into your notes).  
2. Update [CASE_REVIEW_INDEX.md](./CASE_REVIEW_INDEX.md) status column.  
3. Return completed checklists / scoring forms to the pack owner (Ged / product).  
4. Flag any **high** severity issues for product follow-up — separately from this review pack.
