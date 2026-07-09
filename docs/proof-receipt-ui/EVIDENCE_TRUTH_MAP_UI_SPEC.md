# Evidence Truth Map — Upgraded UI Specification

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/proof-receipt-ui-spec`

---

## 1. Product purpose

The **Evidence Truth Map** is the matter-wide index of **what material exists, in what state, and what to do next**. The upgraded UI makes states instantly visible, ties every row to Proof Receipts, and places a **clear action** beside each row — without guilt/innocence coding or outcome prediction.

### What this is

- A **scan-first table** of evidence items (documents, exhibits, schedules, media).
- A **state machine display** aligned to audit-classified existence (served, missing, etc.).
- An **action hub** linking to chase, check, receipt, and family cards.

### What this is not

- A **case strength** meter or prosecution/defence scoreboard.
- A **plea advisor** or trial outcome predictor.
- A replacement for the disclosure schedule or MG6 forms.

---

## 2. Colour states

Colours indicate **material status only**, not guilt, innocence, or trial viability.

| Colour | State(s) | Label (UI) | Meaning for fee-earner |
|--------|----------|------------|------------------------|
| **Green** | Served (complete enough to review) | **Served** | Material is in bundle with a reviewable anchor |
| **Amber** | Partial, draft, unsigned, not safely confirmed, needs review | **Partial / needs review** | Something present but incomplete or qualified |
| **Grey** | Referred only | **Referred only** | Listed or referenced; file not safely in bundle |
| **Red** | Missing | **Missing** | Expected item not served or not locatable |
| **Neutral stripe** | Contradicted, other-defendant-only | **Special review** | Not missing, but unqualified reliance is unsafe |

**Rules:**

- Green **never** means “strong case” or “safe to convict”.
- Red **never** means “acquittal likely” or “disclosure win”.
- Amber is the **default** when audit confidence is below served-complete threshold.

---

## 3. Row layout

Each Truth Map row shows:

| Column | Content |
|--------|---------|
| **Item** | Human-readable title (e.g. “Body-worn video — arrest”, “MG6C row 12”) |
| **State badge** | Colour + label from Section 2 |
| **Support** | Strong / Partial / Weak / Not supported / Not assessable |
| **Action** | Single primary action button or link (Section 4) |
| **Receipts** | Count + “View receipts” if output lines exist |
| **Family** | Optional family card chip if check triggered |

Row expand (optional) shows:

- Source document + page anchor
- One-line safe summary (audit wording)
- Link to family-specific card when applicable

**No dev labels** in columns (no `referred_only`, `existence_enum`, etc.).

---

## 4. Row actions

Every row has **one clear primary action** visible without expanding the row.

| Primary action | When shown | Behaviour |
|----------------|------------|-----------|
| **Review** | Served + strong/partial support | Opens source + receipts |
| **Check** | Served but partial / weak / unsigned / draft | Opens receipt with Check pre-highlighted |
| **Chase** | Missing or referred only | Opens or creates CPS Chase gap link |
| **Do not use** | Contradicted, unsafe reliability, failed copy gate | Blocks export snippets; opens receipt guard |
| **Not assessable** | OCR failure, redaction block, wrong court/date flag | Opens safeguard / family card |

Secondary actions (overflow menu):

- View all proof receipts for item
- Add solicitor review note (matter-level note attaches to row)
- Open document viewer

Actions are **workflow labels**, not recommendations to plead or abandon trial.

---

## 5. Map ↔ Proof Receipt linking

| Direction | Behaviour |
|-----------|-----------|
| Truth Map → Receipt | Row “View receipts” lists all output lines citing this item |
| Receipt → Truth Map | Drawer footer link “Evidence Truth Map row” scrolls to row |
| State mismatch | If receipt state differs from map row, show amber **“State mismatch — review”** banner; do not silently reconcile |

One Truth Map row may link to **many receipts** (different surfaces). One receipt links to **one primary** Truth Map row plus optional related rows.

---

## 6. UI layout

### 6.1 Header

- Title: **Evidence Truth Map**
- Guard banner (shared with Proof Receipt):

> **Review aid only.** States reflect what CaseBrain could locate and classify in the bundle. Confirm against source material before reliance.

- Summary chips: counts by colour state (e.g. “12 served · 4 referred only · 3 missing”) — **not** percentages or scores.

### 6.2 Filters

- State (multi-select)
- Action required (Chase / Check / Do not use)
- Document type (schedule, media, statement, expert, etc.)
- Family card triggered (yes/no)

### 6.3 Grouping modes

- **By document** (default) — matches bundle order
- **By state** — chase triage
- **By chase status** — outstanding gaps first

### 6.4 Empty / error states

| Condition | Message |
|-----------|---------|
| No bundle loaded | “Upload or select a bundle to build the Truth Map.” |
| Classifier pending | “Truth Map building — do not rely on output until complete.” |
| Row unclassified | State: **Not assessable**; Action: **Check** |

---

## 7. Upgrade deltas (from current presentation)

The upgraded map **adds** (conceptual — no code in this branch):

1. **Fixed colour legend** with solicitor-facing labels (Section 2).
2. **Primary action column** on every row (Section 4).
3. **Receipt count** and one-click drill-down.
4. **Family card chips** on relevant rows (see FAMILY_SPECIFIC_CARDS_SPEC.md).
5. **State mismatch** banner when receipt and map disagree.
6. **No reliance column** renamed from internal enums to “Support” + “Action” (avoid “Can rely? Yes/No” without context).

---

## 8. Example rows (illustrative)

### Example A — CCTV stills served, master referred only

| Field | Value |
|-------|-------|
| Item | CCTV — scene outside premises |
| State | Amber — Partial / needs review |
| Support | Partial |
| Action | **Chase** |
| Receipts | 2 (Court, Overview) |
| Family | CCTV stills vs master |

### Example B — MG6C entry, BWV referred only

| Field | Value |
|-------|-------|
| Item | Body-worn video — arrest |
| State | Grey — Referred only |
| Support | Not supported |
| Action | **Chase** |
| Family | BWV referred-only |

### Example C — Witness statement served

| Field | Value |
|-------|-------|
| Item | MG11 — Complainant statement |
| State | Green — Served |
| Support | Strong |
| Action | **Review** |
| Receipts | 3 |

---

## 9. Explicit prohibitions

- No red/green **case outcome** headline or “strong/weak prosecution case”.
- No **plea** or **trial viability** column.
- No raw JSON or pipeline debug drawer in default view.
- No claim that map states are **solicitor-verified**.
- No **win/loss** badges.

---

## 10. Acceptance criteria

- [ ] Every classified item shows colour state, support, and primary action.
- [ ] Missing and referred-only rows default to **Chase** action visible.
- [ ] Served rows link to at least one receipt when an output line exists.
- [ ] Colour legend visible without scrolling on first load.
- [ ] Fee-earner can triage chase items in **under 2 minutes** on a standard pilot bundle.
- [ ] No dev labels or raw JSON in default table view.
- [ ] Guard banner present on map screen and exports that include map excerpts.

---

## 11. Implementation notes (future)

1. Reuse existing Truth Map row model; add presentation layer for colours and actions only.
2. Derive primary action from existence + reliability rules (align with Proof Receipt defaults).
3. Wire family card registry for row chips.
4. Export condensed map table via EXPORTABLE_PROOF_APPENDIX_SPEC.md.

### Non-goals

- No duplicate evidence classification store.
- No changes to audit runners or v9-scale artifacts in this spec branch.

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Related | [PROOF_RECEIPT_UI_SPEC.md](./PROOF_RECEIPT_UI_SPEC.md), [FAMILY_SPECIFIC_CARDS_SPEC.md](./FAMILY_SPECIFIC_CARDS_SPEC.md) |
