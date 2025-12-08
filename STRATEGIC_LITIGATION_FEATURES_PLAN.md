# Strategic Litigation Features - Implementation Plan

## ✅ CURRENT FOUNDATION (What Already Exists)

### 1. **Opponent Tracking**
- ✅ `lib/opponent-radar.ts` - Tracks opponent response times, silence days
- ✅ Detects concerning silence patterns
- ✅ Calculates average response days

### 2. **Contradiction Detection**
- ✅ `lib/bundle-navigator.ts` - `findContradictions()` function
- ✅ Detects date inconsistencies, opposing statements

### 3. **Missing Evidence Detection**
- ✅ `lib/missing-evidence.ts` - `findMissingEvidence()` function
- ✅ Practice-area specific checklists
- ✅ Priority-based categorization

### 4. **Risk Alerts**
- ✅ `lib/core/risk-alerts.ts` - Comprehensive risk engine
- ✅ Limitation, Awaab's Law, Section 11 LTA, deadline risks

### 5. **Next Steps Engine**
- ✅ `lib/next-step.ts` - `calculateAllNextSteps()` function
- ✅ Priority-based action recommendations
- ✅ "Why this matters" context

### 6. **CPR Deadline Calculations**
- ✅ `lib/court-deadlines.ts` - `calculateCourtDeadlines()` function
- ✅ Pre-action protocol timelines
- ✅ Post-issue deadlines

### 7. **Compliance Checks**
- ✅ `lib/compliance.ts` - AML, CFA, conflict checks
- ✅ `lib/housing/compliance.ts` - Housing-specific compliance

---

## 🎯 NEW STRATEGIC FEATURES TO BUILD

### 1. **Opponent Vulnerability Detector** (`lib/strategic/opponent-vulnerabilities.ts`)

**What it does:**
- Systematically spots where opponent has messed up
- Highlights costly vulnerabilities if challenged

**Detects:**
- Incomplete disclosure
- Missing repair records
- Defective notices
- Expert non-compliance with CPR
- Late responses beyond protocol
- Missing particulars
- Incorrect service
- Missing pre-action steps

**Output:**
```typescript
type OpponentVulnerability = {
  id: string;
  type: "INCOMPLETE_DISCLOSURE" | "DEFECTIVE_NOTICE" | "MISSING_RECORDS" | "EXPERT_NON_COMPLIANCE" | "LATE_RESPONSE" | "MISSING_PARTICULARS" | "INCORRECT_SERVICE" | "MISSING_PRE_ACTION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  leverage: string; // "If you challenge this point, the court is likely to order X, which puts pressure on them."
  recommendedAction: string; // "Apply for unless order" / "Request clarification" / "Seek strike-out"
  costToOpponent?: string; // Estimated cost if challenged
};
```

---

### 2. **CPR Compliance Checker with Application Suggestions** (`lib/strategic/cpr-compliance.ts`)

**What it does:**
- Checks for CPR non-compliance systematically
- Suggests specific court applications

**Checks:**
- Late disclosure
- Missing particulars
- Missing tenancy agreement (housing)
- Missing medical evidence (PI)
- Witness inconsistencies
- No chronology
- No hazard assessment
- No letter before action
- Expert report non-compliance

**Output:**
```typescript
type CPRComplianceIssue = {
  id: string;
  rule: string; // "CPR 31.10" / "Pre-Action Protocol"
  breach: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  suggestedApplication: "UNLESS_ORDER" | "STRIKE_OUT" | "FURTHER_INFORMATION" | "COSTS_ORDER" | "DIRECTION";
  applicationText: string; // "Apply for an unless order here — this could compel them to comply or risk strike-out."
  deadline?: string; // When to apply
};
```

---

### 3. **Multi-Path Strategy Generator** (`lib/strategic/strategy-paths.ts`)

**What it does:**
- Maps multiple legitimate litigation pathways
- Shows Route A/B/C/D options

**Routes:**
- Route A: Challenge on breach of duty
- Route B: Leverage Awaab's Law hazard breach
- Route C: Procedural attack via late repair response
- Route D: Push expert contradiction for cross-examination
- Route E: Settlement pressure route — opponent's delay strengthens leverage

**Output:**
```typescript
type StrategyPath = {
  id: string;
  route: "A" | "B" | "C" | "D" | "E";
  title: string; // "Route A: Challenge on breach of duty"
  description: string;
  approach: string; // Detailed approach
  pros: string[];
  cons: string[];
  estimatedTimeframe: string;
  estimatedCost: string;
  successProbability: "HIGH" | "MEDIUM" | "LOW";
  recommendedFor: string; // When this route is best
};
```

---

### 4. **Predictive Behavior Pattern Analyzer** (`lib/strategic/behavior-predictor.ts`)

**What it does:**
- Predicts opponent behavior patterns (procedural, not magical)
- Maps "if X then Y" scenarios

**Predictions:**
- "If you request X, the opponent usually delays → this opens the door to a costs order."
- "If they can't provide evidence by deadline, you can seek strike-out."
- "If you raise this contradiction, their position becomes untenable."

**Output:**
```typescript
type BehaviorPrediction = {
  id: string;
  action: string; // "Request disclosure of X"
  predictedResponse: string; // "Opponent likely to delay 14-21 days"
  opportunity: string; // "This opens the door to a costs order"
  timing: string; // "Best time to apply: within 7 days of their delay"
  leverage: string; // "If they fail, you can seek strike-out"
  confidence: "HIGH" | "MEDIUM" | "LOW";
};
```

---

### 5. **Time Pressure Analyzer** (`lib/strategic/time-pressure.ts`)

**What it does:**
- Exposes time pressure points
- Shows leverage windows

**Analysis:**
- "This breach gives you leverage at hearing."
- "This missing document puts them at risk of adjournment costs."
- "This delay means you can apply for enforcement."

**Output:**
```typescript
type TimePressurePoint = {
  id: string;
  issue: string; // "Opponent breach" / "Missing document"
  leverage: string; // "Gives you leverage at hearing"
  timing: string; // "Now is the ideal moment"
  action: string; // "Threaten application" / "Apply for costs"
  riskToOpponent: string; // "Puts them at risk of adjournment costs"
  deadline?: string; // When to act
};
```

---

### 6. **Procedural Leverage Point Detector** (`lib/strategic/procedural-leverage.ts`)

**What it does:**
- Systematically detects procedural leverage points
- Suggests legitimate escalations

**Detects:**
- Missing deadline
- Late response
- Defective notice
- Incorrect service
- Missing particulars
- Missing pre-action steps
- Disclosure failures
- No tenancy agreement (housing)
- No medical evidence (PI)
- No chronological clarity

**Output:**
```typescript
type ProceduralLeveragePoint = {
  id: string;
  type: "MISSING_DEADLINE" | "LATE_RESPONSE" | "DEFECTIVE_NOTICE" | "INCORRECT_SERVICE" | "MISSING_PARTICULARS" | "MISSING_PRE_ACTION" | "DISCLOSURE_FAILURE" | "MISSING_EVIDENCE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  suggestedEscalation: "UNLESS_ORDER" | "CLARIFICATION" | "FURTHER_INFORMATION" | "STRIKE_OUT" | "COSTS" | "ENFORCEMENT";
  escalationText: string; // "Apply for an unless order" / "Request clarification or further information"
  cprRule?: string; // Relevant CPR rule
};
```

---

### 7. **Opponent Weak Spot Detector** (`lib/strategic/weak-spots.ts`)

**What it does:**
- Detects opponent weaknesses systematically
- Highlights exploitable inconsistencies

**Detects:**
- Contradictory statements
- Missing evidence
- Internal inconsistencies
- Timeline gaps
- Weak causation chain
- Low-quality expert evidence
- No response to key tenant reports
- Missing landlord repair logs
- Wrong dates
- Incorrect statute references

**Output:**
```typescript
type OpponentWeakSpot = {
  id: string;
  type: "CONTRADICTION" | "MISSING_EVIDENCE" | "INCONSISTENCY" | "TIMELINE_GAP" | "WEAK_CAUSATION" | "POOR_EXPERT" | "NO_RESPONSE" | "MISSING_RECORDS" | "WRONG_DATE" | "INCORRECT_STATUTE";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  evidence: string[];
  impact: string; // "If you highlight this inconsistency, the opponent's argument weakens dramatically."
  suggestedAction: string;
};
```

---

### 8. **Predictive Scenario Outliner** (`lib/strategic/scenario-outliner.ts`)

**What it does:**
- Outlines what happens if you take specific actions
- Maps scenario outcomes (not outcome prediction)

**Scenarios:**
- What happens if you challenge disclosure
- What happens if you apply for a direction
- How the case changes if opponent fails to comply
- When settlement becomes likely
- What risks you reduce by pressing point X

**Output:**
```typescript
type ScenarioOutline = {
  id: string;
  action: string; // "Challenge disclosure" / "Apply for direction"
  scenario: string; // "What happens if you challenge disclosure"
  likelyOutcome: string;
  timeline: string;
  risks: string[];
  benefits: string[];
  nextSteps: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
};
```

---

## 📋 IMPLEMENTATION ORDER

### Phase 1: Core Detection (Week 1)
1. ✅ Procedural Leverage Point Detector
2. ✅ CPR Compliance Checker
3. ✅ Opponent Weak Spot Detector

### Phase 2: Strategic Analysis (Week 2)
4. ✅ Opponent Vulnerability Detector
5. ✅ Time Pressure Analyzer
6. ✅ Behavior Pattern Predictor

### Phase 3: Strategy Generation (Week 3)
7. ✅ Multi-Path Strategy Generator
8. ✅ Predictive Scenario Outliner

### Phase 4: Integration & UI (Week 4)
9. ✅ Create unified "Strategic Intelligence" panel
10. ✅ Integrate with existing risk alerts
11. ✅ Add to case view page

---

## 🎨 UI COMPONENTS TO CREATE

1. **`components/strategic/StrategicIntelligencePanel.tsx`**
   - Main panel showing all strategic insights
   - Tabs: Vulnerabilities, CPR Issues, Strategies, Weak Spots, Time Pressure

2. **`components/strategic/OpponentVulnerabilitiesCard.tsx`**
   - Card showing opponent vulnerabilities
   - "If you challenge this..." messaging

3. **`components/strategic/StrategyPathsCard.tsx`**
   - Route A/B/C/D/E visualization
   - Pros/cons for each route

4. **`components/strategic/CPRComplianceCard.tsx`**
   - CPR breaches with application suggestions
   - "Apply for unless order" buttons

5. **`components/strategic/TimePressureCard.tsx`**
   - Time pressure windows
   - "Now is the ideal moment" highlights

---

## 🔒 LEGAL COMPLIANCE

All features will include:
- ✅ Legally-safe suggestion wording: "Here are strategic options you may wish to consider. Apply your own judgment to determine the appropriate step."
- ✅ No outcome guarantees
- ✅ Clear disclaimers
- ✅ All suggestions within CPR rules
- ✅ No manipulation of courts
- ✅ Tactical, not unethical

---

## 📊 DATABASE SCHEMA ADDITIONS

```sql
-- Strategic intelligence tables
CREATE TABLE strategic_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  leverage TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cpr_compliance_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  rule TEXT NOT NULL,
  breach TEXT NOT NULL,
  severity TEXT NOT NULL,
  suggested_application TEXT,
  application_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE strategy_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  route TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  approach TEXT,
  success_probability TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE opponent_weak_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  org_id UUID REFERENCES organisations(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  impact TEXT,
  suggested_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 NEXT STEPS

1. Create `lib/strategic/` directory structure
2. Build core detection functions
3. Create API routes (`/api/strategic/[caseId]/...`)
4. Build UI components
5. Integrate into case view
6. Add database migrations
7. Test with real cases

---

## ✅ CONFIRMATION

**YES - The system CAN do all of this!**

The foundation is solid. We just need to:
1. Build the strategic detection functions
2. Create the UI components
3. Integrate everything together

This will make CaseBrain feel like a **strategic co-counsel**, not just a PDF reader.

