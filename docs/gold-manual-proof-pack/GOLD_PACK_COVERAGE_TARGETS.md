# Gold Pack Coverage Targets

**Purpose:** Ensure the gold manual proof pack (20–50 cases) exercises the offence families, evidence types, and bundle defects that matter for criminal defence workflow review.

**Review type:** gold manual review on controlled bundles — solicitor review required per case. Coverage planning does not imply those cases exist or have been reviewed yet.

---

## Pack tiers

| Tier | Case count | Goal |
|------|------------|------|
| Minimum viable | 20 | At least one exemplar per priority family below |
| Standard | 35 | Two cases for high-risk families; mix of thin and full bundles |
| Full | 50 | Depth cases, holdout set, multi-defect bundles |

**Holdout:** reserve 5–10 cases (standard/full tier) not used for tuning prompts or rules — milestone validation only.

---

## Priority coverage families

Each family needs at least **one** gold manual case with completed truth state and expected outputs. Mark status when cases are drafted — do not claim cases are reviewed until they are.

| # | Family | Min cases (20 pack) | Min cases (50 pack) | Status |
|---|--------|---------------------|---------------------|--------|
| 1 | Phone attribution | 1 | 3 | planned |
| 2 | CCTV / stills / master footage | 1 | 3 | planned |
| 3 | BWV / bodycam | 1 | 2 | planned |
| 4 | Custody / PACE / interview | 1 | 3 | planned |
| 5 | Drugs continuity / lab / weight | 1 | 3 | planned |
| 6 | Encro / handle attribution | 1 | 2 | planned |
| 7 | Motoring / SJP / device calibration | 1 | 2 | planned |
| 8 | Youth / YJS / safeguards | 1 | 2 | planned |
| 9 | Domestic / stalking / course of conduct | 1 | 2 | planned |
| 10 | ABE / first account / third-party records | 1 | 2 | planned |
| 11 | Co-defendant / mixed defendant | 1 | 2 | planned |
| 12 | Fraud / bank / device ownership | 1 | 2 | planned |
| 13 | Expert: DNA / fingerprint / cell-site / medical | 2 | 4 | planned |
| 14 | Bail / restraining / non-mol / DVPO | 1 | 2 | planned |
| 15 | OCR / layout / redaction / date / court mismatch | 2 | 4 | planned |

**Expert sub-quota (within row 13):** at minimum one case each for **DNA or fingerprint**, **cell-site**, and **medical** by full pack — can be partial reports or referred-absent patterns.

**Layout sub-quota (within row 15):** include at least one case each for **index/exhibit absent**, **redaction**, and **date/court/charge drift** by full pack.

---

## Family definitions (what each case must stress)

### 1. Phone attribution

- Extracts, schedules, download reports, attribution gaps
- Must test: partial extract vs full; sender/receiver not proved; handle unmapped

### 2. CCTV / stills / master footage

- Stills without master; partial clip; transcript without export; schedule refers to absent exhibit

### 3. BWV / bodycam

- Arrest / search / ID procedure footage; referred in MG5 but not served; clip vs full export

### 4. Custody / PACE / interview

- Custody record gaps; interview audio missing; transcript-only; voluntary attendance vs arrest

### 5. Drugs continuity / lab / weight

- Seal break; continuity gap; weight without analysis; partial lab listing; street vs forensic weight

### 6. Encro / handle attribution

- Handle-to-device mapping; Encro overlap with phone material; social vs Encro attribution boundaries

### 7. Motoring / SJP / device calibration

- Thin SJP bundle; calibration certificate missing; device log partial; NIP/service issues as papers allow

### 8. Youth / YJS / safeguards

- Age / YJS referral; appropriate adult; reporting restrictions — factual bundle markers only, no real identifiers

### 9. Domestic / stalking / course of conduct

- Course-of-conduct framing; bail conditions; complainant statements vs third-party records

### 10. ABE / first account / third-party records

- ABE video referred missing; first account in body-worn vs formal ABE; empty third-party record

### 11. Co-defendant / mixed defendant

- Separate schedules; joint enterprise language in MG5; material relating to co-defendant only

### 12. Fraud / bank / device ownership

- Account ownership not proved; device possession vs user; bank records partial or absent

### 13. Expert evidence

- DNA / fingerprint partial uplift; cell-site maps vs report; medical triage without full report

### 14. Bail / restraining / non-mol / DVPO

- Bail conditions in bundle vs missing order text; restraining order absent but referenced in MG5

### 15. OCR / layout / bundle defects

- Garbled OCR; rotated pages; duplicate reorder; redaction; MG6 index gap; hearing date split across docs

---

## Cross-cutting scenario matrix

Aim to cover these **patterns** across the pack (one case may hit multiple):

| Pattern | Min occurrences (50 pack) |
|---------|---------------------------|
| Thin bundle (≤ few pages) | 5 |
| Full MG5-led disclosure | 10 |
| Referred-absent exhibit | 8 |
| Partial media (clip / stills / transcript only) | 6 |
| Surface split stress (CPS vs court vs client) | 5 |
| False-missing trap (material served but easy to miss) | 4 |
| Over-warn trap (bundle supports point but easy to hedge) | 4 |
| Crown Court stage | 15 |
| Magistrates stage | 25 |
| SJP / motoring thin | 5 |

---

## Suggested case ID prefixes (fictional)

Use consistent local IDs under `artifacts/casebrain-gold-manual/local/`:

| Prefix | Family |
|--------|--------|
| `gm-phone-` | Phone attribution |
| `gm-cctv-` | CCTV / stills / master |
| `gm-bwv-` | BWV / bodycam |
| `gm-pace-` | Custody / PACE / interview |
| `gm-drugs-` | Drugs / lab / continuity |
| `gm-encro-` | Encro / handle |
| `gm-mot-` | Motoring / SJP / calibration |
| `gm-youth-` | Youth / YJS |
| `gm-dom-` | Domestic / stalking |
| `gm-abe-` | ABE / first account |
| `gm-cod-` | Co-defendant |
| `gm-fraud-` | Fraud / bank / device |
| `gm-expert-` | Expert evidence |
| `gm-bail-` | Bail / orders |
| `gm-layout-` | OCR / layout / mismatch |

---

## Coverage tracker (template)

Copy to local tracker or case index (gitignored):

| Case ID | Families covered | Stage | Bundle weight | Truth state | Expected output | Reviewed | Overall score |
|---------|------------------|-------|---------------|-------------|-----------------|----------|---------------|
| gm-cctv-001-partial-clip | CCTV, layout | PTPH | medium | draft | draft | no | H |

---

## Acceptance gates

### Minimum viable (20 cases)

- [ ] All 15 priority families have ≥ 1 case with truth state complete
- [ ] ≥ 3 layout/OCR defect cases
- [ ] ≥ 2 surface-split stress cases
- [ ] ≥ 2 false-missing trap cases documented in expected outputs
- [ ] No case promoted to gold without solicitor review record

### Full pack (50 cases)

- [ ] All priority families meet full-pack minimum counts
- [ ] Holdout set identified (5–10 cases)
- [ ] Expert sub-quota met
- [ ] Layout sub-quota met
- [ ] Pack-level pass rate per [GOLD_PACK_SCORING.md](./GOLD_PACK_SCORING.md)

---

## What not to do

- Do not use real client matters in committed files
- Do not invent case outcomes or solicitor quotes to fill coverage gaps
- Do not claim coverage is complete until cases are manually reviewed
- Do not merge this pack with v9 automated audit corpora or messy-PDF proof branches

---

## Relationship to other specs

| Spec | Link |
|------|------|
| Gold case record | [GOLD_CASE_TEMPLATE.md](./GOLD_CASE_TEMPLATE.md) |
| Truth state | [TRUTH_STATE_TEMPLATE.json](./TRUTH_STATE_TEMPLATE.json) |
| Expected outputs | [EXPECTED_OUTPUT_TEMPLATE.md](./EXPECTED_OUTPUT_TEMPLATE.md) |
| False-positive review | [FALSE_POSITIVE_REVIEW_FORM.md](./FALSE_POSITIVE_REVIEW_FORM.md) |
| Scoring | [GOLD_PACK_SCORING.md](./GOLD_PACK_SCORING.md) |
| Proof Receipt UI (Chat 5) | Receipt shape should align with expected proof receipt rows |
| Solicitor Shadow Pilot (Chat 4) | Shadow sessions draw from coverage-tracked gold cases |

---

## Document control

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-07-09 |
