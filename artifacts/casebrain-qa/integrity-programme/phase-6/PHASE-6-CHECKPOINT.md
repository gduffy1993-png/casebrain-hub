# Phase 6 checkpoint — final validator & canonical migration

**Status:** CLOSED — LEDGER_BALANCED (acknowledged)  
**Closed at:** 2026-07-21 (human ack)  
**Phase 4 status at close:** was safe-but-unresolved (resolution continues as next work unit)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

Occurrence-level reconciliation: `docs/integrity-programme/phase-6-occurrence-ledger-balance.md` and `artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json`.

## Unit definitions (locked)

| Figure | Unit |
|-------|------|
| Prior 72 / 28 | `copyable_exportable_rule_firing_occurrence` (fixture × copy/api mode) |
| Current 42 / 55 | `per_string_copyable_hit` |
| Do not subtract across units | 55−28 and 72−42 are invalid comparisons |

## Prior 72 raw → dispositions

Reconstructed **72/72**. Totals: reconstructed 35 · safely_omitted 1 · proven_duplicate 36.  
Index: `prior-72-raw-occurrence-index.tsv`.

## Prior 28 trunc ↔ current 55 trunc

Reconstructed P3 **28/28**. Unique fixtures: **14** (= 28÷2 dual-mode).  
Of 55 P5 per-string hits: **14** baseline correspondent · **41** newly discovered.  
**Do not use 55−28=27.** Indexes: `prior-28-trunc-occurrence-index.tsv`, `current-55-trunc-source-index.tsv`.

## Canonical migrations completed

- confidence_dashboard → CanonicalMatterStateV1 counts + fingerprint
- overview-presentation countEvidenceStates* → canonical adapter (deprecated independent algorithm)
- solicitor-matter-state → build from canonical; fingerprint = canonical.fingerprint

Independent calculators remaining at Phase 6 close: **none**.

## Validator coverage by surface

Shared validator on all **31** central surfaces (incl. `api_defence_plan_chat`).  
Inventoried **51**; excluded **20** (non-wording / parent-covered / gate=none).

## Explicit non-goals retained

No UX redesign. No merge. No deploy. Programme continues to Phase 4 residual resolution then Phase 7.
