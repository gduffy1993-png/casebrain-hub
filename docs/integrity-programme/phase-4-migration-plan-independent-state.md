# Phase 4 — migration plan for independent state calculators

CanonicalMatterStateV1 is foundational but not fully migrated — do not claim one canonical truth until these three and every substantive output surface consume it or an explicit validated adapter.

**Deadline:** Shared composer / validator phases (programme Phases 5–6); no later than those phases.

| Calculator | Path | Action | Deprecate by |
|------------|------|--------|--------------|
| `confidence_dashboard.countEvidenceStates` | `lib/criminal/confidence-dashboard/build-confidence-dashboard.ts` | Replace local counts with CanonicalMatterStateV1.evidence.counts (+ fingerprint echo) | Phase 5 shared composer / Phase 6 validator |
| `overview-presentation.countEvidenceStates*` | `lib/criminal/overview-presentation.ts` | Mark helpers legacy; call sites must use canonical adapter or validated projection | Phase 5 shared composer / Phase 6 validator |
| `solicitor-matter-state display counts` | `lib/criminal/solicitor-matter-state.ts` | Consume projectCanonicalToLegacyMatterVm only — remove independent recount | Phase 5 shared composer / Phase 6 validator |
