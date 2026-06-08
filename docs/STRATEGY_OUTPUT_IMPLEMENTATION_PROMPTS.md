# Strategy Output Model - Implementation Prompts

This document provides step-by-step Cursor prompts to implement the Strategy Output Model incrementally.

---

## Phase 1: Foundation - Conditional Logic & Evidence Snapshot

### Prompt 1.1: Create Conditional Logic Evaluator

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Create a deterministic conditional logic evaluator that checks if evidence conditions are met.

TASK
1) Create `lib/criminal/conditional-logic.ts`:
   - Export `ConditionalLogic` type (from design doc)
   - Export `evaluateCondition(condition, evidenceSnapshot): boolean`
   - Logic:
     - If `condition.element_support` is specified, check if element's support matches
     - If `condition.dependency_status` is specified, check if dependency status matches
     - If `condition.route_viable` is specified, check if route status is "viable"
   - Return true only if ALL specified conditions match
   - Never throw - return false on any error/undefined

2) Create `lib/criminal/evidence-snapshot.ts`:
   - Export `EvidenceSnapshot` type (from design doc)
   - Export `buildEvidenceSnapshot(coordinator): EvidenceSnapshot`
   - Build snapshot from StrategyCoordinatorResult:
     - Extract elements_support map
     - Extract dependencies_status map
     - Extract routes_viability map
     - Identify critical_gaps (dependencies required by viable routes that are outstanding)
     - Identify helpful_gaps (dependencies that would strengthen viable routes)
   - Never throw - return empty arrays/maps on error

RULES
- Deterministic only - no predictions
- All functions must handle undefined/null gracefully
- Build must pass
```

---

## Phase 2: CPS Pressure Lens

### Prompt 2.1: Create CPS Pressure Lens Builder

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Create the CPS Pressure Lens that anticipates prosecution arguments and pressure points.

TASK
1) Create `lib/criminal/lenses/cps-pressure.ts`:
   - Export all CPS Pressure types (from design doc)
   - Export `buildCPSPressureLens(coordinator, evidenceSnapshot, overrides?): CPSPressureLens`

2) Implement `buildCPSPressureLens`:
   - Build `prosecution_arguments`:
     - For each weak element (support "weak" or "none"):
       - Create argument targeting that element
       - Set evidence_basis from element.gaps
       - Set conditional_logic: if element support is weak/none, then argument applies
       - Set strength based on evidence gaps (more gaps = weaker argument)
       - Link to counter route if viable route exists
   - Build `pressure_points`:
     - For each element with weak support:
       - Identify why CPS will pressure here (evidence gaps)
       - List CPS tactics (max 3, realistic)
       - Assess defence vulnerability (based on evidence gaps)
       - Provide mitigation (max 2, evidence-linked)
   - Build `anticipated_requests`:
     - For each outstanding dependency:
       - If dependency is required by viable route → timing "immediate"
       - If dependency affects weak element → timing "before_trial"
       - Assess impact_if_served based on route viability
   - Build `weak_spots`:
     - For each element with weak support:
       - Identify weakness (evidence gap)
       - How CPS will exploit (realistic, not speculative)
       - Defence response (evidence-linked)
   - Build `counter_preparation`:
     - For each prosecution argument:
       - If viable counter route exists, create preparation step
       - Link to evidence needed for counter
       - Set priority based on route viability

3) Apply solicitor overrides:
   - If override exists for item, skip or mark as overridden
   - Respect "ignore" and "not_applicable" flags

RULES
- All content must be evidence-linked (reference specific evidence items/gaps)
- No predictions ("will", "likely", "probably") - use conditional templates
- All arguments must have conditional_logic
- Build must pass
```

---

## Phase 3: Judge Focus Lens (Extended)

### Prompt 3.1: Extend Judge Focus Lens

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Extend the existing JudgeAnalysis with tactical, practice-focused Judge Focus Lens.

TASK
1) Create `lib/criminal/lenses/judge-focus.ts`:
   - Export all Judge Focus types (from design doc)
   - Export `buildJudgeFocusLens(coordinator, evidenceSnapshot, overrides?): JudgeFocusLens`

2) Implement `buildJudgeFocusLens`:
   - Import existing `buildJudgeAnalysis` from `judge-reasoning.ts`
   - Use existing judge_analysis for legal_tests, constraints, tolerances
   - Build `focus_areas`:
     - For each element with weak support:
       - Create focus area (what judge will examine)
       - Set legal_anchor from existing judge_analysis
       - Set evidence_needed from element.gaps
       - Set defence_angle (how to frame defence)
       - Set conditional_logic: if element support is weak/none, then judge focuses here
   - Build `evidential_requirements`:
     - For each element:
       - Check if requirement is met (evidence exists)
       - Set current_status based on evidence
       - Set gap_impact (blocks/weakens/no_impact)
   - Build `red_flags`:
     - From existing judge_analysis.red_flags
     - Add mitigation (evidence-linked)
     - Add evidence_to_obtain
   - Build `framing_guidance`:
     - For each weak element:
       - How to frame for judge (realistic, practice-based)
       - Language to use/avoid (max 3/2)
       - Evidence to emphasize
   - Build `case_management`:
     - If procedural safety is UNSAFE → CMH action
     - If key dependencies outstanding → Disclosure App action
     - If routes blocked → PTPH action

3) Apply solicitor overrides

RULES
- Extend existing judge_analysis, don't replace it
- All content must be evidence-linked
- No predictions - use conditional templates
- Build must pass
```

---

## Phase 4: Defence Strategy

### Prompt 4.1: Create Defence Strategy Builder

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Create the Defence Strategy lens with practical, evidence-linked defence tactics.

TASK
1) Create `lib/criminal/lenses/defence-strategy.ts`:
   - Export all Defence Strategy types (from design doc)
   - Export `buildDefenceStrategy(coordinator, evidenceSnapshot, overrides?): DefenceStrategy`

2) Implement `buildDefenceStrategy`:
   - Build `primary_routes`:
     - For each route from coordinator:
       - Enhance with tactical_approach (how to execute)
       - Extract key_arguments from route.reasons (max 3)
       - Set evidence_requirements from route.required_dependencies (max 3)
       - Extract risks from route.constraints (max 2)
       - Provide mitigation (evidence-linked, max 2)
       - Set conditional_logic from route status
   - Build `tactical_moves`:
     - For each viable route:
       - Create tactical moves (specific actions)
       - Link to route_id
       - Set evidence_basis from route.required_dependencies
       - Set timing based on route viability and dependencies
       - Set priority (critical if blocks route, important if strengthens, helpful otherwise)
   - Build `attack_angles`:
     - For each weak element:
       - Create attack angle targeting that element
       - Set why_viable (evidence gaps)
       - Set how_to_attack (max 3 steps, realistic)
       - Set evidence_to_use (from element.gaps, max 3)
       - Set risks (max 2, realistic)
   - Build `defence_counters`:
     - For each prosecution argument (from CPS Pressure Lens):
       - If viable counter route exists, create counter
       - Set safe_wording (court-safe)
       - Set evidence_basis
       - Link to legal_anchor if available
   - Build `timing_strategy`:
     - For each tactical move:
       - Set when based on move timing and dependencies
       - Set why_timing (procedural/evidential reason)
       - Set evidence_trigger if applicable
   - Build `evidence_leverage`:
     - For each served dependency:
       - How to leverage it (route-specific)
       - Link to route_id if applicable
       - Set timing

3) Apply solicitor overrides

RULES
- All tactics must be evidence-linked
- No predictions - use conditional templates
- All moves must have conditional_logic
- Build must pass
```

---

## Phase 5: Strategy Output Builder

### Prompt 5.1: Create Main Strategy Output Builder

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Create the main Strategy Output builder that aggregates all lenses.

TASK
1) Create `lib/criminal/strategy-output.ts`:
   - Export `StrategyOutput` type (from design doc)
   - Export `buildStrategyOutput(coordinator, evidenceSnapshot?, overrides?): StrategyOutput`
   - Import all lens builders
   - Build evidence snapshot if not provided
   - Build all three lenses
   - Combine into StrategyOutput

2) Update `lib/criminal/strategy-coordinator.ts`:
   - Add optional `strategy_output?: StrategyOutput` to `StrategyCoordinatorResult`
   - In `buildStrategyCoordinator`, optionally build strategy_output if requested
   - Don't break existing functionality

RULES
- All lenses must be built deterministically
- Never throw - return partial output on error
- Build must pass
```

---

## Phase 6: UI Integration

### Prompt 6.1: Add Strategy Output to UI

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Integrate Strategy Output into the StrategyCommitmentPanel UI.

TASK
1) In `components/criminal/StrategyCommitmentPanel.tsx`:
   - Import `buildStrategyOutput` and `buildEvidenceSnapshot`
   - After building `coordinatorResult`, build `strategyOutput`
   - Add state for `strategyOutput`

2) Create three new collapsible panels:
   - `CPSPressurePanel` - displays CPS Pressure Lens
   - `JudgeFocusPanel` - displays Judge Focus Lens (extends existing)
   - `DefenceStrategyPanel` - displays Defence Strategy

3) Each panel:
   - Shows relevant lens data
   - Allows solicitor to override items (mark as "not applicable" or "ignore")
   - Saves overrides to `solicitor_overrides` (local state for now, can persist later)
   - Uses `usePanelState` for collapse/expand state

4) Placement:
   - After Coordinator Battleboard
   - Before Supervisor Snapshot
   - Collapsed by default

RULES
- Don't break existing UI
- All panels must be collapsible
- Overrides must be clearly visible
- Build must pass
```

---

## Phase 7: Override Persistence

### Prompt 7.1: Persist Solicitor Overrides

```
You are working in CaseBrain Hub's criminal defence strategy system.

GOAL
Persist solicitor overrides to database.

TASK
1) Add JSONB column to `criminal_cases`:
   - `strategy_overrides JSONB DEFAULT '{}'::jsonb`
   - Migration: `supabase/migrations/XXXX_strategy_overrides.sql`

2) Create API endpoint:
   - `GET/POST /api/criminal/[caseId]/strategy-overrides`
   - GET: Returns current overrides
   - POST: Updates overrides
   - Auth + RLS required

3) Update `StrategyCommitmentPanel.tsx`:
   - Load overrides on mount
   - Save overrides when solicitor changes them
   - Use `useToast` for feedback

RULES
- No schema changes beyond adding JSONB column
- Must handle missing overrides gracefully
- Build must pass
```

---

## Implementation Order

1. **Phase 1** (Foundation) - Must be done first
2. **Phase 2** (CPS Pressure) - Can be done independently
3. **Phase 3** (Judge Focus) - Can be done independently
4. **Phase 4** (Defence Strategy) - Can be done independently
5. **Phase 5** (Main Builder) - Requires Phases 1-4
6. **Phase 6** (UI Integration) - Requires Phase 5
7. **Phase 7** (Override Persistence) - Requires Phase 6

---

## Testing Checklist

After each phase:
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Functions handle undefined/null gracefully
- [ ] All conditional logic is evidence-linked
- [ ] No predictions or speculative language
- [ ] Court-safe language throughout

---

## Notes

- All prompts assume existing `StrategyCoordinatorResult` is unchanged
- All new code must be deterministic and evidence-linked
- Overrides are optional - system works without them
- Each phase can be tested independently
- UI can be built incrementally (one panel at a time)
