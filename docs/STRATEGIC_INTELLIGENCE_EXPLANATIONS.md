# Strategic Intelligence Explanations

## Overview

The Strategic Intelligence system now includes rich explanatory metadata for every strategic insight. This metadata explains **WHY** a strategy was recommended, **WHAT** triggered it, **HOW** to use it, and **WHAT** happens if you ignore it.

## StrategicInsightMeta Type

The `StrategicInsightMeta` type is defined in `lib/strategic/types.ts` and includes:

- **`whyRecommended`**: Why this strategy/insight fits THIS specific case
- **`triggeredBy`**: Document types or evidence phrases that triggered this insight
- **`alternatives`**: Alternative routes/strategies that would appear if different evidence was uploaded
- **`riskIfIgnored`**: What happens if you ignore this insight (risk level)
- **`bestStageToUse`**: Best stage in litigation timeline to use this (e.g. "CCMC", "Pre-trial review", "At trial")
- **`howThisHelpsYouWin`**: How this helps you win (concrete outcomes)

## Where It Is Populated

Meta is generated in `lib/strategic/meta-generator.ts` using practice-area specific logic:

- **`generateLeverageMeta`**: For procedural leverage points
- **`generateWeakSpotMeta`**: For opponent weak spots
- **`generateStrategyPathMeta`**: For strategic routes (A/B/C/D/E)
- **`generateJudicialExpectationMeta`**: For judicial expectations
- **`generateTimePressureMeta`**: For time pressure points

Each generator function analyzes the case data (documents, timeline, practice area, etc.) and creates contextual explanations tailored to the specific insight type and practice area.

## How the UI Renders It

The UI displays meta information through the `StrategicInsightMetaDisplay` component (`components/strategic/StrategicInsightMeta.tsx`), which provides:

1. **Collapsible "Why this matters" section** - Expandable to avoid cluttering the layout
2. **Color-coded sections**:
   - Cyan: Why recommended / What triggered
   - Amber: Alternative routes
   - Red: Risk if ignored
   - Green: How this helps you win
3. **Badge for best stage to use** - Shows when in the litigation timeline to apply this

The component is integrated into:
- `StrategicRoutesPanel` - Shows meta for each strategic route
- `LeverageAndWeakSpotsPanel` - Shows meta for leverage points and weak spots
- `TimePressureAndSettlementPanel` - Shows meta for time pressure points

## Practice Area Specificity

The meta generators are practice-area aware and provide tailored explanations:

- **Housing Disrepair**: References Awaab's Law, HHSRS, Category 1 hazards
- **Personal Injury / Clinical Negligence**: References causation, quantum, medical evidence
- **Criminal**: References PACE, disclosure, bail conditions
- **Family Law**: References court orders, welfare, disclosure breaches
- **Generic Litigation**: Uses standard CPR references

## Extending for New Practice Areas

To add meta support for a new practice area:

1. **Update `MetaGeneratorInput`** in `lib/strategic/meta-generator.ts` if needed
2. **Add practice-area specific logic** in the relevant generator function (e.g., `generateStrategyPathMeta`)
3. **Update the UI component** if practice-area specific rendering is needed

Example:

```typescript
// In generateStrategyPathMeta
if (practiceArea === "new_practice_area") {
  whyRecommended = `This route is recommended because... [practice-area specific explanation]`;
  howThisHelpsYouWin = `[Practice-area specific outcome]`;
}
```

## Data Flow

1. **Backend Analysis** (`lib/strategic/*.ts`):
   - Generates strategic insights (routes, leverage, weak spots, etc.)
   - Calls meta generator functions to populate `meta` field
   - Returns insights with meta to API routes

2. **API Routes** (`app/api/strategic/[caseId]/*/route.ts`):
   - Fetch case data
   - Call strategic analysis functions
   - Return JSON with insights (including meta)

3. **Frontend Components** (`components/strategic/*.tsx`):
   - Fetch data from API routes
   - Render insights with `StrategicInsightMetaDisplay` component
   - Display meta in collapsible sections

## Best Practices

- **Always provide generic fallbacks**: If case data is insufficient, still return sensible generic explanations rather than null
- **Practice-area awareness**: Tailor explanations to the specific practice area's terminology and legal framework
- **Actionable advice**: Focus on concrete outcomes and tactical steps, not just abstract concepts
- **Evidence-based**: Reference specific documents, deadlines, or evidence that triggered the insight

## Testing

To test the meta system:

1. Upload a case with missing evidence (e.g., PI case without medical records)
2. Run Strategic Intelligence analysis
3. Check that strategic routes show "Why this matters" sections
4. Verify that:
   - "What triggered this insight" references the missing documents
   - "Alternative routes" suggest what would unlock if evidence is uploaded
   - "Risk if ignored" explains consequences
   - "Best stage to use" shows appropriate litigation stage
   - "How this helps you win" provides concrete outcomes

## Future Enhancements

Potential improvements:
- AI-generated meta based on case-specific analysis
- Historical case data to suggest alternatives based on similar cases
- Integration with document upload to automatically update meta when new evidence is added
- Practice-area specific templates for common scenarios

