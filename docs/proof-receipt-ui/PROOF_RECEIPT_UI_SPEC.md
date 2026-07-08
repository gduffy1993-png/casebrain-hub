# Proof Receipt — UI Specification

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/proof-receipt-ui-spec`

---

## 1. Product purpose

A **Proof Receipt** is the solicitor-facing record for a single **output line** — one sentence or bullet that CaseBrain placed on a named surface (Overview, Court, CPS Chase, Client Summary, or Export). It answers:

1. **What** was written (the output line).
2. **Where** it came from (document, page, excerpt).
3. **How strong** the underlying evidence is (state and support level).
4. **What to do** (rely / check / chase / do-not-use).
5. **What not to say** (blocked unsafe wording).
6. **What the fee-earner noted** (optional solicitor review note).

### What this is

- A **provenance and safety card** for one output line.
- A **bridge** between output channels and the Evidence Truth Map.
- A **workflow aid** for fee-earner review before reliance, chase, or export.

### What this is not

- **Not legal advice** or a plea/trial recommendation.
- **Not a claim** that the line has been solicitor-reviewed unless review is recorded separately.
- **Not a substitute** for reading the source document.
- **Not a dump** of pipeline JSON, receipt ids as primary labels, or internal audit scores.

---

## 2. Receipt fields (required)

Every Proof Receipt displays these fields in fixed order. Labels use **plain English** only.

| Field | Description | Display rules |
|-------|-------------|---------------|
| **Output line** | Exact text (or approved paraphrase) as shown on the surface | Full line visible; no truncation without “Show full line” |
| **Surface** | Where the line appears | One of: **Overview**, **Court**, **CPS Chase**, **Client Summary**, **Export** |
| **Source document** | Bundle item title or schedule reference | Human title first; internal doc key hidden behind “Technical ref” if needed |
| **Source page** | Page or paragraph anchor | “Page 12”, “MG6C row 4”, or “Not pinned — solicitor review” |
| **Source snippet** | Bounded excerpt supporting the line | Max ~4 lines; grey box; link “Open in document viewer” |
| **Evidence state** | Truth Map alignment | e.g. Served, Partial, Referred only, Missing, Not safely confirmed |
| **Support level** | How well the source backs the line | **Strong**, **Partial**, **Weak**, **Not supported**, **Not assessable** |
| **Safe action** | Recommended workflow marker | **Rely**, **Check**, **Chase**, **Do not use** — one primary badge |
| **Blocked unsafe wording** | Phrases that must not appear on this surface | Bulleted list; drawn from copy gate, not invented |
| **Solicitor review note** | Free-text fee-earner note | Empty by default; timestamp + initials when saved |

### Optional secondary fields (collapsed by default)

- Linked Truth Map row (link only, not row id as headline).
- Related family card (if triggered).
- Last updated (audit timestamp in solicitor-readable date).

---

## 3. Safe actions

| Action | Meaning for fee-earner | UI behaviour |
|--------|------------------------|--------------|
| **Rely** | May use this line internally after review | Neutral blue/grey badge; does not auto-enable export |
| **Check** | Confirm source and wording before reliance | Default for partial / needs-review states |
| **Chase** | Disclosure or material gap — link to CPS Chase | Button “Open chase item” when gap exists |
| **Do not use** | Line blocked from reliance on this surface | Red-amber guard strip; export snippets suppressed |

Actions are **workflow markers** set by rules + user override. They are **not** AI recommendations to plead, accept, or abandon trial.

### Action rules (conceptual)

| Evidence state | Typical support | Default safe action |
|----------------|-----------------|---------------------|
| Served | Strong | Check (Rely only after user confirms) |
| Served | Partial / weak | Check |
| Partial | Any | Check |
| Referred only | Any | Chase |
| Missing | Any | Chase |
| Not safely confirmed | Any | Do not use or Chase |
| Contradicted | Any | Do not use |

User override persists as metadata; it does **not** change underlying evidence state on the Truth Map.

---

## 4. Surfaces

Each receipt is scoped to **one surface**. The same underlying fact may have **separate receipts** per surface if wording or safety differs.

| Surface | Audience | Receipt emphasis |
|---------|----------|------------------|
| **Overview** | Fee-earner workstation | Neutral summary; all actions available |
| **Court** | Court note / hearing prep | Stricter blocked wording; do-not-use prominent |
| **CPS Chase** | Disclosure correspondence | Chase action primary; missing/referred-only highlighted |
| **Client Summary** | Client-safe copy | Highest guard; do-not-use default for weak states |
| **Export** | Bundle / appendix export | Tabular-friendly; links not raw excerpts in PDF |

Surface name appears as a **chip** on the receipt header, not as an internal route name.

---

## 5. UI layout

### 5.1 Entry points

- **From output line** — “View proof” inline on any surfaced line.
- **From Evidence Truth Map** — “Receipts for this item” lists all linked receipts.
- **From export preview** — footnote marker opens receipt drawer.

### 5.2 Receipt drawer (primary)

```
┌─────────────────────────────────────────────────────────┐
│ Proof receipt                          [Surface chip]    │
│ ─────────────────────────────────────────────────────── │
│ OUTPUT LINE                                              │
│ "CCTV stills served; master recording referred only."    │
│ ─────────────────────────────────────────────────────── │
│ Source: MG6C disclosure schedule · Page 3 · [Open doc] │
│ ┌─ snippet ─────────────────────────────────────────┐   │
│ │ "Still images at exhibit ref CCTV-01; master not  │   │
│ │  included in download bundle."                     │   │
│ └────────────────────────────────────────────────────┘   │
│ Evidence state: Referred only    Support: Partial        │
│ Safe action: [ Chase ]                                   │
│ ─────────────────────────────────────────────────────── │
│ Do not use this wording:                                 │
│ • "Full CCTV proves identification"                      │
│ • "Footage confirms defendant at scene"                  │
│ ─────────────────────────────────────────────────────── │
│ Solicitor review note: [ Add note ]                      │
│ [ Mark: Rely | Check | Chase | Do not use ]              │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Fixed guard banner (all receipts)

Shown at top of drawer; verbatim:

> **Review aid only.** This receipt shows where an output line came from and how it may be used in CaseBrain. It is not legal advice and does not replace your independent review of the source material.

Second line when **Do not use** is active:

> **Not safe to rely on this line** without further review. Do not copy to client-facing or court-facing output until cleared.

### 5.4 Solicitor scan target

- Header + output line + safe action visible **without scrolling** on laptop viewport.
- Snippet and blocked wording below fold acceptable.
- **No raw JSON** panel; “Technical ref” collapsed only.

---

## 6. Blocked unsafe wording

- Sourced from **existing copy gates** and family checks — spec does not invent new legal conclusions.
- Shown as **negative examples** (“Do not use this wording”), not as corrected advice.
- Must **not** include guilty/not guilty, plea, or outcome language even as blocked examples tied to recommendations.

**Allowed blocked example:**

> “Identifies defendant conclusively from stills alone.”

**Disallowed blocked example:**

> “Instead advise client to plead guilty.”

---

## 7. Solicitor review note

- Optional free text; max 500 characters.
- Label: **Solicitor review note** (not “AI verified” or “Proof approved”).
- Saving a note does **not** change receipt badge to “Solicitor reviewed proof” unless a separate firm workflow enables that label.
- Notes are **matter-local** and exportable only in internal appendix formats (see EXPORTABLE_PROOF_APPENDIX_SPEC.md).

---

## 8. Receipt list view (matter-level)

Compact table for “All proof receipts on this matter”:

| Column | Content |
|--------|---------|
| Output line (truncated) | First 80 chars |
| Surface | Chip |
| Source | Doc + page |
| State | Badge |
| Safe action | Badge |
| Open | Drawer link |

Filter by surface, action, and evidence state. Sort by surface then document order.

---

## 9. Explicit prohibitions

- No **dev labels** (`doNotUse`, `referred_only`, pipeline version) in primary UI.
- No **giant raw JSON** or receipt dump modals.
- No **win/loss**, **conviction likelihood**, or **plea** panels on receipt.
- No **“Solicitor reviewed proof”** badge unless review workflow completed separately.
- No claim of **real-world accuracy** or endorsement by a named solicitor.

---

## 10. Acceptance criteria

- [ ] Every surfaced output line has a receipt or explicit “Receipt pending — do not rely” guard.
- [ ] All eleven required fields present or honestly marked “Not available — review source”.
- [ ] Safe action visible within first screen of drawer.
- [ ] Blocked wording shown for every Court and Client Summary receipt where copy gate fired.
- [ ] Source snippet links to document viewer with page anchor.
- [ ] Solicitor can understand a single receipt in **under 30 seconds**; full matter list scannable in **under 2 minutes** (typical pilot bundle ≤40 receipts without pagination).
- [ ] No dev labels, raw JSON, or advice-replacement wording in default view.

---

## 11. Implementation notes (future)

**Spec only.** Suggested build order when approved:

1. Receipt read model derived from existing proof envelope / audit output — **no duplicate evidence store**.
2. Drawer UI wired to output lines on Five Answers / channel previews.
3. User action persistence (rely/check/chase/do-not-use + notes).
4. Export appendix templates (see EXPORTABLE_PROOF_APPENDIX_SPEC.md).

### Dependencies (read-only at spec time)

- Evidence Truth Map states and row ids.
- Proof envelope / receipt generation from audit pipeline (v9-scale outputs remain out of scope for this branch).
- Document viewer with page anchors.
- Copy gate blocked-phrase registry.

### Non-goals

- No changes to Brain 1, Guardian, chase core, Supabase, auth, deploy.
- No merge to master from this spec branch without product sign-off.

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Related | [EVIDENCE_TRUTH_MAP_UI_SPEC.md](./EVIDENCE_TRUTH_MAP_UI_SPEC.md), [EXPORTABLE_PROOF_APPENDIX_SPEC.md](./EXPORTABLE_PROOF_APPENDIX_SPEC.md) |
