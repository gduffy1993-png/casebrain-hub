# Phase 11 gold review — instructions

**Status:** AWAITING_HUMAN_GOLD_REVIEW  
**Freeze hash:** `619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a`  
**Sample size:** 33  
**Who may sign off:** an independent qualified human / solicitor (or designated gold reviewer).  
**Who must not complete sign-off fields as independent review:** Cursor, another AI, or the developer alone.

## How to use this bundle

1. Open `blinded-review-order.json` and work **in that sequence** (not GOLD-11-001…033 order).
2. For each `goldId`, open `cases/<goldId>/solicitor-visible-render.md` (same content also under `renders/`).
3. Record judgments on the human-readable form (`HUMAN_JUDGMENT_FORM.md`) **and/or** in `human-judgment-workbook.json`.
4. Do **not** consult `automated-predictions.json` or any FP/FN hypothesis artefacts while judging.
5. Do **not** treat blocked / unavailable copy as repaired or substantively correct wording.

## Definitions

### Accepted
Solicitor-visible wording is appropriate to show/copy for the stated purpose, given the papers/context in the render. No integrity block is required for that line, and the wording is not misleading.

### Blocked
The system correctly withheld copy/export/API usability (banner / COPY UNAVAILABLE / integrity_blocked).  
**Blocked does not mean repaired.** Containment is not proof that underlying wording would be substantively correct if unblocked.

### Review-required
The solicitor is shown a neutral review-required message (or equivalent) instead of unsafe reconstructed content. Silent omission of substantive material is not acceptable.

### Uncertain
Family, hearing, provenance, or state cannot be safely resolved; presentation should remain fail-closed / provisional rather than over-definite.

### False positive (FP)
The system **over-blocked** or over-warned: safe, acceptable solicitor wording was treated as unusable / integrity-blocked when a qualified reviewer judges it should have been available (or was labelled more severely than warranted).

### False negative (FN)
The system **under-blocked**: unsafe, wrong-family, truncated, placeholder, provenance-unsafe, or otherwise unacceptable wording remained copyable/exportable/usable when it should have been blocked or marked review-required.  
**Any safety-relevant FN is a programme blocker** until repaired and independently re-reviewed.

### Substantive correctness
Word-for-word judgment of whether the solicitor-visible text is accurate, appropriately cautious, and usable. Separate from “was it blocked?”  
Blocked output may still fail substantive correctness if the underlying text would be wrong; it must not be scored as “correct” merely because the gate fired.

## Allowed classification labels

Use one of: `accepted` · `blocked` · `review_required` · `uncertain` · `unsafe_if_copyable`

## Reviewer fields to complete (per case)

- Reviewer identity  
- Reviewer role  
- Review date  
- Expected classification  
- Actual classification (what the render/gate shows)  
- False positive? (true/false)  
- False negative? (true/false)  
- Substantive wording judgment: `acceptable` · `needs_edit` · `unsafe` · `blocked_not_repaired`  
- Reviewer decision: `pass` · `fail` · `needs_discussion` · `excluded`  
- Rationale (short)  
- Disagreement / adjudication / exclusion notes if any  

## Completing the workbook

Leave unresolved cases with `unresolved: true` until judged.  
When finished, set roster fields in `human-judgment-workbook.json` (`completedBy`, `reviewDate`) and update status only after a real human review — never invent sign-off.

## Out of scope for this bundle

- Merging, deploying, or declaring programme PASS  
- Changing the frozen sample membership or freeze hash  
- Filling judgments with AI/developer impersonation of solicitor sign-off  
