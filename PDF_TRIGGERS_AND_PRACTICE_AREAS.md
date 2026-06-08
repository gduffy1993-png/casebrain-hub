
## Overview

CaseBrain automatically detects practice areas from PDF content and activates relevant laws, deadlines, and features based on what it finds. Each solicitor role has different legal frameworks mapped to it.

---

## 🏠 **HOUSING DISREPAIR** - What Triggers It

### PDF Content That Activates Housing Features:

#### **Keywords That Trigger Housing Detection:**
- "damp", "mould", "mold", "leak", "disrepair"
- "landlord", "tenant", "tenancy", "property"
- "housing association", "council", "social housing"
- "repair", "defect", "hazard", "unfit"
- "Section 11", "LTA 1985", "Landlord and Tenant Act"

#### **What Gets Extracted:**
```typescript
housingMeta: {# PDF Triggers & Practice Area Mapping Guide

  tenantVulnerability: ["child", "elderly", "asthma", "mobility"],
  propertyDefects: [
    { type: "damp", location: "bedroom", severity: "severe", firstReported: "2024-01-15" },
    { type: "mould", location: "bathroom", severity: "severe" }
  ],
  landlordResponses: [
    { date: "2024-01-20", type: "acknowledgement", text: "..." },
    { date: "2024-01-25", type: "repair_scheduled" }
  ],
  hhsrsHazards: ["damp", "mould", "structural"],
  unfitForHabitation: true,
  noAccessDays: 5,
  repairAttempts: 2
}
```

### **Housing-Specific Laws & Deadlines:**

#### **1. Awaab's Law** (Social Landlords Only)
**Triggers:**
- Social/council landlord detected
- Damp/mould mentioned
- Child under 5 or vulnerable tenant
- First complaint date found

**Deadlines Calculated:**
- **14 days** from first report → Investigation deadline
- **7 days** from investigation → Work start deadline
- **Reasonable time** → Completion deadline

**PDF Must Contain:**
- First complaint/report date
- Landlord type (social/council/private)
- Damp/mould/hazard description
- Child/vulnerability indicators

#### **2. Section 11 LTA 1985**
**Triggers:**
- "Section 11" mentioned
- Landlord repair obligations discussed
- Property defects listed

**Deadlines:**
- "Reasonable time" for repairs (varies by defect severity)

#### **3. HHSRS (Housing Health & Safety Rating System)**
**Triggers:**
- "Category 1 hazard" or "Category 2 hazard"
- "HHSRS" mentioned
- Severe defects described

**Features Activated:**
- Risk scoring
- Urgency flags
- Quantum calculations

---

## 🚗 **PERSONAL INJURY (PI)** - What Triggers It

### PDF Content That Activates PI Features:

#### **Keywords That Trigger PI Detection:**
- "RTA", "road traffic accident", "car accident"
- "whiplash", "injury", "claimant", "defendant"
- "OIC", "Official Injury Claim", "MedCo"
- "CNF", "Claim Notification Form"
- "liability", "quantum", "damages"

#### **What Gets Extracted:**
```typescript
piMeta: {
  oicTrack: "OIC" | "MOJ" | "Litigated" | "Unknown",
  injurySummary: "Whiplash injury to neck and back",
  whiplashTariffBand: "0-3 months" | "3-6 months" | "6-9 months" | "9-12 months" | "12-15 months" | "15-18 months" | "18+ months",
  prognosisMonthsMin: 3,
  prognosisMonthsMax: 6,
  psychInjury: true,
  treatmentRecommended: "Physiotherapy",
  medcoReference: "MED-12345",
  liabilityStance: "admitted" | "denied" | "partial" | "unknown"
}
```

### **PI-Specific Laws & Deadlines:**

#### **1. Limitation Period**
**Triggers:**
- Accident date found
- Injury date mentioned
- "3 years" or "limitation" mentioned

**Deadlines Calculated:**
- **3 years** from accident/injury → Limitation deadline
- **3 years** from knowledge (if later) → Knowledge-based limitation

#### **2. Pre-Action Protocol (PAP)**
**Triggers:**
- "Letter of Claim" mentioned
- "Protocol" mentioned
- "21 days" response time

**Deadlines:**
- **21 days** from Letter of Claim → Response deadline

#### **3. OIC Portal Deadlines**
**Triggers:**
- "OIC" or "Official Injury Claim" mentioned
- MedCo reference found
- Tariff band mentioned

**Deadlines:**
- Portal-specific timelines
- MedCo report deadlines

#### **4. Court Deadlines (CPR)**
**Triggers:**
- "CPR" mentioned
- "issued", "served", "defence" dates found
- Court dates mentioned

**Deadlines Calculated:**
- **120 days** from issue → Service deadline
- **14 days** from service → Acknowledgment of Service
- **28 days** from service → Defence deadline
- **14 days** after defence → Allocation questionnaire
- **28 days** → Disclosure deadline
- **56 days** → Witness statements
- **84 days** → Expert reports
- **21 days** before trial → Trial bundle

---

## 🏥 **CLINICAL NEGLIGENCE** - What Triggers It

### PDF Content That Activates Clinical Negligence Features:

#### **Keywords That Trigger Clinical Neg Detection:**
- "clinical negligence", "medical negligence"
- "NHS", "hospital", "GP", "surgeon", "doctor"
- "misdiagnosis", "delayed diagnosis", "surgical error"
- "breach of duty", "causation"
- "Bolam test", "Bolitho"

#### **What Gets Extracted:**
```typescript
piMeta: {
  // Clinical Neg uses same structure as PI but with different context
  injurySummary: "Delayed diagnosis of cancer",
  prognosisMonthsMin: 12,
  prognosisMonthsMax: 24,
  treatmentRecommended: "Chemotherapy and surgery",
  liabilityStance: "denied" // Often denied in clinical neg
}
```

### **Clinical Negligence-Specific Laws & Deadlines:**

#### **1. Limitation Period**
**Triggers:**
- Treatment date found
- Injury/negligence date mentioned
- "3 years" or "limitation" mentioned

**Deadlines:**
- **3 years** from date of negligence → Primary limitation
- **3 years** from date of knowledge → Knowledge-based limitation
- **Longstop 15 years** (rare, but calculated if applicable)

#### **2. Pre-Action Protocol (PAP)**
**Triggers:**
- "Letter of Claim" mentioned
- "Protocol" mentioned
- "4 months" response time (different from PI!)

**Deadlines:**
- **4 months (120 days)** from Letter of Claim → Response deadline (longer than PI)

#### **3. Court Deadlines (CPR)**
Same as PI but with longer timelines:
- **120 days** from issue → Service
- **14 days** from service → AOS
- **28 days** from service → Defence
- **Extended disclosure periods** (often longer than PI)
- **Expert report deadlines** (often 12+ weeks)

---

## 📋 **GENERAL LITIGATION** - What Triggers It

### PDF Content That Activates General Features:

#### **Keywords:**
- "claim", "defendant", "claimant"
- "court", "proceedings", "litigation"
- Dates, parties, amounts

### **General Deadlines:**
- Standard CPR deadlines
- Limitation periods (varies by cause of action)
- Court-ordered deadlines

---

## 🔄 **How Practice Area Detection Works**

### **Step 1: PDF Upload**
When you upload a PDF, CaseBrain:
1. Extracts all text
2. Sends to AI extraction model
3. AI looks for practice area indicators

### **Step 2: AI Extraction**
The AI model (`extractCaseFacts`) looks for:
- **claimType** field → "housing disrepair", "personal injury", "clinical negligence"
- **piMeta** → If PI/Clinical Neg indicators found
- **housingMeta** → If housing indicators found

### **Step 3: Practice Area Assignment**
```typescript
// From lib/packs/index.ts
function normalizePracticeAreaForPack(area: string): PackId {
  // Housing variants
  if (lower.includes("housing") || lower.includes("disrepair")) {
    return "housing_disrepair";
  }
  
  // PI variants
  if (lower.includes("pi") || lower.includes("personal") || 
      lower.includes("injury") || lower.includes("rta") || 
      lower.includes("accident")) {
    return "personal_injury";
  }
  
  // Clinical negligence variants
  if (lower.includes("clin") || lower.includes("medical") || 
      lower.includes("negligence")) {
    return "clinical_negligence";
  }
  
  // Family
  if (lower.includes("family") || lower.includes("child")) {
    return "family";
  }
  
  return "other_litigation";
}
```

### **Step 4: Feature Activation**
Once practice area is detected:
- **Housing** → Awaab's Law monitor, Section 11 checks, HHSRS scoring
- **PI** → OIC tracking, MedCo integration, whiplash tariff
- **Clinical Neg** → Extended PAP timelines, expert deadlines
- **All** → Limitation calculations, court deadlines, risk alerts

---

## 📊 **Deadline Calendar Activation**

### **What Makes Deadlines Appear in Calendar:**

#### **Housing Deadlines:**
1. **Awaab's Law** (if social landlord + damp/mould):
   - First report date → 14-day investigation deadline
   - Investigation date → 7-day work start deadline
   - Work start date → Reasonable completion deadline

2. **Section 11 LTA**:
   - First complaint date → Reasonable repair time

3. **Manual Deadlines**:
   - Any deadline you create manually

#### **PI/Clinical Neg Deadlines:**
1. **Limitation**:
   - Accident/treatment date → 3-year limitation deadline

2. **Pre-Action Protocol**:
   - Letter of Claim date → 21 days (PI) or 120 days (Clinical Neg)

3. **Court Deadlines** (if dates found):
   - Issued date → Service deadline (120 days)
   - Served date → AOS deadline (14 days)
   - Served date → Defence deadline (28 days)
   - Defence date → Allocation (14 days)
   - Disclosure deadline (28 days)
   - Witness statements (56 days)
   - Expert reports (84 days)
   - Trial date → Bundle deadline (21 days before)

---

## 🎯 **Example PDFs That Trigger Features**

### **Housing Example:**
```
"Letter to Metropolitan Housing Association

Re: 123 High Street, London - Damp and Mould Issues

I am writing on behalf of my client, Mrs. Sarah Smith, 
regarding severe damp and mould in her property at 123 High Street.

First reported: 15 January 2024
The property has Category 1 hazards including:
- Severe damp in bedroom
- Black mould in bathroom
- Leaking roof

My client has a 2-year-old daughter who suffers from asthma.

Under Section 11 of the Landlord and Tenant Act 1985..."
```

**Triggers:**
- ✅ Housing practice area (damp, mould, landlord)
- ✅ Social landlord (Metropolitan Housing Association)
- ✅ Awaab's Law (social + damp/mould + child)
- ✅ Section 11 LTA (mentioned)
- ✅ First report date (15 January 2024)
- ✅ HHSRS Category 1 hazard
- ✅ Vulnerability (child, asthma)

**Deadlines Created:**
- 29 January 2024 (14 days from first report) → Investigation deadline
- 5 February 2024 (7 days after investigation) → Work start deadline

### **PI Example:**
```
"Claim Notification Form - RTA

Date of Accident: 10 March 2024
Claimant: John Doe
Defendant: ABC Insurance

Injuries: Whiplash injury to neck and back
Prognosis: 3-6 months
OIC Portal Reference: OIC-12345
MedCo Reference: MED-67890

Liability: Admitted
Track: OIC Portal"
```

**Triggers:**
- ✅ PI practice area (RTA, whiplash, OIC)
- ✅ OIC track detected
- ✅ MedCo reference found
- ✅ Accident date (10 March 2024)
- ✅ Limitation deadline (10 March 2027)

**Deadlines Created:**
- 10 March 2027 (3 years from accident) → Limitation deadline
- OIC portal deadlines (if applicable)

### **Clinical Negligence Example:**
```
"Letter of Claim - Clinical Negligence

Re: Delayed Diagnosis of Cancer

My client, Jane Smith, attended A&E on 5 June 2023 
complaining of severe abdominal pain.

The hospital failed to diagnose appendicitis, leading to 
perforation and sepsis.

Date of Negligence: 5 June 2023
Date of Knowledge: 15 June 2023 (when diagnosis confirmed)

Under the Clinical Negligence Pre-Action Protocol..."
```

**Triggers:**
- ✅ Clinical negligence (medical negligence, hospital)
- ✅ Negligence date (5 June 2023)
- ✅ Knowledge date (15 June 2023)
- ✅ Pre-Action Protocol mentioned

**Deadlines Created:**
- 5 June 2026 (3 years from negligence) → Primary limitation
- 15 June 2026 (3 years from knowledge) → Knowledge-based limitation
- 120 days from Letter of Claim → PAP response deadline

---

## 🔧 **Manual Override**

You can manually set the practice area when uploading:
- Select "Housing Disrepair", "Personal Injury", "Clinical Negligence", etc.
- This overrides AI detection if needed
- Still triggers all relevant laws and deadlines for that practice area

---

## 📝 **Summary**

**Each solicitor role has different laws mapped:**

| Practice Area | Key Laws | Key Deadlines |
|--------------|----------|---------------|
| **Housing** | Awaab's Law, Section 11 LTA, HHSRS | 14 days (investigation), 7 days (work start), reasonable time |
| **PI** | Limitation Act, PAP, CPR, OIC Rules | 3 years (limitation), 21 days (PAP), 120 days (service) |
| **Clinical Neg** | Limitation Act, PAP, CPR | 3 years (limitation), 120 days (PAP), extended court deadlines |
| **Family** | Family Procedure Rules | Court-specific deadlines |
| **General** | CPR, Limitation Act | Standard litigation deadlines |

**The system automatically:**
1. Detects practice area from PDF content
2. Extracts relevant dates and facts
3. Calculates deadlines based on practice area laws
4. Activates practice-specific features (Awaab's Law monitor, OIC tracking, etc.)
5. Shows all deadlines in the calendar view

**The layout and features adapt to the practice area** - housing cases show Awaab's Law panels, PI cases show OIC/MedCo panels, clinical neg shows extended PAP timelines, etc.

