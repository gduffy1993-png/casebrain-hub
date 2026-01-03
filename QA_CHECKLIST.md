# QA Checklist - Criminal Case Page Stability

This document tracks expected UI outcomes for canonical test packs to ensure firm-safe, court-safe behavior.

## Test Pack A: Simple Synthetic Pack (`CaseBrain_Simple_Criminal_Test_Pack.pdf)

**Characteristics:**
- Single merged PDF
- Contains explicit charge strings (s18 + alt s20)
- Minimal text extraction (may trigger preview mode)

**Expected Outcomes:**

### Charges Panel
- **Status:** ✅ Charges extracted (Y)
- **Details:** Should show s18 charge with "Alt: s20" as alias badge
- **Confidence:** Low (0.3-0.65) - acceptable for fallback extraction
- **Status:** "pending" - acceptable
- **Never show:** "No charges recorded" when test pack contains charge table

### Missing Evidence Panel
- **Status:** (None/Preview/Complete) but **NEVER error**
- **Details:**
  - If `analysis_mode="none"`: "Missing evidence cannot be assessed yet — run Full Analysis."
  - If `analysis_mode="preview"`: "Preview mode — run Full Analysis to enable evidence gap detection."
  - If `analysis_mode="complete"` + empty: "No missing evidence flagged in this analysis (may change with new documents)."
- **Never show:** "Unable to load missing evidence panel right now."

### Strategy Analysis Banner
- **Status:** (Not run/Preview/Complete) but **NEVER error**
- **Details:**
  - If `has_analysis_version=false`: "Strategy analysis: Not run yet"
  - If `analysis_mode="preview"`: "Strategy analysis: Preview (thin extraction / gated)"
  - If `analysis_mode="complete"`: "Strategy analysis: Complete"
  - **IMPORTANT:** If strategy routes are already rendered, show Preview/Complete (not "Not run")
- **Never show:** "Strategy analysis error" when data exists

### Confidence Cap Behavior
- **Status:** LOW (capped)
- **Details:**
  - Confidence must be capped to LOW when:
    - `analysis_mode="preview"`
    - `analysis_mode="none"`
    - `isGated=true`
    - `textThin=true` OR `docCount < 2` OR `rawCharsTotal < 1000`
  - Show badge: "Confidence capped (preview/gated)"
  - **Never show:** HIGH confidence when analysis is gated/thin

---

## Test Pack B: Thin Pack (Scanned/Image-Only PDF)

**Characteristics:**
- Scanned PDF with minimal extractable text
- `rawCharsTotal < 1000`
- `suspectedScanned=true`

**Expected Outcomes:**

### Charges Panel
- **Status:** May show "No charges recorded" (acceptable if no text extracted)
- **OR:** Fallback extraction if any text found (low confidence)

### Missing Evidence Panel
- **Status:** Preview mode
- **Message:** "Preview mode — run Full Analysis to enable evidence gap detection."
- **Never show:** Error message

### Strategy Analysis Banner
- **Status:** Preview mode
- **Message:** "Strategy analysis: Preview (thin extraction / gated)"
- **Never show:** Error message

### Confidence Cap Behavior
- **Status:** LOW (capped)
- **Reason:** Thin extraction triggers preview mode

---

## Test Pack C: Full Pack (Complete Bundle)

**Characteristics:**
- Multiple documents
- Rich text extraction
- `rawCharsTotal >= 1000`
- `docCount >= 2`
- Full analysis run

**Expected Outcomes:**

### Charges Panel
- **Status:** ✅ Charges extracted (Y)
- **Confidence:** Medium-High (0.65-0.9)
- **Status:** May be "pending", "proceeding", etc.

### Missing Evidence Panel
- **Status:** Complete mode
- **Message:** "No missing evidence flagged in this analysis (may change with new documents)." OR list of missing items
- **Never show:** Error message

### Strategy Analysis Banner
- **Status:** Complete mode
- **Message:** "Strategy analysis: Complete"
- **Never show:** Error message

### Confidence Cap Behavior
- **Status:** Can be HIGH/MEDIUM (not capped)
- **Details:** Only capped if explicitly gated or preview mode

---

## Common Fail-Safe Requirements (All Packs)

1. **No Panel Crashes:**
   - All panels must render a neutral safe state on API failure
   - Never throw unhandled errors
   - Use `safeFetch` helper for consistent error handling

2. **Court-Safe Language:**
   - Never claim "all evidence present" unless explicitly confirmed
   - Use "UNASSESSED" status for items with unknown state
   - Default to conservative messaging (preview/not run) when uncertain

3. **Backward Compatibility:**
   - Support both wrapped (`{ data: ... }`) and direct API response shapes
   - Normalize at UI boundary, keep legacy shapes supported

4. **DEV-Only Logging:**
   - Console errors only in development
   - Include endpoint URL + status code for debugging
   - Never log sensitive data in production

---

## Verification Steps

1. **Upload Test Pack A:**
   - Verify charges show s18 with Alt: s20 alias
   - Verify Missing Evidence panel shows appropriate state (never error)
   - Verify Strategy banner shows appropriate state (never error)
   - Verify confidence is capped LOW

2. **Upload Test Pack B:**
   - Verify all panels show preview/neutral states (never error)
   - Verify confidence is capped LOW

3. **Upload Test Pack C:**
   - Verify all panels show complete states
   - Verify confidence can be HIGH/MEDIUM (not always capped)

4. **Network Failure Simulation:**
   - Disable network / block API endpoints
   - Verify all panels show neutral fallback states (never crash)

---

## Files Changed (Reference)

- `lib/utils/safe-fetch.ts` - Safe fetch helper
- `components/core/MissingEvidencePanel.tsx` - Never-error panel with safeFetch
- `components/criminal/CaseFightPlan.tsx` - Accurate strategy banner with safeFetch
- `app/api/criminal/[caseId]/charges/route.ts` - Fallback charge parsing
- `QA_CHECKLIST.md` - This file

