# Evidence-State Accuracy Audit — controlled harness report

> **Controlled audit harness run — not solicitor-reviewed real-world audit.**

- Generated: 2026-06-29T16:31:45.475Z
- Harness: evidence-state-audit-v1
- Fixtures: proof-pack-01, sim-038, sim-039, sim-041, sim-044, sim-045, sim-050, sim-055, sim-058, sim-061

## Summary

| Metric | Value |
|--------|-------|
| Total cases | 10 |
| Total evidence items | 110 |
| Matched items | 96 |
| Unmatched items | 14 |
| False-served count | 0 |
| False-served rate | 0.0% |
| Referred-only accuracy | 100.0% |
| Missing accuracy | 93.6% |
| Incomplete accuracy | 82.5% |
| Not-safely-confirmed accuracy | 0.0% |
| Unsafe reliance count | 0 |
| Unsafe reliance rate | 0.0% |
| Wrong-defendant bleed count | 2 |
| Wrong-defendant bleed rate | 1.8% |
| Chase accuracy | 17.7% |
| Over-cautious rate | 0.0% |
| Blocking failures | 2 |
| Warnings | 14 |

## Blocking failures

- **wrong_defendant_bleed** (sim-038 · co-defendant chat export): Co-defendant / other-defendant material matched to client workflow
- **wrong_defendant_bleed** (sim-045 · co-defendant interview records): Co-defendant / other-defendant material matched to client workflow

## Warnings

- **unmatched_truth_item** (proof-pack-01 · Complainant MG11 (signed)): No CaseBrain prediction matched truth item "Complainant MG11 (signed)"
- **unmatched_truth_item** (proof-pack-01 · Exhibit / bundle index): No CaseBrain prediction matched truth item "Exhibit / bundle index"
- **unmatched_truth_item** (proof-pack-01 · Phone screenshots (partial)): No CaseBrain prediction matched truth item "Phone screenshots (partial)"
- **unmatched_truth_item** (proof-pack-01 · Custody / PACE record): No CaseBrain prediction matched truth item "Custody / PACE record"
- **unmatched_truth_item** (proof-pack-01 · MG5 attribution inference): No CaseBrain prediction matched truth item "MG5 attribution inference"
- **unmatched_truth_item** (proof-pack-01 · Co-defendant Lee Marsh interview): No CaseBrain prediction matched truth item "Co-defendant Lee Marsh interview"
- **unmatched_truth_item** (sim-038 · whether the handle is personal, shared, or inferred from contact names): No CaseBrain prediction matched truth item "whether the handle is personal, shared, or inferred from contact names"
- **unmatched_truth_item** (sim-041 · whether exploitation is evidenced or only mentioned): No CaseBrain prediction matched truth item "whether exploitation is evidenced or only mentioned"
- **unmatched_truth_item** (sim-044 · whether Imran struck anyone or was merely present): No CaseBrain prediction matched truth item "whether Imran struck anyone or was merely present"
- **unmatched_truth_item** (sim-045 · whether Leah encouraged, assisted, withdrew, or was present only): No CaseBrain prediction matched truth item "whether Leah encouraged, assisted, withdrew, or was present only"
- **unmatched_truth_item** (sim-050 · whether messages are complete, attributed, or taken out of context): No CaseBrain prediction matched truth item "whether messages are complete, attributed, or taken out of context"
- **unmatched_truth_item** (sim-055 · sequence before arrest and defendant condition): No CaseBrain prediction matched truth item "sequence before arrest and defendant condition"
- **unmatched_truth_item** (sim-058 · whether possession was for theft or innocent work/use): No CaseBrain prediction matched truth item "whether possession was for theft or innocent work/use"
- **unmatched_truth_item** (sim-061 · whether refusal/warning/reasonable excuse is properly evidenced): No CaseBrain prediction matched truth item "whether refusal/warning/reasonable excuse is properly evidenced"

## Per-case breakdown

### proof-pack-01 — Proof Pack 01 — mixed evidence states (fictional)

- Items: 7 · matched 1 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| Complainant MG11 (signed) | served | — | no | no_prediction_match |
| Exhibit / bundle index | served | — | no | no_prediction_match |
| Phone screenshots (partial) | incomplete | — | no | no_prediction_match |
| Body-worn video | referred_only | missing | yes | — |
| Custody / PACE record | missing | — | no | no_prediction_match |
| MG5 attribution inference | inferred_only | — | no | no_prediction_match |
| Co-defendant Lee Marsh interview | other_defendant_only | — | no | no_prediction_match |

### sim-038 — EncroChat handle attribution disputed with co-defendant bleed risk

- Items: 11 · matched 10 · false-served 0 · blocking 1

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 summary | served | served | yes | — |
| schedule of alleged Encro handles | served | served | yes | — |
| two MG11 officer statements | served | served | yes | — |
| full extraction report | referred_only | missing | yes | — |
| handle attribution report | referred_only | missing | yes | — |
| co-defendant chat export | other_defendant_only | missing | no | wrong_defendant_bleed |
| device attribution evidence | missing | missing | yes | — |
| download continuity | missing | missing | yes | — |
| cellsite linking defendant to device | missing | missing | yes | — |
| expert methodology | missing | missing | yes | — |
| whether the handle is personal, shared, or inferred from contact names | inferred_only | — | no | no_prediction_match |

### sim-039 — EncroChat extraction continuity and cropped-message trap

- Items: 11 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| cropped message screenshots | incomplete | incomplete | yes | — |
| officer exhibit list | served | incomplete | no | — |
| full extraction | referred_only | missing | yes | — |
| hash values | referred_only | missing | yes | — |
| translation/interpretation note | referred_only | missing | yes | — |
| complete conversation thread | missing | missing | yes | — |
| metadata | missing | missing | yes | — |
| export audit trail | missing | missing | yes | — |
| exhibit continuity statement | missing | missing | yes | — |
| whether screenshots are complete, edited, or selected | not_safely_confirmed | incomplete | no | — |

### sim-041 — County lines vulnerability and modern slavery marker

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| custody summary | served | served | yes | — |
| drug expert statement | served | served | yes | — |
| NRM referral | referred_only | missing | yes | — |
| youth offending team note | referred_only | missing | yes | — |
| social care record | referred_only | missing | yes | — |
| NRM referral outcome | missing | missing | yes | — |
| appropriate adult notes | missing | missing | yes | — |
| safeguarding chronology | missing | missing | yes | — |
| phone attribution | missing | missing | yes | — |
| whether exploitation is evidenced or only mentioned | not_safely_confirmed | — | no | no_prediction_match |

### sim-044 — Multi-handed assault presence versus participation

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| complainant MG11 | served | served | yes | — |
| arresting officer MG11 | served | served | yes | — |
| CCTV | referred_only | referred_only | yes | — |
| body-worn video | referred_only | referred_only | yes | — |
| medical photographs | referred_only | missing | yes | — |
| full CCTV export | missing | missing | yes | — |
| BWV | missing | missing | yes | — |
| medical notes | missing | missing | yes | — |
| scene timeline | missing | missing | yes | — |
| whether Imran struck anyone or was merely present | inferred_only | — | no | no_prediction_match |

### sim-045 — Joint-enterprise violence with partial BWV

- Items: 11 · matched 10 · false-served 0 · blocking 1

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| victim statement | served | served | yes | — |
| short BWV clip transcript | incomplete | incomplete | yes | — |
| full BWV export | referred_only | missing | yes | — |
| CCTV | referred_only | missing | yes | — |
| medical report | referred_only | missing | yes | — |
| complete BWV | missing | missing | yes | — |
| CCTV | missing | missing | yes | — |
| medical report | missing | missing | yes | — |
| co-defendant interview records | other_defendant_only | missing | no | wrong_defendant_bleed |
| whether Leah encouraged, assisted, withdrew, or was present only | inferred_only | — | no | no_prediction_match |

### sim-050 — Phone download screenshots only with missing scope and metadata

- Items: 11 · matched 10 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | incomplete | no | — |
| complainant screenshots | incomplete | incomplete | yes | — |
| short officer statement | served | served | yes | — |
| phone download | referred_only | missing | yes | — |
| exhibit metadata | referred_only | missing | yes | — |
| device audit log | referred_only | missing | yes | — |
| full phone download | missing | missing | yes | — |
| search terms/scope | missing | missing | yes | — |
| metadata | missing | missing | yes | — |
| device ownership/continuity | missing | missing | yes | — |
| whether messages are complete, attributed, or taken out of context | not_safely_confirmed | — | no | no_prediction_match |

### sim-055 — Police contact public order with BWV and custody sequence gaps

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| officer MG11 | served | served | yes | — |
| custody summary extract | served | served | yes | — |
| BWV | referred_only | provisional | yes | — |
| full custody record | referred_only | missing | yes | — |
| PACE interview recording | referred_only | missing | yes | — |
| BWV export | missing | missing | yes | — |
| full custody record | missing | missing | yes | — |
| risk assessment | missing | missing | yes | — |
| interview recording | missing | provisional | yes | — |
| use-of-force record | missing | missing | yes | — |
| sequence before arrest and defendant condition | not_safely_confirmed | — | no | no_prediction_match |

### sim-058 — Going equipped tool possession and lawful purpose trap

- Items: 12 · matched 11 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| seizure statement | served | served | yes | — |
| charge sheet | served | served | yes | — |
| BWV | referred_only | missing | yes | — |
| CCTV | referred_only | provisional | yes | — |
| tool photographs | referred_only | missing | yes | — |
| BWV | missing | missing | yes | — |
| CCTV | missing | provisional | yes | — |
| tool photographs | referred_only | missing | yes | — |
| interview record | missing | provisional | yes | — |
| lawful-purpose context | missing | missing | yes | — |
| whether possession was for theft or innocent work/use | inferred_only | — | no | no_prediction_match |

### sim-061 — Failure to provide specimen procedure and BWV gaps

- Items: 13 · matched 12 · false-served 0 · blocking 0

| Truth item | Truth | Predicted | Match | Flags |
|---|---|---|---|---|
| MG5 | served | served | yes | — |
| officer MG11 | served | served | yes | — |
| charge sheet | served | served | yes | — |
| MGDD form | referred_only | missing | yes | — |
| BWV | referred_only | provisional | yes | — |
| custody record | referred_only | provisional | yes | — |
| medical note | referred_only | missing | yes | — |
| MGDD form | missing | missing | yes | — |
| BWV | missing | provisional | yes | — |
| full custody record | missing | provisional | yes | — |
| medical/fitness note | missing | missing | yes | — |
| warning wording | missing | missing | yes | — |
| whether refusal/warning/reasonable excuse is properly evidenced | not_safely_confirmed | — | no | no_prediction_match |

## Limits

- Controlled/simulator/proof fixtures only — not unseen real-world solicitor bundles.
- `wrong_family_bleed_rate`, `court_note_safety_rate`, and `client_summary_safety_rate` are placeholders in v1.
- Unmatched truth items reduce accuracy denominators only where predictions exist.

