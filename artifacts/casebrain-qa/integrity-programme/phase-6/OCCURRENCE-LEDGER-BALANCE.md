# Phase 6 — occurrence ledger balance & completion summary

**Status:** LEDGER_BALANCED  
**Phase 4:** safe-but-unresolved (not PASS)  
**PR #65:** do not merge / do not deploy / do not start Phase 7

## Unit definitions (do not mix)

| Figure | Unit | Meaning |
|-------|------|---------|
| Phase 3 **72** raw / **28** trunc | `copyable_exportable_rule_firing_occurrence` | fixture × mode (copy+api) when a ≤16-string batch gate fires the rule |
| Phase 5 **42** raw / **55** trunc | `per_string_copyable_hit` | each defective copy-blocked string (deeper walk) |
| Unique diagnostics | `unique_string_fingerprint` | distinct `len=N;hash=…` |
| Unique fixtures | `unique_fixture_id` | distinct ESA case ids |

**Never compute 55−28 or 72−42 as “new” counts — those are different units.**

## Prior 72 raw-marker occurrence map

| Metric | Value |
|--------|------:|
| Published Phase 3 | 72 |
| Reconstructed IDs | 72 |
| Balanced | true |
| Disposition totals | {"reconstructed":35,"proven_duplicate":36,"safely_omitted":1} |

Every reconstructed ID has disposition ∈ {reconstructed, safely_omitted, still_blocked, proven_duplicate, retired_route, no_longer_reproducible} with evidence.  
Full list: `artifacts/casebrain-qa/integrity-programme/phase-6/prior-72-raw-occurrence-index.tsv` and `occurrence-ledger-balanced.json` → `prior72RawMarkerMap.occurrences`.

Api-channel rows are **proven_duplicate** of the copy-channel sibling (dual-mode inflation). Copy-channel rows carry the migrate disposition of defects in the batch.

## Prior 28 trunc → current 55 trunc

| Lane | Unit | Count |
|------|------|------:|
| Phase 3 published / reconstructed | rule-firing occurrences | 28 / 28 |
| of which proven_duplicate (api) | rule-firing occurrences | 14 |
| of which primary (copy) | rule-firing occurrences | 14 |
| unique fixtures in P3 trunc | unique_fixture_id | 14 |
| Phase 5 current | per-string copyable hits | 55 |
| baseline correspondent (same fixture+diagnostic as P3) | per-string hits | 14 |
| additional on baseline fixtures | per-string hits | 0 |
| newly discovered (fixture not in P3 trunc set) | per-string hits | 41 |

Arithmetic on **same unit** (Phase 5 only): 14 + 0 + 41 = 55.

**Mapping the earlier 28:** each of the 28 P3 IDs is listed in `prior28TruncMap` with disposition (14× `safely_omitted` copy-channel + 14× `proven_duplicate` api-channel). Those 14 fixtures are the baseline. Of the **55** current string hits, **14** share fixture+diagnostic with that baseline; **41** are newly discovered on other fixtures. **55−28=27 is not a valid “new” count** (mixed units).

Full sources: `current-55-trunc-source-index.tsv`.

## Independent state calculators

| Calculator | Status |
|------------|--------|
| confidence_dashboard | migrated (fingerprint match=true) |
| overview-presentation | migrated_adapter_deprecated_independent (counts match=true) |
| solicitor-matter-state | migrated (fingerprint match=true) |
| Independent remaining | none |

## Canonical fingerprint consistency by surface

All **31** central gated surfaces require fingerprint echo / mismatch block via `validateSolicitorSurface`. Overview, confidence dashboard, and solicitor-matter-state emit `CanonicalMatterStateV1` fingerprint (1.0.0).

## Substantive vs non-substantive omissions

- Substantive omissions with review-required message: **56**
- Non-substantive (silent omit OK): **0**
- Silent loss prevented for substantive: **true**
- By kind: {"evidence_item":56}

## Validator coverage

- Inventoried surfaces (Phase 1): **51**
- Central gated + contract-covered: **31**
- Excluded from central list: **20** (parent shells, `gate=none` non-wording, or covered by parent Overview / shared copy gate — see JSON)

## Remaining legacy composers

- defence-plan-chat eval evidence string joins (gated; not fully structured-composer migrated)

## Explicit holds

No merge. No deploy. No Phase 7. Phase 4 not PASS.
