# False-Positive Review Form — Template

**Case ID:** `gm-XXX-short-label`  
**Run date:** YYYY-MM-DD  
**CaseBrain version / build:** (record if known — optional)  
**Review type:** gold manual review comparison — solicitor review required.

Complete this form when comparing **actual CaseBrain output** against the **expected output** from a controlled bundle read. This is a quality review aid, not a claim of real-world accuracy or production sign-off.

---

## Reviewer

| Field | Value |
|-------|-------|
| Reviewer role | e.g. supervising solicitor, shadow reviewer |
| Review date | YYYY-MM-DD |
| Bundle re-read? | Yes / No |
| Prior gold status | draft / gold / hold |

---

## 1. Overall impression

| Question | Response |
|----------|----------|
| Would a fee-earner trust this output for workflow support? | Yes / Partial / No |
| Safe to use with standard solicitor review? | Yes / With edits / No |
| Suitable for demo after fixes? | Yes / Not yet / N/A |

**One-paragraph summary (reviewer's words — do not invent quotes from others):**

---

## 2. False-positive checklist

For each item: **Y** = problem observed, **N** = not observed, **N/A** = not applicable to this case.

| # | Check | Y / N / N/A | Severity (H/M/L) | Example (paraphrase — no real client data) | Expected instead |
|---|-------|-------------|------------------|---------------------------------------------|------------------|
| 1 | **Did CaseBrain over-warn?** — flagged unsafe/provisional where bundle clearly supports the point | | | | |
| 2 | **Did CaseBrain suppress useful wording?** — hedged so much the line lost practical value | | | | |
| 3 | **Did CaseBrain call served material missing?** — chased or flagged gap for material in bundle | | | | |
| 4 | **Did CaseBrain create unnecessary chase?** — duplicate, premature, or immaterial CPS requests | | | | |
| 5 | **Did CaseBrain use wording too cautiously?** — technically safe but misleadingly weak for workflow | | | | |
| 6 | **Did CaseBrain fail to surface a useful point?** — missed gap, partial flag, or chase worth raising | | | | |
| 7 | **Did CaseBrain repeat itself too much?** — same gap or warning on multiple surfaces without purpose | | | | |
| 8 | **Did CaseBrain confuse CPS / court / client surfaces?** — wrong tone, wrong audience, or mixed phrasing | | | | |

---

## 3. Surface-by-surface review

### 3.1 Missing material

| Issue type | Observed? | Detail | Expected |
|------------|-----------|--------|----------|
| False missing (served material) | | | |
| Missed gap | | | |
| Wrong priority | | | |
| Referred-absent vs not-in-bundle confused | | | |

### 3.2 Unsafe-to-say warnings

| Issue type | Observed? | Detail | Expected |
|------------|-----------|--------|----------|
| Missing warning | | | |
| Excessive warning | | | |
| Warning on wrong topic | | | |

### 3.3 Court line

| Issue type | Observed? | Detail | Expected |
|------------|-----------|--------|----------|
| Over-confident assertion | | | |
| Chase language on court surface | | | |
| Missed hearing-relevant point | | | |
| Client-only phrasing | | | |

### 3.4 CPS chase

| Issue type | Observed? | Detail | Expected |
|------------|-----------|--------|----------|
| Unnecessary chase item | | | |
| Missing chase item | | | |
| Duplicate phrasing | | | |
| Wrong grounds stated | | | |

### 3.5 Client summary

| Issue type | Observed? | Detail | Expected |
|------------|-----------|--------|----------|
| Too technical | | | |
| Too confident | | | |
| Too cautious / empty | | | |
| CPS/court phrasing leaked in | | | |

### 3.6 Proof receipt

| Issue type | Observed? | Detail | Expected |
|------------|-----------|--------|----------|
| Missing source link | | | |
| Wrong page / document | | | |
| Partial shown as present | | | |
| Receipt implies approval | | | |

---

## 4. Source / linkage errors

| Output line (paraphrase) | Linked source shown | Correct source | Page correct? |
|--------------------------|---------------------|----------------|-----------------|
| | | | Y / N |

---

## 5. Layout / bundle-defect handling

For cases tagged with OCR, redaction, or index mismatch coverage:

| Defect type | Bundle has defect? | CaseBrain handled correctly? | Notes |
|-------------|---------------------|------------------------------|-------|
| OCR / garbled text | | | |
| Rotated / reordered pages | | | |
| Redaction hides key field | | | |
| Index / exhibit mismatch | | | |
| Date / court / charge drift | | | |

---

## 6. Issue register

| Issue ID | Category | Severity | Description | Suggested fix direction | Block gold? |
|----------|----------|----------|-------------|-------------------------|-------------|
| FP-001 | over-warn | | | | Y / N |

**Categories:** over-warn, suppress, false-missing, unnecessary-chase, too-cautious, missed-point, repetition, surface-confusion, source-error, other

---

## 7. Scoring outcome

Transfer scores to [GOLD_PACK_SCORING.md](./GOLD_PACK_SCORING.md).

| Surface | Score (pass/partial/fail) | Driven by issues |
|---------|---------------------------|------------------|
| Missing material | | |
| Unsafe-to-say | | |
| Court line | | |
| CPS chase | | |
| Client summary | | |
| Proof receipt | | |
| Source linkage | | |
| Surface discipline | | |
| **Overall** | | |

---

## 8. Disposition

| Disposition | Selected |
|-------------|----------|
| Promote to gold | |
| Remain draft | |
| Hold — bundle issue | |
| Hold — product issue | |
| Retire case | |

**Rationale:**

---

## 9. Sign-off block

| Field | Value |
|-------|-------|
| Solicitor review completed for this comparison | Yes / No |
| Date | |
| Role | |
| Note | Factual review of controlled bundle comparison only |

**Do not:**

- Invent solicitor quotes or third-party endorsements
- State that production matters were reviewed
- Claim real-world accuracy or court-ready certification

---

## 10. Follow-up actions

| Action | Owner role | Target date | Done |
|--------|------------|-------------|------|
| | | | [ ] |
| | | | [ ] |
