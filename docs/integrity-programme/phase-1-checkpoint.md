# Phase 1 checkpoint — solicitor output surface inventory

**Status:** INVENTORY COMPLETE — not a PASS  
**Branch:** `programme/criminal-defence-integrity-corpus`  
**Artefact:** `artifacts/casebrain-qa/integrity-programme/phase-1/surface-inventory.json`

## Counts

| Metric | Value |
|--------|------:|
| Surfaces inventoried | **51** |
| View-only | 24 |
| Copyable | 10 |
| Exportable | 4 |
| API wording endpoints | 14 |
| `modern_shared` | 28 |
| `mixed` | 5 |
| `legacy_bypass` | 17 |
| Integrity gate = none | 22 |

## Rule

No surface is declared safe until it appears in this inventory **and** passes shared validation (Phase 6).

## Highest-risk legacy bypasses (containment priority)

1. Assistant docks (`hearing_war_room_assistant`, `control_room_assistant`) + `api_defence_plan_chat`
2. Classic letter / hearing / client advice / court script APIs (no integrity gate)
3. `client_explanation_panel` copy (panel gated by deep papers, but copy itself ungated)
4. `case_summary_panel` / `api_propose_summary`
5. Strategy PDF / kill-shot / prosecution-weakness APIs

## Modern path (partial gates already present)

Overview shell, Chase copy-safe, Summary client copy, War Room draft blocks, Papers deep toggle, Export builder `canCopyExport`, shared `solicitor-output-integrity` + `copy-safe`.

## Next checkpoint

Phase 2 — strengthen fail-closed containment for every inventoried copyable/exportable/API surface still missing a gate (without silent generic wording substitution).
