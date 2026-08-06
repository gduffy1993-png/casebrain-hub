# Proposed remediation order (Stage-50 evidence-state)

STOP — triage only. Do not start Stage 150. Do not repair CaseBrain yet.

Frozen hash: `4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832`

## Counts

- confirmed_app_defect: **43**
- detector_false_positive: **22**
- unresolved_source: **21**
- truth_key_defect: **7**

## Order

### 1. Detector / binding fixes (false positives first)
- Address **22** detector_false_positive findings before any CaseBrain product repair.
- Priority families: F05 unit conflation, F06 MG6 clarification vs MG6 document, F07 recording≠transcript / unknown bindings, F08 co-defendant precision.
- Tighten truth-map row matching so aggregate/meta rows cannot bind to single evidence units.

### 2. Confirmed CaseBrain evidence-state defects
- Only after Codex accepts triage: remediate **43** confirmed_app_defect findings.
- Priority families: F01 MG6 referred-not-served mapped to missing; F02 'Referred only' label with incomplete existence.
- Do not broaden repair from offence-family heuristics.

### 3. Truth-key corrections
- Correct **7** truth_key_defect items (partial≠served; referred≠missing where source is clearer).
- Preserve frozen packets until a controlled truth-key change process is authorised.

### 4. Unresolved source — no app blame
- Leave **21** unresolved_source findings open; outstanding≠referred_only until source proves referred/listed/served.

### 5. Re-run / Stage 150
- Forbidden until Codex clearance of this triage.
- Stage 150 must not run.
