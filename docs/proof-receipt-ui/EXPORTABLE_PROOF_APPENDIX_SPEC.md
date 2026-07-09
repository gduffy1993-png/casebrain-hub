# Exportable Proof Appendix — Specification

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/proof-receipt-ui-spec`

---

## 1. Purpose

Define **export shapes** that attach Proof Receipt and Evidence Truth Map material to solicitor workflows — internal notes, chase letters, client updates, and bundle appendices — without merging unsafe copy into court or client channels automatically.

All exports are **review aids**. They require explicit user action to generate. None imply legal advice, plea guidance, or trial outcome prediction.

---

## 2. Export types

| Export | Primary audience | Core content |
|--------|------------------|--------------|
| **Court note proof** | Fee-earner / counsel prep | Court-surface receipts + blocked wording |
| **CPS chase proof** | Disclosure correspondence | Missing/referred-only rows + chase actions |
| **Client summary proof** | Internal review before client send | Client-surface receipts + do-not-use flags |
| **Evidence gaps** | Chase triage / file note | Truth Map rows: missing, referred only, partial |
| **Matter brief** | Supervisor handover | One-page map summary + top receipts by surface |
| **Proof receipt appendix** | Bundle index / disclosure log adjunct | Tabular all-receipt listing |

Each export is a **separate template**. User selects export type; system does not auto-push to Court Note or CPS Chase builders.

---

## 3. Shared export rules

### 3.1 Fixed guard block (all exports)

Every export begins or ends with this block, verbatim:

> **CaseBrain review aid.** This export shows source links and safe-action markers for solicitor review. It is not legal advice. Confirm all material against original documents before reliance, court use, or client communication.

When any included receipt has **Do not use**:

> **Includes lines marked do not use.** Do not copy those lines to court-facing or client-facing output without independent review.

### 3.2 Source linking

- Document title + page ref on every row.
- Receipt footnotes use **human labels** (“Source: MG6C p.3”), not internal ids as primary text.
- Optional appendix column “Technical ref” for firm CM systems — collapsed in PDF default template.

### 3.3 Wording controls

- **Controlled audit wording only** in auto-generated summary cells.
- **No guilty/not guilty**, plea, or win/loss language.
- **No claim** of solicitor-reviewed proof unless export option “Include reviewed notes only” is selected and notes exist.
- **No raw JSON** body; max one-line technical ref per row in appendix mode.

### 3.4 Format options

| Format | Use |
|--------|-----|
| PDF | Print / email attachment |
| DOCX | Editable file note |
| CSV | Firm analytics / chase tracking (internal) |

---

## 4. Court note proof

**Purpose:** Show what supports each **Court**-surface output line before it is copied into a hearing note.

### Sections

1. Guard block
2. Matter reference + export date
3. Table: Output line | Source doc | Page | Evidence state | Safe action | Blocked wording (Y/N)
4. Footer: link to full Proof Receipt drawer (digital export) or “See matter in CaseBrain”

### Row rules

- Include **only** receipts where surface = Court.
- Blocked unsafe wording column lists **short labels** (“ID overstatement”, “Master not served”) — not full blocked phrase dump if longer than one line; full list in linked receipt.
- Omit receipts marked **Do not use** from “suggested copy” section; list them separately under **“Excluded from court copy — review required”**.

### Prohibitions

- Must not read as a **draft court submission**.
- Must not include client advice sections.

---

## 5. CPS chase proof

**Purpose:** Support disclosure chase letters with **evidence-backed gap list**.

### Sections

1. Guard block
2. Gap summary counts (missing / referred only / partial)
3. Table: Item | Truth Map state | Schedule ref | Source snippet (bounded) | Suggested chase line | Proof receipt link
4. Optional: prior chase dates if recorded in chase module (read-only)

### Suggested chase line rules

- Neutral, factual: “Item listed on MG6C row X; file not located in bundle.”
- **Not:** “Disclosure failure requires stay” or “Prosecution must drop charges”.

### Primary actions

- Pre-filter Truth Map rows where action = **Chase**.
- Include family card one-liner when triggered (e.g. “CCTV master not served — stills only”).

---

## 6. Client summary proof

**Purpose:** Internal checklist before any **Client Summary** text is sent.

### Sections

1. Guard block (stronger second line if any do-not-use present)
2. Table: Client-facing line | Source | State | Safe action | Blocked wording summary
3. **Client-safe gate:** export marked **“Internal — not for client”** watermark on every page

### Rules

- Include only surface = Client Summary receipts.
- Any **Do not use** row appears in red-amber boxed section at top.
- No paraphrase that **softens** a do-not-use into safe client advice.

---

## 7. Evidence gaps export

**Purpose:** Fast triage list for fee-earner or supervisor.

### Sections

1. Guard block
2. Truth Map extract: rows where state is **Missing**, **Referred only**, or **Partial / needs review**
3. Columns: Item | State | Action | Family card | Last receipt date
4. No output lines unless user toggles “Include linked output lines”

### Sort order

1. Missing
2. Referred only
3. Partial (amber)

---

## 8. Matter brief export

**Purpose:** **Under 2 minutes** supervisor scan — one page preferred, two pages max for pilot bundles.

### Sections

1. Guard block
2. **Snapshot counts:** served / partial / referred only / missing (numbers only, no score)
3. **Top chase items** (max 5)
4. **Top do-not-use receipts** (max 5)
5. **Surface summary:** count of receipts per surface with dominant safe action
6. **Family cards active** (names only, link to detail)

### Omissions

- No full snippet dump.
- No JSON.
- No plea/trial commentary.

---

## 9. Proof receipt appendix

**Purpose:** Tabular adjunct for disclosure index or audit file.

### Columns

| Column | Content |
|--------|---------|
| # | Sequential appendix number |
| Output line (truncated) | 120 chars max |
| Surface | Overview / Court / CPS Chase / Client Summary / Export |
| Source document | Title |
| Page | Anchor |
| Evidence state | Solicitor label |
| Support level | Strong / Partial / Weak / etc. |
| Safe action | Rely / Check / Chase / Do not use |
| Solicitor note | If present |
| Technical ref | Optional collapsed |

### Sort

Default: by surface, then document order.

### Volume

- Pilot target: ≤40 rows single PDF without appendix split.
- Larger matters: auto-split Part 1 / Part 2 with shared guard on each part.

---

## 10. Export workflow (UI concept)

```
User selects export type
        ↓
Preview (redacted snippets, guard visible)
        ↓
Confirm: "Internal review aid — not legal advice"
        ↓
Download PDF / DOCX / CSV
```

- **No one-click** export to client email or court portal from this flow.
- Preview required before download.
- Export filename pattern: `{matter-ref}_{export-type}_{date}.pdf`

---

## 11. Acceptance criteria

- [ ] All six export types available as separate templates.
- [ ] Guard block verbatim on every export.
- [ ] Every row in court/CPS/client proof exports has source doc + page.
- [ ] Do-not-use items visibly segregated in court and client proof exports.
- [ ] Matter brief readable in **under 2 minutes**.
- [ ] No raw JSON, dev labels, or plea/outcome language in default templates.
- [ ] No “solicitor reviewed proof” header unless optional notes flag selected and notes exist.

---

## 12. Non-goals

- Does not replace existing Court Note, CPS Chase, or Client Summary **builders**.
- Does not modify export pack core, chase core, or deploy config in this spec branch.
- Does not auto-merge pressure map or plea spec content without user selection.

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Related | [PROOF_RECEIPT_UI_SPEC.md](./PROOF_RECEIPT_UI_SPEC.md), [EVIDENCE_TRUTH_MAP_UI_SPEC.md](./EVIDENCE_TRUTH_MAP_UI_SPEC.md) |
