# CaseBrain Architecture

## Overview

CaseBrain is an AI-assisted **Litigation Workflow Engine** with a modular architecture:

1. **Core Litigation Brain** - Shared capabilities across all case types
2. **Case-Type Modules** - Pluggable domain-specific logic

## Core Litigation Brain

Located in `lib/core/`, provides:

### 1. Evidence Extraction (`lib/core/extraction.ts`)
- Extracts structured facts from evidence
- Source tracing and confidence scoring
- Uncertainty indicators

### 2. Timeline Engine (`lib/core/timeline.ts`)
- Builds structured litigation chronology
- Source document linking
- Export as table format

### 3. Guidance Engine (`lib/core/guidance.ts`)
- Stage assessment (intake → enforcement)
- Procedural step recommendations
- Risk flag generation
- **Not legal advice** - guidance only with disclaimers

### 4. Drafting Generator (`lib/core/drafting.ts`)
- Auto-populates templates with extracted facts
- Variable extraction and confidence scoring
- Missing variable detection

### 5. Bundle Engine (`lib/core/bundle.ts`)
- Document tagging and indexing
- Court-ready PDF export
- Disclosure list generation

### 6. Handover Pack (`lib/core/handover.ts`)
- Structured case brain export
- Summary, chronology, statement of case draft
- Next steps and task list
- Export as JSON or Markdown

### 7. Damages Support (`lib/core/damages.ts`)
- Claim-type specific heads of loss
- Statement of loss scaffolding
- Extracted amounts aggregation

### 8. Risk Alert System (`lib/core/risks.ts`, `lib/core/limitation.ts`, `lib/core/riskCopy.ts`)
- **Limitation Calculator**: Calculates limitation periods based on practice area (6 years for housing, 3 years for PI/Clinical Negligence), handles date of knowledge, and detects minor claimants. **This is procedural guidance only and does not constitute legal advice.**
- **Risk Alert Model**: Standardised risk alert structure with severity levels (info, low, medium, high, critical), recommended actions, and source evidence tracking.
- **Risk Copy Pack**: Centralised wording for risk alerts ensuring consistent, professional language that clearly states this is procedural guidance, not legal advice.
- **Risk Conversion**: Converts compliance checks and limitation calculations into standardised RiskAlert objects for display in the UI.

### 9. Checklists (`lib/core/checklists.ts`)
- **Limitation Urgency Checklist**: Step-by-step checklist for cases approaching or past limitation deadlines, including standstill agreement considerations and issue & serve procedures.
- **Pre-Action Protocol Checklist**: Standard checklist for pre-action protocol compliance.
- All checklists include clear disclaimers that they are procedural guidance only and must be reviewed by qualified legal professionals.

## Case-Type Modules

Located in `lib/modules/` and practice-area specific folders:

### Module Interface

```typescript
type CaseTypeModule = {
  name: string;
  practiceArea: string;
  extractSpecificFacts: (facts: ExtractedCaseFacts) => Record<string, unknown>;
  assessStage: (facts: ExtractedCaseFacts, timeline: unknown[]) => string;
  generateRiskFlags: (facts: ExtractedCaseFacts, moduleData: unknown) => RiskFlag[];
  getRecommendedTemplates: (stage: string) => string[];
  getComplianceChecks?: (moduleData: unknown) => ComplianceCheck[];
};
```

### Available Modules

1. **PI Module** (`lib/modules/index.ts`)
   - OIC/MedCo extraction
   - Portal/Litigated stage detection
   - PI-specific risk flags

2. **Housing Disrepair Module** (`lib/housing/`)
   - HHSRS hazard classification
   - Awaab's Law compliance
   - Section 11 LTA checks
   - Housing-specific templates

3. **Clinical Negligence Module** (extends PI)
   - Duty/breach/cause indicators
   - Consent issues
   - Expert instruction templates

## API Endpoints

### Core APIs

- `GET /api/guidance/[caseId]` - Litigation guidance
- `POST /api/draft/[caseId]` - Generate draft from template
- `GET /api/bundle/[caseId]` - Generate court bundle
- `GET /api/disclosure/[caseId]` - Generate disclosure list
- `GET /api/handover/[caseId]` - Export handover pack

### Module-Specific APIs

- `GET /api/housing/compliance/[caseId]` - Housing compliance checks
- `GET /api/housing/timeline/[caseId]` - Housing timeline
- `POST /api/housing/letters/preview` - Housing letter preview
- `GET /api/pi/dashboard` - PI dashboard metrics

## Principles

1. **Structured Outputs** - All outputs are structured (tables, lists, JSON)
2. **Source Tracing** - Every extracted statement links to evidence source
3. **Uncertainty Disclaimers** - Always state confidence and limitations
4. **No Legal Advice** - System provides guidance, not legal advice
5. **Modular Design** - Case-type modules plug into core brain

## Extending CaseBrain

To add a new case-type module:

1. Create module definition in `lib/modules/index.ts`
2. Add extraction logic in `lib/ai.ts` (extend `ExtractedCaseFacts`)
3. Create module-specific tables in Supabase
4. Add module-specific UI components
5. Register module with `registerModule()`

Example:

```typescript
const creditHireModule: CaseTypeModule = {
  name: "Credit Hire / ULR",
  practiceArea: "credit_hire",
  extractSpecificFacts: (facts) => ({ hirePeriod: facts.dates.find(...) }),
  assessStage: (facts, timeline) => "investigation",
  generateRiskFlags: (facts, data) => [...],
  getRecommendedTemplates: (stage) => ["HIRE_REQUEST", "ABI_GTA"],
};
```

