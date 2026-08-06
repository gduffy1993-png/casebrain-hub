# Phase 11 — human judgment form (readable)

**Pack:** `artifacts/casebrain-qa/integrity-programme/phase-11/reviewer-bundle/`  
**Freeze hash:** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`  
**Machine workbook:** `human-judgment-workbook.json` (keep in sync)  
**Blinded order:** follow `blinded-review-order.json`  
**Claim:** Not solicitor-validated until a qualified human completes identity/role/date and decisions below.

---

## Reviewer header (once per review session)

| Field | Value |
|-------|-------|
| Reviewer identity | |
| Role | |
| Review date (YYYY-MM-DD) | |
| Bundle freeze hash confirmed | Yes / No |
| Automated predictions consulted? | **No** (required for blinded review) |

**Session notes / disagreements / adjudications / exclusions:**

>

---

## Per-case section (copy for each of 33)

| Field | Value |
|-------|-------|
| Review sequence (from blinded order) | |
| Gold ID | GOLD-11-___ |
| Evidence read | `cases/GOLD-11-___/solicitor-visible-render.md` |
| Expected classification | accepted / blocked / review_required / uncertain / unsafe_if_copyable |
| Actual classification | accepted / blocked / review_required / uncertain / unsafe_if_copyable |
| False positive? | Yes / No |
| False negative? | Yes / No |
| Safety-relevant FN? | Yes / No / N/A |
| Substantive wording | acceptable / needs_edit / unsafe / blocked_not_repaired |
| Reviewer decision | pass / fail / needs_discussion / excluded |
| Unresolved? | Yes / No |

**Rationale (required):**

>

**Disagreement / adjudication note (if any):**

>

---

## Reminder

- Blocked ≠ repaired / ≠ substantively correct.  
- FP = over-block of safe wording. FN = under-block of unsafe wording.  
- Do not invent identity, legal judgment, or sign-off.  
- Any safety-relevant FN blocks programme PASS until repaired and independently re-reviewed.
