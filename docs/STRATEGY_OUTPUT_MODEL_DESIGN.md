# Strategy Output Model Design

## Overview

This document defines the Strategy Output Model for CaseBrain Hub's criminal defence copilot. The model extends the existing `StrategyCoordinatorResult` with three strategic lenses:

1. **CPS Pressure Lens** - What the prosecution will push and how to anticipate it
2. **Judge Focus Lens** - What the court will focus on (extends existing JudgeAnalysis)
3. **Hard Defence Strategy** - Practical, evidence-linked defence tactics

All lenses are:
- **Conditional**: If X (evidence state) then Y (strategy implication)
- **Evidence-linked**: Every assertion references specific evidence items or gaps
- **Overrideable**: Solicitor can mark items as "not applicable" or "override"
- **Realistic**: Based on real practice, not academic theory

---

## Type Definitions

### Core Strategy Output

```typescript
export type StrategyOutput = {
  // Existing coordinator data (unchanged)
  coordinator: StrategyCoordinatorResult;
  
  // New strategic lenses
  cps_pressure: CPSPressureLens;
  judge_focus: JudgeFocusLens;
  defence_strategy: DefenceStrategy;
  
  // Metadata
  generated_at: string;
  evidence_snapshot: EvidenceSnapshot;
  solicitor_overrides?: SolicitorOverrides;
};
```

### Evidence Snapshot

```typescript
export type EvidenceSnapshot = {
  // Current evidence state
  elements_support: Record<string, ElementSupport>; // element_id -> support level
  dependencies_status: Record<string, "outstanding" | "served" | "unknown">; // dep_id -> status
  routes_viability: Record<string, RouteStatus>; // route_id -> status
  
  // Key gaps
  critical_gaps: string[]; // Evidence items that block strategy
  helpful_gaps: string[]; // Evidence items that would strengthen strategy
  
  // Timestamps
  last_disclosure_update?: string;
  last_analysis_update?: string;
};
```

### Solicitor Overrides

```typescript
export type SolicitorOverrides = {
  // Override specific lens items
  cps_pressure_overrides?: Record<string, "ignore" | "not_applicable" | "override">; // item_id -> action
  judge_focus_overrides?: Record<string, "ignore" | "not_applicable" | "override">;
  defence_strategy_overrides?: Record<string, "ignore" | "not_applicable" | "override">;
  
  // Custom notes
  custom_notes?: string;
  updated_at?: string;
  updated_by?: string;
};
```

---

## CPS Pressure Lens

**Purpose**: Anticipate what the prosecution will argue and prepare counter-positions.

```typescript
export type CPSPressureLens = {
  // Core prosecution arguments (conditional on evidence)
  prosecution_arguments: ProsecutionArgument[];
  
  // Pressure points (where CPS will push hardest)
  pressure_points: PressurePoint[];
  
  // Anticipated disclosure requests (what CPS will ask for)
  anticipated_requests: AnticipatedRequest[];
  
  // Weak spots (where defence is vulnerable)
  weak_spots: WeakSpot[];
  
  // Counter-preparation (how to prepare for each argument)
  counter_preparation: CounterPreparation[];
};
```

### Prosecution Argument

```typescript
export type ProsecutionArgument = {
  id: string; // e.g., "pros_arg_identification_clear"
  element_id: string; // Which offence element this targets
  argument: string; // What CPS will argue (conditional template)
  evidence_basis: string[]; // Evidence items that support this argument
  conditional_logic: ConditionalLogic; // If X then this argument applies
  strength: "strong" | "moderate" | "weak"; // How strong this argument is given current evidence
  counter_route_id?: string; // Which defence route counters this
  overrideable: boolean; // Can solicitor override this
};
```

### Conditional Logic

```typescript
export type ConditionalLogic = {
  // Condition: if this evidence state exists
  if: {
    element_support?: ElementSupport; // e.g., "strong" identification
    dependency_status?: "served" | "outstanding"; // e.g., CCTV served
    route_viable?: boolean; // e.g., identification_challenge not viable
  };
  // Then: this argument applies
  then: {
    argument_applies: boolean;
    strength_modifier?: "stronger" | "weaker"; // How condition affects strength
  };
};
```

### Pressure Point

```typescript
export type PressurePoint = {
  id: string;
  element_id: string; // Which element CPS will focus on
  why_pressure: string; // Why CPS will push here (evidence-based)
  cps_tactics: string[]; // Specific tactics CPS will use (max 3)
  defence_vulnerability: "high" | "medium" | "low"; // How vulnerable defence is
  mitigation: string[]; // How to mitigate this pressure (max 2)
  evidence_needed: string[]; // Evidence that would reduce pressure
};
```

### Anticipated Request

```typescript
export type AnticipatedRequest = {
  id: string;
  item: string; // What CPS will request
  why: string; // Why they'll request it (evidence gap)
  timing: "immediate" | "before_trial" | "at_trial"; // When likely requested
  impact_if_served: "high" | "medium" | "low"; // Impact on defence if served
  preparation: string; // How to prepare for this request
};
```

### Weak Spot

```typescript
export type WeakSpot = {
  id: string;
  element_id: string;
  weakness: string; // What the weakness is (evidence-based)
  cps_exploitation: string; // How CPS will exploit this
  defence_response: string; // How to respond
  evidence_to_obtain: string[]; // Evidence that would strengthen this spot
};
```

### Counter Preparation

```typescript
export type CounterPreparation = {
  id: string;
  prosecution_argument_id: string; // Which argument this counters
  preparation_step: string; // What to prepare
  evidence_to_gather: string[]; // Evidence needed for counter
  timing: "immediate" | "before_hearing" | "before_trial"; // When to prepare
  priority: "critical" | "important" | "helpful"; // Priority level
};
```

---

## Judge Focus Lens

**Purpose**: Understand what the court will focus on and how to frame arguments accordingly.

**Note**: This extends the existing `JudgeAnalysis` with more tactical, practice-focused content.

```typescript
export type JudgeFocusLens = {
  // Core focus areas (what judge will examine)
  focus_areas: JudgeFocusArea[];
  
  // Legal tests (doctrine - from existing JudgeAnalysis)
  legal_tests: string[];
  
  // Evidential requirements (what judge needs to see)
  evidential_requirements: EvidentialRequirement[];
  
  // Red flags (issues that will concern judge)
  red_flags: RedFlag[];
  
  // Framing guidance (how to frame arguments for judge)
  framing_guidance: FramingGuidance[];
  
  // Case management implications
  case_management: CaseManagementImplication[];
};
```

### Judge Focus Area

```typescript
export type JudgeFocusArea = {
  id: string;
  element_id: string; // Which element judge will focus on
  focus: string; // What judge will focus on
  why_focus: string; // Why judge will focus here (legal/evidential reason)
  legal_anchor: string; // Legal principle/case law
  evidence_needed: string[]; // Evidence judge needs to see
  defence_angle: string; // How to frame defence on this issue
  conditional_logic: ConditionalLogic; // If X then judge focuses here
};
```

### Evidential Requirement

```typescript
export type EvidentialRequirement = {
  id: string;
  element_id: string;
  requirement: string; // What evidence is required
  why_required: string; // Legal/doctrinal reason
  current_status: "met" | "partially_met" | "not_met"; // Current evidence state
  gap_impact: "blocks" | "weakens" | "no_impact"; // Impact if gap exists
  evidence_items: string[]; // Specific evidence items that meet requirement
};
```

### Red Flag

```typescript
export type RedFlag = {
  id: string;
  flag: string; // What the red flag is
  why_red_flag: string; // Why this concerns judge
  legal_implication: string; // Legal implication
  mitigation: string; // How to address this
  evidence_to_obtain: string[]; // Evidence that would address flag
};
```

### Framing Guidance

```typescript
export type FramingGuidance = {
  id: string;
  element_id: string;
  issue: string; // The issue to frame
  how_to_frame: string; // How to frame it for judge
  language_to_use: string[]; // Specific language/phrases (max 3)
  language_to_avoid: string[]; // Language to avoid (max 2)
  evidence_emphasis: string[]; // Which evidence to emphasize (max 2)
};
```

### Case Management Implication

```typescript
export type CaseManagementImplication = {
  id: string;
  implication: string; // What the implication is
  hearing_type: "CMH" | "PTPH" | "Trial" | "Disclosure_App"; // Which hearing
  action_required: string; // What action is required
  timing: "immediate" | "before_hearing" | "at_hearing"; // When
  evidence_basis: string; // Evidence that triggers this
};
```

---

## Defence Strategy

**Purpose**: Practical, evidence-linked defence tactics for fighting the case.

```typescript
export type DefenceStrategy = {
  // Primary defence routes (from coordinator, enhanced)
  primary_routes: EnhancedDefenceRoute[];
  
  // Tactical moves (specific actions to take)
  tactical_moves: TacticalMove[];
  
  // Attack angles (how to attack prosecution case)
  attack_angles: AttackAngle[];
  
  // Defence counters (responses to prosecution arguments)
  defence_counters: DefenceCounter[];
  
  // Timing strategy (when to deploy tactics)
  timing_strategy: TimingStrategy[];
  
  // Evidence leverage (how to use evidence)
  evidence_leverage: EvidenceLeverage[];
};
```

### Enhanced Defence Route

```typescript
export type EnhancedDefenceRoute = {
  id: string; // Route ID from coordinator
  status: RouteStatus; // Viable/risky/blocked
  rationale: string; // Why this route (from coordinator)
  
  // Enhanced tactical content
  tactical_approach: string; // How to execute this route
  key_arguments: string[]; // Key arguments for this route (max 3)
  evidence_requirements: string[]; // Evidence needed to execute (max 3)
  risks: string[]; // Risks of this route (max 2)
  mitigation: string[]; // How to mitigate risks (max 2)
  
  // Conditional logic
  conditional_logic: ConditionalLogic; // If X then route is viable/risky/blocked
  
  // Overrideable
  overrideable: boolean;
};
```

### Tactical Move

```typescript
export type TacticalMove = {
  id: string;
  move: string; // What the move is
  route_id: string; // Which route this supports
  why: string; // Why this move (evidence-based)
  how: string; // How to execute
  evidence_basis: string[]; // Evidence that supports this move
  timing: "immediate" | "before_hearing" | "at_hearing" | "before_trial";
  priority: "critical" | "important" | "helpful";
  conditional_logic: ConditionalLogic; // If X then this move applies
};
```

### Attack Angle

```typescript
export type AttackAngle = {
  id: string;
  target: "identification" | "intent" | "causation" | "injury" | "procedure" | "disclosure";
  angle: string; // What angle to attack
  why_viable: string; // Why this angle is viable (evidence-based)
  how_to_attack: string[]; // How to attack (max 3 steps)
  evidence_to_use: string[]; // Evidence to use in attack (max 3)
  risks: string[]; // Risks of this attack (max 2)
  conditional_logic: ConditionalLogic; // If X then this angle is viable
};
```

### Defence Counter

```typescript
export type DefenceCounter = {
  id: string;
  prosecution_argument_id: string; // Which prosecution argument this counters
  counter: string; // What the counter is
  safe_wording: string; // Safe wording for counter (court-safe)
  evidence_basis: string[]; // Evidence that supports counter
  legal_anchor?: string; // Legal principle/case law
  conditional_logic: ConditionalLogic; // If X then this counter applies
};
```

### Timing Strategy

```typescript
export type TimingStrategy = {
  id: string;
  tactic: string; // What tactic
  when: "immediate" | "before_CMH" | "at_CMH" | "before_PTPH" | "at_PTPH" | "before_trial" | "at_trial";
  why_timing: string; // Why this timing (procedural/evidential reason)
  evidence_trigger?: string; // Evidence that triggers this timing
  conditional_logic: ConditionalLogic; // If X then deploy at this time
};
```

### Evidence Leverage

```typescript
export type EvidenceLeverage = {
  id: string;
  evidence_item: string; // Which evidence item
  how_to_leverage: string; // How to leverage it
  route_id?: string; // Which route this supports
  timing: "immediate" | "before_hearing" | "at_hearing";
  conditional_logic: ConditionalLogic; // If X then leverage this way
};
```

---

## Implementation Architecture

### File Structure

```
lib/criminal/
  ├── strategy-coordinator.ts (existing - unchanged)
  ├── strategy-output.ts (NEW - main builder)
  ├── lenses/
  │   ├── cps-pressure.ts (NEW)
  │   ├── judge-focus.ts (NEW - extends judge-reasoning.ts)
  │   └── defence-strategy.ts (NEW)
  └── conditional-logic.ts (NEW - shared conditional evaluation)
```

### Builder Function

```typescript
// lib/criminal/strategy-output.ts

export function buildStrategyOutput(
  coordinator: StrategyCoordinatorResult,
  evidenceSnapshot: EvidenceSnapshot,
  solicitorOverrides?: SolicitorOverrides
): StrategyOutput {
  return {
    coordinator,
    cps_pressure: buildCPSPressureLens(coordinator, evidenceSnapshot, solicitorOverrides),
    judge_focus: buildJudgeFocusLens(coordinator, evidenceSnapshot, solicitorOverrides),
    defence_strategy: buildDefenceStrategy(coordinator, evidenceSnapshot, solicitorOverrides),
    generated_at: new Date().toISOString(),
    evidence_snapshot: evidenceSnapshot,
    solicitor_overrides: solicitorOverrides,
  };
}
```

### Conditional Logic Evaluator

```typescript
// lib/criminal/conditional-logic.ts

export function evaluateCondition(
  condition: ConditionalLogic["if"],
  evidenceSnapshot: EvidenceSnapshot
): boolean {
  // Evaluate if condition matches current evidence state
  // Returns true if condition is met
}
```

---

## Design Principles

1. **Evidence-First**: Every strategic item must reference specific evidence or evidence gaps
2. **Conditional**: All items use conditional logic - if evidence state X, then strategy Y
3. **Overrideable**: Solicitor can mark items as not applicable or override them
4. **Realistic**: Based on real practice, not academic theory
5. **Deterministic**: No predictions or probabilities - only evidence-based implications
6. **Court-Safe**: All language is court-safe and neutral
7. **Layered**: Builds on coordinator, doesn't replace it

---

## Next Steps

See implementation prompts in `IMPLEMENTATION_PROMPTS.md`.
