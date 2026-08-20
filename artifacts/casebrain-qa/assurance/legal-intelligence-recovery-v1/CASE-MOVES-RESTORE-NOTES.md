# Case Moves Restore Notes

**Source commit:** `6de1c4c249cec7fcf688c05293e0b09f7c3d81b4` — *Add isolated Case Moves Engine* (2026-05-14)  
**Branch of origin:** `feature/case-moves-engine` / worktree `casebrain-case-moves`  
**Restored path:** `lib/criminal/case-moves-engine.ts`  
**Advisory adapter:** `lib/criminal/legal-intelligence/case-moves-advisory.ts`

---

## What existed at 6de1c4c24

- ~1864-line pure deterministic library
- Signal detection from structured fields + low-trust `bundleTextPreview`
- Move builders: disclosure, interview, identification, intent/dishonesty, self-defence, lawful excuse/reason, forensic/medical, phone, no-safe-strategy
- Every move carries `triggerSignals`, `sourceSignals`, `unsupportedAssumptions`, confidence caps
- Explicitly **not wired** into UI/API at introduction

---

## What was restored

| Item | How |
|------|-----|
| Full engine library | Checked out from `6de1c4c24` onto recovery branch |
| Header / safety note | Updated for advisory-behind-canonical discipline |
| Self-defence move wording | Softened: consider/frame only after instructions + source anchors; no “plead from offence shape” |
| Typed advisory emission | `caseMoveToConsideration` → `PRACTITIONER_CONSIDERATION` with what/why/triggers/provenance/mustConfirm/scope |
| Orchestration | `buildLegalIntelligence` includes case-move considerations |
| Surface attachment | `canonical-live-surface-adapter` exposes `legalIntelligence` + `overviewConsiderations` without mutating chase/evidence |

---

## What unsafe authority was deliberately NOT restored

1. Treating Case Moves output as evidence existence / served / missing state
2. Auto-creating CPS chase items from moves
3. Asserting self-defence as established live case theory from Affray/assault alone
4. Inventing BWV/999/medical outstanding rows from offence playbooks
5. High confidence from bundle-preview-only heuristics (engine caps retained; adapter marks `offenceShapeOnly` / general_professional)
6. Wiring moves into court/client factual assertion paths without acknowledgement that they are advisory

---

## Structure of a restored move (advisory)

```
what          — consideration language (softened for high-risk categories)
why           — tactical significance
canonicalTriggers — trigger + signal ids
provenance    — engine tag + sourceDisciplineNote + category/confidence
scope         — source_specific | general_professional
mustConfirmBeforeFactualLanguage — unsupportedAssumptions + instruction/source gates
supportClass  — PRACTITIONER_CONSIDERATION
allowedSurfaces — overview/court/papers/client/file/hearing_mode/export (NOT cps_chase auto)
```

---

## Verification

- Regression wall: `scripts/legal-intelligence-recovery-regression.test.ts`
- Case-moves generation still produces structured moves from raised self-defence + disclosure gaps
- Patel proof: self-defence appears as consideration; not as established live position
