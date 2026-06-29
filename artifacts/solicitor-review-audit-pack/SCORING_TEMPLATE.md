# CaseBrain Scoring Template — Solicitor-Reviewed Audit

> **For use after independent truth keys are returned.**  
> **Solicitor-reviewed audit has not yet run. No real-world false-served claim until completed.**  
> **Controlled/synthetic audit (253 cases, 0 false-served) is a separate layer.**

---

## Purpose

Compare CaseBrain H5 output (evidence states, chase, export surfaces) against **solicitor-marked truth keys** and report metrics below. Warnings should remain **visible** — do not hide unmatched items to improve scores.

---

## Core safety metrics (blocking if failed)

| Metric | Definition | Blocking threshold |
|--------|------------|-------------------|
| **false_served_rate** | Non-served truth (referred/missing/incomplete/inferred/co-def-only) marked as **served** in output | **Any confirmed false-served** → investigate; batch threshold TBD with reviewer |
| **wrong_defendant_bleed_rate** | Co-defendant / other-defendant material attributed to primary defendant workflow | **Any confirmed bleed** on send/chase/client surfaces |
| **unsafe_reliance_rate** | Item marked not safe to rely/send but output implies reliance or safe send | Review each instance |
| **no_source_safe_line_count** | Court/CPS/client “safe” or sendable lines without source state support | **Any** on export surfaces |

---

## State accuracy metrics (by truth state)

| Metric | Definition |
|--------|------------|
| **referred_only_accuracy** | Truth = referred_only → output must not treat as served |
| **missing_accuracy** | Truth = missing → output flags outstanding/chase; not served |
| **incomplete_accuracy** | Truth = incomplete → output not full-served; partial labelled |
| **not_safely_confirmed_accuracy** | Truth = not_safely_confirmed → output provisional/unknown |
| **inferred_only_accuracy** | Truth = inferred_only → output must not state inference as fact |

Report **per state** and **overall matched rate**.

---

## Chase and family metrics

| Metric | Definition |
|--------|------------|
| **chase_accuracy** | Solicitor `expected_chase_item` labels found on appropriate chase surfaces (with family mapping tolerance documented) |
| **wrong_family_bleed_rate** | Chase/summary routes wrong offence family (e.g. fraud template on motoring) |
| **over_cautious_rate** | Truth = served and clear, but output marks missing/unknown (acceptable if noted; track separately) |

---

## Export surface safety (per case)

Check each surface where implemented:

| Surface | Checks |
|---------|--------|
| **CPS chase** | No court wording; no referred/missing as served; no co-def import |
| **Court note** | Provisional; source-linked; solicitor review gate |
| **Client summary** | No overconfidence; no inference as fact |
| **Hearing mode / Today** | No unsafe win language |
| **Export pack** | Sendability matches matter confidence |
| **Confidence dashboard** | Badges match source states |

Record: **pass / review / fail** per surface per case.

---

## Report table (per case)

| Field | Value |
|-------|-------|
| audit_case_id | |
| solicitor_truth_key_version | |
| evidence_items | |
| matched | |
| unmatched | |
| false_served | |
| blocking_failures | |
| warnings | |
| chase_accuracy | |
| export_surface_flags | |
| reviewer_confidence | |
| notes | |

---

## Batch summary (30–50 case pilot)

| Metric | Target reporting |
|--------|------------------|
| Cases reviewed | |
| Evidence items | |
| false_served_count | **Must be reported honestly** |
| blocking_failure_count | |
| Mean chase_accuracy | |
| Wrong-defendant bleed | |
| Top warning clusters | |

---

## Claims discipline

**May say after pilot (if results support):**

- “On [N] solicitor-reviewed anonymised cases, false-served was [X]” (with methodology)

**May not say until completed:**

- Near-zero false-served on all real-world bundles  
- Industry-level proof  
- Solicitor audit “complete” at scale  

**Always say:**

- Controlled audit (253 synthetic) exists **separately**  
- Solicitor-reviewed audit scope and limits  

---

## Internal use

Scoring is run with the existing evidence-state audit harness adapted to solicitor truth keys. **Do not share** harness source, rule tables, or Brain/Guardian internals with reviewers.
