# Evidence-State Accuracy Audit

**Status:** Spec only — **not yet run** on unseen real-world bundles.  
**Do not build product UI until Ged explicitly says start.**

**Purpose:** Proof layer that measures whether CaseBrain correctly classifies evidence states against solicitor truth keys.

**Placement in roadmap:**

- After H5 workstation core is complete (chunks 1–4 shipped; remaining H5 slices per `docs/h5/H5_PRIORITY_REFERENCE.md`)
- Before wider rollout to 3–5 firms
- May start **internally** with anonymised/unseen bundles before design-partner scale

**Full plan context:** `docs/CRIMINAL_PILOT_MASTER_PLAN.md`

---

## Core metric: false-served rate

### Definition — false-served

CaseBrain marks evidence as **served**, **usable**, **relied-on**, **safe-to-send**, or **safe-to-say** when the solicitor truth key says that evidence is:

- `referred_only`
- `missing`
- `incomplete`
- `not_safely_confirmed`
- only inferred
- belongs to another defendant
- not actually in this bundle

### Target

**Near-zero false-served.** This is the dangerous failure mode.

### Important distinction

| Failure type | Severity |
|--------------|----------|
| **False-served** | Dangerous — must drive blocking fixes |
| **False-missing / over-cautious / needs-review** | Annoying but safer |
| **Industry-level evidence-state accuracy claim** | **Do not claim** until this audit has been run on unseen real-world bundles |

### Controlled proof (separate from this audit)

These gates measure **controlled** corpora and shapes — not unseen solicitor truth-key accuracy on real bundles:

- Level 1 corpus 2,200
- Golden 102
- Simulator 150 combined gate
- Bad Output Memory
- Export/copy gate
- Prod deploy smoke (Taylor/Jordan adversarial shapes)

None of the above substitutes for the Evidence-State Accuracy Audit on **unseen** bundles with independent truth keys.

---

## Audit stages

| Stage | Scope | Goal |
|-------|--------|------|
| **1 — Internal** | 30–50 unseen/anonymised bundles | Find false-served clusters; seed regression fixtures |
| **2 — Serious validation** | 100 unseen real-world bundles | Stratified accuracy baseline |
| **3 — Strong validation** | 250–300 unseen real-world bundles | Firm-scale confidence gate |
| **4 — Ongoing** | Every bad output | Regression fixture / Bad Output Memory rule |

---

## Sampling — stratified, not easy bundles

Stratify the audit sample by:

### Offence family

drugs / PWITS / conspiracy · violence · robbery · domestic / harassment · sexual / ABE · motoring / SJP · fraud · weapons · public order · youth · breach orders

### Evidence type

BWV · CCTV · custody / PACE · MG11 · MG5 · MG6C / MG6D · phone downloads · screenshots · Encro / encrypted comms · cellsite · forensic reports · medical evidence · ID evidence

### Evidence state (truth key)

served · referred_only · missing · incomplete · not_safely_confirmed

### PDF quality

native PDF · poor OCR · scanned · rotated · duplicated pages · out-of-order pages · index-only · mixed bundles · large messy bundles

### Case shape

single defendant · multi-defendant · co-defendant evidence · late disclosure · changed charge · corrected bundle · split bundles

---

## Truth-key workflow

1. Pick **unseen** bundle (not in golden/simulator/training sets used for gates).
2. Anonymise / remove sensitive identifiers where required.
3. Solicitor or caseworker reviews bundle **before** seeing CaseBrain output.
4. Reviewer completes truth key (template below).
5. CaseBrain processes the **same** bundle blind.
6. Compare CaseBrain output against truth key.
7. Score metrics (see Scoring metrics).
8. Second reviewer checks **20–30%** of sample.
9. Disagreements logged and resolved into final agreed truth key.
10. Failures become regression fixtures / Bad Output Memory rules / simulator cases as appropriate.

---

## Truth-key template fields

| Field | Notes |
|-------|--------|
| `audit_case_id` | Stable audit identifier |
| `offence_family` | Stratification bucket |
| `case_shape` | e.g. single defendant, co-def bleed risk |
| `pdf_quality` | OCR / scan / messy bundle tags |
| `evidence_item` | Human label for the line/item under test |
| `evidence_type` | BWV, MG11, etc. |
| `source_section` | MG6, statement, exhibit schedule, etc. |
| `page_or_anchor` | Page or anchor reference in bundle |
| `defendant_relevance` | This client / other defendant / unknown |
| `truth_state` | See allowed values below |
| `reliability_note` | Contested, partial, inference boundary |
| `chase_needed` | yes / no |
| `safe_to_rely_on` | yes / no |
| `safe_to_send` | yes / no |
| `expected_chase_wording` | If chase relevant |
| `expected_court_note` | If court line relevant |
| `must_not_say` | Hard don't-say lines |
| `reviewer_id` | Pseudonymous reviewer id |
| `second_reviewer_id` | QA reviewer |
| `disagreement_status` | none / open / resolved |
| `resolution_note` | How disagreement was closed |

### Allowed `truth_state` values

- `served`
- `referred_only`
- `missing`
- `incomplete`
- `not_safely_confirmed`
- `inferred_only`
- `other_defendant_only`

---

## Scoring metrics

| Metric | Description |
|--------|-------------|
| `false_served_rate` | **Primary** — served/usable when truth says otherwise |
| `referred_only_accuracy` | Correct handling of referred-only material |
| `missing_accuracy` | Missing items not treated as on file |
| `incomplete_accuracy` | Partial material not treated as complete |
| `not_safely_confirmed_accuracy` | Provisional boundaries respected |
| `unsafe_reliance_rate` | Reliance without source state |
| `wrong_defendant_bleed_rate` | Other defendant material on this client |
| `wrong_family_bleed_rate` | Offence-family template bleed |
| `chase_accuracy` | Chase items match truth key |
| `court_note_safety_rate` | Court lines safe per truth key |
| `client_summary_safety_rate` | Client-safe copy boundaries |
| `over_cautious_rate` | False-missing / excessive caution (track, not blocking-first) |
| `needs_review_rate` | Appropriate provisional labelling |
| `unresolved_disagreement_rate` | Truth-key QA backlog |

---

## Blocking failures

Any of the following is a **blocking** audit failure:

- referred-only evidence marked served / usable
- missing evidence marked served / usable
- incomplete evidence treated as complete
- inferred-only evidence stated as fact
- co-defendant evidence imported into wrong defendant
- wrong offence-family bleed
- unsafe win / collapse wording
- court wording copied into CPS chase
- safe-to-send without source state
- source state missing on a supposedly safe line

---

## Audit report layout

Each audit run produces a report with these sections:

### 1. Executive summary

- Total bundles audited
- False-served rate
- Unsafe reliance rate
- Overall pass / warning / block status

### 2. Evidence-state accuracy

- Served accuracy
- Referred-only accuracy
- Missing accuracy
- Incomplete accuracy
- Not-safely-confirmed accuracy

### 3. Risk metrics

- False-served
- Wrong-defendant bleed
- Wrong-family bleed
- Unsafe reliance
- Court / CPS wording confusion

### 4. Coverage breakdown

By offence family · evidence type · PDF quality · case shape · disclosure trap

### 5. Failure clusters

- Top repeated failure patterns
- Examples (sanitised)
- Affected offence / evidence types

### 6. Fix queue

- Blocking fixes
- Warning fixes
- Polish only

### 7. Regression conversion

- Failures → Bad Output Memory rules
- Failures → simulator cases
- Failures → golden truth-key cases

---

## Acceptance for implementation (future — not started)

When Ged approves build:

- Truth-key capture tooling (or structured spreadsheet → ingest)
- Blind run harness against same bundle set
- Scoring script emitting report layout above
- Regression fixture export into existing gate pipelines

**Out of scope until explicit go:**

- Brain 1 · Guardian · battleboard core · contradiction core · chase core
- H5 product UI changes for audit
- New simulator packs (unless explicitly requested for audit fixtures)

---

## Claims discipline

| Claim | Allowed now? |
|-------|----------------|
| Near-zero false-served on **unseen real-world** bundles | **No** — audit not run |
| Controlled gates green (2,200, golden 102, sim 150, BOM, export/copy, smoke) | **Yes** — separate proof layer |
| Audit spec locked and planned | **Yes** |
| Internal audit stage 1 started | **Only when first truth keys exist** |
