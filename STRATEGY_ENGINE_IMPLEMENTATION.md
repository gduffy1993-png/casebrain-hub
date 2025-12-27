# CRIMINAL STRATEGY ENGINE - IMPLEMENTATION COMPLETE ✅

## ✅ IMPLEMENTED: Strategy Engine That Works on ANY PDF

### **Core Principle (NON-NEGOTIABLE)**
✅ **Strategy ≠ loopholes**
- Strategy is a REASONED PLAN under uncertainty
- Loopholes are OPTIONAL accelerators
- System ALWAYS produces at least 2 credible criminal defence routes

---

## **PART 1 — Loophole Gate Removed** ✅

✅ **No strategy generation requires `loopholes.length > 0`**
✅ **Defence plan is NOT blocked if "no loopholes"**
✅ **Strategy generation uses: EvidenceGraph + Charge + Mental Element + Disclosure Status**

Loopholes ENHANCE strategy, never BLOCK it.

---

## **PART 2 — Criminal Strategy Generator** ✅

**File:** `lib/criminal/strategy-engine.ts`

**Function:** `generateCriminalStrategies(input)`

**Returns:** `{ strategies: CriminalStrategy[] }` - **ALWAYS at least 2 strategies**

**Each Strategy Includes:**
- `id` - unique identifier
- `title` - strategy name
- `theory` - legal reasoning
- `whenToUse` - trigger conditions
- `risks` - potential downsides
- `immediateActions` - actionable steps solicitor can do tomorrow
- `disclosureDependency` - true/false
- `downgradeTarget` - e.g., "s18 → s20 → s47" or null
- `provisional` - true if based on incomplete disclosure

---

## **PART 3 — Mandatory Criminal Strategy Templates** ✅

### **STRATEGY A — Intent Downgrade (s18 → s20)** ✅
- **Trigger:** s18 charge, prosecution relies on inference, chaotic incident, no admissions
- **Theory:** Medical severity ≠ specific intent. One blow/short incident supports recklessness (s20) not intent (s18)
- **Immediate Actions:**
  - Request full medical causation narrative
  - Request CPS intent basis
  - Prepare s18→s20 written representations

### **STRATEGY B — Disclosure Pressure / Trial Readiness Attack** ✅
- **Trigger:** CCTV not disclosed, MG6 unclear, forensic methodology missing
- **Theory:** CPIA + CrimPR require fairness. Prosecution not trial-ready = adjournment/narrowing pressure
- **Immediate Actions:**
  - Send CPIA s7A letter
  - Challenge MG6C/D schedules
  - Demand CCTV continuity

### **STRATEGY C — Identification Reliability Attack** ✅
- **Trigger:** VIPER used, CCTV/facial recognition involved, no expert validation
- **Theory:** Code D compliance, facial recognition = investigative only, contamination risk
- **Immediate Actions:**
  - Request VIPER pack
  - Request facial recognition methodology
  - Consider Turnbull direction prep

### **STRATEGY D — Controlled Plea Position (OPTIONAL)** ✅
- **Trigger:** Weapon + injury strong but intent weak, client risk-averse
- **Theory:** Preserve credit, cap sentencing exposure, avoid jury intent inference
- **Immediate Actions:**
  - Prepare basis of plea to s20
  - Obtain medical clarification
  - Advise client on sentencing bands
- ⚠️ **ALWAYS presented as OPTIONAL, never default**

### **STRATEGY E — PACE Breach / Interview Exclusion** ✅
- **Trigger:** Interview exists, PACE compliance questionable, no comment interview
- **Theory:** PACE Code C breaches may render interview inadmissible under s76/s78
- **Immediate Actions:**
  - Request full custody record and interview recording
  - Assess PACE compliance
  - Consider s76/s78 exclusion application

### **STRATEGY F — Evidence Weakness / No Case to Answer** ✅
- **Trigger:** Fallback for any charge when other strategies don't apply
- **Theory:** Weak evidence, contradictions, or missing elements may support no case to answer
- **Immediate Actions:**
  - Identify missing elements
  - Request all evidence supporting each element
  - Prepare no case to answer submission

---

## **PART 4 — Thin Bundle Behaviour** ✅

✅ **If `evidenceGraph.isThin === true`:**
- ✅ **DO NOT block strategy**
- ✅ **Label strategies as: "PROVISIONAL — SUBJECT TO DISCLOSURE"**
- ✅ **Add banner:** "Strategy generated on current material. Routes may strengthen or collapse once disclosure completes."

---

## **PART 5 — Wired Into System** ✅

✅ **Integrated in:** `app/api/criminal/[caseId]/aggressive-defense/route.ts`

**How it works:**
1. Generate strategies ALWAYS (even with thin bundles)
2. Get charge from `criminal_charges` table
3. Build disclosure status from evidence graph
4. Generate strategies using `generateCriminalStrategies()`
5. If `analysis.criticalAngles` is empty/thin, enhance with strategy engine
6. Convert strategies to defense angles format
7. Set as `criticalAngles` and `recommendedStrategy`

**Result:** Defence plan ALWAYS renders, even when:
- No loopholes
- No precedent matches
- No timeline gaps
- Thin bundle

---

## **PART 6 — Sanity Rules** ✅

✅ **NEVER mention CFA / retainer / civil concepts in criminal cases**
✅ **NEVER output 0% win** (minimum 40% for provisional, 60% for confirmed)
✅ **NEVER output placeholder actions** (all actions are actionable)
✅ **ALWAYS give next actions a solicitor could actually do tomorrow**

---

## **ACCEPTANCE TEST** ✅

**Test Case:** Upload single prosecution PDF alleging:
- s18 OAPA
- CCTV + forensic evidence
- No defence documents

**Expected Output:**
✅ At least 2 strategies:
  - Intent downgrade (s18 → s20)
  - Disclosure pressure
✅ Clear legal reasoning
✅ Clear next actions
✅ No reliance on "loopholes"

**Status:** ✅ **PASSES** - Strategy engine generates strategies even with thin bundles

---

## **FILES CREATED/MODIFIED**

### **New Files:**
1. `lib/criminal/strategy-engine.ts` - Core strategy generator

### **Modified Files:**
1. `app/api/criminal/[caseId]/aggressive-defense/route.ts` - Integrated strategy engine
   - Generates strategies ALWAYS
   - Enhances analysis when angles are thin
   - Converts strategies to defense angles format

---

## **KEY IMPROVEMENTS**

1. **No More "Defence plan unavailable"** - Strategies always generated
2. **No More "No loopholes identified yet" blocker** - Strategies don't require loopholes
3. **Works on ANY PDF** - Even single prosecution document
4. **Provisional Strategies** - Clearly labeled when disclosure incomplete
5. **Actionable Actions** - All immediate actions are things solicitors can do tomorrow

---

## **NEXT STEPS (Optional)**

- Add strategy comparison UI (show all strategies side-by-side)
- Add strategy risk assessment scoring
- Add strategy timeline (when to deploy each strategy)
- Add client advice integration (link strategies to client advice)

---

## **NOTES**

- Strategy engine is **deterministic** - same input = same output
- Strategies are **legal reasoning based**, not document completeness based
- All strategies include **actionable immediate actions**
- Strategies are **provisional** when disclosure incomplete (clearly labeled)
- System **never blocks** strategy generation, only labels as provisional

