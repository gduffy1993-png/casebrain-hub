# CaseBrain Hub - Complete Technical Guide
## For AI Assistants (Copilot, ChatGPT, etc.)

**Version:** 1.0  
**Last Updated:** January 2025  
**Purpose:** Complete technical documentation of CaseBrain Hub's architecture, workflows, and implementation details.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Criminal Defense Strategy System](#criminal-defense-strategy-system)
4. [Document Processing Pipeline](#document-processing-pipeline)
5. [Strategy Generation Flow](#strategy-generation-flow)
6. [Key Components](#key-components)
7. [Data Models](#data-models)
8. [API Endpoints](#api-endpoints)
9. [UI Components](#ui-components)
10. [Security & Access Control](#security--access-control)

---

## System Overview

**CaseBrain Hub** is a production-ready AI-powered legal practice management system built for UK solicitors. It combines traditional case management (like Clio) with sophisticated AI-powered strategy generation, evidence analysis, and procedural compliance tracking.

### Core Value Proposition

1. **AI-Powered Strategy Generation**: Generates defense strategies, attack paths, and tactical plans for criminal cases
2. **Evidence-First Analysis**: All analysis is grounded in extracted evidence, not speculation
3. **Court-Safe Outputs**: All generated content is designed to be court-safe and auditable
4. **Multi-Practice Area Support**: Criminal, Housing, PI, Clinical Negligence, Family Law
5. **Deterministic Logic**: Core strategy logic is deterministic and reproducible

### Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL) with 55+ migrations
- **Auth**: Clerk multi-tenant authentication
- **AI**: OpenAI (gpt-4o-mini, gpt-4-turbo) for document extraction and analysis
- **File Processing**: pdf-parse, mammoth, pdfkit, docx

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CaseBrain Hub                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Frontend   │  │  API Routes  │  │  Database   │       │
│  │  (Next.js)   │◄─┤  (Next.js)   │◄─┤ (Supabase)  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │              │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │         AI Services (OpenAI)                      │      │
│  │  - Document Extraction                            │      │
│  │  - Strategy Generation                             │      │
│  │  - Evidence Analysis                              │      │
│  └──────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Architecture

- Each organization has isolated data via `org_id` column
- Clerk organizations map to `org_id` in Supabase
- Row-Level Security (RLS) enforces data isolation
- All queries must filter by `org_id` for security

### Practice Area Modules

Each practice area has:
- **Structured Extractors**: Extract case-specific data from documents
- **Strategy Engines**: Generate practice-area-specific strategies
- **Compliance Trackers**: Track practice-area-specific requirements
- **Lens Configs**: UI and behavior configuration per practice area

---

## Criminal Defense Strategy System

**This is the most sophisticated part of CaseBrain Hub.** It generates comprehensive defense strategies for criminal cases.

### Overview

The Criminal Defense Strategy System generates:
1. **Strategy Routes**: Three primary routes (Fight Charge, Charge Reduction, Outcome Management)
2. **Attack Paths**: Specific tactical attacks on prosecution case
3. **CPS Responses**: Anticipated prosecution responses and counter-strategies
4. **Kill Switches**: Conditions that would make a route unsafe
5. **Pivot Plans**: When and how to change strategy
6. **Evidence Impact Maps**: How missing evidence affects strategy
7. **Beast Strategy Pack**: 9-section comprehensive strategy pack

### Strategy Generation Flow

```
1. Document Upload
   ↓
2. Text Extraction (PDF/Word)
   ↓
3. Structured Extraction (Criminal-specific)
   ├─ Charges extraction
   ├─ Hearings extraction
   ├─ PACE compliance detection
   └─ Disclosure tracking
   ↓
4. Analysis Gate Check
   ├─ Minimum text threshold (800 chars)
   ├─ Scanned document detection
   └─ Text quality assessment
   ↓
5. Strategy Analysis (if gate passes)
   ├─ Evidence signal extraction
   ├─ Route viability assessment
   ├─ Attack path generation
   ├─ CPS response simulation
   └─ Kill switch identification
   ↓
6. Strategy Commitment
   ├─ Solicitor selects primary route
   ├─ Position recording
   └─ Phase 2 activation
   ↓
7. Phase 2 Strategy Pack
   ├─ Beast Strategy Pack (9 sections)
   ├─ Procedural safety status
   ├─ Weapon tracker
   ├─ Incident shape classifier
   ├─ Worst-case cap
   ├─ Declared dependencies
   ├─ Irreversible decisions
   └─ Disclosure timeline
```

### Analysis Gate

**Critical Safety Feature**: Prevents AI generation when evidence is insufficient.

**Gate Rules:**
- `canGenerateAnalysis = true` if:
  - Total extracted text >= 800 characters
  - Not suspected scanned document
  - Text quality is sufficient
- When `canGenerateAnalysis = false`:
  - System returns deterministic templates
  - No AI-generated content
  - Clear labels indicating "template" vs "evidence-backed"

**Why This Matters:**
- Prevents hallucinations
- Ensures court-safe outputs
- Maintains solicitor control

### Strategy Routes

Three primary routes for criminal defense:

#### 1. Fight Charge
- **Goal**: Full acquittal
- **When**: Strong defense case, weak prosecution evidence
- **Tactics**: PACE breaches, disclosure failures, evidence challenges

#### 2. Charge Reduction
- **Goal**: Downgrade charge (e.g., s18 → s20)
- **When**: Some evidence supports prosecution, but not full charge
- **Tactics**: Intent challenges, causation arguments, medical evidence disputes

#### 3. Outcome Management
- **Goal**: Minimize sentence/outcome
- **When**: Conviction likely, focus on mitigation
- **Tactics**: Sentencing factors, mitigation evidence, character references

### Beast Strategy Pack

**The "Beast Pack" is a 9-section comprehensive strategy document:**

1. **CPS Case Theory**: What prosecution is alleging
2. **Defence Counter-Theory**: Defense narrative
3. **Attack Paths**: Specific tactical attacks
4. **CPS Responses**: Anticipated prosecution moves
5. **Disclosure Leverage Chain**: How to use disclosure gaps
6. **Courtroom Pressure Test**: Judge questions and responses
7. **Kill Switches**: Conditions that kill the strategy
8. **Pivot Plan**: When to change strategy
9. **Residual Attack Scanner**: Additional angles if primary fails

### Evidence Impact Mapping

**Tracks how missing evidence affects strategy:**

- **Missing Item**: e.g., "CCTV from Aroma Kebab 23:10-23:30"
- **Affects Routes**: Which strategy routes are impacted
- **Urgency**: before_ptph, before_trial, anytime
- **Feeds Attack Paths**: Which attack paths depend on this evidence

### Procedural Safety Status

**Derived status indicating case safety:**

- **SAFE**: Can proceed with strategy
- **CONDITIONALLY UNSAFE**: Proceed with caution
- **UNSAFE TO PROCEED**: Must wait for disclosure

**Rules:**
- If key disclosure items outstanding (CCTV, BWV, 999, CAD, interview) → UNSAFE TO PROCEED
- This is a formal defense posture indicator, not just a warning

### Weapon Proof Tracker

**Structured tracker for alleged weapons:**

- Alleged weapon (e.g., "glass bottle")
- Visually observed by complainant? (yes/no/unclear)
- Weapon recovered? (yes/no/unknown)
- Forensic confirmation? (yes/no)
- Disclosure-dependent? (boolean)

### Incident Shape Classifier

**Classifies the alleged incident:**

- `single impulsive blow`: One strike, no duration evidence
- `brief chaotic scuffle`: Multiple brief interactions
- `sustained targeted attack`: Prolonged, deliberate
- `unclear / disclosure-dependent`: Insufficient evidence

### Worst-Case Cap Panel

**Non-speculative exposure ceiling:**

Template: "Even on adverse disclosure, the realistic ceiling of this case is [X], absent evidence of [Y], because [Z remains unproven]."

**Rules:**
- No predictions
- No percentages
- No assumptions about unserved disclosure
- Deterministic and evidence-based

---

## Document Processing Pipeline

### 1. Upload

- Files uploaded to Supabase Storage
- Supported formats: PDF, DOCX, TXT, images (OCR)
- Automatic virus scanning (if configured)

### 2. Text Extraction

- **PDF**: pdf-parse library
- **Word**: mammoth library
- **Images**: OCR (if configured)
- **Fallback**: If extraction fails, document is marked as "scanned"

### 3. Structured Extraction

**Criminal-specific extraction:**
- Charges (offence, section, date, plea)
- Hearings (court, date, type)
- PACE compliance (breaches, timing)
- Disclosure items (CCTV, BWV, 999, etc.)
- Defendant details
- Bail status

**Extraction Methods:**
- Regex patterns for structured data
- AI extraction for unstructured text
- Confidence scoring (0-1)

### 4. Evidence Analysis

- **Key Facts Extraction**: Parties, dates, amounts, issues
- **Timeline Building**: Chronological event sequence
- **Contradiction Detection**: Inconsistencies between documents
- **Missing Evidence Detection**: What should exist but doesn't

---

## Strategy Generation Flow

### Phase 1: Pre-Strategy (Uncommitted)

**What Happens:**
1. Documents uploaded and extracted
2. Structured data extracted (charges, hearings, etc.)
3. Analysis Gate checked
4. Strategy routes generated (if gate passes)
5. Routes displayed to solicitor
6. Solicitor reviews but doesn't commit

**UI State:**
- Shows strategy routes
- Shows route viability
- Shows evidence gaps
- **No detailed strategy pack yet**

### Phase 2: Committed Strategy

**What Happens:**
1. Solicitor selects primary route
2. Records defense position
3. Strategy commitment saved
4. **Beast Strategy Pack generated**
5. Full 9-section pack displayed
6. All Phase 2 panels activated

**UI State:**
- Full Beast Strategy Pack visible
- Procedural safety status
- Weapon tracker
- Incident shape
- Worst-case cap
- Declared dependencies
- Irreversible decisions
- Disclosure timeline
- Supervisor snapshot

### Strategy Commitment API

**Endpoint**: `POST /api/criminal/[caseId]/strategy-commitment`

**Request:**
```json
{
  "primary": "fight_charge",
  "position_text": "Full defense position...",
  "position_type": "not_guilty"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "committed_at": "2025-01-20T10:00:00Z",
    "primary": "fight_charge",
    "position_text": "...",
    "position_type": "not_guilty"
  }
}
```

### Strategy Analysis API

**Endpoint**: `GET /api/criminal/[caseId]/strategy-analysis`

**Response Structure:**
```json
{
  "ok": true,
  "data": {
    "routes": [
      {
        "id": "route-1",
        "type": "fight_charge",
        "title": "Fight the Charge",
        "rationale": "...",
        "winConditions": [...],
        "risks": [...],
        "nextActions": [...],
        "viability": {
          "status": "VIABLE",
          "reasons": [...],
          "evidenceBacked": true
        },
        "attackPaths": [...],
        "cpsResponses": [...],
        "killSwitches": [...],
        "pivotPlan": {...}
      }
    ],
    "selectedRoute": "route-1",
    "artifacts": {...},
    "evidenceImpact": [...],
    "canGenerateAnalysis": true
  }
}
```

---

## Key Components

### 1. Strategy Fight Engine

**Location**: `lib/criminal/strategy-fight-engine.ts`

**Purpose**: Core deterministic strategy generation

**Key Functions:**
- `generateStrategyRoute()`: Generate a single strategy route
- `generateAttackPaths()`: Generate attack paths for a route
- `generateCPSResponses()`: Simulate prosecution responses
- `generateKillSwitches()`: Identify route-killing conditions
- `generatePivotPlan()`: Plan strategy pivots

**Deterministic Logic:**
- Works with or without AI
- Returns templates when AI unavailable
- All outputs are evidence-backed or clearly labeled as templates

### 2. Strategy Recommendation Engine

**Location**: `lib/criminal/strategy-recommendation-engine.ts`

**Purpose**: Selects and ranks best strategy route

**Key Functions:**
- `extractEvidenceSignals()`: Extract evidence indicators
- `generateStrategyRecommendation()`: Recommend primary route

**Evidence Signals:**
- ID strength (strong/weak/unknown)
- Intent indicators (sustained/single_brief/unknown)
- Disclosure completeness
- PACE compliance
- Prosecution strength

### 3. Evidence Impact Mapper

**Location**: `lib/criminal/evidence-impact-mapper.ts`

**Purpose**: Maps missing evidence to strategy routes

**Key Functions:**
- `mapEvidenceImpact()`: Map evidence items to routes
- `getCommonMissingEvidence()`: Identify common gaps

### 4. Time Pressure Engine

**Location**: `lib/criminal/time-pressure-engine.ts`

**Purpose**: Analyzes time pressure and deadlines

**Key Functions:**
- `buildTimePressureState()`: Calculate time pressure

**Time Pressure Factors:**
- PTPH date proximity
- Trial date proximity
- Disclosure deadlines
- Limitation periods

### 5. Confidence Drift Engine

**Location**: `lib/criminal/confidence-drift-engine.ts`

**Purpose**: Tracks confidence changes over time

**Key Functions:**
- `calculateConfidenceDrift()`: Calculate confidence changes

### 6. Decision Checkpoints

**Location**: `lib/criminal/decision-checkpoints.ts`

**Purpose**: Identifies critical decision points

**Key Functions:**
- `generateDecisionCheckpoints()`: Generate checkpoint list

**Checkpoint Types:**
- Before PTPH
- After disclosure
- Before trial
- After evidence served

### 7. Residual Attack Scanner

**Location**: `lib/criminal/residual-attack-scanner.ts`

**Purpose**: Finds additional attack angles

**Key Functions:**
- `scanResidualAttacks()`: Scan for residual angles

### 8. Procedural Safety

**Location**: `lib/criminal/procedural-safety.ts`

**Purpose**: Computes procedural safety status

**Key Functions:**
- `computeProceduralSafety()`: Calculate safety status

**Critical Disclosure Items:**
- CCTV
- BWV (Body Worn Video)
- 999 call audio
- CAD log
- Interview recording

### 9. Weapon Tracker

**Location**: `lib/criminal/weapon-tracker.ts`

**Purpose**: Tracks weapon-related evidence

**Key Functions:**
- `extractWeaponTracker()`: Extract weapon information

### 10. Incident Shape Classifier

**Location**: `lib/criminal/incident-shape.ts`

**Purpose**: Classifies incident type

**Key Functions:**
- `classifyIncidentShape()`: Classify incident

### 11. Worst-Case Cap Generator

**Location**: `lib/criminal/worst-case-cap.ts`

**Purpose**: Generates worst-case exposure statement

**Key Functions:**
- `generateWorstCaseCap()`: Generate cap statement

---

## Data Models

### Criminal Cases Table

```sql
CREATE TABLE criminal_cases (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  
  -- Strategy commitment
  primary_strategy TEXT, -- 'fight_charge' | 'charge_reduction' | 'outcome_management'
  position_text TEXT,
  position_type TEXT, -- 'not_guilty' | 'guilty' | 'no_plea'
  committed_at TIMESTAMPTZ,
  committed_by UUID,
  
  -- Solicitor-controlled data (JSONB)
  declared_dependencies JSONB DEFAULT '[]',
  irreversible_decisions JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Criminal Charges Table

```sql
CREATE TABLE criminal_charges (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  
  count INTEGER,
  offence TEXT,
  section TEXT, -- e.g., 's18', 's20'
  plea TEXT, -- 'not_guilty' | 'guilty' | 'no_plea'
  date_of_offence DATE,
  charge_date DATE,
  location TEXT,
  status TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Criminal Hearings Table

```sql
CREATE TABLE criminal_hearings (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  
  court TEXT,
  date TIMESTAMPTZ,
  type TEXT, -- 'PTPH' | 'trial' | 'sentencing' | etc.
  status TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Disclosure Timeline Table

```sql
CREATE TABLE criminal_disclosure_timeline (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  
  item TEXT, -- 'CCTV', 'BWV', '999 Call Audio', etc.
  action TEXT, -- 'requested' | 'chased' | 'served' | 'reviewed' | 'outstanding' | 'overdue'
  date TIMESTAMPTZ,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Criminal Strategy Endpoints

#### GET `/api/criminal/[caseId]/strategy-analysis`
**Purpose**: Get strategy routes and analysis

**Response**: Strategy routes with viability, attack paths, CPS responses, kill switches, pivot plans

#### POST `/api/criminal/[caseId]/strategy-commitment`
**Purpose**: Commit to a primary strategy route

**Request Body:**
```json
{
  "primary": "fight_charge",
  "position_text": "Full defense position...",
  "position_type": "not_guilty"
}
```

#### GET `/api/criminal/[caseId]/strategy-commitment`
**Purpose**: Get committed strategy

#### POST `/api/criminal/[caseId]/dependencies`
**Purpose**: Save declared dependencies

**Request Body:**
```json
{
  "dependencies": [
    {
      "id": "cctv",
      "label": "CCTV (Aroma Kebab 23:10-23:30)",
      "status": "required",
      "note": "Critical for ID challenge"
    }
  ]
}
```

#### POST `/api/criminal/[caseId]/irreversible-decisions`
**Purpose**: Save irreversible decisions

**Request Body:**
```json
{
  "decisions": [
    {
      "id": "enter_plea_ptph",
      "label": "Enter plea at PTPH",
      "status": "planned",
      "note": "Will enter not guilty",
      "updated_at": "2025-01-20T10:00:00Z"
    }
  ]
}
```

#### GET/POST `/api/criminal/[caseId]/disclosure-timeline`
**Purpose**: Manage disclosure chase timeline

**Request Body (POST):**
```json
{
  "entries": [
    {
      "item": "CCTV",
      "action": "requested",
      "date": "2025-01-15",
      "note": "Requested via email"
    }
  ]
}
```

### Other Criminal Endpoints

- `/api/criminal/[caseId]/charges` - Manage charges
- `/api/criminal/[caseId]/hearings` - Manage hearings
- `/api/criminal/[caseId]/aggressive-defense` - Get aggressive defense angles
- `/api/criminal/[caseId]/loopholes` - Get loopholes
- `/api/criminal/[caseId]/pace` - PACE compliance check
- `/api/criminal/[caseId]/position` - Record defense position

---

## UI Components

### StrategyCommitmentPanel

**Location**: `components/criminal/StrategyCommitmentPanel.tsx`

**Purpose**: Main strategy UI component

**Key Features:**
- Phase 1: Route selection (uncommitted)
- Phase 2: Full strategy pack (committed)
- Panel state persistence (localStorage)
- Expand/collapse all controls

**Sub-Components:**
- `StrategyCompressionView`: Senior skim summary
- `JudicialLensPanel`: Judicial perspective analysis
- `FailureModePanel`: Failure mode analysis
- `SupervisorSnapshot`: Read-only consolidated view
- `FileNoteExport`: Generate internal file note
- `SystemGuaranteesPanel`: System capabilities/disclaimers
- `ConsistencySafetyPanel`: Consistency and safety checks
- `SystemRefusalsPanel`: System refusal reasons
- `ProceduralSafetyPanel`: Procedural safety status
- `WeaponTrackerPanel`: Weapon evidence tracker
- `IncidentShapePanel`: Incident classification
- `WorstCaseCapPanel`: Worst-case exposure cap
- `DeclaredDependenciesPanel`: Solicitor-declared dependencies
- `IrreversibleDecisionsPanel`: Irreversible decision tracker
- `DisclosureTimelinePanel`: Disclosure chase timeline
- `PillarsPanel`: Strategy pillars (SAFE/PREMATURE/UNSAFE)

### Panel State Persistence

**Hook**: `lib/hooks/usePanelState.ts`

**Purpose**: Persist panel expand/collapse state

**Storage**: localStorage with key format: `cb:panelState:<caseId>:<panelId>`

**Values**: `"open"` | `"closed"`

---

## Security & Access Control

### Authentication

- **Clerk**: Multi-tenant authentication
- **Roles**: owner, solicitor, paralegal, viewer
- **Session Management**: Clerk handles sessions

### Authorization

- **Row-Level Security (RLS)**: Database-level access control
- **Org Isolation**: All queries filter by `org_id`
- **API Auth**: `requireAuthContextApi()` middleware

### Data Isolation

- **Multi-Tenant**: Each organization has isolated data
- **RLS Policies**: Enforce `org_id` matching
- **API Validation**: All endpoints validate `org_id`

---

## Key Design Principles

### 1. Evidence-First

- All analysis grounded in extracted evidence
- No speculation about unserved disclosure
- Clear labels for "evidence-backed" vs "template"

### 2. Court-Safe

- All outputs suitable for court use
- No predictions or probabilities (unless explicitly allowed)
- Deterministic and reproducible

### 3. Solicitor-Controlled

- Solicitor makes all decisions
- System provides intelligence, not advice
- All actions are solicitor-initiated

### 4. Deterministic Logic

- Core strategy logic is deterministic
- AI only used when evidence is sufficient
- Templates when AI unavailable

### 5. Auditability

- All actions are logged
- File notes are exportable
- Supervisor snapshots are read-only

---

## Common Patterns

### API Response Pattern

```typescript
{
  ok: boolean;
  data?: T;
  error?: string;
  details?: string;
  diagnostics?: {
    canGenerateAnalysis: boolean;
    reasonCodes: string[];
  };
}
```

### Analysis Gate Pattern

```typescript
const canGenerateAnalysis = 
  rawCharsTotal >= 800 && 
  !suspectedScanned && 
  !textThin;

if (!canGenerateAnalysis) {
  // Return deterministic templates
  return { ...template, evidenceBacked: false };
}
```

### Strategy Route Pattern

```typescript
{
  id: string;
  type: "fight_charge" | "charge_reduction" | "outcome_management";
  title: string;
  rationale: string;
  winConditions: string[];
  risks: string[];
  nextActions: string[];
  viability: RouteViability;
  attackPaths: AttackPath[];
  cpsResponses: CPSResponse[];
  killSwitches: KillSwitch[];
  pivotPlan: PivotPlan;
}
```

---

## Testing & Quality

### Type Safety

- **TypeScript**: Full type coverage
- **Strict Mode**: Enabled
- **Type Checking**: Enforced in build

### Error Handling

- **Graceful Degradation**: System works even when AI unavailable
- **Clear Error Messages**: User-friendly error messages
- **Logging**: Comprehensive error logging

### Performance

- **Serverless**: API routes are serverless functions
- **Caching**: Strategic caching where appropriate
- **Optimization**: Code splitting and lazy loading

---

## Deployment

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Database Migrations

- Run all migrations from `supabase/migrations/` in order
- Ensure RLS policies are enabled
- Verify `org_id` isolation

### Build Process

```bash
npm run build  # Type checks enforced
npm run start  # Production server
```

---

## Summary

**CaseBrain Hub is a sophisticated AI-powered legal practice management system that:**

1. **Processes Documents**: Extracts text, facts, and structured data
2. **Generates Strategies**: Creates comprehensive defense strategies for criminal cases
3. **Tracks Evidence**: Maps evidence gaps and their impact on strategy
4. **Provides Intelligence**: Offers tactical insights without giving legal advice
5. **Maintains Safety**: Ensures all outputs are court-safe and auditable
6. **Respects Control**: Solicitor makes all decisions, system provides intelligence

**The criminal defense strategy system is the most sophisticated part, generating:**
- Strategy routes with viability assessment
- Attack paths with evidence requirements
- CPS response simulation
- Kill switch identification
- Pivot planning
- Comprehensive 9-section strategy packs

**All while maintaining:**
- Evidence-first analysis
- Court-safe outputs
- Solicitor control
- Deterministic logic
- Full auditability

---

**End of Technical Guide**
