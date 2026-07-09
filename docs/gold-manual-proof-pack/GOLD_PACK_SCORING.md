# Gold Pack Scoring

**Purpose:** Consistent scoring when comparing CaseBrain output against gold manual expected outputs on controlled bundles.

**Review type:** gold manual review — solicitor review required before gold promotion. Scores describe fit to **expected output on a controlled bundle**, not real-world accuracy or solicitor production sign-off.

---

## Score levels

| Score | Label | Meaning |
|-------|-------|---------|
| **P** | Pass | Meets expected output; no material false-positive issues |
| **R** | Partial | Usable with reviewer notes; one or more medium issues or minor misses |
| **F** | Fail | Material false positive, missed gap, surface confusion, or unsafe wording |
| **H** | Hold | Cannot score yet — bundle defect unresolved, truth state incomplete, or run unavailable |

---

## Surfaces scored

Each gold case receives a score per surface:

1. **Missing material** — gaps, partials, referred-absent flags
2. **Unsafe-to-say** — provisional warnings and over/under-confidence
3. **Court line** — hearing-safe export lines
4. **CPS chase** — disclosure requests and omissions
5. **Client summary** — plain-English client-facing points
6. **Proof receipt** — provenance rows and safe actions
7. **Source linkage** — document and page anchors match bundle
8. **Surface discipline** — CPS / court / client kept distinct; no harmful repetition

---

## Per-surface criteria

### Missing material

| Score | Criteria |
|-------|----------|
| P | All **must** gaps flagged; no false missing; priorities reasonable |
| R | One missed **may** or low-priority gap, or priority slightly off |
| F | False missing, missed **must** gap, or referred/not-in-bundle confused |

### Unsafe-to-say

| Score | Criteria |
|-------|----------|
| P | Required warnings present; no excessive hedging on supported points |
| R | One warning missing or slightly over-cautious but not misleading |
| F | Asserts unsafe fact, or suppresses critical provisional flag |

### Court line

| Score | Criteria |
|-------|----------|
| P | **Must** lines present; sourced; no chase/client leakage |
| R | Minor tone issue or one **may** line missing |
| F | Over-confident, wrong surface phrasing, or missing **must** line |

### CPS chase

| Score | Criteria |
|-------|----------|
| P | **Must** chases present; no unnecessary duplicates |
| R | One chase wording issue or borderline unnecessary item |
| F | Chases served material, misses **must** chase, or duplicates materially |

### Client summary

| Score | Criteria |
|-------|----------|
| P | Plain English; calibrated confidence; **must** points present |
| R | Slightly thin or cautious but not misleading |
| F | Too confident, too technical, or CPS/court phrasing leaked in |

### Proof receipt

| Score | Criteria |
|-------|----------|
| P | **Must** lines anchored; partial/referred states correct |
| R | One weak anchor or missing **may** receipt row |
| F | Wrong source, false "present", or implies solicitor approval |

### Source linkage

| Score | Criteria |
|-------|----------|
| P | Page/document anchors match manual read for **must** lines |
| R | One **may** line anchor weak or approximate page |
| F | Wrong document type, wrong page, or missing anchor on **must** line |

### Surface discipline

| Score | Criteria |
|-------|----------|
| P | Channels distinct; repetition only where purposeful |
| R | Minor repetition or small tone bleed |
| F | Chase on court, client summary on CPS, or confusing duplication |

---

## Overall case score

Derive overall from surface scores:

| Rule | Overall |
|------|---------|
| Any surface **F** on missing material, unsafe-to-say, or source linkage | **F** overall |
| Any surface **F** on other surfaces and none above | **R** overall (unless two or more **F** → **F**) |
| All surfaces **P** | **P** overall |
| Mix of **P** and **R**, no **F** | **R** overall |
| Truth state or bundle unresolved | **H** hold |

**Gold promotion rule:** Overall **P** required on at least two consecutive review runs, with no open **high** severity false-positive issues, and recorded solicitor review for the controlled bundle comparison.

---

## False-positive severity → score impact

From [FALSE_POSITIVE_REVIEW_FORM.md](./FALSE_POSITIVE_REVIEW_FORM.md):

| Severity | Typical surface impact |
|----------|------------------------|
| High | **F** on affected surface; blocks gold |
| Medium | **R** on affected surface; may block gold if on missing material or unsafe-to-say |
| Low | Note only; **P** or **R** at reviewer discretion |

### High-severity examples

- Called served material missing
- Asserted identification or attribution not supported by bundle
- CPS chase for material clearly in bundle
- Court line states guilt inference or plea advice
- Proof receipt links to wrong document for a **must** line

### Medium-severity examples

- Over-warned on a supported MG5 point
- Missed one **may** chase item
- Client summary slightly too cautious
- Repeated same gap on three surfaces without added value

### Low-severity examples

- Wording preference
- Approximate page anchor when excerpt is correct
- Minor repetition between client summary and court line where both need the fact

---

## Pack-level rollup

Track across the full gold manual proof pack (20–50 cases):

| Metric | Target (minimum pack) | Target (full 50) |
|--------|----------------------|------------------|
| Cases scored (not hold) | ≥ 18 | ≥ 45 |
| Overall pass rate | ≥ 70% | ≥ 80% |
| False missing rate (any case) | 0% on gold-promoted cases | 0% |
| Surface confusion rate | ≤ 10% of cases | ≤ 5% |
| Source linkage fail rate | ≤ 15% of cases | ≤ 10% |

**Gold-promoted case:** status = gold in case record; solicitor review completed flag set.

---

## Scoring worksheet (per case)

| Surface | P / R / F / H | Issue IDs | Notes |
|---------|---------------|-----------|-------|
| Missing material | | | |
| Unsafe-to-say | | | |
| Court line | | | |
| CPS chase | | | |
| Client summary | | | |
| Proof receipt | | | |
| Source linkage | | | |
| Surface discipline | | | |
| **Overall** | | | |

---

## Record-keeping

- Store completed worksheets with the local case folder (gitignored).
- Commit only spec and templates from `docs/gold-manual-proof-pack/`.
- Do not commit run output or reviewer notes containing real client data.

---

## Claim discipline

Scoring describes alignment with **expected output on a controlled bundle** under gold manual review. It does **not** certify:

- real-world accuracy on live matters
- solicitor approval of production workflows
- fitness for court submission without independent review

Use wording: **gold manual review**, **controlled bundle**, **solicitor review required**.
