# Phase 6 checkpoint — final validator & canonical migration

**Status:** LEDGER BALANCED — checkpoint may close after human ack  
**Phase 4 status:** safe-but-unresolved (not PASS)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy / do not Phase 7)

Occurrence-level reconciliation (required): see `docs/integrity-programme/phase-6-occurrence-ledger-balance.md` and `artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json`.

## Unit definitions

| Figure | Unit |
|-------|------|
| Prior 72 / 28 | copyable_exportable_rule_firing_occurrence (fixture × copy/api mode) |
| Current 42 / 55 | per_string_copyable_hit |
| Do not subtract across units | 55−28 and 72−42 are invalid comparisons |

## Prior 72 raw → dispositions

Reconstructed **72** / published **72** (balanced=true). Totals: {"reconstructed":35,"proven_duplicate":36,"safely_omitted":1}.  
Index: `prior-72-raw-occurrence-index.tsv`.

## Prior 28 trunc ↔ current 55 trunc

Reconstructed P3 **28** / published **28** (balanced=true).  
P3 unique fixtures: **14** (= 28÷2 dual-mode).  
Of 55 P5 per-string hits: **14** baseline correspondent; **0** additional on baseline fixtures; **41** newly discovered.  
**Do not use 55−28=27.** Index: `prior-28-trunc-occurrence-index.tsv`, `current-55-trunc-source-index.tsv`.

## Canonical migrations completed

- confidence_dashboard → CanonicalMatterStateV1 counts + fingerprint (true)
- overview-presentation countEvidenceStates* → canonical adapter (deprecated independent algorithm)
- solicitor-matter-state → build from canonical; fingerprint = canonical.fingerprint

Independent calculators remaining: **none**.

## Validator coverage by surface

Shared validator on all **31** central surfaces (incl. `api_defence_plan_chat`).  
Inventoried **51**; excluded **20** (non-wording / parent-covered / gate=none) — listed in balanced ledger JSON.

## Fingerprint consistency

Overview counts match canonical; matter VM fingerprint = canonical; dashboard exposes fingerprint; mismatch blocks — see completion summary in balanced ledger.

## Omitted substantive vs non-substantive

Substantive with review-required: **56**. Non-substantive: **0**. Silent loss prevented: **true**.

## Remaining gated legacy composers

- defence-plan-chat eval evidence string joins (gated via shared validator; not fully structured-composer migrated)

## Explicit non-goals

No UX redesign. No merge. No deploy. No Phase 7. Phase 4 not declared PASS.
