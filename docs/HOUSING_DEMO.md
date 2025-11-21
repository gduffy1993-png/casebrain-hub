# Housing Disrepair Case Demo Walkthrough

This document walks through a complete housing disrepair case using CaseBrain's Housing Disrepair module, demonstrating all features from intake to handover.

## Scenario

**Case**: Smith v ABC Housing Association  
**Tenant**: Mrs. Sarah Smith (age 72, asthma, mobility issues)  
**Property**: 123 Oak Street, London  
**Landlord**: ABC Housing Association (social landlord)  
**First Report**: 1st January 2024  
**Issues**: Severe damp and mould in bedroom, leaking roof, heating failure

---

## Step 1: Case Intake

### 1.1 Create Housing Disrepair Case

Navigate to **Cases** → **New Housing Disrepair case**

**Step 1 - Basic Information:**
- Case Title: `Smith v ABC Housing Association`
- Tenant Name: `Mrs. Sarah Smith`
- Property Address: `123 Oak Street, London, SW1A 1AA`
- Landlord Name: `ABC Housing Association`
- Landlord Type: `Social Housing`

**Step 2 - Tenant & Timeline:**
- Date of Birth: `15/03/1952`
- Tenant Vulnerabilities: Select `elderly`, `asthma`, `mobility`
- First Report Date: `01/01/2024`

**Step 3 - Property Defects:**
- Defect 1:
  - Type: `Damp`
  - Location: `Bedroom`
  - Severity: `Severe`
  - First Reported: `01/01/2024`
- Defect 2:
  - Type: `Mould`
  - Location: `Bedroom walls and ceiling`
  - Severity: `Severe`
  - First Reported: `01/01/2024`
- Defect 3:
  - Type: `Leak`
  - Location: `Roof above bedroom`
  - Severity: `Moderate`
  - First Reported: `05/01/2024`
- Defect 4:
  - Type: `Heating`
  - Location: `Entire property`
  - Severity: `Critical`
  - First Reported: `10/01/2024`

**Result**: Case created with:
- `housing_cases` record with tenant vulnerabilities, first report date
- `housing_defects` records for each defect
- Automatic limitation period calculation (6 years from first report)
- Initial stage: `intake`

---

## Step 2: Upload Evidence

### 2.1 Upload Initial Complaint Letter

Navigate to case → **Upload** tab

Upload: `initial_complaint_letter.pdf`

**What CaseBrain Extracts:**
```json
{
  "parties": [
    { "name": "Mrs. Sarah Smith", "role": "client" },
    { "name": "ABC Housing Association", "role": "defendant" }
  ],
  "dates": [
    { "label": "First complaint", "isoDate": "2024-01-01" },
    { "label": "Medical appointment", "isoDate": "2024-01-15" }
  ],
  "summary": "Tenant reports severe damp and mould in bedroom causing asthma exacerbation...",
  "housingMeta": {
    "tenantVulnerability": ["elderly", "asthma", "mobility"],
    "propertyDefects": [
      { "type": "damp", "location": "Bedroom", "severity": "severe" },
      { "type": "mould", "location": "Bedroom", "severity": "severe" }
    ],
    "hhsrsHazards": ["damp", "mould"],
    "unfitForHabitation": false,
    "noAccessDays": 0
  }
}
```

**Result**:
- Document stored with extracted JSON
- `housing_cases` record updated with vulnerabilities and hazards
- Timeline event created: "Complaint - 01/01/2024"

### 2.2 Upload Landlord Response

Upload: `landlord_response_15jan.pdf`

**What CaseBrain Extracts:**
```json
{
  "housingMeta": {
    "landlordResponses": [
      {
        "date": "2024-01-15",
        "type": "acknowledgement",
        "text": "We acknowledge your complaint and will investigate within 14 days"
      }
    ]
  }
}
```

**Result**:
- `housing_landlord_responses` record created
- Timeline event: "Landlord Response - 15/01/2024"
- Case stage may update to `investigation` (landlord has responded)

### 2.3 Upload Medical Report

Upload: `gp_report_asthma.pdf`

**What CaseBrain Extracts:**
- Medical evidence linking asthma exacerbation to damp/mould exposure
- Timeline event: "Medical Report - 20/01/2024"

---

## Step 3: View Litigation Guidance

Navigate to case detail page → **Litigation Guidance** panel

**What You See:**

### Current Stage
- **Stage**: `INVESTIGATION` (High Confidence)
- **Reasoning**: "Case in investigation phase with landlord response"

### Risk Flags

**🔴 CRITICAL - HHSRS Category 1 Hazards**
- Description: "Category 1 hazards: damp, mould"
- Evidence: `housingMeta.hhsrsHazards`
- Recommended Action: "Immediate action required - Category 1 hazards must be addressed"

**🟠 HIGH - Awaab's Law - Investigation**
- Description: "Social landlord must investigate within 14 days of report (Awaab's Law)"
- Details: "Investigation occurred 14 days after first report (within 14-day limit)"
- Status: ✅ Passed (just within deadline)

**🟠 HIGH - Vulnerability - Health Risk**
- Description: "Health-related vulnerability combined with damp/mould creates serious health risk"
- Details: "Asthma/respiratory condition with damp/mould exposure - immediate action required"
- Status: ❌ Failed

**🟡 MEDIUM - Section 11 LTA 1985 - Repair Duty**
- Description: "Landlord must keep property in good repair. Reasonable time: 14 days (vulnerable tenant)"
- Details: "Repair not yet completed. 20 days since report (exceeds reasonable time of 14 days)"
- Status: ❌ Failed

### Recommended Next Steps

**🔴 URGENT - Flag Category 1 HHSRS hazards**
- Action: "Flag Category 1 HHSRS hazards - immediate action required"
- Reason: "Category 1 hazards require immediate action by landlord"

**🟠 HIGH - Monitor Awaab's Law compliance**
- Action: "Monitor Awaab's Law compliance (14-day investigation deadline)"
- Reason: "Social landlords must investigate within 14 days under Awaab's Law"

**🟡 MEDIUM - Monitor repair progress**
- Action: "Monitor repair progress and landlord responses"
- Reason: "Track compliance with Section 11 LTA duty"

### Recommended Templates
- `REPAIR_REQUEST` - Initial repair request
- `S11_LTA` - Section 11 LTA 1985 Notice
- `ESCALATION` - Escalation chaser

### Disclaimer
> ⚠️ **Guidance Only - Not Legal Advice**  
> This guidance is generated from extracted evidence and does not constitute legal advice. All recommendations, deadlines, and risk assessments should be verified independently with qualified legal counsel.

---

## Step 4: Draft Letter

### 4.1 Generate Section 11 LTA Notice

Navigate to case → **Letters** → **Draft Letter**

Select template: `S11_LTA` (Section 11 LTA 1985 Notice)

**What CaseBrain Generates:**

```
Dear ABC Housing Association,

Re: 123 Oak Street, London - Section 11 LTA 1985 Notice

I am writing to formally notify you of your obligations under Section 11 
of the Landlord and Tenant Act 1985 in respect of the above property.

The following disrepair issues have been reported:

- damp (Bedroom) - severe
- mould (Bedroom walls and ceiling) - severe
- leak (Roof above bedroom) - moderate
- heating (Entire property) - critical

Under Section 11, you are required to:
- Keep in repair the structure and exterior of the dwelling
- Keep in repair and proper working order installations for the supply 
  of water, gas, electricity, sanitation, space heating and heating water

These obligations are ongoing and cannot be excluded or limited. Failure 
to comply may result in legal action being taken against you.

Please confirm within 14 days:
1. Your acceptance of these obligations
2. Your proposed timetable for carrying out the necessary repairs
3. Details of any access arrangements required

Yours faithfully,
[Your Firm]
```

**Variables Used:**
- `{{landlord_name}}` → "ABC Housing Association" (from extracted facts)
- `{{property_address}}` → "123 Oak Street, London" (from case record)
- `{{defects_list}}` → Auto-generated from `housing_defects` table
- `{{firm_name}}` → From organisation settings

**Missing Variables**: None (all found)

**Confidence**: High

### 4.2 Review and Edit

- Edit letter text as needed
- Add any additional points
- Save as version 1

**Result**: Letter saved to `letters` table with version control

---

## Step 5: Upload More Evidence

### 5.1 Upload No-Access Log

Upload: `no_access_log_25jan.pdf`

**What CaseBrain Extracts:**
- Landlord claimed no access on 25/01/2024, 26/01/2024, 27/01/2024
- Total no-access days: 3

**Result**:
- `housing_cases.no_access_count` updated: 3
- `housing_cases.no_access_days_total` updated: 3
- Timeline events created for each no-access claim
- **New Risk Flag Generated**:
  - 🟡 MEDIUM - No Access - Frequent Claims
  - "3 separate no-access claims recorded"

### 5.2 Upload Failed Repair Attempt

Upload: `failed_repair_30jan.pdf`

**What CaseBrain Extracts:**
- Repair attempted on 30/01/2024
- Repair unsuccessful (mould returned within 48 hours)

**Result**:
- `housing_defects.repair_attempted` = true
- `housing_defects.repair_successful` = false
- `housing_cases.repair_attempts_count` = 1
- Timeline event: "Repair Attempt - 30/01/2024"

**Updated Compliance Check**:
- 🟡 MEDIUM - Section 11 LTA 1985 - Failed Repairs
- "1 repair attempt(s) without successful completion"

---

## Step 6: View Updated Compliance Panel

Navigate to case → **Compliance & Risk** panel

**Updated Checks:**

### ✅ Passed
- Awaab's Law - Investigation (investigated within 14 days)

### ❌ Failed

**🔴 CRITICAL - HHSRS Category 1 Hazards**
- Category 1 hazards: damp, mould
- Immediate action required

**🟠 HIGH - Section 11 LTA 1985 - Repair Duty**
- 30 days since report (exceeds 14-day reasonable time for vulnerable tenant)
- Repair not yet completed

**🟠 HIGH - Vulnerability - Health Risk**
- Asthma with damp/mould exposure
- Immediate action required

**🟡 MEDIUM - Section 11 LTA 1985 - Failed Repairs**
- 1 repair attempt without successful completion

**🟡 MEDIUM - No Access - Frequent Claims**
- 3 separate no-access claims recorded

---

## Step 7: Generate Pre-Action Letter

### 7.1 Draft Pre-Action Protocol Letter

Navigate to case → **Letters** → **Draft Letter**

Select template: `PRE_ACTION`

**What CaseBrain Generates:**

```
Dear ABC Housing Association,

Re: 123 Oak Street, London - Letter Before Action

I am instructed by Mrs. Sarah Smith in relation to disrepair at the above property.

Despite previous correspondence dated 01/01/2024, the following issues remain outstanding:

- damp (Bedroom) - severe
- mould (Bedroom walls and ceiling) - severe
- leak (Roof above bedroom) - moderate
- heating (Entire property) - critical

This constitutes a breach of your obligations under Section 11 of the Landlord 
and Tenant Act 1985 and/or the terms of the tenancy agreement.

My client has suffered loss and damage as a result, including:
- Inconvenience and distress
- Damage to personal belongings
- Additional heating costs
- Health issues (asthma, elderly, mobility)

Unless you confirm within 21 days that you will:
1. Carry out all necessary repairs within a reasonable timeframe; and
2. Compensate my client for the losses suffered

I have instructions to issue proceedings against you without further notice.

Yours faithfully,
[Your Firm]
```

**Auto-populated Variables:**
- Tenant name, property address, first complaint date
- Defects list from database
- Health issues from tenant vulnerabilities
- Firm name from settings

### 7.2 Update Case Stage

After sending pre-action letter:
- Case stage updates to `pre_action`
- Timeline event: "Legal Action - Pre-Action Letter - [Date]"

---

## Step 8: Export Bundle

Navigate to case → **Export Bundle** panel

Click **Export Bundle**

**What Gets Generated:**

### PDF Bundle Contents:

1. **Cover Page**
   - Firm name and address
   - Case title: "Smith v ABC Housing Association"
   - Case reference
   - Client: Mrs. Sarah Smith
   - Defendant: ABC Housing Association
   - Practice Area: Housing Disrepair
   - Generated date/time

2. **Case Overview**
   - Summary from extracted evidence
   - **Disclaimer**: "This bundle is generated from extracted evidence. All facts and dates should be verified independently. This does not constitute legal advice."

3. **Key Facts**
   - Parties: Mrs. Sarah Smith (client), ABC Housing Association (defendant)
   - Key Dates: First complaint (01/01/2024), Medical appointment (15/01/2024)
   - Amounts: (if any extracted)

4. **PI / Clinical Negligence Details**
   - (Not applicable for housing cases)

5. **Risk & Compliance**
   - HHSRS Category 1 Hazards (damp, mould)
   - Section 11 LTA 1985 breaches
   - Vulnerability flags
   - No-access pattern

6. **Timeline**
   - 01/01/2024 - Complaint
   - 15/01/2024 - Landlord Response
   - 20/01/2024 - Medical Report
   - 25/01/2024 - No Access Claim
   - 26/01/2024 - No Access Claim
   - 27/01/2024 - No Access Claim
   - 30/01/2024 - Repair Attempt (Failed)

7. **Letters**
   - Section 11 LTA Notice (v1) - [Date]
   - Pre-Action Letter (v1) - [Date]
   - Each includes full body text and firm sign-off

8. **Documents**
   - initial_complaint_letter.pdf - Uploaded 01/01/2024
   - landlord_response_15jan.pdf - Uploaded 15/01/2024
   - gp_report_asthma.pdf - Uploaded 20/01/2024
   - no_access_log_25jan.pdf - Uploaded 25/01/2024
   - failed_repair_30jan.pdf - Uploaded 30/01/2024

**Result**: PDF file downloaded with watermark, pagination, and index

---

## Step 9: Export Handover Pack

Navigate to case → **Export Bundle** panel

Click **Export Handover Pack**

**What Gets Generated:**

### Markdown File Contents:

```markdown
# Case Handover Pack: Smith v ABC Housing Association

**Case ID:** abc123-def456-ghi789

## Summary

**Facts:** Tenant reports severe damp and mould in bedroom causing asthma 
exacerbation. Property has multiple defects including leaking roof and heating 
failure. Landlord is social housing provider. Tenant is elderly with asthma 
and mobility issues.

**Key Issues:**
- HHSRS Category 1 hazards (damp, mould)
- Section 11 LTA 1985 breach
- Awaab's Law compliance (investigated within 14 days)
- Vulnerability - health risk (asthma with damp/mould)
- Failed repair attempts
- No-access pattern

**Risks:**
- limitation_period: Limitation period expires in 5.8 years
- hhsrs_category_1: Category 1 hazards: damp, mould
- vulnerability_health_risk: Asthma/respiratory condition with damp/mould exposure
- section_11_repair_duty: Repair not yet completed. 30 days since report

## Chronology

| Date | Event | Source | Significance |
|------|-------|--------|--------------|
| 01/01/2024 | Complaint | initial_complaint_letter.pdf | Primary complaint with defects listed |
| 15/01/2024 | Landlord Response | landlord_response_15jan.pdf | Acknowledgement and investigation promise |
| 20/01/2024 | Medical Report | gp_report_asthma.pdf | Links asthma to damp/mould exposure |
| 25/01/2024 | No Access Claim | no_access_log_25jan.pdf | Landlord claimed no access |
| 30/01/2024 | Repair Attempt | failed_repair_30jan.pdf | Repair attempted but failed |

## Statement of Case (Draft)

```
STATEMENT OF CASE

Parties: Mrs. Sarah Smith (client), ABC Housing Association (defendant)

Key Dates: First complaint: 01/01/2024; Medical appointment: 15/01/2024

Summary of Facts:
Tenant reports severe damp and mould in bedroom causing asthma exacerbation...

Key Issues:
- HHSRS Category 1 hazards
- Section 11 LTA 1985 breach
- Vulnerability - health risk
```

**Missing Elements:** None

## Disclosure List

- **initial_complaint_letter.pdf**: Initial complaint with defect details
- **landlord_response_15jan.pdf**: Landlord acknowledgement
- **gp_report_asthma.pdf**: Medical evidence linking health to disrepair
- **no_access_log_25jan.pdf**: No-access claims
- **failed_repair_30jan.pdf**: Failed repair attempt

## Next Steps

- **[URGENT]** Flag Category 1 HHSRS hazards - immediate action required
- **[HIGH]** Monitor repair progress and landlord responses
- **[MEDIUM]** Consider escalation - multiple failed repair attempts

## Task List

- Review medical evidence
- Prepare quantum assessment
- Consider expert surveyor report

---

**Disclaimer:** This handover pack is generated from extracted evidence and 
does not replace professional legal judgment. All facts, dates, and 
recommendations should be verified independently. This is not legal advice.
```

**Result**: Markdown file downloaded, ready for fee-earner/counsel handover

---

## Step 10: View Housing Dashboard

Navigate to **Housing Dashboard**

**What You See:**

### Metrics
- **Total Cases**: 1
- **Category 1 Hazards**: 1 (this case)
- **High No-Access**: 0 (this case has 3 days, threshold is 90)
- **Limitation Risk**: 0

### Case Stages
- Intake: 0
- Investigation: 1 (this case)
- Pre-Action: 0
- Litigation: 0
- Settlement: 0

### Critical Alerts
- **Unfit for Habitation**: 0
- **Unrepaired Defects**: 1 (heating, leak still outstanding)
- **High Limitation Risk**: 0
- **Category 1 Hazards**: 1

---

## Summary

This walkthrough demonstrates:

✅ **Intake**: Multi-step wizard creates case with all metadata  
✅ **Evidence Extraction**: AI extracts defects, vulnerabilities, landlord responses  
✅ **Compliance Checks**: Awaab's Law, HHSRS, Section 11 LTA, limitation, vulnerability, no-access  
✅ **Stage Assessment**: Automatic stage detection (intake → investigation → pre_action)  
✅ **Litigation Guidance**: Risk flags, next steps, template recommendations  
✅ **Letter Drafting**: Auto-populated templates with case data  
✅ **Timeline Building**: Structured chronology with source links  
✅ **Bundle Export**: Court-ready PDF with all case materials  
✅ **Handover Pack**: Structured export for fee-earner/counsel  

**Time Saved**: ~8-10 hours per case through automation  
**Risk Reduction**: Automatic compliance monitoring and deadline tracking  
**Quality**: Consistent, professional output with source tracing

---

## Next Steps (Real Case)

1. **Issue Proceedings** (if landlord doesn't respond to pre-action letter)
2. **Obtain Expert Surveyor Report** (for quantum and causation)
3. **Prepare Schedule of Disrepair** (detailed defect list)
4. **Calculate Quantum** (general damages, special damages, future loss)
5. **Consider ADR/Mediation** (before full litigation)

All of these can be supported by CaseBrain's core features and housing module extensions.

