# Scoring rules (harness v1)

Primary spec: `docs/audit/EVIDENCE_STATE_ACCURACY_AUDIT.md`

## Implemented in v1

| Metric | Definition |
|--------|------------|
| `false_served_rate` | Items where CaseBrain predicts served-like state but truth is non-served |
| `referred_only_accuracy` | Truth `referred_only` items not treated as served (missing/provisional counts as correct) |
| `missing_accuracy` | Truth `missing` items not treated as served |
| `incomplete_accuracy` | Truth `incomplete` items not treated as served/complete |
| `not_safely_confirmed_accuracy` | Truth `inferred_only` / `not_safely_confirmed` boundaries respected |
| `unsafe_reliance_rate` | Safe-to-send or served-like reliance when truth says not safe |
| `wrong_defendant_bleed_rate` | Other-defendant material appears in client workflow |
| `chase_accuracy` | Expected chase labels found in CaseBrain chase items (fuzzy match) |
| `over_cautious_rate` | Truth `served` but predicted missing/referred/provisional |

## Blocking failures (v1)

- Any `false_served` item
- Referred/missing/incomplete/inferred treated as served
- Wrong-defendant bleed
- Blocking text patterns (`BWV shows`, `case collapses`, truth-key `blockingFailPatterns`)
- Export `safe_to_send` when truth key expects review

## Placeholder in v1

- `wrong_family_bleed_rate`
- `court_note_safety_rate`
- `client_summary_safety_rate`
- Stratified coverage breakdowns (offence family, PDF quality)

## Pass / stop rules

- **Stop and fix** if `false_served_count > 0` on any controlled fixture before expanding the pack.
- Stage 5 batch run requires **30+** runnable cases in `cases/` (both truth key and output).
