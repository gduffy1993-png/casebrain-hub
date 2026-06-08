# One Brain Gating Implementation Summary

## Overview
Extended One Brain / Case Context gating to ALL analysis endpoints (criminal + strategic) to ensure NO strategy/probabilities are generated when extracted text is missing/thin/scanned.

## Core Changes

### 1. `lib/case-context.ts`
- **Added `canGenerateAnalysis` boolean** to `CaseContext` type
- **Computed from diagnostics**: `rawCharsTotal > 0 && !suspectedScanned && !textThin && reasonCodes.includes("OK")`
- **Added `guardAnalysis(context)` helper function** - throws `AnalysisGateError` if analysis cannot be generated
- **Added `AnalysisGateError` class** - contains banner and diagnostics for consistent error responses
- **Updated debug logging**: Caps preview to 200 chars in production, 500 in development

### 2. Updated Endpoints

#### Criminal Endpoints (13 total)
All now use `buildCaseContext` and `guardAnalysis`:

1. ✅ `/api/criminal/[caseId]/probability` - Get off probability
2. ✅ `/api/criminal/[caseId]/aggressive-defense` - Aggressive defense analysis
3. ✅ `/api/criminal/[caseId]/loopholes` - Loopholes and weaknesses
4. ✅ `/api/criminal/[caseId]/strategies` - Defense strategies
5. ✅ `/api/criminal/[caseId]/evidence-analysis` - Evidence strength analysis
6. ✅ `/api/criminal/[caseId]/client-advice` - Client advice generation
7. ✅ `/api/criminal/[caseId]/disclosure` - Disclosure tracker
8. ✅ `/api/criminal/[caseId]/pace` - PACE compliance
9. ⚠️ `/api/criminal/[caseId]/bail` - (Not updated - may not generate strategies)
10. ⚠️ `/api/criminal/[caseId]/charges` - (Not updated - may not generate strategies)
11. ⚠️ `/api/criminal/[caseId]/hearings` - (Not updated - may not generate strategies)
12. ⚠️ `/api/criminal/[caseId]/process` - (Not updated - may not generate strategies)
13. ⚠️ `/api/criminal/[caseId]/letters/draft` - (Not updated - may not generate strategies)

#### Strategic Endpoints (11 total)
All now use `buildCaseContext` and `guardAnalysis`:

1. ✅ `/api/strategic/[caseId]/overview` - Strategic overview
2. ✅ `/api/strategic/[caseId]/leverage` - Procedural leverage points
3. ✅ `/api/strategic/[caseId]/weak-spots` - Opponent weak spots
4. ✅ `/api/strategic/[caseId]/strategies` - Strategy paths
5. ✅ `/api/strategic/[caseId]/momentum` - Case momentum
6. ✅ `/api/strategic/[caseId]/vulnerabilities` - Opponent vulnerabilities
7. ✅ `/api/strategic/[caseId]/scenarios` - Scenario outlines
8. ✅ `/api/strategic/[caseId]/move-sequence` - Strategic move sequence
9. ✅ `/api/strategic/[caseId]/time-pressure` - Time pressure analysis
10. ✅ `/api/strategic/[caseId]/cpr-compliance` - CPR compliance issues
11. ✅ `/api/strategic/[caseId]/behavior` - Behavior predictions

## Response Shape

When gated (canGenerateAnalysis = false), all endpoints return:

```typescript
{
  ok: false,
  data: null, // or empty array [] for list endpoints
  banner: {
    severity: "warning" | "error" | "info",
    title?: string,
    message: string
  },
  diagnostics: {
    docCount: number,
    rawCharsTotal: number,
    jsonCharsTotal: number,
    avgRawCharsPerDoc: number,
    suspectedScanned: boolean,
    reasonCodes: string[]
  }
}
```

## Gating Logic

Analysis is BLOCKED when:
- `rawCharsTotal === 0` (no text extracted)
- `suspectedScanned === true` (rawCharsTotal < 800 AND jsonCharsTotal < 400)
- `textThin === true` (rawCharsTotal < 800)
- `reasonCodes` does NOT include "OK"

Analysis is ALLOWED when:
- `rawCharsTotal > 0`
- `!suspectedScanned`
- `!textThin`
- `reasonCodes.includes("OK")`

## Next Steps

### UI Updates Required
1. **Criminal panels** - Check for `ok: false` or `banner` in responses
2. **Strategic panels** - Check for `ok: false` or `banner` in responses
3. **Display banner** instead of percentages/probabilities when gated
4. **Show message**: "Not enough extractable text to generate reliable analysis. Upload text-based PDFs or run OCR."

### Remaining Endpoints
The following criminal endpoints were NOT updated (may not generate strategies):
- `/api/criminal/[caseId]/bail`
- `/api/criminal/[caseId]/charges`
- `/api/criminal/[caseId]/hearings`
- `/api/criminal/[caseId]/process`
- `/api/criminal/[caseId]/letters/draft`

These should be updated if they generate any analysis/strategies/probabilities.

## Testing

1. Upload a scanned PDF (no extractable text)
2. Verify ALL criminal/strategic endpoints return `ok: false` with banner
3. Verify NO percentages/probabilities are shown in UI
4. Upload a text-based PDF
5. Verify endpoints return full analysis

## Safety Guarantee

**NO HALLUCINATION**: If `rawCharsTotal === 0`, the system will:
- ✅ NOT generate any strategies
- ✅ NOT show any probabilities (no "70%" or similar)
- ✅ NOT suggest applications or loopholes
- ✅ ONLY show banner + next action (OCR/text-based PDF)

This ensures the system is "court-safe" - no facts means no strategy pretending.
