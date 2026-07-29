# Master Assurance Auditor — Stage-50 report

Run: `maa-50-2026-07-29T19-25-41-062Z`
Policy: `esa-stage50-sample-v1`
Ordered membership hash: `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832`
Status: **STOP_FOR_CODEX_REVIEW**
Programme PASS supported: **false**
allowedToProgress: **false**

## Freeze / input hash validation

- Before: OK (recomputed=4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832)
- After: OK (recomputed=4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832)
- Manifest/input hashes: OK
- Crashes: 0
- Corrupt records: 0
- Missing-field occurrences (freeze strata): 100

## Verdicts (separate)

- pass: 2095
- defect: 43
- unresolved: 868
- containment: 0
- not_exercised: 208

## Denominators (separate)

- Cases: 50
- Surfaces: 1587
- Finding occurrences: 3214
- Exact-string unique: 1151
- Template unique: 1133
- Surfaces with findings: 456
- Cases with findings: 50

## Findings by lane

- LANE-08-RELIABILITY: 1054
- LANE-17-CROSS-SURFACE: 733
- LANE-05-EVIDENCE-STATE: 309
- LANE-18-CHASE-QUALITY: 118
- LANE-01-INGESTION: 50
- LANE-02-DOCUMENT-IDENTITY: 50
- LANE-03-PARTIES-ATTRIBUTION: 50
- LANE-04-CHARGE-MODEL: 50
- LANE-06-CHRONOLOGY-HEARING: 50
- LANE-07-PROVENANCE: 50
- LANE-09-COMPLETENESS: 50
- LANE-10-DEFENCE-LENS: 50
- LANE-11-PROSECUTION-LENS: 50
- LANE-12-JUDICIAL-LENS: 50
- LANE-13-LEGAL-CURRENTNESS: 50
- LANE-14-AUDIENCE-WORDING: 50
- LANE-15-ACTION-QUALITY: 50
- LANE-16-CROSS-EXIT: 50
- LANE-19-HALLUCINATION: 50
- LANE-20-SECURITY-PRIVACY: 50
- LANE-21-RESILIENCE: 50
- LANE-22-OUTPUT-DESIGN: 50
- LANE-23-HUMAN-SUPERVISION: 50
- LANE-24-BIAS-FAIRNESS: 50

## Findings by offence-family bucket

- drugs: 462
- violence: 442
- motoring: 432
- fraud: 344
- mixed_generic: 274
- robbery: 221
- sexual: 195
- encro_digital: 188
- harassment_domestic: 127
- youth: 127
- other: 77
- breach: 70
- weapons: 67
- public_order: 65
- custody_pace: 65
- perverting: 58

## Findings by evidence-state flag (case strata)

- has_referred_only: 2874
- has_served: 2874
- has_missing: 2615
- has_not_safely_confirmed: 538
- has_inferred_only: 146
- has_incomplete: 74
- has_other_defendant_only: 72

## Findings by complexity

- complex: 2977
- moderate: 237

## Repeated shared-root families (≥3)

- **reliability_limitations** ×1054
- **cross_surface_consistency** ×733
- **evidence_state** ×290
- **chase_quality** ×118
- **ingestion_coverage** ×50
- **document_lifecycle** ×50
- **attribution_separation** ×50
- **charge_model** ×50
- **pace_false_affirmative** ×50
- **provenance_synthetic_page** ×50
- **completeness_disclaimer** ×50
- **defence_lens** ×50
- **prosecution_lens** ×50
- **judicial_lens** ×50
- **legal_currentness** ×50
- **audience_wording** ×50
- **action_quality** ×50
- **cross_exit_contradiction** ×50
- **hallucination_overstatement** ×50
- **security_privacy** ×50
- **resilience_determinism** ×50
- **output_design** ×50
- **human_supervision** ×50
- **bias_fairness** ×50
- **evidence_state_outstanding_alone** ×19

## Suspected detector false positives (not human-confirmed)

- Count: 10
- Note: humanConfirmationRate / detectorFalsePositiveRate remain unavailable until blinded dispositions are imported.

## Safety-critical candidates (not legal sign-off)

- Count: 861
- knownSafetyCriticalFn: null (unknown)
- sc-0002d / MAA-CHARGE-MODEL / unresolved / allegation_missing — No allegation/charge wording on saved packet.
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "CCTV full window / master footage" is raw "missing" (display "missing") but expected "referred_only"
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / outstanding_alone_unresolved — Outstanding alone on "CCTV continuity / export log — outstanding" does not prove referred_only. Actual="missing"; expect
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / outstanding_alone_unresolved — Outstanding alone on "ID procedure material — outstanding" does not prove referred_only. Actual="missing"; expected="ref
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / outstanding_alone_unresolved — Outstanding alone on "999 / CAD timing material — outstanding" does not prove referred_only. Actual="missing"; expected=
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / outstanding_alone_unresolved — Outstanding alone on "999 summary without audio recording — outstanding" does not prove referred_only. Actual="missing";
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "3. **MG5** — partial on export" is raw "incomplete" (display "incomplete") but expected "referred_on
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / expected_item_absent — Expected evidence item "cover / index" not bound to a canonical truth-map unit (weak_score): Best score 0.00 below bind 
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / expected_item_absent — Expected evidence item "mg6" not bound to a canonical truth-map unit (weak_score): Best score 0.00 below bind threshold 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "*Note:** Compare particulars with MG5 — dates/wording may conflict on export." missing/incomplete but n
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "=== SECTION: MG5 ===" missing/incomplete but no matching chase draft found under canonical identity.
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "3. **MG5** — partial on export" missing/incomplete but no matching chase draft found under canonical id
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "5. **MG11 officer** — partial on export" missing/incomplete but no matching chase draft found under can
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "## CONTRADICTION — incident timing — charge particulars vs MG5 narrative" missing/incomplete but no mat
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "*Source section:** Charge sheet / MG5 / witness material" missing/incomplete but no matching chase draf
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "*Source basis:** Particulars date: 14 March 2024 (charge sheet) conflicts with MG5 narrative: evening o
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "*Source A (Charge sheet particulars):** Particulars date: 14 March 2024 (charge sheet)" missing/incompl
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "## Disclosure chase (outstanding on export)" missing/incomplete but no matching chase draft found under
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "CCTV continuity / export log — outstanding" missing/incomplete but no matching chase draft found under 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "ID procedure material — outstanding" missing/incomplete but no matching chase draft found under canonic
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "999 / CAD timing material — outstanding" missing/incomplete but no matching chase draft found under can
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "999 summary without audio recording — outstanding" missing/incomplete but no matching chase draft found
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "| CCTV continuity / export log Outstanding Chase before fixing hearing position. |" missing/incomplete 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "| ID procedure material Outstanding Chase before fixing hearing position. |" missing/incomplete but no 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "| 999 / CAD timing material Outstanding Chase before fixing hearing position. |" missing/incomplete but
- sim-120 / MAA-CHARGE-MODEL / unresolved / allegation_missing — No allegation/charge wording on saved packet.
- sim-120 / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "lab report" is raw "missing" (display "missing") but expected "referred_only".
- sim-120 / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "Charge sheet | 1 |" missing/incomplete but no matching chase draft found under canonical identity.
- sim-120 / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "MG5 case summary | 2-3 |" missing/incomplete but no matching chase draft found under canonical identity
- sim-120 / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "Statement of Offence:" missing/incomplete but no matching chase draft found under canonical identity.

## Exit applicability (ESA)

- view: exercisable (50 cases)
- copy: exercisable (50 cases)
- export: not_exercised (0 cases)
- api: not_exercised (0 cases)
- pdf: not_exercised (0 cases)
- composed_prose: not_exercised (0 cases)

## Control exercise

- fully: 18
- partial: 4
- not_exercised: 2

## Stage-20 comparison

| Metric | Stage 20 | Stage 50 |
|---|---:|---:|
| pass | 629 | 2095 |
| defect | 0 | 43 |
| unresolved | 133 | 868 |
| containment | 0 | 0 |
| not_exercised | 37 | 208 |
| findings | 799 | 3214 |
| cases | 20 | 50 |

Note: stage 20 used gold-manual CASE-01..20; stage 50 uses frozen ESA sample — corpora differ; comparison is descriptive only.

## Remediation grouping (defects/containment only)

- **evidence_state** ×41 — Repair evidence-state reconcile or update gold after human review.
- **cross_exit_contradiction** ×1 — enforceCrossExitConsistency before surface emit.
- **cross_surface_consistency** ×1 — Suppress chase for served units; chase incomplete siblings only.

## Next command

```
npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=150  # refused until Codex clearance — do not run
```

Do not start stage 150 / commit / push / merge / deploy / remediate / claim PASS.
