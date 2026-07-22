# Phase 3 checkpoint — canonical matter model + dual-lane evidence

**Status:** CANONICAL MODEL + DUAL-LANE REPORTING — not a corpus PASS  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Canonical schema and version

| Field | Value |
|-------|-------|
| Schema | `CanonicalMatterStateV1` |
| Version | **1.0.0** |
| Module | `lib/criminal/canonical-matter-state/` |
| Fingerprint | SHA-256 prefix over counts, IDs, family, hearing, mg11, attribution |

Stable evidence IDs: `ev_<hash>` from label+existence. Stable chase IDs: preserve input id or `ch_<hash>`.

## Legacy adapters

- `adaptFiveAnswersAndChaseToCanonical` — five-answers rows + chase brief → v1
- `adaptTruthKeyEvidenceToRows` — ESA truth-key evidence → rows
- `projectCanonicalToLegacyMatterVm` — canonical → legacy `SolicitorMatterStateVm`

## Surfaces migrated

- Overview / Five Answers snapshot boxes consume canonical evidence counts + echo `data-canonical-fingerprint`
- Gate tighten: substantive copy/export/api without family → `offence_family_uncertain`
- HTTP-200 `integrity_blocked` consumers: Control Room assistant, Defence Plan chat, Client Advice, Letter generator, Hearing Prep, First Disclosure Request

## Surfaces still deriving state independently

- Confidence dashboard local `countEvidenceStates`
- `overview-presentation` count helpers (legacy; Overview UI path now prefers canonical)
- `solicitor-matter-state` display counts via overview-presentation

## Cross-surface fingerprint results

| Check | Result |
|-------|--------|
| Rebuild equality (materialised) | PASS |
| Fixtures checked | 530 |
| Distinct fingerprints | 6 |
| Compatibility failures | 0 |

## Dual-lane corpus results (all reported)

| Lane | Denominator | Occurrences | Unique cases affected | Copyable/exportable occurrences |
|------|------------:|------------:|----------------------:|--------------------------------:|
| Scale (generated) | 3000 | 0 | 0 | 0 |
| Materialised (gold) | 530 | 3866 | 500 | 902 |
| Combined unique | 3530 | 3866 | 500 | 902 |

Materialised gold lane remains in final release evidence (not excluded because scale denominator is 3000).

**Scale evidence mode:** generated caseIds are not fully materialised on disk for solicitor-wording re-scan. Scale lane therefore reports (a) controlled-3000 hard-safety counters, (b) 31-surface contract sample (31 block / 31 pass). Baseline Phase-0 wording findings are gold/materialised IDs — they appear under the materialised and combined lanes, not as scale caseId hits.

Controlled-3000 hard safety failures (prior scale harness): **0**  
Scale surface-contract sample: **31 blocked / 31 passed**

## Occurrence vs unique-case (top clusters, combined)

| Rule | Occurrences | Unique cases | Unique surfaces | Copyable/exportable |
|------|------------:|-------------:|----------------:|--------------------:|
| `sentence.raw_extraction_marker` | 2423 | 493 | 4 | 72 |
| `offence_family_uncertain` | 792 | 396 | 2 | 792 |
| `sentence.truncated_fragment` | 439 | 407 | 3 | 28 |
| `family.wrong_term.drugs_supply_PWITS` | 94 | 92 | 2 | 0 |
| `sentence.contradictory_clause` | 50 | 38 | 3 | 8 |
| `family.wrong_term.drugs_possession` | 35 | 27 | 1 | 0 |
| `family.wrong_term.pwits` | 28 | 27 | 1 | 0 |
| `sentence.unresolved_placeholder` | 2 | 2 | 2 | 0 |
| `wrong_family.unsupported_template_leakage` | 2 | 1 | 2 | 2 |
| `family.wrong_term.intent_to_supply` | 1 | 1 | 1 | 0 |

## Surface contracts

All **31** central surfaces have blocked + safe contract coverage (`scripts/solicitor-surface-contract.test.ts`).

## Explicit non-goals

No broad UX wording cleanup. No merge. No deploy.
