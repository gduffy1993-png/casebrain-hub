# CaseBrain master 3,000 quality programme — Phase 4 Gold/Holdout design

Generated: 2026-08-19T04:10:04.922Z

## Result

**PHASE4_GOLD_HOLDOUT_DESIGN_COMPLETE__SELECTION_NOT_EXECUTED**

This phase designed the Gold/Holdout gate. It did not select matters and did not invent ground truth.

## Targets

- Gold: **150-250**
- Holdout: **50-100**

## Stratification axes

- offence_family
- procedural_stage
- bundle_size
- document_mix
- source_quality
- evidence_family
- entity_complexity
- charge_count_complexity
- disclosure_gap_density
- workflow_surface_risk

## Hard rule

Current CaseBrain output is **forbidden** as ground truth. Gold/Holdout labels must come from source PDFs/text, independent truth keys, qualified review, or explicit unresolved/unavailable labels.

## Next

Build candidate inventory, then select disjoint Gold/Holdout sets. Do not start broad 500/1000/3000 runs until the truth set is honestly formed.
