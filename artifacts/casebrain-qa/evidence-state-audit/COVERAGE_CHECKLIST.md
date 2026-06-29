# Evidence-State Audit — Detector Coverage Checklist

> **Controlled/synthetic audit only — not solicitor-reviewed real-world audit.**

This checklist maps detector buckets to truth-key fields, report metrics, and current harness coverage.

## P1 — Blocking

| # | Detector | Truth-key fields | Report metric / failure kind | Coverage |
|---|----------|------------------|------------------------------|----------|
| 1 | Partial vs full evidence | `correct_evidence_state: incomplete`, `evidence_type` (bwv/cctv/digital/interview) | `false_served`, `incomplete_treated_complete`; `partial-media.ts` | **Covered** — partial BWV/screenshots/interview summaries |
| 2 | Wrong person/entity | `other_defendant_only`, `defendant_relevance: co_defendant_only`, `must_not_say` | `wrong_defendant_bleed` | **Covered** — co-def MG6C segregation + bleed scan |
| 3 | Index-listed not served | `referred_only`, `missing`, MG6/index traps in simulator | `false_served`, `referred_marked_served` | **Partial** — index-only traps in v3 sim cases; needs more truth-key anchors |
| 4 | Inference overstated as fact | `inferred_only`, `not_safely_confirmed`, `whether…` items | `inferred_stated_as_fact`, unmatched warnings | **Partial** — detection via state; many inference items unmatched (harness gap) |
| 5 | No-source safe line | `expectedSendability`, export `sendability` | `unsafe_sendability`, `safe_line_without_source_state` | **Covered** — export/court sendability gates |
| 6 | Export surface safety | `mustNotSayGlobal`, `blockingFailPatterns`, chase/court/client blobs | `blocking_pattern_in_output`, pattern scan on `outputTextBlob` | **Partial** — CPS chase + court note blob; Hearing Mode/Export Pack not fully wired |

## P2 — Important

| # | Detector | Truth-key fields | Report metric / failure kind | Coverage |
|---|----------|------------------|------------------------------|----------|
| 7 | Source hierarchy conflict | MG5 vs MG11 items, `evidence_type` | unmatched + manual review | **Partial** — needs explicit hierarchy truth rows |
| 8 | Date/time conflict | `uncertainEvidence`, date fields in bundle | warnings only | **Future** — truth-key enrichment needed |
| 9 | Youth/vulnerability/safeguards | youth sim cases, `missing` custody/AA rows | `missing` accuracy, safeguards patterns | **Partial** — sim-130–134; gold youth cases |
| 10 | Disclosure schedule traps | MG6C referred/missing rows | `referred_only` / `missing` accuracy | **Covered** in simulator v2/v3 |
| 11 | Changed/corrected charge | corrected_indictment layout cases | unmatched + blocking patterns on old charge bleed | **Partial** — sim-085, sim-095, sim-123, sim-149 |
| 12 | Wrong modality / offence family | `mustNotSayGlobal`, `blockingFailPatterns` | `blocking_pattern_in_output` | **Partial** — mixed_offences_pdf traps |

## P3 — Polish

| # | Detector | Truth-key fields | Report metric / failure kind | Coverage |
|---|----------|------------------|------------------------------|----------|
| 13 | Over-cautious rate | `served` truth vs predicted | `overCautiousRate` | **Covered** |
| 14 | Template/demo bleed | `blockingFailPatterns`, banned names scan | pattern failures | **Partial** — Marcus/Kian in pilot cases flagged via must-not |
| 15 | Duplicate/confusing output | harness weirdness (gold gate) | audit warnings (future) | **Future** — not in evidence-state audit v1 |

## Chase / served surfacing

| Kind | Metric | Coverage |
|------|--------|----------|
| Chase family mapping | `chaseAccuracy`, `chaseDetail` in report | **Covered** — `chase-mapping.ts` |
| Served not on H5 chase surface | `served_item_not_surfaced_in_h5` warning | **Covered** — `served-surface.ts` |
| Co-defendant segregation | `other_defendant_only` state match | **Covered** — `co-def-segregation.ts` |

## Limits

- Not all 15 detector buckets are fully automated; unmatched items must remain visible.
- Gold corpus cases use derived truth keys (H2 fields) — lower item granularity than curated simulator keys.
- Maximum runnable inventory without new bundle generation: **~253 cases** (150 simulator + 102 gold + proof-pack).
