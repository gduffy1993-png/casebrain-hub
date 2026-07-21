# Phase 10 checkpoint — mutation & adversarial injection

**Status:** CLOSED — MUTATION CONTRACTS PASS (containment) acknowledged (`a88878867`) — **not a corpus PASS** — **not a programme PASS**  
**Canonical schema:** 1.1.0  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Explicit wording

- **Killed mutant** = unsafe injection detected and blocked at the expected control.
- **Blocked ≠ repaired** — fail-closed / integrity-blocked is containment, not substantive wording repair.
- **Surviving safety-relevant mutant** blocks Phase 10 completion unless dispositioned with evidence + fail-closed control.

## Mutation summary

| Metric | Value |
|--------|------:|
| Total mutants | 30 |
| Killed | 30 |
| Survived | 0 |
| Could not exercise | 0 |
| Kill rate | 100.0% |
| Safety-relevant survivors | 0 |

## Inventory by category

| Category | Mutants | Killed | Survived | Unexercised |
|----------|--------:|-------:|---------:|------------:|
| truncation_omission | 3 | 3 | 0 | 0 |
| changed_substituted_wording | 3 | 3 | 0 | 0 |
| incorrect_offence_family | 3 | 3 | 0 | 0 |
| fingerprint_disagreement | 2 | 2 | 0 | 0 |
| missing_incorrect_provenance | 3 | 3 | 0 | 0 |
| alias_source_mismatch | 2 | 2 | 0 | 0 |
| hearing_date_time_errors | 3 | 3 | 0 | 0 |
| unsafe_copy_export_api_prose | 5 | 5 | 0 | 0 |
| gate_bypass_attempts | 2 | 2 | 0 | 0 |
| review_required_fail_closed | 3 | 3 | 0 | 0 |
| invariants | 1 | 1 | 0 | 0 |

## Surviving mutants

_None._

## Contracts

| Check | Result |
|-------|--------|
| schema_1_1_0_preserved | PASS — 1.1.0 |
| central_surfaces_31 | PASS — central=31 |
| phase6_ledger_untouched | PASS — status=LEDGER_BALANCED;42=42;55=55 |
| no_safety_relevant_survivors | PASS — safetySurvivors=none |
| mutation_inventory_nonempty | PASS — mutants=30;killed=30;survived=0;unexercised=0 |
| blocked_not_equated_to_repaired | PASS — all mutants carry blockedDoesNotMeanRepaired=true |

All contracts pass: **true**

## Ledger impact

| Metric | Value | Unit |
|--------|-------|------|
| Phase 6 ledger status | LEDGER_BALANCED | — |
| Prior 72 / 28 balanced | true/true | rule-firing occurrences |
| Current 42 / 55 | 42/55 | per-string copyable hits |
| Phase 10 impact | **none** | do not mix units |

## Remaining risks

- Blocked mutants prove containment, not substantive wording repair
- Scale lane still lacks full on-disk solicitor models for all 3000 identities (Phase 9 residual)
- Phase 11 gold/rendered human FP–FN sign-off still outstanding
- Registered pre-existing TS/Vitest remediation items remain

## Phase 11 readiness

| Item | Status |
|------|--------|
| Phase 10 complete (no safety survivors) | **true** |
| Next | Phase 11 rendered coverage + 30–50 gold human FP–FN review |
| Blockers | none from Phase 10 |

## Explicit non-goals

No merge. No deploy. No Phase 11+. No corpus/programme PASS. Stop here for review.

Artefact: `artifacts/casebrain-qa/integrity-programme/phase-10/phase10-mutation-report.json`
