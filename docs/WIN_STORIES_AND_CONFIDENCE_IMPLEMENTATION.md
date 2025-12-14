# Win Stories & Confidence-Safe Language Implementation

## Part 1: Win Stories Feature

### Overview
Enables capturing "wins" as repeatable sales assets directly from the case page.

---

### 1. API Routes

#### `POST /api/cases/[caseId]/win-stories`
**Purpose:** Capture a win story snapshot for a case

**Features:**
- Takes snapshot of current case state:
  - Risk rating (from risk flags)
  - Summary excerpt (first 500 chars)
  - Evidence counts (outstanding/requested/received/escalated)
  - Timeline count
  - Key issues count
  - Document count
- Compares with previous risk (from latest analysis version)
- Saves to `win_story_snapshots` table
- Writes `WIN_STORY_SNAPSHOT` audit event

**Request:**
```json
{
  "title": "Successful settlement after evidence collection",
  "note": "Optional additional context"
}
```

**Response:**
```json
{
  "success": true,
  "winStory": {
    "id": "...",
    "title": "...",
    "note": "...",
    "beforeRisk": "HIGH",
    "afterRisk": "LOW",
    "createdAt": "..."
  }
}
```

---

#### `GET /api/win-stories`
**Purpose:** List all win stories for the org

**Response:**
```json
{
  "winStories": [
    {
      "id": "...",
      "caseId": "...",
      "caseTitle": "...",
      "title": "...",
      "note": "...",
      "beforeRisk": "HIGH",
      "afterRisk": "LOW",
      "createdAt": "...",
      "createdBy": "..."
    }
  ]
}
```

---

#### `GET /api/win-stories/[id]`
**Purpose:** Get specific win story with full snapshot

**Response:**
```json
{
  "winStory": {
    "id": "...",
    "caseId": "...",
    "caseTitle": "...",
    "title": "...",
    "note": "...",
    "beforeRisk": "HIGH",
    "afterRisk": "LOW",
    "snapshot": {
      "riskRating": "LOW",
      "summaryExcerpt": "...",
      "evidenceCounts": {...},
      "timelineCount": 12,
      "keyIssuesCount": 3,
      "documentCount": 5
    },
    "createdAt": "...",
    "createdBy": "..."
  }
}
```

---

### 2. UI Components

#### `components/cases/CaptureWinStoryModal.tsx`
**Modal for capturing win story**

**Features:**
- Title input (required)
- Note textarea (optional)
- Shows case name
- Success/error messages
- Auto-closes on success

---

#### `components/win-stories/WinStoriesDashboard.tsx`
**Dashboard page component**

**Features:**
- Lists all win stories (newest first)
- Shows: title, case name, before/after risk, date
- "View Details" button opens detail modal
- Empty state when no win stories
- Links to case pages

**Detail Modal:**
- Full snapshot details
- Evidence breakdown
- Summary excerpt
- Created date and user

---

### 3. Case Page Integration

**Added to 3-dots menu:**
- "Capture Win Story" option
- Opens `CaptureWinStoryModal`
- Integrated via `CasePageClientWithActions`

---

### 4. Page Route

**`/dashboard/win-stories`**
- Server component wrapper
- Renders `WinStoriesDashboard` client component

---

## Part 2: Confidence-Safe Language Enforcement

### Overview
Replaces overconfident phrases with supervision-safe alternatives while keeping outputs useful and actionable.

---

### 1. Confidence Framing Library

#### `lib/confidenceFraming.ts`

**Functions:**
- `frameWithConfidence(text)` - Generic framing
- `frameRiskSummary(summary)` - Risk-specific framing
- `frameKeyIssue(description)` - Key issue framing
- `frameMissingEvidenceExplanation(explanation)` - Missing evidence framing
- `frameAnalysisText(text, context?)` - Context-aware framing

**Patterns Replaced:**
- "It is clear/obvious/certain" → "Based on the current documents, this suggests"
- "We can prove/establish" → "Based on the current documents, this suggests"
- "There is clear evidence" → "Based on the current documents, there appears to be"
- "The risk is critical" → "Based on the current documents, this risk appears to be"
- "This evidence is required" → "Based on the current documents, this evidence may be required"

**Qualifiers Added:**
- "Based on the current documents..."
- "This suggests..."
- "Further evidence may be required to confirm..."

---

### 2. Application Points

#### `lib/missing-evidence.ts`
**Applied to:** `reason` field in `MissingEvidenceItem`

**Change:**
```typescript
reason: frameMissingEvidenceExplanation(req.description)
```

**Before:**
> "Expert report on breach of duty and causation is required"

**After:**
> "Based on the current documents, expert report on breach of duty and causation may be required. Further evidence may be required to confirm this assessment."

---

#### `lib/key-issues.ts`
**Applied to:** Key issue labels (if description field exists)

**Note:** Key issues primarily use labels (short phrases), not full descriptions. Framing applied if description field is present in future.

---

### 3. Future Application Points

**Risk Summaries:**
- Apply `frameRiskSummary()` to risk alert descriptions
- Location: `lib/core/risks.ts` or `lib/core/riskCopy.ts`

**AI-Generated Content:**
- Apply `frameAnalysisText()` to AI-generated summaries
- Location: `lib/ai.ts` (extractCaseFacts, generateLetterDraft)

**Strategic Intelligence:**
- Apply framing to strategic guidance outputs
- Location: `lib/strategic/*.ts`

---

## Manual Test Steps

### Win Stories

1. **Capture Win Story:**
   - Open a case
   - Click 3-dots menu → "Capture Win Story"
   - Enter title and optional note
   - Click "Capture Win Story"
   - Verify success message and modal closes

2. **View Win Stories:**
   - Navigate to `/dashboard/win-stories`
   - Verify list shows captured win stories
   - Click "View Details" on a win story
   - Verify detail modal shows full snapshot

3. **Verify Snapshot:**
   - Check snapshot includes:
     - Risk rating
     - Evidence counts
     - Timeline count
     - Key issues count
     - Document count

### Confidence Framing

1. **Missing Evidence:**
   - Upload documents to a case
   - Check Missing Evidence panel
   - Verify explanations use "Based on the current documents..." or "may be required"
   - Verify no absolute statements like "is required" or "must be"

2. **Risk Summaries:**
   - Check Risk Alerts panel
   - Verify risk descriptions use confidence-safe language
   - Verify no "clearly" or "obviously" statements

3. **Key Issues:**
   - Check Key Issues panel
   - Verify issue descriptions (if present) use confidence-safe language

---

## Files Created/Modified

### New Files
1. `app/api/cases/[caseId]/win-stories/route.ts` - Capture win story API
2. `app/api/win-stories/route.ts` - List win stories API
3. `app/api/win-stories/[id]/route.ts` - Get win story API
4. `components/cases/CaptureWinStoryModal.tsx` - Capture modal
5. `components/win-stories/WinStoriesDashboard.tsx` - Dashboard component
6. `app/(protected)/dashboard/win-stories/page.tsx` - Page route
7. `lib/confidenceFraming.ts` - Confidence framing library

### Modified Files
1. `components/cases/CaseActionsMenu.tsx` - Added "Capture Win Story" option
2. `components/cases/CasePageClientWithActions.tsx` - Added win story modal
3. `lib/missing-evidence.ts` - Applied confidence framing to `reason` field
4. `lib/key-issues.ts` - Added confidence framing import (ready for future use)

---

## Summary

✅ **Win Stories:** Capture, list, and view win story snapshots  
✅ **Confidence Framing:** Library created and applied to missing evidence  
✅ **Future:** Ready to apply to risk summaries and AI-generated content  

**Ready for testing.**

