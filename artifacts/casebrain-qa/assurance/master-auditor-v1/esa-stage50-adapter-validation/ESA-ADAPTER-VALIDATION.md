# ESA Stage-50 Adapter Validation (dry-run)

- **adapterId:** esa-local-materialised
- **corpusRoot:** artifacts/evidence-state-audit-local/cases
- **generatedAt:** 2026-07-29T18:28:32.900Z
- **dryRun:** true
- **controlsExecuted:** false
- **findingsGenerated:** false

## Membership / sufficiency

| Metric | Value |
|---|---:|
| Directories scanned | 530 |
| Accepted unique valid | **499** |
| Required for stage 50 | 50 |
| Rejected | 31 |
| Duplicates | 0 |
| Sufficient for stage 50 | **true** |

Adapter binding OK (≥50 unique valid cases).

## Hashes

Each accepted membership entry records independent SHA-256 for:
`bundle-text.md`, `casebrain-output.json`, `truth-key.json` (see JSON report).

## Surfaces / truth

| Metric | Value |
|---|---:|
| Surface count (all accepted) | 14587 |
| Truth expectation count | 3542 |
| Missing-field occurrences | 998 |

## Exit applicability

| Exit | Cases present | Status |
|---|---:|---|
| view | 499 | exercisable |
| copy | 499 | exercisable |
| export | 0 | not_exercised |
| api | 0 | not_exercised |
| pdf | 0 | not_exercised |
| composed_prose | 0 | not_exercised |

## Lane applicability

| Control | Lane | Status | Cases with required exit |
|---|---|---|---:|
| MAA-INGEST-COVERAGE | LANE-01-INGESTION | partial | 499 |
| MAA-DOC-LIFECYCLE | LANE-02-DOCUMENT-IDENTITY | partial | 499 |
| MAA-PARTIES-ATTRIBUTION | LANE-03-PARTIES-ATTRIBUTION | partial | 499 |
| MAA-CHARGE-MODEL | LANE-04-CHARGE-MODEL | partial | 499 |
| MAA-EVIDENCE-STATE | LANE-05-EVIDENCE-STATE | partial | 499 |
| MAA-CHRONOLOGY-HEARING | LANE-06-CHRONOLOGY-HEARING | partial | 499 |
| MAA-PROVENANCE | LANE-07-PROVENANCE | partial | 499 |
| MAA-RELIABILITY | LANE-08-RELIABILITY | partial | 499 |
| MAA-COMPLETENESS | LANE-09-COMPLETENESS | partial | 499 |
| MAA-DEFENCE-LENS | LANE-10-DEFENCE-LENS | partial | 499 |
| MAA-PROSECUTION-LENS | LANE-11-PROSECUTION-LENS | partial | 499 |
| MAA-JUDICIAL-LENS | LANE-12-JUDICIAL-LENS | partial | 499 |
| MAA-LEGAL-CURRENTNESS | LANE-13-LEGAL-CURRENTNESS | partial | 499 |
| MAA-AUDIENCE-WORDING | LANE-14-AUDIENCE-WORDING | partial | 499 |
| MAA-ACTION-QUALITY | LANE-15-ACTION-QUALITY | applicable | 499 |
| MAA-CROSS-EXIT | LANE-16-CROSS-EXIT | partial | 499 |
| MAA-CROSS-SURFACE | LANE-17-CROSS-SURFACE | partial | 499 |
| MAA-CHASE-QUALITY | LANE-18-CHASE-QUALITY | partial | 499 |
| MAA-HALLUCINATION | LANE-19-HALLUCINATION | partial | 499 |
| MAA-SECURITY-PRIVACY | LANE-20-SECURITY-PRIVACY | partial | 499 |
| MAA-RESILIENCE | LANE-21-RESILIENCE | partial | 499 |
| MAA-OUTPUT-DESIGN | LANE-22-OUTPUT-DESIGN | applicable | 499 |
| MAA-HUMAN-SUPERVISION | LANE-23-HUMAN-SUPERVISION | partial | 499 |
| MAA-BIAS-FAIRNESS | LANE-24-BIAS-FAIRNESS | partial | 499 |

## Rejected (sample)

- `demo-audit-01-phone-harassment`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-02-cctv-stills`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-03-bwv-custody`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-04-co-def-interview`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-05-encro-attribution`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-06-domestic-stalking`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-07-phone-ocr-trap`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-08-cctv-night-stills`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-09-cctv-index-only`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-10-bwv-public-order`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-11-custody-pace-ocr`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-12-multi-def-burglary`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-13-co-def-index-trap`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-14-encro-retail`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-15-county-lines-runners`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-16-fraud-bank-statements`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-17-fraud-transaction-export`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-18-motoring-sjp-thin`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-19-motoring-breath-specimen`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-20-domestic-harassment`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-21-historic-sexual-abe`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-22-youth-interview`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-23-duplicate-pages`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-24-missing-pages-index`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-25-charge-bundle-mismatch`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-26-phone-referred-metadata`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-27-custody-pace-missing`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-28-fraud-subscriber-trap`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-29-youth-yjs-material`: **missing_casebrain_output** — Missing casebrain-output.json
- `demo-audit-30-layout-hearing-date`: **missing_casebrain_output** — Missing casebrain-output.json
- `proof-pack-01`: **missing_bundle_text** — Missing bundle-text.md

## Do not

- run stage 50 / execute auditor controls / generate findings
- commit / push / merge / deploy / claim PASS
