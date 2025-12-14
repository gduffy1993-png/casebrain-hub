# Quick Changes Checklist

## ✅ MUST DO (Critical)

### 1. Run Database Migration
```sql
-- File: supabase/migrations/0053_case_analysis_versions.sql
-- Run this in Supabase SQL Editor or via CLI
```

### 2. Verify Dependencies
```bash
# Check if @radix-ui/react-dropdown-menu is needed
npm list @radix-ui/react-dropdown-menu
# If not found and dropdown doesn't work, install:
npm install @radix-ui/react-dropdown-menu
```

---

## ✅ TEST (Required)

### Phase 4 - Supervisor Dashboard
- [ ] Go to `/dashboard/supervision`
- [ ] Check summary tiles show numbers
- [ ] Check table shows cases
- [ ] Click a case name → should go to case page

### Incremental Case Update
- [ ] Open any case
- [ ] Click 3-dots menu (top right of Actions card)
- [ ] Click "Add documents" → upload a PDF
- [ ] Click "Re-run analysis" → wait for completion
- [ ] Check if delta panel appears (shows what changed)
- [ ] Click "Analysis history" → should show versions

### Win Stories
- [ ] Open any case
- [ ] Click 3-dots menu → "Capture Win Story"
- [ ] Enter title, click "Capture Win Story"
- [ ] Go to `/dashboard/win-stories`
- [ ] Should see your win story in list
- [ ] Click "View Details" → should show full snapshot

### Confidence Framing
- [ ] Open a case with missing evidence
- [ ] Check Missing Evidence panel
- [ ] Verify explanations say "Based on the current documents..." or "may be required"
- [ ] Should NOT say "is required" or "must be"

---

## 📁 Files Created (27 new files)

### API Routes (8 files)
- `app/api/supervision/dashboard/route.ts`
- `app/api/win-stories/route.ts`
- `app/api/win-stories/[id]/route.ts`
- `app/api/cases/[caseId]/documents/add/route.ts`
- `app/api/cases/[caseId]/analysis/rerun/route.ts`
- `app/api/cases/[caseId]/analysis/versions/route.ts`
- `app/api/cases/[caseId]/analysis/versions/[versionNumber]/route.ts`
- `app/api/cases/[caseId]/win-stories/route.ts`

### Pages (2 files)
- `app/(protected)/dashboard/supervision/page.tsx`
- `app/(protected)/dashboard/win-stories/page.tsx`

### Components (11 files)
- `components/supervision/SupervisionDashboard.tsx`
- `components/supervision/SupervisionTable.tsx`
- `components/cases/CaseActionsMenu.tsx`
- `components/cases/AddDocumentsModal.tsx`
- `components/cases/AnalysisHistoryModal.tsx`
- `components/cases/AnalysisDeltaPanel.tsx`
- `components/cases/AnalysisDeltaPanelWrapper.tsx`
- `components/cases/CasePageClientWithActions.tsx`
- `components/cases/CaptureWinStoryModal.tsx`
- `components/win-stories/WinStoriesDashboard.tsx`
- `components/ui/dropdown-menu.tsx`

### Libraries (2 files)
- `lib/analysis/delta-engine.ts`
- `lib/confidenceFraming.ts`

### Migrations (1 file)
- `supabase/migrations/0053_case_analysis_versions.sql`

### Documentation (3 files)
- `docs/SUPERVISION_DASHBOARD_IMPLEMENTATION.md`
- `docs/INCREMENTAL_CASE_UPDATE_IMPLEMENTATION.md`
- `docs/WIN_STORIES_AND_CONFIDENCE_IMPLEMENTATION.md`

---

## 📝 Files Modified (3 files)

1. **`app/(protected)/cases/[caseId]/page.tsx`**
   - Added imports (lines ~93-94)
   - Added CasePageClientWithActions to Actions card (line ~971)
   - Added AnalysisDeltaPanelWrapper after Evidence Tracker (line ~1164)
   - Updated case query to fetch `latest_analysis_version` and `analysis_stale` (line ~117)

2. **`lib/missing-evidence.ts`**
   - Added import: `frameMissingEvidenceExplanation` (line ~3)
   - Applied framing to `reason` field (line ~216)

3. **`lib/key-issues.ts`**
   - Added import: `frameKeyIssue` (line ~7)
   - (Ready for future use)

---

## 🚨 If Something Breaks

### Dropdown Menu Not Working
- Install: `npm install @radix-ui/react-dropdown-menu`
- Or use the simple implementation in `components/ui/dropdown-menu.tsx`

### Migration Fails
- Check if table `case_analysis_versions` already exists
- Check if columns `latest_analysis_version` and `analysis_stale` already exist on `cases` table
- If they exist, migration will skip (safe to run multiple times)

### API Routes Return 404
- Check file paths match exactly
- Check Next.js routing (should auto-detect)
- Restart dev server: `npm run dev`

### Components Not Showing
- Check browser console for errors
- Check imports are correct
- Verify all dependencies installed

---

## 📊 Summary

- **27 new files created**
- **3 existing files modified**
- **1 database migration** (MUST RUN)
- **4 new features** (Supervision Dashboard, Incremental Updates, Win Stories, Confidence Framing)
- **0 new environment variables** needed
- **0 breaking changes** to existing features

All changes are additive and backward-compatible.

