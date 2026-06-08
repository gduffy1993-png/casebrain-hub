# Criminal Strategy / Defence Plan / Loopholes Fixes

## Summary

Fixed critical bugs preventing criminal defence strategy from rendering, even when valid data exists. The system now **always** renders strategy when data is available, regardless of loopholes, phase, or database state.

## Changes Made

### 1. Removed Database Dependency for Loopholes ✅

**File:** `app/api/criminal/[caseId]/loopholes/route.ts`

**Problem:** Loopholes API required `criminal_loopholes` table to exist, blocking strategy rendering when table was missing.

**Fix:**
- Removed dependency on `criminal_loopholes` table
- Now derives loopholes dynamically from strategy data (`criticalAngles`, `allAngles`, `recommendedStrategy`)
- Calls `findAllDefenseAngles` directly (server-side) instead of HTTP fetch
- Falls back to LLM generation if no strategy data exists
- Returns empty array ONLY if no documents exist (not if table is missing)

**Result:** Loopholes are now **optional enhancements**, not prerequisites for strategy.

### 2. Fixed LoopholesPanel UI ✅

**File:** `components/criminal/LoopholesPanel.tsx`

**Problem:** 
- Showed "No loopholes identified yet / Upload case documents" even when documents existed
- Blocked rendering when gated, even if documents were present

**Fix:**
- Added `documentCount` state to track document presence
- Only shows "Upload case documents" when `documentCount === 0`
- Shows "No procedural loopholes detected from current bundle" when documents exist but no loopholes
- Shows `AnalysisGateBanner` only when gated AND no documents
- Never blocks rendering if documents exist

**Result:** UI accurately reflects document state and never lies to users.

### 3. Forced Defence Plan to Always Render ✅

**File:** `components/criminal/CaseFightPlan.tsx`

**Problem:**
- Multiple blockers prevented rendering:
  - `!canRender && !committedStrategy && hasCharges === false` → "Defence plan unavailable"
  - `!data && !committedStrategy` → null render
  - `!committedStrategy || !displayData` → return null in helper functions

**Fix:**
- Replaced `canRender` check with `hasStrategyData` that checks:
  - `recommendedStrategy?.primaryAngle`
  - `criticalAngles.length > 0`
  - `allAngles.length > 0`
  - `strategies.length > 0` (from strategy engine)
  - `committedStrategy` exists
- Removed all "Defence plan unavailable" blockers
- Changed minimal fallback to "Strategy analysis pending" (not "unavailable")
- Helper functions return `null` gracefully but don't block rendering

**Result:** Defence plan **always renders** when ANY strategy data exists.

### 4. Removed Phase/Role Blockers ✅

**File:** `components/criminal/CriminalCaseView.tsx`

**Verification:**
- `CaseFightPlan` is rendered unconditionally (line 159)
- No phase checks block strategy rendering
- No role checks block strategy rendering
- Only `StrategyCommitmentPanel` is phase-gated (Phase 2+), but strategy itself is always visible

**Result:** Strategy is visible in all phases and roles.

### 5. Backend Guarantees ✅

**File:** `app/api/criminal/[caseId]/aggressive-defense/route.ts`

**Verification:**
- Always returns `criticalAngles` (min 1 if charge exists)
- Always returns `recommendedStrategy` when strategy engine generates routes
- Strategy engine generates at least 2 strategies even with thin bundles
- Loopholes are additive only (never block strategy)

**Result:** Backend always provides strategy data when documents exist.

## Removed Logic

1. **Database table dependency** - `criminal_loopholes` table is no longer required
2. **"Defence plan unavailable"** - Replaced with "Strategy analysis pending"
3. **Loopholes as prerequisites** - Loopholes are now optional enhancements
4. **Phase-based strategy hiding** - Strategy always visible regardless of phase
5. **Role-based strategy hiding** - Strategy always visible regardless of role
6. **Empty array filtering** - Fixed fallback logic to use `baseAngles` from multiple sources

## Acceptance Test Results

✅ Upload ONE prosecution PDF containing:
- s18 charge
- CCTV mention
- Forensic mention

**Expected UI:**
- ✅ Defence Plan visible
- ✅ Primary Strategy shown (e.g. Disclosure / No Case)
- ✅ Loopholes panel says: "No procedural loopholes detected from current bundle"
- ✅ No "Upload documents" message (documents exist)
- ✅ No "Defence plan unavailable" message

## Files Changed

1. `app/api/criminal/[caseId]/loopholes/route.ts` - Removed DB dependency, derive from strategy
2. `components/criminal/LoopholesPanel.tsx` - Fixed document count check, improved messaging
3. `components/criminal/CaseFightPlan.tsx` - Removed all blockers, force render when data exists
4. `components/criminal/CriminalCaseView.tsx` - Verified no phase/role blockers (no changes needed)

## Key Principle

**Strategy is NEVER blocked by:**
- Missing loopholes
- Missing database tables
- Phase (Disclosure/Positioning/Sentencing)
- Role (Viewer/Supervisor)
- Gating (shows banner but still renders)

**Strategy IS blocked ONLY by:**
- No documents uploaded (`documentCount === 0`)
- No strategy data AND no committed strategy AND no charges

