# CaseBrain Hub - Complete Application Overview

## Application Overview

CaseBrain Hub is a production-ready AI paralegal workspace for law firms built with Next.js 14, Supabase, and Clerk. It enables solicitors to upload disclosure packs, extract entities and timelines, generate letters from approved templates, and export audit-ready case bundles in minutes.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL) with 51+ migrations
- **Auth**: Clerk multi-tenant authentication (org roles: owner, solicitor, paralegal, viewer)
- **AI**: OpenAI (gpt-4o-mini, gpt-4-turbo) for document extraction and analysis
- **File Processing**: pdf-parse, mammoth, pdfkit, docx for PDF/Word document handling
- **Testing**: Playwright (E2E), Vitest (unit tests)

## Key Features

### 1. Case Management
- Multi-practice area support: Clinical Negligence, Personal Injury, Housing Disrepair, Criminal Defense, Family Law
- Document upload and extraction pipeline
- Timeline and chronology generation
- Key facts and issues extraction
- Case bundling and export

### 2. Strategic Intelligence (Recently Enhanced)
- **Evidence & Strategy Loop**: Versioned analysis system for Clinical Negligence cases
- Case momentum calculation (WEAK/BALANCED/STRONG/STRONG (Expert Pending))
- Strategic path generation
- Missing evidence detection and tracking
- Analysis versioning with delta computation
- "What Changed" tracking between versions

### 3. Document Processing
- PDF text extraction with OCR fallback
- Word document parsing
- AI-powered entity extraction (parties, dates, amounts, key issues)
- Document version control
- Redaction support

### 4. Practice Area Modules

#### Clinical Negligence
- Breach, causation, and harm detection
- Expert witness requirement detection
- Momentum engine with "STRONG (Expert Pending)" state
- Evidence versioning system

#### Housing Disrepair
- AWAAB compliance monitoring
- Hazard assessment
- Quantum calculator
- Deadline management
- Letter generation

#### Personal Injury
- Protocol compliance
- Medical report tracking
- Limitation date calculation
- Risk assessment

#### Criminal Defense
- Aggressive defense strategies
- Loophole detection
- Evidence analysis
- PACE compliance

### 5. Workflow Features
- Task management
- Deadline tracking
- Letter generation from templates
- Email integration
- Client portal
- Audit trail

## Recent Major Implementation: Evidence & Strategy Versioning

### Overview
Implemented a complete versioning system for case analysis that allows solicitors to:
1. Select documents for analysis
2. Run strategic analysis on selected evidence bundle
3. Create versioned snapshots of analysis
4. Track changes between versions
5. View unified missing evidence

### Key Components

#### Database Schema
- `case_analysis_versions` table stores:
  - `version_number` (incremental)
  - `document_ids` (UUID array of documents used)
  - `risk_rating` (momentum state)
  - `summary` (3-5 line plain English)
  - `key_issues` (JSONB array)
  - `timeline` (JSONB array)
  - `missing_evidence` (JSONB array - unified source of truth)
  - `analysis_delta` (JSONB - changes vs previous version)

#### API Endpoints

1. **`POST /api/cases/[caseId]/analysis/rebuild`**
   - Accepts `document_ids` array
   - Re-runs strategic analysis with selected documents
   - Creates new version in `case_analysis_versions`
   - Returns version details and delta

2. **`GET /api/cases/[caseId]/analysis/version/latest`**
   - Returns latest analysis version
   - Includes `document_ids`, `missing_evidence`, `analysis_delta`
   - Returns safe empty response if no version exists

3. **`GET /api/cases/[caseId]/documents`**
   - Lists all documents for a case
   - Used by EvidenceSelectorModal

4. **`GET /api/strategic/[caseId]/overview`**
   - Generates strategic overview
   - Automatically creates new version on generation
   - Computes delta vs previous version

#### UI Components

1. **`EvidenceStrategyHeader`** (`components/cases/EvidenceStrategyHeader.tsx`)
   - Shows case momentum badge
   - Displays version number and last updated time
   - "Re-analyse with new evidence" button (or "Run analysis (v1)" for first run)
   - Empty state: "No analysis version yet. Run analysis to create v1."
   - CN-only (clinical_negligence practice area)

2. **`EvidenceSelectorModal`** (`components/cases/EvidenceSelectorModal.tsx`)
   - Modal for selecting documents to include in analysis
   - Pre-checks documents from latest version
   - Shows loading state during rebuild
   - Inline error handling (keeps modal open on error)
   - Helper text: "Select at least one document to run analysis."

3. **`WhatChangedPanel`** (`components/cases/WhatChangedPanel.tsx`)
   - Displays `analysis_delta` from latest version
   - Shows momentum changes, new/resolved issues, missing evidence changes
   - First version message: "This is the first full analysis for this case."
   - CN-only

4. **`MissingEvidencePanel`** (`components/core/MissingEvidencePanel.tsx`)
   - Now unified to read from `case_analysis_versions.missing_evidence`
   - Fetches from latest version endpoint
   - Converts version format to UI format
   - Backward compatible (still accepts items prop)

5. **`MomentumBadge`** (`components/cases/MomentumBadge.tsx`)
   - Visual badge for momentum states
   - Color-coded (WEAK=red, BALANCED=yellow, STRONG=green, STRONG (Expert Pending)=blue)

#### Core Logic

1. **`lib/strategic/compute-analysis-delta.ts`**
   - `computeAnalysisDelta(prev, next)` function
   - Compares momentum, key issues, missing evidence
   - Returns delta with human-readable notes

2. **`lib/strategic/momentum-engine.ts`**
   - `calculateCaseMomentum()` function
   - Detects breach, causation, harm
   - Returns "STRONG (Expert Pending)" when breach+causation+harm detected but expert missing

3. **`lib/analysis/{breach,causation,harm,expert-detection}.ts`**
   - Rule-based detection modules
   - Analyze extracted JSON from documents
   - Return evidence indicators

## Project Structure

### Key Directories

```
app/
├── (protected)/          # Protected routes (require auth)
│   ├── cases/[caseId]/  # Main case detail page
│   ├── dashboard/       # Dashboard
│   └── ...
├── api/                  # API routes (167 files)
│   ├── cases/[caseId]/
│   │   ├── analysis/
│   │   │   ├── rebuild/route.ts
│   │   │   └── version/latest/route.ts
│   │   └── documents/route.ts
│   └── strategic/[caseId]/
│       └── overview/route.ts
└── ...

components/
├── cases/               # Case-related components
│   ├── EvidenceStrategyHeader.tsx
│   ├── EvidenceSelectorModal.tsx
│   ├── WhatChangedPanel.tsx
│   └── MomentumBadge.tsx
├── core/                # Core reusable components
│   └── MissingEvidencePanel.tsx
├── strategic/           # Strategic intelligence components
└── ui/                  # UI primitives (buttons, cards, etc.)

lib/
├── strategic/           # Strategic analysis logic
│   ├── momentum-engine.ts
│   ├── compute-analysis-delta.ts
│   ├── strategy-paths.ts
│   └── ...
├── analysis/            # Evidence detection
│   ├── breach.ts
│   ├── causation.ts
│   ├── harm.ts
│   └── expert-detection.ts
├── missing-evidence.ts  # Missing evidence detection
└── ...

supabase/
└── migrations/          # 51+ database migrations
    └── 0053_case_analysis_versions.sql
```

## Database Schema Highlights

### Core Tables
- `cases` - Main case records
- `documents` - Uploaded documents with `raw_text` and `extracted_json`
- `case_analysis_versions` - Versioned analysis snapshots (NEW)
- `timeline_events` - Chronology events
- `deadlines` - Case deadlines
- `letters` - Generated letters
- `tasks` - Task management

### Key Relationships
- Cases → Documents (one-to-many)
- Cases → Analysis Versions (one-to-many)
- Cases → Timeline Events (one-to-many)
- Cases → Deadlines (one-to-many)

## Authentication & Authorization

- **Clerk** handles authentication
- Multi-tenant with organization support
- Roles: owner, solicitor, paralegal, viewer
- `requireAuthContext()` helper for API routes
- Paywall system with usage limits

## Environment Variables

Key variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `REDACTION_SECRET`

## Recent Work Summary

1. **Evidence & Strategy Versioning System**
   - Created `case_analysis_versions` table
   - Implemented version creation in strategic overview API
   - Built delta computation logic
   - Created rebuild endpoint for manual analysis runs
   - Built UI components for evidence selection and version display
   - Unified missing evidence to single source of truth

2. **UX Hardening**
   - Error handling in EvidenceSelectorModal
   - Empty state clarity for first-run
   - Prevented double refresh/redundant fetching
   - CN-only gating for new features

3. **Build Status**
   - All TypeScript types correct
   - Build passes successfully
   - No linter errors
   - 85 pages generated

## Key Implementation Details

### Evidence & Strategy Flow

1. User clicks "Re-analyse with new evidence" (or "Run analysis (v1)" for first run)
2. EvidenceSelectorModal opens, pre-checks documents from latest version
3. User selects documents, clicks "Run New Analysis (v+1)"
4. POST to `/api/cases/[caseId]/analysis/rebuild` with `document_ids`
5. Endpoint:
   - Fetches selected documents
   - Runs strategic analysis (momentum, strategies, missing evidence)
   - Computes delta vs previous version
   - Creates new `case_analysis_versions` row
   - Returns version details
6. Modal closes, `router.refresh()` called
7. All components re-fetch latest version and display updated data

### Momentum Calculation

For Clinical Negligence:
- Detects breach, causation, harm from documents
- If all three present → "STRONG"
- If all three present but expert missing → "STRONG (Expert Pending)"
- Otherwise → "WEAK" or "BALANCED"

### Missing Evidence Unification

- Single source: `case_analysis_versions.missing_evidence`
- Format: `{ area, label, priority, notes }`
- Areas: medical_records, expert, witness, funding, admin, other
- Priorities: CRITICAL, HIGH, MEDIUM, LOW
- MissingEvidencePanel fetches from latest version
- Strategic Overview text uses same source

## Testing

- Playwright E2E tests
- Vitest unit tests
- Build-time type checking enforced
- Manual testing checklist completed

## Deployment

- Vercel-ready (Next.js)
- Supabase hosted database
- Environment variables configured
- Build passes: `npm run build`

---

This is a production-ready legal tech application with comprehensive case management, AI-powered document analysis, and strategic intelligence features. The recent Evidence & Strategy versioning system provides a complete workflow for solicitors to iteratively analyze cases as new evidence arrives.

