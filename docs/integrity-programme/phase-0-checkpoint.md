# Phase 0 checkpoint — corpus discovery & baseline

**Status:** DISCOVERY COMPLETE — not a PASS  
**Generated:** 2026-07-20T23:46:20.464Z  
**Branch:** programme/criminal-defence-integrity-corpus  

## N (approved corpus)

| Metric | Count |
|--------|------:|
| **N_approved_scale3000** (programme full-run identity list) | **3000** |
| N_materialised_truth_keys (on-disk baseline scan) | 530 |
| N_union_all_lanes (deduped across catalogs) | 3530 |

Lane counts: messy=3000, ESA=530, fidelity_gold=102, family40=0 (confirmed=0), demo_templates=5, h4=322.

## Coverage gaps (summary)

- Missing declared/resolved family: 0
- Uncertain/mixed family: 602
- No hearing metadata in catalog: 3530
- No MG11 metadata in catalog: 3000
- Not materialised on disk: 3000
- Missing required family coverage signals: (none detected by keyword)

Top families: mixed-defendant=174, robbery-cctv=169, youth-vulnerability=168, layout-ocr-duplication=149, fraud-bank-device=149, drugs-county-lines=138, phone-attribution=138, index-contradiction=133, abe-first-account-third-party=123, public-order-bwv=118, encro-handle-attribution=116, custody-pace=116

## Baseline failure clusters (current code)

Total baseline hits: **2964** across **499** fixtures (truth-key labels + casebrain-output strings only; no fixture mutation).

| Rank | Rule ID | Count | Surfaces |
|-----:|---------|------:|----------|
| 1 | sentence.raw_extraction_marker | 2351 | casebrain_output.strings, truth_key.labels |
| 2 | sentence.truncated_fragment | 411 | casebrain_output.strings |
| 3 | family.wrong_term.drugs_supply_PWITS | 94 | truth_key.labels, casebrain_output.strings |
| 4 | sentence.contradictory_clause | 42 | casebrain_output.strings |
| 5 | family.wrong_term.drugs_possession | 35 | casebrain_output.strings |
| 6 | family.wrong_term.pwits | 28 | truth_key.labels |
| 7 | sentence.unresolved_placeholder | 2 | casebrain_output.strings, truth_key.labels |
| 8 | family.wrong_term.intent_to_supply | 1 | truth_key.labels |

## Root-cause map (preliminary)

1. **Composition / punctuation** — `sentence.malformed_punctuation`, truncations, raw markers → shared composer (Phase 5–6).
2. **Offence-family bleed** — `family.wrong_term.*` → concept registry + fail-closed (Phase 4).
3. **Catalog sparsity** — many scale3000 IDs lack materialised truth-keys → need generation harness for full N runs (Phase 9).
4. **Metadata gaps** — hearing/MG11 often unset in catalogs → canonical matter model (Phase 3).

## Preserved prior work

Cherry-picked into this branch: solicitor output integrity gate (copy/deep fail-closed, offence-family helper, sentence composer, matter-state VM, hearing status).

## Next checkpoint

Phase 1 — machine-readable inventory of every solicitor output pathway.

## Artefacts

- `artifacts/casebrain-qa/integrity-programme/phase-0/corpus-manifest.json`
- `artifacts/casebrain-qa/integrity-programme/phase-0/corpus-catalog.json`
- `artifacts/casebrain-qa/integrity-programme/phase-0/coverage-gaps.json`
- `artifacts/casebrain-qa/integrity-programme/phase-0/baseline-failures.json`
- `artifacts/casebrain-qa/integrity-programme/phase-0/baseline-failure-clusters.json`
