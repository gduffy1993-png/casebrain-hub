# Strategic Intelligence Layers - Implementation Complete

## Overview

Transformed CaseBrain from "Strategy options + next steps" into a **live leverage, pressure, and pivot engine** that tracks how evidence, time, and judicial optics affect defence strategy viability.

## Core Libraries Created

### 1. Evidence Impact Mapper (`lib/criminal/evidence-impact-mapper.ts`)
- Maps missing/incoming evidence to attack paths and strategy viability
- Determines impact on defence (helps/hurts/neutral/depends)
- Generates IF-THEN scenarios: if arrives clean/late/adverse
- Links evidence to pivot triggers and kill switches
- Deterministic logic, no probabilities

### 2. Time & Pressure Engine (`lib/criminal/time-pressure-engine.ts`)
- Tracks PTPH, disclosure deadlines, plea credit drop points
- Calculates current leverage (high/medium/low)
- Identifies time-critical actions
- Warns when leverage windows are closing
- Marks actions as losing leverage or no longer attractive
- Uses placeholders when dates are unknown

### 3. Judicial Optics Engine (`lib/criminal/judicial-optics-engine.ts`)
- Scores actions and attack paths as:
  - 🟢 Judicially attractive
  - 🟠 Neutral
  - 🔴 Risky / irritates court
- Deterministic rules based on:
  - Timing (early/on-time/late)
  - Proportionality
  - Persistence (first request/chased/repeated)
  - Chase trail presence
- Explicit explanations in solicitor language

### 4. Confidence Drift Engine (`lib/criminal/confidence-drift-engine.ts`)
- Tracks confidence changes (HIGH/MEDIUM/LOW)
- Detects drift based on evidence signal changes:
  - ID strength changes
  - Medical evidence pattern changes
  - CCTV sequence changes
  - Disclosure completeness changes
  - PACE compliance changes
- Explains WHY confidence moved
- No numeric scores, only levels

### 5. Decision Checkpoints (`lib/criminal/decision-checkpoints.ts`)
- Explicit "Solicitor Decision Required" moments
- Presents options with:
  - Risks
  - Consequences
  - Leverage impact (gains/loses/maintains)
  - Timing guidance
- Solicitor guidance in plain language
- NEVER auto-decides - guides only

## API Integration

### Extended `/api/criminal/[caseId]/strategy-analysis` Response

```typescript
{
  routes: StrategyRoute[]; // Existing
  selectedRoute?: string;
  artifacts?: StrategyArtifact[];
  evidenceImpact?: EvidenceImpact[];
  recommendation?: StrategyRecommendation;
  
  // NEW LAYERS:
  evidenceImpactMap?: EvidenceImpactMap[]; // Missing evidence → attack paths → viability
  timePressure?: TimePressureState; // PTPH, deadlines, leverage windows
  confidenceStates?: Record<RouteType, ConfidenceState>; // Dynamic confidence per route
  decisionCheckpoints?: DecisionCheckpoint[]; // Solicitor decision moments
}
```

## UI Integration

### StrategyCommitmentPanel Enhancements

1. **Evidence Impact Map Section**
   - Shows missing evidence items
   - Displays impact on defence (helps/hurts/depends)
   - IF-THEN scenarios (clean/late/adverse)
   - Pivot triggers and kill switches

2. **Time & Pressure Section**
   - Pressure windows (PTPH, disclosure, plea credit, pivot moment)
   - Current leverage indicator
   - Time-critical actions
   - Losing leverage warnings
   - Placeholder labels when dates unknown

3. **Strategy Confidence Section**
   - Confidence level per route (HIGH/MEDIUM/LOW)
   - Explanation of current confidence
   - Confidence drift history (if changed)

4. **Decision Checkpoints Section**
   - Critical decision moments
   - Options with risks/consequences
   - Leverage impact per option
   - Solicitor guidance

5. **Judicial Optics on Actions**
   - Badges on next actions (🟢/🟠/🔴)
   - Optics badges on attack paths

### CaseFightPlan Enhancements

- Tactical Plan includes judicial optics badges
- Actions tagged with optics scores
- Evidence impact awareness in descriptions

## Analysis Gate Compliance

✅ **All features work when `canGenerateAnalysis=false`:**
- Evidence Impact Map: Uses common missing items list
- Time Pressure: Uses placeholder dates with clear labels
- Confidence: Returns LOW with explanation
- Decision Checkpoints: Still generated (based on route type)
- Judicial Optics: Works deterministically

✅ **Clear labeling:**
- "Template (pending disclosure)" badges
- "Placeholder" labels for unknown dates
- "Hypothesis (pending evidence)" on attack paths
- Evidence-backed vs template clearly distinguished

## Output Artifacts Enhancement

All artifacts now include:
- Confidence level and rationale
- Time pressure awareness
- Flip conditions
- Evidence impact considerations

## Key Features

### Evidence Impact Mapping
- **Explicit IF-THEN logic**: "If CCTV arrives clean → X, if late → Y, if adverse → Z"
- **Pivot triggers**: "If [evidence event] → pivot from X to Y"
- **Kill switches**: "If [condition] → route viability collapses"

### Time & Pressure Awareness
- **Leverage windows**: Tracks when leverage is gained/lost
- **Time-critical actions**: Highlights urgent items
- **Losing leverage warnings**: Alerts when actions become less effective
- **Placeholder support**: Works without dates, clearly labeled

### Judicial Optics
- **Deterministic scoring**: Based on timing, proportionality, persistence
- **Clear explanations**: Why an action is attractive/risky
- **Solicitor language**: Professional, leverage-aware

### Confidence Drift
- **Dynamic tracking**: Confidence changes with evidence
- **Explicit triggers**: What evidence change caused drift
- **No fake probabilities**: Only HIGH/MEDIUM/LOW with explanations

### Decision Checkpoints
- **Never auto-decides**: Always requires solicitor judgment
- **Options presented**: With risks, consequences, leverage impact
- **Timing guidance**: When to decide (now/later/never)

## Architecture

- **Deterministic-first**: All logic works without AI
- **Evidence-backed vs Hypothesis**: Clear labeling throughout
- **Analysis Gate respected**: Graceful fallback when gated
- **Type-safe**: Full TypeScript coverage
- **Extensible**: Easy to add new evidence types or rules

## Testing Checklist

✅ With `canGenerateAnalysis=false`:
- All sections render with template labels
- No crashes, no empty screens
- Placeholders clearly marked

✅ With `canGenerateAnalysis=true`:
- Evidence impact shows evidence-backed assessments
- Time pressure uses actual dates when available
- Confidence reflects evidence signals
- Decision checkpoints are route-appropriate

✅ No new 500s
✅ TypeScript + lint pass
✅ Analysis Gate intact

## Files Created/Modified

### New Libraries
- `lib/criminal/evidence-impact-mapper.ts`
- `lib/criminal/time-pressure-engine.ts`
- `lib/criminal/judicial-optics-engine.ts`
- `lib/criminal/confidence-drift-engine.ts`
- `lib/criminal/decision-checkpoints.ts`

### Modified Files
- `app/api/criminal/[caseId]/strategy-analysis/route.ts` - Extended response
- `lib/criminal/strategy-fight-types.ts` - Extended types
- `lib/criminal/strategy-fight-generators.ts` - Enhanced artifacts
- `components/criminal/StrategyCommitmentPanel.tsx` - New sections
- `components/criminal/CaseFightPlan.tsx` - Enhanced tactical plan

## Result

CaseBrain now provides:
- **Live leverage tracking**: Know when leverage is gained/lost
- **Pressure awareness**: Time-critical actions highlighted
- **Judicial optics**: Know what courts find attractive/risky
- **Confidence drift**: Track how evidence changes confidence
- **Decision guidance**: Explicit checkpoints requiring solicitor judgment
- **Evidence impact**: Clear IF-THEN mapping of missing evidence

The system actively "fights the case" - strategies weaken, strengthen, or collapse realistically based on evidence signals. Nothing promises outcomes. Everything is defensible in front of a judge.

