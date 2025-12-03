# Awaab's Law Detection Verification

## PDF Content Analysis

The provided PDF contains all Awaab's Law triggers:

### ✅ Triggers Present:

1. **Child Under 5**: 
   - "2-year-old daughter Lily"
   - DOB: 14/05/2021 (age 2 at time of report)

2. **Mould > 28 Days**:
   - Initial report: 3 December 2023
   - Still present: June 2024
   - Duration: 6+ months (180+ days)

3. **Health Symptoms**:
   - "coughing most nights"
   - "two episodes of wheezing"
   - "breathing problems"
   - GP consultations (24 Dec 2023, 30 Apr 2024)
   - NHS 111 call (23 Dec 2023)
   - "respiratory symptoms"

4. **Category 1 Hazard**:
   - Surveyor report (12 March 2024): "Category 1 HHSRS hazard"
   - "serious health hazard"

5. **Council Involvement**:
   - Council enforcement email (4 April 2024)
   - References Awaab's Law explicitly

6. **Social Landlord**:
   - "Metropolitan Thames Valley Housing"
   - Clearly identified as social landlord

7. **No Repairs**:
   - Still not fixed by June 2024
   - Multiple delays and missed appointments

8. **Missed Appointments**:
   - 31 January 2024 marked as "no access" (disputed by tenant)

9. **Explicit Awaab's Law References**:
   - Multiple mentions throughout the document
   - Tenant explicitly references Awaab's Law
   - Council references Awaab's Law

## Expected Detection Results

When this PDF is uploaded, the system should:

1. **Extract Structured Data**:
   - Parties: Emily Harris (tenant), Lily Harris (child), Metropolitan Thames Valley (landlord)
   - Dates: 3 Dec 2023 (first report), 12 Mar 2024 (surveyor), etc.
   - Key Issues: Damp, mould, Category 1 hazard, child health impact
   - Housing Metadata:
     - Tenant vulnerability: ["Child under 5", "Health symptoms"]
     - Property defects: Mould, damp, condensation
     - HHSRS hazards: Category 1 damp and mould
     - First report date: 3 Dec 2023

2. **Create Housing Case Record**:
   - `landlord_type`: "social" (detected from "Metropolitan Thames Valley")
   - `first_report_date`: "2023-12-03"
   - `tenant_vulnerability`: ["Child under 5", "Health symptoms"]
   - `hhsrs_category_1_hazards`: ["damp", "mould"]

3. **Detect Awaab's Law Risks**:
   - **CRITICAL**: Child under 5 + Mould > 28 days + Health symptoms + Category 1 hazard
   - **HIGH**: 7-day assessment deadline missed (reported 3 Dec, surveyor 12 Mar = 99 days)
   - **HIGH**: 28-day repair duty missed (still not fixed by June = 180+ days)
   - **MEDIUM**: Emergency duty not triggered despite child health symptoms

4. **Generate Risk Alerts**:
   - "Possible statutory breach detected: Awaab's Law"
   - "7-day assessment deadline missed"
   - "28-day repair duty not met"
   - "Emergency duty may apply"

5. **Populate UI Panels**:
   - **Key Facts**: Should show parties, dates, amounts (£50 compensation)
   - **Key Issues**: Should show damp/mould, Category 1 hazard, child health impact
   - **Risk Alerts**: Should show Awaab's Law risks
   - **Awaab's Law Panel**: Should show all triggers and statutory breaches
   - **Damp/Mould Panel**: Should show mould duration, severity, location
   - **Health Symptoms Panel**: Should show child's respiratory symptoms
   - **Urgency Panel**: Should show missed deadlines and statutory timeframes
   - **Timeline**: Should show all events chronologically
   - **Insights**: Should include Awaab's Law analysis

## If Detection Fails

If the PDF doesn't trigger detection:

1. **Check Extraction**: The `extracted_json` field should contain housing metadata
2. **Check Housing Case**: The `housing_cases` table should have a record with `landlord_type = "social"`
3. **Check Risk Flags**: The `risk_flags` table should have Awaab's Law risks
4. **Re-run Extraction**: Use the `/api/cases/[caseId]/re-extract` endpoint

## Manual Verification Steps

1. Upload the PDF
2. Check browser console for extraction errors
3. Check database:
   - `documents.extracted_json` should have `housingMeta`
   - `housing_cases` should have record with `landlord_type = "social"`
   - `risk_flags` should have Awaab's Law risks
4. Check UI panels load correctly
5. If missing, trigger re-extraction

