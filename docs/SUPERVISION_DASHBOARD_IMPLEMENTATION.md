# Phase 4 - Supervisor Dashboard Implementation

## Overview
Read-only supervision dashboard at `/dashboard/supervision` showing cases requiring attention, aggregated data, and sorted by urgency.

---

## 1. API Route

### `app/api/supervision/dashboard/route.ts`

**GET `/api/supervision/dashboard`**

**Features**:
- Fetches all active (non-archived) cases for org
- For each case:
  - Fetches evidence items (outstanding, requested, escalated)
  - Calculates outstanding evidence count
  - Calculates oldest outstanding age (days)
  - Detects overdue chases (7+ days, no chase)
  - Detects escalations due (14+ days)
  - Fetches risk flags to determine risk rating
- Aggregates summary counts:
  - Cases blocked by evidence
  - Overdue chases
  - Escalations due
  - High risk cases
- Sorts cases by urgency:
  1. Escalation (14+ days)
  2. Overdue (7+ days)
  3. High risk (CRITICAL/HIGH risk rating)
  4. Normal
- Within same urgency, sorts by oldest outstanding age (descending)

**Response Format**:
```typescript
{
  summary: {
    casesBlockedByEvidence: number,
    overdueChases: number,
    escalationsDue: number,
    highRiskCases: number
  },
  cases: [
    {
      caseId: string,
      caseTitle: string,
      practiceArea: string,
      riskRating: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
      outstandingEvidenceCount: number,
      oldestOutstandingAge: number | null,
      nextChaseDue: string | null,
      urgency: "escalation" | "overdue" | "high_risk" | "normal",
      hasEscalationDue: boolean,
      hasOverdueChase: boolean
    }
  ]
}
```

**Performance**:
- Single query for cases
- Batch queries for evidence items and risk flags
- Efficient filtering (only includes cases needing attention)
- No N+1 queries

---

## 2. Dashboard Page

### `app/(protected)/dashboard/supervision/page.tsx`

**Server Component** - Simple wrapper that ensures authentication

**Features**:
- Uses `requireAuthContext()` for auth
- Renders `SupervisionDashboard` client component

---

## 3. Dashboard Component

### `components/supervision/SupervisionDashboard.tsx`

**Client Component** - Main dashboard with summary tiles and table

**Features**:
- Fetches data from API on mount
- Loading state with spinner
- Error state with friendly message
- Summary tiles (4 cards)
- Supervision table component

**Summary Tiles**:
1. **Cases Blocked by Evidence** - Count of cases with outstanding evidence
2. **Overdue Chases** - Count of cases with 7+ day overdue chases
3. **Escalations Due** - Count of cases with 14+ day escalations
4. **High Risk Cases** - Count of cases with CRITICAL/HIGH risk

**Layout**:
- Responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
- Uses `StatCard` component from `components/ui/card.tsx`

---

## 4. Supervision Table Component

### `components/supervision/SupervisionTable.tsx`

**Client Component** - Table displaying cases requiring attention

**Columns**:
1. **Case Name** - Link to case page (Evidence Tracker section)
   - Shows urgency badges (Escalation/Overdue)
2. **Practice Area** - Badge with practice area label
3. **Risk Rating** - Badge with color coding:
   - CRITICAL: Red
   - HIGH: Yellow
   - MEDIUM: Blue
   - LOW: Gray
4. **Outstanding Evidence** - Count with icon
5. **Oldest Outstanding** - Days since oldest outstanding item
6. **Next Chase Due** - Human-readable label (e.g., "Chase due in 3 days")

**Features**:
- Empty state when no cases need attention
- Hover effects on rows
- Links to case page with `#evidence-tracker` anchor
- Urgency badges on case names
- Color-coded risk ratings

**Sorting**:
- Pre-sorted by API (urgency → oldest outstanding age)
- No client-side sorting (keeps it simple)

---

## 5. Files Created/Modified

### New Files
1. `app/api/supervision/dashboard/route.ts` - Aggregation API
2. `app/(protected)/dashboard/supervision/page.tsx` - Page route
3. `components/supervision/SupervisionDashboard.tsx` - Main dashboard
4. `components/supervision/SupervisionTable.tsx` - Cases table

### Modified Files
- None (no schema changes, no existing code changes)

---

## 6. Manual Test Steps

### Test 1: Basic Display
1. Navigate to `/dashboard/supervision`
2. Verify page loads without errors
3. Check summary tiles display correct counts
4. Verify table shows cases requiring attention
5. Check all columns display correctly

### Test 2: Summary Tiles
1. Create a case with outstanding evidence
2. Refresh dashboard
3. Verify "Cases Blocked by Evidence" count increases
4. Create evidence item with 7+ day overdue chase
5. Verify "Overdue Chases" count increases
6. Create evidence item with 14+ day escalation
7. Verify "Escalations Due" count increases
8. Create case with HIGH risk flag
9. Verify "High Risk Cases" count increases

### Test 3: Table Sorting
1. Create multiple cases with different urgencies:
   - Case A: Escalation due
   - Case B: Overdue chase
   - Case C: High risk
2. Refresh dashboard
3. Verify cases appear in order: A, B, C
4. Within same urgency, verify oldest outstanding appears first

### Test 4: Case Links
1. Click on a case name in the table
2. Verify navigates to case page
3. Verify URL includes `#evidence-tracker` anchor
4. Verify Evidence Tracker section is visible

### Test 5: Empty State
1. Archive all cases with issues
2. Refresh dashboard
3. Verify empty state message displays
4. Message should be calm and informative

### Test 6: Risk Rating Display
1. Create cases with different risk ratings:
   - CRITICAL risk flag
   - HIGH risk flag
   - MEDIUM risk flag
   - LOW risk flag
   - No risk flags
2. Verify each displays correct badge color
3. Verify "UNKNOWN" shows for cases with no risk flags

### Test 7: Practice Area Labels
1. Create cases with different practice areas
2. Verify practice area column shows correct labels
3. Verify unknown practice areas show raw value

### Test 8: Performance
1. Create 50+ cases with various issues
2. Load dashboard
3. Verify loads in < 2 seconds
4. Verify no N+1 query issues (check network tab)

---

## 7. UX Design Principles

**Calm & Authoritative**:
- No "AI hype" language
- Professional, management-focused tone
- Clear, concise labels
- Minimal visual noise

**Readability**:
- Clear column headers
- Consistent badge styling
- Logical information hierarchy
- Easy to scan

**Actionability**:
- Direct links to case pages
- Urgency clearly indicated
- Key metrics at a glance
- Sorted by priority

---

## 8. Data Aggregation Logic

**Cases Blocked by Evidence**:
- Case has ≥1 evidence item with status "outstanding" or "requested"

**Overdue Chases**:
- Case has ≥1 evidence item where:
  - Status is "requested" or "outstanding"
  - `requested_at` exists
  - `now - requested_at >= 7 days`
  - (`last_chased_at` is null OR `now - last_chased_at >= 7 days`)

**Escalations Due**:
- Case has ≥1 evidence item where:
  - `now - requested_at >= 14 days`
  - `escalated_at` is null

**High Risk Cases**:
- Case has ≥1 unresolved risk flag with severity "CRITICAL" or "HIGH"

**Risk Rating**:
- Highest severity from unresolved risk flags
- If no risk flags: "UNKNOWN"

**Oldest Outstanding Age**:
- Oldest `requested_at` or `created_at` from outstanding/requested items
- Calculated in days

**Next Chase Due**:
- Uses `nextDueLabel()` from `lib/evidence/dueLogic.ts`
- Returns earliest due label across all evidence items

---

## Summary

✅ **API Route**: Aggregated supervision data with efficient queries  
✅ **Dashboard Page**: `/dashboard/supervision` route  
✅ **Summary Tiles**: 4 key metrics at a glance  
✅ **Supervision Table**: Cases sorted by urgency with all required columns  
✅ **Read-Only**: No mutations, supervisor-safe  
✅ **Fast Loading**: Single aggregation query, no N+1  
✅ **Calm UX**: Professional, management-focused design  

**Ready for testing.**

