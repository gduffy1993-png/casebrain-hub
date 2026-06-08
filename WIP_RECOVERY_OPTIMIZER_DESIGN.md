# 💸 WIP Recovery Optimizer - Practice Area Specific Design

## Overview

The WIP Recovery Optimizer will be **practice-area aware** - each solicitor role (PI, Housing, Criminal, Family, etc.) will see tailored insights based on their specific billing patterns and industry norms.

---

## 🎯 Practice-Area Specific Features

### **1. Personal Injury (PI) Solicitors**

**Unique Challenges:**
- Fixed fee cases (OIC portal) vs. hourly billing
- Medical report delays = unbilled disbursements
- Part 36 offers = billing opportunities
- Stage-based billing (pre-action, litigation, trial)

**What They'll See:**
- **Fixed Fee Tracker:** "Case X is at 15 hours but fixed fee is £1,200. You're losing money."
- **Disbursement Recovery:** "£3,500 in medical reports unbilled for 60+ days. Bill now."
- **Stage-Based Alerts:** "Case moved to litigation stage. Bill pre-action work immediately."
- **Part 36 Opportunities:** "Part 36 offer accepted. Bill success fee + costs now."
- **OIC Portal Cases:** "OIC case settled. Bill fixed fee + success fee within 7 days."

**Dashboard View:**
```
PI WIP Recovery Dashboard
├── Fixed Fee Cases (at risk of going over)
├── Unbilled Disbursements (medical reports, experts)
├── Stage Transition Billing (pre-action → litigation)
├── Part 36 Success Fees (pending billing)
└── OIC Portal Cases (settled, need billing)
```

---

### **2. Housing Disrepair Solicitors**

**Unique Challenges:**
- Conditional fee agreements (CFAs) = no win, no fee
- Success fees only payable on win
- Disbursements (surveys, expert reports) can be large
- Awaab's Law = time-sensitive billing windows

**What They'll See:**
- **CFA Success Fee Tracker:** "Case won. Success fee of £X needs billing within 14 days."
- **Disbursement Recovery:** "£2,000 in survey costs unbilled. Client liable if case loses - bill now."
- **Awaab's Law Billing:** "14-day investigation period completed. Bill investigation work."
- **Settlement Billing:** "Case settled at £Y. Bill success fee + base costs."
- **No-Win-No-Fee Risk:** "Case at 40 hours. If it loses, you recover nothing. Consider Part 36 offer."

**Dashboard View:**
```
Housing WIP Recovery Dashboard
├── CFA Success Fees (won cases, need billing)
├── Disbursement Recovery (surveys, experts)
├── Awaab's Law Time Windows (investigation billing)
├── Settlement Opportunities (bill before trial)
└── No-Win-No-Fee Risk (cases that might lose)
```

---

### **3. Criminal Defense Solicitors**

**Unique Challenges:**
- Legal aid rates (fixed, low)
- Crown Court vs. Magistrates Court (different rates)
- Multiple hearings = multiple billing opportunities
- Very time-sensitive (hearings happen fast)

**What They'll See:**
- **Legal Aid Billing:** "Crown Court hearing completed. Bill within 7 days for prompt payment."
- **Hearing-Based Billing:** "3 hearings completed but only 1 billed. Bill immediately."
- **Rate Differences:** "Crown Court work billed at wrong rate. Review and correct."
- **Time Limits:** "Legal aid claim must be submitted within 3 months. 2 months elapsed."
- **Multiple Defendant Cases:** "Case has 2 defendants. Bill separately for each."

**Dashboard View:**
```
Criminal WIP Recovery Dashboard
├── Legal Aid Claims (pending submission)
├── Hearing-Based Billing (unbilled hearings)
├── Rate Corrections (wrong rate billed)
├── Time Limit Alerts (3-month deadline approaching)
└── Multi-Defendant Cases (separate billing needed)
```

---

### **4. Family Law Solicitors**

**Unique Challenges:**
- Private client work (hourly billing)
- Court fee recovery (can be significant)
- Multiple applications = multiple billing opportunities
- Settlement = final billing opportunity

**What They'll See:**
- **Application Billing:** "3 court applications completed. Bill each separately."
- **Court Fee Recovery:** "£500 in court fees paid. Recover from client now."
- **Settlement Billing:** "Case settled. Bill all outstanding time + disbursements."
- **Hourly Rate Tracking:** "Average recovery rate is 85%. Above average - well done."
- **Retainer Tracking:** "Client retainer depleted. Request top-up or bill outstanding."

**Dashboard View:**
```
Family Law WIP Recovery Dashboard
├── Application-Based Billing (unbilled applications)
├── Court Fee Recovery (fees paid, need recovery)
├── Settlement Final Billing (case closed, bill everything)
├── Retainer Management (depleted retainers)
└── Hourly Rate Performance (recovery rates)
```

---

### **5. Clinical Negligence Solicitors**

**Unique Challenges:**
- Very high-value cases (long timeframes)
- Expert reports = large disbursements
- Conditional fee agreements (CFAs)
- ATE insurance costs

**What They'll See:**
- **Expert Report Billing:** "£15,000 in expert reports unbilled for 90+ days. Bill now."
- **CFA Success Fee:** "Case won at £500k. Success fee of £X needs billing."
- **ATE Insurance Recovery:** "ATE premium of £Y recoverable from opponent. Bill now."
- **Long-Running Cases:** "Case at 2 years, £50k unbilled. Consider interim billing."
- **High-Value Settlement:** "Case settled at £Z. Bill success fee + all costs immediately."

**Dashboard View:**
```
Clinical Negligence WIP Recovery Dashboard
├── Expert Report Recovery (large disbursements)
├── CFA Success Fees (won cases)
├── ATE Insurance Recovery (premiums recoverable)
├── Long-Running Case Billing (interim billing opportunities)
└── High-Value Settlement Billing (final billing)
```

---

## 🎨 Unified Dashboard with Practice-Area Tabs

### **Main View (All Solicitors)**
```
WIP Recovery Optimizer
├── Overview (total unbilled, recovery rate, alerts)
├── Practice Area Tabs:
│   ├── PI
│   ├── Housing
│   ├── Criminal
│   ├── Family
│   ├── Clinical Negligence
│   └── Other
└── Settings (billing preferences, alerts)
```

### **Role-Based Default View**
- **PI Solicitor** → Defaults to PI tab
- **Housing Solicitor** → Defaults to Housing tab
- **Criminal Solicitor** → Defaults to Criminal tab
- etc.

But they can switch between tabs to see all practice areas if they work across practice areas.

---

## 📊 Practice-Area Specific Metrics

### **PI Metrics:**
- Fixed fee recovery rate
- Disbursement recovery time
- Stage transition billing speed
- Part 36 success fee recovery

### **Housing Metrics:**
- CFA success fee recovery
- Disbursement recovery rate
- Awaab's Law billing compliance
- No-win-no-fee risk score

### **Criminal Metrics:**
- Legal aid claim submission speed
- Hearing billing completion rate
- Rate accuracy (correct rate billed)
- Time limit compliance

### **Family Metrics:**
- Application billing rate
- Court fee recovery rate
- Retainer utilization
- Hourly rate recovery performance

### **Clinical Negligence Metrics:**
- Expert report recovery time
- CFA success fee recovery
- ATE insurance recovery rate
- Long-running case billing frequency

---

## 🔔 Practice-Area Specific Alerts

### **PI Alerts:**
- "Fixed fee case at risk of going over budget"
- "Medical report unbilled for 60+ days"
- "Part 36 offer accepted - bill success fee now"
- "Case moved to litigation - bill pre-action work"

### **Housing Alerts:**
- "CFA case won - bill success fee within 14 days"
- "Survey costs unbilled - client liable if case loses"
- "Awaab's Law investigation period completed - bill now"
- "Case at 40 hours - consider Part 36 offer to secure billing"

### **Criminal Alerts:**
- "Legal aid claim deadline in 30 days"
- "3 hearings completed but only 1 billed"
- "Crown Court work billed at wrong rate"
- "Multi-defendant case - bill separately for each"

### **Family Alerts:**
- "3 court applications completed - bill each separately"
- "Court fees paid - recover from client now"
- "Client retainer depleted - request top-up"
- "Case settled - bill all outstanding time"

### **Clinical Negligence Alerts:**
- "Expert report of £15k unbilled for 90+ days"
- "Case won - bill success fee immediately"
- "ATE premium recoverable - bill now"
- "Case at 2 years - consider interim billing"

---

## 🎯 Implementation Strategy

### **Phase 1: Core WIP Recovery (All Practice Areas)**
- Basic unbilled time tracking
- Recovery rate calculation
- Generic alerts

### **Phase 2: Practice-Area Specific Rules**
- PI: Fixed fee tracking, disbursement recovery
- Housing: CFA success fees, Awaab's Law billing
- Criminal: Legal aid claims, hearing-based billing
- Family: Application billing, court fee recovery
- Clinical Negligence: Expert reports, ATE insurance

### **Phase 3: Advanced Features**
- Predictive billing (when to bill for best recovery)
- Opponent payment behavior (who pays fast/slow)
- Settlement timing optimization (bill before settlement)

---

## 💡 The User Experience

**When a PI Solicitor logs in:**
1. Sees "PI WIP Recovery" tab by default
2. Dashboard shows PI-specific metrics
3. Alerts are PI-specific (fixed fees, medical reports, Part 36)
4. Can switch to other practice areas if needed

**When a Housing Solicitor logs in:**
1. Sees "Housing WIP Recovery" tab by default
2. Dashboard shows Housing-specific metrics
3. Alerts are Housing-specific (CFA success fees, Awaab's Law)
4. Can switch to other practice areas if needed

**When a Multi-Practice Solicitor logs in:**
1. Sees overview across all practice areas
2. Can drill down into each practice area
3. Gets alerts for all practice areas they work in
4. Can set preferences for which practice areas to focus on

---

## 🎯 Bottom Line

**Yes - each practice area gets its own tailored WIP Recovery Optimizer:**

- **PI Solicitors** see fixed fees, medical reports, Part 36 offers
- **Housing Solicitors** see CFA success fees, Awaab's Law billing, surveys
- **Criminal Solicitors** see legal aid claims, hearing billing, rate corrections
- **Family Solicitors** see application billing, court fees, retainers
- **Clinical Negligence Solicitors** see expert reports, ATE insurance, high-value settlements

**But it's all in one unified dashboard** - they can see their practice area by default, but switch to others if needed.

This makes it **relevant to each solicitor's role** while keeping the codebase unified and maintainable.

