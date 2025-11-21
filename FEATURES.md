# CaseBrain - Complete Feature List

## Core Litigation Brain (Shared Across All Case Types)

### 1. Evidence Ingestion ✅
- Accepts PDF, DOCX, email files, images
- OCR support via pdf-parse and mammoth
- Chunking and indexing for retrieval
- Redaction support for sensitive data
- **Location**: `app/api/upload/route.ts`, `lib/redact.ts`

### 2. Fact & Issue Extraction ✅
- Structured extraction: parties, dates, amounts, timeline events
- Source document linking
- Confidence scoring
- Uncertainty indicators
- **Location**: `lib/ai.ts`, `lib/core/extraction.ts`

### 3. Chronology / Timeline Engine ✅
- Structured litigation chronology with source links
- Event type classification
- Party tracking
- Export as table format (CSV)
- **Location**: `lib/core/timeline.ts`, `lib/housing/timeline.ts`

### 4. Litigation Guidance Engine ✅
- Stage assessment (intake → enforcement)
- Procedural step recommendations with priorities
- Risk flag generation
- Template recommendations
- **Always includes disclaimers** - not legal advice
- **Location**: `lib/core/guidance.ts`, `app/api/guidance/[caseId]/route.ts`

### 5. Drafting Generator ✅
- Auto-populates templates with extracted facts
- Variable extraction with confidence scoring
- Missing variable detection
- Source evidence linking
- **Location**: `lib/core/drafting.ts`, `app/api/draft/[caseId]/route.ts`

### 6. Bundle / Disclosure Engine ✅
- Document tagging and relevance scoring
- Court-ready PDF export with indexing
- Disclosure list generation
- Watermarking and pagination
- **Location**: `lib/core/bundle.ts`, `app/api/bundle/[caseId]/route.ts`, `app/api/disclosure/[caseId]/route.ts`

### 7. Damages / Compensation Support ✅
- Claim-type specific heads of loss
- Statement of loss scaffolding
- Special damages extraction
- **Location**: `lib/core/damages.ts`

### 8. Handover Pack Export ✅
- Structured case brain export
- Summary (facts/issues/risks)
- Chronology table
- Statement of case draft
- Disclosure list
- Next steps and task list
- Export as JSON or Markdown
- **Location**: `lib/core/handover.ts`, `app/api/handover/[caseId]/route.ts`

### 9. Security & Compliance ✅
- Access controls via Clerk
- Audit trail (`audit_log` table)
- Event logging
- Confidence indicators on all outputs
- Uncertainty disclaimers
- **Location**: `lib/auth.ts`, `lib/audit.ts`

## Case-Type Modules

### A) Personal Injury (PI) / Clinical Negligence ✅
- **OIC/MedCo Extraction**: Track, injury summary, whiplash tariff, prognosis, psych injury, treatment, MedCo reference, liability stance
- **Stage Detection**: OIC → pre_action, Litigated → litigation
- **Risk Flags**: Liability denied, limitation risks
- **Templates**: CNF, LBA, Disclosure requests, Expert instructions
- **Location**: `lib/pi/`, `components/pi/`, `app/api/pi/`

### B) Housing Disrepair / HRA ✅
- **Issue Extraction**: Damp, mould, leaks, structural, heating, electrical, infestation
- **Compliance**: HHSRS Category 1/2, Awaab's Law (14-day investigation, 7-day work start), Section 11 LTA 1985
- **Vulnerability Tracking**: Elderly, asthma, mobility, children, pregnancy, disability
- **Landlord Response Tracking**: Acknowledgement, repair scheduled, no-access, denial
- **Risk Flags**: Unfit habitation, excessive no-access, Category 1 hazards, limitation risks
- **Templates**: Repair Request, S11 LTA Notice, Pre-Action Letter, Escalation Chaser
- **Location**: `lib/housing/`, `components/housing/`, `app/api/housing/`

### C) Clinical Negligence (extends PI) ✅
- Shares PI module features
- Additional: Duty/breach/cause indicators, consent issues
- **Location**: Uses PI module with `case_type = "clinical_negligence"`

## UI Features

### Dashboard ✅
- Case overview with metrics
- Practice area filtering
- Recent cases with quick actions
- PI-specific summary cards
- Housing-specific summary cards

### Case Detail Page ✅
- **Core Brain Panels**:
  - Key Facts (parties, dates, amounts)
  - Litigation Guidance (stage, next steps, risk flags)
  - Timeline (with source links)
  - Risk Alerts
  - Export Bundle
  - Export Handover Pack

- **PI-Specific Panels**:
  - OIC/MedCo Summary (editable)
  - PI Case Overview
  - Medical Reports
  - Offers
  - Hearings
  - Disbursements
  - Protocol Timeline
  - Valuation Helper

- **Housing-Specific Panels**:
  - Housing Case Overview
  - Compliance & Risk (HHSRS, Awaab's Law, Section 11)
  - Timeline Builder (with source links)
  - Defects Management
  - Landlord Responses

### Intake Wizards ✅
- **PI Intake**: Multi-step form for PI/Clinical Neg cases
- **Housing Intake**: 3-step wizard (Basic Info → Tenant & Timeline → Defects)
- Auto-creates case records and initial data

### Letter Management ✅
- Template library (org-specific or global)
- Preview with placeholder replacement
- Version control
- Case-type specific templates

### Client Portal ✅
- Token-based read-only access
- Case summary, timeline, shared documents
- No internal data exposed
- Expiration support

## API Endpoints

### Core APIs
- `GET /api/guidance/[caseId]` - Litigation guidance
- `POST /api/draft/[caseId]` - Generate draft from template
- `GET /api/bundle/[caseId]` - Generate court bundle
- `GET /api/disclosure/[caseId]` - Generate disclosure list
- `GET /api/handover/[caseId]` - Export handover pack (JSON/Markdown)

### PI APIs
- `GET /api/pi/dashboard` - PI dashboard metrics
- `GET /api/pi-report` - PI aggregated report
- `POST /api/pi/intake` - Create PI case
- `PATCH /api/pi/cases/[caseId]/stage` - Update stage
- `POST /api/pi/cases/[caseId]/medical-reports` - Add medical report
- `POST /api/pi/cases/[caseId]/offers` - Add offer
- `POST /api/pi/cases/[caseId]/hearings` - Add hearing
- `POST /api/pi/cases/[caseId]/disbursements` - Add disbursement
- `PATCH /api/pi/cases/[caseId]/oic-medco` - Update OIC/MedCo data
- `GET /api/pi/case-pack/[caseId]` - Export PI case pack

### Housing APIs
- `GET /api/housing/dashboard` - Housing dashboard metrics
- `POST /api/housing/intake` - Create housing case
- `GET /api/housing/compliance/[caseId]` - Compliance checks
- `GET /api/housing/timeline/[caseId]` - Housing timeline
- `POST /api/housing/letters/preview` - Preview housing letter
- `GET /api/housing/intake-summary/[caseId]` - Intake summary export

### Intake APIs
- `GET /api/intake/documents` - List unprocessed documents
- `POST /api/intake/create-case` - Create case from document
- `POST /api/intake/attach` - Attach document to case

### Portal APIs
- `POST /api/portal/session` - Create portal link
- `GET /portal/[token]` - Public portal page

## Data Model

### Core Tables
- `cases` - Main case records
- `documents` - Evidence files with extracted JSON
- `deadlines` - Procedural deadlines
- `tasks` - Task management
- `risk_flags` - Risk alerts
- `letters` - Generated letters
- `letterTemplates` - Letter templates
- `audit_log` - Audit trail

### PI Tables
- `pi_cases` - PI-specific metadata (OIC/MedCo fields)
- `pi_medical_reports` - Medical reports
- `pi_offers` - Settlement offers
- `pi_hearings` - Court hearings
- `pi_disbursements` - Case disbursements
- `pi_letter_templates` - PI letter templates

### Housing Tables
- `housing_cases` - Housing-specific metadata
- `housing_defects` - Property defects
- `housing_timeline` - Structured timeline events
- `housing_landlord_responses` - Landlord response tracking
- `housing_letter_templates` - Housing letter templates

## Key Principles Implemented

✅ **Structured Outputs** - All outputs are structured (tables, lists, JSON)  
✅ **Source Tracing** - Every extracted statement links to evidence source  
✅ **Uncertainty Disclaimers** - Always state confidence and limitations  
✅ **No Legal Advice** - System provides guidance, not legal advice  
✅ **Modular Design** - Case-type modules plug into core brain  
✅ **API-First** - All features accessible via API for integrations  

## Value Proposition

- **Saves 5-12 hours per case** through automation
- **Reduces admin costs** with automated compliance and deadline tracking
- **Increases throughput** with structured workflows and alerts
- **Reduces risk** with limitation monitoring and compliance checks
- **Professional output** with protocol-compliant letters and audit-ready bundles

