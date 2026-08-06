# Phase 7 checkpoint — extraction and provenance boundary

**Status:** BOUNDARY CONTRACTS PASS — **not a corpus PASS**  
**Boundary version:** 1.0.0  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Programme requirements covered

| Requirement | Evidence |
|-------------|----------|
| Keep source excerpt / title / status / explanation / action separate | `ExtractionProvenanceBlockV1` + `buildExtractionProvenanceBlock` |
| Never use truncated excerpt as title | `isTruncatedExcerptUsedAsTitle` / `boundary.truncated_excerpt_as_title` |
| Detect incomplete quotations; omit safely | `detectIncompleteQuotation` / `boundary.incomplete_quotation` |
| Deduplicate aliases before display | `dedupeDisplayLabels` via evidence-alias-dedupe |
| Prevent raw extraction syntax reaching UI | boundary + shared validator fail-closed |

Chase court/chase composers now assert safe titles and thread `sourceEvidenceId` before structured compose.

## Contracts

| Check | Result |
|-------|--------|
| fields_remain_separate | PASS — title=Phone extraction; id=ev_64ea354e89ccd25c; deduped=1 |
| truncated_excerpt_not_title | PASS — truncated detector |
| incomplete_quotation_detected | PASS — incomplete quote |
| raw_syntax_detected | PASS — raw marker |
| boundary_blocks_raw_and_omits_incomplete_quote | PASS — boundary.incomplete_quotation,boundary.raw_extraction_syntax |
| canonical_fingerprint_stable_after_alias_dedupe | PASS — v1.0.0:d6c7401bd05e4f36b6e6808b |
| materialised_raw_strings_copy_fail_closed | PASS — scannedCases=500; rawCopyBlocked=1 |
| central_surfaces_unchanged_count | PASS — central=31 |

All contracts pass: **true**

## Materialised scan (unit: per_string_scan_hit)

| Metric | Count |
|--------|------:|
| Cases scanned | 500 |
| Raw strings copy-blocked | 1 |
| Trunc-as-title candidates | 55 |
| Incomplete quotations detected | 57 |

## Occurrence ledger regression

| Metric | Value | Unit |
|--------|-------|------|
| Phase 6 ledger status | LEDGER_BALANCED | — |
| Prior 72 raw balanced | true | rule-firing occurrences |
| Prior 28 trunc balanced | true | rule-firing occurrences |
| Current 42 raw | 42 | per-string copyable hits |
| Current 55 trunc | 55 | per-string copyable hits |

**Do not mix units.** Phase 7 ledger impact: none (no re-count).

## Remaining risks

- Not all UI surfaces yet render ExtractionProvenanceBlockV1 slots separately (chase still renders composed prose after boundary check)
- defence-plan-chat eval joins remain gated legacy composer
- Phase 4 uncertain-family residual still DEFERRED_TO_PHASE_9_11
- Full N-case corpus (Phase 9) and rendered coverage (Phase 11) not started

## Explicit non-goals

No merge. No deploy. No Phase 8+. No whole-programme PASS. Stop here for review.

Artefact: `artifacts/casebrain-qa/integrity-programme/phase-7/phase7-boundary-report.json`
