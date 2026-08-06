# Master Assurance Auditor — Stage-50 report

Run: `maa-50-2026-07-29T18-48-49-771Z`
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

- pass: 1811
- defect: 93
- unresolved: 878
- containment: 0
- not_exercised: 209

## Denominators (separate)

- Cases: 50
- Surfaces: 1372
- Finding occurrences: 2991
- Exact-string unique: 1297
- Template unique: 1228
- Surfaces with findings: 455
- Cases with findings: 50

## Findings by lane

- LANE-08-RELIABILITY: 874
- LANE-17-CROSS-SURFACE: 710
- LANE-05-EVIDENCE-STATE: 287
- LANE-18-CHASE-QUALITY: 120
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

- drugs: 429
- violence: 422
- motoring: 390
- fraud: 317
- mixed_generic: 246
- robbery: 203
- encro_digital: 185
- sexual: 181
- youth: 117
- harassment_domestic: 116
- other: 75
- breach: 66
- weapons: 64
- public_order: 62
- custody_pace: 62
- perverting: 56

## Findings by evidence-state flag (case strata)

- has_referred_only: 2697
- has_served: 2697
- has_missing: 2441
- has_not_safely_confirmed: 507
- has_inferred_only: 132
- has_incomplete: 66
- has_other_defendant_only: 66

## Findings by complexity

- complex: 2790
- moderate: 201

## Repeated shared-root families (≥3)

- **reliability_limitations** ×874
- **cross_surface_consistency** ×710
- **evidence_state** ×287
- **chase_quality** ×120
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

## Suspected detector false positives (not human-confirmed)

- Count: 8
- Note: humanConfirmationRate / detectorFalsePositiveRate remain unavailable until blinded dispositions are imported.

## Safety-critical candidates (not legal sign-off)

- Count: 921
- knownSafetyCriticalFn: null (unknown)
- sc-0002d / MAA-CHARGE-MODEL / unresolved / allegation_missing — No allegation/charge wording on saved packet.
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "Full CCTV master footage — outstanding" is raw "missing" (display "missing") but expected "referred_
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "CCTV continuity / export log — outstanding" is raw "missing" (display "missing") but expected "refer
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "ID procedure material — outstanding" is raw "missing" (display "missing") but expected "referred_onl
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "999 / CAD timing material — outstanding" is raw "missing" (display "missing") but expected "referred
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "999 summary without audio recording — outstanding" is raw "missing" (display "missing") but expected
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / expected_item_absent — Expected evidence item "MG5 narrative" not found on truth map labels — unresolved without actual CaseBrain output to cit
- sc-0002d / MAA-EVIDENCE-STATE / unresolved / expected_item_absent — Expected evidence item "cover / index" not found on truth map labels — unresolved without actual CaseBrain output to cit
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "*Source section:** Charge sheet / MG5 / witness material" is raw "incomplete" (display "incomplete")
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "MG6 / unused schedule clarification" is raw "unknown" (display "unknown") but expected "served".
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "5. **MG11 officer** — partial on export" is raw "incomplete" (display "incomplete") but expected "se
- sc-0002d / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "6. MG11 witness (partial)" is raw "incomplete" (display "incomplete") but expected "served".
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "5. **MG11 officer** — partial on export" missing/incomplete but no matching chase draft found under can
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "*Source section:** Charge sheet / MG5 / witness material" missing/incomplete but no matching chase draf
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "3. MG5 (partial)" missing/incomplete but no matching chase draft found under canonical identity.
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "5. MG11 officer (partial)" missing/incomplete but no matching chase draft found under canonical identit
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "6. MG11 witness (partial)" missing/incomplete but no matching chase draft found under canonical identit
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "## Disclosure chase (outstanding on export)" missing/incomplete but no matching chase draft found under
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "CCTV continuity / export log — outstanding" missing/incomplete but no matching chase draft found under 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "ID procedure material — outstanding" missing/incomplete but no matching chase draft found under canonic
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "999 / CAD timing material — outstanding" missing/incomplete but no matching chase draft found under can
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "999 summary without audio recording — outstanding" missing/incomplete but no matching chase draft found
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "| CCTV continuity / export log Outstanding Chase before fixing hearing position. |" missing/incomplete 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "| ID procedure material Outstanding Chase before fixing hearing position. |" missing/incomplete but no 
- sc-0002d / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "| 999 / CAD timing material Outstanding Chase before fixing hearing position. |" missing/incomplete but
- sim-120 / MAA-CHARGE-MODEL / unresolved / allegation_missing — No allegation/charge wording on saved packet.
- sim-120 / MAA-EVIDENCE-STATE / unresolved / expected_item_absent — Expected evidence item "rotated lab summary" not found on truth map labels — unresolved without actual CaseBrain output 
- sim-120 / MAA-EVIDENCE-STATE / defect / state_mismatch — Evidence state for "MG6C/FUL — full lab report — referred on MG6 — export not served." is raw "missing" (display "missin
- sim-120 / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "Statement of Offence:" missing/incomplete but no matching chase draft found under canonical identity.
- sim-120 / MAA-CROSS-SURFACE / unresolved / missing_not_chased — Truth map marks "=== SECTION: MG11 ===" missing/incomplete but no matching chase draft found under canonical identity.

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
| pass | 629 | 1811 |
| defect | 0 | 93 |
| unresolved | 133 | 878 |
| containment | 0 | 0 |
| not_exercised | 37 | 209 |
| findings | 799 | 2991 |
| cases | 20 | 50 |

Note: stage 20 used gold-manual CASE-01..20; stage 50 uses frozen ESA sample — corpora differ; comparison is descriptive only.

## Remediation grouping (defects/containment only)

- **evidence_state** ×93 — Repair evidence-state reconcile or update gold after human review.

## Next command

```
npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=150  # refused until Codex clearance — do not run
```

Do not start stage 150 / commit / push / merge / deploy / remediate / claim PASS.
