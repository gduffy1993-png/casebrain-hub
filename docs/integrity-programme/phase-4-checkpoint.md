# Phase 4 checkpoint — offence-family concept registry

**Status:** REGISTRY + DUAL-LANE FAMILY CLASSIFICATION — **not a corpus PASS**  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

> CanonicalMatterStateV1 is **foundational but not fully migrated**. Do not claim one canonical truth until confidence dashboard, overview-presentation helpers, solicitor-matter-state, and every substantive output surface consume the canonical model or an explicit validated adapter.

## Registry

| Field | Value |
|-------|-------|
| Version | **1.0.0** |
| Module | `lib/criminal/offence-family-concept-registry/` |
| Tiers | allowed · conditional_provenance · forbidden · uncertain_fail_closed |

Source-backed / conditional allowance requires **structured provenance + evidence IDs**. Keyword presence in free-text hay alone does **not** activate another family.

Mixed-family: every activated family is recorded with activation source (allegation / evidence_item / audit / truth-key).

Scoped blocking: view mode can withhold only leaked lines; copy/API/export still fail closed on affected substantive output. One optional advanced leak must not wipe the whole matter view.

Scale copy/export block counts reflect **adversarial cross-family probes** run on every scale identity (containment proof). They are not a claim that all 3,000 generated bundles already emit those leak strings in production output. Process-only audit families that cannot be mapped remain **uncertain** (1,138) — unresolved, not passed by hiding.

Materialised gold lane remains in final evidence alongside scale and combined.

| Lane | Denom | Mixed | Uncertain | Conditional allowed | Unsupported blocked | Unique affected | Copy/export blocks |
|------|------:|------:|----------:|--------------------:|--------------------:|----------------:|-------------------:|
| Scale | 3000 | 0 | 1138 | 0 | 10712 | 3000 | 3000 |
| Materialised (gold) | 530 | 281 | 400 | 19 | 63 | 412 | 412 |
| Combined | 3530 | 281 | 1538 | 19 | 10775 | 3412 | 3412 |

### Family distribution — scale

| Family | Count |
|--------|------:|
| unknown | 1138 |
| harassment_digital | 478 |
| violence | 441 |
| theft | 421 |
| motoring | 191 |
| drugs_supply | 178 |
| harassment_other | 153 |

### Family distribution — materialised

| Family | Count |
|--------|------:|
| unknown | 400 |
| violence | 50 |
| motoring | 47 |
| harassment_digital | 23 |
| harassment_other | 8 |
| theft | 2 |

## Pending composer / provenance repair

| Metric | Value |
|--------|------:|
| Phase-3 copyable raw-marker occurrences | 72 |
| Phase-3 copyable truncated occurrences | 28 |
| Raw marker still blocked on copy | true |
| Truncated still blocked on copy | true |

These remain blocked pending later composer/provenance repair — **not** cleared by family registry work.

## False-positive review sample

18 mixed cases with residual unsupported blocks sampled for human review (see `false-positive-review-sample.json`).

## Migration plan — independent state calculators

Deadline: **no later than shared composer / validator phases (Phases 5–6)**.

1. `confidence_dashboard` local `countEvidenceStates` → canonical counts + fingerprint
2. `overview-presentation` count helpers → legacy-only; validated adapter at call sites
3. `solicitor-matter-state` → `projectCanonicalToLegacyMatterVm` only

## Correctly classified vs still unresolved

**Classified / enforced this phase**
- Harassment blocks unsupported drugs / vehicle / self-defence (adversarial)
- Source-backed mixed passes only with evidence IDs
- Keyword-alone activation rejected
- Missing family blocks substantive copy/API/export; neutral ack remains usable
- Scoped view withholding of leaked lines

**Still unresolved (not a PASS)**
- Full canonical migration of three independent calculators
- Composer repair for raw-marker / truncated copyable stock
- Scale lane uses audit-family probes (full generated wording not on disk for all 3000)
- Residual unsupported / uncertain counts above — hidden output ≠ correct output

## Explicit non-goals

No broad UX wording cleanup. No merge. No deploy. No claim that uncertain outputs being hidden equals PASS.
