# CaseBrain Hub - Demo Flow

## 🎯 Demo Script for Sales Presentations

This guide walks through the key features to showcase during a demo to law firms.

---

## 1. Opening Hook: Compliance Dashboard

**Route:** `/compliance`

**What to show:**
- "Let me show you what could blow up this week"
- Point to cases with RED status (critical compliance issues)
- Show the score breakdown per case
- Highlight:
  - Limitation risks (days remaining)
  - Critical/High risk counts
  - Missing compliance items (AML, CFA, attendance notes)
  - Awaab risks for housing cases

**Script:**
> "This is your 'keep the SRA happy' screen. Every case in your firm, scored by compliance risk. Red means action needed today. You can see immediately which files are missing AML checks, which CFAs haven't been signed, and critically - which cases are running up against limitation."

---

## 2. The Killer Feature: Audio → Attendance Note

**Route:** `/cases/[caseId]` → Audio & Attendance Notes panel

**What to show:**
1. Click "Add Call" button
2. Enter a file name like "Client call - 28 Nov 2024"
3. Paste or type a mock transcript:
   ```
   Advised client that their housing disrepair claim has good prospects. 
   Discussed the limitation period - we have 18 months remaining. 
   Risk identified: landlord may argue tenant caused damage. 
   Agreed to chase landlord for response by next Friday.
   Settlement options discussed.
   ```
4. Click "Create Record"
5. Show the generated attendance note with:
   - Advice extracted
   - Risks identified
   - Tasks created automatically

**Script:**
> "Your fee earners make a 20-minute call. Within seconds, CaseBrain creates a compliant attendance note, flags the risks mentioned, and creates the follow-up tasks. No typing. No forgetting to document. No SRA complaints about poor file management."

---

## 3. Smart Next Steps

**Route:** `/cases/[caseId]` → Next Step Panel (top of page)

**What to show:**
- The prominent "Next Step" card showing:
  - What needs doing
  - Why it matters
  - When it's due
  - Quick action buttons

**Script:**
> "Every case now has one clear answer to 'what should I do next?' - based on limitation, risks, missing evidence, and protocol requirements. Your fee earners don't have to think about case management - the system tells them."

---

## 4. Semantic Search

**Route:** `/search`

**What to show:**
1. Type: "damp mould children asthma"
2. Show results ranked by relevance
3. Show similar cases functionality
4. Highlight practice area filtering

**Script:**
> "Natural language search across your entire case base. Looking for precedent? Looking for a similar case to understand how it was handled? Just describe what you're looking for in plain English."

---

## 5. Team Workload Dashboard

**Route:** `/team`

**What to show:**
- Fee earner workload bars
- Who's overloaded vs underloaded
- WIP aging breakdown
- Cases needing billing attention

**Script:**
> "Managing partners - this is your people view. Who's drowning? Who has capacity? Where's the money locked up in unbilled WIP? All in one place, updating in real-time."

---

## 6. Case Detail - Risk Tunnel View

**Route:** `/cases/[caseId]`

**What to show:**
- Scroll to show all integrated panels:
  - Next Step (priority action)
  - Case Heatmap (risk visualization)
  - Missing Evidence
  - Compliance Gaps
  - Audio/Attendance Notes
  - Key Issues

**Script:**
> "Every case is a complete picture. Your fee earner opens the file and instantly sees: what's done, what's missing, what's risky, and what to do next. No hunting through emails or documents."

---

## 7. Closing: The Archive & Bin System

**Route:** `/bin`

**What to show:**
- Archived cases
- Restore functionality
- Permanent delete with confirmation

**Script:**
> "And when cases close, they go to the bin - not gone forever, but not cluttering your active view. Restore with a click if needed, or permanently delete when appropriate."

---

## Key Selling Points to Emphasize

### For Managing Partners:
1. **Compliance Protection** - "The SRA won't catch you out"
2. **Workload Visibility** - "See who's drowning before they quit"
3. **Billing Health** - "Stop leaving money on the table"

### For Fee Earners:
1. **Less Admin** - "Audio transcripts become attendance notes"
2. **Clear Priorities** - "Always know what to do next"
3. **Better Search** - "Find anything in seconds"

### For IT/Operations:
1. **Modern Stack** - "Built on enterprise-grade tech"
2. **SaaS Model** - "No servers to manage"
3. **Integrations** - "Works with your existing tools"

---

## Demo Environment Setup

Before the demo:
1. Create 5-10 sample cases with varying:
   - Practice areas (Housing, PI, Clin Neg)
   - Risk levels
   - Document counts
   - Stages

2. Ensure at least one case has:
   - Limitation within 90 days
   - Critical risk flags
   - Missing compliance items
   - Some attendance notes

3. Pre-load some audio transcripts for the "killer moment"

---

## Objection Handling

**"We already have a PMS"**
> "CaseBrain doesn't replace your PMS - it makes it smarter. Think of it as the intelligence layer that sits on top."

**"Our fee earners won't use it"**
> "That's exactly why we built the 'Next Step' feature. They don't have to learn a new system - the system just tells them what to do."

**"What about data security?"**
> "Enterprise-grade encryption, SOC 2 compliance, data stays in UK data centres. More secure than your current filing cabinet."

**"How long to implement?"**
> "You'll be up and running in a week. We handle the migration, the training, everything."

