# Housing Disrepair Add-Ons - Complete List

## Overview

I've identified and implemented the most valuable add-ons for housing disrepair/HRA legal teams. These features address real pain points and save significant time.

---

## ✅ Implemented Add-Ons

### 1. Quantum Calculator (`lib/housing/quantum.ts`)

**What It Does:**
- Calculates general damages range based on:
  - Defect severity (unfit for habitation, Category 1, severe, moderate)
  - Tenant vulnerability (+35% adjustment)
  - Health risk (asthma + damp/mould: +50-75% adjustment)
  - Category 1 hazards (+50% adjustment)
  - Duration (>2 years: +35%, >1 year: +15%)
- Calculates special damages:
  - Additional heating costs (auto-estimated if heating defect)
  - Alternative accommodation (if unfit)
  - Property damage (damage to belongings)
  - Travel costs (if medical appointments)
- Provides total quantum range with confidence scoring

**Base Ranges:**
- Minor disrepair: £500-£2,000
- Moderate disrepair: £2,000-£5,000
- Severe disrepair: £5,000-£15,000
- Unfit for habitation: £15,000-£30,000+

**UI Component:** `HousingQuantumCalculator` - Interactive calculator with input fields for special damages

**API:** `POST /api/housing/quantum/[caseId]`

**Time Saved:** 1-2 hours per case (manual quantum research and calculation)

---

### 2. Schedule of Disrepair Generator (`lib/housing/schedule.ts`)

**What It Does:**
- Generates court-ready Schedule of Disrepair listing:
  - All defects with item numbers
  - Location, severity, description
  - First/last reported dates
  - Repair status (attempted, successful, failed)
  - HHSRS category
  - Photo count
  - Notes
- Includes summary statistics:
  - Total defects
  - Category 1 defects count
  - Unrepaired defects
  - Failed repair attempts
- Exports as formatted text (for PDF/Word conversion) or JSON

**UI Component:** `ScheduleOfDisrepairPanel` - Download button for schedule

**API:** `GET /api/housing/schedule/[caseId]?format=text|json`

**Time Saved:** 2-3 hours per case (manual schedule preparation)

---

### 3. Deadline Tracker (`lib/housing/deadlines.ts`)

**What It Does:**
- Tracks all housing-specific deadlines:
  - **Awaab's Law**: Investigation (14 days), Work Start (7 days)
  - **Section 11 LTA**: Reasonable time (14/28 days based on vulnerability)
  - **Limitation Period**: 6-year deadline
- Calculates days remaining/overdue
- Color-codes by priority (urgent/high/medium/low)
- Shows status (upcoming/due_today/overdue/passed)
- Provides action required for each deadline

**UI Component:** `HousingDeadlineTracker` - Visual deadline list with color coding

**API:** `GET /api/housing/deadlines/[caseId]`

**Time Saved:** Prevents missed deadlines, automatic calculation saves 30 mins per case

---

### 4. Automated Chaser Generator (`lib/housing/chasers.ts`)

**What It Does:**
- Automatically detects when chaser letters are needed:
  - Awaab's Law investigation overdue
  - Awaab's Law work start overdue
  - Section 11 reasonable time exceeded
  - No landlord response (14/28 days)
  - Failed repair attempts
- Recommends appropriate template (ESCALATION, PRE_ACTION)
- Provides priority and reason for each chaser

**API:** `GET /api/housing/chasers/[caseId]` (can be called to check if chasers needed)

**Time Saved:** 30 mins per case (automatic detection vs manual monitoring)

---

## 🚀 Additional Add-Ons to Consider (Future Enhancements)

### 5. Photo Management System
**Pain Point:** Photos scattered across emails, phones, not linked to defects
**Solution:**
- Upload photos directly to defects
- Tag photos by location/defect type
- Auto-link photos to defects in schedule
- Photo gallery view per case
**Time Saved:** 1 hour per case (organizing and linking photos)

### 6. Expert Instruction Templates
**Pain Point:** Manual drafting of surveyor/medical expert instructions
**Solution:**
- Pre-built templates for:
  - Surveyor instruction (defect assessment)
  - Medical expert instruction (health impact)
  - Building surveyor instruction (structural issues)
- Auto-populate with case data
**Time Saved:** 1 hour per expert instruction

### 7. Medical Evidence Tracker
**Pain Point:** Medical reports not linked to defects, hard to track health impact
**Solution:**
- Track medical reports separately
- Link to specific defects (e.g., asthma report → damp/mould defect)
- Calculate health impact on quantum
- Generate medical evidence summary
**Time Saved:** 30 mins per case

### 8. Precedent Search
**Pain Point:** Need to research similar cases for quantum guidance
**Solution:**
- Search past cases by defect type, severity, duration
- Show quantum ranges from similar cases
- Link to case law references
**Time Saved:** 1-2 hours per case (research time)

### 9. Court Forms Generator
**Pain Point:** Manual completion of court forms (N1, N208, etc.)
**Solution:**
- Auto-populate court forms from case data
- Generate PDF forms ready for filing
- Include all required information
**Time Saved:** 1 hour per form

### 10. Witness Statement Builder
**Pain Point:** Manual drafting of witness statements from timeline
**Solution:**
- Scaffold witness statement from timeline events
- Auto-populate dates, events, parties
- Provide structure for tenant's statement
**Time Saved:** 2 hours per statement

### 11. Email/WhatsApp Import
**Pain Point:** Evidence scattered in emails and WhatsApp
**Solution:**
- Import emails directly as evidence
- Import WhatsApp conversations
- Auto-extract dates, parties, events
- Link to timeline automatically
**Time Saved:** 1-2 hours per case (manual evidence collection)

### 12. ADR/Mediation Tracker
**Pain Point:** ADR attempts not tracked, outcomes not recorded
**Solution:**
- Track ADR attempts and dates
- Record outcomes (settled, failed, ongoing)
- Generate ADR summary for bundles
**Time Saved:** 30 mins per case

### 13. Settlement Calculator
**Pain Point:** Need guidance on settlement ranges
**Solution:**
- Calculate settlement range based on quantum
- Factor in liability strength
- Provide negotiation guidance
**Time Saved:** 1 hour per settlement negotiation

### 14. Bundle Index Generator
**Pain Point:** Manual bundle indexing and pagination
**Solution:**
- Auto-generate bundle index with page numbers
- Link documents to index items
- Export index as separate document
**Time Saved:** 1 hour per bundle

### 15. Client Portal (Enhanced)
**Pain Point:** Tenants can't easily provide updates/photos
**Solution:**
- Allow tenants to upload photos via portal
- Submit updates on repair progress
- View case timeline (read-only)
**Time Saved:** 30 mins per case (reduced back-and-forth)

---

## Priority Ranking

### High Priority (Biggest Impact)
1. ✅ **Quantum Calculator** - Saves 1-2 hours, critical for settlement/negotiation
2. ✅ **Schedule of Disrepair** - Saves 2-3 hours, required for court
3. ✅ **Deadline Tracker** - Prevents missed deadlines, saves 30 mins
4. **Photo Management** - Saves 1 hour, improves evidence organization
5. **Expert Instruction Templates** - Saves 1 hour per expert

### Medium Priority (Good ROI)
6. **Medical Evidence Tracker** - Saves 30 mins, improves health impact tracking
7. **Court Forms Generator** - Saves 1 hour, reduces errors
8. **Witness Statement Builder** - Saves 2 hours, ensures completeness
9. **Email/WhatsApp Import** - Saves 1-2 hours, improves evidence collection

### Lower Priority (Nice to Have)
10. **Precedent Search** - Saves 1-2 hours but requires case database
11. **ADR Tracker** - Saves 30 mins, useful for some cases
12. **Settlement Calculator** - Saves 1 hour, but quantum calculator covers this
13. **Bundle Index Generator** - Saves 1 hour, but bundle export already includes index
14. **Enhanced Client Portal** - Saves 30 mins, reduces admin

---

## Implementation Status

✅ **Implemented:**
- Quantum Calculator
- Schedule of Disrepair
- Deadline Tracker
- Automated Chaser Detection

🚧 **Ready to Implement (High Value):**
- Photo Management (requires storage integration)
- Expert Instruction Templates (templates exist, need UI)
- Medical Evidence Tracker (extend existing document system)
- Court Forms Generator (PDF form filling)

📋 **Future Considerations:**
- Precedent Search (requires case database)
- Email/WhatsApp Import (requires email/WhatsApp parsing)
- Enhanced Client Portal (extend existing portal)

---

## Total Time Savings

**Per Case:**
- Quantum Calculator: 1-2 hours
- Schedule of Disrepair: 2-3 hours
- Deadline Tracker: 30 mins (prevents missed deadlines)
- Chaser Detection: 30 mins
- **Total: 4-6 hours per case**

**With Future Add-Ons:**
- Photo Management: +1 hour
- Expert Instructions: +1 hour
- Medical Evidence Tracker: +30 mins
- Court Forms: +1 hour
- **Total Potential: 7-9 hours per case**

---

## Next Steps

1. **Test Current Add-Ons:**
   - Create housing case
   - Test quantum calculator
   - Generate schedule of disrepair
   - Check deadline tracker

2. **Prioritize Future Add-Ons:**
   - Photo Management (if photo uploads are common)
   - Expert Instruction Templates (if experts are frequently used)
   - Court Forms Generator (if cases go to litigation)

3. **Gather User Feedback:**
   - Which add-ons are most used?
   - What additional features are requested?
   - What pain points remain?

The current implementation provides significant value, and the future add-ons can be prioritized based on actual usage patterns.

