# CaseBrain - Complete Features Overview

## What CaseBrain Now Contains

CaseBrain is a comprehensive case management system for law firms with AI-powered analysis, evidence tracking, supervision dashboards, and win story capture.

---

## Core Features

### 1. **Case Management**
- Create and manage cases by practice area (Housing, PI, Clinical Negligence, Family, Criminal)
- Upload PDF documents (auto-extracts text and facts)
- Case archiving and restoration
- Practice area-specific workflows

### 2. **AI-Powered Analysis**
- **Document Extraction**: Automatically extracts parties, dates, amounts, key issues, timeline
- **Case Summaries**: AI-generated solicitor-style summaries
- **Risk Detection**: Identifies limitation periods, compliance issues, procedural risks
- **Missing Evidence Detection**: Identifies what evidence is still needed
- **Strategic Intelligence**: Momentum scoring, leverage analysis, weak spots identification

### 3. **Evidence Tracking System** (NEW - Phase 2)
- **Evidence Items Panel**: Track individual evidence items with status
- **Status Management**: Outstanding → Requested → Received / Escalated / No Longer Needed
- **Chase Logic**: Automatic Day 7 chase and Day 14 escalation tracking
- **Request Drafts**: Generate email/WhatsApp templates for evidence requests
- **Auto-Seeding**: Automatically creates evidence items from missing evidence analysis

### 4. **Incremental Case Updates** (NEW)
- **Add Documents**: Add new PDFs to existing cases without overwriting analysis
- **Versioned Analysis**: Re-run analysis creates new versions (v1, v2, v3...)
- **What Changed Panel**: Shows delta between versions:
  - Timeline events added/removed
  - Key issues added/removed
  - Missing evidence resolved/new
  - Risk rating changes
- **Analysis History**: View all previous analysis versions

### 5. **Supervision Dashboard** (NEW - Phase 4)
- **Summary Tiles**:
  - Cases blocked by outstanding evidence
  - Overdue chases (7+ days)
  - Escalations due (14+ days)
  - High-risk cases
- **Supervision Table**: Cases sorted by urgency with:
  - Case name (links to case page)
  - Practice area
  - Risk rating
  - Outstanding evidence count
  - Oldest outstanding age
  - Next chase due
- **Location**: `/dashboard/supervision`

### 6. **Win Stories** (NEW)
- **Capture Win Stories**: Button on case page to capture successful outcomes
- **Snapshots**: Captures:
  - Risk rating (before/after)
  - Summary excerpt
  - Evidence counts
  - Timeline/key issues counts
  - Document count
- **Win Stories Dashboard**: List all captured wins
- **Sales Asset**: Use captured wins as repeatable sales materials
- **Location**: `/dashboard/win-stories`

### 7. **Audit Trail** (Phase 6)
- **Complete History**: All system and user actions logged
- **Event Types**: Uploads, analysis, evidence changes, risk changes, win stories
- **Readable UI**: Chronological list with expandable JSON payloads
- **Supervision-Safe**: Full transparency for compliance

### 8. **Confidence-Safe Language** (NEW)
- **Supervision-Safe Outputs**: Replaces overconfident phrases with:
  - "Based on the current documents..."
  - "This suggests..."
  - "Further evidence may be required..."
- **Applied To**: Missing evidence explanations
- **Future**: Can be extended to risk summaries, AI content, strategic intelligence

---

## Practice Area-Specific Features

### Housing Disrepair
- Awaab's Law compliance tracking
- Section 11 LTA 1985 duty monitoring
- HHSRS hazard detection
- Schedule of disrepair builder
- Quantum calculator
- Bundle checker

### Personal Injury
- MedCo/OIC portal integration
- Protocol timeline builder
- Valuation helper
- Letter previews
- Medical evidence tracking

### Clinical Negligence
- Expert report tracking
- Breach/causation analysis
- Medical evidence detector
- Substantive merits scoring

### Criminal
- PACE compliance checks
- Loophole detection
- Defense evidence tracking

---

## Technical Architecture

### Database Tables
- `cases` - Main case records
- `documents` - Uploaded PDFs with extracted data
- `evidence_items` - Tracked evidence items (NEW)
- `case_analysis_versions` - Versioned analysis snapshots (NEW)
- `win_story_snapshots` - Captured win stories (NEW)
- `case_audit_events` - Complete audit trail
- `risk_flags` - Risk alerts and compliance issues
- `timeline_events` - Chronological case events
- `deadlines` - Case deadlines and hearings
- `bundles` - Document bundles for cases

### API Routes
- `/api/upload` - Upload documents
- `/api/cases/[caseId]/documents/add` - Add docs to existing case (NEW)
- `/api/cases/[caseId]/analysis/rerun` - Re-run analysis (NEW)
- `/api/cases/[caseId]/analysis/versions` - List/get versions (NEW)
- `/api/cases/[caseId]/win-stories` - Capture win story (NEW)
- `/api/evidence/items` - Evidence CRUD
- `/api/evidence/items/[itemId]/status` - Update evidence status
- `/api/evidence/items/[itemId]/chase` - Generate chase drafts
- `/api/supervision/dashboard` - Supervision data (NEW)
- `/api/win-stories` - List win stories (NEW)
- `/api/cases/[caseId]/audit-events` - Audit trail

### Pages
- `/cases` - Case list
- `/cases/[caseId]` - Case detail page
- `/dashboard/supervision` - Supervisor dashboard (NEW)
- `/dashboard/win-stories` - Win stories dashboard (NEW)

---

## Key Workflows

### 1. **New Case Workflow**
1. Upload initial documents
2. AI extracts facts, timeline, key issues
3. System identifies missing evidence
4. Evidence items auto-created
5. Risk flags detected
6. Strategic intelligence generated

### 2. **Evidence Management Workflow**
1. Evidence items appear in Evidence Tracker
2. Mark as "Requested" when sent to client
3. Generate Day 7 chase draft if no response
4. Generate Day 14 escalation if still outstanding
5. Mark as "Received" when evidence arrives
6. All actions logged in audit trail

### 3. **Incremental Update Workflow**
1. Add new documents to existing case
2. Case marked as "analysis_stale"
3. Click "Re-run analysis"
4. New version created (v2, v3, etc.)
5. Delta panel shows what changed
6. Previous versions preserved in history

### 4. **Supervision Workflow**
1. Partner opens `/dashboard/supervision`
2. Sees summary tiles (blocked cases, overdue chases, etc.)
3. Reviews supervision table sorted by urgency
4. Clicks case name to go to case page
5. Reviews Evidence Tracker and audit trail

### 5. **Win Story Workflow**
1. Case reaches successful outcome
2. Click "Capture Win Story" on case page
3. Enter title and optional note
4. System captures snapshot (risk, evidence, timeline)
5. View in `/dashboard/win-stories`
6. Use as sales asset for similar cases

---

## Data Flow

```
Upload PDF
  ↓
Extract Text (PDF parsing)
  ↓
AI Extraction (OpenAI)
  ↓
Store in documents.extracted_json
  ↓
Aggregate Analysis
  ↓
Generate:
  - Timeline
  - Key Issues
  - Missing Evidence
  - Risk Flags
  - Strategic Intelligence
  ↓
Display on Case Page
  ↓
(Optional) Add More Docs
  ↓
Re-run Analysis → New Version
  ↓
Show Delta (What Changed)
```

---

## Security & Compliance

### Row-Level Security (RLS)
- All tables have org-level RLS policies
- Users can only access their organization's data
- Enforced at database level

### Audit Trail
- Every action logged with:
  - User ID
  - Timestamp
  - Event type
  - Metadata (JSONB)
- Supervision-safe transparency

### Confidence-Safe Language
- No overconfident AI statements
- All outputs qualified appropriately
- Suitable for supervision review

---

## Integration Points

### Authentication
- Clerk integration
- User/org context available everywhere

### Storage
- Supabase Storage for PDFs
- Redaction support for sensitive data

### AI
- OpenAI for extraction and analysis
- Configurable models per feature

### Database
- Supabase (PostgreSQL)
- Real-time subscriptions available
- Migrations versioned

---

## What Makes This Special

1. **Living Case File**: Cases evolve over time with versioned analysis
2. **Evidence Memory**: Never lose track of what's been requested
3. **Supervision-Ready**: Dashboards and audit trails for compliance
4. **Win Story Capture**: Turn successes into repeatable sales assets
5. **Confidence-Safe**: AI outputs suitable for legal supervision
6. **Practice Area Aware**: Specialized workflows per case type

---

## Future Enhancements (Not Yet Implemented)

- View old analysis versions in read-only UI
- Side-by-side version comparison
- Rollback to previous version
- Export win stories as PDF
- Version notes (why version was created)
- Advanced filtering on supervision dashboard
- Charts/graphs for win stories

---

## Summary

CaseBrain is now a **complete case management system** with:
- ✅ Document management and AI analysis
- ✅ Evidence tracking with chase logic
- ✅ Versioned incremental updates
- ✅ Supervision dashboards
- ✅ Win story capture
- ✅ Complete audit trails
- ✅ Confidence-safe AI outputs

**Ready for production use** with proper supervision, compliance, and evidence management workflows.

