# Phase 3: "Tell Me The Angle. Tell Me The Move. Tell Me The Backup."

## 🎯 **Core Concept**

**For time-pressed solicitors who need:**
- **The Angle:** The ONE winning strategy (not 5 options, just THE angle)
- **The Move:** The exact next action to take (not suggestions, THE move)
- **The Backup:** If the move fails, what's the fallback (not "maybe try this", THE backup)

**This is about DECISION, not ANALYSIS.**

---

## 📋 **Feature 1: "Tactical Command Center"** (Primary Feature)

### **Purpose:**
One-page tactical dashboard that shows:
1. **THE ANGLE** - Primary winning strategy (one, not multiple)
2. **THE MOVE** - Exact next action with steps
3. **THE BACKUP** - Fallback strategy if move fails

### **What It Shows:**

#### **THE ANGLE Section:**
- Primary winning strategy (from Kill Shot or aggressive defense)
- Why this angle wins (one sentence)
- Win probability for this specific angle
- Key evidence/facts that support it
- Authority/case law that supports it

#### **THE MOVE Section:**
- **Immediate Action:** What to do RIGHT NOW
- **Next 3 Steps:** Exact sequence
- **Ready-to-Use:** Copy-paste submissions/questions/letters
- **Timeline:** When to execute each step
- **Who:** Who needs to do what (solicitor, barrister, client)

#### **THE BACKUP Section:**
- **If Move Fails:** What's the fallback angle
- **Why Backup Works:** Why this is viable if primary fails
- **Backup Move:** Exact action for backup
- **When to Switch:** Trigger points (e.g., "If prosecution provides X, switch to backup")

### **API:** `/api/cases/[caseId]/tactical-command`
### **Component:** `TacticalCommandCenter.tsx`

---

## 📋 **Feature 2: "Move Sequence Generator"**

### **Purpose:**
Generates exact sequence of moves (not strategies, MOVES) with:
- Step 1: Do X (ready-to-use)
- Step 2: If Y happens, do Z (ready-to-use)
- Step 3: If A fails, switch to B (ready-to-use)
- Decision tree format

### **What It Shows:**
- **Primary Sequence:** Move 1 → Move 2 → Move 3
- **Branch Points:** "If prosecution does X, then Y"
- **Failure Points:** "If this fails, switch to backup"
- **Ready-to-Use Actions:** Each move has copy-paste content

### **API:** `/api/cases/[caseId]/move-sequence` (may already exist, enhance it)
### **Component:** `MoveSequencePanel.tsx`

---

## 📋 **Feature 3: "Backup Strategy Generator"**

### **Purpose:**
If primary angle fails, what's the backup? Not "maybe try this" - THE backup.

### **What It Shows:**
- **Primary Angle:** What we're trying first
- **Backup Angle:** What we switch to if primary fails
- **Trigger Conditions:** When to switch (specific events)
- **Backup Move Sequence:** Exact steps for backup
- **Why Backup Works:** Why this is viable
- **Win Probability:** Backup's success rate

### **API:** `/api/cases/[caseId]/backup-strategy`
### **Component:** `BackupStrategyPanel.tsx`

---

## 📋 **Feature 4: "Decision Tree"**

### **Purpose:**
Visual/interactive decision tree showing:
- Start: Primary angle
- Branch: If X happens → do Y
- Branch: If Y fails → switch to backup
- End: Expected outcome

### **What It Shows:**
- Flowchart-style decision tree
- Each node = decision point or action
- Each branch = condition (if prosecution does X)
- Ready-to-use actions at each node

### **API:** `/api/cases/[caseId]/decision-tree`
### **Component:** `DecisionTreePanel.tsx`

---

## 📋 **Feature 5: "Next Move Generator"**

### **Purpose:**
Not "what could we do?" - "what do we do NEXT?"

### **What It Shows:**
- **Right Now:** Immediate action (today/this week)
- **This Week:** Next action
- **This Month:** Following action
- **Ready-to-Use:** Copy-paste for each
- **Dependencies:** What needs to happen first

### **API:** `/api/cases/[caseId]/next-move`
### **Component:** `NextMovePanel.tsx`

---

## 🎯 **Implementation Priority**

### **Phase 3.1 (Must Have):**
1. **Tactical Command Center** - The main feature (angle + move + backup in one)
2. **Next Move Generator** - Immediate action focus

### **Phase 3.2 (Should Have):**
3. **Backup Strategy Generator** - Fallback planning
4. **Move Sequence Generator** (enhance existing) - Step-by-step moves

### **Phase 3.3 (Nice to Have):**
5. **Decision Tree** - Visual representation

---

## 🔧 **Technical Approach**

### **Data Sources:**
- Use existing `aggressive_defense` analysis
- Use existing `kill_shot` analysis
- Use existing `strategic_overview` analysis
- Combine to generate:
  - Primary angle (from kill shot)
  - Primary move (from aggressive defense)
  - Backup angle (from strategic overview or alternative kill shot)
  - Backup move (from alternative aggressive defense)

### **Practice-Area Awareness:**
- **Criminal:** PACE challenges, disclosure requests, identification challenges
- **Housing:** Pre-action protocol, strike-out applications, statutory breaches
- **PI/Clinical Neg:** Part 36 offers, expert challenges, limitation defenses
- **Family:** Enforcement applications, committal, procedural challenges

### **Integration:**
- Add to case page as primary tactical section
- Can replace or complement existing "Kill Shot" panel
- Show at top of criminal/strategic sections

---

## 📊 **Success Metrics**

**This phase succeeds if:**
1. Solicitor can see angle + move + backup in < 30 seconds
2. Ready-to-use actions are copy-paste ready
3. Backup is clear and actionable (not vague)
4. Move sequence is specific (not "consider doing X")

---

## 🚀 **Why This Matters**

**Current State:**
- We have analysis (what are the angles?)
- We have strategies (what could work?)
- We have options (here are 5 things to try)

**What's Missing:**
- **Decision:** Which ONE angle?
- **Action:** What do I do RIGHT NOW?
- **Fallback:** What if it fails?

**This Phase Adds:**
- **Clarity:** One angle, not five
- **Action:** Exact move, not suggestions
- **Confidence:** Backup plan, not "maybe try something else"

---

## 💡 **Example Output**

### **Tactical Command Center:**

**THE ANGLE:**
"Challenge identification evidence. CCTV is poor quality, no formal ID procedure, witness inconsistencies."

**THE MOVE:**
1. **Today:** Draft s.78 PACE application to exclude identification (ready-to-use attached)
2. **This Week:** Serve disclosure request for all CCTV (template attached)
3. **Next Week:** If disclosure fails, make stay application (template attached)

**THE BACKUP:**
"If identification exclusion fails, switch to disclosure stay angle. Prosecution has failed to provide CCTV 3 times. Ready-to-use stay application attached."

---

**Ready to build Phase 3.1 (Tactical Command Center + Next Move Generator)?**
