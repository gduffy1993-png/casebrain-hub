# Strategy Output Model - Quick Start

## Overview

The Strategy Output Model extends the existing `StrategyCoordinatorResult` with three strategic lenses:

1. **CPS Pressure Lens** - Anticipates prosecution arguments and pressure points
2. **Judge Focus Lens** - Extends existing JudgeAnalysis with tactical framing guidance
3. **Defence Strategy** - Practical, evidence-linked defence tactics

## Key Design Principles

- **Evidence-First**: Every strategic item references specific evidence or gaps
- **Conditional**: If evidence state X, then strategy Y
- **Overrideable**: Solicitor can mark items as not applicable
- **Realistic**: Based on real practice, not academic theory
- **Deterministic**: No predictions - only evidence-based implications

## Architecture

```
StrategyCoordinatorResult (existing)
    ↓
StrategyOutput (new)
    ├── coordinator: StrategyCoordinatorResult
    ├── cps_pressure: CPSPressureLens
    ├── judge_focus: JudgeFocusLens
    ├── defence_strategy: DefenceStrategy
    ├── evidence_snapshot: EvidenceSnapshot
    └── solicitor_overrides?: SolicitorOverrides
```

## Implementation Path

1. **Phase 1**: Foundation (Conditional Logic + Evidence Snapshot)
2. **Phase 2**: CPS Pressure Lens
3. **Phase 3**: Judge Focus Lens (Extended)
4. **Phase 4**: Defence Strategy
5. **Phase 5**: Main Builder
6. **Phase 6**: UI Integration
7. **Phase 7**: Override Persistence

## Files to Create

```
lib/criminal/
  ├── conditional-logic.ts (NEW)
  ├── evidence-snapshot.ts (NEW)
  ├── strategy-output.ts (NEW)
  └── lenses/
      ├── cps-pressure.ts (NEW)
      ├── judge-focus.ts (NEW)
      └── defence-strategy.ts (NEW)
```

## Key Types

### Conditional Logic
```typescript
{
  if: {
    element_support?: "strong" | "some" | "weak" | "none";
    dependency_status?: "outstanding" | "served" | "unknown";
    route_viable?: boolean;
  };
  then: {
    argument_applies: boolean;
    strength_modifier?: "stronger" | "weaker";
  };
}
```

### Evidence Snapshot
```typescript
{
  elements_support: Record<string, ElementSupport>;
  dependencies_status: Record<string, "outstanding" | "served" | "unknown">;
  routes_viability: Record<string, RouteStatus>;
  critical_gaps: string[];
  helpful_gaps: string[];
}
```

## Usage Example

```typescript
// Build strategy output
const coordinator = buildStrategyCoordinator(input);
const evidenceSnapshot = buildEvidenceSnapshot(coordinator);
const strategyOutput = buildStrategyOutput(coordinator, evidenceSnapshot);

// Access lenses
const cpsArguments = strategyOutput.cps_pressure.prosecution_arguments;
const judgeFocus = strategyOutput.judge_focus.focus_areas;
const defenceMoves = strategyOutput.defence_strategy.tactical_moves;
```

## Next Steps

1. Read `STRATEGY_OUTPUT_MODEL_DESIGN.md` for full type definitions
2. Follow `STRATEGY_OUTPUT_IMPLEMENTATION_PROMPTS.md` for step-by-step implementation
3. Start with Phase 1 (Foundation)

## Important Rules

- ✅ All content must be evidence-linked
- ✅ All items must have conditional_logic
- ✅ No predictions ("will", "likely", "probably")
- ✅ Court-safe language only
- ✅ Never throw - handle errors gracefully
- ❌ Don't modify existing coordinator
- ❌ Don't add predictions or probabilities
- ❌ Don't break existing functionality
