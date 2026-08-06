# Control exercise audit — 24 V1 controls (honest reclassification)

The prior claim "24 controls exercised" means 24 V1 registry controls were INVOKED via runAllControls against the live-surface adapter. This audit reclassifies each control by actual finding outcomes and detector substance. Phrase-proxy / negative-scan lanes are not treated as full substantive exercise. Auth HTTP and browser workflows remain NOT_EXERCISED.

## Counts

- Claimed invoked: **24**
- Honest fully_exercised: **11**
- Honest partially_exercised: **8**
- Honest not_exercised: **5**
- Phrase-proxy / negative-scan: **6**
- Invoked but not exercised: **5**
- Substantive detector class: **13**

## Special attention

### MAA-LEGAL-CURRENTNESS
- Honest status: **partially_exercised** (claimed: partially_exercised)
- Class: phrase_proxy_or_negative_scan
- Note: Phrase/proxy: regex for Act/OAPA/PACE/Theft Act/PFHA on allegation only; no controlled offence registry trace. Mostly not_exercised; unresolved when citation-like text present. Not a full legal-currentness exercise.

### MAA-SECURITY-PRIVACY
- Honest status: **partially_exercised** (claimed: fully_exercised)
- Class: phrase_proxy_or_negative_scan
- Note: Phrase/proxy negative scan: INTERNAL_LEAK_RE / FIXTURE_PATH_RE over surface text; absence yields pass. Does not exercise auth, ACL, PII redaction pipeline, or storage controls.

### MAA-HUMAN-SUPERVISION
- Honest status: **partially_exercised** (claimed: fully_exercised)
- Class: phrase_proxy_or_negative_scan
- Note: Phrase/proxy negative scan: detects fabricated sign-off language only; absence yields pass. Does not exercise an actual human reviewer workflow; human fields remain blank.

### MAA-BIAS-FAIRNESS
- Honest status: **partially_exercised** (claimed: fully_exercised)
- Class: phrase_proxy_or_negative_scan
- Note: Phrase/proxy negative scan: PREJUDICE_RE over concatenated text; absence yields low-confidence pass. Explicitly does not prove fairness.

## Per-control register

### MAA-INGEST-COVERAGE — Ingestion coverage and extraction quality
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-INGEST-COVERAGE`
- Prerequisites: `SavedCaseMaterialisation.inputBundlePath (or adapter equivalent)`; `projectForControlAdapter from live surfaces`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#ingestion, lib/upload/pdf-page-units.ts, lib/criminal/compiled-bundle-segmentation.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-DOC-LIFECYCLE — Document identity and lifecycle without unsafe collapse
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-DOC-LIFECYCLE`
- Prerequisites: `truthMapRows with draft vs signed/final language signals`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=1 PE=0 NE=19
- Behavioural contract refs: scripts/foundation-hardening-contracts.test.ts, lib/criminal/document-relationship-model.ts, lib/eval/assurance/controls.ts
- Finding/result: findings=20 pass=1 defect=0 unresolved=0 containment=0 NE-findings=19; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (substantive_detector)

### MAA-PARTIES-ATTRIBUTION — Parties and attribution separation
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-PARTIES-ATTRIBUTION`
- Prerequisites: `multi-party / attribution rows on packet (often absent on single-defendant strategy adapter)`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=0 PE=0 NE=20
- Behavioural contract refs: scripts/malik-shared-root-remediation-round2-contracts.test.ts, lib/criminal/attribution-model.ts
- Finding/result: findings=20 pass=0 defect=0 unresolved=0 containment=0 NE-findings=20; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **not_exercised** (invoked_but_not_exercised)

### MAA-CHARGE-MODEL — Charge model exact wording and precedence
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-CHARGE-MODEL`
- Prerequisites: `allegation and/or charges[] on adapter packet`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/scale3000-run-v9-acceptance-contracts.test.ts, lib/criminal/solicitor-charge-model.ts, lib/criminal/structured-charge-state.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-EVIDENCE-STATE — Evidence-state distinct units
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-EVIDENCE-STATE`
- Prerequisites: `evidence-state distinct units on truth map / evidence rows`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=0 PE=0 NE=20
- Behavioural contract refs: scripts/malik-shared-root-remediation-contracts.test.ts, lib/criminal/evidence-state-reconcile.ts, lib/criminal/evidence-state-canonical.ts
- Finding/result: findings=20 pass=0 defect=0 unresolved=0 containment=0 NE-findings=20; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **not_exercised** (invoked_but_not_exercised)

### MAA-CHRONOLOGY-HEARING — Chronology and hearing logic
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-CHRONOLOGY-HEARING`
- Prerequisites: `hearing/chronology surfaces or court line text`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/phase8-hearing-time.test.ts, lib/criminal/timestamp-chronology.ts, lib/criminal/hearing-notice-lifecycle.ts, lib/criminal/pace-affirmative-gate.ts
- Finding/result: findings=20 pass=16 defect=4 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-PROVENANCE — Exact provenance and unknown-page discipline
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-PROVENANCE`
- Prerequisites: `provenance lines / surface text with source linkage signals`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/foundation-hardening-contracts.test.ts, lib/criminal/finding-provenance.ts, lib/eval/assurance/controls.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-RELIABILITY — Reliability and limitations
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-RELIABILITY`
- Prerequisites: `reliability/limitation language on truth map or surfaces`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=10 PE=0 NE=10
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#reliability, lib/criminal/solicitor-visible-quality.ts
- Finding/result: findings=23 pass=13 defect=0 unresolved=0 containment=0 NE-findings=10; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (substantive_detector)

### MAA-COMPLETENESS — Completeness and truncation
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-COMPLETENESS`
- Prerequisites: `charge completeness / missing-item signals on surfaces`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/phase11-remediation.test.ts, lib/criminal/solicitor-visible-boundary.ts, lib/criminal/solicitor-visible-boundary-profiles.ts
- Finding/result: findings=96 pass=76 defect=0 unresolved=0 containment=20 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-DEFENCE-LENS — Defence lens without invented facts
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-DEFENCE-LENS`
- Prerequisites: `defence-oriented surface text (war room / key facts)`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#defence, lib/criminal/canonical-live-surface-adapter.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-PROSECUTION-LENS — Prosecution lens kept separate
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-PROSECUTION-LENS`
- Prerequisites: `prosecution-oriented surface text (often limited on defence adapter)`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=0 PE=0 NE=20
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#prosecution, lib/criminal/canonical-live-surface-adapter.ts
- Finding/result: findings=20 pass=0 defect=0 unresolved=0 containment=0 NE-findings=20; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **not_exercised** (invoked_but_not_exercised)

### MAA-JUDICIAL-LENS — Judicial/procedural lens
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-JUDICIAL-LENS`
- Prerequisites: `court_line / hearing readiness signal`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=0 PE=0 NE=20
- Behavioural contract refs: scripts/phase8-hearing-time.test.ts, lib/criminal/solicitor-hearing-status.ts
- Finding/result: findings=20 pass=0 defect=0 unresolved=0 containment=0 NE-findings=20; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **not_exercised** (invoked_but_not_exercised)

### MAA-LEGAL-CURRENTNESS — Legal propositions traceable to registry
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-LEGAL-CURRENTNESS`
- Prerequisites: `allegation string for Act/OAPA/PACE/Theft Act/PFHA regex only`; `NO offence-label registry cross-check in this detector path`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=1 PE=0 NE=19
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#legal, lib/criminal/offence-label-registry.ts
- Finding/result: findings=20 pass=0 defect=0 unresolved=1 containment=0 NE-findings=19; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (phrase_proxy_or_negative_scan)

### MAA-AUDIENCE-WORDING — Audience-separated wording
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-AUDIENCE-WORDING`
- Prerequisites: `client_summary surface text with audience disclaimer patterns`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=0 PE=0 NE=20
- Behavioural contract refs: scripts/scale3000-run-v9-acceptance-contracts.test.ts, lib/criminal/solicitor-visible-sanitization.ts
- Finding/result: findings=20 pass=0 defect=0 unresolved=0 containment=0 NE-findings=20; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **not_exercised** (invoked_but_not_exercised)

### MAA-ACTION-QUALITY — Solicitor action quality
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-ACTION-QUALITY`
- Prerequisites: `action/next-step signals on packet surfaces`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/foundational-shared-contracts.test.ts, lib/criminal/five-answers/build-five-answers-view.ts
- Finding/result: findings=20 pass=19 defect=1 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-CROSS-EXIT — Cross-exit consistency enforcement
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-CROSS-EXIT`
- Prerequisites: `multi-exit surface projections from live adapter`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/malik-shared-root-remediation-round2-contracts.test.ts, lib/criminal/cross-exit-contradiction-scanner.ts
- Finding/result: findings=21 pass=14 defect=7 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-CROSS-SURFACE — Cross-surface consistency
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-CROSS-SURFACE`
- Prerequisites: `multi-surface live packet (charges/war room/key facts/chase)`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/canonical-live-integration-contracts.test.ts, lib/criminal/canonical-live-surface-adapter.ts
- Finding/result: findings=201 pass=24 defect=0 unresolved=177 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-CHASE-QUALITY — Chase quality
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-CHASE-QUALITY`
- Prerequisites: `cpsChase / disclosure chase items`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/malik-shared-root-remediation-contracts.test.ts, lib/criminal/evidence-state-reconcile.ts, lib/criminal/cross-exit-contradiction-scanner.ts
- Finding/result: findings=94 pass=94 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-HALLUCINATION — Hallucination and overstatement
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-HALLUCINATION`
- Prerequisites: `surface text for absolute-proof phrase scan`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/malik-shared-root-remediation-round2-contracts.test.ts, lib/criminal/absolute-proof-wording.ts, lib/criminal/pace-affirmative-gate.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **fully_exercised** (substantive_detector)

### MAA-SECURITY-PRIVACY — Security and privacy leakage
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-SECURITY-PRIVACY`
- Prerequisites: `surface texts for INTERNAL_LEAK_RE / FIXTURE_PATH_RE negative scan only`; `NO auth/ACL/PII-pipeline exercise`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/scale3000-run-v9-acceptance-contracts.test.ts, lib/criminal/solicitor-visible-sanitization.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (phrase_proxy_or_negative_scan)

### MAA-RESILIENCE — Resilience and determinism
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-RESILIENCE`
- Prerequisites: `stable caseId on loaded packet (thin proxy)`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/canonical-finding-model-contracts.test.ts, lib/criminal/build-from-document-units.ts
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (phrase_proxy_or_negative_scan)

### MAA-OUTPUT-DESIGN — Output design (separate from factual defects)
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-OUTPUT-DESIGN`
- Prerequisites: `truthMapRows / cpsChase presence for urgent-signal design pass`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#design
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (phrase_proxy_or_negative_scan)

### MAA-HUMAN-SUPERVISION — Human supervision and governance
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-HUMAN-SUPERVISION`
- Prerequisites: `concatenated surface text for fabricated sign-off phrase scan only`; `NO actual human reviewer workflow`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#governance
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (phrase_proxy_or_negative_scan)

### MAA-BIAS-FAIRNESS — Bias and fairness flags
- Handler: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#MAA-BIAS-FAIRNESS`
- Prerequisites: `concatenated surface text for PREJUDICE_RE negative scan only`; `does not prove fairness`; `projectForControlAdapter`
- Denominator: 20 cases (pilot_matter_RP_xx); FE=20 PE=0 NE=0
- Behavioural contract refs: scripts/master-assurance-auditor-contracts.test.ts#bias
- Finding/result: findings=20 pass=20 defect=0 unresolved=0 containment=0 NE-findings=0; codes=[]
- Evidence: sample RP-01 / n/a / artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/bulk/receipts/RP-01.json
- Honest status: **partially_exercised** (phrase_proxy_or_negative_scan)

