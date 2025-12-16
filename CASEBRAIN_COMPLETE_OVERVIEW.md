# CaseBrain - Complete System Overview

## What is CaseBrain?

CaseBrain is a **production-ready AI paralegal workspace** for law firms. It's a comprehensive litigation management platform that enables solicitors to:

- Upload disclosure packs and extract structured data
- Generate strategic intelligence and move sequences
- Track evidence gaps and missing documentation
- Create versioned case analysis snapshots
- Generate letters from approved templates
- Export audit-ready case bundles
- Manage cases across multiple practice areas

**Tech Stack:**
- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL) with 55+ migrations
- **Auth**: Clerk multi-tenant authentication (org roles: owner, solicitor, paralegal, viewer)
- **AI**: OpenAI (gpt-4o-mini, gpt-4-turbo) for document extraction and analysis
- **File Processing**: pdf-parse, mammoth, pdfkit, docx for PDF/Word document handling

---

## Core Architecture

### 1. Multi-Practice Area System

CaseBrain supports **6 practice areas**, each with specialized intelligence:

1. **Clinical Negligence** (`clinical_negligence`)
   - Breach, causation, and harm detection
   - Expert witness requirement detection
   - Momentum engine with "STRONG (Expert Pending)" state
   - Evidence versioning system

2. **Housing Disrepair** (`housing_disrepair`)
   - Awaab's Law compliance monitoring (14-day investigation, 7-day work start deadlines)
   - Hazard assessment (HHSRS Category 1/2)
   - Quantum calculator
   - Deadline management
   - Social landlord detection

3. **Personal Injury** (`personal_injury`)
   - Protocol compliance (Pre-Action Protocol)
   - Medical report tracking
   - Limitation date calculation (3 years)
   - Risk assessment

4. **Criminal Defense** (`criminal`)
   - PACE compliance tracking
   - Disclosure breach detection
   - Evidence chain of custody
   - Defense strategy generation
   - Loophole detection

5. **Family Law** (`family`)
   - Safeguarding timelines
   - Social services records tracking
   - Contact decisions
   - Chronology consistency

6. **Other Litigation** (`other_litigation`)
   - Generic litigation support
   - Standard evidence tracking

### 2. Evidence Maps System

Each practice area has an **Evidence Map** that defines:
- **Expected Evidence**: What documents should exist (e.g., "Radiology Report", "Custody Record")
- **When Expected**: Timeline expectations (e.g., "Within 14 days of report")
- **What Missing Means**: Legal implications of absence
- **Normal Patterns**: Expected behaviors (e.g., "Repairs logged monthly")
- **Governance Rules**: Compliance requirements (e.g., "Awaab's Law: 14-day investigation")

**Location**: `lib/strategic/evidence-maps/`

**Files**:
- `clinical-negligence.ts` - CN evidence expectations
- `housing-disrepair.ts` - Housing + Awaab's Law obligations
- `personal-injury.ts` - PI evidence patterns
- `criminal-defense.ts` - Criminal evidence (PACE, disclosure, continuity)
- `family-law.ts` - Family evidence expectations
- `other-litigation.ts` - Generic fallback
- `index.ts` - Central registry

---

## Strategic Intelligence System

### Move Sequencing Engine

The **Move Sequencing Intelligence** system generates solicitor-grade strategic move ordering:

**Core Components**:

1. **Anomaly Detector** (`lib/strategic/move-sequencing/anomaly-detector.ts`)
   - Detects timeline anomalies (gaps, delays)
   - Finds narrative inconsistencies
   - Identifies evidence gaps
   - Detects governance gaps
   - Enhanced detection: treatment delays, symptoms vs imaging, addendum timing, late-created notes

2. **Hypothesis Generator** (`lib/strategic/move-sequencing/hypothesis-generator.ts`)
   - Converts observations into testable hypotheses
   - Generates investigation angles
   - Creates "If X then Y should exist" framing

3. **Move Sequencer** (`lib/strategic/move-sequencing/move-sequencer.ts`)
   - Orders moves by cost/benefit
   - Adds dependencies between moves
   - Identifies fork points (admit/deny/silence branches)
   - Calculates cost analysis

4. **Partner Verdict Generator** (`lib/strategic/move-sequencing/partner-verdict.ts`)
   - Senior solicitor assessment
   - Case stage determination
   - Current reality (blunt, evidence-based)
   - Fastest upgrade path
   - What flips the case

5. **Pressure Triggers** (`lib/strategic/move-sequencing/pressure-triggers.ts`)
   - Conditional aggression logic
   - Role-specific triggers:
     - **CN**: Delay + deterioration + surgery → PRESSURE
     - **CN**: Radiology discrepancy/addendum → STRIKE
     - **Housing**: Awaab's Law breach → STRIKE
     - **Criminal**: Disclosure gaps → STRIKE
   - Never defaults to STRIKE - must be justified

6. **Win/Kill Conditions** (`lib/strategic/move-sequencing/win-kill-conditions.ts`)
   - **Win Conditions**: What must exist to justify issue
   - **Kill Conditions**: What proves case not viable
   - Evidence-based only
   - Prevents wasted expert spend

7. **Letter Templates** (`lib/strategic/move-sequencing/letter-templates.ts`)
   - Copy-paste ready solicitor letters
   - Practice-area specific:
     - Recipient (Trust Legal, CPS, Landlord, etc.)
     - Subject line
     - Body (neutral, "If X then Y should exist" framing)
   - Criminal: 7-day deadline (vs 14 days for civil)

8. **Awaab's Law Detector** (`lib/strategic/move-sequencing/awaabs-law-detector.ts`) - Housing only
   - Detects triggers: mould, damp, social landlord, complaints, health impact
   - Calculates statutory deadlines (14 days investigation, 7 days work start)
   - Generates breach status and countdown
   - Recommended moves (LBA, injunction)

**Output Structure** (`lib/strategic/move-sequencing/types.ts`):

```typescript
type MoveSequence = {
  partnerVerdict?: {
    caseStage: string;
    currentReality: string;
    fastestUpgradePath: string;
    whatFlipsThisCase: string;
  };
  winConditions?: string[];
  killConditions?: string[];
  pressureTriggers?: Array<{
    trigger: string;
    whyItMatters: string;
    recommendedTone: "PROBE" | "PRESSURE" | "STRIKE";
  }>;
  awaabsLawStatus?: {  // Housing only
    applies: boolean;
    breachDetected: boolean;
    countdownStatus: string;
    recommendedMove: string;
    triggers: string[];
  };
  observations: Observation[];
  investigationAngles: InvestigationAngle[];
  moveSequence: Move[];
  warnings: string[];
  costAnalysis: {
    costBeforeExpert: number;
    expertTriggeredOnlyIf: string;
    unnecessarySpendAvoidedIfGapConfirmed: number;
  };
};
```

**Main Engine**: `lib/strategic/move-sequencing/engine.ts`
- Orchestrates all components
- Generates complete move sequence
- Integrates with evidence maps
- Role-aware (all practice areas)

---

## Evidence & Strategy Versioning System

### Overview

A complete versioning system that allows solicitors to:
1. Select documents for analysis
2. Run strategic analysis on selected evidence bundle
3. Create versioned snapshots of analysis
4. Track changes between versions
5. View unified missing evidence

### Database Schema

**Table**: `case_analysis_versions` (migration 0053)

```sql
CREATE TABLE case_analysis_versions (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  org_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  document_ids UUID[] NOT NULL,
  risk_rating TEXT,  -- Momentum state
  summary TEXT,  -- 3-5 line plain English
  key_issues JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  missing_evidence JSONB DEFAULT '[]',  -- Unified source of truth
  analysis_delta JSONB,  -- Changes vs previous version
  move_sequence JSONB,  -- Strategic move sequence (migration 0054)
  created_at TIMESTAMPTZ,
  created_by TEXT,
  UNIQUE(case_id, version_number)
);
```

**Key Fields**:
- `version_number`: Incremental (1, 2, 3...)
- `document_ids`: UUID array of documents used in this analysis
- `missing_evidence`: Unified list - single source of truth
- `analysis_delta`: Computed changes vs previous version
- `move_sequence`: Complete strategic move sequence output

### API Endpoints

1. **`POST /api/cases/[caseId]/analysis/rebuild`**
   - Accepts `document_ids` array
   - Re-runs strategic analysis with selected documents
   - Creates new version in `case_analysis_versions`
   - Generates move sequence
   - Computes delta vs previous version
   - Returns version details

2. **`GET /api/cases/[caseId]/analysis/version/latest`**
   - Returns latest analysis version
   - Includes `document_ids`, `missing_evidence`, `analysis_delta`, `move_sequence`
   - Returns safe empty response if no version exists

3. **`GET /api/strategic/[caseId]/overview`**
   - Generates strategic overview
   - Automatically creates new version on generation
   - Computes delta vs previous version
   - Includes move sequence in response

4. **`GET /api/cases/[caseId]/documents`**
   - Lists all documents for a case
   - Used by EvidenceSelectorModal

### UI Components

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
   - Unified to read from `case_analysis_versions.missing_evidence`
   - Fetches from latest version endpoint
   - Converts version format to UI format

5. **`MoveSequencePanel`** (`components/strategic/MoveSequencePanel.tsx`)
   - Displays complete move sequence
   - Shows Partner Verdict, Win/Kill Conditions, Pressure Triggers
   - Shows Awaab's Law Status (housing only)
   - Displays observations, investigation angles, moves
   - Shows letter templates for each move
   - Cost analysis display

### Core Logic

1. **`lib/strategic/compute-analysis-delta.ts`**
   - `computeAnalysisDelta(prev, next)` function
   - Compares momentum, key issues, missing evidence
   - Returns delta with human-readable notes

2. **`lib/strategic/momentum-engine.ts`**
   - `calculateCaseMomentum()` function
   - Detects breach, causation, harm
   - Returns "STRONG (Expert Pending)" when breach+causation+harm detected but expert missing

---

## Document Processing Pipeline

### Upload Flow

1. **Upload** (`app/api/upload/route.ts`)
   - Accepts PDF, DOCX, images
   - Stores in Supabase Storage
   - Creates `documents` record

2. **Extraction** (`lib/ai.ts`, `lib/core/extraction.ts`)
   - PDF text extraction with OCR fallback
   - Word document parsing
   - AI-powered entity extraction:
     - Parties (claimant, defendant, witnesses)
     - Dates (incident, limitation, deadlines)
     - Amounts (damages, costs)
     - Key issues (breach, causation, harm)
   - Stores in `documents.extracted_json`

3. **Redaction** (`lib/redact.ts`)
   - Automatic PII detection and redaction
   - Configurable redaction rules

### Document Storage

**Table**: `documents`

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  file_url TEXT,
  raw_text TEXT,  -- Extracted text
  extracted_json JSONB,  -- Structured AI extraction
  created_at TIMESTAMPTZ,
  ...
);
```

---

## Strategic Routes System

**Location**: `lib/strategic/strategy-paths.ts`

Generates multiple legitimate litigation pathways (Route A/B/C/D/E) for each case:

- **Route A**: Procedural leverage (unless orders, costs)
- **Route B**: Practice-area specific (e.g., Awaab's Law for housing, Disclosure breach for criminal)
- **Route C**: Expert contradiction / cross-examination
- **Route D**: Settlement pressure
- **Route E**: Hybrid approach

**Criminal-Specific Route B**:
- Disclosure breach / PACE compliance leverage
- Focuses on CPIA 1996 disclosure obligations
- PACE 1984 compliance issues
- Procedural leverage (stay of proceedings, evidence exclusion)

---

## Database Schema Overview

### Core Tables

- **`cases`**: Main case records
  - `practice_area`: housing_disrepair, personal_injury, clinical_negligence, family, criminal, other_litigation
  - `latest_analysis_version`: Tracks current version number
  - `analysis_stale`: Flag for re-analysis needed

- **`documents`**: Uploaded documents
  - `raw_text`: Extracted text
  - `extracted_json`: Structured AI extraction

- **`case_analysis_versions`**: Versioned analysis snapshots
  - `version_number`: Incremental
  - `document_ids`: UUID array
  - `risk_rating`: Momentum state
  - `summary`: Plain English summary
  - `key_issues`: JSONB array
  - `timeline`: JSONB array
  - `missing_evidence`: JSONB array (unified source)
  - `analysis_delta`: JSONB (changes vs previous)
  - `move_sequence`: JSONB (strategic move sequence)

- **`timeline_events`**: Chronology events
- **`deadlines`**: Case deadlines
- **`letters`**: Generated letters
- **`tasks`**: Task management

### Practice-Area Specific Tables

- **`housing_cases`**: Housing disrepair metadata
  - Awaab's Law tracking fields
  - HHSRS hazards
  - Tenant vulnerability

- **`criminal_cases`**: Criminal case metadata
  - Court information
  - Bail status
  - Plea tracking

- **`criminal_charges`**: Individual charges
- **`criminal_evidence`**: Prosecution/defense evidence
- **`pace_compliance`**: PACE compliance tracking
- **`disclosure_tracker`**: Disclosure status
- **`criminal_loopholes`**: Defense loopholes
- **`defense_strategies`**: Defense strategies
- **`criminal_hearings`**: Court hearings

- **`pi_cases`**: Personal injury metadata
- **`pi_medical_reports`**: Medical report tracking

### Key Relationships

- Cases → Documents (one-to-many)
- Cases → Analysis Versions (one-to-many)
- Cases → Timeline Events (one-to-many)
- Cases → Deadlines (one-to-many)
- Cases → Practice-Area Tables (one-to-one)

---

## Authentication & Authorization

- **Clerk** handles authentication
- Multi-tenant with organization support
- Roles: owner, solicitor, paralegal, viewer
- `requireAuthContext()` helper for API routes
- Paywall system with usage limits (28-day free trial, 1 case, 10 documents)

---

## Key Workflows

### 1. Case Creation & Document Upload

1. User uploads documents via `/upload`
2. Documents stored in Supabase Storage
3. AI extraction runs (entities, dates, issues)
4. Case created or updated
5. Documents linked to case

### 2. Strategic Analysis & Versioning

1. User clicks "Re-analyse with new evidence" (or "Run analysis (v1)")
2. EvidenceSelectorModal opens
3. User selects documents
4. POST to `/api/cases/[caseId]/analysis/rebuild`
5. System:
   - Fetches selected documents
   - Runs strategic analysis (momentum, strategies, missing evidence)
   - Generates move sequence
   - Computes delta vs previous version
   - Creates new `case_analysis_versions` row
6. Modal closes, UI refreshes
7. All components display updated data

### 3. Move Sequence Generation

1. Engine loads evidence map for practice area
2. Detects anomalies (timeline, gaps, inconsistencies)
3. Generates observations with leverage potential
4. Creates investigation angles (hypotheses)
5. Generates moves (ordered by cost/benefit)
6. Adds fork points (admit/deny/silence)
7. Generates partner verdict, win/kill conditions, pressure triggers
8. Creates letter templates for each move
9. Calculates cost analysis
10. Returns complete `MoveSequence` object

### 4. Awaab's Law Detection (Housing)

1. Detects social landlord context
2. Checks for qualifying hazards (mould, damp, excess cold, water ingress)
3. Extracts first report date from timeline/documents
4. Calculates deadlines:
   - Investigation: 14 days from first report
   - Work start: 7 days from investigation
5. Checks for breaches
6. Generates countdown/overdue status
7. Recommends moves (LBA, injunction)
8. Surfaces as CRITICAL observation and STRIKE pressure trigger

---

## File Structure

```
app/
├── (protected)/          # Protected routes (require auth)
│   ├── cases/[caseId]/  # Main case detail page
│   ├── dashboard/       # Dashboard
│   └── ...
├── api/                  # API routes (168 files)
│   ├── cases/[caseId]/
│   │   ├── analysis/
│   │   │   ├── rebuild/route.ts
│   │   │   └── version/latest/route.ts
│   │   └── documents/route.ts
│   ├── strategic/[caseId]/
│   │   └── overview/route.ts
│   └── upload/route.ts
└── ...

components/
├── cases/               # Case-related components
│   ├── EvidenceStrategyHeader.tsx
│   ├── EvidenceSelectorModal.tsx
│   ├── WhatChangedPanel.tsx
│   └── MomentumBadge.tsx
├── strategic/           # Strategic intelligence components
│   ├── MoveSequencePanel.tsx
│   ├── StrategicOverviewCard.tsx
│   └── StrategicRoutesPanel.tsx
├── core/                # Core reusable components
│   └── MissingEvidencePanel.tsx
└── ui/                  # UI primitives

lib/
├── strategic/           # Strategic analysis logic
│   ├── move-sequencing/
│   │   ├── engine.ts
│   │   ├── anomaly-detector.ts
│   │   ├── hypothesis-generator.ts
│   │   ├── move-sequencer.ts
│   │   ├── partner-verdict.ts
│   │   ├── pressure-triggers.ts
│   │   ├── win-kill-conditions.ts
│   │   ├── letter-templates.ts
│   │   ├── awaabs-law-detector.ts  # Housing only
│   │   └── types.ts
│   ├── evidence-maps/  # Practice-area evidence maps
│   ├── momentum-engine.ts
│   ├── compute-analysis-delta.ts
│   ├── strategy-paths.ts
│   └── ...
├── analysis/            # Evidence detection
│   ├── breach.ts
│   ├── causation.ts
│   ├── harm.ts
│   └── expert-detection.ts
└── ...

supabase/
└── migrations/          # 55+ database migrations
    ├── 0053_case_analysis_versions.sql
    ├── 0054_add_move_sequence_to_versions.sql
    ├── 0055_add_criminal_practice_area.sql
    └── ...
```

---

## Environment Variables

Key variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `REDACTION_SECRET`
- `PAYWALL_MODE` (trial/off)

---

## Recent Major Features

### 1. Move Sequencing Intelligence (Latest)
- Partner verdict generation
- Win/kill conditions
- Conditional aggression (pressure triggers)
- Enhanced anomaly detection
- Copy-paste letter templates
- Fixed cost/savings logic
- Role-aware across all practice areas
- Awaab's Law integration (housing)

### 2. Evidence & Strategy Versioning
- Versioned analysis snapshots
- Delta computation
- Unified missing evidence
- Document selection for analysis
- "What Changed" tracking

### 3. Awaab's Law Intelligence (Housing)
- Automatic breach detection
- Statutory deadline calculation
- Countdown/overdue status
- Strategic route integration
- STRIKE pressure trigger

### 4. Criminal Law Integration
- Evidence map for criminal defense
- PACE compliance tracking
- Disclosure breach detection
- Criminal-specific strategy routes
- Criminal-specific letter templates

---

## Key Design Principles

1. **Evidence-Driven**: All intelligence based on actual documents, not speculation
2. **Deterministic**: No LLM hallucinations - rule-based detection with AI extraction
3. **Supervision-Safe**: Solicitor-grade language, no accusations
4. **Role-Aware**: Practice-area specific intelligence, not generic
5. **Versioned**: Track changes over time, not just current state
6. **Unified**: Single source of truth (e.g., missing evidence from latest version)
7. **Actionable**: Copy-paste ready outputs (letters, moves, recommendations)

---

## Build & Deployment

- **Build**: `npm run build` (TypeScript enforced)
- **Deploy**: Vercel-ready (Next.js)
- **Database**: Supabase hosted
- **Status**: Production-ready, 85 pages generated

---

This is a comprehensive litigation management platform with AI-powered document analysis, strategic intelligence, and practice-area specific features. The move sequencing system provides solicitor-grade strategic guidance across all practice areas, with special intelligence for Clinical Negligence, Housing Disrepair (Awaab's Law), and Criminal Defense.

