# Evidence-State Accuracy Audit — controlled harness report

> **Controlled audit harness run — not solicitor-reviewed real-world audit.**

- Generated: 2026-06-29T15:53:31.197Z
- Harness: evidence-state-audit-v1
- Fixtures: proof-pack-01

## Summary

| Metric | Value |
|--------|-------|
| Total cases | 1 |
| Total evidence items | 7 |
| Matched items | 1 |
| Unmatched items | 6 |
| False-served count | 0 |
| False-served rate | 0.0% |
| Referred-only accuracy | 100.0% |
| Missing accuracy | 0.0% |
| Incomplete accuracy | 0.0% |
| Not-safely-confirmed accuracy | 0.0% |
| Unsafe reliance count | 0 |
| Unsafe reliance rate | 0.0% |
| Wrong-defendant bleed count | 1 |
| Wrong-defendant bleed rate | 14.3% |
| Chase accuracy | 25.0% |
| Over-cautious rate | 0.0% |
| Blocking failures | 1 |
| Warnings | 6 |

## Blocking failures

- **wrong_defendant_bleed** (proof-pack-01 · Co-defendant Lee Marsh interview): Co-defendant / other-defendant material matched to client workflow

## Warnings

- **unmatched_truth_item** (proof-pack-01 · Complainant MG11 (signed)): No CaseBrain prediction matched truth item "Complainant MG11 (signed)"
- **unmatched_truth_item** (proof-pack-01 · Exhibit / bundle index): No CaseBrain prediction matched truth item "Exhibit / bundle index"
- **unmatched_truth_item** (proof-pack-01 · Phone screenshots (partial)): No CaseBrain prediction matched truth item "Phone screenshots (partial)"
- **unmatched_truth_item** (proof-pack-01 · Custody / PACE record): No CaseBrain prediction matched truth item "Custody / PACE record"
- **unmatched_truth_item** (proof-pack-01 · MG5 attribution inference): No CaseBrain prediction matched truth item "MG5 attribution inference"
- **unmatched_truth_item** (proof-pack-01 · Co-defendant Lee Marsh interview): No CaseBrain prediction matched truth item "Co-defendant Lee Marsh interview"

## Per-case breakdown

### proof-pack-01 — Proof Pack 01 — mixed evidence states (fictional)

- Items: 7 · matched 1 · false-served 0 · blocking 1

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Complainant MG11 (signed) | served | — | no | no_prediction_match |
| Exhibit / bundle index | served | — | no | no_prediction_match |
| Phone screenshots (partial) | incomplete | — | no | no_prediction_match |
| Body-worn video | referred_only | missing | yes | — |
| Custody / PACE record | missing | — | no | no_prediction_match |
| MG5 attribution inference | inferred_only | — | no | no_prediction_match |
| Co-defendant Lee Marsh interview | other_defendant_only | — | no | no_prediction_match, wrong_defendant_bleed |

## Limits

- Controlled/simulator/proof fixtures only — not unseen real-world solicitor bundles.
- `wrong_family_bleed_rate`, `court_note_safety_rate`, and `client_summary_safety_rate` are placeholders in v1.
- Unmatched truth items reduce accuracy denominators only where predictions exist.

