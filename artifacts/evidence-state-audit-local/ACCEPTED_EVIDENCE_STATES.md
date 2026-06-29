# Accepted truth evidence states

Used in `truth-key.json` → `evidenceItems[].correct_evidence_state`.

| State | Meaning |
|-------|---------|
| `served` | Material is on the file and may be referenced with source anchor |
| `referred_only` | Mentioned or scheduled but export/substance not served |
| `missing` | Expected material not on the bundle |
| `incomplete` | Partial export — not safe to treat as complete |
| `not_safely_confirmed` | Boundary unclear — provisional / needs review |
| `inferred_only` | Inference from summary or index — not primary proof |
| `other_defendant_only` | Belongs to another defendant — must not bleed to client |

**Dangerous failure:** predicting `served` / safe-to-send when truth is any non-`served` state above.

**Safer failure:** over-cautious `missing` or `needs_review` when truth is `served` (tracked as `over_cautious_rate`).
