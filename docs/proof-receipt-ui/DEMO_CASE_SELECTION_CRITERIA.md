# Demo Case Selection Criteria — Proof Receipt UI

**Status:** Spec only — **no implementation in this branch.**  
**Branch:** `feature/proof-receipt-ui-spec`

---

## 1. Purpose

Define which **pilot/demo matters** best exercise the Proof Receipt UI, upgraded Evidence Truth Map, family cards, and exportable appendices — for walkthroughs, design review, and future eval — **without** claiming real-world accuracy or solicitor sign-off.

These criteria guide **demo selection only**. They do not modify audit runners, v9-scale artifacts, or production case data.

---

## 2. Selection principles

| Principle | Rule |
|-----------|------|
| **Coverage** | Each demo set spans all five surfaces (Overview, Court, CPS Chase, Client Summary, Export) |
| **State diversity** | Includes green, amber, grey, and red Truth Map rows on every primary demo matter |
| **Action diversity** | Receipts exhibit all four safe actions: Rely, Check, Chase, Do not use |
| **Family coverage** | Across the demo **pack**, all twelve family cards appear at least once |
| **Solicitor scan** | Primary demo matter readable in **under 2 minutes** (≤40 receipts, ≤25 Truth Map rows in default view) |
| **No false claims** | Demos labelled **“Synthetic / pilot bundle”** — not real clients, not reviewed outcomes |
| **Source-linked** | Every demo receipt has document + page + snippet (or honest “not pinned”) |

---

## 3. Primary demo matter (one required)

One **flagship matter** for sales and training walkthroughs.

### Must include

- ≥8 Proof Receipts across ≥3 surfaces including **Court** and **Client Summary**
- ≥1 **Do not use** receipt with visible blocked wording
- ≥2 **Chase** rows (missing + referred only)
- ≥1 **state mismatch** banner scenario (receipt vs map) for training
- ≥2 active family cards (recommended: **CCTV stills vs master** + **phone attribution**)
- Messy PDF or partial OCR scenario optional but encouraged

### Must exclude

- Plea recommendation or trial outcome copy in bundle
- Real client names or real solicitor quotes
- Pre-filled “solicitor reviewed proof” badges

### Suggested profile

- **Offence type:** Harassment / communications or similar — familiar to criminal pilot users.
- **Bundle size:** 15–35 documents; scannable in one sitting.
- **Label:** “Taylor-style pilot” or equivalent internal codename — **not** presented as live matter.

---

## 4. Secondary demo matters (recommended set)

| # | Profile | Exercises |
|---|---------|-----------|
| A | Youth + interview material | Youth safeguards, BWV referred-only |
| B | Drugs + seizure, lab missing | Medical/expert missing patterns, chase export |
| C | Motoring device | Calibration / device family card |
| D | Co-defendant interview served | Co-defendant-only card, do-not-use on court lines |
| E | Encro / encrypted comms attribution | Encro handle card |
| F | Breach bail / restraining order | Bail/order proof card |
| G | Wrong court header on key PDF | OCR / wrong date or court card |

Each secondary matter: **≤20 receipts**, **≥1 unique family card** not primary on flagship matter.

---

## 5. Receipt and map thresholds

| Metric | Primary demo | Secondary demo | Reject if |
|--------|--------------|----------------|-----------|
| Proof receipts | 15–40 | 8–20 | >60 (scan time) |
| Truth Map rows | 15–25 | 10–18 | >35 without grouping |
| Family cards active | 2–4 | 1–2 | >6 (noise) |
| Surfaces covered | all 5 | ≥3 | only 1 surface |
| Do-not-use receipts | ≥1 | ≥0 | none in full pack |
| Chase rows | ≥2 | ≥1 | none in full pack |

---

## 6. Export demo checklist

For each export type, one demo matter must produce a **preview-quality** export:

| Export | Demo source matter |
|--------|-------------------|
| Court note proof | Primary or co-defendant matter |
| CPS chase proof | Primary or drugs/lab missing |
| Client summary proof | Primary (with do-not-use row) |
| Evidence gaps | Any with ≥3 missing/referred rows |
| Matter brief | Primary flagship |
| Proof receipt appendix | Primary flagship |

Verify: guard block present, no raw JSON, no dev labels, **under 2 minutes** read for matter brief.

---

## 7. Negative demo cases (required)

Include **at least two** matters that show **guard behaviour only**:

| Negative case | Purpose |
|---------------|---------|
| Empty / loading bundle | Truth Map empty state; no receipts |
| All served, no gaps | Cards minimal; confirms no false chase spam |
| Unsafe-to-export matter | All client lines do-not-use; client summary proof shows exclusion box |

Negative cases are **not** shown in marketing walkthrough unless demonstrating guards.

---

## 8. Relationship to audit work (read-only)

| Asset | Use in demo selection |
|-------|----------------------|
| messy-pdf-proof-receipts audit (Chat 1) | **Reference only** — do not block this spec branch on v9-scale3000 completion |
| v9 forty-case scaffold | Optional source list for matter ids — **do not modify** v9 branch or artifacts |
| Existing Taylor / phone-harassment demos | Preferred starting profile for flagship matter |

Demo selection **documents** which fixtures to use; it does **not** run audits or change audit runners.

---

## 9. Labelling and presentation

All demo UI must show:

> **Pilot demonstration matter.** Synthetic bundle for product review. Not legal advice. Not solicitor-reviewed proof.

- No firm logos presented as endorsement.
- No invented quotes from named solicitors or counsel.
- Screenshots for external use: redact technical refs unless training mode on.

---

## 10. Acceptance criteria

- [ ] One primary demo matter documented meeting Section 3 thresholds.
- [ ] Seven secondary profiles documented (A–G) or justified omission.
- [ ] Full pack covers all twelve family cards at least once.
- [ ] All six export types have assigned demo source matter.
- [ ] Negative cases documented for empty and do-not-use guards.
- [ ] No criterion requires claiming real-world accuracy or completed solicitor review.

---

## 11. Open questions (product sign-off)

1. Should flagship matter remain Taylor-style harassment or rotate per release?
2. Maximum receipt count before mandatory pagination in UI walkthrough?
3. Firm-specific demo subset (e.g. motoring-only firms) — toggle or separate pack?

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
| Related | [README.md](./README.md), [FAMILY_SPECIFIC_CARDS_SPEC.md](./FAMILY_SPECIFIC_CARDS_SPEC.md) |
