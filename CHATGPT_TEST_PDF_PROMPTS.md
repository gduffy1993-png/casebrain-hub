# ChatGPT Test PDF Prompts

Copy and paste these prompts to ChatGPT to generate test PDFs that trigger all CaseBrain features.

---

## 🏠 **HOUSING DISREPAIR TEST PDF**

**Copy this prompt to ChatGPT:**

```
Create a test PDF document for a housing disrepair case. The document should be a letter from a solicitor to a social landlord (Metropolitan Housing Association or similar council/housing association). Include:

1. First complaint date: 15 January 2024 (this triggers Awaab's Law deadlines)
2. Property address: 123 High Street, London
3. Tenant name: Mrs. Sarah Smith
4. Landlord: Metropolitan Housing Association (social landlord - triggers Awaab's Law)
5. Defects mentioned:
   - Severe damp in bedroom
   - Black mould in bathroom
   - Leaking roof
   - Category 1 hazard mentioned
6. Vulnerability factors:
   - Tenant has a 2-year-old daughter
   - Daughter suffers from asthma
   - Elderly tenant (if applicable)
7. Key phrases to include:
   - "First reported on 15 January 2024"
   - "Section 11 of the Landlord and Tenant Act 1985"
   - "Category 1 hazard under HHSRS"
   - "Awaab's Law" (optional but helpful)
   - "Social landlord"
   - "Damp and mould"
   - "Unfit for habitation" (if severe)
8. Landlord responses mentioned:
   - Acknowledgment received on 20 January 2024
   - Repair scheduled for 25 January 2024
9. Dates to include:
   - First complaint: 15 January 2024
   - Landlord acknowledgment: 20 January 2024
   - Repair attempt: 25 January 2024

Format as a formal solicitor's letter with proper headings, dates, and professional language.
```

**What This Triggers:**
- ✅ Housing practice area detection
- ✅ Awaab's Law deadlines (14 days from first report = 29 January 2024)
- ✅ Section 11 LTA compliance checks
- ✅ HHSRS Category 1 hazard detection
- ✅ Vulnerability scoring (child + asthma)
- ✅ Deadline calendar entries
- ✅ Risk alerts for Awaab's Law breach

---

## 🚗 **PERSONAL INJURY (PI) TEST PDF**

**Copy this prompt to ChatGPT:**

```
Create a test PDF document for a personal injury RTA case. The document should be a Claim Notification Form (CNF) or Letter of Claim. Include:

1. Accident date: 10 March 2024 (this triggers 3-year limitation deadline = 10 March 2027)
2. Claimant: John Doe
3. Defendant: ABC Insurance Company
4. Type of accident: Road Traffic Accident (RTA)
5. Injuries mentioned:
   - Whiplash injury to neck and back
   - Soft tissue injuries
6. Key information:
   - OIC Portal Reference: OIC-12345
   - MedCo Reference: MED-67890
   - Track: OIC Portal (or MOJ Portal, or Litigated)
   - Prognosis: 3-6 months recovery
   - Whiplash Tariff Band: 0-3 months (or 3-6 months, 6-9 months, etc.)
7. Liability: Admitted (or Denied, or Partial)
8. Key phrases to include:
   - "Road Traffic Accident"
   - "Whiplash injury"
   - "OIC Portal"
   - "MedCo"
   - "Claim Notification Form"
   - "Official Injury Claim"
9. Dates to include:
   - Accident date: 10 March 2024
   - Letter of Claim sent: 1 April 2024 (triggers 21-day PAP response deadline = 22 April 2024)
   - If court proceedings: Issued date, served date, defence date (triggers court deadlines)

Format as a formal CNF or Letter of Claim with all standard sections.
```

**What This Triggers:**
- ✅ PI practice area detection
- ✅ Limitation deadline (3 years from accident = 10 March 2027)
- ✅ OIC Portal tracking
- ✅ MedCo reference detection
- ✅ Pre-Action Protocol deadlines (21 days from Letter of Claim)
- ✅ Court deadlines (if issued/served dates included)
- ✅ Whiplash tariff calculations
- ✅ Deadline calendar entries

---

## 🏥 **CLINICAL NEGLIGENCE TEST PDF**

**Copy this prompt to ChatGPT:**

```
Create a test PDF document for a clinical negligence case. The document should be a Letter of Claim to an NHS Trust or hospital. Include:

1. Date of negligence: 5 June 2023 (triggers 3-year limitation = 5 June 2026)
2. Date of knowledge: 15 June 2023 (when patient discovered the negligence - triggers knowledge-based limitation = 15 June 2026)
3. Patient: Jane Smith
4. Defendant: St. Mary's Hospital NHS Trust (or similar)
5. Type of negligence:
   - Delayed diagnosis of appendicitis
   - Or: Misdiagnosis of cancer
   - Or: Surgical error
   - Or: Failure to treat
6. Key information:
   - Treatment date: 5 June 2023
   - Correct diagnosis date: 15 June 2023
   - Prognosis: 12-24 months recovery
   - Ongoing treatment required
7. Key phrases to include:
   - "Clinical negligence"
   - "Medical negligence"
   - "Breach of duty"
   - "Causation"
   - "NHS Trust"
   - "Delayed diagnosis"
   - "Pre-Action Protocol for Clinical Negligence"
8. Dates to include:
   - Date of negligence: 5 June 2023
   - Date of knowledge: 15 June 2023
   - Letter of Claim sent: 1 July 2024 (triggers 120-day PAP response deadline = 29 October 2024)
   - If court proceedings: Issued date, served date, defence date

Format as a formal Letter of Claim under the Clinical Negligence Pre-Action Protocol.
```

**What This Triggers:**
- ✅ Clinical negligence practice area detection
- ✅ Limitation deadlines (primary and knowledge-based)
- ✅ Extended Pre-Action Protocol deadlines (120 days, not 21)
- ✅ Court deadlines with extended timelines
- ✅ Expert report deadlines
- ✅ Deadline calendar entries

---

## 📋 **COMBINED TEST PDF (Multiple Practice Areas)**

**Copy this prompt to ChatGPT:**

```
Create a test PDF that could work for multiple practice areas. Include:

HOUSING VERSION:
- First complaint: 15 January 2024
- Social landlord (Metropolitan Housing Association)
- Damp, mould, Category 1 hazard
- Child under 5 with asthma
- Section 11 LTA mentioned

PI VERSION:
- Accident date: 10 March 2024
- RTA, whiplash, OIC Portal
- MedCo reference
- 3-6 month prognosis

CLINICAL NEG VERSION:
- Negligence date: 5 June 2023
- Knowledge date: 15 June 2023
- NHS Trust, delayed diagnosis
- Clinical negligence mentioned

Make it a general litigation document that mentions dates, parties, and key facts that could apply to any practice area.
```

---

## 🎯 **MINIMUM REQUIREMENTS FOR EACH PRACTICE AREA**

### **Housing - Minimum to Trigger:**
- ✅ "damp" OR "mould" OR "disrepair"
- ✅ "landlord" OR "tenant" OR "housing"
- ✅ A date (first complaint date)
- ✅ "social" OR "council" OR "housing association" (for Awaab's Law)

### **PI - Minimum to Trigger:**
- ✅ "RTA" OR "accident" OR "whiplash" OR "personal injury"
- ✅ Accident date
- ✅ "OIC" OR "MedCo" (for portal features)

### **Clinical Neg - Minimum to Trigger:**
- ✅ "clinical negligence" OR "medical negligence"
- ✅ Treatment/negligence date
- ✅ "NHS" OR "hospital" OR "doctor"

---

## 📝 **QUICK COPY-PASTE TEMPLATES**

### **Housing Template:**
```
Letter to Metropolitan Housing Association

Re: 123 High Street, London - Damp and Mould Issues

I am writing on behalf of my client, Mrs. Sarah Smith, regarding severe damp and mould in her property at 123 High Street, London.

First reported: 15 January 2024

The property has Category 1 hazards including:
- Severe damp in bedroom
- Black mould in bathroom  
- Leaking roof

My client has a 2-year-old daughter who suffers from asthma.

Under Section 11 of the Landlord and Tenant Act 1985, you have a duty to keep the property in good repair.

Landlord acknowledgment received: 20 January 2024
Repair scheduled: 25 January 2024
```

### **PI Template:**
```
Claim Notification Form - Road Traffic Accident

Date of Accident: 10 March 2024
Claimant: John Doe
Defendant: ABC Insurance Company

Injuries: Whiplash injury to neck and back
Prognosis: 3-6 months recovery
OIC Portal Reference: OIC-12345
MedCo Reference: MED-67890

Liability: Admitted
Track: OIC Portal

Letter of Claim sent: 1 April 2024
```

### **Clinical Neg Template:**
```
Letter of Claim - Clinical Negligence

Re: Delayed Diagnosis of Appendicitis

My client, Jane Smith, attended A&E on 5 June 2023 complaining of severe abdominal pain.

The hospital failed to diagnose appendicitis, leading to perforation and sepsis.

Date of Negligence: 5 June 2023
Date of Knowledge: 15 June 2023 (when diagnosis confirmed)

Under the Clinical Negligence Pre-Action Protocol.

Letter of Claim sent: 1 July 2024
```

---

## ✅ **CHECKLIST FOR CHATGPT**

When asking ChatGPT to create test PDFs, make sure it includes:

**For Housing:**
- [ ] First complaint/report date
- [ ] Social landlord name (council/housing association)
- [ ] Damp/mould mentioned
- [ ] Child or vulnerable person mentioned
- [ ] Section 11 LTA mentioned (optional but helpful)
- [ ] Category 1/2 hazard mentioned (optional)

**For PI:**
- [ ] Accident date
- [ ] RTA/whiplash/injury mentioned
- [ ] OIC Portal reference (optional)
- [ ] MedCo reference (optional)
- [ ] Letter of Claim date (for PAP deadline)

**For Clinical Neg:**
- [ ] Negligence/treatment date
- [ ] Knowledge date (when discovered)
- [ ] "Clinical negligence" or "medical negligence"
- [ ] NHS Trust or hospital name
- [ ] Letter of Claim date (for extended PAP deadline)

---

## 🚀 **BONUS: Court Proceedings PDF**

To trigger court deadlines, add this to any PDF:

```
Court Proceedings Timeline:

Claim issued: 1 May 2024
Claim served: 15 May 2024
Acknowledgment of Service: 20 May 2024
Defence filed: 10 June 2024
Allocation questionnaire: 25 June 2024
Disclosure deadline: 25 July 2024
Witness statements: 15 September 2024
Expert reports: 15 October 2024
Trial date: 15 December 2024
Trial bundle deadline: 24 November 2024 (21 days before trial)
```

This will create all the court deadline entries in the calendar!

