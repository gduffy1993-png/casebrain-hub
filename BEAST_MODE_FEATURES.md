# CaseBrain Beast Mode Features

## 🚀 PHASE 1: Demo Ready ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| Compliance Dashboard | ✅ DONE | `/compliance` | `lib/compliance.ts`, `app/(protected)/compliance/page.tsx` |
| Audio → Attendance Note | ✅ DONE | `/cases/[caseId]` | `components/cases/AudioCallsPanel.tsx`, `app/api/cases/[caseId]/audio/route.ts` |
| Smart Chasers + Next Steps | ✅ DONE | Case page | `lib/next-step.ts`, `components/core/NextStepPanel.tsx` |

## 🎯 PHASE 2: Sell to Firms ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| Semantic Search / Precedent Finder | ✅ DONE | `/search` | `lib/semantic-search.ts`, `app/(protected)/search/page.tsx` |
| Dangerous Gaps Auto-Flags | ✅ DONE | Case page | `components/core/ComplianceGapsPanel.tsx` |
| Risk Tunnel View | ✅ DONE | Case page | `components/core/RiskTunnelView.tsx` |
| Outcome Pathway Predictor | ✅ DONE | Case page | `lib/outcome-pathway.ts`, `components/core/OutcomePathwayPanel.tsx` |

## 🏢 PHASE 3: PMS Replacement ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| Protocol / Court Deadline Brain | ✅ DONE | Case page | `lib/court-deadlines.ts`, `components/core/CourtDeadlinesPanel.tsx` |
| Document Strength Grader | ✅ DONE | - | `lib/document-grader.ts` |
| Complaint Risk Predictor | ✅ DONE | - | `lib/complaint-risk.ts` |
| Fee Earner Load Balancer | ✅ DONE | `/team` | `lib/workload.ts`, `app/(protected)/team/page.tsx` |
| Billing / WIP Health View | ✅ DONE | `/team` | `lib/workload.ts` (integrated) |

## 💎 PHASE G: Secret Gems ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| Client Update Generator | ✅ DONE | Case page | `lib/client-update.ts`, `components/cases/ClientUpdatePanel.tsx` |
| Opponent Activity Radar V1 | ✅ DONE | Case page | `lib/opponent-radar.ts`, `components/cases/OpponentRadarPanel.tsx` |
| Bundle Navigator Phase A | ✅ DONE | Case page | `lib/bundle-navigator.ts`, `components/cases/BundlePhaseAPanel.tsx` |

## 📚 PHASE B/C/D: Full Bundle Navigator ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| Phase B: Chunked Processing | ✅ DONE | API | `lib/bundle-navigator.ts`, `app/api/cases/[caseId]/bundle/process` |
| Phase C: TOC + Timeline + Search | ✅ DONE | API | `components/cases/BundleNavigatorFullPanel.tsx` |
| Phase D: Issues Map + Contradictions | ✅ DONE | API | `app/api/cases/[caseId]/bundle/issues`, `app/api/cases/[caseId]/bundle/contradictions` |

## 📦 PHASE H: Export & Intake ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| H1: Case Pack PDF Export | ✅ DONE | `/api/cases/[caseId]/case-pack` | `lib/case-pack.ts`, `lib/pdf/case-pack-pdf.ts`, `components/cases/CasePackExportButton.tsx` |
| H2: Email Intake (Forward-to-CaseBrain) | ✅ DONE | `/api/intake/email` | `lib/email-intake.ts`, `app/api/intake/email/route.ts` |
| H3: Outlook "Send to CaseBrain" Hook | ✅ DONE | `/api/intake/outlook` | `app/api/intake/outlook/route.ts` |

**H1 - Case Pack PDF Export**: Generate a downloadable PDF report containing case overview, timeline, bundle analysis, issues map, contradictions, risks, limitation status, next steps, and draft client update. Uses `pdfkit` for professional PDF generation.

**H2 - Email Intake**: HTTP endpoint for email gateways to forward emails into CaseBrain. Auto-routes to existing cases via `[CASE:XXX]` subject patterns or creates new cases. Stores attachments as documents and email body as case notes.

**H3 - Outlook Intake Hook**: Specialized endpoint for the Outlook "Send to CaseBrain" add-in. Normalizes Outlook message format and uses the email intake handler. Supports API key authentication and CORS for add-in integration.

## 👔 PHASE I: Solicitor Tools ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| I1: Key Facts Sheet | ✅ DONE | `/api/cases/[caseId]/key-facts` | `lib/key-facts.ts`, `components/cases/KeyFactsPanel.tsx` |
| I2: Correspondence Timeline | ✅ DONE | `/api/cases/[caseId]/correspondence` | `lib/correspondence.ts`, `components/cases/CorrespondenceTimelinePanel.tsx` |
| I3: Instructions to Counsel | ✅ DONE | `/api/cases/[caseId]/instructions` | `lib/instructions-to-counsel.ts`, `components/cases/InstructionsToCounselPanel.tsx` |

**I1 - Key Facts Sheet**: Comprehensive case overview panel showing parties, stage, funding, key dates (incident, limitation, next deadline), main risks, primary issues, and next steps. Pulls data from all existing brains.

**I2 - Correspondence Timeline**: Chronological view of all case correspondence (emails, letters, phone notes). Shows direction (in/out), party (client/opponent/court), gap analysis, and opponent response patterns.

**I3 - Instructions to Counsel**: Generates a comprehensive draft Instructions to Counsel document with sections for parties, instructions, chronology, issues, evidence, risks, opponent behaviour, and questions for counsel. Aggregates data from all available brains.

## ⚖️ PHASE J: Document Intelligence ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| J1: Clause Red-Flag Detector | ✅ DONE | `/api/cases/[caseId]/documents/[documentId]/redflags` | `lib/clause-redflags.ts`, `components/cases/ClauseRedFlagsPanel.tsx` |
| J2: Hearing Preparation Pack | ✅ DONE | `/api/cases/[caseId]/hearing-prep` | `lib/hearing-prep.ts`, `components/cases/HearingPrepPanel.tsx` |

**J1 - Clause Red-Flag Detector**: Analyses documents for dangerous clauses, unfair terms, liability caps, indemnities, repair obligations, and hidden risks. Uses pattern matching and AI to detect issues in contracts, leases, and agreements.

**J2 - Hearing Preparation Pack**: One-click generation of comprehensive hearing prep including case overview, chronology, issues map, evidence summary, contradictions, opponent analysis, risks, draft questions for cross-examination, draft submissions, and pre-hearing checklist.

## 📊 PHASE K: Case Intelligence ✅ COMPLETE

| Feature | Status | Route | Main Files |
|---------|--------|-------|------------|
| K1: Complaint Risk Meter | ✅ DONE | `/api/cases/[caseId]/complaint-risk` | `lib/complaint-risk-meter.ts`, `components/cases/ComplaintRiskPanel.tsx` |
| K2: Outcome Insights Engine | ✅ DONE | `/api/cases/[caseId]/outcome-insights` | `lib/outcome-insights.ts`, `components/cases/OutcomeInsightsPanel.tsx` |

**K1 - Complaint Risk Meter**: Calculates a complaint risk score (0-100) based on communication patterns, deadline compliance, evidence gaps, risk flags, opponent behaviour, and task completion. Includes suggestions for risk reduction.

**K2 - Outcome Insights Engine**: Provides non-binding statistical guidance on typical settlement ranges, time-to-resolution estimates, and influencing factors. Analyses evidence strength, issues, contradictions, and case patterns. Clearly labelled as NOT legal advice.

---

## Master Checklist

### Core Brains (lib/)
- [x] `lib/core/risks.ts` - Risk flag generation
- [x] `lib/core/riskCopy.ts` - Risk alert copy/messaging
- [x] `lib/core/limitation.ts` - Limitation period calculation
- [x] `lib/compliance.ts` - Compliance score calculation
- [x] `lib/next-step.ts` - Next step engine
- [x] `lib/semantic-search.ts` - Semantic search
- [x] `lib/outcome-pathway.ts` - Outcome pathway predictor
- [x] `lib/court-deadlines.ts` - CPR deadline calculation
- [x] `lib/document-grader.ts` - Document strength grading
- [x] `lib/complaint-risk.ts` - Complaint risk assessment
- [x] `lib/workload.ts` - Fee earner load & WIP health
- [x] `lib/missing-evidence.ts` - Missing evidence finder
- [x] `lib/heatmap.ts` - Case heatmap computation
- [x] `lib/in-case-search.ts` - In-case document search
- [x] `lib/client-update.ts` - Client update email generator
- [x] `lib/opponent-radar.ts` - Opponent activity tracking
- [x] `lib/bundle-navigator.ts` - Bundle analysis (Phase A)
- [x] `lib/case-pack.ts` - Case pack PDF builder
- [x] `lib/email-intake.ts` - Email intake handler
- [x] `lib/pdf/case-pack-pdf.ts` - PDF generation utility
- [x] `lib/key-facts.ts` - Key facts summary builder
- [x] `lib/correspondence.ts` - Correspondence timeline builder
- [x] `lib/instructions-to-counsel.ts` - Instructions to Counsel generator
- [x] `lib/clause-redflags.ts` - Dangerous clause detector
- [x] `lib/hearing-prep.ts` - Hearing preparation pack builder
- [x] `lib/complaint-risk-meter.ts` - Complaint risk calculator
- [x] `lib/outcome-insights.ts` - Outcome likelihood engine

### Types (lib/types/)
- [x] `lib/types/casebrain.ts` - All shared types centralized

### UI Components (components/)
- [x] `components/core/KeyIssuesPanel.tsx`
- [x] `components/core/InCaseSearchBox.tsx`
- [x] `components/core/MissingEvidencePanel.tsx`
- [x] `components/core/CaseHeatmapPanel.tsx`
- [x] `components/core/CaseNotesPanel.tsx`
- [x] `components/core/NextStepPanel.tsx`
- [x] `components/core/ComplianceGapsPanel.tsx`
- [x] `components/core/RiskTunnelView.tsx`
- [x] `components/core/OutcomePathwayPanel.tsx`
- [x] `components/core/CourtDeadlinesPanel.tsx`
- [x] `components/cases/AudioCallsPanel.tsx`
- [x] `components/cases/SimilarCasesPanel.tsx`
- [x] `components/cases/ClientUpdatePanel.tsx`
- [x] `components/cases/OpponentRadarPanel.tsx`
- [x] `components/cases/BundlePhaseAPanel.tsx`
- [x] `components/cases/BundleNavigatorFullPanel.tsx`
- [x] `components/cases/CasePackExportButton.tsx`
- [x] `components/cases/KeyFactsPanel.tsx`
- [x] `components/cases/CorrespondenceTimelinePanel.tsx`
- [x] `components/cases/InstructionsToCounselPanel.tsx`
- [x] `components/cases/ClauseRedFlagsPanel.tsx`
- [x] `components/cases/HearingPrepPanel.tsx`
- [x] `components/cases/ComplaintRiskPanel.tsx`
- [x] `components/cases/OutcomeInsightsPanel.tsx`

### Pages (app/(protected)/)
- [x] `/dashboard` - Main dashboard
- [x] `/cases` - Case list
- [x] `/cases/[caseId]` - Case detail (enhanced)
- [x] `/compliance` - Compliance dashboard
- [x] `/search` - Semantic search
- [x] `/team` - Team workload & billing
- [x] `/bin` - Archived cases

### API Routes (app/api/)
- [x] `/api/cases/[caseId]/audio` - Audio upload & processing
- [x] `/api/cases/[caseId]/similar` - Find similar cases
- [x] `/api/cases/[caseId]/notes` - Case notes
- [x] `/api/cases/[caseId]/search` - In-case search
- [x] `/api/cases/[caseId]/archive` - Archive case
- [x] `/api/cases/[caseId]/restore` - Restore case
- [x] `/api/cases/[caseId]/permanent-delete` - Permanent delete
- [x] `/api/cases/[caseId]/client-update` - Generate client update
- [x] `/api/cases/[caseId]/opponent` - Opponent activity
- [x] `/api/cases/[caseId]/bundle` - Bundle analysis
- [x] `/api/cases/[caseId]/bundle/process` - Continue chunk processing
- [x] `/api/cases/[caseId]/bundle/overview` - Bundle overview
- [x] `/api/cases/[caseId]/bundle/toc` - Table of contents
- [x] `/api/cases/[caseId]/bundle/timeline` - Bundle timeline
- [x] `/api/cases/[caseId]/bundle/search` - Search within bundle
- [x] `/api/cases/[caseId]/bundle/issues` - Issues map
- [x] `/api/cases/[caseId]/bundle/contradictions` - Contradiction finder
- [x] `/api/cases/[caseId]/case-pack` - Generate case pack PDF
- [x] `/api/intake/email` - Email intake endpoint
- [x] `/api/intake/outlook` - Outlook add-in intake endpoint
- [x] `/api/cases/[caseId]/key-facts` - Key facts summary
- [x] `/api/cases/[caseId]/correspondence` - Correspondence timeline
- [x] `/api/cases/[caseId]/instructions` - Instructions to Counsel generator
- [x] `/api/cases/[caseId]/documents/[documentId]/redflags` - Clause red-flag analysis
- [x] `/api/cases/[caseId]/hearing-prep` - Hearing preparation pack
- [x] `/api/cases/[caseId]/complaint-risk` - Complaint risk score
- [x] `/api/cases/[caseId]/outcome-insights` - Outcome insights

### Database Migrations
- [x] `0023_case_notes.sql` - Case notes table
- [x] `0024_case_calls_attendance_notes.sql` - Audio/calls and attendance notes
- [x] `0025_correspondence_tracking.sql` - Correspondence tracking
- [x] `0026_semantic_search.sql` - Semantic search embeddings
- [x] `0027_client_updates_opponent_bundles.sql` - Client updates, opponent tracking, bundle fields
- [x] `0028_bundle_full_analysis.sql` - Full bundle analysis tables
- [x] `0029_fix_settings_and_templates.sql` - Fixed settings and templates tables

⚠️ **IMPORTANT**: These migrations must be run in Supabase SQL Editor to create the required tables. Some features will show errors until migrations are applied.

---

## Quality Gates ✅

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing features preserved
- [x] Dark theme consistent throughout
- [x] Documentation updated

---

## 📋 Current Status (Last Updated: Nov 28, 2025)

### ✅ Working Features
- Case list / archive / bin system
- Dashboard
- Compliance dashboard
- Team workload view
- Housing dashboard
- Case detail page (core)
- Bundle Navigator
- Correspondence timeline
- Court deadlines
- Risk alerts / Key issues
- Missing evidence finder

### ⚠️ Features Requiring Migration
The following features need database tables created. Run the migrations in `supabase/migrations/` folder in Supabase SQL Editor:

| Feature | Missing Table | Migration File |
|---------|--------------|----------------|
| Case Notes | `case_notes` | `0023_case_notes.sql` |
| Audio/Calls | `case_calls`, `attendance_notes` | `0024_case_calls_attendance_notes.sql` |
| Client Update Generator | case columns | `0027_client_updates_opponent_bundles.sql` |
| Opponent Radar | case columns | `0027_client_updates_opponent_bundles.sql` |

### Utility Files
- [x] `lib/key-issues.ts` - Server-safe key issues builder (moved from client component)

---

## 🎛️ MULTI-PACK SYSTEM ✅ COMPLETE (Nov 28, 2025)

CaseBrain now supports **config-driven practice area packs**. Each pack defines:
- Evidence requirements (what documents are needed)
- Risk rules (what to flag as risky)
- Limitation rules (how limitation applies)
- Compliance items (SRA/regulatory requirements)
- AI prompt hints (for each brain)

### Supported Practice Areas

| Pack | ID | Main Files |
|------|-----|------------|
| Housing Disrepair | `housing_disrepair` | `lib/packs/housing.ts` |
| Personal Injury | `personal_injury` | `lib/packs/pi.ts` |
| Clinical Negligence | `clinical_negligence` | `lib/packs/clinicalNeg.ts` |
| Family | `family` | `lib/packs/family.ts` |
| Other Litigation | `other_litigation` | `lib/packs/base.ts` |

### Pack System Files

| File | Purpose |
|------|---------|
| `lib/packs/types.ts` | Type definitions for packs (LitigationPack, PackEvidenceRequirement, etc.) |
| `lib/packs/index.ts` | Pack registry and accessor functions |
| `lib/packs/base.ts` | Fallback generic litigation pack |
| `lib/packs/housing.ts` | Housing disrepair specialist pack |
| `lib/packs/pi.ts` | Personal injury specialist pack |
| `lib/packs/clinicalNeg.ts` | Clinical negligence specialist pack |
| `lib/packs/family.ts` | Family law specialist pack |

### Usage

```typescript
import { getPackForPracticeArea, getEvidenceChecklist, getRiskRules } from "@/lib/packs";

// Get the full pack for a practice area
const pack = getPackForPracticeArea("housing_disrepair");

// Get evidence checklist (includes inherited from base pack)
const evidence = getEvidenceChecklist("personal_injury");

// Get risk rules
const risks = getRiskRules("clinical_negligence");

// Get AI prompt hints
import { getPromptHint } from "@/lib/packs";
const hint = getPromptHint("family", "hearingPrep");
```

### Database Migration

Run `supabase/migrations/0030_standardize_practice_area.sql` to:
- Add `practice_area` column to `cases` table (if not exists)
- Normalize legacy values (`pi` → `personal_injury`, `housing` → `housing_disrepair`, etc.)

### UI Changes

1. **Upload Form**: Added practice area selector dropdown
2. **Case Detail**: Shows practice area badge in header
3. **Evidence Finder**: Now uses pack-specific evidence requirements
4. **Compliance Brain**: Now uses pack-specific compliance items
