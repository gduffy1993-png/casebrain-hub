# Phase 4 checkpoint — offence-family concept registry

**Status:** UNRESOLVED ITEMS DISPOSITIONED — **not a corpus PASS**  
**Former status:** safe-but-unresolved  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

> Hidden or blocked output is not PASS. Residual uncertain-family correctness remains for Phase 9 (full corpus) and Phase 11 (rendered / human gold review).

## Disposition of former safe-but-unresolved items

| Item | Disposition | Ledger impact |
|------|-------------|---------------|
| independent_state_calculators | **RESOLVED** | none — calculator migration does not alter 72/28 or 42/55 stock units |
| composer_raw_trunc_stock | **RESOLVED** | Stock dispositions unchanged; units remain labeled. No re-count of Phase-3 aggregates. |
| scale_lane_audit_family_probes | **RESOLVED_AS_CONTAINMENT_PROOF** | none — scale probes are a separate counting lane from materialised stock 72/28 and 42/55 |
| residual_unsupported_uncertain_counts | **FAIL_CLOSED_WITH_RESIDUAL_RISK** | none — uncertain/unsupported are family-classification units, not raw/trunc stock units |
| human_fp_fn_signoff | **DEFERRED_TO_PHASE_9_11** | none |

### Evidence summary

#### independent_state_calculators
- Former: Full canonical migration of three independent calculators
- Disposition: **RESOLVED**
- Phase 6 migrated confidence_dashboard, overview-presentation adapters, solicitor-matter-state
- Re-verified: overview counts match=true
- matter VM fingerprint match=true
- dashboard fingerprint present=true

#### composer_raw_trunc_stock
- Former: Composer repair for raw-marker / truncated copyable stock
- Disposition: **RESOLVED**
- Phase 6 LEDGER_BALANCED status=LEDGER_BALANCED
- Prior 72 raw rule-firing occurrences reconstructed=72 balanced=true dispositions={"reconstructed":35,"proven_duplicate":36,"safely_omitted":1}
- Prior 28 trunc rule-firing occurrences reconstructed=28 balanced=true dispositions={"safely_omitted":14,"proven_duplicate":14}
- Current per-string hits remain labeled separately: raw=42 trunc=55 (do not mix with 72/28)

#### scale_lane_audit_family_probes
- Former: Scale lane uses audit-family probes (full generated wording not on disk for all 3000)
- Disposition: **RESOLVED_AS_CONTAINMENT_PROOF**
- Scale copy/export block counts are adversarial cross-family probes on every scale identity — containment proof only
- They are not a claim that all 3,000 generated bundles emit leak strings in production output
- Process-only audit families that cannot be mapped remain uncertain — fail-closed, not passed by hiding
- Materialised gold lane (530) remains in final evidence alongside scale (3000) and combined (3530)

#### residual_unsupported_uncertain_counts
- Former: Residual unsupported / uncertain counts — hidden output ≠ correct output
- Disposition: **FAIL_CLOSED_WITH_RESIDUAL_RISK**
- Materialised mixed=281 uncertain=400 overlap=196
- FP sample size=18; stratified samples=0
- Adversarial matrix allPass=true: harassment_blocks_unsupported_drugs_defence=PASS; keyword_alone_does_not_activate_foreign_family=PASS; missing_family_blocks_substantive_api=PASS; neutral_non_substantive_ack_usable=PASS; scoped_view_keeps_clean_line=PASS; conditional_requires_structured_provenance_ids=PASS; canonical_overview_counts_match=PASS; canonical_matter_vm_fingerprint=PASS; canonical_dashboard_fingerprint_present=PASS
- Substantive copy/API remain fail-closed when family uncertain; neutral ack usable; scoped view keeps clean lines
- Hidden/blocked output is not counted as repaired or PASS — residual risk tracked for Phase 9 corpus + Phase 11 rendered/human review

#### human_fp_fn_signoff
- Former: Larger corpus / rendered FP–FN reviews before Phase 4 PASS
- Disposition: **DEFERRED_TO_PHASE_9_11**
- Automated adversarial matrix and stratified samples are evidence of enforcement, not human gold sign-off
- Phase 9 full N-case corpus + Phase 11 rendered coverage / 30–50 gold human review remain the PASS gate for family correctness
- Phase 4 programme blockers (calculators, composer stock, probe methodology) are dispositioned above without claiming corpus PASS


## Adversarial matrix (re-verified)

| Check | Result |
|-------|--------|
| harassment_blocks_unsupported_drugs_defence | PASS — status=integrity_blocked; rules=wrong_family.unsupported_template_leakage |
| keyword_alone_does_not_activate_foreign_family | PASS — activated=harassment_digital; mixed=false |
| missing_family_blocks_substantive_api | PASS — status=integrity_blocked; rules=offence_family_uncertain |
| neutral_non_substantive_ack_usable | PASS — status=ok |
| scoped_view_keeps_clean_line | PASS — status=degraded; kept=1 |
| conditional_requires_structured_provenance_ids | PASS — withIds.conditional=2; keywordOnly.families=harassment_digital |
| canonical_overview_counts_match | PASS — schema=1.0.0 |
| canonical_matter_vm_fingerprint | PASS — v1.0.0:63b1c4bb2c2aa3ee1 |
| canonical_dashboard_fingerprint_present | PASS — v1.0.0:f0c60dbd31d57ed07 |

All matrix checks pass: **true**

## Unit reminder

| Figure | Unit |
|-------|------|
| Prior 72 / 28 | fixture × mode rule-firing occurrences |
| Current 42 / 55 | per-string copyable hits |
| Do not mix | true |

## Residual risks

- Materialised uncertain-family cases remain fail-closed until Phase 9/11 human FP–FN establishes acceptable rates
- Scale uncertain (process-only audit families) remain unresolved classification, not hidden PASS
- Defence-plan-chat eval joins still gated legacy composer (Phase 6 residual)

## Explicit non-goals

No merge. No deploy. No corpus PASS claim. No UX redesign. Continue to Phase 7 (extraction and provenance boundary).

Artefact: `artifacts/casebrain-qa/integrity-programme/phase-4/phase4-resolution-evidence.json`
